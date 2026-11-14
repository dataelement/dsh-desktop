import { desktopLocale } from '../shared/desktop-locale'
import { updateText } from '../shared/desktop-update-messages'
import { renderUpdateNotes } from './update-notes-view'
import { popupReleaseNotes } from '../shared/update-release-notes'
import { ipcRenderer } from 'electron'
import type { AvailableRelease, UpdateStatus } from '../shared/contracts'
import {
  isUpdateDismissed,
  isNewManualPresentation,
  shouldShowUpdate,
  updateHeadline,
  comparePreloadVersions,
  rollbackReleases,
  rollbackEmptyMessage,
  presentedUpdateMessage,
  UPDATE_ACTION_FAILED,
  type UpdateLocale
} from './update-view'
import brandMark from '../../build/brand-mark.svg?raw'
const t = (key: Parameters<typeof updateText>[1], values: Readonly<Record<string, string | number>> = {}) => updateText(locale, key, values)
const ROOT_ID = 'dsh-desktop-update-root'
let locale: UpdateLocale = 'en'
let detailOpen = false
let previousFocus: HTMLElement | null = null
let host: HTMLDivElement | undefined
let content: HTMLDivElement | undefined
let currentStatus: UpdateStatus | undefined
let dismissedVersion: string | null = null
let dismissedPresentationId: number | undefined
let dismissedTransientPhase: UpdateStatus['phase'] | null = null
let installing = false
let accepting = false
let versionPickerOpen = false
let versionPickerLoading = false
let versionPickerError = false
let versionPickerList: AvailableRelease[] | null = null
let installingVersion: string | null = null

const ABOUT_ROOT_ID = 'dsh-desktop-about-root'
interface AboutInfo {
  desktopVersion: string
  harnessVersion?: string
  locale: UpdateLocale
}
let aboutHost: HTMLElement | null = null
let aboutShadow: ShadowRoot | null = null
let aboutOpen = false
let aboutInfo: AboutInfo | null = null
let receivedStatusEvent = false
let themeObserver: MutationObserver | undefined

// The host is attached to documentElement, outside the node that owns Harness
// tokens. Copy the resolved Desktop theme instead of following the OS scheme.
const THEME_PROPERTIES = [
  '--dsw-alias-label-primary',
  '--dsw-alias-label-secondary',
  '--dsw-alias-label-primary-inverted',
  '--dsw-alias-bg-layer-1',
  '--dsw-alias-bg-layer-2',
  '--dsw-alias-border-l2',
  '--dsw-alias-button-primary-fill',
  '--dsw-alias-button-primary-hover',
  '--dsw-alias-interactive-bg-hover'
] as const

