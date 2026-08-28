import { createHash, randomInt, randomUUID, timingSafeEqual } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import COS from 'cos-nodejs-sdk-v5'
import express from 'express'
import jwt from 'jsonwebtoken'
import mysql from 'mysql2/promise'
import multer from 'multer'
import { Resend } from 'resend'

const required = ['MYSQL_URL', 'AUTH_SESSION_SECRET', 'AUTH_CODE_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM']
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

// 只写入归档，不提供对应读取接口；当前页面仍只使用本地 Zustand 状态。
app.post('/api/archive/attachments', async (req, res, next) => {
  const session = currentUser(req)
  if (!session) return res.status(401).json({ error: '未登录' })

  const validationError = validateAttachmentArchive(req.body)
  if (validationError) return res.status(400).json({ error: validationError })

  const { projectId, files, analysis, messages, planQuestions, planAnswers, plan } = req.body
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    for (const file of files) {
      await connection.execute(
        `INSERT INTO attachment_archives
           (uuid, user_uuid, client_project_uuid, client_attachment_uuid, object_storage_path,
            file_name, file_size, analyzed_file_content, ai_dashboard_feedback,
            ai_report_stream_feedback, optimization_plan_questions_answers, ai_business_plan_v2_content)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           object_storage_path = COALESCE(VALUES(object_storage_path), object_storage_path),
           file_name = VALUES(file_name), file_size = VALUES(file_size),
           analyzed_file_content = VALUES(analyzed_file_content),
           ai_dashboard_feedback = COALESCE(VALUES(ai_dashboard_feedback), ai_dashboard_feedback),
           ai_report_stream_feedback = COALESCE(VALUES(ai_report_stream_feedback), ai_report_stream_feedback),
           optimization_plan_questions_answers = COALESCE(VALUES(optimization_plan_questions_answers), optimization_plan_questions_answers),
           ai_business_plan_v2_content = COALESCE(VALUES(ai_business_plan_v2_content), ai_business_plan_v2_content),
           updated_at = CURRENT_TIMESTAMP(3)`,
        [
          randomUUID(),
          session.uuid,
          projectId,
          file.id,
          file.storageKey || null,
          file.name,
          file.size,
          file.content,
          jsonOrNull(analysis),
          jsonOrNull(messages),
          jsonOrNull({ questions: planQuestions ?? null, answers: planAnswers ?? null }),
          jsonOrNull(plan),
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
