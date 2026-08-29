import { createHash, randomInt, randomUUID, timingSafeEqual } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import COS from 'cos-nodejs-sdk-v5'
import express from 'express'
import jwt from 'jsonwebtoken'
import mysql from 'mysql2/promise'
import multer from 'multer'
import { Resend } from 'resend'

const required = ['MYSQL_URL', 'AUTH_SESSION_SECRET', 'AUTH_CODE_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM', 'OPENAI_API_KEY']
const missing = required.filter((name) => !process.env[name])
if (missing.length) {
  throw new Error(`缺少服务端环境变量：${missing.join(', ')}`)
}

const config = {
  port: Number(process.env.PORT || 8787),
  mysqlUrl: process.env.MYSQL_URL,
  sessionSecret: process.env.AUTH_SESSION_SECRET,
  codeSecret: process.env.AUTH_CODE_SECRET,
  emailFrom: process.env.EMAIL_FROM,
  environment: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  ai: {
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai-next.com/v1').replace(/\/+$/, ''),
    model: process.env.OPENAI_MODEL || 'gpt-5',
  },
  cos: {
    secretId: process.env.COS_SECRET_ID,
    secretKey: process.env.COS_SECRET_KEY,
    region: process.env.COS_REGION,
    bucket: process.env.COS_BUCKET,
  },
}

const pool = mysql.createPool({ uri: config.mysqlUrl, waitForConnections: true, connectionLimit: 10 })
const resend = new Resend(process.env.RESEND_API_KEY)
const cos = config.cos.secretId && config.cos.secretKey && config.cos.region && config.cos.bucket
  ? new COS({ SecretId: config.cos.secretId, SecretKey: config.cos.secretKey })
  : null
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
})
const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '25mb' }))

const CODE_TTL_MS = 10 * 60 * 1000
const RESEND_INTERVAL_MS = 60 * 1000
const MAX_CODE_ATTEMPTS = 5
const SESSION_COOKIE = 'opc_session'
const SESSION_TTL_DAYS = 30

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254
}

function isLocalDevelopmentRequest(req) {
  if (config.isProduction) return false
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)
}

function decodeUploadedFileName(name) {
  if (typeof name !== 'string' || !/[\u0080-\u00ff]/.test(name)) return name
  const decoded = Buffer.from(name, 'latin1').toString('utf8')
  return decoded.includes('\uFFFD') ? name : decoded
}

function codeHash(email, code) {
  return createHash('sha256').update(`${email}:${code}:${config.codeSecret}`).digest('hex')
}

function matchesCode(expected, actual) {
  const expectedBuffer = Buffer.from(expected, 'utf8')
  const actualBuffer = Buffer.from(actual, 'utf8')
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
}

function setSession(res, uuid) {
  const token = jwt.sign({ sub: uuid }, config.sessionSecret, { expiresIn: `${SESSION_TTL_DAYS}d` })
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  })
}

function readCookie(req, name) {
  const prefix = `${name}=`
  const cookie = req.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix))
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null
}

function currentUser(req) {
  const token = readCookie(req, SESSION_COOKIE)
  if (!token) return null
  try {
    const payload = jwt.verify(token, config.sessionSecret)
    return typeof payload === 'object' && typeof payload.sub === 'string' ? { uuid: payload.sub } : null
  } catch {
    return null
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true }))

function isAiMessage(value) {
  return value && typeof value === 'object'
    && ['system', 'user', 'assistant'].includes(value.role)
    && typeof value.content === 'string'
    && value.content.length <= 200_000
}