function mount(): void {
  if (document.getElementById(ROOT_ID)) return

  host = document.createElement('div')
  host.id = ROOT_ID
  host.style.cssText = [
    'position:fixed',
    'pointer-events:none',
    'z-index:2147483646',
    'display:none',
    'width:min(520px,calc(100vw - 40px))',
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

// Retain snapshot request identity so later progress for that same historical
// request cannot reopen a manual dialog after a renderer or Harness restart.
function applyStatus(status: UpdateStatus, delivery: 'event' | 'snapshot' = 'event'): void {
  const statusLocale = desktopLocale(status.locale)
  if (statusLocale) locale = statusLocale
  // A fresh automatic check is a new presentation, not a continuation of an
  // earlier manual result or an update detail the user left open.
  if (!status.manual && status.phase === 'checking') detailOpen = false
  if (isNewManualPresentation(status, currentStatus, delivery)) {
    dismissedPresentationId = undefined
    dismissedVersion = null
    dismissedTransientPhase = null
    detailOpen = true
    closeAbout()
  }
  const failedActiveUpdate = delivery === 'event' && status.phase === 'error' &&
    (accepting || installing || currentStatus?.phase === 'downloading' || currentStatus?.phase === 'downloaded')
  if (failedActiveUpdate) {
    // A live failure is actionable even when the download was restored from a
    // snapshot or its progress card was dismissed. Historical errors stay quiet.
    dismissedPresentationId = undefined
    dismissedVersion = null
    dismissedTransientPhase = null
    detailOpen = true
    closeAbout()
  }
  if (status.phase === 'idle') detailOpen = false
  currentStatus = status
  if (host) {
    host.dataset.updatePhase = status.phase
    host.dataset.updateManual = String(status.manual)
  }
  if (status.phase === 'error') installing = false
  if (['error', 'downloading', 'downloaded', 'up-to-date'].includes(status.phase)) {
    installingVersion = null
  }
  if (status.phase !== 'available') accepting = false
  render()
}

function render(): void {
  if (!host || !content || !currentStatus) return

  if (
    (!shouldShowUpdate(currentStatus, detailOpen) && !(detailOpen && currentStatus.phase === 'error')) ||
    (currentStatus.manual && currentStatus.presentationId !== undefined && currentStatus.presentationId === dismissedPresentationId) ||
    isUpdateDismissed(currentStatus, dismissedVersion, dismissedTransientPhase)
  ) {
    host.style.display = 'none'
    host.removeAttribute('data-dsh-update-corner-visible')
    content.replaceChildren()
    return
  }

  host.style.display = 'block'
  const status = currentStatus
  const releaseNotes = popupReleaseNotes(status.releaseNotes, locale)
  const centered = detailOpen
  host.toggleAttribute('data-dsh-update-corner-visible', !centered)
  host.style.left = centered ? '50%' : 'auto'
  host.style.top = centered ? '50%' : 'auto'
  host.style.right = centered ? 'auto' : '20px'
  host.style.bottom = centered ? 'auto' : '20px'
  host.style.transform = centered ? 'translate(-50%, -50%)' : 'none'
  host.style.width = centered ? 'min(340px,calc(100vw - 40px))' : 'min(520px,calc(100vw - 40px))'
  const card = element('aside', centered ? 'card centered' : 'card notification')
  card.setAttribute('role', centered ? 'dialog' : 'status')
  if (centered) card.setAttribute('aria-modal', 'false')
  card.setAttribute('aria-live', 'polite')
  card.setAttribute('aria-label', t('updateLabel'))

  const row = element('div', 'row')
  const badge = appIcon()
  badge.setAttribute('aria-hidden', 'true')
  if (status.phase === 'checking') badge.appendChild(element('span', 'spinner'))
  row.appendChild(badge)

  const headline = updateHeadline(status, locale)
  const body = element('div', 'body')
  const title = element('p', 'title')
  title.textContent = status.phase === 'up-to-date' ? `DSH Desktop v${status.currentVersion}` : headline.title
  body.appendChild(title)
  row.appendChild(body)

  // The failure's own words beat ours, when it has any.
  const description = element('p', 'description')
  const failureText = presentedUpdateMessage(status.message, locale)
  description.textContent =
    status.phase === 'error' && failureText ? failureText : status.phase === 'up-to-date' ? (t('latest')) : !centered && status.phase === 'available' ? (releaseNotes?.split('\n').find(line => line.trim()) || headline.description) : headline.description
  if (description.textContent) body.appendChild(description)

  if (centered && status.phase === 'available') {
    const label = element('p', 'notes-label')
    label.textContent = t('notes')
    const notes = element('div', 'release-notes')
    notes.tabIndex = 0
    notes.setAttribute('role', 'region')
    notes.setAttribute('aria-label', label.textContent)
    renderUpdateNotes(notes, releaseNotes || (t('noNotes')))
    body.append(label, notes)
  }
  if (!centered && status.phase === 'available') {
    const details = button(t('details'), 'details')
    details.addEventListener('click', () => { detailOpen = true; render() })
    body.appendChild(details)
  }
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
    const accept = button(t('update'), 'primary')
    accept.disabled = accepting
    accept.addEventListener('click', () => {
      accepting = true
      render()
      void ipcRenderer.invoke('updates:download').catch((error: unknown) => {
        accepting = false
        showActionError(error)
        console.error('[updater] unable to download update', error)
        render()
      })
    })
    if (!centered) actions.appendChild(skipButton(status))
    actions.appendChild(accept)
    if (centered) body.appendChild(actions)
    else row.appendChild(actions)
  }

  if (status.phase === 'downloading') {
    const actions = element('div', 'actions')
    if (!centered) actions.appendChild(skipButton(status))
    if (centered) body.appendChild(actions)
    else row.appendChild(actions)
  }

  if (status.phase === 'downloaded') {
    const actions = element('div', 'actions')
    const install = button(
      t(installing ? 'restarting' : 'install'),
      'primary'
    )
    install.disabled = installing
    install.addEventListener('click', () => {
      installing = true
      render()
      void ipcRenderer.invoke('updates:install').catch((error: unknown) => {
        installing = false
        showActionError(error)
        console.error('[updater] unable to install update', error)
        render()
      })
    })
    actions.appendChild(install)
    if (!centered) actions.appendChild(skipButton(status))
    if (centered) body.appendChild(actions)
    else row.appendChild(actions)
  }

  if (centered && ['up-to-date', 'error', 'unsupported'].includes(status.phase)) {
    const confirm = button(t('ok'), 'primary confirm')
    confirm.addEventListener('click', dismissCurrent)
    if (status.phase === 'error') {
      const retry = button(t('retry'), 'primary confirm')
      retry.addEventListener('click', () => { void ipcRenderer.invoke('updates:check').catch((error: unknown) => console.error('[updater] unable to retry update', error)) })
      body.appendChild(retry)
    }
    body.appendChild(confirm)
  }
  if (centered && status.availableVersion) {
    const current = element('p', 'current-version')
    current.textContent = t('current', { version: status.currentVersion })
    body.appendChild(current)
  }
  card.appendChild(row)
  if (centered) card.appendChild(closeButton(t('close'), dismissCurrent))
  const wasVisible = content.childElementCount > 0
  const root = content.getRootNode()
  const focused = root instanceof ShadowRoot ? root.activeElement : null
  const focusedInside = focused instanceof HTMLElement && content.contains(focused)
  const focusedButtonClass = focused instanceof HTMLElement && focused.tagName === 'BUTTON' && !focused.classList.contains('dialog-close')
    ? focused.className
    : ''
  content.replaceChildren(card)
  if (focusedButtonClass) {
    Array.from(card.querySelectorAll<HTMLButtonElement>('button')).find(node => node.className === focusedButtonClass)?.focus()
  } else if (centered && (!wasVisible || focusedInside)) {
    if (!wasVisible) previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    focusDialog(card)
  }
}

/** Remember ignored releases; manual checks may offer them again. */
function skipButton(status: UpdateStatus): HTMLButtonElement {
  const skip = button(t('ignore'), 'secondary')
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

function loadVersionList(onDone?: () => void): void {
  versionPickerLoading = true
  versionPickerError = false
  if (onDone) onDone()
  void ipcRenderer
    .invoke('updates:list-versions')
    .then((releases: AvailableRelease[]) => {
      versionPickerList = Array.isArray(releases) ? releases : []
    })
    .catch((error: unknown) => {
      console.error('[updater] unable to list versions', error)
      versionPickerError = true
      versionPickerList = null
    })
    .finally(() => {
      versionPickerLoading = false
      if (onDone) onDone()
    })
}

function mountAbout(): void {
  if (document.getElementById(ABOUT_ROOT_ID)) return

  aboutHost = document.createElement('div')
  aboutHost.id = ABOUT_ROOT_ID
  aboutHost.style.cssText = [
    'position:fixed',
    'left:50%',
    'top:50%',
    'transform:translate(-50%,-50%)',
    'width:min(340px,calc(100vw - 40px))',
    'z-index:2147483647',
    'display:none',
    'align-items:center',
    'justify-content:center',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'
  ].join(';')

  aboutShadow = aboutHost.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = aboutStyles
  aboutShadow.appendChild(style)
  document.documentElement.appendChild(aboutHost)
  renderAbout()
}

function renderAbout(): void {
  if (!aboutHost || !aboutShadow) return
  if (!aboutOpen || !aboutInfo) {
    aboutHost.style.display = 'none'
    const existing = aboutShadow.querySelector('.about-overlay')
    if (existing) existing.remove()
    return
  }

  aboutHost.style.display = 'flex'
  const info = aboutInfo
  const a = (key: Parameters<typeof updateText>[1]) => updateText(info.locale, key)
  const currentVer = info.desktopVersion

  let overlay = aboutShadow.querySelector('.about-overlay') as HTMLElement | null
  if (!overlay) {
    overlay = element('div', 'about-overlay')
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        aboutOpen = false
        versionPickerOpen = false
        renderAbout()
      }
    })
    aboutShadow.appendChild(overlay)
  }

  const card = element('div', 'about-card')
  card.tabIndex = -1
  card.setAttribute('role', 'dialog')
  card.setAttribute('aria-modal', 'false')
  card.setAttribute('aria-label', a('about'))

  const header = element('div', 'about-header')
  header.appendChild(appIcon())
  header.appendChild(closeButton(a('close'), closeAbout))
  const switcher = element('div', 'switcher')
  const selectVersionBtn = button(a('switchVersion'), 'version-switch')
  const switchIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  switchIcon.setAttribute('viewBox', '0 0 24 24')
  switchIcon.setAttribute('aria-hidden', 'true')
  switchIcon.setAttribute('focusable', 'false')
  switchIcon.classList.add('version-switch-icon')
  const switchArrows = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  switchArrows.setAttribute('d', 'M3 8h18l-6-6M21 16H3l6 6')
  switchIcon.appendChild(switchArrows)
  selectVersionBtn.prepend(switchIcon)
  selectVersionBtn.setAttribute('aria-expanded', String(versionPickerOpen))
  selectVersionBtn.setAttribute('aria-controls', 'desktop-version-list')
  selectVersionBtn.addEventListener('click', () => {
    versionPickerOpen = !versionPickerOpen
    if (versionPickerOpen && versionPickerList === null && !versionPickerLoading) loadVersionList(renderAbout)
    renderAbout()
    aboutShadow?.querySelector<HTMLButtonElement>('.version-switch')?.focus()
  })
  switcher.appendChild(selectVersionBtn)
  header.appendChild(switcher)
  card.appendChild(header)
  const title = element('h2', 'about-title')
  title.textContent = 'DSH Desktop'
  card.appendChild(title)
  const version = element('p', 'about-line')
  version.textContent = `v${info.desktopVersion} (${a('bundled')} Harness ${info.harnessVersion ?? a('unknown')}`
  const hint = button('', 'info')
  hint.innerHTML = '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7" stroke="currentColor"/><path d="M10 9v5M10 6v1" stroke="currentColor" stroke-width="1.5"/></svg>'
  hint.setAttribute('aria-label', a('harnessHint'))
  const tooltip = element('span', 'tooltip')
  tooltip.id = 'harness-version-hint'
  tooltip.setAttribute('role', 'tooltip')
  tooltip.textContent = a('harnessUpdated')
  hint.setAttribute('aria-describedby', tooltip.id)
  hint.appendChild(tooltip)
  version.append(hint, document.createTextNode(')'))
  card.appendChild(version)
  const confirm = button(a('ok'), 'primary confirm')
  confirm.addEventListener('click', closeAbout)
  card.appendChild(confirm)
  // Version picker inside About dialog
  if (versionPickerOpen) {
    const pickerContainer = element('div', 'version-picker-container')
    pickerContainer.id = 'desktop-version-list'
    if (versionPickerLoading) {
      const line = element('p', 'version-status-text')
      line.textContent = a('loadingVersions')
      pickerContainer.appendChild(line)
    } else if (versionPickerError) {
      const line = element('p', 'version-status-text')
      line.textContent = a('versionsError')
      pickerContainer.appendChild(line)
    } else {
      const older = rollbackReleases(versionPickerList || [], currentVer)
      if (older.length > 0) {
        appendAboutVersionGroup(pickerContainer, a('rollback'), older, currentVer, info.locale)
      } else {
        const line = element('p', 'version-status-text')
        line.textContent = rollbackEmptyMessage(info.locale)
        pickerContainer.appendChild(line)
      }
    }
    switcher.appendChild(pickerContainer)
  }

  const firstOpen = !overlay.childElementCount
  overlay.replaceChildren(card)
  // Initial focus enters the panel without drawing a button focus ring; Tab
  // still reaches its controls and preserves their keyboard-visible outline.
  if (firstOpen) card.focus()
}

