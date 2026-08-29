import { useEffect, useRef, useState } from 'react'

interface Props {
  onLogout: () => Promise<void> | void
}

export function UserMenu({ onLogout }: Props) {
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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
          padding: 0,
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
          我
        </span>
        我
        <span aria-hidden="true" style={{ fontSize: 10, color: '#75798c' }}>
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 12px)',
            right: 0,
            zIndex: 30,
            minWidth: 168,
            padding: 7,
            border: '1px solid #4a4e60',
            borderRadius: 11,
            background: '#232532',
            boxShadow: '0 14px 35px rgba(0, 0, 0, .35)',
          }}
        >
          <div
            style={{
              padding: '8px 10px 9px',
              borderBottom: '1px solid var(--color-divider)',
              color: '#75798c',
              fontSize: 11,
            }}
          >
            账户
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            style={{
              display: 'block',
              width: '100%',
              marginTop: 5,
              padding: '9px 10px',
              border: 0,
              borderRadius: 7,
              background: 'transparent',
              color: 'var(--color-accent-300)',
              textAlign: 'left',
              font: 'inherit',
              fontSize: 13,
              cursor: loggingOut ? 'wait' : 'pointer',
            }}
          >
            {loggingOut ? '正在退出…' : '退出登录'}
          </button>
        </div>
      )}
    </div>
  )
}
