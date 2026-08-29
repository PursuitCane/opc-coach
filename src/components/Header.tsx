import { useAppStore, useCurrentProject } from '../store'
import type { Project, Tab } from '../store/types'
import type { AuthUser } from '../lib/auth'
import { UserMenu } from './UserMenu'

interface Props {
  onLogout: () => Promise<void> | void
  user: AuthUser
}

const TAB_LABELS: { key: Tab; label: string; badge?: (s: ReturnType<typeof getBadgeData>) => string }[] = [
  { key: 'analysis', label: '商业分析' },
  { key: 'plan', label: '优化商业计划' },
  { key: 'profile', label: '企业画像' },
  { key: 'chat', label: '对话', badge: (s) => String(s.chatCount) },
  { key: 'diary', label: '成长记录' },
  { key: 'market', label: '服务市场' },
]

function getBadgeData(project: Project | null) {
  return {
    chatCount: project?.messages.length ?? 0,
    fileCount: project?.files.length ?? 0,
  }
}

export function Header({ onLogout }: Props) {
  const project = useCurrentProject()
  const tab = useAppStore((s) => s.tab)
  const setTab = useAppStore((s) => s.setTab)
  const renaming = useAppStore((s) => s.renaming)
  const draftName = useAppStore((s) => s.draftName)
  const setDraftName = useAppStore((s) => s.setDraftName)
  const startRename = useAppStore((s) => s.startRename)
  const saveName = useAppStore((s) => s.saveName)
  const cancelRename = useAppStore((s) => s.cancelRename)

  const badgeData = getBadgeData(project)

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
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

        {project && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {renaming ? (
              <>
                <input
                  className="input"
                  style={{ minHeight: 30, fontSize: 13.5, width: 220 }}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  autoFocus
                />
                <button
                  className="btn btn-primary"
                  style={{ fontSize: 12, padding: '3px 10px' }}
                  onClick={saveName}
                >
                  保存
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 12 }}
                  onClick={cancelRename}
                >
                  取消
                </button>
              </>
            ) : (
              <>
                <span
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 14.5,
                    fontWeight: 500,
                  }}
                >
                  {project.name}
                </span>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 11.5 }}
                  onClick={startRename}
                  title="修改项目名称"
                >
                  改名
                </button>
              </>
            )}
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn btn-secondary"
            disabled
            title="暂不支持创建新项目"
            style={{ fontSize: 12.5 }}
          >
            ＋ 新建项目
          </button>
          <UserMenu onLogout={onLogout} email={user.email} />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 2,
          padding: '0 34px',
          overflowX: 'auto',
        }}
      >
        {TAB_LABELS.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 13px 10px',
                border: 0,
                background: 'transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-heading)',
                fontWeight: 500,
                fontSize: 13.5,
                color: active
                  ? 'var(--color-accent)'
                  : '#b2b6ca',
                boxShadow: `inset 0 -2px 0 ${active ? 'var(--color-accent)' : 'transparent'}`,
              }}
            >
              {t.label}
              {t.badge && (
                <span style={{ fontSize: 10.5, color: '#75798c' }}>{t.badge(badgeData)}</span>
              )}
            </button>
          )
        })}
      </div>
    </header>
  )
}