function appendAboutVersionGroup(
  container: HTMLElement,
  heading: string,
  releases: AvailableRelease[],
  currentVersion: string,
  selectedLocale: UpdateLocale
): void {
  if (releases.length === 0) return
  const group = element('div', 'version-group')
  const label = element('p', 'version-group-title')
  label.textContent = heading
  group.appendChild(label)

  const buttonsRow = element('div', 'version-buttons')
  for (const release of releases.slice(0, 12)) {
    const pick = button(`v${release.version}`, 'version-tag-btn')
    pick.disabled = installingVersion !== null
    pick.addEventListener('click', () => {
      selectVersionFromAbout(release, currentVersion, selectedLocale)
    })
    buttonsRow.appendChild(pick)
  }
  group.appendChild(buttonsRow)
  container.appendChild(group)
}

function selectVersionFromAbout(release: AvailableRelease, currentVersion: string, selectedLocale: UpdateLocale): void {
  if (comparePreloadVersions(release.version, currentVersion) >= 0) return
  const message = updateText(selectedLocale, 'downgradeConfirm', { version: release.version, current: currentVersion })
  if (!window.confirm(message)) return

  installingVersion = release.version
  aboutOpen = false
  versionPickerOpen = false
  renderAbout()
  void ipcRenderer.invoke('updates:install-version', release.version).catch((error: unknown) => {
    installingVersion = null
    showActionError(error)
    console.error('[updater] unable to install version', error)
  })
}

