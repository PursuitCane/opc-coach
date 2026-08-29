import { useEffect, useState } from 'react'

function isMobileDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false

  const userAgent = navigator.userAgent || ''
  const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    userAgent,
  )
  const isTouchMac = /Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1
  const isSmallTouchScreen = window.matchMedia?.('(pointer: coarse) and (max-width: 900px)').matches

  return isMobileUserAgent || isTouchMac || isSmallTouchScreen
}

async function copyCurrentUrl() {
  const url = window.location.href

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url)
      return true
    } catch {
      // 某些移动浏览器要求安全上下文，失败后走兼容方案。
    }
  }

  const input = document.createElement('textarea')
  input.value = url
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.select()
  input.setSelectionRange(0, input.value.length)

  let copied = false
  try {
    copied = document.execCommand('copy')
  } finally {
    document.body.removeChild(input)
  }
  return copied
}

export function MobileAccessDialog() {
  const [mobile, setMobile] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => {
    setMobile(isMobileDevice())
  }, [])

  useEffect(() => {
    if (!mobile) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [mobile])

  if (!mobile) return null

  const handleCopy = async () => {
    const copied = await copyCurrentUrl()
    setCopyState(copied ? 'copied' : 'failed')
  }

  return (
    <div className="mobile-access-backdrop" role="presentation">
      <section
        className="mobile-access-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-access-title"
      >
        <div className="mobile-access-mark" aria-hidden="true">
          O
        </div>
        <h2 id="mobile-access-title">请使用电脑访问，以获得完整体验</h2>
        <p>请复制当前链接，并在电脑浏览器中打开。</p>
        <button className="btn btn-primary btn-block" onClick={handleCopy}>
          {copyState === 'copied' ? '链接已复制' : '复制链接'}
        </button>
        {copyState === 'failed' && <small className="mobile-access-error">复制失败，请手动复制当前网址</small>}
      </section>
    </div>
  )
}
