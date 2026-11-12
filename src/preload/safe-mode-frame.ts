import { ipcRenderer, type IpcRendererEvent } from 'electron'
import { DESKTOP_IPC } from '../main/shell/window/ipc'

const FRAME_ID = 'dsh-desktop-safe-mode-frame'
const FRAME_ORIGIN = 'dsh-desktop://desktop'

/**
 * The Safe Mode page has no preload. It posts actions to this frame, which
 * relays them to the main process. The frame only accepts the desktop page
 * and only while it is the iframe we mounted.
 */
export function mountSafeModeFrame(): void {
  let pageUrl: string | undefined
  let host: HTMLElement | undefined
  let frameLoaded = false

  const sync = (): void => {
    const root = document.documentElement
    if (root === null) return
    if (pageUrl === undefined) {
      host?.remove()
      host = undefined
      frameLoaded = false
      return
    }
    if (host === undefined || !host.isConnected) {
      host = document.createElement('div')
      host.id = FRAME_ID
      // Cover the whole window, including the sidebar. Modals above z-index 1000 stay on top.
      host.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;z-index:500;'
      const frame = document.createElement('iframe')
      frame.title = 'Safe Mode'
      frame.style.cssText = 'display:block;width:100%;height:100%;border:0;background:#fff;'
      frame.addEventListener('load', () => { frameLoaded = true })
      host.appendChild(frame)
      root.appendChild(host)
    }
    const frame = host.firstElementChild
    if (frame instanceof HTMLIFrameElement && frame.src !== pageUrl) {
      frameLoaded = false
      frame.src = pageUrl
    }
  }

  ipcRenderer.on(DESKTOP_IPC.safeModeFrame, (_event: IpcRendererEvent, value: unknown) => {
    pageUrl = safeModePageUrl(value)
    sync()
  })
  window.addEventListener('message', event => {
    const frame = host?.isConnected ? host.firstElementChild : null
    if (!(frame instanceof HTMLIFrameElement) || !frameLoaded) return
    const target = frame.contentWindow
    if (target === null || event.source !== target || event.origin !== FRAME_ORIGIN) return
    const data: unknown = event.data
    if (typeof data !== 'object' || data === null) return
    if (!('type' in data) || data.type !== 'dsh-safe-mode:action') return
    if (!('id' in data) || typeof data.id !== 'number') return
    const id = data.id
    const action = 'action' in data ? data.action : undefined
    const selection = 'selection' in data ? data.selection : undefined
    void ipcRenderer.invoke(DESKTOP_IPC.safeModeAction, action, selection)
      .then((result: unknown) => result, () => ({ ok: false }))
      .then(result => { target.postMessage({ type: 'dsh-safe-mode:result', id, result }, FRAME_ORIGIN) })
  })
}

function safeModePageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return undefined
  }
  if (url.protocol !== 'dsh-desktop:' || url.hostname !== 'desktop' || url.pathname !== '/safe-mode.html') return undefined
  return url.href
}
