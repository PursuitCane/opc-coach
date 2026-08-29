import { useEffect } from 'react'
import { useCurrentProject } from '../store'

interface Props {
  open: boolean
  onClose: () => void
}

export function Materials({ open, onClose }: Props) {
  const project = useCurrentProject()

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open || !project) return null

  return (
    <div
      className="materials-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="materials-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="materials-dialog-title"
      >
        <div className="materials-dialog-header">
          <div>
            <h4 id="materials-dialog-title">材料管理</h4>
            <div className="materials-dialog-subtitle">
              {project.files.length} 份材料 · 项目创建时上传
            </div>
          </div>
          <button className="materials-dialog-close" onClick={onClose} aria-label="关闭材料管理">
            ×
          </button>
        </div>

        <div className="materials-table-wrap">
          <table className="table" style={{ marginBottom: 12 }}>
            <thead>
              <tr>
                <th>材料</th>
                <th>来源</th>
                <th>加入时间</th>
                <th>已用于</th>
              </tr>
            </thead>
            <tbody>
              {project.files.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          fontSize: 10,
                          color: 'var(--color-accent)',
                          width: 38,
                        }}
                      >
                        {f.ext}
                      </span>
                      <span style={{ fontSize: 13.5 }}>{f.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12.5, color: '#9397ab' }}>{f.from}</td>
                  <td style={{ fontSize: 12.5, color: '#9397ab' }}>{f.at}</td>
                  <td>
                    <span className="tag tag-neutral">{f.used}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="materials-dialog-note">
          当前 demo 阶段不支持追加或删除材料，创建项目后材料清单保持不变。
          <br />
          想换一批材料？回到首页重新创建项目。
        </div>
      </section>
    </div>
  )
}
