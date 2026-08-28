import { createHash, randomInt, timingSafeEqual } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import jwt from 'jsonwebtoken'
import { Pool } from 'pg'
import { Resend } from 'resend'

const required = ['DATABASE_URL', 'AUTH_SESSION_SECRET', 'AUTH_CODE_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM']
const missing = required.filter((name) => !process.env[name])
if (missing.length) {
  throw new Error(`缺少服务端环境变量：${missing.join(', ')}`)
}

const config = {
  port: Number(process.env.PORT || 8787),
  databaseUrl: process.env.DATABASE_URL,
  sessionSecret: process.env.AUTH_SESSION_SECRET,
  codeSecret: process.env.AUTH_CODE_SECRET,
  emailFrom: process.env.EMAIL_FROM,
  isProduction: process.env.NODE_ENV === 'production',
}

const pool = new Pool({ connectionString: config.databaseUrl })
const resend = new Resend(process.env.RESEND_API_KEY)
const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '16kb' }))

const CODE_TTL_MS = 10 * 60 * 1000
const RESEND_INTERVAL_MS = 60 * 1000
const MAX_CODE_ATTEMPTS = 5
const SESSION_COOKIE = 'opc_session'

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

function setSession(res, email) {
  const token = jwt.sign({ sub: email }, config.sessionSecret, { expiresIn: '7d' })
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
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
    return typeof payload === 'object' && typeof payload.sub === 'string' ? { email: payload.sub } : null
  } catch {
    return null
  }
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS email_login_codes (
      email TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
}

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.post('/api/auth/request-code', async (req, res, next) => {
  const email = normalizeEmail(req.body?.email)
  if (!isEmail(email)) return res.status(400).json({ error: '请输入有效的邮箱地址。' })

  try {
    const existing = await pool.query('SELECT sent_at FROM email_login_codes WHERE email = $1', [email])
    const lastSentAt = existing.rows[0]?.sent_at
    if (lastSentAt && Date.now() - new Date(lastSentAt).getTime() < RESEND_INTERVAL_MS) {
      return res.status(429).json({ error: '验证码刚发出，请稍候一分钟再试。' })
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
    const expiresAt = new Date(Date.now() + CODE_TTL_MS)
    await pool.query(
      `INSERT INTO email_login_codes (email, code_hash, expires_at, attempts, sent_at)
       VALUES ($1, $2, $3, 0, NOW())
       ON CONFLICT (email) DO UPDATE
       SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0, sent_at = NOW()`,
      [email, codeHash(email, code), expiresAt],
    )

    const { error } = await resend.emails.send({
      from: config.emailFrom,
      to: [email],
      subject: '你的 OPC 军师登录验证码',
      html: `<p>你的 OPC 军师登录验证码是：</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>验证码 10 分钟内有效。若非本人操作，请忽略此邮件。</p>`,
    })
    if (error) {
      await pool.query('DELETE FROM email_login_codes WHERE email = $1', [email])
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
    const result = await pool.query(
      'SELECT code_hash, expires_at, attempts FROM email_login_codes WHERE email = $1',
      [email],
    )
    const record = result.rows[0]
    if (!record || new Date(record.expires_at).getTime() < Date.now()) {
      await pool.query('DELETE FROM email_login_codes WHERE email = $1', [email])
      return res.status(400).json({ error: '验证码已失效，请重新获取。' })
    }
    if (record.attempts >= MAX_CODE_ATTEMPTS) {
      await pool.query('DELETE FROM email_login_codes WHERE email = $1', [email])
      return res.status(429).json({ error: '尝试次数过多，请重新获取验证码。' })
    }
    if (!matchesCode(record.code_hash, codeHash(email, code))) {
      await pool.query('UPDATE email_login_codes SET attempts = attempts + 1 WHERE email = $1', [email])
      return res.status(400).json({ error: '验证码不正确。' })
    }

    await pool.query(
      `INSERT INTO users (email) VALUES ($1)
       ON CONFLICT (email) DO UPDATE SET last_login_at = NOW()`,
      [email],
    )
    await pool.query('DELETE FROM email_login_codes WHERE email = $1', [email])
    setSession(res, email)
    return res.json({ user: { email } })
  } catch (error) {
    return next(error)
  }
})

app.get('/api/auth/me', (req, res) => {
  const user = currentUser(req)
  if (!user) return res.status(401).json({ error: '未登录' })
  return res.json({ user })
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

initializeDatabase()
  .then(() => app.listen(config.port, () => console.log(`OPC 军师运行在 :${config.port}`)))
  .catch((error) => {
    console.error('数据库初始化失败', error)
    process.exit(1)
  })
