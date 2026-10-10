import { ipcRenderer } from 'electron'
import type { AvailableRelease, UpdateStatus } from '../shared/contracts'
import { isUpdateDismissed, isNewManualPresentation, shouldShowUpdate, updateHeadline, type UpdateLocale } from './update-view'
import brandMark from '../../build/brand-mark.svg?raw'
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
  harnessVersion: string
  locale: 'en' | 'zh'
}
let aboutHost: HTMLElement | null = null
let aboutShadow: ShadowRoot | null = null
let aboutOpen = false
let aboutInfo: AboutInfo | null = null
let receivedStatusEvent = false

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

function applyStatus(status: UpdateStatus): void {
  if (status.locale) locale = status.locale
  if (isNewManualPresentation(status, currentStatus)) {
    dismissedPresentationId = undefined
    dismissedVersion = null
    dismissedTransientPhase = null
    detailOpen = true
  } else if (status.source === 'startup' && status.phase === 'available') detailOpen = true
  if (status.phase === 'error' && (accepting || installing || currentStatus && ['downloading', 'downloaded'].includes(currentStatus.phase))) detailOpen = true
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
    (!shouldShowUpdate(currentStatus) && !(detailOpen && currentStatus.phase === 'error')) ||
    (currentStatus.manual && currentStatus.presentationId !== undefined && currentStatus.presentationId === dismissedPresentationId) ||
    isUpdateDismissed(currentStatus, dismissedVersion, dismissedTransientPhase)
  ) {
    host.style.display = 'none'
    content.replaceChildren()
    return
  }

  host.style.display = 'block'
  const status = currentStatus
  const centered = detailOpen || status.manual || status.source === 'startup'
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
  card.setAttribute('aria-label', locale === 'zh' ? 'DSH Desktop 更新' : 'DSH Desktop update')

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
  description.textContent =
    status.phase === 'error' && status.message ? status.message : status.phase === 'up-to-date' ? (locale === 'zh' ? '当前已是最新版本' : 'You’re on the latest version') : !centered && status.phase === 'available' ? (status.releaseNotes?.split('\n').find(line => line.trim()) || headline.description) : headline.description
  if (description.textContent) body.appendChild(description)

  if (centered && status.phase === 'available') {
    const label = element('p', 'notes-label')
    label.textContent = locale === 'zh' ? '更新日志' : 'What’s new'
    const notes = element('p', 'release-notes')
    notes.textContent = status.releaseNotes || (locale === 'zh' ? '此版本暂无更新日志。' : 'No release notes for this version.')
    body.append(label, notes)
  }
  if (!centered && status.phase === 'available') {
    const details = button(locale === 'zh' ? '查看详情' : 'View details', 'details')
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
    const accept = button(locale === 'zh' ? '更新' : 'Update', 'primary')
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
    const confirm = button(locale === 'zh' ? '确定' : 'OK', 'primary confirm')
    confirm.addEventListener('click', dismissCurrent)
    if (status.phase === 'error') {
      const retry = button(locale === 'zh' ? '重试' : 'Retry', 'primary confirm')
      retry.addEventListener('click', () => { void ipcRenderer.invoke('updates:check').catch((error: unknown) => console.error('[updater] unable to retry update', error)) })
      body.appendChild(retry)
    }
    body.appendChild(confirm)
  }
  if (centered && status.availableVersion) {
    const current = element('p', 'current-version')
    current.textContent = locale === 'zh' ? `当前版本 v${status.currentVersion}` : `Current version v${status.currentVersion}`
    body.appendChild(current)
  }
  card.appendChild(row)
  const wasVisible = content.childElementCount > 0
  const root = content.getRootNode()
  const focused = root instanceof ShadowRoot ? root.activeElement : null
  const focusedClass = focused instanceof HTMLElement ? focused.className : ''
  content.replaceChildren(card)
  if (focusedClass) Array.from(card.querySelectorAll<HTMLButtonElement>('button')).find(node => node.className === focusedClass)?.focus()
  else if (centered && !wasVisible) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    card.tabIndex = -1
    const focusTarget = card.querySelector<HTMLButtonElement>('button') || card
    focusTarget.focus()
  }
}