app.post('/api/ai', async (req, res, next) => {
  if (!currentUser(req)) return res.status(401).json({ error: '未登录' })

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const messages = Array.isArray(body.messages) ? body.messages : null
  const system = body.system
  const stream = body.stream === true
  const jsonMode = body.response_format?.type === 'json_object'

  if (!messages || messages.length === 0 || messages.length > 100 || !messages.every(isAiMessage)) {
    return res.status(400).json({ error: 'AI 消息格式无效。' })
  }
  if (system !== undefined && !isAiMessage({ role: 'system', content: system })) {
    return res.status(400).json({ error: 'AI 系统提示格式无效。' })
  }

  const upstreamMessages = system === undefined
    ? messages
    : [{ role: 'system', content: system }, ...messages]

  try {
    const upstream = await fetch(`${config.ai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Accept: stream ? 'text/event-stream' : 'application/json',
        Authorization: `Bearer ${config.ai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.ai.model,
        messages: upstreamMessages,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        ...(stream ? { stream: true } : {}),
      }),
    })

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '')
      res.status(upstream.status)
      if (upstream.headers.get('content-type')) res.setHeader('Content-Type', upstream.headers.get('content-type'))
      return res.send(text)
    }

    if (!stream) {
      const text = await upstream.text()
      if (upstream.headers.get('content-type')) res.setHeader('Content-Type', upstream.headers.get('content-type'))
      return res.send(text)
    }

    if (!upstream.body) return res.status(502).json({ error: 'AI 接口没有返回流。' })
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()
    for await (const chunk of upstream.body) {
      if (res.destroyed) break
      res.write(chunk)
    }
    return res.end()
  } catch (error) {
    return next(error)
  }
})

function safeFileName(name) {
  const base = path.basename(typeof name === 'string' ? name : 'material')
  return base.replace(/[^\p{L}\p{N}._-]+/gu, '_').slice(0, 180) || 'material'
}

function objectKeyFor(fileName) {
  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const safeName = safeFileName(decodeUploadedFileName(fileName))
  const extension = path.extname(safeName)
  const stem = extension ? safeName.slice(0, -extension.length) : safeName
  const suffix = randomInt(0, 1_000_000).toString().padStart(6, '0')
  return `upload/${config.environment}/${year}/${month}/${day}/${stem}-${suffix}${extension}`
}

function requireUploadConfig(req, res, next) {
  const session = currentUser(req)
  if (!session) return res.status(401).json({ error: '未登录' })
  if (!cos) return res.status(503).json({ error: '文件存储服务未配置，请联系管理员。' })
  return next()
}

function uploadOne(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) return next()
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: '文件超过 10MB。' })
    }
    return res.status(400).json({ error: '文件上传失败，请重试。' })
  })
}

app.post('/api/materials/upload', requireUploadConfig, uploadOne, async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: '请选择要上传的文件。' })

  const file = req.file
  const key = objectKeyFor(file.originalname)

  try {
    await new Promise((resolve, reject) => {
      cos.putObject(
        {
          Bucket: config.cos.bucket,
          Region: config.cos.region,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype || 'application/octet-stream',
        },
        (error, data) => (error ? reject(error) : resolve(data)),
      )
    })
    return res.json({ ok: true, storageKey: key })
  } catch (error) {
    return next(error)
  }
})

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function jsonOrNull(value) {
  return value == null ? null : JSON.stringify(value)
}

function validateAttachmentArchive(body) {
  if (!body || !isUuid(body.projectId)) return '项目标识无效。'
  if (typeof body.projectName !== 'string' || !body.projectName.trim() || body.projectName.length > 255) {
    return '项目名称无效。'
  }
  if (!Array.isArray(body.files) || body.files.length > 20) return '项目附件数量无效。'
  for (const file of body.files) {
    if (!file || typeof file !== 'object') return '附件信息无效。'
    if (typeof file.id !== 'string' || file.id.length > 128) return '附件标识无效。'
    if (typeof file.name !== 'string' || !file.name.trim() || file.name.length > 255) return '附件名称无效。'
    if (!['PDF', 'MD'].includes(file.ext)) return '附件类型无效。'
    if (typeof file.size !== 'string' || file.size.length > 32) return '附件大小信息无效。'
    if (typeof file.content !== 'string') return '附件解析内容无效。'
    if (file.storageKey != null && (typeof file.storageKey !== 'string' || file.storageKey.length > 512)) {
      return '附件存储信息无效。'
    }
  }
  return null
}

function validateDiaryArchive(body) {
  if (!body || !isUuid(body.projectId)) return '项目标识无效。'
  if (!body.diaryEntry || typeof body.diaryEntry !== 'object') return '日记内容无效。'
  if (typeof body.coachLine !== 'string' || body.coachLine.length > 2000) return '教练提醒无效。'
  return null
}

