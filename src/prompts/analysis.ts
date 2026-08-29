import { callAIJson } from '../lib/ai'
import type { Analysis, FileItem, PlanQuestion } from '../store/types'
import { BP_ANALYSIS_SYSTEM } from './bpAnalysis'

// Other coach features still use this conversational persona. BP evaluation
// itself uses BP_ANALYSIS_SYSTEM below.
export const COACH_SYSTEM = `你是「OPC Coach」，一位专门陪伴一人公司/独立创业者的资深教练。
你的风格：
- 说人话，不说套话。评分与判断都要有具体证据。
- 挑毛病比夸奖更重要，但夸奖也要落到实处（对方到底做对了什么）。
- 你的用户是自己在做业务的人，不是投资经理，所以别用「TAM/SAM/SOM」这种黑话。用「市场机会/客户价值/商业模式/竞争壁垒/获客能力」五个维度。
- 建议要能被“这周就做”，避免空泛的战略语。`

const SHAPE = `严格只输出下面这份 JSON，不要 markdown 代码块围栏，不要任何多余文字：

{
  "scoreDelta": "<相对上次五维均分的变化，如 +6；首次分析给 +0>",
  "narrative": "<仅一句话：核心优势 + 最核心问题 + 整体判断；禁止出现总分或评级>",
  "dims": [
    {"key":"customer","label":"需求与价值逻辑","value":<0-100>,"delta":"+N"},
    {"key":"market","label":"市场与竞争分析","value":<0-100>,"delta":"+N"},
    {"key":"model","label":"商业模式与增长财务","value":<0-100>,"delta":"+N"},
    {"key":"moat","label":"团队与执行基础","value":<0-100>,"delta":"+N"},
    {"key":"acquisition","label":"材料表达逻辑","value":<0-100>,"delta":"+N"}
  ],
  "highlights": [
    {"title":"<亮点标题>","body":"<引用材料证据说明哪里讲清楚了>"}
  ],
  "issues": [
    {"kind":"<missing|flaw>","level":"<高|中|低>","title":"<问题标题>","body":"<缺失什么，或具体存在什么逻辑矛盾>"}
  ],
  "actions": [
    {"no":"01","dim":"<对应维度>","title":"<初步优化建议标题>","body":"<明确补什么、补到什么程度、如何测算>","meta":"<对应的具体问题>"}
  ],
  "deepDives": [
    {"no":"01","dim":"<对应维度>","title":"<深挖方向>","body":"<深挖价值与具体落点>","meta":"<建议产出物或验证方式>"}
  ],
  "planQuestions": [
    {"question":"<固定确认问题的标题>","hint":"<该问题的完整描述>"}
  ]
}

字段映射：narrative=模块1；dims=模块2；issues=模块3；highlights=模块4；planQuestions=模块5；actions=模块6；deepDives=模块7。
要求：
- highlights 至少 3 条；issues 至少 4 条，并同时包含 missing 与 flaw；actions 至少 3 条；deepDives 恰好 2-3 条。
- planQuestions 恰好 6 道，按系统提示词模块5的固定标题与描述顺序输出，question 放标题，hint 放完整描述。
- dims 必须严格使用上述 5 个 key、label 与顺序。首次分析 delta 全部给 "+0"。`

export interface EvaluationResult {
  analysis: Analysis
  planQuestions: PlanQuestion[]
}

export async function evaluateProject(
  projectName: string,
  files: FileItem[],
  isFirstRun: boolean,
  signal?: AbortSignal,
): Promise<EvaluationResult> {
  const materials = files
    .map((f, i) => `【材料 ${i + 1}：${f.name}】\n${f.content}`)
    .join('\n\n----\n\n')

  const user = `项目名：${projectName}
${isFirstRun ? '（这是首次分析，delta 全部给 +0）' : '（这是重新分析，请对比之前的判断给出 delta）'}

以下是全部商业材料：

${materials}

${SHAPE}`

  const raw = await callAIJson<
    Omit<Analysis, 'updatedAt' | 'score'> & { planQuestions: PlanQuestion[] }
  >({
    system: BP_ANALYSIS_SYSTEM,
    user,
    signal,
  })

  const { planQuestions, ...rest } = raw
  const score = rest.dims.length
    ? Math.round(rest.dims.reduce((sum, dim) => sum + dim.value, 0) / rest.dims.length)
    : 0

  return {
    analysis: { ...rest, score, updatedAt: formatUpdatedAt(new Date()) },
    planQuestions: (planQuestions || []).slice(0, 6),
  }
}

function formatUpdatedAt(d: Date): string {
  const m = d.getMonth() + 1
  const day = d.getDate()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${m} 月 ${day} 日 ${hh}:${mm}`
}
