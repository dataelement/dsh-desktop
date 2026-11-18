import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from 'electron'
import type {
  DesktopShortcutInput,
  ShortcutConfigSnapshot,
  ShortcutEdit,
  ShortcutRevision,
  ShortcutSaveResult
} from '@deepseek-ai/dsh-client-shortcuts/protocol'
import type { DesktopFileSource, FileDragHandle, FileDragRequestId } from '@deepseek-ai/dsh-util-file-drag'
import { DESKTOP_IPC, PLATFORM_IPC, SCHEME } from '../main/shell/window/ipc'
import { setupDesktopStoragePersistence } from './desktop-storage'
import { createSidebarBrowserBridge } from './sidebar-browser'
import { usesDesktopCaption } from '../shared/desktop-menu'
import { markDesktopPlatform } from './desktop-platform'
import { mountDesktopUpdateUi } from './desktop-update-ui'
import { markWindowsTitlebar, mountWindowsTitlebarLayout } from './windows-titlebar'
import { mountSafeModeFrame } from './safe-mode-frame'
import { isSafeModeRenderer } from '../main/shell/mobile-pairing'

const appDocument = location.protocol === `${SCHEME}:` && location.hostname === 'app'
const webImportDocument = location.protocol === 'file:' && location.pathname.endsWith('/web-import.html')

if (usesDesktopCaption(process.platform)) {
  // This preload runs before <html> exists. Harness reads the marker while
  // creating its first frame, so the attribute has to land as soon as the
  // element appears. The caption menu itself waits until the body exists.
  markWindowsTitlebar(document)
  const mountCaption = (): void => {
    mountWindowsTitlebarLayout({ document, ipcRenderer })
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountCaption, { once: true })
  else mountCaption()
}

if (webImportDocument) {
  contextBridge.exposeInMainWorld('dshWebImport', {
    action: (action: string) => ipcRenderer.invoke(DESKTOP_IPC.webImportAction, action) as Promise<{ ok: boolean }>
  })
}

if (appDocument) {
  markDesktopPlatform(document, process.platform)
  setupDesktopStoragePersistence()
  // The custom-scheme preload runs before documentElement exists. Mounting the
  // update card at that moment throws and drops the rest of this bridge.
  const mountUpdateUi = () => { mountDesktopUpdateUi() }
  if (document.documentElement) mountUpdateUi()
  else document.addEventListener('DOMContentLoaded', mountUpdateUi, { once: true })
  mountSafeModeFrame()
  contextBridge.exposeInMainWorld('dshDesktopBoot', {
    ready: () => ipcRenderer.invoke(DESKTOP_IPC.boot) as Promise<unknown>,
    failed: (message: string) => ipcRenderer.invoke(DESKTOP_IPC.bootFailed, message) as Promise<void>
  })
  contextBridge.exposeInMainWorld('__DSH_HOST_PATHS__', {
    pathFor: (file: File) => webUtils.getPathForFile(file)
  })
  contextBridge.exposeInMainWorld('dshPlatform', {
    open: (page: 'usage' | 'top-up', bounds: { x: number, y: number, width: number, height: number }) => ipcRenderer.invoke(PLATFORM_IPC.open, page, bounds),
    setBounds: (bounds: { x: number, y: number, width: number, height: number }) => ipcRenderer.invoke(PLATFORM_IPC.bounds, bounds),
    close: () => ipcRenderer.invoke(PLATFORM_IPC.close)
  })
}

