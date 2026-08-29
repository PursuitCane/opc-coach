import { useEffect, useState } from 'react'

interface Service {
  kind: string
  rec: boolean
  price: string
  title: string
  body: string
  meta: string
  cta: string
  logo: string
  provider: string
  rating: string
  reviews: string
}

const SERVICE_CATEGORIES = [
  '政策支持对接',
  '投资服务对接',
  '场景合作',
  '生态活动',
  '常规服务',
  '专业服务',
]

const SERVICES: Service[] = [
  {
    kind: '政策支持对接', rec: true, price: '免费对接', title: '一人公司创业补贴申报辅导',
    body: '按你的注册类型与成立时间匹配可申报的补贴，代拟材料并跟进审批。', meta: '本地政策 · 最快 15 个工作日出结果', cta: '申请对接',
    logo: '拱', provider: '拱墅区创业服务中心', rating: '4.8', reviews: '126 条评价',
  },
  {
    kind: '政策支持对接', rec: false, price: '免费预评估', title: '高新技术企业认定预评估',
    body: '先判断你够不够条件，再决定要不要花钱走整套流程。', meta: '需提供财务与研发投入材料', cta: '申请对接',
    logo: '科', provider: '浙科认定咨询', rating: '4.5', reviews: '88 条评价',
  },
  {
    kind: '投资服务对接', rec: true, price: '免费', title: '天使轮机构定向对接',
    body: '按行业与阶段匹配 3 家机构，投递你的最新商业计划，反馈统一回到工作台。', meta: '3 家机构 · 平均反馈 7 天', cta: '申请并投递 BP',
    logo: '拾', provider: '拾光资本', rating: '4.7', reviews: '54 条评价',
  },
  {
    kind: '投资服务对接', rec: false, price: '¥680 / 次', title: 'BP 与股权结构诊断',
    body: '融资前把股权、数据口径和融资节奏理清楚，避免一开口就被问住。', meta: '1 次线上会 · 输出一页诊断意见', cta: '申请对接',
    logo: '融', provider: '融策 FA 工作室', rating: '4.4', reviews: '37 条评价',
  },
  {
    kind: '场景合作', rec: true, price: '档位免租', title: '商圈快闪场景合作',
    body: '城市核心商圈提供短期档位，适合验证线下转化与真实客单。', meta: '3–7 天档期 · 需提交产品与资质', cta: '申请合作',
    logo: '湖', provider: '湖滨商业管理', rating: '4.6', reviews: '92 条评价',
  },
  {
    kind: '场景合作', rec: false, price: '按试单结算', title: '企业采购场景内测',
    body: '进入企业礼品采购的候选名单，先做小批量试单。', meta: '试单 20–50 件 · 需对公开票', cta: '申请合作',
    logo: '企', provider: '本地企业采购联盟', rating: '4.3', reviews: '41 条评价',
  },
  {
    kind: '生态活动', rec: false, price: '¥0', title: '培训沙龙 · 一人公司的获客与定价',
    body: '每月一次线下沙龙，主题聚焦一个具体问题，带案例来，带结论走。', meta: '9 月 12 日 · 30 人 · 剩 6 席', cta: '报名',
    logo: 'OPC', provider: 'OPC Coach 官方', rating: '4.9', reviews: '318 条评价',
  },
  {
    kind: '生态活动', rec: false, price: '免费报名', title: '赛事路演：城市创新挑战赛',
    body: '8 分钟路演加评委提问，优胜项目进入投资对接绿色通道。', meta: '报名截止 9 月 20 日', cta: '报名',
    logo: '创', provider: '城市创新赛事组委会', rating: '4.5', reviews: '73 条评价',
  },
  {
    kind: '常规服务', rec: false, price: '¥800 起', title: '工商注册',
    body: '名称核准、执照办理、银行开户，全程代办。', meta: '5–10 个工作日', cta: '申请对接',
    logo: '注', provider: '易注册企业服务', rating: '4.6', reviews: '204 条评价',
  },
  {
    kind: '常规服务', rec: true, price: '¥299 / 月起', title: '财税代理',
    body: '记账、报税、年报按月托管，一人公司的常见税务优惠会主动提示。', meta: '含月度财务简报', cta: '申请对接',
    logo: '账', provider: '明账财税', rating: '4.8', reviews: '176 条评价',
  },
  {
    kind: '常规服务', rec: false, price: '¥400 / 次起', title: '法律顾问',
    body: '合同审查与纠纷咨询，按次或按年，交付合同模板库。', meta: '响应时间 1 个工作日', cta: '申请对接',
    logo: 'law', provider: '中衡律所 · 小微业务组', rating: '4.7', reviews: '95 条评价',
  },
  {
    kind: '常规服务', rec: false, price: '商标 ¥1,200 起', title: '知识产权',
    body: '商标注册、版权登记、外观专利申请与年度维护。', meta: '含近似查询与风险提示', cta: '申请对接',
    logo: 'IP', provider: '知源知识产权', rating: '4.4', reviews: '132 条评价',
  },
  {
    kind: '专业服务', rec: false, price: '¥199 / 月起', title: '数据服务',
    body: '行业与竞品数据包，按月更新，可直接接入你的商业分析。', meta: '含平台流量与价格带数据', cta: '申请对接',
    logo: '数', provider: '灼见数据', rating: '4.5', reviews: '61 条评价',
  },
  {
    kind: '专业服务', rec: true, price: '按用量计费', title: 'AI 工具',
    body: '内容生成、客服问答、图片处理的工具组合与配置，一人也能跑起来。', meta: '含 3 次配置陪跑', cta: '申请对接',
    logo: 'AI', provider: '轻舟 AI 工具箱', rating: '4.7', reviews: '149 条评价',
  },
  {
    kind: '专业服务', rec: false, price: '评估后报价', title: '机器人解决方案',
    body: '轻量自动化与硬件选型，适合有实物交付环节的项目。', meta: '先做 1 次需求评估', cta: '申请对接',
    logo: '机', provider: '元动机器人', rating: '4.2', reviews: '28 条评价',
  },
  {
    kind: '专业服务', rec: false, price: '¥99 / 月', title: 'OPC 社区资源',
    body: '同行社群、共学营与资源置换板，遇到具体问题有人能答。', meta: '需实名与项目介绍', cta: '加入',
    logo: 'OPC', provider: 'OPC 社区', rating: '4.9', reviews: '402 条评价',
  },
]

