import { useCurrentProject } from '../store'

export function Materials() {
  const project = useCurrentProject()
  if (!project) return null

  return (
    <div style={{ animation: 'opcFade .3s both', maxWidth: 1000 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div>
          <h4 style={{ margin: '0 0 3px', fontSize: 19, fontFamily: 'var(--font-heading)' }}>
            材料管理
          </h4>
          <div style={{ fontSize: 12, color: '#75798c' }}>
            {project.files.length} 份材料 · 项目创建时上传
          </div>
        </div>
      </div>

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

      <div
        style={{
          padding: '18px 20px',
          border: '1px dashed #4a4e60',
          borderRadius: 12,
          textAlign: 'center',
          color: '#75798c',
          fontSize: 12.5,
          lineHeight: 1.7,
        }}
      >
        当前 demo 阶段不支持追加或删除材料，创建项目后材料清单保持不变。
        <br />
        想换一批材料？回到首页重新创建项目。
      </div>
    </div>
  )
}
