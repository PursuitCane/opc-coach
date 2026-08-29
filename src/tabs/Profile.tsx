import { useEffect, useState } from 'react'
import { useAppStore, useCurrentProject } from '../store'
import type { ProfileField } from '../store/types'

const FALLBACK_BASICS: ProfileField[] = [
  { label: '所属行业', value: '手作定制 / 礼品零售', src: '材料提炼' },
  { label: '当前阶段', value: '已有真实营收，未成规模', src: '材料提炼' },
  { label: '注册资本', value: '10 万元（认缴）', src: '工商信息' },
  { label: '公司人数', value: '1 人（创始人本人）', src: '材料提炼' },
  { label: '成立时间', value: '2025 年 11 月', src: '工商信息' },
  { label: '所在城市', value: '杭州 · 拱墅区', src: '工商信息' },
]

const FALLBACK_BUSINESS: ProfileField[] = [
  { label: '面向市场', value: '一线与新一线城市的年轻女性送礼市场，年送礼场景 3–5 次' },
  { label: '潜在客户', value: '22–32 岁女性职场人群；次级客群为企业年礼采购' },
  { label: '产品模式', value: '单件定制手作 + 刻字与赠言卡，按件计价，接受小批量试单' },
  { label: '商业规模', value: '月均 40 单、客单 260 元，月流水约 1.04 万元（待验证）' },
  { label: '潜在合作伙伴', value: '商圈快闪档位、本地企业采购、内容达人分销、材料供应工坊' },
]

interface Opportunity {
  id: string
  match: string
  title: string
  deadline: string
  body: string
  meta: string
}

const POLICIES: Opportunity[] = [
  { id: 'p1', match: '匹配度 92%', title: '灵活就业与一人公司创业补贴', deadline: '9 月 30 日截止', body: '成立两年内、注册资本 50 万以下的一人公司可申领一次性开办补贴，最高 1 万元。', meta: '拱墅区人社局 · 需提供执照与社保记录' },
  { id: 'p2', match: '匹配度 78%', title: '小微企业房租与场地补贴', deadline: '常年受理', body: '自有工作室或租用创业园区场地的，按实际租金的 30% 补贴，每年一次。', meta: '需提供租赁合同与付款凭证' },
  { id: 'p3', match: '匹配度 61%', title: '电商与直播带货培训扶持', deadline: '10 月 15 日截止', body: '政府补贴的运营培训，含平台流量政策讲解，与你当前的获客缺口直接相关。', meta: '免费 · 每期 40 人' },
]

const INVESTORS: Opportunity[] = [
  { id: 'i1', match: '匹配度 84%', title: '早期消费基金 · 拾光资本', deadline: '滚动看项目', body: '专注小而美的消费品牌，单笔 50–200 万，接受一人公司结构。', meta: '需投递 BP 与近三月流水' },
  { id: 'i2', match: '匹配度 66%', title: '区域创业引导基金', deadline: '季度评审', body: '政府背景引导基金，配套贷款贴息，对本地注册企业优先。', meta: '需投递 BP 与工商信息' },
]

const SCENES: Opportunity[] = [
  { id: 's1', match: '匹配度 88%', title: '湖滨商圈快闪档位', deadline: '9 月档期开放', body: '核心商圈周末快闪档位，日均人流 2 万，适合验证线下转化率与真实客单价。', meta: '3–7 天 · 档位免租，需自备陈列' },
  { id: 's2', match: '匹配度 71%', title: '企业年礼采购候选名单', deadline: '10 月启动', body: '本地 12 家企业的年礼采购，先做 20–50 件小批量试单。', meta: '需对公开票与稳定交期' },
]

type OpportunityKind = '政策申请' | 'BP 投递' | '合作申请'

