import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { UpdateLocale } from './update-view'
import { setupDesktopStoragePersistence } from './desktop-storage'
import { mountDesktopUpdateUi } from './desktop-update-ui'
import { isPluginLoadError } from './plugin-error-view'
import { findBootFailureText } from './boot-failure'
import { markWindowsTitlebar, mountWindowsTitlebarLayout } from './windows-titlebar'
import { mountMacosWindowChrome } from './macos-window-chrome'
import { createHostPathsBridge, HOST_PATHS_BRIDGE } from './host-paths'

if (process.platform === 'darwin') {
  const dispose = mountMacosWindowChrome(document, listener => {
    const receive = (_event: Electron.IpcRendererEvent, value: unknown): void => {
      if (typeof value === 'boolean') listener(value)
    }
    ipcRenderer.on('dsh-desktop:window-fullscreen', receive)
    return () => ipcRenderer.removeListener('dsh-desktop:window-fullscreen', receive)
  })
  window.addEventListener('unload', dispose, { once: true })
}

if (process.platform === 'win32') markWindowsTitlebar(document)

// Intercept and persist localStorage to disk storage before any page script executes
setupDesktopStoragePersistence()

const MOBILE_BUTTON_ID = 'dsh-desktop-mobile-button'
const SAFE_MODE_BANNER_ID = 'dsh-desktop-safe-mode-banner'
const locale: UpdateLocale = navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'

let phoneConnected = false
let sidebarSettingsArea: HTMLElement | undefined
let sidebarRoot: HTMLElement | undefined
/** The Safe Mode card; it lives in the sidebar just above the settings row. */
let safeModeBannerHost: HTMLElement | undefined
let mobileButton: HTMLButtonElement | undefined
let domSyncScheduled = false
let bootScanSettled = false
let bootFailureTriggered = false
let bootFailureTimer: number | undefined
let rendererHealthReportInFlight = false
let rendererHealthHeartbeat: number | undefined
const pendingBootFailureMessages: string[] = []

const BOOT_FAILURE_SETTLE_MS = 400
const RENDERER_HEALTH_HEARTBEAT_MS = 5_000

function reportRendererHealthy(): void {
  if (rendererHealthReportInFlight || !sidebarRoot?.isConnected) return
  rendererHealthReportInFlight = true
  void ipcRenderer.invoke('harness:renderer-healthy').catch(() => undefined).finally(() => {
    rendererHealthReportInFlight = false
  })
}

function startRendererHealthHeartbeat(): void {
  reportRendererHealthy()
  if (rendererHealthHeartbeat !== undefined) return
  rendererHealthHeartbeat = window.setInterval(reportRendererHealthy, RENDERER_HEALTH_HEARTBEAT_MS)
}

