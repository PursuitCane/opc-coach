// OpenAI compatible transit client (openai-next)
import { REPORT_JSON_SHAPE, type ChatMessage, type EvaluationReport } from './schema'

const BASE_URL = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai-next.com/v1'
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''
const MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-5'

interface ChatOptions {
  jsonMode?: boolean
}

async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
  if (!API_KEY) {
    throw new Error('缺少 API Key。请在 .env 里设置 VITE_OPENAI_API_KEY。')
  }

  const body: Record<string, unknown> = {
    model: MODEL,
    messages,
  }
  if (opts.jsonMode) {
    body.response_format = { type: 'json_object' }
  }

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`AI 接口报错 ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error('AI 返回格式异常，没拿到内容。')
  }
  return content
}

const SYSTEM_ADVISOR =
  '你是一位顶级风险投资人和商业顾问，代号「军师」，擅长用红杉资本的 pitch 框架评估商业计划书。点评要犀利、具体、可落地，不说空话套话。'

// 评估 BP，返回结构化报告
export async function evaluateBP(bpText: string): Promise<EvaluationReport> {
  const prompt = [
    '请按红杉六维度评估下面这份商业计划书。',
    '每个维度打分 0-10（10 最好），给出亮点和具体改进建议。',
    '严格只输出如下 JSON，不要任何多余文字：',
    REPORT_JSON_SHAPE,
    '',
    '=== 商业计划书 ===',
    bpText,
  ].join('\n')

  const raw = await chat(
    [
      { role: 'user', content: SYSTEM_ADVISOR + '\n\n' + prompt },
    ],
    { jsonMode: true },
  )
  return JSON.parse(raw) as EvaluationReport
}

// 追问：基于 BP + 报告 + 历史对话继续回答
export async function askAdvisor(
  bpText: string,
  history: ChatMessage[],
  question: string,
): Promise<string> {
  const context = [
    { role: 'user' as const, content: SYSTEM_ADVISOR + '\n\n=== 商业计划书 ===\n' + bpText },
    ...history,
    { role: 'user' as const, content: question },
  ]
  return chat(context)
}

// 综合原 BP + 对话，产出优化后的 BP（Markdown）
export async function optimizeBP(
  bpText: string,
  history: ChatMessage[],
): Promise<string> {
  const convo = history
    .map((m) => `${m.role === 'user' ? 'OPC' : '军师'}：${m.content}`)
    .join('\n')
  const prompt = [
    SYSTEM_ADVISOR,
    '',
    '基于原始 BP 和下面的对话，产出一版优化后的商业计划书。',
    '要求：结构清晰、用 Markdown 输出，覆盖红杉六维度，补齐原 BP 的短板。',
    '',
    '=== 原始 BP ===',
    bpText,
    '',
    '=== 对话记录 ===',
    convo || '（无）',
  ].join('\n')
  return chat([{ role: 'user', content: prompt }])
}
