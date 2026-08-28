// Global state types for OPC Coach

export type Screen = 'login' | 'empty' | 'creating' | 'app'
export type Tab = 'analysis' | 'plan' | 'profile' | 'chat' | 'diary' | 'market' | 'materials'
export type PlanStage = 'form' | 'gen' | 'done'

export type FileExt = 'PDF' | 'MD'

export interface FileItem {
  id: string
  name: string
  ext: FileExt
  size: string // human readable
  at: string // e.g. "8 月 24 日"
  from: string // 来源
  used: string // 已用于
  content: string // extracted text
}

export interface StagedFile {
  ext: FileExt
  name: string
  size: string
  content: string
}

// ---------- Business analysis ----------
export type DimKey = 'market' | 'customer' | 'model' | 'moat' | 'acquisition'

export interface DimScore {
  key: DimKey
  label: string
  value: number // 0-100
  delta: string // e.g. "+8"
}

export interface Highlight {
  title: string
  body: string
}

export interface Issue {
  level: '高' | '中' | '低'
  title: string
  body: string
}

export interface Action {
  no: string // "01"
  dim: string // "获客能力"
  title: string
  body: string
  meta: string // "预计 14 天 · 每天 40 分钟"
}

export interface Analysis {
  score: number // 0-100
  scoreDelta: string // "+6"
  narrative: string
  dims: DimScore[]
  highlights: Highlight[]
  issues: Issue[]
  actions: Action[]
  updatedAt: string // "8 月 25 日 21:40"
}

// ---------- Plan v2 ----------
export interface PlanQuestion {
  question: string
  hint: string
}

export interface PlanTocItem {
  no: string // "01"
  label: string
  flag: '新增' | '已改写' | '待补充' | ''
}

export interface PlanSection {
  no: string
  label: string
  markdown: string
}

export interface PlanDoc {
  toc: PlanTocItem[]
  sections: PlanSection[]
  createdAt: string
}

// ---------- Chat ----------
export interface ChatMsg {
  who: '教练' | '我'
  text: string
}

// ---------- Diary ----------
export interface DiaryEntry {
  day: string // "26"
  month: string // "8 月"
  title: string
  tag: string // 相关维度
  body: string
  meta: string
  ts: number // timestamp for grouping/heatmap
}

export interface Project {
  id: string
  name: string
  files: FileItem[]
  analysis: Analysis | null
  lastAnalysis: Analysis | null
  planQuestions: PlanQuestion[] | null
  planAnswers: string[]
  plan: PlanDoc | null
  messages: ChatMsg[]
  diary: DiaryEntry[]
  coachLine: string
  pendingChatSeed: string | null
  createdAt: number
}
