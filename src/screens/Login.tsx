import { Auth } from '../components/Auth'
import type { AuthUser } from '../lib/auth'

const PAINS = [['方向对不对？', '该不该继续？'], ['下一步做什么？', '问题出在哪？'], ['资源怎么找？', '该联系谁？'], ['怎么落地和复盘？', '结果如何闭环？']]
const FEATURES = [['商业分析', '基于精益创业、YC、红杉资本等经典商业方法论，实现商业分析。'], ['优化商业计划', '从投资人视角，帮你优化商业计划。'], ['企业画像', '基于企业画像，提供政策、陪验资、场景合作等服务。'], ['AI 沟通', '基于苏格拉底式提问，用多轮对话引导你理清思路和复盘结果。'], ['成长记录', '记录每一次决策点、行动和结果，基于长期记忆持续陪跑。'], ['服务市场', '针对 OPC 提供专业孵化服务，包含创业活动、咨询陪跑等合作。']]

interface Props {
  onAuthenticated: (user: AuthUser) => void
}

export function Login({ onAuthenticated }: Props) {
  return <div className="landing">
    <header className="landing-header"><Brand /><span className="landing-subtitle">一人公司 · 创业陪伴教练</span></header>
    <section className="landing-hero"><div><h1>OPC<br />COACH</h1><div className="landing-rule" /><p className="landing-lead">你做项目时是否遇到这些问题：</p><div className="landing-pains">{PAINS.map(([title, body]) => <div className="landing-pain" key={title}><i /><div><strong>{title}</strong><span>{body}</span></div></div>)}</div><div className="landing-divider" /><div className="landing-help"><h2>我们帮你梳理！</h2><p>陪你把想法变成<br />可验证、可增长、可落地的项目</p></div></div>
      <Auth onAuthenticated={onAuthenticated} />
    </section>
    <section className="landing-cards landing-values">{['看明白、想清楚|商业计划梳理和优化|帮你拆解问题，理清思路，找到关键突破点。','走出去、建联系|对接更多资源|链接人脉、资源与机会，为项目成长加速。','持续做对、结果闭环|OPC 陪跑，系统记录与建议|用数据和复盘驱动成长，陪伴你走得更远。'].map((card, i) => { const [title, sub, body] = card.split('|'); return <article className="card" key={title}><em>0{i + 1}</em><h3>{title}</h3><strong>{sub}</strong><p>{body}</p></article> })}</section>
    <section className="landing-features"><div className="landing-section-title"><h3>核心功能</h3><i /></div><div className="landing-cards">{FEATURES.map(([title, body]) => <article className="card" key={title}><h3>{title}</h3><p>{body}</p></article>)}</div></section>
    <section className="landing-cta"><div><h3>立即体验</h3><div className="landing-divider" /><p><span className="tag tag-accent">另有福利</span> MBTI 已经成为过去式，现在向你走来的是 <b>BPTI</b>！来测测你的商业计划属性吧。</p></div><div className="landing-qr"><img src="/opc-coach-qr.png" alt="微信扫码进群" /><small>微信扫码进群</small></div></section><footer>OPC Coach · 一人公司创业陪伴</footer>
  </div>
}

function Brand() { return <div className="brand"><span>O</span><b>OPC Coach</b></div> }
