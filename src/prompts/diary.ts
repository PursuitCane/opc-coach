// 把一段追问对话总结为一条成长记录
import { callAIJson, callAI } from '../lib/ai'
import { COACH_SYSTEM } from './analysis'
import type { Analysis, ChatMsg, DiaryEntry } from '../store/types'

const DIARY_SHAPE = `严格只输出如下 JSON，不要 markdown 代码块围栏：

{
  "title": "<12 字内，用陈述句总结这次对话的核心突破或转向>",
  "tag": "<对应五维度之一：市场机会 / 客户价值 / 商业模式 / 竞争壁垒 / 获客能力>",
  "body": "<2-3 句话具体讲清楚：用户在对话里承认了什么、下一步要做什么>",
  "meta": "<一行元信息，如 '关联行动建议 01 · 由追问对话沉淀'>"
}`

export async function summarizeChatToDiary(
  messages: ChatMsg[],
  analysis: Analysis | null,
): Promise<DiaryEntry> {
  const transcript = messages
    .map((m) => `${m.who}：${m.text}`)
    .join('\n')

  const user = `以下是用户与教练的一段追问对话。请把它压成一条成长记录条目。

${transcript}

${analysis ? `当前最弱维度：${analysis.dims.reduce((a, b) => (a.value < b.value ? a : b)).label}。` : ''}

${DIARY_SHAPE}`

  const result = await callAIJson<Omit<DiaryEntry, 'day' | 'month' | 'ts'>>({
    system: COACH_SYSTEM,
    user,
  })

  const now = new Date()
  return {
    ...result,
    day: String(now.getDate()),
    month: `${now.getMonth() + 1} 月`,
    ts: now.getTime(),
  }
}

/** 教练的一句话：基于最近日记 + 最弱维度，给一句贴心提醒 */
export async function generateCoachLine(
  diary: DiaryEntry[],
  analysis: Analysis | null,
): Promise<string> {
  if (diary.length === 0) return ''
  const latest = diary.slice(0, 3).map((d) => `- ${d.title}：${d.body}`).join('\n')
  const weak = analysis
    ? analysis.dims.reduce((a, b) => (a.value < b.value ? a : b)).label
    : '获客能力'

  const raw = await callAI({
    system: COACH_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `最近三条日记：\n${latest}\n\n当前最弱维度：${weak}。\n\n请用一句 40 字以内的话对用户说点什么。要具体、直白、有可执行的方向。只输出这一句话，不要引号，不要多余的说明。`,
      },
    ],
  })
  return raw.trim().replace(/^["「『]|["」』]$/g, '')
}
