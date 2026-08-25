import { contextBridge, ipcRenderer } from 'electron'
import type { UpdateStatus } from '../shared/contracts'
import {
  isUpdateDismissed,
  shouldShowUpdate,
  updateHeadline,
  type UpdateLocale
} from './update-view'
import { isPluginLoadError } from './plugin-error-view'
import { mountWindowsTitlebar } from './windows-titlebar'

const ROOT_ID = 'dsh-desktop-update-root'
const MOBILE_BUTTON_ID = 'dsh-desktop-mobile-button'
const locale: UpdateLocale = navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'

let host: HTMLDivElement | undefined
let content: HTMLDivElement | undefined
let currentStatus: UpdateStatus | undefined
let dismissedVersion: string | null = null
let dismissedTransientPhase: UpdateStatus['phase'] | null = null
let installing = false
let accepting = false
let receivedStatusEvent = false
let phoneConnected = false
let mobileStatusTimer: number | undefined
let bootFailureTriggered = false
let bootFailureTimer: number | undefined
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
  mountMobileButton()
  checkBootFailureInDom()
})

contextBridge.exposeInMainWorld('dshDesktopDirectoryPicker', {
  pick: (): Promise<string | null> => ipcRenderer.invoke('directory-picker:open')
})

function mountMobileButton(): void {
  let style = document.getElementById(`${MOBILE_BUTTON_ID}-style`)
  if (!style) {
    style = document.createElement('style')
    style.id = `${MOBILE_BUTTON_ID}-style`
    style.textContent = mobileButtonStyles
    document.head.appendChild(style)
  }
  const settingsArea = document.querySelector<HTMLElement>('[data-dsh-sidebar-settings]')
  if (!settingsArea) return
  let button = document.getElementById(MOBILE_BUTTON_ID) as HTMLButtonElement | null
  if (!button) {
    button = document.createElement('button')
    button.id = MOBILE_BUTTON_ID
    button.type = 'button'
    button.innerHTML = `${phoneIcon}<span aria-hidden="true"></span>`
    button.addEventListener('click', () => {
      void ipcRenderer.invoke('mobile:open-pairing').catch((error: unknown) => {
        console.error('[mobile] unable to open pairing window', error)
      })
    })
  }
  if (button.parentElement !== settingsArea) settingsArea.appendChild(button)
  renderMobileButton()
}

function renderMobileButton(): void {
  const button = document.getElementById(MOBILE_BUTTON_ID) as HTMLButtonElement | null
  const root = document.querySelector<HTMLElement>('[data-dsh-sidebar-root]')
  if (!button || !root) return
  const wide = root.dataset.dshSidebarWide === 'true'
  button.hidden = !wide && !phoneConnected
  button.classList.toggle('is-connected', phoneConnected)
  const label = phoneConnected
    ? locale === 'zh' ? '管理手机连接' : 'Manage phone connection'
    : locale === 'zh' ? '连接手机' : 'Connect phone'
  button.setAttribute('aria-label', label)
  button.title = label
}

async function refreshMobileStatus(): Promise<void> {
  try {
    const status = (await ipcRenderer.invoke('mobile:status')) as { connected?: boolean }
    phoneConnected = status.connected === true
    mountMobileButton()
  } catch (error) {
    console.warn('[mobile] unable to read connection status', error)
  }
}

function initializeUi(): void {
  if (process.platform === 'win32') {
    mountWindowsTitlebar({ document, ipcRenderer, locale })
  }
  mount()
  mountMobileButton()
  checkBootFailureInDom()
  domObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  })
  void refreshMobileStatus()
  mobileStatusTimer ??= window.setInterval(() => void refreshMobileStatus(), 1000)
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
  'dshDesktop',
  Object.freeze({
    restartHarness: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('harness:restart')
  })
)

