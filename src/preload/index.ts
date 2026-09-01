import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { UpdateStatus } from '../shared/contracts'
import { developerModeEnabledFromArguments } from '../shared/developer-mode'
import { appVersionFromArguments } from '../shared/app-info'
import { createSherlockAboutBridge } from './about-info'
import {
  DEVELOPER_CONVERSATION_VIEW_IDS,
  DEVELOPER_SETTINGS_SECTION_IDS,
  DeveloperModeController,
  developerModeNoticeText,
  setDeveloperConversationTabsVisibility,
  setDeveloperSettingsVisibility
} from './developer-mode'
import { isPluginLoadError } from './plugin-error-view'
import { mountDesktopShellStyles } from './shell-style'
import { SidebarUpdateControl } from './sidebar-update-control'
import { mountNativeThemeSync, mountWindowsTitlebar } from './windows-titlebar'
import {
  createResearchPreviewBridge,
  safePathForFile
} from './research-file-path'
import { createResearchCanvasWheelBridge } from './research-canvas-wheel'
import { createResearchLinkFrameBridge } from './research-link-frame'
import { createResearchWebReaderBridge } from './research-web-reader'
import { createResearchCanvasExportBridge } from './research-canvas-export'

if (process.isMainFrame) {
const DEVELOPER_MODE_STYLE_ID = 'sherlock-developer-mode-style'
const DEVELOPER_MODE_NOTICE_ID = 'sherlock-developer-mode-notice'
const locale = navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'

const initialDeveloperMode = developerModeEnabledFromArguments(process.argv)
const developerMode = new DeveloperModeController({
  getItem: () => (initialDeveloperMode ? 'true' : null),
  setItem: (_key, value) => {
    void ipcRenderer
      .invoke('developer-mode:set-enabled', value === 'true')
      .catch((error: unknown) =>
        console.warn('[developer-mode] unable to persist desktop developer mode', error)
      )
  }
})
const sidebarUpdateControl = new SidebarUpdateControl(document, locale, {
  download: () => ipcRenderer.invoke('updates:download'),
  install: () => ipcRenderer.invoke('updates:install'),
  retry: () => ipcRenderer.invoke('desktop-menu:execute', 'check-for-updates')
})

let receivedStatusEvent = false
let bootFailureTriggered = false
let bootFailureTimer: number | undefined
let developerModeNoticeTimer: number | undefined
const pendingBootFailureMessages: string[] = []

const BOOT_FAILURE_SETTLE_MS = 400

function currentBootFailureText(): string | undefined {
  const root = document.body || document.documentElement
  if (!root) return undefined

  // The package list and loader detail are rendered in separate sibling
  // containers on Harness's boot-failure page. Reading only the title's
  // parent drops exactly the evidence Desktop needs to identify the second
  // conflicting plugin, so capture the full failure page instead.
  const text = document.body?.innerText || root.textContent
  if (!text?.includes('Failed to load plugins')) return undefined
  return text
    ?.split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)
    .join('\n')
}

function addBootFailureMessage(message: string | undefined): void {
  const normalized = message?.trim()
  if (!normalized || pendingBootFailureMessages.includes(normalized)) return
  pendingBootFailureMessages.push(normalized)
}

function queueBootFailure(message?: string): void {
  if (bootFailureTriggered) return

  addBootFailureMessage(message)
  addBootFailureMessage(currentBootFailureText())
  if (pendingBootFailureMessages.length === 0) return

  if (bootFailureTimer !== undefined) window.clearTimeout(bootFailureTimer)
  bootFailureTimer = window.setTimeout(() => {
    bootFailureTimer = undefined
    if (bootFailureTriggered) return

    // The web boot page renders the plugin name and detailed loader error after
    // window.error/unhandledrejection fires. Read it one last time before leaving
    // the page so recovery receives the richest available diagnostic evidence.
    addBootFailureMessage(currentBootFailureText())
    const errorText = pendingBootFailureMessages.join('\n')
    if (!errorText) return

    bootFailureTriggered = true
    void ipcRenderer.invoke('harness:open-recovery', errorText)
  }, BOOT_FAILURE_SETTLE_MS)
}

function checkBootFailureInDom(): void {
  const errorText = currentBootFailureText()
  if (!errorText) return
  queueBootFailure(errorText)
}

const domObserver = new MutationObserver(() => {
  checkBootFailureInDom()
  syncDeveloperModeVisibility()
  sidebarUpdateControl.mount()
})

contextBridge.exposeInMainWorld('dshDesktopDirectoryPicker', {
  pick: (): Promise<string | null> => ipcRenderer.invoke('directory-picker:open')
})

function initializeUi(): void {
  mountDeveloperModeUi()
  if (process.platform === 'win32') {
    mountWindowsTitlebar({ document, ipcRenderer, locale })
  } else if (process.platform === 'darwin') {
    mountNativeThemeSync({ document, ipcRenderer })
    mountDesktopShellStyles(document)
  }
  sidebarUpdateControl.mount()
  checkBootFailureInDom()
  domObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  })
}

window.addEventListener('error', (event) => {
  const err = event.error ?? event.message
  if (isPluginLoadError(err)) {
    const errorText = typeof err === 'string' ? err : err instanceof Error ? err.message : String(err)
    queueBootFailure(errorText)
  }
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  if (isPluginLoadError(reason)) {
    const errorText = typeof reason === 'string' ? reason : reason instanceof Error ? reason.message : String(reason)
    queueBootFailure(errorText)
  }
})

contextBridge.exposeInMainWorld(
  'sherlockDesktopInfo',
  Object.freeze({
    name: 'Sherlock',
    version: appVersionFromArguments(process.argv)
  })
)