function dismissCurrent(): void {
  if (!currentStatus || installing || accepting) return
  detailOpen = false
  dismissedPresentationId = currentStatus.presentationId
  previousFocus?.focus()
  if (currentStatus.availableVersion) {
    dismissedVersion = currentStatus.availableVersion
  } else {
    dismissedTransientPhase = currentStatus.phase
  }
  render()
}

function showActionError(error: unknown): void {
  if (!currentStatus) return
  detailOpen = true
  applyStatus({ ...currentStatus, phase: 'error', message: error instanceof Error ? error.message : UPDATE_ACTION_FAILED })
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

function focusDialog(card: HTMLElement): void {
  // Initial focus enters the panel without drawing a button focus ring; Tab
  // still reaches its controls and preserves their keyboard-visible outline.
  card.tabIndex = -1
  card.focus()
}

function closeButton(label: string, onClick: () => void): HTMLButtonElement {
  const node = button('×', 'dialog-close')
  node.setAttribute('aria-label', label)
  node.addEventListener('click', event => {
    event.stopPropagation()
    onClick()
  })
  return node
}

const styles = `
  :host { color-scheme: light; }
  * { box-sizing: border-box; }
  .card, .about-card { position:relative; pointer-events:auto; width:100%; color:var(--dsw-alias-label-primary,#202124); background:var(--dsw-alias-bg-layer-1,#fff); border:1px solid var(--dsw-alias-border-l2,#e5e7eb); border-radius:16px; padding:24px; box-shadow:0 8px 24px rgba(0,0,0,.12); max-height:calc(100vh - 48px); overflow:auto; overflow-wrap:anywhere; }
  .row { display:flex; gap:12px; align-items:center; }
  .body { min-width:0; flex:1; }
  .centered .row { display:block; }
  .app-icon { display:inline-flex; width:56px; height:56px; padding:6px; background:#0d1716; color:#fff; border-radius:12px; flex:none; position:relative; }
  .app-icon svg { width:100%; height:100%; }
  .app-icon svg path { fill:currentColor; }
  .notification { padding:16px; }
  .notification .app-icon { width:40px; height:40px; border-radius:9px; }
  .title,.about-title { margin:16px 0 8px; font-size:18px; line-height:26px; font-weight:600; }
  .notification .title { margin:0; font-size:14px; line-height:20px; }
  .description,.about-line,.release-notes,.notes-label,.current-version { margin:8px 0; font-size:13px; line-height:20px; color:var(--dsw-alias-label-secondary,#666b73); }
  .release-notes { max-height:min(280px,35vh); overflow:auto; overflow-wrap:anywhere; padding-right:4px; overscroll-behavior:contain; }
  .release-notes p { margin:0 0 8px; white-space:pre-wrap; }
  .release-notes h3 { margin:16px 0 8px; font-size:13px; color:var(--dsw-alias-label-primary,inherit); }
  .release-notes ul,.release-notes ol { margin:8px 0 12px; padding-left:22px; }
  .release-notes li { margin:5px 0; padding-left:2px; }
  .release-notes code { font-size:12px; padding:1px 4px; border-radius:4px; background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12)); }
  .release-notes > :first-child { margin-top:0; }
  .release-notes > :last-child { margin-bottom:0; }
  .card,.release-notes,.version-picker-container { scrollbar-width:thin; scrollbar-color:var(--dsw-alias-border-l2,#b4b7be) transparent; }
  :is(.card,.release-notes,.version-picker-container)::-webkit-scrollbar { width:6px; height:6px; }
  :is(.card,.release-notes,.version-picker-container)::-webkit-scrollbar-track { background:transparent; }
  :is(.card,.release-notes,.version-picker-container)::-webkit-scrollbar-thumb { background:var(--dsw-alias-border-l2,#b4b7be); border-radius:999px; }
  :is(.card,.release-notes,.version-picker-container)::-webkit-scrollbar-thumb:hover { background:var(--dsw-alias-label-secondary,#888d96); }
  /* Hide only the visual scrollbar; preserve wheel, touch and keyboard scrolling. */
  .release-notes { scrollbar-width:none; }
  .release-notes::-webkit-scrollbar { display:none; width:0; height:0; }
  .release-notes:focus-visible { outline:2px solid var(--dsw-alias-label-secondary,#888d96); outline-offset:3px; border-radius:4px; }
  .notes-label { margin-top:24px; }
  .current-version { text-align:center; font-size:12px; margin:14px 0 0; }
  button { appearance:none; border:0; font:inherit; cursor:pointer; border-radius:6px; min-height:32px; }
  button:focus-visible { outline:2px solid var(--dsw-alias-label-primary,#202124); outline-offset:3px; }
  button:disabled { cursor:default; opacity:.55; }
  .primary { background:var(--dsw-alias-button-primary-fill,#000); color:var(--dsw-alias-label-primary-inverted,#fff); font-size:14px; padding:8px 16px; }
  .primary:hover:not(:disabled) { background:var(--dsw-alias-button-primary-hover,#34363b); }
  .secondary,.details,.version-switch { color:var(--dsw-alias-label-secondary,#666b73); background:transparent; padding:4px 8px; font-size:13px; }
  .details { color:var(--dsw-alias-label-primary,#202124); padding-left:0; text-decoration:underline; text-underline-offset:3px; }
  .version-switch { display:inline-flex; align-items:center; gap:8px; }
  .version-switch-icon { width:18px; height:18px; flex:none; fill:none; stroke:currentColor; stroke-width:1.6; stroke-linecap:round; stroke-linejoin:round; }
  .secondary:hover,.details:hover,.version-switch:hover { background:var(--dsw-alias-interactive-bg-hover,#f0f2f5); }
  .actions { display:flex; gap:8px; margin-top:16px; }
  .centered .primary,.confirm { width:100%; }
  .confirm { margin-top:24px; }
  .notification .actions { margin:0; flex:none; align-items:center; }
  .notification .description { display:inline; font-size:12px; }
  .notification .details { display:inline; min-height:24px; font-size:12px; margin-left:4px; }
  .notification .body { overflow-wrap:anywhere; }
  .about-overlay { width:100%; }
  .about-card { overflow:visible; }
  .card:focus, .about-card:focus { outline:none; }
  @media (max-width:440px) { .notification .row { flex-wrap:wrap; } .notification .actions { margin-left:auto; } }
  .dialog-close { position:absolute; top:12px; right:12px; z-index:1; display:grid; place-items:center; width:28px; height:28px; min-height:28px; padding:0; background:transparent; color:var(--dsw-alias-label-secondary,#666b73); font-size:18px; line-height:1; }
  .dialog-close:hover:not(:disabled) { background:var(--dsw-alias-interactive-bg-hover,#f0f2f5); }
  .dialog-close:focus, .dialog-close:focus-visible { outline:none; }
  .about-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; padding-right:36px; }
  .about-line { display:flex; align-items:center; flex-wrap:wrap; gap:3px; }
  .info { position:relative; background:transparent; padding:0 0 0 3px; margin-right:-3px; color:inherit; min-height:24px; }
  .tooltip { display:none; position:absolute; right:0; bottom:100%; width:220px; padding:8px 12px; font-size:12px; line-height:18px; background:var(--dsw-alias-bg-layer-2,#f0f2f5); color:var(--dsw-alias-label-primary,#202124); border-radius:8px; box-shadow:0 3px 12px rgba(0,0,0,.12); }
  .info:hover .tooltip,.info:focus .tooltip { display:block; }
  .switcher { position:relative; }
  .version-picker-container { position:absolute; right:0; top:100%; width:190px; max-height:min(180px,calc(100vh - 130px)); overflow:auto; padding:8px; background:var(--dsw-alias-bg-layer-1,#fff); color:var(--dsw-alias-label-primary,#202124); border:1px solid var(--dsw-alias-border-l2,#e5e7eb); border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,.12); z-index:1; }
  .version-group-title,.version-status-text { margin:6px; font-size:12px; line-height:18px; color:var(--dsw-alias-label-secondary,#666b73); }
  .version-tag-btn { display:block; width:100%; padding:6px 8px; text-align:left; background:transparent; color:inherit; font-size:13px; }
  .version-tag-btn:hover { background:var(--dsw-alias-interactive-bg-hover,#f0f2f5); }
  .progress { height:5px; background:var(--dsw-alias-bg-layer-2,#e5e7eb); border-radius:4px; overflow:hidden; margin:12px 0; }
  .progressValue { height:100%; background:var(--dsw-alias-button-primary-fill,#000); }
  .spinner { position:absolute; inset:16px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin .75s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  :host([data-dsh-theme="dark"]) :is(.card,.about-card,.version-picker-container) { background:var(--dsw-alias-bg-layer-1,#1f2023); color:var(--dsw-alias-label-primary,#f3f4f6); border-color:var(--dsw-alias-border-l2,#41434a); }
  :host([data-dsh-theme="dark"]) :is(.description,.about-line,.release-notes,.notes-label,.current-version,.secondary,.version-switch,.version-group-title,.version-status-text) { color:var(--dsw-alias-label-secondary,#a9adb5); }
  :host([data-dsh-theme="dark"]) .tooltip { background:var(--dsw-alias-bg-layer-2,#34363b); color:var(--dsw-alias-label-primary,#f3f4f6); }
  :host([data-dsh-theme="dark"]) .primary { background:var(--dsw-alias-button-primary-fill,#f9fafb); color:var(--dsw-alias-label-primary-inverted,#191b1f); }
  :host([data-dsh-theme="dark"]) .primary:hover:not(:disabled) { background:var(--dsw-alias-button-primary-hover,#e6e8eb); }
  :host([data-dsh-theme="dark"]) button:focus-visible { outline-color:var(--dsw-alias-label-primary,#f3f4f6); }
  :host([data-dsh-theme="dark"]) .details { color:var(--dsw-alias-label-primary,#f3f4f6); }
  :host([data-dsh-theme="dark"]) :is(.secondary,.details,.version-switch,.version-tag-btn,.dialog-close):hover { background:var(--dsw-alias-interactive-bg-hover,rgba(255, 255, 255, .12)); }
  :host([data-dsh-theme="dark"]) .progress { background:var(--dsw-alias-bg-layer-2,#34363b); }
  :host([data-dsh-theme="dark"]) .progressValue { background:var(--dsw-alias-button-primary-fill,#f9fafb); }
  @media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
`
const aboutStyles = styles

function appIcon(): HTMLSpanElement {
  const icon = element('span', 'app-icon')
  icon.setAttribute('aria-hidden', 'true')
  // Trusted, bundled branding; release text is always assigned with textContent.
  icon.innerHTML = brandMark
  return icon
}

function onUpdateStatus(_event: Electron.IpcRendererEvent, status: UpdateStatus): void {
  receivedStatusEvent = true
  applyStatus(status)
}

function onShowAbout(_event: Electron.IpcRendererEvent, info: AboutInfo): void {
  locale = desktopLocale(info.locale) ?? locale
  if (detailOpen) dismissCurrent()
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  aboutInfo = { ...info, locale }
  aboutOpen = true
  versionPickerOpen = false
  renderAbout()
}

function onUiLocale(_event: Electron.IpcRendererEvent, next: unknown): void {
  const resolved = desktopLocale(next)
  if (!resolved) return
  locale = resolved
  if (currentStatus) currentStatus = { ...currentStatus, locale: resolved }
  if (aboutInfo) aboutInfo = { ...aboutInfo, locale: resolved }
  render()
  renderAbout()
}
ipcRenderer.on('updates:status-changed', onUpdateStatus)
ipcRenderer.on('desktop:show-about', onShowAbout)
ipcRenderer.on('desktop:ui-locale', onUiLocale)

function closeAbout(): void {
  aboutOpen = false
  versionPickerOpen = false
  renderAbout()
  previousFocus?.focus()
}

function onOutsidePointer(event: PointerEvent): void {
  const path = event.composedPath()
  if (aboutOpen && aboutHost && !path.includes(aboutHost)) closeAbout()
  if (detailOpen && host && host.style.display !== 'none' && currentStatus && !path.includes(host)) dismissCurrent()
}
function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  if (aboutOpen) closeAbout()
  else dismissCurrent()
}
window.addEventListener('pointerdown', onOutsidePointer)
window.addEventListener('keydown', onKeydown)

