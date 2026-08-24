import type { IpcRenderer } from 'electron'
import {
  WINDOWS_TITLEBAR_HEIGHT,
  type DesktopMenuCommand
} from '../shared/desktop-menu'

const HOST_ID = 'dsh-desktop-windows-titlebar'
const LAYOUT_STYLE_ID = `${HOST_ID}-layout`
const SIDEBAR_WIDTH_PROPERTY = '--dsh-desktop-windows-sidebar-width'

type MenuEntry =
  | { kind: 'command'; command: DesktopMenuCommand; label: string; shortcut?: string }
  | { kind: 'separator' }
  | { kind: 'label'; label: string }
  | { kind: 'zoom'; label: string }

interface TitlebarMountOptions {
  document: Document
  ipcRenderer: Pick<IpcRenderer, 'invoke'>
  locale: 'en' | 'zh'
}

const nativeThemeSyncedDocuments = new WeakSet<Document>()

export function mountNativeThemeSync(
  options: Pick<TitlebarMountOptions, 'document' | 'ipcRenderer'>
): void {
  const { document, ipcRenderer } = options
  if (!document.body || nativeThemeSyncedDocuments.has(document)) return
  nativeThemeSyncedDocuments.add(document)

  syncTheme(document, ipcRenderer)
  const themeObserver = new MutationObserver(() => syncTheme(document, ipcRenderer))
  themeObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['data-ds-dark-theme']
  })
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    syncTheme(document, ipcRenderer)
  })
}

export function mountWindowsTitlebar(options: TitlebarMountOptions): void {
  const { document, ipcRenderer, locale } = options
  if (!document.body || document.getElementById(HOST_ID)) return

  installLayout(document)
  trackSidebarLayout(document)

  const host = document.createElement('div')
  host.id = HOST_ID
  host.setAttribute('aria-label', locale === 'zh' ? 'Sherlock 标题栏' : 'Sherlock title bar')
  const shadow = host.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = titlebarStyles

  const bar = document.createElement('div')
  bar.className = 'bar'
  const safeArea = document.createElement('div')
  safeArea.className = 'safeArea'
  const menuButton = document.createElement('button')
  menuButton.className = 'menuButton'
  menuButton.type = 'button'
  menuButton.setAttribute('aria-haspopup', 'menu')
  menuButton.setAttribute('aria-expanded', 'false')
  menuButton.setAttribute('aria-label', locale === 'zh' ? '打开应用菜单' : 'Open application menu')
  menuButton.title = locale === 'zh' ? '应用菜单' : 'Application menu'
  menuButton.innerHTML = chevronIcon

  const menu = document.createElement('div')
  menu.className = 'menu'
  menu.hidden = true
  menu.setAttribute('role', 'menu')
  menu.setAttribute('aria-label', locale === 'zh' ? '应用菜单' : 'Application menu')
  renderMenu(document, menu, menuEntries(locale), ipcRenderer, () => closeMenu(false))

  function openMenu(): void {
    menu.hidden = false
    menuButton.classList.add('isOpen')
    menuButton.setAttribute('aria-expanded', 'true')
    const first = menu.querySelector<HTMLButtonElement>('button:not(:disabled)')
    window.requestAnimationFrame(() => first?.focus())
  }

  function closeMenu(restoreFocus = true): void {
    if (menu.hidden) return
    menu.hidden = true
    menuButton.classList.remove('isOpen')
    menuButton.setAttribute('aria-expanded', 'false')
    if (restoreFocus) menuButton.focus()
  }

  menuButton.addEventListener('pointerdown', (event) => event.preventDefault())
  menuButton.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()))
  menu.addEventListener('keydown', (event) => {
    const buttons = [...menu.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu()
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      const next = current < 0
        ? 0
        : (current + direction + buttons.length) % buttons.length
      buttons[next]?.focus()
    }
  })
  document.addEventListener('pointerdown', (event) => {
    if (!menu.hidden && !event.composedPath().includes(host)) closeMenu(false)
  })
  window.addEventListener('blur', () => closeMenu(false))

  safeArea.append(menuButton, menu)
  bar.appendChild(safeArea)
  shadow.append(style, bar)
  document.body.appendChild(host)
  mountNativeThemeSync({ document, ipcRenderer })
}