export function Market() {
  const [activeCategory, setActiveCategory] = useState('全部')
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const categories = ['全部', ...SERVICE_CATEGORIES]
  const visibleServices = SERVICES.filter(
    (service) => activeCategory === '全部' || service.kind === activeCategory,
  )

  const actOn = (service: Service) => {
    setToast(`已记录你的意向，${service.provider}会在 1 个工作日内联系你`)
  }

  return (
    <div className="market-page" style={{ animation: 'opcFade .3s both', maxWidth: 1100 }}>
      <h4 style={{ margin: '0 0 3px', fontSize: 19 }}>服务市场</h4>
      <div style={{ fontSize: 12, color: '#75798c', marginBottom: 16 }}>
        与你当前阶段相关的服务排在前面
      </div>
      <div className="market-filters" style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 18 }}>
        {categories.map((category) => {
          const count = category === '全部'
            ? SERVICES.length
            : SERVICES.filter((service) => service.kind === category).length
          const active = activeCategory === category

          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              style={{
                padding: '5px 12px',
                borderRadius: 7,
                cursor: 'pointer',
                fontSize: 12.5,
                border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-divider)'}`,
                background: active ? 'rgba(145,132,217,.14)' : 'transparent',
                color: active ? 'var(--color-accent)' : '#b2b6ca',
                fontFamily: 'var(--font-body)',
              }}
            >
              {category}{' '}
              <span style={{ fontSize: 10.5, color: '#75798c' }}>{count}</span>
            </button>
          )
        })}
      </div>
      <div className="market-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
        {visibleServices.map((service) => (
          <div
            key={`${service.kind}-${service.title}`}
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
              <span className="tag tag-accent">{service.kind}</span>
              {service.rec && <span className="tag tag-outline">为你推荐</span>}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#75798c' }}>{service.price}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16.5, lineHeight: 1.3 }}>{service.title}</div>
            <div style={{ fontSize: 13, color: '#9397ab', lineHeight: 1.75, flex: 1 }}>{service.body}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, paddingTop: 2 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: '#3f424d', display: 'grid', placeItems: 'center', fontSize: 9.5, color: '#cfd3e5', flex: 'none' }}>
                {service.logo}
              </div>
              <span style={{ fontSize: 12.5, color: '#cfd3e5' }}>{service.provider}</span>
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ fontSize: 11, color: 'var(--color-accent)' }}>★</span>
                <span style={{ fontSize: 13, fontFamily: 'var(--font-heading)' }}>{service.rating}</span>
                <span style={{ fontSize: 11, color: '#75798c' }}>{service.reviews}</span>
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: '#75798c' }}>{service.meta}</div>
            <div style={{ display: 'flex', gap: 9, marginTop: 2 }}>
              <button type="button" className="btn btn-primary" style={{ fontSize: 12.5 }} onClick={() => actOn(service)}>{service.cta}</button>
              <button type="button" className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={() => actOn(service)}>了解详情</button>
            </div>
          </div>
        ))}
      </div>
      {toast && <div className="market-toast">{toast}</div>}
    </div>
  )
}
