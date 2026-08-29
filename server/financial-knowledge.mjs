import fs from 'node:fs'

const knowledge = JSON.parse(
  fs.readFileSync(new URL('./data/financial-products.json', import.meta.url), 'utf8'),
)

const FINANCE_INTENT = /金融|融资|贷款|信贷|授信|借款|利率|贴息|担保|抵押|质押|额度|资金|投资|股权|债券|保理|信用证|上市|ipo|并购|数据资产|知识产权|跨境/i
const FOLLOW_UP = /^(那|这个|这种|还有|哪个|哪些|具体|合适|可以|怎么选|条件|额度|利率|期限|呢)/i

const MATCH_GROUPS = [
  { query: /贷款|信贷|借款|授信|债权/, terms: ['贷款', '信贷', '授信', '债权', '贷'], weight: 7 },
  { query: /股权|投资|融资轮|天使轮|[abc]轮/i, terms: ['股权', '投资', '天使', '融资轮'], weight: 7 },
  { query: /科技|科创|高新|研发|专精特新|小巨人/, terms: ['科技', '科创', '高新', '研发', '专精特新', '小巨人'], weight: 6 },
  { query: /数据要素|数据资产|数据企业|数据产品|北数所/, terms: ['数据要素', '数据资产', '数据企业', '数据产品', '北数所'], weight: 9 },
  { query: /初创|种子|早期|创业/, terms: ['初创', '种子', '早期', '创业'], weight: 5 },
  { query: /知识产权|专利|软著/, terms: ['知识产权', '专利', '软著'], weight: 9 },
  { query: /抵押|房产|不动产/, terms: ['抵押', '房产', '不动产'], weight: 8 },
  { query: /担保|保证/, terms: ['担保', '保证'], weight: 7 },
  { query: /贴息|低息|利率|成本/, terms: ['贴息', '利率', '低息', '成本'], weight: 7 },
  { query: /上市|ipo|北交所|科创板|创业板/i, terms: ['上市', 'ipo', '北交所', '科创板', '创业板'], weight: 9 },
  { query: /并购|重组/, terms: ['并购', '重组'], weight: 9 },
  { query: /跨境|外币|离岸|出海/, terms: ['跨境', '外币', '离岸', '出海'], weight: 9 },
  { query: /供应链|应收账款|保理/, terms: ['供应链', '应收账款', '保理'], weight: 9 },
  { query: /朝阳|园区|北京/, terms: ['朝阳', '园区', '北京'], weight: 4 },
]

function textOf(item) {
  return Object.values(item).join(' ').toLowerCase()
}

function scoreItem(item, query) {
  const haystack = textOf(item)
  const name = String(item.name || '').toLowerCase()
  const institution = String(item.institution || item.provider || '').toLowerCase()
  let score = 0

  if (name.length >= 2 && query.includes(name)) score += 40
  if (institution.length >= 2 && query.includes(institution)) score += 20

  for (const group of MATCH_GROUPS) {
    if (!group.query.test(query)) continue
    const hits = group.terms.filter((term) => haystack.includes(term.toLowerCase())).length
    score += Math.min(hits, 2) * group.weight
  }

  return score
}

function rank(items, query, limit) {
  const ranked = items
    .map((item, index) => ({ item, index, score: scoreItem(item, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ item }) => item)

  if (ranked.length > 0) return ranked
  return items.slice(0, limit)
}

function productLine(product, index) {
  return [
    `${index + 1}. ${product.institution}｜${product.name}（${product.type || '类型未注明'}）`,
    `适用门槛：${product.eligibility || '资料未注明'}`,
    `核心特点：${product.features || '资料未注明'}`,
    `额度：${product.amount || '资料未注明'}；期限：${product.term || '资料未注明'}；利率：${product.rate || '资料未注明'}`,
    product.notes ? `补充说明：${product.notes}` : '',
  ].filter(Boolean).join('\n')
}

function incentiveLine(incentive, index) {
  return `${index + 1}. ${incentive.type}｜${incentive.eligibility}｜${incentive.details}｜提供方：${incentive.provider}`
}

export function retrieveFinancialContext(messages) {
  const userMessages = messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content.trim())
    .filter(Boolean)

  const latest = userMessages.at(-1) || ''
  const previous = userMessages.at(-2) || ''
  const isFinanceQuestion = FINANCE_INTENT.test(latest)
    || (FOLLOW_UP.test(latest) && FINANCE_INTENT.test(previous))
  if (!isFinanceQuestion) return ''

  const query = userMessages.slice(-4).join(' ').toLowerCase()
  const products = rank(knowledge.products, query, 5)
  const incentives = rank(knowledge.incentives, query, 3)

  return `【金融资料检索结果】
数据源：${knowledge.source}（${knowledge.updatedAt}），本次按用户描述匹配出以下候选项。

${products.map(productLine).join('\n\n')}

【可能相关的贴息或优惠】
${incentives.map(incentiveLine).join('\n')}

【回答约束】
这些内容是内部资料中的初步匹配，不代表获批、承诺授信或当前最终报价。先直接告诉用户最匹配的 1—3 个产品、匹配理由和关键条件，再只追问一个最影响准入但用户尚未提供的信息。只能使用上面的资料字段；资料未注明的内容要明确说未注明，不得推测。提醒用户最终额度、期限、利率和准入以提供机构最新审核为准。`
}

