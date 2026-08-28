import type { Analysis, ChatMsg, FileItem, PlanDoc, PlanQuestion } from '../store/types'

interface ArchiveProjectInput {
  projectId: string
  files: FileItem[]
  analysis?: Analysis | null
  messages?: ChatMsg[]
  planQuestions?: PlanQuestion[] | null
  planAnswers?: string[]
  plan?: PlanDoc | null
}

/**
 * Write a project snapshot to the server-side archive. There is intentionally
 * no matching read call yet; the app continues to render from local state.
 */
export async function archiveProject(input: ArchiveProjectInput): Promise<void> {
  const response = await fetch('/api/archive/attachments', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => ({}))
    const message = typeof data === 'object' && data && 'error' in data && typeof data.error === 'string'
      ? data.error
      : '项目归档保存失败。'
    throw new Error(message)
  }
}