function themeHosts(): HTMLElement[] {
  const nodes: HTMLElement[] = []
  if (host) nodes.push(host)
  if (aboutHost) nodes.push(aboutHost)
  return nodes
}

function syncDesktopTheme(): void {
  const body = document.body
  const theme = body?.hasAttribute('data-ds-dark-theme') ? 'dark' : 'light'
  const view = document.defaultView
  const computed = body && view ? view.getComputedStyle(body) : null
  // Alias tokens on body point at --dsw-static-* on the same element. The host
  // is not inside body, so copy the used color instead of the var() reference.
  const probe = body ? document.createElement('span') : null
  if (body && probe) {
    probe.setAttribute('aria-hidden', 'true')
    probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none'
    body.appendChild(probe)
  }
  try {
    for (const node of themeHosts()) {
      node.dataset.dshTheme = theme
      node.style.setProperty('color-scheme', theme)
      for (const property of THEME_PROPERTIES) {
        const specified = computed?.getPropertyValue(property).trim() ?? ''
        if (!specified) {
          node.style.removeProperty(property)
          continue
        }
        if (probe && view) probe.style.setProperty('background-color', `var(${property})`)
        const resolved = probe && view ? view.getComputedStyle(probe).backgroundColor.trim() : ''
        node.style.setProperty(property, resolved && !resolved.startsWith('var(') ? resolved : specified)
      }
    }
  } finally {
    probe?.remove()
  }
}

