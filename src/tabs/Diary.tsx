import { useState } from 'react'
import { useAppStore, useCurrentProject } from '../store'
import { generateCoachLine, summarizeChatToDiary } from '../prompts/diary'
import { archiveDiary } from '../lib/archive'

const HEATBG = ['#2b2741', '#423a6a', '#5d5294', '#9184d9']

export function Diary() {
  const project = useCurrentProject()
  const appendDiary = useAppStore((s) => s.appendDiary)
  const setCoachLine = useAppStore((s) => s.setCoachLine)
  const setTab = useAppStore((s) => s.setTab)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!project) return null

  const canSummarize = project.messages.length >= 2

  const handleSummarize = async () => {
    setBusy(true)
    setError('')
    try {
      const entry = await summarizeChatToDiary(project.messages, project.analysis)
      appendDiary(entry)
      // 顺手更新一下教练一句话
      const line = await generateCoachLine([entry, ...project.diary], project.analysis)
      setCoachLine(line)
      void archiveDiary({
        projectId: project.id,
        diaryEntry: entry,
        coachLine: line,
      }).catch((error) => {
        console.warn('成长记录归档失败：', error)
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const heatCells = buildHeatCells(project.diary)

  return (
    <div style={{ animation: 'opcFade .3s both' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 14,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h4 style={{ margin: '0 0 3px', fontSize: 19, fontFamily: 'var(--font-heading)' }}>
            成长记录
          </h4>
          <div style={{ fontSize: 12, color: '#75798c' }}>
            共 {project.diary.length} 条 · 由对话总结沉淀
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 9, alignItems: 'center' }}>
          {!canSummarize && (
            <span style={{ fontSize: 11.5, color: '#75798c' }}>
              先在追问里聊两轮，再来总结
            </span>
          )}
          <button
            className="btn btn-primary"
            disabled={!canSummarize || busy}
            onClick={handleSummarize}
          >
            {busy ? '总结中…' : '总结这次对话'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 14, fontSize: 12.5, color: '#f4a5a5' }}>⚠️ {error}</div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 262px',
          gap: 22,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {project.diary.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                borderRadius: 12,
                background: 'rgba(35,37,50,.5)',
                color: '#75798c',
                fontSize: 13.5,
                lineHeight: 1.9,
              }}
            >
              还没有记录。
              <br />
              去 <button
                className="btn btn-ghost"
                onClick={() => setTab('chat')}
                style={{ padding: '0 6px', color: 'var(--color-accent)' }}
              >
                苏格拉底追问
              </button>{' '}
              聊两句，然后回来点"总结这次对话"。
            </div>
          ) : (
            project.diary.map((d, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 16,
                  padding: '18px 20px',
                  borderRadius: 12,
                  background: '#232532',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ flex: 'none', width: 52, textAlign: 'center' }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 22,
                      lineHeight: 1,
                    }}
                  >
                    {d.day}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#75798c', marginTop: 3 }}>
                    {d.month}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: 14.5, fontWeight: 500 }}>{d.title}</span>
                    <span className="tag tag-accent">{d.tag}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#9397ab', lineHeight: 1.75 }}>
                    {d.body}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#595d6c', marginTop: 8 }}>
                    {d.meta}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

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
                marginBottom: 12,
              }}
            >
              最近 4 周
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7,1fr)',
                gap: 5,
              }}
            >
              {heatCells.map((v, i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 3,
                    background: HEATBG[v],
                  }}
                />
              ))}
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: '#75798c',
                marginTop: 11,
                lineHeight: 1.6,
              }}
            >
              越亮表示当天记录越多。
            </div>
          </div>

          {project.coachLine && (
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
                教练的一句话
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.8, color: '#cfd3e5' }}>
                {project.coachLine}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 把 diary 按日期 group → 最近 28 天热力值 (0-3)
function buildHeatCells(diary: { ts: number }[]): number[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const buckets = new Map<string, number>()
  for (const d of diary) {
    const day = new Date(d.ts)
    day.setHours(0, 0, 0, 0)
    const key = day.toISOString().slice(0, 10)
    buckets.set(key, (buckets.get(key) || 0) + 1)
  }
  const cells: number[] = []
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const count = buckets.get(key) || 0
    cells.push(Math.min(3, count))
  }
  return cells
}