const desktopBridge: {
  protocolVersion: number
  openMobilePairing?: () => Promise<void>
  getMobileStatus?: () => Promise<{ connected?: boolean }>
  onMobileStatus?: (listener: (status: { connected: boolean }) => void) => () => void
  openRepairAgent?: () => Promise<{ ok?: boolean; error?: string }>
  restartHarness?: () => Promise<{ ok: boolean }>
  getRepairDraft?: (sessionId: string) => Promise<{ text?: string; token?: string }>
  acknowledgeRepairDraft?: (sessionId: string, token: string) => Promise<{ ok: boolean }>
  browser?: ReturnType<typeof createSidebarBrowserBridge>
  fileDrag?: {
    prepare: (source: DesktopFileSource, requestId: FileDragRequestId) => Promise<FileDragHandle | undefined>
    cancel: (requestId: FileDragRequestId) => void
    start: (handle: FileDragHandle) => Promise<boolean>
    release: (handle: FileDragHandle) => void
  }
  keyboard?: {
    closeWindow: (revision: ShortcutRevision) => Promise<void>
    subscribe: (listener: (input: DesktopShortcutInput) => void) => () => void
  }
  shortcuts?: {
    get: (definitions: readonly unknown[]) => Promise<ShortcutConfigSnapshot>
    edit: (edit: ShortcutEdit, revision: ShortcutRevision) => Promise<ShortcutSaveResult>
    recording: (active: boolean) => Promise<void>
    subscribe: (listener: (snapshot: ShortcutConfigSnapshot) => void) => () => void
  }
} = { protocolVersion: 1 }
if (appDocument) {
  desktopBridge.keyboard = {
    closeWindow: revision => ipcRenderer.invoke(DESKTOP_IPC.shortcutsCloseWindow, revision) as Promise<void>,
    subscribe: listener => {
      const handle = (_event: IpcRendererEvent, input: DesktopShortcutInput): void => {
        if (input.kind === 'iframe' || input.kind === 'webview') {
          const element = document.activeElement
          if (!(element instanceof HTMLIFrameElement) || !element.isConnected || input.frameName === ''
            || element.name !== input.frameName) return
          if (!element.matches('iframe[data-sidebar-browser-frame], iframe[data-html-preview]')) return
        }
        listener(input)
      }
      ipcRenderer.on(DESKTOP_IPC.shortcutsInput, handle)
      return () => { ipcRenderer.off(DESKTOP_IPC.shortcutsInput, handle) }
    }
  }
  desktopBridge.shortcuts = {
    get: definitions => ipcRenderer.invoke(DESKTOP_IPC.shortcutsGet, definitions) as Promise<ShortcutConfigSnapshot>,
    edit: (edit, revision) => ipcRenderer.invoke(DESKTOP_IPC.shortcutsEdit, edit, revision) as Promise<ShortcutSaveResult>,
    recording: active => ipcRenderer.invoke(DESKTOP_IPC.shortcutsRecording, active) as Promise<void>,
    subscribe: listener => {
      const handle = (_event: IpcRendererEvent, snapshot: ShortcutConfigSnapshot): void => { listener(snapshot) }
      ipcRenderer.on(DESKTOP_IPC.shortcutsChanged, handle)
      return () => { ipcRenderer.off(DESKTOP_IPC.shortcutsChanged, handle) }
    }
  }
  desktopBridge.browser = createSidebarBrowserBridge()
  desktopBridge.fileDrag = {
    prepare: (source, requestId) => ipcRenderer.invoke(DESKTOP_IPC.fileDragPrepare, source, requestId) as Promise<FileDragHandle | undefined>,
    cancel: requestId => {
      // Shutdown removes the handler; a late cancel is not a failed drag.
      void ipcRenderer.invoke(DESKTOP_IPC.fileDragCancel, requestId).catch(() => undefined)
    },
    start: handle => ipcRenderer.invoke(DESKTOP_IPC.fileDragStart, handle) as Promise<boolean>,
    release: handle => {
      // Shutdown also releases every prepared file.
      void ipcRenderer.invoke(DESKTOP_IPC.fileDragRelease, handle).catch(() => undefined)
    }
  }
  desktopBridge.openRepairAgent = () => ipcRenderer.invoke(DESKTOP_IPC.repairOpen) as Promise<{ ok?: boolean; error?: string }>
  desktopBridge.restartHarness = () => ipcRenderer.invoke(DESKTOP_IPC.restartHarness) as Promise<{ ok: boolean }>
  desktopBridge.getRepairDraft = sessionId => ipcRenderer.invoke(DESKTOP_IPC.repairDraftGet, sessionId) as Promise<{ text?: string; token?: string }>
  desktopBridge.acknowledgeRepairDraft = (sessionId, token) => ipcRenderer.invoke(DESKTOP_IPC.repairDraftAck, sessionId, token) as Promise<{ ok: boolean }>
}
if (appDocument && !isSafeModeRenderer(process.argv)) {
  desktopBridge.openMobilePairing = () => ipcRenderer.invoke(DESKTOP_IPC.mobileOpen) as Promise<void>
  desktopBridge.getMobileStatus = () => ipcRenderer.invoke(DESKTOP_IPC.mobileStatus) as Promise<{ connected?: boolean }>
  desktopBridge.onMobileStatus = listener => {
    const receive = (_event: IpcRendererEvent, status: unknown): void => {
      if (typeof status !== 'object' || status === null || !('connected' in status)) return
      listener({ connected: status.connected === true })
    }
    ipcRenderer.on(DESKTOP_IPC.mobileStatusChanged, receive)
    return () => { ipcRenderer.removeListener(DESKTOP_IPC.mobileStatusChanged, receive) }
  }
}
if (appDocument) {
  contextBridge.exposeInMainWorld('__DSH_DIRECTORY_PICKER__', {
    pick: (): Promise<string | null> => ipcRenderer.invoke(DESKTOP_IPC.directoryPick) as Promise<string | null>
  })
  contextBridge.exposeInMainWorld('__DSH_LOCALE__', {
    read: (): Promise<unknown> => ipcRenderer.invoke(DESKTOP_IPC.localeBootstrap),
    onChange: (locale: unknown): void => {
      if (typeof locale === 'string') ipcRenderer.send(DESKTOP_IPC.localeChanged, locale)
    }
  })
}
contextBridge.exposeInMainWorld('dshDesktop', desktopBridge)
