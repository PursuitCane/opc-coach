import { useState } from 'react'
import { devLogin, requestEmailCode, verifyEmailCode } from '../lib/auth'

interface Props {
  onAuthenticated: () => void
}

export function Auth({ onAuthenticated }: Props) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [devBusy, setDevBusy] = useState(false)
  const [error, setError] = useState('')

  const sendCode = async () => {
    setError('')
    setBusy(true)
    try {
      await requestEmailCode(email)
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : '验证码发送失败。')
    } finally {
      setBusy(false)
    }
  }

  const verifyCode = async () => {
    setError('')
    setBusy(true)
    try {
      await verifyEmailCode(email, code)
      onAuthenticated()
    } catch (e) {
      setError(e instanceof Error ? e.message : '登录失败。')
    } finally {
      setBusy(false)
    }
  }

  const loginWithoutCode = async () => {
    setError('')
    setDevBusy(true)
    try {
      await devLogin(email)
      onAuthenticated()
    } catch (e) {
      setError(e instanceof Error ? e.message : '本地登录失败。')
    } finally {
      setDevBusy(false)
    }
  }

  return (
    <div className="landing-signin" id="signin">
      <h3>开始使用</h3>
      <p>上传一份材料，几分钟内拿到第一版商业分析。</p>
      <div className="field">
        <label>邮箱</label>
        <input
          className="input"
          type="email"
          value={email}
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
          disabled={busy || sent}
        />
      </div>
      <div className="field">
        <label>验证码</label>
        <div className="landing-code">
          <input
            className="input"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            disabled={busy || !sent}
          />
          <button className="btn btn-secondary" onClick={sendCode} disabled={busy || !email.trim()}>
            {busy ? '发送中…' : sent ? '重新发送' : '获取验证码'}
          </button>
        </div>
      </div>
      {error && <small style={{ color: '#fca5a5' }}>{error}</small>}
      <div className="landing-auth-actions">
        <button
          className="btn btn-primary btn-block"
          style={{ height: 40 }}
          onClick={verifyCode}
          disabled={busy || !sent || code.length !== 6}
        >
          {busy && sent ? '验证中…' : '登录，进入工作台'}
        </button>
        {import.meta.env.MODE === 'development' && (
          <button
            className="btn btn-secondary landing-dev-login"
            style={{ height: 40 }}
            onClick={loginWithoutCode}
            disabled={busy || devBusy}
            title="仅本地开发环境可用"
          >
            {devBusy ? '登录中…' : '本地免验证码'}
          </button>
        )}
      </div>
      <small>登录即表示同意服务条款与隐私政策</small>
    </div>
  )
}
