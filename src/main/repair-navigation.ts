interface NavigationStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const REPAIR_NAVIGATION_KEYS = [
  'dsh.sessions.current',
  'dsh-desktop-workbenches.native-location.v1'
] as const
const RETURN_NAVIGATION = 'dsh.desktop.repair-return-navigation.v1'

function sessionId(value: string | null): string | undefined {
  if (!value) return undefined
  try {
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === 'object' && 'sessionId' in parsed && typeof parsed.sessionId === 'string'
      ? parsed.sessionId : undefined
  } catch { return undefined }
}

/** Save navigation only; conversation history and editable drafts stay owned by Harness. */
export function rememberRepairReturnNavigation(storage: NavigationStorage, repairSessionId: string): void {
  if (REPAIR_NAVIGATION_KEYS.some(key => sessionId(storage.getItem(key)) === repairSessionId)) return
  storage.setItem(RETURN_NAVIGATION, JSON.stringify(Object.fromEntries(
    REPAIR_NAVIGATION_KEYS.map(key => [key, storage.getItem(key)])
  )))
}

/** Run before loading the successfully repaired normal Profile, never for Safe Mode. */
export function restoreRepairReturnNavigation(storage: NavigationStorage, repairSessionId: string): boolean {
  if (!REPAIR_NAVIGATION_KEYS.some(key => sessionId(storage.getItem(key)) === repairSessionId)) return false
  let previous: unknown
  try { previous = JSON.parse(storage.getItem(RETURN_NAVIGATION) ?? 'null') } catch { previous = undefined }
  for (const key of REPAIR_NAVIGATION_KEYS) {
    const value: unknown = previous && typeof previous === 'object' ? Reflect.get(previous, key) : undefined
    if (typeof value === 'string' && sessionId(value) !== repairSessionId) storage.setItem(key, value)
    else storage.removeItem(key)
  }
  storage.removeItem(RETURN_NAVIGATION)
  return true
}