function currentBootFailureText(): string | undefined {
  // Harness removes this root once the application starts. Scoping the check
  // to it prevents a quoted error in a conversation from being mistaken for a
  // startup failure by the document-wide mutation observer.
  return findBootFailureText(document)
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

/**
 * Harness streams assistant output token by token, so the document-wide
 * observer fires tens of times a second on a conversation that can hold tens of
 * thousands of nodes. Coalescing every batch into one animation frame bounds
 * the work at 60Hz instead of per-mutation, and stops it entirely while the
 * window is hidden, since the browser withholds frames from background pages.
 */
const domObserver = new MutationObserver(scheduleDomSync)

function scheduleDomSync(): void {
  if (domSyncScheduled) return
  domSyncScheduled = true
  window.requestAnimationFrame(runDomSync)
}

function runDomSync(): void {
  domSyncScheduled = false
  positionSafeModeFrame()
  placeSafeModeBanner()
  mountMobileButton()
  if (bootScanSettled) return
  // The boot screen only exists until Harness renders its own UI, and the
  // sidebar appearing is that moment. Past it the selector can never match
  // again, so scanning on would walk the conversation tree every frame for a
  // guaranteed miss. The window error handlers stay as the real backstop.
  if (sidebarRoot?.isConnected) {
    bootScanSettled = true
    startRendererHealthHeartbeat()
  } else checkBootFailureInDom()
}

contextBridge.exposeInMainWorld('__DSH_DIRECTORY_PICKER__', {
  pick: (): Promise<string | null> => ipcRenderer.invoke('directory-picker:open')
})

contextBridge.exposeInMainWorld(
  HOST_PATHS_BRIDGE,
  createHostPathsBridge(file => webUtils.getPathForFile(file))
)

/**
 * `[data-dsh-*]` lookups are attribute selectors with no index behind them, so
 * a miss costs a full tree walk. Caching the nodes turns the steady state into
 * an `isConnected` flag read, and a re-render that detaches them re-queries.
 */
function liveElement<T extends Element>(cached: T | undefined, selector: string): T | undefined {
  if (cached?.isConnected) return cached
  return document.querySelector<T>(selector) ?? undefined
}

function mountMobileButton(): void {
  if (!document.getElementById(`${MOBILE_BUTTON_ID}-style`)) {
    const style = document.createElement('style')
    style.id = `${MOBILE_BUTTON_ID}-style`
    style.textContent = mobileButtonStyles
    document.head.appendChild(style)
  }
  sidebarSettingsArea = liveElement(sidebarSettingsArea, '[data-dsh-sidebar-settings]')
  const settingsArea = sidebarSettingsArea
  if (!settingsArea) return
  if (!mobileButton?.isConnected) {
    mobileButton =
      (document.getElementById(MOBILE_BUTTON_ID) as HTMLButtonElement | null) ?? undefined
  }
  if (!mobileButton) {
    const created = document.createElement('button')
    created.id = MOBILE_BUTTON_ID
    created.type = 'button'
    created.innerHTML = `${phoneIcon}<span aria-hidden="true"></span>`
    created.addEventListener('click', () => {
      void ipcRenderer.invoke('mobile:open-pairing').catch((error: unknown) => {
        console.error('[mobile] unable to open pairing window', error)
      })
    })
    mobileButton = created
  }
  if (mobileButton.parentElement !== settingsArea) settingsArea.appendChild(mobileButton)
  renderMobileButton()
}

function renderMobileButton(): void {
  const button = mobileButton
  sidebarRoot = liveElement(sidebarRoot, '[data-dsh-sidebar-root]')
  const root = sidebarRoot
  if (!button || !root) return
  const wide = root.dataset.dshSidebarWide === 'true'
  const hidden = !wide && !phoneConnected
  const label = phoneConnected
    ? locale === 'zh' ? '管理手机连接' : 'Manage phone connection'
    : locale === 'zh' ? '连接手机' : 'Connect phone'
  if (button.hidden !== hidden) button.hidden = hidden
  if (button.classList.contains('is-connected') !== phoneConnected) {
    button.classList.toggle('is-connected', phoneConnected)
  }
  if (button.title !== label) {
    button.setAttribute('aria-label', label)
    button.title = label
  }
}

/**
 * Put the Safe Mode card into the sidebar, right above the settings row, and
 * keep it there across re-renders. A narrow sidebar shows only the compact
 * indicator button.
 */
function placeSafeModeBanner(): void {
  const host = safeModeBannerHost
  if (!host) return
  sidebarSettingsArea = liveElement(sidebarSettingsArea, '[data-dsh-sidebar-settings]')
  const settingsArea = sidebarSettingsArea
  if (!settingsArea?.parentElement) return
  if (host.nextElementSibling !== settingsArea || host.parentElement !== settingsArea.parentElement) {
    settingsArea.parentElement.insertBefore(host, settingsArea)
  }
  sidebarRoot = liveElement(sidebarRoot, '[data-dsh-sidebar-root]')
  const compact = sidebarRoot?.dataset.dshSidebarWide === 'false'
  if (host.dataset.compact !== String(compact)) host.dataset.compact = String(compact)
  if (compact || !sidebarRoot) return
  // The card spans the sidebar's content width (14px inset on both sides,
  // like the new-session button), whatever padding its container adds.
  const parent = host.parentElement as HTMLElement
  const parentStyle = getComputedStyle(parent)
  const sidebarRect = sidebarRoot.getBoundingClientRect()
  const parentRect = parent.getBoundingClientRect()
  const left = Math.round(14 - (parentRect.left + parseFloat(parentStyle.paddingLeft) - sidebarRect.left))
  const right = Math.round(14 - (sidebarRect.right - (parentRect.right - parseFloat(parentStyle.paddingRight))))
  const margin = `0 ${right}px 8px ${left}px`
  if (host.style.margin !== margin) host.style.margin = margin
}

async function mountSafeModeBanner(): Promise<void> {
  if (location.protocol === 'file:' || safeModeBannerHost) return
  try {
    const status = (await ipcRenderer.invoke('safe-mode:status')) as {
      active?: boolean
      locale?: 'en' | 'zh'
    }
    if (status.active !== true) return
    const safeModeLocale = status.locale === 'zh' ? 'zh' : 'en'

    const host = document.createElement('div')
    host.id = SAFE_MODE_BANNER_ID
    host.style.cssText = [
      'display:block',
      'box-sizing:border-box',
      'margin:0 14px 8px',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'
    ].join(';')
    const shadow = host.attachShadow({ mode: 'closed' })
    const style = document.createElement('style')
    // Theme comes from the Harness page's own custom properties, which
    // inherit into the shadow tree; the fallbacks match the light theme.
    style.textContent = `
      :host([data-compact="true"]) { margin: 0 auto 8px; width: 32px; }
      .bar { display:grid; gap:6px; padding:12px; border-radius:16px; color:var(--dsw-alias-label-primary, #27272a); background:var(--dsw-alias-bg-layer-1, rgba(255,255,255,.94)); }
      :host([data-compact="true"]) .bar { display:none; }
      .head { display:flex; align-items:center; gap:8px; min-width:0; }
      .dot { flex:none; width:7px; height:7px; border-radius:50%; background:#d97706; }
      .title { font-size:12px; font-weight:700; line-height:1.3; }
      .description { margin:0; color:var(--dsw-alias-label-secondary, #71717a); font-size:11px; font-weight:500; line-height:1.45; text-align:left; }
      .actions { display:flex; flex-wrap:wrap; gap:6px; margin-top:2px; }
      .actions button { flex:1 1 auto; min-height:26px; padding:3px 8px; border:1px solid var(--dsw-alias-border-l2, rgba(120,120,125,.35)); border-radius:8px; color:var(--dsw-alias-label-primary, #3f3f46); background:transparent; cursor:pointer; font:inherit; font-size:11px; font-weight:600; white-space:nowrap; }
      .actions button:hover { background:var(--dsw-alias-interactive-bg-hover, rgba(32,33,36,.08)); }
      .actions button:disabled { opacity:.55; cursor:default; }
      .compact { display:none; width:32px; height:32px; padding:0; border:1px solid var(--dsw-alias-border-l2, rgba(120,120,125,.35)); border-radius:9px; background:transparent; cursor:pointer; place-items:center; }
      :host([data-compact="true"]) .compact { display:grid; }
      .compact:hover { background:var(--dsw-alias-interactive-bg-hover, rgba(32,33,36,.08)); }
    `
    const bar = document.createElement('div')
    bar.className = 'bar'
    const head = document.createElement('span')
    head.className = 'head'
    const dot = document.createElement('span')
    dot.className = 'dot'
    const label = document.createElement('span')
    label.className = 'title'
    label.textContent = safeModeLocale === 'zh' ? '安全模式' : 'Safe Mode'
    const description = document.createElement('span')
    description.className = 'description'
    description.textContent = safeModeLocale === 'zh'
      ? '已暂时停用所有第三方插件，可停用有问题的插件后重启。'
      : 'All third-party plugins are temporarily disabled. Disable a problematic plugin, then restart.'
    const actions = document.createElement('span')
    actions.className = 'actions'
    const manage = document.createElement('button')
    manage.type = 'button'
    manage.textContent = safeModeLocale === 'zh' ? '管理插件' : 'Manage plugins'
    manage.setAttribute('aria-label', safeModeLocale === 'zh' ? '停用或启用第三方插件' : 'Disable or re-enable third-party plugins')
    manage.addEventListener('click', () => {
      void ipcRenderer.invoke('safe-mode:manage')
    })
    const exit = document.createElement('button')
    exit.type = 'button'
    exit.textContent = safeModeLocale === 'zh' ? '退出安全模式' : 'Exit Safe Mode'
    exit.setAttribute('aria-label', safeModeLocale === 'zh' ? '退出安全模式并重启' : 'Exit Safe Mode and restart')
    exit.addEventListener('click', () => {
      manage.disabled = true
      exit.disabled = true
      void ipcRenderer.invoke('safe-mode:exit').then((result) => {
        if (result?.blocked) {
          manage.disabled = false
          exit.disabled = false
        }
      }).catch(() => {
        manage.disabled = false
        exit.disabled = false
      })
    })
    actions.append(manage, exit)
    head.append(dot, label)
    bar.append(head, description, actions)
    const compact = document.createElement('button')
    compact.type = 'button'
    compact.className = 'compact'
    compact.title = safeModeLocale === 'zh' ? '安全模式：管理插件' : 'Safe Mode: manage plugins'
    compact.setAttribute('aria-label', compact.title)
    compact.appendChild(dot.cloneNode(true))
    compact.addEventListener('click', () => {
      void ipcRenderer.invoke('safe-mode:manage')
    })
    shadow.append(style, bar, compact)
    safeModeBannerHost = host
    placeSafeModeBanner()
  } catch (error) {
    console.warn('[safe-mode] unable to mount status banner', error)
  }
}

function applyMobileStatus(connected: boolean): void {
  if (phoneConnected === connected) return
  phoneConnected = connected
  mountMobileButton()
}

async function refreshMobileStatus(): Promise<void> {
  try {
    const status = (await ipcRenderer.invoke('mobile:status')) as { connected?: boolean }
    applyMobileStatus(status.connected === true)
  } catch (error) {
    console.warn('[mobile] unable to read connection status', error)
  }
}

ipcRenderer.on('mobile:status-changed', (_event, status: { connected?: boolean }) => {
  applyMobileStatus(status?.connected === true)
})

function initializeUi(): void {
  if (process.platform === 'win32') {
    mountWindowsTitlebarLayout({ document, ipcRenderer })
  }
  mountDesktopUpdateUi()
  mountMobileButton()
  checkBootFailureInDom()
  domObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  })
  void refreshMobileStatus()
  void mountSafeModeBanner()
  positionSafeModeFrame()
}

