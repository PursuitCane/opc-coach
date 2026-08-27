// 红杉 pitch 六维度评估 schema

export const DIMENSIONS = [
  { key: 'mission', label: '公司使命', hint: '愿景是否清晰、有感召力' },
  { key: 'problem', label: '痛点问题', hint: '解决的问题是否真实、够痛' },
  { key: 'solution', label: '产品方案', hint: '方案是否对症、可行' },
  { key: 'market', label: '市场规模', hint: 'TAM/SAM/SOM 是否够大、算得清' },
  { key: 'competition', label: '竞争格局', hint: '差异化与壁垒是否成立' },
  { key: 'team', label: '团队与财务', hint: '团队匹配度、财务模型是否合理' },
] as const

export type DimensionKey = (typeof DIMENSIONS)[number]['key']

export interface DimensionScore {
  key: DimensionKey
  score: number // 0-10
  strengths: string // 亮点
  improvements: string // 改进建议
}

export interface EvaluationReport {
  overallScore: number // 0-10
  summary: string // 一句话总评
  dimensions: DimensionScore[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// 给模型的 JSON 输出约束说明
export const REPORT_JSON_SHAPE = `{
  "overallScore": <0-10 的数字>,
  "summary": "<一句话总评>",
  "dimensions": [
    ${DIMENSIONS.map(
      (d) =>
        `{ "key": "${d.key}", "score": <0-10>, "strengths": "<亮点>", "improvements": "<改进建议>" }`,
    ).join(',\n    ')}
  ]
}`
