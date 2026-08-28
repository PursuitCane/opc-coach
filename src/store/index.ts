import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useMemo } from 'react'
import type {
  Analysis,
  ChatMsg,
  DiaryEntry,
  FileItem,
  PlanDoc,
  PlanQuestion,
  PlanStage,
  Project,
  Screen,
  Tab,
} from './types'

interface State {
  screen: Screen
  tab: Tab
  planStage: PlanStage
  renaming: boolean
  draftName: string
  projects: Project[]
  currentProjectId: string | null

  // ---- screen transitions ----
  setScreen: (s: Screen) => void
  setTab: (t: Tab) => void
  doLogin: () => void
  startNewProject: () => void
  cancelNewProject: () => void

  // ---- project lifecycle ----
  setDraftName: (n: string) => void
  createProject: (name: string, files: FileItem[]) => string
  switchProject: (id: string) => void
  deleteProject: (id: string) => void
  startRename: () => void
  saveName: () => void
  cancelRename: () => void

  // ---- analysis ----
  setAnalysis: (projectId: string, a: Analysis) => void

  // ---- plan ----
  setPlanStage: (s: PlanStage) => void
  setPlanQuestions: (projectId: string, qs: PlanQuestion[]) => void
  setPlanAnswer: (i: number, v: string) => void
  setPlan: (p: PlanDoc) => void

  // ---- chat ----
  setPendingChatSeed: (s: string | null) => void
  appendMessage: (m: ChatMsg) => void
  updateLastMessage: (mutator: (m: ChatMsg) => ChatMsg) => void

  // ---- diary ----
  appendDiary: (d: DiaryEntry) => void
  setCoachLine: (s: string) => void
}