app.post('/api/archive/diary', async (req, res, next) => {
  const session = currentUser(req)
  if (!session) return res.status(401).json({ error: '未登录' })

  const validationError = validateDiaryArchive(req.body)
  if (validationError) return res.status(400).json({ error: validationError })

  const { projectId, diaryEntry, coachLine } = req.body
  try {
    await pool.execute(
      `INSERT INTO project_diary_archives
         (uuid, client_project_uuid, diary_entry_json, coach_line)
       VALUES (?, ?, ?, ?)`,
      [session.uuid, projectId, JSON.stringify(diaryEntry), coachLine],
    )
    return res.json({ ok: true })
  } catch (error) {
    return next(error)
  }
})

// 只写入归档，不提供对应读取接口；当前页面仍只使用本地 Zustand 状态。
app.post('/api/archive/attachments', async (req, res, next) => {
  const session = currentUser(req)
  if (!session) return res.status(401).json({ error: '未登录' })

  const validationError = validateAttachmentArchive(req.body)
  if (validationError) return res.status(400).json({ error: validationError })

  const { projectId, projectName, files, analysis, messages, planQuestions, planAnswers, plan, analysisRun } = req.body
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    let analysisVersion = null
    let analyzedAt = null
    if (analysisRun === true && analysis != null) {
      const [rows] = await connection.execute(
        `SELECT COALESCE(MAX(analysis_version), 0) AS max_version
           FROM attachment_archives
          WHERE uuid = ? AND client_project_uuid = ?`,
        [session.uuid, projectId],
      )
      analysisVersion = Number(rows[0]?.max_version || 0) + 1
      analyzedAt = new Date()
    }

    // 对话消息独立归档到项目交互表，不写入附件归档表。
    if (messages !== undefined) {
      await connection.execute(
        `INSERT INTO project_conversation_archives
           (uuid, client_project_uuid, chat_messages_json)
         VALUES (?, ?, ?, ?)
         `,
        [
          session.uuid,
          projectId,
          jsonOrNull(messages),
        ],
      )
    }

    for (const file of files) {
      await connection.execute(
        `INSERT INTO attachment_archives
           (uuid, client_project_uuid, project_name, client_attachment_uuid, object_storage_path,
            file_name, file_size, analyzed_file_content, ai_dashboard_feedback,
            plan_questions_answers_json, ai_business_plan_v2_content, analysis_version, analyzed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         `,
        [
          session.uuid,
          projectId,
          projectName,
          file.id,
          file.storageKey || null,
          file.name,
          file.size,
          file.content,
          jsonOrNull(analysis),
          planQuestions !== undefined || planAnswers !== undefined
            ? jsonOrNull({ questions: planQuestions ?? null, answers: planAnswers ?? null })
            : null,
          jsonOrNull(plan),
          analysisVersion,
          analyzedAt,
        ],
      )
    }

    await connection.commit()
    return res.json({ ok: true })
  } catch (error) {
    await connection.rollback()
    return next(error)
  } finally {
    connection.release()
  }
})