/**
 * The Safe Mode page lives in an iframe over the Harness main pane (everything
 * right of the sidebar), mounted here on the main process's request. As pane
 * content it sits below Harness modals such as settings and About, which a
 * native view over the window could not, and the sidebar stays usable beside
 * it. The main process sends the page URL to show and null to take it down;
 * a changed URL reloads the frame, which is how the page picks up a fresh
 * view model.
 */
const SAFE_MODE_FRAME_ID = 'dsh-desktop-safe-mode-frame'
/**
 * Set on the root while the page is up. The sidebar keeps working beside the
 * page, so the conversation it highlights is not what the pane shows; the
 * highlight goes until the page closes. Harness marks rows with WAI-ARIA tree
 * roles, which outlive its hashed class names.
 */
const SAFE_MODE_PAGE_ATTR = 'data-dsh-safe-mode-page'
const safeModeFrameStyles = `
  html[${SAFE_MODE_PAGE_ATTR}] [data-dsh-sidebar-root] [role="treeitem"][aria-selected="true"] { background-color: transparent !important; }
`
let safeModeFrameUrl: string | undefined
let safeModeFrameHost: HTMLElement | undefined
function syncSafeModeFrame(): void {
  if (location.protocol === 'file:') return
  let host = liveElement(safeModeFrameHost, `#${SAFE_MODE_FRAME_ID}`)
  document.documentElement.toggleAttribute(SAFE_MODE_PAGE_ATTR, safeModeFrameUrl !== undefined)
  if (!safeModeFrameUrl) {
    host?.remove()
    safeModeFrameHost = undefined
    return
  }
  if (!document.getElementById(`${SAFE_MODE_FRAME_ID}-style`)) {
    const style = document.createElement('style')
    style.id = `${SAFE_MODE_FRAME_ID}-style`
    style.textContent = safeModeFrameStyles
    document.head.appendChild(style)
  }
  if (!host) {
    host = document.createElement('div')
    host.id = SAFE_MODE_FRAME_ID
    // Below Harness modals (portaled to body at z-index 1000), above the pane.
    host.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;z-index:500;'
    const frame = document.createElement('iframe')
    frame.title = locale === 'zh' ? '安全模式' : 'Safe Mode'
    frame.style.cssText = 'display:block;width:100%;height:100%;border:0;background:transparent;'
    host.appendChild(frame)
    document.documentElement.appendChild(host)
  }
  safeModeFrameHost = host
  const frame = host.firstElementChild as HTMLIFrameElement
  if (frame.src !== safeModeFrameUrl) {
    safeModeFrameLoaded = false
    safeModeFrameUpdate = undefined
    frame.src = safeModeFrameUrl
    frame.addEventListener('load', () => {
      safeModeFrameLoaded = true
      frame.focus()
      postSafeModeFrameUpdate()
    }, { once: true })
  }
  positionSafeModeFrame()
}
ipcRenderer.on('safe-mode:frame', (_event, url: unknown) => {
  safeModeFrameUrl = typeof url === 'string' ? url : undefined
  syncSafeModeFrame()
})
/**
 * Picking a conversation in the sidebar (or starting one) is how the page is
 * left: Harness shows that conversation in the pane, and the page steps
 * aside for it. Workspace rows only fold and unfold, so they do not count;
 * they are the tree items that carry `aria-expanded`.
 */
