import { ipcRenderer } from 'electron'
import { SIDEBAR_BROWSER_IPC, type SidebarBrowserBridge, type SidebarBrowserReservation } from '../shared/sidebar-browser'

/** Adapt the upstream Desktop browser transport without exposing arbitrary IPC. */
export function createSidebarBrowserBridge(): SidebarBrowserBridge {
  const listeners = new Map<string, Set<(url: string) => void>>()
  const receive = (_event: Electron.IpcRendererEvent, request: unknown): void => {
    if (typeof request !== 'object' || request === null || !('lease' in request) || !('url' in request)
      || typeof request.lease !== 'string' || typeof request.url !== 'string') return
    const callbacks = listeners.get(request.lease)
    if (!callbacks) return
    for (const callback of [...callbacks]) {
      try { callback(request.url) }
      catch (error) { console.error('Sidebar browser link handler failed', error) }
    }
  }
  ipcRenderer.on(SIDEBAR_BROWSER_IPC.openRequested, receive)
  window.addEventListener('unload', () => {
    ipcRenderer.removeListener(SIDEBAR_BROWSER_IPC.openRequested, receive)
    listeners.clear()
  }, { once: true })
  return Object.freeze({
    acquire: (workspace: string): Promise<SidebarBrowserReservation> =>
      ipcRenderer.invoke(SIDEBAR_BROWSER_IPC.acquire, workspace),
    release: async (lease: string): Promise<void> => {
      listeners.delete(lease)
      await ipcRenderer.invoke(SIDEBAR_BROWSER_IPC.release, lease)
    },
    onOpenRequested(lease: string, listener: (url: string) => void): () => void {
      let callbacks = listeners.get(lease)
      if (!callbacks) { callbacks = new Set(); listeners.set(lease, callbacks) }
      callbacks.add(listener)
      return () => {
        callbacks.delete(listener)
        if (callbacks.size === 0 && listeners.get(lease) === callbacks) listeners.delete(lease)
      }
    }
  })
}
