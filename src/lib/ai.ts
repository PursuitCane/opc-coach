// OpenAI-compatible transit client (openai-next)
// Provides three levels: text / JSON-structured / streaming

const AI_PATH = '/api/ai'

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Robust JSON extraction: strip ```json fences, take outermost {...}. */
export function extractJson(raw: string): string {
  let text = raw.trim()
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) text = fence[1].trim()
  if (!text.startsWith('{')) {
    const s = text.indexOf('{')
    const e = text.lastIndexOf('}')
    if (s >= 0 && e > s) text = text.slice(s, e + 1)
  }
  return text
}

/** Plain text call. */
export async function callAI(opts: {
  system?: string
  messages: AIMessage[]
  jsonMode?: boolean
  signal?: AbortSignal
}): Promise<string> {
  const messages: AIMessage[] = opts.system
    ? [{ role: 'system', content: opts.system }, ...opts.messages]
    : opts.messages

  const body: Record<string, unknown> = { messages }
  if (opts.jsonMode) body.response_format = { type: 'json_object' }

  const res = await fetch(AI_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ ...body, stream: false }),
    signal: opts.signal,
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

/** Structured JSON call. Prompts must describe the JSON shape in `system` or `user`. */
export async function callAIJson<T>(opts: {
  system: string
  user: string
  signal?: AbortSignal
}): Promise<T> {
  const raw = await callAI({
    system: opts.system,
    messages: [{ role: 'user', content: opts.user }],
    jsonMode: true,
    signal: opts.signal,
  })
  const cleaned = extractJson(raw)
  try {
    return JSON.parse(cleaned) as T
  } catch {
    console.error('AI JSON parse failed. Raw:', raw)
    throw new Error('AI 返回的 JSON 解析失败，再试一次或换份材料。')
  }
}

/** Streaming call. Delta chunks are pushed to onDelta as they arrive. */
export async function callAIStream(opts: {
  system?: string
  messages: AIMessage[]
  onDelta: (chunk: string) => void
}): Promise<string> {
  const messages: AIMessage[] = opts.system
    ? [{ role: 'system', content: opts.system }, ...opts.messages]
    : opts.messages

  const res = await fetch(AI_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ messages, stream: true }),
  })
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    throw new Error(`AI 接口报错 ${res.status}: ${text.slice(0, 200)}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // parse SSE events split by blank line, each line prefixed with `data: `
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const l = line.trim()
      if (!l.startsWith('data:')) continue
      const payload = l.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        const evt = JSON.parse(payload)
        const delta = evt?.choices?.[0]?.delta?.content
        if (typeof delta === 'string' && delta) {
          full += delta
          opts.onDelta(delta)
        }
      } catch {
        // silently skip malformed chunks
      }
    }
  }
  return full
}