export function Profile() {
  const project = useCurrentProject()
  const setTab = useAppStore((s) => s.setTab)
  const setProjectName = useAppStore((s) => s.setProjectName)
  const [applied, setApplied] = useState<Record<string, boolean>>({})
  const [openFeedback, setOpenFeedback] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  if (!project) return null

  const analysis = project.analysis
  const basics = analysis?.profile?.basics?.length ? analysis.profile.basics : FALLBACK_BASICS
  const business = analysis?.profile?.business?.length ? analysis.profile.business : FALLBACK_BUSINESS
  const appliedCount = Object.values(applied).filter(Boolean).length

  const handleApply = (item: Opportunity, kind: OpportunityKind) => {
    setApplied((current) => ({ ...current, [item.id]: true }))
    setOpenFeedback(item.id)
    setToast(`${kind}已提交`)
  }

  return (
    <div className="profile-page" style={{ animation: 'opcFade .3s both', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 22, alignItems: 'start', maxWidth: 1100, marginInline: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
        <div>
          <h4 style={{ margin: '0 0 3px', fontSize: 19 }}>企业画像</h4>
          <div style={{ fontSize: 12, color: '#75798c' }}>基本信息由材料自动提炼，可手动修正；下面三类对接的申请与反馈都留在这一页</div>
        </div>

        <section className="profile-card">
          <div className="profile-kicker">基本信息</div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>公司名称</label>
            <input className="input" value={project.name} onChange={(event) => setProjectName(event.target.value)} placeholder="填写工商注册的全称" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {basics.map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ width: 66, flex: 'none', fontSize: 12, color: '#75798c' }}>{item.label}</span>
                <span style={{ fontSize: 13, color: '#cfd3e5', flex: 1 }}>{item.value}</span>
                <span style={{ fontSize: 10.5, color: '#595d6c' }}>{item.src || '材料提炼'}</span>
              </div>
            ))}
          </div>
          <div style={{ height: 1, margin: '14px 0', background: 'var(--color-divider)' }} />
          <div style={{ fontSize: 11.5, color: '#75798c', lineHeight: 1.7 }}>注册资本与人数来自你上传的材料，缺失项请补充材料后重新分析。</div>
        </section>

        <section className="profile-card">
          <div className="profile-kicker">商业信息</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {business.map((item) => (
              <div key={item.label}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, color: '#75798c' }}>{item.label}</span>
                </div>
                <div style={{ fontSize: 13, color: '#cfd3e5', lineHeight: 1.7 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="profile-card">
          <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#b2b6ca', marginBottom: 10 }}>对接进度</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontFamily: 'var(--font-heading)', lineHeight: 1 }}>{appliedCount}</span>
            <span style={{ fontSize: 12, color: '#75798c' }}>项已申请，等待反馈</span>
          </div>
          <div style={{ fontSize: 12, color: '#9397ab', lineHeight: 1.7, marginTop: 9 }}>反馈会同时出现在这里和成长记录里。</div>
        </section>

        <OpportunitySection
          title="政策对接"
          subtitle="按你的行业、阶段与注册地匹配"
          items={POLICIES}
          kind="政策申请"
          applied={applied}
          openFeedback={openFeedback}
          onApply={handleApply}
          onToggleFeedback={(id) => setOpenFeedback((current) => current === id ? null : id)}
          onChat={() => setTab('chat')}
        />
        <OpportunitySection
          title="融资对接"
          subtitle="申请后自动投递最新版商业计划"
          items={INVESTORS}
          kind="BP 投递"
          applied={applied}
          openFeedback={openFeedback}
          onApply={handleApply}
          onToggleFeedback={(id) => setOpenFeedback((current) => current === id ? null : id)}
          onChat={() => setTab('chat')}
        />
        <OpportunitySection
          title="场景对接"
          subtitle="可以直接验证转化的合作场景"
          items={SCENES}
          kind="合作申请"
          applied={applied}
          openFeedback={openFeedback}
          onApply={handleApply}
          onToggleFeedback={(id) => setOpenFeedback((current) => current === id ? null : id)}
          onChat={() => setTab('chat')}
        />
      </div>
      <div style={{ position: 'sticky', top: 104, display: 'flex', flexDirection: 'column', gap: 14 }} />
      {toast && <div className="profile-toast">{toast}</div>}
    </div>
  )
}

interface OpportunitySectionProps {
  title: string
  subtitle: string
  items: Opportunity[]
  kind: OpportunityKind
  applied: Record<string, boolean>
  openFeedback: string | null
  onApply: (item: Opportunity, kind: OpportunityKind) => void
  onToggleFeedback: (id: string) => void
  onChat: () => void
}

function OpportunitySection({ title, subtitle, items, kind, applied, openFeedback, onApply, onToggleFeedback, onChat }: OpportunitySectionProps) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <h5 style={{ margin: 0, fontSize: 15 }}>{title}</h5>
        <span style={{ fontSize: 11.5, color: '#75798c' }}>{subtitle}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((item) => {
          const isApplied = !!applied[item.id]
          const isOpen = openFeedback === item.id
          return (
            <section className="profile-card" key={item.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                <span className="tag tag-accent">{item.match}</span>
                <span style={{ fontSize: 15, fontWeight: 500 }}>{item.title}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11.5, color: '#75798c' }}>{item.deadline}</span>
              </div>
              <div style={{ fontSize: 13, color: '#9397ab', lineHeight: 1.75 }}>{item.body}</div>
              <div style={{ fontSize: 11.5, color: '#595d6c', marginTop: 7 }}>{item.meta}</div>
              {!isApplied ? (
                <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
                  <button className="btn btn-primary" style={{ fontSize: 12.5 }} onClick={() => onApply(item, kind)}>{kind === 'BP 投递' ? '申请并投递 BP' : '申请'}</button>
                  <button className="btn btn-secondary" style={{ fontSize: 12.5 }} onClick={onChat}>咨询</button>
                </div>
              ) : (
                <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 9, background: 'rgba(145,132,217,.08)', boxShadow: 'inset 0 0 0 1px rgba(145,132,217,.24)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span className="tag tag-outline">已提交</span>
                    <span style={{ fontSize: 12.5, color: '#cfd3e5' }}>{kind}已提交，等待受理（预计 3 个工作日反馈）</span>
                    <button className="btn btn-ghost" style={{ fontSize: 12, marginLeft: 'auto' }} onClick={() => onToggleFeedback(item.id)}>{isOpen ? '收起' : '查看反馈状态'}</button>
                  </div>
                  {isOpen && <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <FeedbackStep label="已提交申请" at="刚刚" done />
                    <FeedbackStep label="服务方受理中" at="预计 1 个工作日" />
                    <FeedbackStep label="反馈结果" at="预计 3 个工作日" />
                  </div>}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function FeedbackStep({ label, at, done = false }: { label: string; at: string; done?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', flex: 'none', marginTop: 5, background: done ? 'var(--color-accent)' : '#3f424d' }} />
      <div>
        <div style={{ fontSize: 12.5, color: done ? '#cfd3e5' : '#75798c' }}>{label}</div>
        <div style={{ fontSize: 11.5, color: '#75798c' }}>{at}</div>
      </div>
    </div>
  )
}