/** Remember ignored releases; manual checks may offer them again. */
function skipButton(status: UpdateStatus): HTMLButtonElement {
  const skip = button(locale === 'zh' ? '忽略' : 'Ignore', 'secondary')
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

/** Compare two dotted versions; prerelease sorts below its release. Mirrors
 * `version-catalog.compareVersions` — a small duplication across the
 * main/preload boundary, kept local so the preload bundle stays standalone.
 * Keep the two implementations in lockstep, including the semver-style
 * numeric prerelease comparison below ("rc.10" > "rc.9"). */
function comparePreloadVersions(a: string, b: string): number {
  const parse = (value: string): [number[], string] => {
    const [core = '', ...pre] = value.trim().split('-')
    const nums = core.split('.').map((part) => Number.parseInt(part, 10) || 0)
    while (nums.length < 3) nums.push(0)
    return [nums, pre.join('-')]
  }
  const [an, ap] = parse(a)
  const [bn, bp] = parse(b)
  for (let i = 0; i < 3; i += 1) {
    if ((an[i] ?? 0) !== (bn[i] ?? 0)) return (an[i] ?? 0) - (bn[i] ?? 0)
  }
  return comparePrerelease(ap, bp)
}

function comparePrerelease(left: string, right: string): number {
  if (left === right) return 0
  if (!left) return 1
  if (!right) return -1
  const l = left.split('.')
  const r = right.split('.')
  const length = Math.max(l.length, r.length)
  for (let i = 0; i < length; i += 1) {
    const x = l[i]
    const y = r[i]
    if (x === undefined) return -1
    if (y === undefined) return 1
    if (x === y) continue
    const xn = /^\d+$/.test(x)
    const yn = /^\d+$/.test(y)
    if (xn && yn) {
      const nx = x.replace(/^0+/, '') || '0'
      const ny = y.replace(/^0+/, '') || '0'
      if (nx.length !== ny.length) return nx.length < ny.length ? -1 : 1
      if (nx !== ny) return nx < ny ? -1 : 1
      continue
    }
    if (xn) return -1
    if (yn) return 1
    if (x < y) return -1
    if (x > y) return 1
  }
  return 0
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
  const zh = info.locale === 'zh'
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
  card.setAttribute('role', 'dialog')
  card.setAttribute('aria-modal', 'false')
  card.setAttribute('aria-label', zh ? '关于 DSH Desktop' : 'About DSH Desktop')

  const header = element('div', 'about-header')
  header.appendChild(appIcon())
  const switcher = element('div', 'switcher')
  const selectVersionBtn = button(zh ? '版本切换' : 'Switch version', 'version-switch')
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
  version.textContent = `v${info.desktopVersion} (${zh ? '内置' : 'bundled'} Harness ${info.harnessVersion} `
  const hint = button('', 'info')
  hint.innerHTML = '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7" stroke="currentColor"/><path d="M10 9v5M10 6v1" stroke="currentColor" stroke-width="1.5"/></svg>'
  hint.setAttribute('aria-label', zh ? 'Harness 版本说明' : 'About the Harness version')
  const tooltip = element('span', 'tooltip')
  tooltip.id = 'harness-version-hint'
  tooltip.setAttribute('role', 'tooltip')
  tooltip.textContent = zh ? 'Harness 随 DSH Desktop 更新。' : 'Harness is updated with DSH Desktop.'
  hint.setAttribute('aria-describedby', tooltip.id)
  hint.appendChild(tooltip)
  version.append(hint, document.createTextNode(')'))
  card.appendChild(version)
  const confirm = button(zh ? '确定' : 'OK', 'primary confirm')
  confirm.addEventListener('click', closeAbout)
  card.appendChild(confirm)
  // Version picker inside About dialog
  if (versionPickerOpen) {
    const pickerContainer = element('div', 'version-picker-container')
    pickerContainer.id = 'desktop-version-list'
    if (versionPickerLoading) {
      const line = element('p', 'version-status-text')
      line.textContent = zh ? '正在获取版本列表…' : 'Loading versions…'
      pickerContainer.appendChild(line)
    } else if (versionPickerError) {
      const line = element('p', 'version-status-text')
      line.textContent = zh ? '暂时无法获取版本列表' : 'Unable to load version list'
      pickerContainer.appendChild(line)
    } else if (versionPickerList && versionPickerList.length > 0) {
      const newer = versionPickerList.filter(
        (release) => comparePreloadVersions(release.version, currentVer) > 0
      )
      const older = versionPickerList.filter(
        (release) => comparePreloadVersions(release.version, currentVer) < 0
      )
      appendAboutVersionGroup(pickerContainer, zh ? '较新版本' : 'Newer versions', newer, currentVer, zh)
      appendAboutVersionGroup(pickerContainer, zh ? '历史版本（回退）' : 'Roll back', older, currentVer, zh)
    } else {
      const line = element('p', 'version-status-text')
      line.textContent = zh ? '没有可选的其它版本' : 'No other versions available'
      pickerContainer.appendChild(line)
    }
    switcher.appendChild(pickerContainer)
  }

  const firstOpen = !overlay.childElementCount
  overlay.replaceChildren(card)
  if (firstOpen) confirm.focus()
}

function appendAboutVersionGroup(
  container: HTMLElement,
  heading: string,
  releases: AvailableRelease[],
  currentVersion: string,
  zh: boolean
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
      selectVersionFromAbout(release, currentVersion, zh)
    })
    buttonsRow.appendChild(pick)
  }
  group.appendChild(buttonsRow)
  container.appendChild(group)
}