contextBridge.exposeInMainWorld(
  'dshDesktop',
  Object.freeze({
    restartHarness: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('harness:restart'),
    showItemInFolder: (path: string): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke('filesystem:show-item-in-folder', path),
    researchFilesAvailable: (paths: string[]): Promise<boolean[]> =>
      ipcRenderer.invoke('research:files-available', paths),
    researchCanvasStorage: Object.freeze({
      getItem: (key: string): string | null => {
        const value = ipcRenderer.sendSync('research:canvas-storage:get', key) as unknown
        return typeof value === 'string' ? value : null
      },
      setItem: (key: string, value: string): boolean =>
        ipcRenderer.sendSync('research:canvas-storage:set', key, value) === true
    }),
    researchCanvasWheel: createResearchCanvasWheelBridge(ipcRenderer),
    researchLinkFrame: createResearchLinkFrameBridge(
      (channel, value) => ipcRenderer.invoke(channel, value)
    ),
    researchWebReader: createResearchWebReaderBridge(
      (channel, value) => ipcRenderer.invoke(channel, value)
    ),
    researchCanvasExport: createResearchCanvasExportBridge(
      (channel, value) => ipcRenderer.invoke(channel, value)
    ),
    researchPreview: createResearchPreviewBridge(
      webUtils.getPathForFile,
      (channel, value) => ipcRenderer.invoke(channel, value)
    ),
    // Compatibility for the existing attachment submission path. Preview
    // callers must use researchPreview so raw filesystem paths never become
    // preview credentials or protocol URLs.
    getPathForFile: (file: File): string => safePathForFile(file, webUtils.getPathForFile)
  })
)

contextBridge.exposeInMainWorld(
  'sherlockAbout',
  createSherlockAboutBridge(
    () => ipcRenderer.invoke('updates:status') as Promise<UpdateStatus>,
    () => ipcRenderer.invoke('updates:check') as Promise<UpdateStatus>,
    locale
  )
)

contextBridge.exposeInMainWorld(
  'dshRecovery',
  Object.freeze({
    action: (action: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('recovery:action', action)
  })
)

contextBridge.exposeInMainWorld(
  'sherlockDeveloperMode',
  Object.freeze({
    logoClick: (): void => {
      const result = developerMode.logoClick(Date.now())
      if (result.status === 'pending') return

      const enabled = result.status === 'activated'
      document.documentElement.dataset.sherlockDeveloperMode = String(enabled)
      syncDeveloperModeVisibility()
      showDeveloperModeNotice(enabled)
    }
  })
)

function mountDeveloperModeUi(): void {
  document.documentElement.dataset.sherlockDeveloperMode = String(developerMode.isEnabled())

  if (!document.getElementById(DEVELOPER_MODE_STYLE_ID)) {
    const style = document.createElement('style')
    style.id = DEVELOPER_MODE_STYLE_ID
    style.textContent = `${[
      ...DEVELOPER_SETTINGS_SECTION_IDS.map(
        (id) =>
          `html:not([data-sherlock-developer-mode="true"]) [data-settings-section-id="${id}"]`
      ),
      ...DEVELOPER_CONVERSATION_VIEW_IDS.map(
        (id) =>
          `html:not([data-sherlock-developer-mode="true"]) [data-conversation-view-id="${id}"]`
      ),
      'html:not([data-sherlock-developer-mode="true"]) [data-sherlock-developer-tab="true"]'
    ].join(',\n')} { display: none !important; }`
    document.documentElement.appendChild(style)
  }

  syncDeveloperModeVisibility()
}

function syncDeveloperModeVisibility(): void {
  const settingsRows = document.querySelectorAll<HTMLElement>('[data-settings-section-id]')
  setDeveloperSettingsVisibility(settingsRows, developerMode.isEnabled())
  setDeveloperConversationTabsVisibility(
    document.querySelectorAll<HTMLElement>(
      '[data-conversation-view-id], [role="tablist"] > [role="tab"]'
    ),
    developerMode.isEnabled()
  )
}

function showDeveloperModeNotice(enabled: boolean): void {
  window.clearTimeout(developerModeNoticeTimer)
  document.getElementById(DEVELOPER_MODE_NOTICE_ID)?.remove()

  const notice = document.createElement('div')
  notice.id = DEVELOPER_MODE_NOTICE_ID
  notice.role = 'status'
  notice.setAttribute('aria-live', 'polite')
  notice.textContent = developerModeNoticeText(locale, enabled)
  notice.style.cssText = [
    'position:fixed',
    'left:50%',
    'bottom:28px',
    'z-index:2147483647',
    'transform:translateX(-50%)',
    'pointer-events:none',
    'padding:10px 16px',
    'border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14))',
    'border-radius:10px',
    'color:var(--dsw-alias-label-primary,#f5f5f5)',
    'background:var(--dsw-alias-bg-layer-2,rgba(38,38,41,.96))',
    'box-shadow:0 10px 30px rgba(0,0,0,.28)',
    'font:500 13px/20px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'
  ].join(';')
  document.documentElement.appendChild(notice)

  developerModeNoticeTimer = window.setTimeout(() => {
    developerModeNoticeTimer = undefined
    notice.remove()
  }, 2_400)
}

function applyStatus(status: UpdateStatus): void {
  sidebarUpdateControl.render(status)
}

ipcRenderer.on('updates:status-changed', (_event, status: UpdateStatus) => {
  receivedStatusEvent = true
  applyStatus(status)
})

void ipcRenderer
  .invoke('updates:status')
  .then((status: UpdateStatus) => {
    if (!receivedStatusEvent) applyStatus(status)
  })
  .catch((error: unknown) => console.warn('[updater] unable to read update status', error))

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initializeUi, { once: true })
} else {
  initializeUi()
}
}
