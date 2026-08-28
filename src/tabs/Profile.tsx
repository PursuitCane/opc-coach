import { useState } from 'react'
import { useAppStore, useCurrentProject } from '../store'

const BASICS = [['所属行业', '根据上传材料生成'], ['当前阶段', '已有真实营收，未成规模'], ['注册资本', '待补充'], ['公司人数', '1 人（创始人本人）'], ['成立时间', '待补充'], ['所在城市', '待补充']]
const OPPORTUNITIES = [
  ['政策对接', '一人公司创业补贴', '成立两年内、注册资本 50 万以下的一人公司可申领一次性开办补贴。', '匹配度 92%'],
  ['融资对接', '早期消费基金定向对接', '按行业与阶段匹配早期机构，投递你的最新商业计划。', '匹配度 84%'],
  ['场景对接', '商圈快闪场景合作', '提供短期档位，适合验证线下转化与真实客单价。', '匹配度 88%'],
]

export function Profile() {
  const project = useCurrentProject()
  const setTab = useAppStore((s) => s.setTab)
  const [applied, setApplied] = useState<string[]>([])
  if (!project) return null
  const weakest = project.analysis?.dims.reduce((a, b) => a.value < b.value ? a : b)
  return <div style={{ maxWidth: 1060, animation: 'opcFade .3s both' }}>
    <div style={{ marginBottom: 20 }}><h4 style={{ margin: '0 0 3px', fontSize: 19, fontFamily: 'var(--font-heading)' }}>企业画像</h4><div style={{ fontSize: 12, color: '#75798c' }}>基于项目材料提炼，用于匹配政策、融资与合作机会</div></div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
      <section className="profile-card"><div className="profile-kicker">基础信息</div>{BASICS.map(([label, value]) => <div className="profile-row" key={label}><span>{label}</span><b>{value}</b><small>材料提炼</small></div>)}</section>
      <section className="profile-card"><div className="profile-kicker">经营画像</div><div className="profile-summary"><b>{project.name}</b><p>{project.analysis?.narrative ?? '上传材料并完成商业分析后，这里会形成项目的经营画像。'}</p></div><div className="profile-row"><span>当前优先缺口</span><b>{weakest ? `${weakest.label} · ${weakest.value} 分` : '等待分析'}</b></div><button className="btn btn-secondary" onClick={() => setTab('materials')}>查看项目材料</button></section>
    </div>
    <div className="profile-kicker" style={{ marginBottom: 12 }}>为你匹配的机会</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>{OPPORTUNITIES.map(([kind, title, body, match]) => { const done = applied.includes(title); return <section className="profile-card" key={title}><span className="tag tag-accent">{match}</span><h5>{title}</h5><p>{body}</p><small>{kind} · 申请反馈将同步到成长记录</small><button className={done ? 'btn btn-secondary' : 'btn btn-primary'} onClick={() => setApplied((x) => done ? x : [...x, title])}>{done ? '已提交申请' : '申请对接'}</button></section> })}</div>
  </div>
}