document.addEventListener('click', (event) => {
  if (!safeModeFrameUrl || !(event.target instanceof Element)) return
  const picked = event.target.closest(
    '[data-dsh-sidebar-root] [role="treeitem"]:not([aria-expanded]), [data-dsh-sidebar-root] button[class*="newSession"]'
  )
  if (!picked) return
  void ipcRenderer.invoke('safe-mode:dismiss').catch(() => {})
}, true)
/**
 * A later view model for the page already up (the market check answering),
 * handed to the page to apply in place. It waits for the frame to finish
 * loading, since a message to a loading frame is lost.
 */
let safeModeFrameLoaded = false
let safeModeFrameUpdate: { seq?: unknown; model?: unknown } | undefined
function postSafeModeFrameUpdate(): void {
  const target = safeModeFrameLoaded && safeModeFrameHost?.isConnected
    ? (safeModeFrameHost.firstElementChild as HTMLIFrameElement | null)?.contentWindow
    : null
  if (!target || !safeModeFrameUpdate) return
  target.postMessage({ type: 'dsh-safe-mode:model', seq: safeModeFrameUpdate.seq, model: safeModeFrameUpdate.model }, '*')
}
ipcRenderer.on('safe-mode:frame-update', (_event, update: unknown) => {
  safeModeFrameUpdate = update && typeof update === 'object' ? update as { seq?: unknown; model?: unknown } : undefined
  postSafeModeFrameUpdate()
})
/**
 * The framed page has no preload of its own, so it posts each action here and
 * gets the result posted back under the same id. Only messages from the Safe
 * Mode frame itself, served on the desktop scheme, are relayed.
 */
