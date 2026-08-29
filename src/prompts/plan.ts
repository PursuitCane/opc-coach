// 优化商业计划：先确认 6 个前置信息 → 用户答完 → 合成 v2 计划书
import { callAIJson } from '../lib/ai'
import { COACH_SYSTEM } from './analysis'
import { MATERIAL_OPTIMIZATION_SYSTEM } from './materialOptimization'
import type { Analysis, FileItem, PlanDoc, PlanQuestion } from '../store/types'

const QUESTIONS_SHAPE = `严格只输出如下 JSON，不要 markdown 代码块围栏：

{
  "questions": [
    {"question":"<一句话把问题问清楚，要具体到能被回答>","hint":"<20 字内说明这题决定了计划书里的哪部分>"}
  ]
}

要求：恰好 6 道题，依次确认使用场景与受众、优化诉求、佐证资源、篇幅格式、差异化优势、对标与风格。`

export async function generatePlanQuestions(
  projectName: string,
  analysis: Analysis,
  files: FileItem[],
): Promise<PlanQuestion[]> {
  const filesSummary = files.map((f) => `- ${f.name}`).join('\n')
  const user = `项目名：${projectName}

已有材料：
${filesSummary}

当前分析结论：
- 综合评分 ${analysis.score}
- 五维得分：${analysis.dims.map((d) => `${d.label} ${d.value}`).join(' / ')}
- 最紧要的问题：${analysis.issues.map((i) => i.title).join('；')}
- 建议行动：${analysis.actions.map((a) => a.title).join('；')}

现在你要为这个项目产出一份完整的商业计划书。在动笔前，请生成 6 道材料优化前置确认问题。

${QUESTIONS_SHAPE}`

  const result = await callAIJson<{ questions: PlanQuestion[] }>({
    system: COACH_SYSTEM,
    user,
  })
  return result.questions.slice(0, 6)
}

const PLAN_SHAPE = `严格只输出如下 JSON，不要 markdown 代码块围栏：

{
  "toc": [
    {"no":"01","label":"<章节名>","flag":"<新增|已改写|待补充|空字符串>"}
  ],
  "sections": [
    {"no":"01","label":"<章节名>","markdown":"<该章的完整 markdown 正文，用 ##/### 组织，段落之间空行分隔>"}
  ]
}

要求：
- 恰好 8 章：01 客户问题 / 02 解决方案 / 03 GTM 新增 / 04 市场规模 / 05 商业模式 / 06 财务预测 / 07 竞争格局 / 08 团队情况
- toc 和 sections 一一对应且顺序一致
- 每个 section 的 markdown 至少 3 段，要引用用户在 6 道题里给出的答案（如果哪题空着就把相关章节 flag 标 "待补充" 并在正文里说明缺什么）
- 每一章遵循系统提示词中对应模块的方法论、输出结构和待补充规则；正文使用系统提示词规定的三级标题、加粗和斜体格式。
- flag 分布参考：至少 2 章 "新增"、2 章 "已改写"、1 章 "待补充"`

export async function generatePlan(
  projectName: string,
  analysis: Analysis,
  files: FileItem[],
  questions: PlanQuestion[],
  answers: string[],
): Promise<PlanDoc> {
  const filesSummary = files.map((f) => `- ${f.name}`).join('\n')
  const qa = questions
    .map((q, i) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${answers[i] || '（未回答）'}`)
    .join('\n\n')

  const user = `项目名：${projectName}

已有材料：
${filesSummary}

当前分析：综合 ${analysis.score}；最弱维度：${
    analysis.dims.reduce((a, b) => (a.value < b.value ? a : b)).label
  }。

用户对 6 道前置确认问题的回答：

${qa}

请综合以上信息，产出优化后的商业计划书 v2。

${PLAN_SHAPE}`

  const result = await callAIJson<Omit<PlanDoc, 'createdAt'>>({
    system: MATERIAL_OPTIMIZATION_SYSTEM,
    user,
  })
  return { ...result, createdAt: new Date().toISOString() }
}
