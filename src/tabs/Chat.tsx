import { useEffect, useRef, useState } from 'react'
import { useAppStore, useCurrentProject } from '../store'
import { streamCoach } from '../prompts/socratic'
import { archiveProject } from '../lib/archive'

const PROMPTS = [
  '我该先涨价还是先扩渠道？',
  '一个人做，什么时候该拒单？',
  '帮我拆解这周的验证结果',
]

export function Chat() {
  const project = useCurrentProject()
  const appendMessage = useAppStore((s) => s.appendMessage)
  const updateLastMessage = useAppStore((s) => s.updateLastMessage)
  const setPendingChatSeed = useAppStore((s) => s.setPendingChatSeed)

  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // pendingChatSeed → 预填 input
  useEffect(() => {
    if (project?.pendingChatSeed) {
      setDraft(`就这条给我拆一下：${project.pendingChatSeed}`)
      setPendingChatSeed(null)
    }
  }, [project?.pendingChatSeed, setPendingChatSeed])

  // 自动滚到底
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [project?.messages.length, thinking])

  const send = async () => {
    const text = draft.trim()
    if (!text || thinking || !project) return
    setError('')
    setDraft('')
    appendMessage({ who: '我', text })
    appendMessage({ who: '教练', text: '' })
    setThinking(true)
    try {
      const currentMessages = [
        ...(project.messages || []),
        { who: '我' as const, text },
      ]
      const response = await streamCoach({
        analysis: project.analysis,
        messages: currentMessages,
        onDelta: (chunk) => {
          updateLastMessage((m) => ({ ...m, text: m.text + chunk }))
        },
      })
      void archiveProject({
        projectId: project.id,
        files: project.files,
        analysis: project.analysis,
        messages: [...currentMessages, { who: '教练', text: response }],
        planQuestions: project.planQuestions,
        planAnswers: project.planAnswers,
        plan: project.plan,
      }).catch((error) => {
        console.warn('追问反馈归档失败：', error)
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      updateLastMessage((m) => ({ ...m, text: m.text || '（教练暂时无法回复）' }))
    } finally {
      setThinking(false)
    }
  }

  const messages = project?.messages ?? []

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 262px',
        gap: 22,
        animation: 'opcFade .3s both',
        alignItems: 'start',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 208px)',
          borderRadius: 12,
          background: '#232532',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--color-divider)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15 }}>
              苏格拉底式追问
            </div>
            <div style={{ fontSize: 11.5, color: '#75798c' }}>
              我不给答案，只把问题推到你能回答的地方
            </div>
          </div>
          <span className="tag tag-outline" style={{ marginLeft: 'auto' }}>
            {messages.length} 轮
          </span>
        </div>

        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                color: '#75798c',
                fontSize: 13,
                textAlign: 'center',
                padding: '40px 20px',
                lineHeight: 1.8,
              }}
            >
              还没开始聊。可以从分析页"带条建议来"，
              <br />
              或者直接问我一个正在纠结的事。
            </div>
          )}
          {messages.map((m, i) => {
            const me = m.who === '我'
            const isLast = i === messages.length - 1
            const showThinkingDots =
              thinking && isLast && !me && m.text.length === 0
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: me ? 'flex-end' : 'flex-start',
                  gap: 5,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                    color: '#75798c',
                  }}
                >
                  {m.who}
                </div>
                <div
                  style={{
                    maxWidth: '74%',
                    padding: '12px 15px',
                    borderRadius: 11,
                    fontSize: 13.5,
                    lineHeight: 1.75,
                    background: me ? 'rgba(145,132,217,.14)' : '#2b2d3b',
                    color: me ? '#e7e5fe' : '#cfd3e5',
                    boxShadow: me
                      ? 'inset 0 0 0 1px rgba(145,132,217,.32)'
                      : 'none',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {showThinkingDots ? <ThinkingDots /> : m.text}
                </div>
              </div>
            )
          })}
          {error && (
            <div style={{ fontSize: 12, color: '#f4a5a5' }}>⚠️ {error}</div>
          )}
        </div>

        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--color-divider)',
          }}
        >
          <div style={{ display: 'flex', gap: 9, alignItems: 'flex-end' }}>
            <textarea
              className="input"
              style={{ minHeight: 42, maxHeight: 120 }}
              placeholder="说说你现在最纠结的事……"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              disabled={thinking}
            />
            <button
              className="btn btn-primary"
              style={{ height: 42, flex: 'none' }}
              onClick={send}
              disabled={thinking || !draft.trim()}
            >
              发送
            </button>
          </div>
          <div style={{ display: 'flex', gap: 7, marginTop: 9, flexWrap: 'wrap' }}>
            {PROMPTS.map((p) => (
              <button
                key={p}
                className="btn btn-secondary"
                style={{ fontSize: 11.5, padding: '3px 9px' }}
                onClick={() => setDraft(p)}
                disabled={thinking}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <SidePanel />
    </div>
  )
}

function ThinkingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 6, padding: '4px 2px' }}>
      {[0, 0.15, 0.3].map((d, i) => (
        <span
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: '#75798c',
            animation: `opcDot 1.2s ${d}s infinite ease-in-out`,
          }}
        />
      ))}
    </span>
  )
}

function SidePanel() {
  const project = useCurrentProject()
  const setTab = useAppStore((s) => s.setTab)
  if (!project) return null

  const weakest = project.analysis
    ? project.analysis.dims.reduce((a, b) => (a.value < b.value ? a : b))
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        style={{
          padding: '16px 18px',
          borderRadius: 12,
          background: '#232532',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            color: 'var(--color-accent)',
            marginBottom: 10,
          }}
        >
          这段对话在追什么
        </div>
        {weakest ? (
          <>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: '#cfd3e5' }}>
              {weakest.label}（{weakest.value} 分）
            </div>
            <div style={{ height: 1, margin: '13px 0', background: 'var(--color-divider)' }} />
            <div style={{ fontSize: 12, color: '#9397ab', lineHeight: 1.7 }}>
              {project.analysis?.issues[0]?.body ?? ''}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: '#75798c' }}>先去做一次分析</div>
        )}
      </div>

      <div
        style={{
          padding: '16px 18px',
          borderRadius: 12,
          background: '#232532',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            color: '#b2b6ca',
            marginBottom: 10,
          }}
        >
          去成长记录
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: '#9397ab',
            lineHeight: 1.7,
            marginBottom: 12,
          }}
        >
          聊完这段对话，可以在成长记录里点"总结这次对话"，让教练帮你压成一条日记。
        </div>
        <button
          className="btn btn-secondary"
          style={{ fontSize: 12 }}
          onClick={() => setTab('diary')}
        >
          去看看 →
        </button>
      </div>
    </div>
  )
}
