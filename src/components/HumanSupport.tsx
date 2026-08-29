import { useEffect, useState } from 'react'

export function HumanSupport() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        className="human-support-trigger"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="human-support-trigger-icon" aria-hidden="true">
          <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M5.5 15.25V13.5C5.5 8.80558 9.30558 5 14 5C18.6944 5 22.5 8.80558 22.5 13.5V15.25"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            <path
              d="M5.5 14.5H4.75C3.7835 14.5 3 15.2835 3 16.25V18.75C3 19.7165 3.7835 20.5 4.75 20.5H5.5V14.5Z"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path
              d="M22.5 14.5H23.25C24.2165 14.5 25 15.2835 25 16.25V18.75C25 19.7165 24.2165 20.5 23.25 20.5H22.5V14.5Z"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path
              d="M22.5 20.5C22.5 22.1569 21.1569 23.5 19.5 23.5H16.75"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            <path
              d="M15.25 22.25H17.25C17.9404 22.25 18.5 22.8096 18.5 23.5C18.5 24.1904 17.9404 24.75 17.25 24.75H15.25C14.5596 24.75 14 24.1904 14 23.5C14 22.8096 14.5596 22.25 15.25 22.25Z"
              fill="currentColor"
            />
            <path
              d="M17.5 9.75C18.8807 9.75 20 10.8693 20 12.25V13.75C20 15.1307 18.8807 16.25 17.5 16.25H15.5L13.5 18V16.25H12.5C11.1193 16.25 10 15.1307 10 13.75V12.25C10 10.8693 11.1193 9.75 12.5 9.75H17.5Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span>人工支持</span>
      </button>

      {open && (
        <div
          className="human-support-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <section
            className="human-support-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="human-support-title"
          >
            <button
              type="button"
              className="human-support-close"
              onClick={() => setOpen(false)}
              aria-label="关闭人工支持弹窗"
            >
              ×
            </button>
            <div className="human-support-mark" aria-hidden="true">
              O
            </div>
            <h2 id="human-support-title">人工支持</h2>
            <p>扫码添加人工支持，获取项目咨询与创业陪伴。</p>
            <img
              className="human-support-qr"
              src="/opc-coach-qr.png"
              alt="人工支持二维码"
            />
            <small>微信扫码联系人工支持</small>
          </section>
        </div>
      )}
    </>
  )
}