function installLayout(document: Document): void {
  document.body.classList.add('dsh-desktop-windows-titlebar-layout')
  if (document.getElementById(LAYOUT_STYLE_ID)) return

  const style = document.createElement('style')
  style.id = LAYOUT_STYLE_ID
  style.textContent = `
    html, body { height: 100% !important; }
    body.dsh-desktop-windows-titlebar-layout {
      box-sizing: border-box !important;
      height: 100% !important;
      padding-top: 0 !important;
    }
    body.dsh-desktop-windows-titlebar-layout > #root {
      height: 100% !important;
      min-height: 0 !important;
    }
    body.dsh-desktop-windows-titlebar-layout [data-dsh-sidebar-root][data-dsh-sidebar-wide="true"] {
      padding-top: 6px !important;
    }
  `
  document.head.appendChild(style)
}

function trackSidebarLayout(document: Document): void {
  let observedSidebarColumn: HTMLElement | null = null
  const resizeObserver = new ResizeObserver(() => updateSidebarWidth())

  const updateSidebarWidth = (): void => {
    if (!observedSidebarColumn) return
    const width = observedSidebarColumn.getBoundingClientRect().width
    if (width > 0) {
      document.documentElement.style.setProperty(SIDEBAR_WIDTH_PROPERTY, `${width}px`)
    }
  }

  const sync = (): void => {
    const sidebarRoot = document.querySelector<HTMLElement>('[data-dsh-sidebar-root]')
    const sidebarColumn = sidebarRoot?.parentElement ?? null
    if (!sidebarColumn) return

    if (sidebarColumn !== observedSidebarColumn) {
      if (observedSidebarColumn) resizeObserver.unobserve(observedSidebarColumn)
      observedSidebarColumn = sidebarColumn
      resizeObserver.observe(sidebarColumn)
    }
    updateSidebarWidth()
  }

  const observer = new MutationObserver(sync)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  sync()
}

function renderMenu(
  document: Document,
  menu: HTMLElement,
  entries: MenuEntry[],
  ipcRenderer: Pick<IpcRenderer, 'invoke'>,
  close: () => void
): void {
  for (const entry of entries) {
    if (entry.kind === 'separator') {
      const separator = document.createElement('div')
      separator.className = 'separator'
      separator.setAttribute('role', 'separator')
      menu.appendChild(separator)
      continue
    }
    if (entry.kind === 'label') {
      const label = document.createElement('div')
      label.className = 'sectionLabel'
      label.textContent = entry.label
      menu.appendChild(label)
      continue
    }
    if (entry.kind === 'zoom') {
      const row = document.createElement('div')
      row.className = 'zoomRow'
      const label = document.createElement('span')
      label.textContent = entry.label
      row.append(label)
      for (const [command, text, title] of [
        ['zoom-out', '−', 'Zoom out'],
        ['zoom-reset', '100%', 'Reset zoom'],
        ['zoom-in', '+', 'Zoom in']
      ] as const) {
        const zoom = document.createElement('button')
        zoom.type = 'button'
        zoom.className = command === 'zoom-reset' ? 'zoomReset' : 'zoomButton'
        zoom.textContent = text
        zoom.title = title
        zoom.setAttribute('aria-label', title)
        zoom.addEventListener('pointerdown', (event) => event.preventDefault())
        zoom.addEventListener('click', () => execute(ipcRenderer, command, close))
        row.appendChild(zoom)
      }
      menu.appendChild(row)
      continue
    }

    const item = document.createElement('button')
    item.type = 'button'
    item.className = entry.command === 'quit' ? 'item danger' : 'item'
    item.setAttribute('role', 'menuitem')
    const label = document.createElement('span')
    label.textContent = entry.label
    item.appendChild(label)
    if (entry.shortcut) {
      const shortcut = document.createElement('kbd')
      shortcut.textContent = entry.shortcut
      item.appendChild(shortcut)
    }
    item.addEventListener('pointerdown', (event) => event.preventDefault())
    item.addEventListener('click', () => execute(ipcRenderer, entry.command, close))
    menu.appendChild(item)
  }
}

function execute(
  ipcRenderer: Pick<IpcRenderer, 'invoke'>,
  command: DesktopMenuCommand,
  close: () => void
): void {
  close()
  void ipcRenderer.invoke('desktop-menu:execute', command).catch((error: unknown) => {
    console.error(`[desktop-menu] unable to execute ${command}`, error)
  })
}

