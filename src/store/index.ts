import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
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
  setProjectName: (n: string) => void
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

const PERSIST_NAME = 'opc-coach-v1'
const ACCOUNT_STORAGE_PREFIX = `${PERSIST_NAME}:user:`

// The store must not hydrate before authentication has identified the user.
// Each account gets its own localStorage entry, and the old shared key is
// intentionally never read.
let activeUserUuid: string | null = null

function accountStorageKey(uuid: string): string {
  return `${ACCOUNT_STORAGE_PREFIX}${uuid}`
}

const userScopedStorage = {
  getItem: (_name: string): string | null => {
    if (!activeUserUuid) return null
    return window.localStorage.getItem(accountStorageKey(activeUserUuid))
  },
  setItem: (_name: string, value: string): void => {
    if (!activeUserUuid) return
    window.localStorage.setItem(accountStorageKey(activeUserUuid), value)
  },
  removeItem: (_name: string): void => {
    if (!activeUserUuid) return
    window.localStorage.removeItem(accountStorageKey(activeUserUuid))
  },
}

const userScopedPersistStorage = createJSONStorage(() => userScopedStorage)

const EMPTY_STATE: Pick<
  State,
  'screen' | 'tab' | 'planStage' | 'renaming' | 'draftName' | 'projects' | 'currentProjectId'
> = {
  screen: 'login',
  tab: 'analysis',
  planStage: 'form',
  renaming: false,
  draftName: '',
  projects: [],
  currentProjectId: null,
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
      setProjectName: (name) =>
        set((st) => updateCurrent(st, (p) => ({ ...p, name }))),
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
      // The storage adapter maps this logical name to
      // `opc-coach-v1:user:${uuid}` for the authenticated account.
      name: PERSIST_NAME,
      version: 1,
      storage: userScopedPersistStorage,
      skipHydration: true,
    },
  ),
)

/** Load the local snapshot belonging to the authenticated account. */
export function loadUserState(userUuid: string): void {
  activeUserUuid = null
  useAppStore.setState(EMPTY_STATE)

  activeUserUuid = userUuid
  const raw = userScopedStorage.getItem(PERSIST_NAME)
  if (!raw) return

  try {
    const persisted = JSON.parse(raw) as { state?: Partial<State> }
    if (persisted.state && typeof persisted.state === 'object') {
      useAppStore.setState(persisted.state)
    }
  } catch {
    // Ignore malformed account-local data and start this account cleanly.
  }
}

/** Clear the active account from memory without deleting its local snapshot. */
export function clearUserState(): void {
  activeUserUuid = null
  useAppStore.setState(EMPTY_STATE)
}

/** React hook: return the currently active project (or null). */
export function useCurrentProject(): Project | null {
  const projects = useAppStore((s) => s.projects)
  const currentId = useAppStore((s) => s.currentProjectId)
  return useMemo(
    () => projects.find((p) => p.id === currentId) ?? null,
    [projects, currentId],
  )
}