const SAFE_MODE_FRAME_ORIGIN = 'dsh-desktop://desktop'
window.addEventListener('message', (event) => {
  const frame = safeModeFrameHost?.isConnected ? safeModeFrameHost.firstElementChild as HTMLIFrameElement | null : null
  const target = frame?.contentWindow
  if (!target || event.source !== target || event.origin !== SAFE_MODE_FRAME_ORIGIN) return
  const data = event.data as { type?: unknown; id?: unknown; action?: unknown; selection?: unknown } | null
  if (!data || data.type !== 'dsh-safe-mode:action' || typeof data.id !== 'number') return
  const { id, action, selection } = data
  void ipcRenderer.invoke('safe-mode:action', action, selection)
    .then((result: unknown) => result, (error: unknown) => ({ ok: false, error: error instanceof Error ? error.message : String(error) }))
    .then((result) => target.postMessage({ type: 'dsh-safe-mode:result', id, result }, '*'))
})

/**
 * Keep the frame's left edge on the sidebar's right edge. Re-run whenever the
 * window or the sidebar changes size, and on DOM sync in case Harness
 * re-renders the sidebar root.
 */
let layoutSidebarRoot: HTMLElement | undefined
let layoutQueued = false
let layoutObservedRoot: HTMLElement | undefined
const layoutResizeObserver = typeof ResizeObserver === 'function'
  ? new ResizeObserver(() => positionSafeModeFrame())
  : undefined
function positionSafeModeFrame(): void {
  if (location.protocol === 'file:' || layoutQueued || !safeModeFrameHost?.isConnected) return
  layoutQueued = true
  requestAnimationFrame(() => {
    layoutQueued = false
    const host = safeModeFrameHost
    if (!host?.isConnected) return
    layoutSidebarRoot = liveElement(layoutSidebarRoot, '[data-dsh-sidebar-root]')
    const root = layoutSidebarRoot
    if (root && root !== layoutObservedRoot && layoutResizeObserver) {
      if (layoutObservedRoot) layoutResizeObserver.unobserve(layoutObservedRoot)
      layoutResizeObserver.observe(root)
      layoutObservedRoot = root
    }
    const left = root ? Math.max(0, Math.round(root.getBoundingClientRect().right)) : 0
    const value = `${left}px`
    if (host.style.left !== value) host.style.left = value
  })
}
window.addEventListener('resize', () => positionSafeModeFrame())

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