function syncTheme(document: Document, ipcRenderer: Pick<IpcRenderer, 'invoke'>): void {
  const isDark = documentIsDark(document)
  void ipcRenderer.invoke('desktop-titlebar:set-theme', isDark).catch((error: unknown) => {
    console.warn('[desktop-titlebar] unable to synchronize native theme', error)
  })
}

export function documentIsDark(document: Document): boolean {
  if (document.body.hasAttribute('data-ds-dark-theme')) return true
  const color = document.defaultView?.getComputedStyle(document.body).backgroundColor ?? ''
  const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number)
  if (!channels || channels.length < 3 || channels.some(Number.isNaN)) {
    return document.defaultView?.matchMedia('(prefers-color-scheme: dark)').matches ?? false
  }
  const [red = 255, green = 255, blue = 255] = channels
  return red * 0.2126 + green * 0.7152 + blue * 0.0722 < 128
}

function menuEntries(locale: 'en' | 'zh'): MenuEntry[] {
  const zh = locale === 'zh'
  return [
    { kind: 'label', label: 'HARNESS' },
    {
      kind: 'command',
      command: 'restart-harness',
      label: zh ? '重启 Harness' : 'Restart Harness',
      shortcut: 'Ctrl+Shift+R'
    },
    {
      kind: 'command',
      command: 'show-harness-log',
      label: zh ? '显示 Harness 日志' : 'Show Harness Log'
    },
    {
      kind: 'command',
      command: 'check-for-updates',
      label: zh ? '检查更新…' : 'Check for Updates…',
      shortcut: 'Ctrl+U'
    },
    { kind: 'separator' },
    { kind: 'label', label: zh ? '编辑' : 'EDIT' },
    { kind: 'command', command: 'undo', label: zh ? '撤销' : 'Undo', shortcut: 'Ctrl+Z' },
    { kind: 'command', command: 'redo', label: zh ? '重做' : 'Redo', shortcut: 'Ctrl+Y' },
    { kind: 'command', command: 'cut', label: zh ? '剪切' : 'Cut', shortcut: 'Ctrl+X' },
    { kind: 'command', command: 'copy', label: zh ? '复制' : 'Copy', shortcut: 'Ctrl+C' },
    { kind: 'command', command: 'paste', label: zh ? '粘贴' : 'Paste', shortcut: 'Ctrl+V' },
    {
      kind: 'command',
      command: 'select-all',
      label: zh ? '全选' : 'Select All',
      shortcut: 'Ctrl+A'
    },
    { kind: 'separator' },
    { kind: 'label', label: zh ? '视图' : 'VIEW' },
    { kind: 'command', command: 'reload', label: zh ? '重新加载' : 'Reload', shortcut: 'Ctrl+R' },
    {
      kind: 'command',
      command: 'toggle-devtools',
      label: zh ? '开发者工具' : 'Developer Tools',
      shortcut: 'Ctrl+Shift+I'
    },
    { kind: 'zoom', label: zh ? '界面缩放' : 'Interface scale' },
    {
      kind: 'command',
      command: 'toggle-fullscreen',
      label: zh ? '切换全屏' : 'Toggle Full Screen',
      shortcut: 'F11'
    },
    { kind: 'separator' },
    {
      kind: 'command',
      command: 'about',
      label: zh ? '关于 Sherlock' : 'About Sherlock'
    },
    { kind: 'command', command: 'quit', label: zh ? '退出' : 'Exit' }
  ]
}

const chevronIcon = `<svg viewBox="0 0 20 20" width="17" height="17" fill="none" aria-hidden="true"><path d="m6.5 8 3.5 3.5L13.5 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`

