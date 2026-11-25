import type { DesktopStorageAction, DesktopStorageManager } from '../profile/desktop-storage'

export interface DesktopStorageIpcEvent {
  sender: unknown
  returnValue?: unknown
}

export interface DesktopStorageIpc {
  removeAllListeners(channel: string): void
  on(channel: string, listener: (event: DesktopStorageIpcEvent, action?: unknown) => void): void
}

/** Keep a missing or unexpected field from failing the storage write. */
export function readStorageAction(value: unknown): DesktopStorageAction | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const row = value as { type?: unknown, key?: unknown, val?: unknown }
  if (row.type === 'clear') return { type: 'clear' }
  if (row.type === 'remove' && typeof row.key === 'string') return { type: 'remove', key: row.key }
  if (row.type === 'set' && typeof row.key === 'string' && typeof row.val === 'string') {
    return { type: 'set', key: row.key, val: row.val }
  }
  return undefined
}

/**
 * Serve the active profile's desktop storage to its own window.
 * The official client reads `dsh.sessions.current` from localStorage and
 * otherwise creates a blank session in the current workspace.
 */
export function attachDesktopStorage(
  ipc: DesktopStorageIpc,
  storage: DesktopStorageManager,
  owner: () => unknown
): void {
  ipc.removeAllListeners('dsh:storage-load-sync')
  ipc.on('dsh:storage-load-sync', event => {
    event.returnValue = event.sender === owner() ? storage.getAll() : {}
  })
  ipc.removeAllListeners('dsh:storage-sync')
  ipc.on('dsh:storage-sync', (event, action) => {
    if (event.sender !== owner()) return
    const parsed = readStorageAction(action)
    if (parsed !== undefined) storage.applyAction(parsed)
  })
}