window.addEventListener('pagehide', () => {
  if (rendererHealthHeartbeat !== undefined) window.clearInterval(rendererHealthHeartbeat)
  rendererHealthHeartbeat = undefined
})

contextBridge.exposeInMainWorld(
  'dshDesktop',
  Object.freeze({
    restartHarness: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('harness:restart'),
    getBuiltInImageGenerationStatus: (): Promise<{ enabled: boolean; marketActive: boolean }> =>
      ipcRenderer.invoke('desktop-host-plugin:status'),
    setBuiltInImageGenerationEnabled: (enabled: boolean): Promise<{ ok: boolean; enabled?: boolean; restartRequired?: boolean; reason?: string }> =>
      ipcRenderer.invoke('desktop-host-plugin:set-enabled', enabled),
    uninstallMarket: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('market:uninstall'),
    openInFinder: (path: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('harness:open-in-finder', path)
  })
)

contextBridge.exposeInMainWorld(
  'dshRecovery',
  Object.freeze({
    action: (action: string, options?: any): Promise<{ ok: boolean }> => ipcRenderer.invoke('recovery:action', action, options)
  })
)

contextBridge.exposeInMainWorld(
  'dshWebImport',
  Object.freeze({
    action: (action: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('web-import:action', action)
  })
)

const phoneIcon = `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true"><rect x="7" y="2.75" width="10" height="18.5" rx="2.25" stroke="currentColor" stroke-width="1.7"/><path d="M10.2 5.5h3.6M10.5 18.35h3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`

/**
 * The wide-sidebar button mirrors the settings trigger next to it: the same
 * 42px height (as a 42px square), the same 12px corner radius, and the same
 * 2px overhang past the settings area's content edge, with a 4px gap between
 * the two. The collapsed rail mirrors the trigger's 36px
 * circle instead. Both trigger sizes come from Harness's settings plugin.
 */
const mobileButtonStyles = `
  [data-dsh-sidebar-settings] { position:relative; box-sizing:border-box; }
  [data-dsh-sidebar-root][data-dsh-sidebar-wide="true"] [data-dsh-sidebar-settings] { padding-right:46px; }
  #${MOBILE_BUTTON_ID} { appearance:none; position:relative; width:42px; height:42px; padding:0; color:var(--dsw-alias-label-secondary,#73777f); background:transparent; border:0; border-radius:12px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; }
  [data-dsh-sidebar-root][data-dsh-sidebar-wide="true"] #${MOBILE_BUTTON_ID} { position:absolute; right:-2px; top:50%; transform:translateY(-50%); }
  [data-dsh-sidebar-root][data-dsh-sidebar-wide="false"] [data-dsh-sidebar-settings] { flex-direction:column; align-items:center; }
  [data-dsh-sidebar-root][data-dsh-sidebar-wide="false"] #${MOBILE_BUTTON_ID} { flex:none; width:36px; height:36px; border-radius:50%; margin-top:2px; }
  #${MOBILE_BUTTON_ID}:hover { color:var(--dsw-alias-label-primary,#202124); background:var(--dsw-alias-interactive-bg-hover,rgba(32,33,36,.08)); }
  #${MOBILE_BUTTON_ID}:focus-visible { outline:2px solid #4d6bfe; outline-offset:1px; }
  #${MOBILE_BUTTON_ID}[hidden] { display:none; }
  #${MOBILE_BUTTON_ID} > span { position:absolute; top:9px; right:9px; width:7px; height:7px; border:1.5px solid var(--dsw-specific-sidebar-fill,#fff); border-radius:50%; background:#4da66d; opacity:0; }
  [data-dsh-sidebar-root][data-dsh-sidebar-wide="false"] #${MOBILE_BUTTON_ID} > span { top:6px; right:6px; }
  #${MOBILE_BUTTON_ID}.is-connected > span { opacity:1; }
`

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initializeUi, { once: true })
} else {
  initializeUi()
}
