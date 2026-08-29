import { useState } from 'react'
import { useAppStore, useCurrentProject } from '../store'
import { RadarChart } from '../components/RadarChart'

export function Analysis() {
  const project = useCurrentProject()
  const setTab = useAppStore((s) => s.setTab)
  const setPendingChatSeed = useAppStore((s) => s.setPendingChatSeed)
  const [posterOpen, setPosterOpen] = useState(false)

  if (!project?.analysis) {
    return <EmptyAnalysis />
  }
  const a = project.analysis
  const weakest = a.dims.reduce((x, y) => (x.value < y.value ? x : y))

  const askFrom = (title: string) => {
    setPendingChatSeed(title)
    setTab('chat')
  }

  return (
    <div style={{ animation: 'opcFade .3s both' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 14,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h4 style={{ margin: '0 0 3px', fontSize: 19, fontFamily: 'var(--font-heading)' }}>
            商业分析
          </h4>
          <div style={{ fontSize: 12, color: '#75798c' }}>
            基于 {project.files.length} 份材料与 {project.messages.length} 轮追问的全部历史 · 更新于{' '}
            {a.updatedAt}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setTab('materials')}>
            补充材料
          </button>
          <button className="btn btn-primary" onClick={() => setPosterOpen(true)}>生成 BPTI 海报</button>
        </div>
      </div>

      <div style={{ padding: '18px 22px', borderRadius: 12, background: '#232532', boxShadow: 'var(--shadow-sm)', marginBottom: 16, maxWidth: 1100 }}>
        <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: 8 }}>项目综述</div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.85, color: '#cfd3e5' }}>{a.narrative}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.02fr 1fr', gap: 16 }}>
          {/* 左：评分 + 雷达 */}
          <div
            style={{
              padding: '20px 22px',
              borderRadius: 12,
              background: '#232532',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 11,
                marginBottom: 2,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  color: 'var(--color-accent)',
                }}
              >
                综合评分
              </span>
              <span
                style={{
                  fontSize: 34,
                  fontFamily: 'var(--font-heading)',
                  lineHeight: 1,
                }}
              >
                {a.score}
              </span>
              <span style={{ fontSize: 12, color: '#75798c' }}>/ 100</span>
              <span className="tag tag-accent" style={{ marginLeft: 'auto' }}>
                较上次 {a.scoreDelta}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#9397ab' }}>
              五个维度里，最弱的是{weakest.label}。
            </div>
            <RadarChart
              dims={a.dims}
              lastDims={project.lastAnalysis?.dims}
            />
            <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#75798c' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 14, height: 2, background: '#9184d9' }} />
                本次
              </span>
              {project.lastAnalysis && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{ width: 14, height: 0, borderTop: '2px dashed #595d6c' }}
                  />
                  上次
                </span>
              )}
            </div>
          </div>

          {/* 右：亮点 + 问题 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                padding: '18px 20px',
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
                  marginBottom: 11,
                }}
              >
                做得对的地方
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {a.highlights.map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10 }}>
                    <span
                      style={{
                        width: 2,
                        flex: 'none',
                        borderRadius: 2,
                        background: 'var(--color-accent)',
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{h.title}</div>
                      <div style={{ fontSize: 12.5, color: '#9397ab', lineHeight: 1.65 }}>
                        {h.body}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div
              style={{
                padding: '18px 20px',
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
                  marginBottom: 11,
                }}
              >
                需要面对的问题
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {a.issues.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span
                      className="tag tag-neutral"
                      style={{ flex: 'none', marginTop: 2 }}
                    >
                      {p.level}
                    </span>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{p.title}</div>
                      <div style={{ fontSize: 12.5, color: '#9397ab', lineHeight: 1.65 }}>
                        {p.body}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <h5 style={{ margin: 0, fontSize: 15, fontFamily: 'var(--font-heading)' }}>
              接下来两周，建议这么走
            </h5>
            <span style={{ fontSize: 11.5, color: '#75798c' }}>按影响面排序</span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 14,
            }}
          >
            {a.actions.map((ac) => (
              <div
                key={ac.no}
                style={{
                  padding: '16px 18px',
                  borderRadius: 12,
                  background: '#232532',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 22,
                      color: '#595d6c',
                    }}
                  >
                    {ac.no}
                  </span>
                  <span className="tag tag-accent">{ac.dim}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>
                  {ac.title}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: '#9397ab',
                    lineHeight: 1.65,
                    flex: 1,
                  }}
                >
                  {ac.body}
                </div>
                <div style={{ fontSize: 11, color: '#75798c' }}>{ac.meta}</div>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 12, padding: '4px 10px', alignSelf: 'flex-start' }}
                  onClick={() => askFrom(ac.title)}
                >
                  带这条去追问
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      {posterOpen && <Poster projectName={project.name} score={a.score} dims={a.dims.map((d) => [d.label, d.value])} onClose={() => setPosterOpen(false)} />}
    </div>
  )
}

function Poster({ projectName, score, dims, onClose }: { projectName: string; score: number; dims: [string, number][]; onClose: () => void }) {
  return <div className="poster-backdrop" onClick={onClose}><div className="bpti-poster" onClick={(e) => e.stopPropagation()}><button className="poster-close" onClick={onClose}>×</button><div className="profile-kicker">OPC COACH · BPTI</div><h2>你的商业计划属性</h2><h3>{projectName}</h3><div className="poster-score">{score}<span>/ 100</span></div><p>这是一份仍在验证中的商业计划。先把最关键的假设变成可观察的数据，再决定下一步扩大什么。</p><div className="poster-dims">{dims.map(([label, value]) => <div key={label}><span>{label}</span><i><b style={{ width: `${value}%` }} /></i><em>{value}</em></div>)}</div><button className="btn btn-primary" onClick={onClose}>保存图片</button></div></div>
}

function EmptyAnalysis() {
  const setScreen = useAppStore((s) => s.setScreen)

  return (
    <div style={{ padding: 40, color: '#75798c', textAlign: 'center' }}>
      <div style={{ marginBottom: 16 }}>
        分析结果还没生成，稍等一下或重新上传材料。
      </div>
      <button className="btn btn-secondary" onClick={() => setScreen('empty')}>
        返回上传页
      </button>
    </div>
  )
}