contextBridge.exposeInMainWorld(
  'dshRecovery',
  Object.freeze({
    action: (action: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('recovery:action', action)
  })
)

contextBridge.exposeInMainWorld(
  'dshSafeMode',
  Object.freeze({
    action: (action: string, plugins: string[]): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke('safe-mode:action', action, plugins)
  })
)

function mount(): void {
  if (document.getElementById(ROOT_ID)) return

  host = document.createElement('div')
  host.id = ROOT_ID
  host.style.cssText = [
    'position:fixed',
    'right:20px',
    'bottom:20px',
    'z-index:2147483646',
    'display:none',
    'width:min(384px,calc(100vw - 40px))',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'
  ].join(';')

  const shadow = host.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = styles
  content = document.createElement('div')
  shadow.append(style, content)
  document.documentElement.appendChild(host)
  render()
}

function applyStatus(status: UpdateStatus): void {
  currentStatus = status
  if (host) {
    host.dataset.updatePhase = status.phase
    host.dataset.updateManual = String(status.manual)
  }
  if (status.phase === 'error') installing = false
  if (status.phase !== 'available') accepting = false
  render()
}

function render(): void {
  if (!host || !content || !currentStatus) return

  if (
    !shouldShowUpdate(currentStatus) ||
    isUpdateDismissed(currentStatus, dismissedVersion, dismissedTransientPhase)
  ) {
    host.style.display = 'none'
    content.replaceChildren()
    return
  }

  host.style.display = 'block'
  const status = currentStatus
  const card = element('aside', 'card')
  card.setAttribute('aria-live', 'polite')
  card.setAttribute('aria-label', locale === 'zh' ? 'DSH Desktop 更新' : 'DSH Desktop update')

  const row = element('div', 'row')
  const badge = element('span', status.phase === 'error' ? 'badge warning' : 'badge')
  badge.setAttribute('aria-hidden', 'true')
  if (isBusy(status)) badge.appendChild(element('span', 'spinner'))
  else badge.innerHTML = updateIcon
  row.appendChild(badge)

  const headline = updateHeadline(status, locale)
  const body = element('div', 'body')
  const title = element('p', 'title')
  title.textContent = headline.title
  body.appendChild(title)

  // The failure's own words beat ours, when it has any.
  const description = element('p', 'description')
  description.textContent =
    status.phase === 'error' && status.message ? status.message : headline.description
  if (description.textContent) body.appendChild(description)

  if (status.phase === 'downloading') {
    const progress = element('div', 'progress')
    progress.setAttribute('role', 'progressbar')
    progress.setAttribute('aria-valuemin', '0')
    progress.setAttribute('aria-valuemax', '100')
    progress.setAttribute('aria-valuenow', String(Math.round(status.percent ?? 0)))
    const value = element('div', 'progressValue')
    value.style.width = `${status.percent ?? 0}%`
    progress.appendChild(value)
    body.appendChild(progress)
  }

  if (status.phase === 'available') {
    const actions = element('div', 'actions')
    const accept = button(locale === 'zh' ? '同意更新' : 'Update now', 'primary')
    accept.disabled = accepting
    accept.addEventListener('click', () => {
      accepting = true
      render()
      void ipcRenderer.invoke('updates:download').catch((error: unknown) => {
        accepting = false
        console.error('[updater] unable to download update', error)
        render()
      })
    })
    actions.append(accept, skipButton(status))
    body.appendChild(actions)
  }

  if (status.phase === 'downloading') {
    const actions = element('div', 'actions')
    actions.appendChild(skipButton(status))
    body.appendChild(actions)
  }

  if (status.phase === 'downloaded') {
    const actions = element('div', 'actions')
    const install = button(
      installing
        ? locale === 'zh'
          ? '正在重启…'
          : 'Restarting…'
        : locale === 'zh'
          ? '重新启动并安装'
          : 'Restart and install',
      'primary'
    )
    install.disabled = installing
    install.addEventListener('click', () => {
      installing = true
      render()
      void ipcRenderer.invoke('updates:install').catch((error: unknown) => {
        installing = false
        console.error('[updater] unable to install update', error)
        render()
      })
    })
    actions.append(install, skipButton(status))
    body.appendChild(actions)
  }

  row.appendChild(body)

  const close = button('×', 'close')
  close.setAttribute('aria-label', locale === 'zh' ? '关闭' : 'Close')
  close.addEventListener('click', dismissCurrent)
  row.appendChild(close)

  card.appendChild(row)
  content.replaceChildren(card)
}

/**
 * Stop being told about this version at all. The close button silences the
 * banner for this sitting only, so a release the user has decided against
 * comes back every launch; this one is remembered. A later release still asks,
 * and a manual check offers the skipped one again.
 */
function skipButton(status: UpdateStatus): HTMLButtonElement {
  const skip = button(locale === 'zh' ? '跳过此版本' : 'Skip this version', 'secondary')
  skip.addEventListener('click', () => {
    const version = status.availableVersion
    if (!version) return
    dismissCurrent()
    void ipcRenderer.invoke('updates:skip', version).catch((error: unknown) => {
      console.error('[updater] unable to skip update', error)
    })
  })
  return skip
}

function dismissCurrent(): void {
  if (!currentStatus) return
  if (currentStatus.availableVersion) {
    dismissedVersion = currentStatus.availableVersion
  } else {
    dismissedTransientPhase = currentStatus.phase
  }
  render()
}

function isBusy(status: UpdateStatus): boolean {
  return status.phase === 'checking' || status.phase === 'downloading'
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.className = className
  return node
}

function button(label: string, className: string): HTMLButtonElement {
  const node = element('button', className)
  node.type = 'button'
  node.textContent = label
  return node
}

const styles = `
  :host { color-scheme: light dark; }
  * { box-sizing: border-box; }
  .card {
    color: var(--dsw-alias-label-primary, #202124);
    background: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, 0.98));
    border: 1px solid var(--dsw-alias-border-l2, rgba(32, 33, 36, 0.14));
    border-radius: 14px;
    padding: 15px 16px;
    box-shadow: 0 14px 38px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.08);
    backdrop-filter: blur(18px);
  }
  .row { display: flex; align-items: flex-start; gap: 12px; }
  .body { min-width: 0; flex: 1; }
  .title { margin: 0; font-size: 14px; font-weight: 650; line-height: 20px; letter-spacing: -0.1px; }
  .description {
    margin: 3px 0 0;
    color: var(--dsw-alias-label-secondary, #666b73);
    font-size: 12.5px;
    line-height: 18px;
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
  .badge {
    width: 34px;
    height: 34px;
    margin-top: -1px;
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    color: #2ea043;
    background: rgba(46, 160, 67, 0.14);
  }
  .badge.warning { color: #d29922; background: rgba(210, 153, 34, 0.16); }
  .spinner {
    width: 16px;
    height: 16px;
    flex: none;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 999px;
    opacity: 0.85;
    animation: spin 0.75s linear infinite;
  }
  .progress {
    height: 5px;
    margin-top: 11px;
    overflow: hidden;
    border-radius: 999px;
    background: var(--dsw-alias-bg-layer-2, rgba(32, 33, 36, 0.1));
  }
  .progressValue {
    height: 100%;
    min-width: 2px;
    border-radius: inherit;
    background: #2ea043;
    transition: width 180ms ease;
  }
  .actions { display: flex; gap: 8px; margin-top: 13px; }
  button {
    appearance: none;
    border: 0;
    font: inherit;
    cursor: pointer;
  }
  button:focus-visible { outline: 2px solid #4d6bfe; outline-offset: 2px; }
  button:disabled { cursor: default; opacity: 0.55; }
  .primary, .secondary {
    min-height: 32px;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 12.5px;
    font-weight: 600;
  }
  .primary { color: #fff; background: #4d6bfe; }
  .primary:hover:not(:disabled) { background: #3e5de7; }
  /* Ghosted, so the accepted action is the only filled thing on the card. */
  .secondary {
    color: var(--dsw-alias-label-secondary, #666b73);
    background: transparent;
    border: 1px solid var(--dsw-alias-border-l2, rgba(32, 33, 36, 0.16));
  }
  .secondary:hover {
    color: var(--dsw-alias-label-primary, #202124);
    background: var(--dsw-alias-interactive-bg-hover, rgba(32, 33, 36, 0.06));
  }
  .close {
    width: 24px;
    height: 24px;
    margin: -4px -6px 0 0;
    flex: none;
    color: var(--dsw-alias-label-secondary, #73777f);
    background: transparent;
    border-radius: 7px;
    font-size: 20px;
    line-height: 20px;
  }
  .close:hover { color: var(--dsw-alias-label-primary, #202124); background: rgba(127, 127, 127, 0.1); }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-color-scheme: dark) {
    .card {
      color: var(--dsw-alias-label-primary, #f3f4f6);
      background: var(--dsw-alias-bg-layer-1, rgba(31, 32, 35, 0.98));
      border-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.14));
      box-shadow: 0 16px 42px rgba(0, 0, 0, 0.42), 0 2px 8px rgba(0, 0, 0, 0.25);
    }
    .description { color: var(--dsw-alias-label-secondary, #a9adb5); }
    .badge { color: #3fb950; background: rgba(63, 185, 80, 0.16); }
    .badge.warning { color: #e3b341; background: rgba(227, 179, 65, 0.18); }
    .secondary {
      color: var(--dsw-alias-label-secondary, #a9adb5);
      border-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.18));
    }
    .secondary:hover { color: var(--dsw-alias-label-primary, #f3f4f6); background: rgba(255, 255, 255, 0.08); }
  }
  @media (prefers-reduced-motion: reduce) {
    .spinner { animation: none; }
    .progressValue { transition: none; }
  }
`

const updateIcon = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><path d="M4.6 12a7.4 7.4 0 0 1 12.6-5.2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M19.4 12a7.4 7.4 0 0 1-12.6 5.2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M17.6 3.5v3.4h-3.4M6.4 20.5v-3.4h3.4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`

const phoneIcon = `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true"><rect x="7" y="2.75" width="10" height="18.5" rx="2.25" stroke="currentColor" stroke-width="1.7"/><path d="M10.2 5.5h3.6M10.5 18.35h3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`

const mobileButtonStyles = `
  [data-dsh-sidebar-settings] { position:relative; box-sizing:border-box; }
  [data-dsh-sidebar-root][data-dsh-sidebar-wide="true"] [data-dsh-sidebar-settings] { padding-right:38px; }
  #${MOBILE_BUTTON_ID} { appearance:none; position:relative; width:32px; height:32px; color:var(--dsw-alias-label-secondary,#73777f); background:transparent; border:0; border-radius:9px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; }
  [data-dsh-sidebar-root][data-dsh-sidebar-wide="true"] #${MOBILE_BUTTON_ID} { position:absolute; right:0; top:50%; transform:translateY(-50%); }
  [data-dsh-sidebar-root][data-dsh-sidebar-wide="false"] [data-dsh-sidebar-settings] { flex-direction:column; align-items:center; }
  [data-dsh-sidebar-root][data-dsh-sidebar-wide="false"] #${MOBILE_BUTTON_ID} { flex:none; margin-top:5px; }
  #${MOBILE_BUTTON_ID}:hover { color:var(--dsw-alias-label-primary,#202124); background:var(--dsw-alias-interactive-bg-hover,rgba(32,33,36,.08)); }
  #${MOBILE_BUTTON_ID}:focus-visible { outline:2px solid #4d6bfe; outline-offset:1px; }
  #${MOBILE_BUTTON_ID}[hidden] { display:none; }
  #${MOBILE_BUTTON_ID} > span { position:absolute; top:4px; right:4px; width:7px; height:7px; border:1.5px solid var(--dsw-specific-sidebar-fill,#fff); border-radius:50%; background:#4da66d; opacity:0; }
  #${MOBILE_BUTTON_ID}.is-connected > span { opacity:1; }
`

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