const titlebarStyles = `
  :host { color-scheme: light dark; }
  * { box-sizing: border-box; }
  .bar {
    position: fixed;
    z-index: 2147483645;
    top: 0;
    left: 0;
    width: 100vw;
    height: ${WINDOWS_TITLEBAR_HEIGHT}px;
    color: var(--dsw-alias-label-primary, #202124);
    background: transparent;
    font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
    -webkit-app-region: no-drag;
    pointer-events: none;
    user-select: none;
  }
  .safeArea {
    position: absolute;
    top: 0;
    left: env(titlebar-area-x, 0px);
    width: env(titlebar-area-width, calc(100vw - 140px));
    height: 100%;
    display: flex;
    justify-content: flex-end;
    align-items: stretch;
    pointer-events: none;
  }
  .safeArea::before {
    content: "";
    position: absolute;
    top: 0;
    right: 44px;
    height: 5px;
    left: var(${SIDEBAR_WIDTH_PROPERTY}, 280px);
    pointer-events: auto;
    -webkit-app-region: drag;
  }
  .menuButton {
    appearance: none;
    width: 44px;
    height: 100%;
    display: grid;
    place-items: center;
    padding: 0;
    color: var(--dsw-alias-label-secondary, #61666b);
    background: transparent;
    border: 0;
    border-left: 1px solid var(--dsw-alias-border-l1, rgba(32, 33, 36, 0.08));
    cursor: pointer;
    pointer-events: auto;
    -webkit-app-region: no-drag;
  }
  .menuButton:hover, .menuButton.isOpen {
    color: var(--dsw-alias-label-primary, #202124);
    background: var(--dsw-alias-interactive-bg-hover, rgba(32, 33, 36, 0.08));
  }
  .menuButton:focus-visible { outline: 2px solid #4d6bfe; outline-offset: -3px; }
  .menu {
    position: absolute;
    top: calc(100% + 7px);
    right: 0;
    width: 304px;
    max-height: calc(100vh - ${WINDOWS_TITLEBAR_HEIGHT + 20}px);
    overflow: auto;
    padding: 7px;
    color: var(--dsw-alias-label-primary, #202124);
    background: var(--dsw-specific-menu, #fff);
    border: 1px solid var(--dsw-alias-border-l2, rgba(32, 33, 36, 0.13));
    border-radius: 12px;
    box-shadow: var(--dsw-shadow-lv3, 0 14px 36px rgba(0, 0, 0, 0.17));
    pointer-events: auto;
    -webkit-app-region: no-drag;
    user-select: none;
    scrollbar-width: thin;
  }
  .menu[hidden] { display: none; }
  .sectionLabel {
    padding: 7px 10px 4px;
    color: var(--dsw-alias-label-tertiary, #81858c);
    font-size: 10px;
    font-weight: 600;
    line-height: 14px;
    letter-spacing: .08em;
    text-transform: uppercase;
  }
  .item {
    appearance: none;
    width: 100%;
    min-height: 33px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 6px 10px;
    color: inherit;
    background: transparent;
    border: 0;
    border-radius: 7px;
    font: inherit;
    font-size: 13px;
    line-height: 20px;
    text-align: left;
    cursor: pointer;
  }
  .item:hover, .item:focus-visible, .zoomButton:hover, .zoomButton:focus-visible, .zoomReset:hover, .zoomReset:focus-visible {
    outline: none;
    background: var(--dsw-alias-interactive-bg-hover, rgba(32, 33, 36, 0.08));
  }
  .item.danger { color: var(--dsw-alias-state-error-primary, #d93025); }
  kbd {
    flex: none;
    color: var(--dsw-alias-label-tertiary, #81858c);
    font: 11px/16px var(--ds-font-family-code, ui-monospace, "SFMono-Regular", Consolas, monospace);
  }
  .separator {
    height: 1px;
    margin: 6px 3px;
    background: var(--dsw-alias-border-l1, rgba(32, 33, 36, 0.09));
  }
  .zoomRow {
    min-height: 37px;
    display: grid;
    grid-template-columns: 1fr 30px 54px 30px;
    align-items: center;
    gap: 3px;
    padding: 3px 7px 3px 10px;
    font-size: 13px;
  }
  .zoomButton, .zoomReset {
    appearance: none;
    height: 27px;
    padding: 0;
    color: inherit;
    background: var(--dsw-alias-bg-layer-2, rgba(32, 33, 36, 0.06));
    border: 0;
    border-radius: 6px;
    font: inherit;
    cursor: pointer;
  }
  .zoomReset { font-size: 11px; }
  @media (prefers-color-scheme: dark) {
    .bar { color: var(--dsw-alias-label-primary, #f3f4f6); }
    .menu { color: var(--dsw-alias-label-primary, #f3f4f6); background: var(--dsw-specific-menu, #28282b); border-color: rgba(255,255,255,.12); box-shadow: 0 18px 42px rgba(0,0,0,.46); }
    .menuButton { color: var(--dsw-alias-label-secondary, #b5b7bd); border-left-color: rgba(255,255,255,.08); }
  }
  @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
`
