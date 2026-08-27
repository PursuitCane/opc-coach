import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { ChatMessage } from '../lib/schema'

interface Props {
  history: ChatMessage[]
  onAsk: (question: string) => void
  loading: boolean
}

export function Chat({ history, onAsk, loading }: Props) {
  const [input, setInput] = useState('')

  const submit = () => {
    const q = input.trim()
    if (!q || loading) return
    onAsk(q)
    setInput('')
  }

  return (
    <div className="chat">
      <div className="chat-log">
        {history.length === 0 && (
          <p className="chat-hint">就报告里的任何一点追问军师，或补充 BP 信息。</p>
        )}
        {history.map((m, i) => (
          <div key={i} className={`bubble bubble-${m.role}`}>
            <span className="bubble-who">{m.role === 'user' ? 'OPC' : '军师'}</span>
            <div className="bubble-body">
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {loading && <div className="bubble bubble-assistant">军师思考中…</div>}
      </div>

      <div className="chat-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
          }}
          placeholder="追问军师…（Cmd/Ctrl + Enter 发送）"
          rows={2}
        />
        <button onClick={submit} disabled={loading || !input.trim()}>
          发送
        </button>
      </div>
    </div>
  )
}
