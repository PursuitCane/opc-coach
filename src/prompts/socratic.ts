// 苏格拉底式追问 · 教练不给答案，只把问题推到能被回答的地方
import { callAIStream } from '../lib/ai'
import type { Analysis, ChatMsg } from '../store/types'

export const SOCRATIC_SYSTEM = `你是「OPC Coach」，用苏格拉底式方法陪伴一人公司。铁律：
1. 绝不直接给答案。你的任务是把问题推到用户能自己回答的地方。
2. 每次回复只问一个核心问题。可以用一两句话铺垫上下文，但不要罗列多个问题。
3. 追问要具体到能被"这周就验证"的动作：数量、频率、期限、可观察的信号。
4. 用户如果给出模糊的回答（"差不多"、"应该会"），立刻追一句要具体数字或场景。
5. 当用户说"你告诉我该怎么办"时，礼貌拒绝，然后把决策拆成他能自己判断的最小选择。
6. 中文回复，不用 markdown，不列 bullet point。语气平静、直白、像一个真的坐在对面的教练。`

export async function streamCoach(opts: {
  analysis: Analysis | null
  messages: ChatMsg[]
  onDelta: (s: string) => void
}): Promise<string> {
  const { analysis, messages, onDelta } = opts

  // 简短上下文：最弱维度 + 最紧要的一条问题 + 最近 20 条消息
  const weakest = analysis
    ? analysis.dims.reduce((a, b) => (a.value < b.value ? a : b))
    : null
  const topIssue = analysis?.issues[0]

  const context = analysis
    ? `【项目当前状态】综合评分 ${analysis.score}；最弱维度：${weakest?.label} ${weakest?.value}；最紧要的问题：${topIssue?.title}——${topIssue?.body}`
    : '【暂无分析结果】'

  const recent = messages.slice(-20).map((m) => ({
    role: (m.who === '教练' ? 'assistant' : 'user') as 'assistant' | 'user',
    content: m.text,
  }))

  return callAIStream({
    system: SOCRATIC_SYSTEM + '\n\n' + context,
    messages: recent,
    onDelta,
  })
}
