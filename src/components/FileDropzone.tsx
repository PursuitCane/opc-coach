import { useRef, useState } from 'react'
import { extractPdfText } from '../lib/pdf'
import { extractMdText } from '../lib/md'
import { uploadMaterial } from '../lib/materials'
import type { StagedFile } from '../store/types'

interface Props {
  onStaged: (files: StagedFile[]) => void
  compact?: boolean
  disabled?: boolean
}

const MAX_SIZE = 10 * 1024 * 1024

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function FileDropzone({ onStaged, compact, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const isFileDrag = (event: React.DragEvent<HTMLDivElement>) => {
    return Array.from(event.dataTransfer.types).includes('Files')
  }

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0 || busy || disabled) return
    setError('')
    if (list.length > 1) {
      setError('一次只能上传 1 份材料，请重新选择。')
      return
    }
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
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragEnter={(e) => {
          if (!disabled && !busy && isFileDrag(e)) {
            e.preventDefault()
            setDragOver(true)
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = disabled || busy ? 'none' : 'copy'
          if (!disabled && !busy && isFileDrag(e)) setDragOver(true)
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false)
        }}
        onDragEnd={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (!disabled && !busy && isFileDrag(e)) handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `1px dashed ${dragOver ? 'var(--color-accent)' : '#4a4e60'}`,
          borderRadius: 14,
          padding: compact ? '24px 20px' : '42px 32px',
          background: dragOver ? 'rgba(145,132,217,.06)' : 'rgba(35,37,50,.42)',
          cursor: busy ? 'progress' : disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.58 : 1,
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
              {busy ? '解析中…' : disabled ? '已上传 1 份材料' : '把文件拖到这里，或点击选择'}
            </div>
            <div style={{ fontSize: 12, color: '#75798c', marginTop: 5 }}>
              {disabled
                ? 'demo阶段暂时只支持分析 1 份材料，如需更换材料，请先删除当前材料'
                : '只支持 PDF / Markdown，单个不超过 10MB'}
            </div>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.md,.markdown,application/pdf,text/markdown"
          disabled={busy || disabled}
          style={{ display: 'none' }}
          onClick={(e) => {
            // 允许删除后再次选择同一个文件时仍然触发 change。
            e.currentTarget.value = ''
          }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#f4a5a5' }}>⚠️ {error}</div>
      )}
    </div>
  )
}
