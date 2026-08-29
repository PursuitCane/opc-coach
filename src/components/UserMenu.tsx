import { useEffect, useRef, useState } from 'react'

interface Props {
  onLogout: () => Promise<void> | void
  email: string
}

export function UserMenu({ onLogout, email }: Props) {
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [toast, setToast] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const username = email.split('@')[0] || email || '用户'
  const avatar = Array.from(username)[0] || '用'

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await onLogout()
    } finally {
      setLoggingOut(false)
      setOpen(false)
    }
  }

  const showToast = (message: string) => {
    setOpen(false)
    setToast(message)
  }

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '4px 6px',
          borderRadius: 8,
          border: 0,
          background: 'transparent',
          color: '#9397ab',
          fontSize: 12.5,
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: '#3f424d',
            display: 'grid',
            placeItems: 'center',
            fontSize: 10,
            color: '#cfd3e5',
          }}
        >
          {avatar}
        </span>
        {username}
        <span aria-hidden="true" style={{ fontSize: 10, color: '#75798c' }}>
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 38,
            right: 0,
            zIndex: 40,
            width: 232,
            padding: 8,
            borderRadius: 11,
            background: '#232532',
            boxShadow: 'var(--shadow-md)',
            animation: 'opcFade .18s both',
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => showToast('OPC Token 余额 1,280，可用于抵扣服务费用')}
            style={menuItemStyle('#e9e9ed')}
          >
            OPC Token<span style={menuValueStyle}>1,280</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => showToast('成长积分 420，本周 +35')}
            style={menuItemStyle('#e9e9ed')}
          >
            成长积分<span style={menuValueStyle}>420</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => showToast('将在正式版本中开放')}
            style={menuItemStyle('#e9e9ed')}
          >
            权益兑换<span style={menuValueStyle}>3 项可兑换</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            style={menuItemStyle('var(--color-accent)')}
          >
            {loggingOut ? '正在退出…' : '退出登录'}
          </button>
        </div>
      )}
      {toast && <div className="user-menu-toast">{toast}</div>}
    </div>
  )
}

const menuValueStyle = {
  marginLeft: 'auto',
  fontSize: 12,
  color: '#75798c',
}

function menuItemStyle(color: string) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    textAlign: 'left' as const,
    padding: '8px 10px',
    border: 0,
    borderRadius: 8,
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    color,
  }
}
