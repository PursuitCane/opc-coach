import { createHash, randomInt, randomUUID, timingSafeEqual } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import jwt from 'jsonwebtoken'
import mysql from 'mysql2/promise'
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
  isProduction: process.env.NODE_ENV === 'production',
}

const pool = mysql.createPool({ uri: config.mysqlUrl, waitForConnections: true, connectionLimit: 10 })
const resend = new Resend(process.env.RESEND_API_KEY)
const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '16kb' }))

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

app.post('/api/auth/request-code', async (req, res, next) => {
  const email = normalizeEmail(req.body?.email)
  if (!isEmail(email)) return res.status(400).json({ error: '请输入有效的邮箱地址。' })

  try {
    await pool.execute('DELETE FROM email_login_codes WHERE expires_at <= CURRENT_TIMESTAMP(3)')
    const [existing] = await pool.execute('SELECT sent_at FROM email_login_codes WHERE email = ?', [email])
    const lastSentAt = existing[0]?.sent_at
    if (lastSentAt && Date.now() - new Date(lastSentAt).getTime() < RESEND_INTERVAL_MS) {
      return res.status(429).json({ error: '验证码刚发出，请稍候一分钟再试。' })
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
    const expiresAt = new Date(Date.now() + CODE_TTL_MS)
    await pool.execute(
      `INSERT INTO email_login_codes (email, code_hash, expires_at, attempts, sent_at)
       VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP(3))
       ON DUPLICATE KEY UPDATE
       code_hash = VALUES(code_hash), expires_at = VALUES(expires_at), attempts = 0, sent_at = CURRENT_TIMESTAMP(3)`,
      [email, codeHash(email, code), expiresAt],
    )

    const { error } = await resend.emails.send({
      from: config.emailFrom,
      to: [email],
      subject: '你的 OPC 军师登录验证码',
      html: `<p>你的 OPC 军师登录验证码是：</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>验证码 10 分钟内有效。若非本人操作，请忽略此邮件。</p>`,
    })
    if (error) {
      await pool.execute('DELETE FROM email_login_codes WHERE email = ?', [email])
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
      'SELECT code_hash, expires_at, attempts FROM email_login_codes WHERE email = ?',
      [email],
    )
    const record = rows[0]
    if (!record || new Date(record.expires_at).getTime() < Date.now()) {
      await pool.execute('DELETE FROM email_login_codes WHERE email = ?', [email])
      return res.status(400).json({ error: '验证码已失效，请重新获取。' })
    }
    if (record.attempts >= MAX_CODE_ATTEMPTS) {
      await pool.execute('DELETE FROM email_login_codes WHERE email = ?', [email])
      return res.status(429).json({ error: '尝试次数过多，请重新获取验证码。' })
    }
    if (!matchesCode(record.code_hash, codeHash(email, code))) {
      await pool.execute('UPDATE email_login_codes SET attempts = attempts + 1 WHERE email = ?', [email])
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
    await pool.execute('DELETE FROM email_login_codes WHERE email = ?', [email])
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
