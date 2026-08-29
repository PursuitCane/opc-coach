import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore, useCurrentProject } from '../store'
import { RadarChart } from '../components/RadarChart'
import { useAnalysisRequestPending } from '../lib/analysisRequest'
import type { AuthUser } from '../lib/auth'

interface Props {
  onOpenMaterials: () => void
  user: AuthUser
}

export function Analysis({ onOpenMaterials, user }: Props) {
  const project = useCurrentProject()
  const setTab = useAppStore((s) => s.setTab)
  const setPendingChatSeed = useAppStore((s) => s.setPendingChatSeed)
  const [posterOpen, setPosterOpen] = useState(false)
  const analysisRequestPending = useAnalysisRequestPending(project?.id ?? null)

  if (!project?.analysis) {
    return <EmptyAnalysis requestPending={analysisRequestPending} />
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
          <button className="btn btn-secondary" onClick={onOpenMaterials}>
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
                核心问题清单
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {a.issues.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span
                      className="tag tag-neutral"
                      style={{ flex: 'none', marginTop: 2 }}
                    >
                      {p.kind === 'missing' ? '缺失' : p.kind === 'flaw' ? '缺陷' : p.level}
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
              初步优化补充建议
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

        {(a.deepDives?.length ?? 0) > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
              <h5 style={{ margin: 0, fontSize: 15, fontFamily: 'var(--font-heading)' }}>
                深度深挖方向
              </h5>
              <span style={{ fontSize: 11.5, color: '#75798c' }}>最值得强化的核心方向</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              {a.deepDives?.map((item) => (
                <div key={item.no} style={{ padding: '16px 18px', borderRadius: 12, background: 'rgba(145,132,217,.08)', boxShadow: 'inset 0 0 0 1px rgba(145,132,217,.24)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 22, color: 'var(--color-accent)' }}>{item.no}</span>
                    <span className="tag tag-accent">{item.dim}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{item.title}</div>
                  <div style={{ fontSize: 12.5, color: '#9397ab', lineHeight: 1.7, flex: 1 }}>{item.body}</div>
                  <div style={{ fontSize: 11, color: '#75798c' }}>{item.meta}</div>
                  <button className="btn btn-secondary" style={{ fontSize: 12, alignSelf: 'flex-start' }} onClick={() => askFrom(item.title)}>
                    带这条去追问
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {posterOpen && <Poster imageNo={user.bptiImageNo} onClose={() => setPosterOpen(false)} />}
    </div>
  )
}

function Poster({ imageNo, onClose }: { imageNo: number; onClose: () => void }) {
  const safeImageNo = Number.isInteger(imageNo) && imageNo >= 1 && imageNo <= 16 ? imageNo : 6
  const [downloading, setDownloading] = useState(false)

  const downloadPoster = async () => {
    setDownloading(true)
    try {
      const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error(`图片加载失败：${src}`))
        image.src = src
      })

      const [posterImage, qrImage] = await Promise.all([
        loadImage(`/share/${safeImageNo}.png`),
        loadImage('/opc-coach-qr.png'),
      ])
      const canvas = document.createElement('canvas')
      canvas.width = posterImage.naturalWidth
      canvas.height = posterImage.naturalHeight
      const context = canvas.getContext('2d')
      if (!context) throw new Error('无法创建海报画布')

      context.drawImage(posterImage, 0, 0)
      const qrWidth = canvas.width * 0.2
      const qrHeight = qrWidth * (qrImage.naturalHeight / qrImage.naturalWidth)
      const qrX = canvas.width * 0.1
      const qrY = canvas.height * (1 - 0.19) - qrHeight
      context.drawImage(qrImage, qrX, qrY, qrWidth, qrHeight)

      context.fillStyle = '#2f2a2a'
      context.font = '500 30px "PingFang SC", "Microsoft YaHei", sans-serif'
      context.fillText('测测你的BP“人格”：', canvas.width * 0.1, canvas.height * 0.845)
      context.fillText('进群获取链接即可开测', canvas.width * 0.1, canvas.height * 0.87)

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('海报生成失败')
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `bpti-poster-${safeImageNo}.png`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  return createPortal(
    <div className="poster-backdrop" role="presentation" onClick={onClose}>
      <div className="poster-dialog" role="dialog" aria-modal="true" aria-label="BPTI 海报" onClick={(e) => e.stopPropagation()}>
        <div className="bpti-poster">
          <button className="poster-close" aria-label="关闭海报" onClick={onClose}>×</button>
          <img className="bpti-poster-image" src={`/share/${safeImageNo}.png`} alt={`BPTI 海报 ${safeImageNo}`} />
          <img className="bpti-poster-qr" src="/opc-coach-qr.png" alt="OPC Coach 二维码" />
          <div className="bpti-poster-copy" aria-hidden="true">
            <div>测测你的BP“人格”：</div>
            <div>进群获取链接即可开测</div>
          </div>
        </div>
        <button className="btn btn-primary poster-share" onClick={downloadPoster} disabled={downloading}>
          {downloading ? '生成中…' : '分享海报'}
        </button>
      </div>
    </div>,
    document.body,
  )
}

function EmptyAnalysis({ requestPending }: { requestPending: boolean }) {
  const setScreen = useAppStore((s) => s.setScreen)

  return (
    <div className="analysis-empty" role="status" aria-live="polite">
      {requestPending ? (
        <>
          <div className="analysis-loading-spinner" aria-hidden="true" />
          <div className="analysis-empty-title">正在生成分析结果</div>
          <div className="analysis-empty-copy">
            请求仍在处理中，请稍等一下
            <span className="analysis-loading-dots" aria-hidden="true">
              …
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="analysis-empty-mark" aria-hidden="true">
            —
          </div>
          <div className="analysis-empty-title">分析结果还没生成</div>
          <div className="analysis-empty-copy">
            当前没有正在等待的分析请求，请重新上传材料后再试。
          </div>
        </>
      )}
      {!requestPending && (
        <div className="analysis-empty-action">
          <button className="btn btn-secondary" onClick={() => setScreen('empty')}>
            返回上传页
          </button>
        </div>
      )}
    </div>
  )
}
