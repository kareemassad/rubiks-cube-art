const COMPLETION_STORAGE_PREFIX = 'rubiks-cube-art:completed:'

function completionKey(planHash: string): string {
  return `${COMPLETION_STORAGE_PREFIX}${planHash}`
}

export function readCompletedGroups(storage: Storage | undefined, planHash: string): Set<string> {
  if (!storage) return new Set()
  try {
    const raw = storage.getItem(completionKey(planHash))
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [])
  } catch {
    return new Set()
  }
}

export function writeCompletedGroups(storage: Storage | undefined, planHash: string, groupIds: Set<string>): void {
  if (!storage) return
  try {
    storage.setItem(completionKey(planHash), JSON.stringify([...groupIds]))
  } catch {
    // Completion tracking is a convenience; storage failures should not break builds.
  }
}