function selectVersionFromAbout(release: AvailableRelease, currentVersion: string, zh: boolean): void {
  const downgrade = comparePreloadVersions(release.version, currentVersion) < 0
  const message = downgrade
    ? zh
      ? `将降级到 ${release.version}（当前 ${currentVersion}）。降级不会迁移新版本写入的数据，可能导致配置不兼容。确定继续？`
      : `This downgrades to ${release.version} (currently ${currentVersion}). A downgrade does not migrate data written by newer versions and may be config-incompatible. Continue?`
    : zh
      ? `将安装 ${release.version}，确定继续？`
      : `Install ${release.version}?`
  if (!window.confirm(message)) return

  installingVersion = release.version
  aboutOpen = false
  versionPickerOpen = false
  renderAbout()
  void ipcRenderer.invoke('updates:install-version', release.version).catch((error: unknown) => {
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
  applyStatus({ ...currentStatus, phase: 'error', message: error instanceof Error ? error.message : (locale === 'zh' ? '操作失败，请重试。' : 'The update action failed. Please try again.') })
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
  .card, .about-card { pointer-events:auto; width:100%; color:var(--dsw-alias-label-primary,#202124); background:var(--dsw-alias-bg-layer-1,#fff); border:1px solid var(--dsw-alias-border-l2,#e5e7eb); border-radius:16px; padding:24px; box-shadow:0 8px 24px rgba(0,0,0,.12); max-height:calc(100vh - 48px); overflow:auto; overflow-wrap:anywhere; }
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
  .release-notes { white-space:pre-wrap; max-height:180px; overflow:auto; }
  .notes-label { margin-top:24px; }
  .current-version { text-align:center; font-size:12px; margin:14px 0 0; }
  button { appearance:none; border:0; font:inherit; cursor:pointer; border-radius:6px; min-height:32px; }
  button:focus-visible { outline:2px solid #4d6bfe; outline-offset:3px; }
  button:disabled { cursor:default; opacity:.55; }
  .primary { background:#0066ff; color:#fff; font-size:14px; padding:8px 16px; }
  .primary:hover:not(:disabled) { background:#0057db; }
  .secondary,.details,.version-switch { color:var(--dsw-alias-label-secondary,#666b73); background:transparent; padding:4px 8px; font-size:13px; }
  .details { color:var(--dsw-alias-link,#0066ff); padding-left:0; }
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
  @media (max-width:440px) { .notification .row { flex-wrap:wrap; } .notification .actions { margin-left:auto; } }
  .about-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
  .about-line { display:flex; align-items:center; flex-wrap:wrap; gap:3px; }
  .info { position:relative; background:transparent; padding:0 3px; color:inherit; min-height:24px; }
  .tooltip { display:none; position:absolute; right:0; bottom:100%; width:220px; padding:8px 12px; font-size:12px; line-height:18px; background:var(--dsw-alias-bg-layer-2,#f0f2f5); color:var(--dsw-alias-label-primary,#202124); border-radius:8px; box-shadow:0 3px 12px rgba(0,0,0,.12); }
  .info:hover .tooltip,.info:focus .tooltip { display:block; }
  .switcher { position:relative; }
  .version-picker-container { position:absolute; right:0; top:100%; width:190px; max-height:min(180px,calc(100vh - 130px)); overflow:auto; padding:8px; background:var(--dsw-alias-bg-layer-1,#fff); color:var(--dsw-alias-label-primary,#202124); border:1px solid var(--dsw-alias-border-l2,#e5e7eb); border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,.12); z-index:1; }
  .version-group-title,.version-status-text { margin:6px; font-size:12px; line-height:18px; color:var(--dsw-alias-label-secondary,#666b73); }
  .version-tag-btn { display:block; width:100%; padding:6px 8px; text-align:left; background:transparent; color:inherit; font-size:13px; }
  .version-tag-btn:hover { background:var(--dsw-alias-interactive-bg-hover,#f0f2f5); }
  .progress { height:5px; background:var(--dsw-alias-bg-layer-2,#e5e7eb); border-radius:4px; overflow:hidden; margin:12px 0; }
  .progressValue { height:100%; background:#0066ff; }
  .spinner { position:absolute; inset:16px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin .75s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (prefers-color-scheme:dark) {
    .card,.about-card,.version-picker-container { background:var(--dsw-alias-bg-layer-1,#1f2023); color:var(--dsw-alias-label-primary,#f3f4f6); border-color:var(--dsw-alias-border-l2,#41434a); }
    .description,.about-line,.release-notes,.notes-label,.current-version,.secondary,.version-switch,.version-group-title,.version-status-text { color:var(--dsw-alias-label-secondary,#a9adb5); }
    .tooltip { background:var(--dsw-alias-bg-layer-2,#34363b); color:var(--dsw-alias-label-primary,#f3f4f6); }
    .details { color:var(--dsw-alias-link,#7b93ff); }
  }
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
  locale = info.locale
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  aboutInfo = info
  aboutOpen = true
  versionPickerOpen = false
  renderAbout()
}
ipcRenderer.on('updates:status-changed', onUpdateStatus)
ipcRenderer.on('desktop:show-about', onShowAbout)

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
window.addEventListener('unload', () => {
  window.removeEventListener('pointerdown', onOutsidePointer)
  window.removeEventListener('keydown', onKeydown)
  ipcRenderer.removeListener('updates:status-changed', onUpdateStatus)
  ipcRenderer.removeListener('desktop:show-about', onShowAbout)
}, { once: true })

void ipcRenderer
  .invoke('updates:status')
  .then((status: UpdateStatus) => {
    if (!receivedStatusEvent) applyStatus(status)
  })
  .catch((error: unknown) => console.warn('[updater] unable to read update status', error))


export function mountDesktopUpdateUi(): void {
  mount()
  mountAbout()
}
