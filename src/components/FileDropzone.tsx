import { useRef, useState } from 'react'
import { extractPdfText } from '../lib/pdf'
import { extractMdText } from '../lib/md'
import { uploadMaterial } from '../lib/materials'
import type { StagedFile } from '../store/types'

interface Props {
  onStaged: (files: StagedFile[]) => void
  compact?: boolean
}

const MAX_SIZE = 10 * 1024 * 1024

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function FileDropzone({ onStaged, compact }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return
    setError('')
    setBusy(true)
    try {
      const out: StagedFile[] = []
      for (const f of Array.from(list)) {
        const lower = f.name.toLowerCase()
        const isPdf = lower.endsWith('.pdf')
        const isMd = lower.endsWith('.md') || lower.endsWith('.markdown')
        if (!isPdf && !isMd) {
          throw new Error(`${f.name} 不支持，只收 PDF 或 Markdown。`)
        }
        if (f.size > MAX_SIZE) {
          throw new Error(`${f.name} 超过 10MB。`)
        }
        const uploaded = await uploadMaterial(f)
        const content = isPdf ? await extractPdfText(f) : await extractMdText(f)
        out.push({
          ext: isPdf ? 'PDF' : 'MD',
          name: f.name,
          size: humanSize(f.size),
          content,
          storageKey: uploaded.storageKey,
        })
      }
      onStaged(out)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `1px dashed ${dragOver ? 'var(--color-accent)' : '#4a4e60'}`,
          borderRadius: 14,
          padding: compact ? '24px 20px' : '42px 32px',
          background: dragOver ? 'rgba(145,132,217,.06)' : 'rgba(35,37,50,.42)',
          cursor: busy ? 'progress' : 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            pointerEvents: 'none',
          }}
        >
          <svg
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={1.4}
          >
            <path d="M12 16V4M8 8l4-4 4 4" />
            <path d="M4 15v4h16v-4" />
          </svg>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16 }}>
              {busy ? '解析中…' : '把文件拖到这里，或点击选择'}
            </div>
            <div style={{ fontSize: 12, color: '#75798c', marginTop: 5 }}>
              只支持 PDF / Markdown，单个不超过 10MB
            </div>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.md,.markdown,application/pdf,text/markdown"
          multiple
          disabled={busy}
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#f4a5a5' }}>⚠️ {error}</div>
      )}
    </div>
  )
}
