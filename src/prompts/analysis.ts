// 商业分析 prompts
// AI persona: 一人公司的陪伴教练，说话直接、要具体、拒绝空话套话。

import { callAIJson } from '../lib/ai'
import type { Analysis, FileItem, PlanQuestion } from '../store/types'

export const COACH_SYSTEM = `你是「OPC Coach」，一位专门陪伴一人公司/独立创业者的资深教练。
你的风格：
- 说人话，不说套话。评分与判断都要有具体证据。
- 挑毛病比夸奖更重要，但夸奖也要落到实处（对方到底做对了什么）。
- 你的用户是自己在做业务的人，不是投资经理，所以别用「TAM/SAM/SOM」这种黑话。用「市场机会/客户价值/商业模式/竞争壁垒/获客能力」五个维度。
- 建议要能被"这周就做"，避免空泛的战略语。`

const SHAPE = `严格只输出下面这份 JSON，不要 markdown 代码块围栏，不要任何多余文字：

{
  "score": <0-100 的整数，综合评分>,
  "scoreDelta": "<相对上次的变化，如 +6；首次分析给 +0>",
  "narrative": "<用一段 3-5 句话总结这个项目现在的样子，直白，不要口号>",
  "dims": [
    {"key":"market","label":"市场机会","value":<0-100>,"delta":"+N"},
    {"key":"customer","label":"客户价值","value":<0-100>,"delta":"+N"},
    {"key":"model","label":"商业模式","value":<0-100>,"delta":"+N"},
    {"key":"moat","label":"竞争壁垒","value":<0-100>,"delta":"+N"},
    {"key":"acquisition","label":"获客能力","value":<0-100>,"delta":"+N"}
  ],
  "highlights": [
    {"title":"<10 字内标题>","body":"<1-2 句具体亮点，要能引用到材料里的证据>"}
  ],
  "issues": [
    {"level":"<高|中|低>","title":"<10 字内>","body":"<1-2 句具体问题>"}
  ],
  "actions": [
    {"no":"01","dim":"<对应哪个维度的中文名>","title":"<12 字内动作>","body":"<1-2 句做什么、怎么做>","meta":"<预计耗时或频率，如 '预计 14 天 · 每天 40 分钟'>"}
  ],
  "planQuestions": [
    {"question":"<一句话把问题问清楚，要具体到能被回答>","hint":"<20 字内说明这题决定了计划书里的哪部分>"}
  ]
}

要求：
- highlights 恰好 3 条；issues 恰好 3 条（level 按 高/高/中 分布）；actions 恰好 3 条，按影响面从大到小排 01/02/03。
- dims 的 value 要拉出差距，别都给 60-70 分。最弱的维度 value 不超过 45。
- 综合评分 = dims 加权平均后取整。首次分析 delta 全部给 "+0"。
- planQuestions 恰好 4 道，用于生成后续商业计划书 v2。要针对当前项目最缺、材料里读不到的信息。避免"你的目标客户是谁"这种大而空的题。`

export interface EvaluationResult {
  analysis: Analysis
  planQuestions: PlanQuestion[]
}

export async function evaluateProject(
  projectName: string,
  files: FileItem[],
  isFirstRun: boolean,
): Promise<EvaluationResult> {
  const materials = files
    .map((f, i) => `【材料 ${i + 1}：${f.name}】\n${f.content}`)
    .join('\n\n----\n\n')

  const user = `项目名：${projectName}
${isFirstRun ? '（这是首次分析，delta 全部给 +0）' : '（这是重新分析，请对比之前的判断给出 delta）'}

以下是全部材料：

${materials}

${SHAPE}`

  const raw = await callAIJson<
    Omit<Analysis, 'updatedAt'> & { planQuestions: PlanQuestion[] }
  >({
    system: COACH_SYSTEM,
    user,
  })

  const { planQuestions, ...rest } = raw
  return {
    analysis: { ...rest, updatedAt: formatUpdatedAt(new Date()) },
    planQuestions: (planQuestions || []).slice(0, 4),
  }
}

function formatUpdatedAt(d: Date): string {
  const m = d.getMonth() + 1
  const day = d.getDate()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${m} 月 ${day} 日 ${hh}:${mm}`
}