function genId(): string {
  const g = globalThis as typeof globalThis & { crypto?: Crypto }
  if (g.crypto?.randomUUID) return g.crypto.randomUUID()
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const emptyProject = (name: string, files: FileItem[]): Project => ({
  id: genId(),
  name,
  files,
  analysis: null,
  lastAnalysis: null,
  planQuestions: null,
  planAnswers: [],
  plan: null,
  messages: [],
  diary: [],
  coachLine: '',
  pendingChatSeed: null,
  createdAt: Date.now(),
})

/** Update the current project in the projects array. */
function updateCurrent(
  state: State,
  mutator: (p: Project) => Project,
): Partial<State> {
  const id = state.currentProjectId
  if (!id) return {}
  const idx = state.projects.findIndex((p) => p.id === id)
  if (idx < 0) return {}
  const next = [...state.projects]
  next[idx] = mutator(next[idx])
  return { projects: next }
}

/** Update a specific project by id (used when async work resolves). */
function updateById(
  state: State,
  id: string,
  mutator: (p: Project) => Project,
): Partial<State> {
  const idx = state.projects.findIndex((p) => p.id === id)
  if (idx < 0) return {}
  const next = [...state.projects]
  next[idx] = mutator(next[idx])
  return { projects: next }
}

export const useAppStore = create<State>()(
  persist(
    (set) => ({
      screen: 'login',
      tab: 'analysis',
      planStage: 'form',
      renaming: false,
      draftName: '',
      projects: [],
      currentProjectId: null,

      setScreen: (s) => set({ screen: s }),
      setTab: (t) => set({ tab: t }),
      doLogin: () =>
        set((st) => ({
          screen: st.currentProjectId && st.projects.length > 0 ? 'app' : 'empty',
        })),
      startNewProject: () => set({ screen: 'empty', draftName: '' }),
      cancelNewProject: () =>
        set((st) => ({
          screen: st.currentProjectId ? 'app' : 'empty',
          draftName: '',
        })),

      setDraftName: (n) => set({ draftName: n }),
      createProject: (name, files) => {
        const p = emptyProject(name || '未命名项目', files)
        set((st) => ({
          projects: [...st.projects, p],
          currentProjectId: p.id,
          screen: 'creating',
          tab: 'analysis',
          planStage: 'form',
          renaming: false,
          draftName: '',
        }))
        return p.id
      },
      switchProject: (id) =>
        set((st) => {
          const p = st.projects.find((x) => x.id === id)
          if (!p) return {}
          return {
            currentProjectId: id,
            screen: 'app',
            tab: 'analysis',
            planStage: p.plan ? 'done' : 'form',
            renaming: false,
          }
        }),
      deleteProject: (id) =>
        set((st) => {
          const next = st.projects.filter((p) => p.id !== id)
          if (id === st.currentProjectId) {
            const fallback = next[0]?.id ?? null
            return {
              projects: next,
              currentProjectId: fallback,
              screen: fallback ? 'app' : 'empty',
              planStage: 'form',
              tab: 'analysis',
            }
          }
          return { projects: next }
        }),
      startRename: () =>
        set((st) => {
          const p = st.projects.find((x) => x.id === st.currentProjectId)
          return { renaming: true, draftName: p?.name ?? '' }
        }),
      saveName: () =>
        set((st) => {
          const trimmed = (st.draftName || '').trim()
          return {
            renaming: false,
            ...updateCurrent(st, (p) => ({
              ...p,
              name: trimmed || p.name,
            })),
          }
        }),
      cancelRename: () => set({ renaming: false }),

      setAnalysis: (projectId, a) =>
        set((st) =>
          updateById(st, projectId, (p) => ({
            ...p,
            lastAnalysis: p.analysis,
            analysis: a,
          })),
        ),

      setPlanStage: (s) => set({ planStage: s }),
      setPlanQuestions: (projectId, qs) =>
        set((st) =>
          updateById(st, projectId, (p) => ({
            ...p,
            planQuestions: qs,
            planAnswers: qs.map((_, i) => p.planAnswers[i] || ''),
          })),
        ),
      setPlanAnswer: (i, v) =>
        set((st) =>
          updateCurrent(st, (p) => {
            const next = [...p.planAnswers]
            next[i] = v
            return { ...p, planAnswers: next }
          }),
        ),
      setPlan: (plan) => set((st) => updateCurrent(st, (p) => ({ ...p, plan }))),

      setPendingChatSeed: (s) =>
        set((st) => updateCurrent(st, (p) => ({ ...p, pendingChatSeed: s }))),
      appendMessage: (m) =>
        set((st) =>
          updateCurrent(st, (p) => ({ ...p, messages: [...p.messages, m] })),
        ),
      updateLastMessage: (mutator) =>
        set((st) =>
          updateCurrent(st, (p) => {
            if (p.messages.length === 0) return p
            const msgs = [...p.messages]
            msgs[msgs.length - 1] = mutator(msgs[msgs.length - 1])
            return { ...p, messages: msgs }
          }),
        ),

      appendDiary: (d) =>
        set((st) =>
          updateCurrent(st, (p) => ({ ...p, diary: [d, ...p.diary] })),
        ),
      setCoachLine: (s) =>
        set((st) => updateCurrent(st, (p) => ({ ...p, coachLine: s }))),
    }),
    {
      name: 'opc-coach-v1',
      version: 2,
      migrate: (persisted, version) => {
        if (!persisted || typeof persisted !== 'object') return persisted
        // v1 → v2: 单个 project → projects[]
        if (version < 2) {
          const p = persisted as Record<string, unknown>
          const single = p.project as (Project & { id?: string }) | null | undefined
          if (single) {
            const id = single.id || genId()
            p.projects = [{ ...single, id }]
            p.currentProjectId = id
          } else {
            p.projects = []
            p.currentProjectId = null
          }
          delete p.project
        }
        return persisted
      },
    },
  ),
)

/** React hook: return the currently active project (or null). */
export function useCurrentProject(): Project | null {
  const projects = useAppStore((s) => s.projects)
  const currentId = useAppStore((s) => s.currentProjectId)
  return useMemo(
    () => projects.find((p) => p.id === currentId) ?? null,
    [projects, currentId],
  )
}
