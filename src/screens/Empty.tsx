import { useState } from 'react'
import { useAppStore } from '../store'
import { FileDropzone } from '../components/FileDropzone'
import { archiveProject } from '../lib/archive'
import type { FileItem, StagedFile } from '../store/types'

function todayLabel(): string {
  const d = new Date()
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`
}

export function Empty() {
  const createProject = useAppStore((s) => s.createProject)
  const draftName = useAppStore((s) => s.draftName)
  const setDraftName = useAppStore((s) => s.setDraftName)
  const [staged, setStaged] = useState<StagedFile[]>([])

  const handleCreate = () => {
    if (staged.length === 0) return
    const files: FileItem[] = staged.map((s, i) => ({
      id: `f-${Date.now()}-${i}`,
      name: s.name,
      ext: s.ext,
      size: s.size,
      at: todayLabel(),
      from: '手动上传',
      used: '分析 / 计划',
      content: s.content,
      storageKey: s.storageKey,
    }))
    const projectName = draftName || '未命名项目'
    const projectId = createProject(projectName, files)
    void archiveProject({ projectId, projectName, files }).catch((error) => {
      console.warn('项目附件归档失败：', error)
    })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main
        style={{
          flex: 1,
          display: 'grid',
          placeItems: 'center',
          padding: '52px 34px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 660,
            textAlign: 'center',
            animation: 'opcFade .4s both',
          }}
        >
          <h2
            style={{
              fontSize: 28,
              margin: '0 0 10px',
              fontFamily: 'var(--font-heading)',
              fontWeight: 500,
            }}
          >
            先上传材料，我们一起把项目建起来
          </h2>
          <p
            style={{
              color: '#9397ab',
              fontSize: 14,
              margin: '0 0 26px',
              lineHeight: 1.7,
            }}
          >
            商业计划、产品文档、客户访谈——PDF 或 Markdown 都行。
            <br />
            材料越全，我看得越准；之后随时可以补。
          </p>

          <FileDropzone onStaged={(fs) => setStaged((prev) => [...prev, ...fs])} />

          {staged.length > 0 && (
            <div
              style={{
                marginTop: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
                textAlign: 'left',
              }}
            >
              {staged.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 11px',
                    borderRadius: 8,
                    background: '#232532',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      letterSpacing: '.06em',
                      color: 'var(--color-accent)',
                      width: 38,
                    }}
                  >
                    {f.ext}
                  </span>
                  <span style={{ fontSize: 13, flex: 1, minWidth: 0 }}>{f.name}</span>
                  <span style={{ fontSize: 11, color: '#75798c' }}>{f.size}</span>
                  <span className="tag tag-neutral">已就绪</span>
                </div>
              ))}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <div className="field" style={{ flex: 1 }}>
                  <label>项目名称</label>
                  <input
                    className="input"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="给这个项目起个名字"
                  />
                </div>
                <button
                  className="btn btn-primary"
                  style={{ height: 36, whiteSpace: 'nowrap' }}
                  onClick={handleCreate}
                  disabled={!draftName.trim()}
                >
                  创建项目并开始分析
                </button>
              </div>
            </div>
          )}

          <div style={{ fontSize: 11.5, color: '#595d6c', marginTop: 18 }}>
            当前版本只支持一个项目。创建后可持续补充材料，每次补充都会刷新商业分析。
          </div>
        </div>
      </main>
    </div>
  )
}

function Header() {
  return (
    <header
      style={{
        background: 'rgba(19,21,35,.9)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--color-divider)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 34px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div
            style={{
              width: 24,
              height: 24,
              border: '1px solid var(--color-accent)',
              borderRadius: 7,
              display: 'grid',
              placeItems: 'center',
              color: 'var(--color-accent)',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            O
          </div>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 15 }}>
            OPC Coach
          </span>
        </div>
        <div style={{ width: 1, height: 18, background: 'var(--color-divider)' }} />
        <span style={{ fontSize: 13, color: '#75798c' }}>还没有项目</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn btn-secondary"
            disabled
            title="暂不支持创建新项目"
            style={{ fontSize: 12.5 }}
          >
            ＋ 新建项目（即将开放）
          </button>
        </div>
      </div>
    </header>
  )
}
