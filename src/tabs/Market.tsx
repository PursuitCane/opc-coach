import { useCurrentProject } from '../store'
import type { DimKey } from '../store/types'

interface Service {
  kind: string
  rec: boolean
  price: string
  title: string
  body: string
  meta: string
  cta: string
  targetDim: DimKey // 用于按最弱维度排序
}

const SERVICES: Service[] = [
  {
    kind: '1v1 教练咨询',
    rec: false,
    price: '¥480 / 60 分钟',
    title: '获客路径拆解：从 0 到一条可重复的渠道',
    body: '针对你现在最弱的维度。带着 14 天的笔记数据来，我们一起判断这条路要不要继续走。',
    meta: '教练 陈拓 · 带过 40+ 一人公司 · 最近可约 8 月 30 日',
    cta: '预约时间',
    targetDim: 'acquisition',
  },
  {
    kind: '1v1 教练咨询',
    rec: false,
    price: '¥680 / 90 分钟',
    title: '定价与利润结构复盘',
    body: '把你的时间成本算清楚，重排一遍价格带。适合已经有真实订单、但不确定该不该涨价的阶段。',
    meta: '教练 何屿 · 财务顾问背景 · 需提前 3 天预约',
    cta: '预约时间',
    targetDim: 'model',
  },
  {
    kind: '同行社群',
    rec: false,
    price: '¥99 / 月',
    title: '一人公司共学营 · 第 7 期',
    body: '每周一次线上会，各自汇报本周验证了什么。人少，规矩硬：不带数据不发言。',
    meta: '12 人满员制 · 剩 3 席 · 9 月 2 日开营',
    cta: '加入',
    targetDim: 'acquisition',
  },
  {
    kind: '同行社群',
    rec: false,
    price: '免费',
    title: '手作与定制行业交流群',
    body: '同行日常聊供应链、平台规则和踩过的坑。松散但信息密度不低。',
    meta: '286 人 · 需实名与项目介绍',
    cta: '申请加入',
    targetDim: 'moat',
  },
]

export function Market() {
  const project = useCurrentProject()

  // 按当前最弱维度排序：匹配的排前面并加 recommended 标记
  const weakest = project?.analysis
    ? project.analysis.dims.reduce((a, b) => (a.value < b.value ? a : b))
    : null

  const sorted = [...SERVICES]
    .map((s) => ({ ...s, rec: s.targetDim === weakest?.key }))
    .sort((a, b) => Number(b.rec) - Number(a.rec))

  return (
    <div style={{ animation: 'opcFade .3s both', maxWidth: 1060 }}>
      <h4 style={{ margin: '0 0 3px', fontSize: 19, fontFamily: 'var(--font-heading)' }}>
        服务市场
      </h4>
      <div style={{ fontSize: 12, color: '#75798c', marginBottom: 20 }}>
        {weakest
          ? `按你当前最弱的维度（${weakest.label}）排在前面`
          : '按维度排序'}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2,1fr)',
          gap: 16,
        }}
      >
        {sorted.map((s, i) => (
          <div
            key={i}
            style={{
              padding: '20px 22px',
              borderRadius: 12,
              background: '#232532',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span className="tag tag-accent">{s.kind}</span>
              {s.rec && <span className="tag tag-outline">为你推荐</span>}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#75798c' }}>
                {s.price}
              </span>
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 17, lineHeight: 1.3 }}>
              {s.title}
            </div>
            <div style={{ fontSize: 13, color: '#9397ab', lineHeight: 1.75, flex: 1 }}>
              {s.body}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                fontSize: 11.5,
                color: '#75798c',
              }}
            >
              {s.meta}
            </div>
            <div style={{ display: 'flex', gap: 9, marginTop: 2 }}>
              <button className="btn btn-primary" style={{ fontSize: 12.5 }}>
                {s.cta}
              </button>
              <button className="btn btn-ghost" style={{ fontSize: 12.5 }}>
                了解详情
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
