import { useSyncExternalStore } from 'react'

type Listener = () => void

const pendingProjectIds = new Set<string>()
const listeners = new Set<Listener>()

function notify() {
  listeners.forEach((listener) => listener())
}

/**
 * Track the actual in-memory analysis request. This intentionally isn't
 * persisted: after a full page reload there is no browser request we can
 * truthfully claim is still running.
 */
export function trackAnalysisRequest<T>(
  projectId: string,
  request: () => Promise<T>,
): Promise<T> {
  pendingProjectIds.add(projectId)
  notify()

  return request().finally(() => {
    pendingProjectIds.delete(projectId)
    notify()
  })
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(projectId: string | null) {
  return projectId ? pendingProjectIds.has(projectId) : false
}

/** Whether this page currently owns a still-pending analysis request. */
export function useAnalysisRequestPending(projectId: string | null): boolean {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot(projectId),
    () => false,
  )
}