function watchDesktopTheme(): void {
  themeObserver?.disconnect()
  themeObserver = undefined
  syncDesktopTheme()
  const body = document.body
  const Observer = document.defaultView?.MutationObserver
  if (!body || !Observer) return
  themeObserver = new Observer(() => syncDesktopTheme())
  themeObserver.observe(body, {
    attributes: true,
    attributeFilter: ['data-ds-dark-theme', 'class', 'style']
  })
}

function stopDesktopThemeWatch(): void {
  themeObserver?.disconnect()
  themeObserver = undefined
}

window.addEventListener('unload', () => {
  stopDesktopThemeWatch()
  window.removeEventListener('pointerdown', onOutsidePointer)
  window.removeEventListener('keydown', onKeydown)
  ipcRenderer.removeListener('updates:status-changed', onUpdateStatus)
  ipcRenderer.removeListener('desktop:show-about', onShowAbout)
  ipcRenderer.removeListener('desktop:ui-locale', onUiLocale)
}, { once: true })

void ipcRenderer
  .invoke('updates:status')
  .then((status: UpdateStatus) => {
    if (!receivedStatusEvent) applyStatus(status, 'snapshot')
  })
  .catch((error: unknown) => console.warn('[updater] unable to read update status', error))


export function mountDesktopUpdateUi(): void {
  mount()
  mountAbout()
  watchDesktopTheme()
}