app.post('/api/auth/request-code', async (req, res, next) => {
  const email = normalizeEmail(req.body?.email)
  if (!isEmail(email)) return res.status(400).json({ error: '请输入有效的邮箱地址。' })

  try {
    await pool.execute(
      'UPDATE email_login_codes SET deleted_at = CURRENT_TIMESTAMP(3) WHERE expires_at <= CURRENT_TIMESTAMP(3) AND deleted_at IS NULL',
    )
    const [existing] = await pool.execute(
      'SELECT sent_at FROM email_login_codes WHERE email = ? AND deleted_at IS NULL',
      [email],
    )
    const lastSentAt = existing[0]?.sent_at
    if (lastSentAt && Date.now() - new Date(lastSentAt).getTime() < RESEND_INTERVAL_MS) {
      return res.status(429).json({ error: '验证码刚发出，请稍候一分钟再试。' })
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
    const expiresAt = new Date(Date.now() + CODE_TTL_MS)
    await pool.execute(
      `INSERT INTO email_login_codes (email, code_hash, expires_at, attempts, sent_at, deleted_at)
       VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP(3), NULL)
       ON DUPLICATE KEY UPDATE
       code_hash = VALUES(code_hash), expires_at = VALUES(expires_at), attempts = 0,
       sent_at = CURRENT_TIMESTAMP(3), deleted_at = NULL`,
      [email, codeHash(email, code), expiresAt],
    )

    const { error } = await resend.emails.send({
      from: config.emailFrom,
      to: [email],
      subject: '你的 OPC 军师登录验证码',
      html: `<p>你的 OPC 军师登录验证码是：</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>验证码 10 分钟内有效。若非本人操作，请忽略此邮件。</p>`,
    })
    if (error) {
      await pool.execute(
        'UPDATE email_login_codes SET deleted_at = CURRENT_TIMESTAMP(3) WHERE email = ? AND deleted_at IS NULL',
        [email],
      )
      return res.status(502).json({ error: '邮件发送失败，请稍后重试。' })
    }

    return res.json({ ok: true, expiresInSeconds: CODE_TTL_MS / 1000 })
  } catch (error) {
    return next(error)
  }
})

app.post('/api/auth/verify-code', async (req, res, next) => {
  const email = normalizeEmail(req.body?.email)
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : ''
  if (!isEmail(email) || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: '请输入邮箱和六位验证码。' })
  }

  try {
    const [rows] = await pool.execute(
      'SELECT code_hash, expires_at, attempts FROM email_login_codes WHERE email = ? AND deleted_at IS NULL',
      [email],
    )
    const record = rows[0]
    if (!record || new Date(record.expires_at).getTime() < Date.now()) {
      await pool.execute(
        'UPDATE email_login_codes SET deleted_at = CURRENT_TIMESTAMP(3) WHERE email = ? AND deleted_at IS NULL',
        [email],
      )
      return res.status(400).json({ error: '验证码已失效，请重新获取。' })
    }
    if (record.attempts >= MAX_CODE_ATTEMPTS) {
      await pool.execute(
        'UPDATE email_login_codes SET deleted_at = CURRENT_TIMESTAMP(3) WHERE email = ? AND deleted_at IS NULL',
        [email],
      )
      return res.status(429).json({ error: '尝试次数过多，请重新获取验证码。' })
    }
    if (!matchesCode(record.code_hash, codeHash(email, code))) {
      await pool.execute(
        'UPDATE email_login_codes SET attempts = attempts + 1 WHERE email = ? AND deleted_at IS NULL',
        [email],
      )
      return res.status(400).json({ error: '验证码不正确。' })
    }

    await pool.execute(
      `INSERT INTO users (uuid, email) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE last_login_at = CURRENT_TIMESTAMP(3)`,
      [randomUUID(), email],
    )
    const [users] = await pool.execute('SELECT uuid, email FROM users WHERE email = ?', [email])
    const user = users[0]
    if (!user) return next(new Error('用户创建失败。'))
    await pool.execute(
      'UPDATE email_login_codes SET deleted_at = CURRENT_TIMESTAMP(3) WHERE email = ? AND deleted_at IS NULL',
      [email],
    )
    setSession(res, user.uuid)
    return res.json({ user })
  } catch (error) {
    return next(error)
  }
})

app.post('/api/auth/dev-login', async (req, res, next) => {
  if (!isLocalDevelopmentRequest(req)) return res.status(404).json({ error: '接口不存在。' })

  const email = normalizeEmail(req.body?.email) || 'dev@example.com'
  if (!isEmail(email)) return res.status(400).json({ error: '请输入有效的邮箱地址。' })

  try {
    await pool.execute(
      `INSERT INTO users (uuid, email) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE last_login_at = CURRENT_TIMESTAMP(3)`,
      [randomUUID(), email],
    )
    const [users] = await pool.execute('SELECT uuid, email FROM users WHERE email = ?', [email])
    const user = users[0]
    if (!user) return next(new Error('用户创建失败。'))
    setSession(res, user.uuid)
    return res.json({ user })
  } catch (error) {
    return next(error)
  }
})

app.get('/api/auth/me', async (req, res, next) => {
  const session = currentUser(req)
  if (!session) return res.status(401).json({ error: '未登录' })
  try {
    const [users] = await pool.execute('SELECT uuid, email FROM users WHERE uuid = ?', [session.uuid])
    const user = users[0]
    if (!user) return res.status(401).json({ error: '未登录' })
    return res.json({ user })
  } catch (error) {
    return next(error)
  }
})

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: config.isProduction, path: '/' })
  return res.status(204).end()
})

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: '服务暂时不可用，请稍后重试。' })
})

const here = path.dirname(fileURLToPath(import.meta.url))
const dist = path.resolve(here, '../dist')
app.use(express.static(dist))
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: '接口不存在。' })
  return res.sendFile(path.join(dist, 'index.html'))
})

app.listen(config.port, () => console.log(`OPC 军师运行在 :${config.port}`))
