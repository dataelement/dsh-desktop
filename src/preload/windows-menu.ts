import { ipcRenderer } from 'electron'
import { formatZoomPercentage, type DesktopMenuCommand } from '../shared/desktop-menu'

type MenuEntry =
  | { kind: 'command'; command: DesktopMenuCommand; label: string; shortcut?: string }
  | { kind: 'separator' }
  | { kind: 'label'; label: string }
  | { kind: 'zoom'; label: string }

function mountWindowsMenu(): void {
  if (!document.body || document.getElementById('application-menu-button')) return
  const params = new URLSearchParams(location.search)
  const locale = params.get('locale') === 'zh' ? 'zh' : 'en'
  applyTheme(params.get('theme') === 'dark')

  const bar = document.createElement('div')
  bar.className = 'bar'
  const menuButton = document.createElement('button')
  menuButton.id = 'application-menu-button'
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
  let zoomDisplay: HTMLButtonElement | null = null

  const applyZoomState = (result: unknown): void => {
    const zoomFactor = readZoomFactor(result)
    if (zoomFactor !== undefined && zoomDisplay) {
      zoomDisplay.textContent = formatZoomPercentage(zoomFactor)
    }
  }
  const refreshZoomState = (): void => {
    void ipcRenderer.invoke('desktop-menu:get-zoom-factor').then(applyZoomState).catch((error: unknown) => {
      console.warn('[desktop-menu] unable to read zoom factor', error)
    })
  }

  function openMenu(): void {
    void ipcRenderer.invoke('desktop-titlebar:set-menu-open', true)
    refreshZoomState()
    menu.hidden = false
    menuButton.classList.add('isOpen')
    menuButton.setAttribute('aria-expanded', 'true')
    window.requestAnimationFrame(() => menu.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus())
  }

  function closeMenu(restoreFocus = true): void {
    if (menu.hidden) return
    menu.hidden = true
    menuButton.classList.remove('isOpen')
    menuButton.setAttribute('aria-expanded', 'false')
    void ipcRenderer.invoke('desktop-titlebar:set-menu-open', false)
    if (restoreFocus) menuButton.focus()
  }

  zoomDisplay = renderMenu(menu, menuEntries(locale), () => closeMenu(false), applyZoomState)
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
      const next = current < 0 ? 0 : (current + direction + buttons.length) % buttons.length
      buttons[next]?.focus()
    }
  })
  ipcRenderer.on('desktop-titlebar:close-menu', () => closeMenu(false))
  ipcRenderer.on('desktop-titlebar:theme-changed', (_event, isDark: unknown) => {
    if (typeof isDark === 'boolean') applyTheme(isDark)
  })
  window.addEventListener('blur', () => closeMenu(false))

  const style = document.createElement('style')
  style.textContent = menuStyles
  document.head.appendChild(style)
  bar.append(menuButton, menu)
  document.body.appendChild(bar)
  refreshZoomState()
}

function renderMenu(
  menu: HTMLElement,
  entries: MenuEntry[],
  close: () => void,
  applyZoomState: (result: unknown) => void
): HTMLButtonElement | null {
  let zoomDisplay: HTMLButtonElement | null = null
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
        zoom.addEventListener('click', () => {
          void ipcRenderer.invoke('desktop-menu:execute', command).then(applyZoomState).catch((error: unknown) => {
            console.error(`[desktop-menu] unable to execute ${command}`, error)
          })
        })
        if (command === 'zoom-reset') zoomDisplay = zoom
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
    item.addEventListener('click', () => {
      close()
      void ipcRenderer.invoke('desktop-menu:execute', entry.command).catch((error: unknown) => {
        console.error(`[desktop-menu] unable to execute ${entry.command}`, error)
      })
    })
    menu.appendChild(item)
  }
  return zoomDisplay
}

function readZoomFactor(result: unknown): number | undefined {
  if (typeof result !== 'object' || result === null || !('zoomFactor' in result)) return undefined
  const zoomFactor = result.zoomFactor
  return typeof zoomFactor === 'number' && Number.isFinite(zoomFactor) && zoomFactor > 0
    ? zoomFactor
    : undefined
}

function applyTheme(isDark: boolean): void {
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
}

function menuEntries(locale: 'en' | 'zh'): MenuEntry[] {
  const zh = locale === 'zh'
  return [
    { kind: 'label', label: 'HARNESS' },
    { kind: 'command', command: 'connect-phone', label: zh ? '连接手机…' : 'Connect Phone…', shortcut: 'Ctrl+Shift+M' },
    { kind: 'command', command: 'restart-harness', label: zh ? '重启 Harness' : 'Restart Harness', shortcut: 'Ctrl+Shift+R' },
    { kind: 'command', command: 'safe-mode', label: zh ? '以安全模式重启…' : 'Restart as Safe Mode…' },
    { kind: 'command', command: 'show-harness-log', label: zh ? '显示 Harness 日志' : 'Show Harness Log' },
    { kind: 'command', command: 'check-for-updates', label: zh ? '检查更新…' : 'Check for Updates…', shortcut: 'Ctrl+U' },
    { kind: 'separator' },
    { kind: 'label', label: zh ? '编辑' : 'EDIT' },
    { kind: 'command', command: 'undo', label: zh ? '撤销' : 'Undo', shortcut: 'Ctrl+Z' },
    { kind: 'command', command: 'redo', label: zh ? '重做' : 'Redo', shortcut: 'Ctrl+Y' },
    { kind: 'command', command: 'cut', label: zh ? '剪切' : 'Cut', shortcut: 'Ctrl+X' },
    { kind: 'command', command: 'copy', label: zh ? '复制' : 'Copy', shortcut: 'Ctrl+C' },
    { kind: 'command', command: 'paste', label: zh ? '粘贴' : 'Paste', shortcut: 'Ctrl+V' },
    { kind: 'command', command: 'select-all', label: zh ? '全选' : 'Select All', shortcut: 'Ctrl+A' },
    { kind: 'separator' },
    { kind: 'label', label: zh ? '视图' : 'VIEW' },
    { kind: 'command', command: 'reload', label: zh ? '重新加载' : 'Reload', shortcut: 'Ctrl+R' },
    { kind: 'command', command: 'toggle-devtools', label: zh ? '开发者工具' : 'Developer Tools', shortcut: 'Ctrl+Shift+I' },
    { kind: 'zoom', label: zh ? '界面缩放' : 'Interface scale' },
    { kind: 'command', command: 'toggle-fullscreen', label: zh ? '切换全屏' : 'Toggle Full Screen', shortcut: 'F11' },
    { kind: 'separator' },
    { kind: 'command', command: 'about', label: zh ? '关于 DSH Desktop' : 'About DSH Desktop' },
    { kind: 'command', command: 'quit', label: zh ? '退出' : 'Exit' }
  ]
}

const chevronIcon = `<svg viewBox="0 0 20 20" width="17" height="17" fill="none" aria-hidden="true"><path d="m6.5 8 3.5 3.5L13.5 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`

const menuStyles = `
  :root {
    color-scheme: light;
    --label-primary: #202124; --label-secondary: #61666b; --label-tertiary: #81858c;
    --hover: rgba(32,33,36,.08); --surface: #fff; --border: rgba(32,33,36,.13);
    --separator: rgba(32,33,36,.09); --layer: rgba(32,33,36,.06); --danger: #d93025;
  }
  :root[data-theme="dark"] {
    color-scheme: dark;
    --label-primary: #f3f4f6; --label-secondary: #b5b7bd; --label-tertiary: #92959b;
    --hover: rgba(255,255,255,.09); --surface: #28282b; --border: rgba(255,255,255,.12);
    --separator: rgba(255,255,255,.09); --layer: rgba(255,255,255,.07); --danger: #ee7772;
  }
  * { box-sizing: border-box; }
  html, body { width:100%; height:100%; margin:0; overflow:hidden; background:transparent; }
  body { color:var(--label-primary); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; user-select:none; }
  .bar { position:relative; width:100%; height:100%; display:flex; justify-content:flex-end; align-items:flex-start; }
  .menuButton { appearance:none; flex:none; width:44px; height:36px; display:grid; place-items:center; padding:0; color:var(--label-secondary); background:transparent; border:0; cursor:pointer; }
  .menuButton:hover, .menuButton.isOpen { color:var(--label-primary); background:var(--hover); }
  .menuButton:focus-visible { outline:2px solid #4d6bfe; outline-offset:-3px; }
  .menu { position:absolute; top:43px; right:0; width:304px; max-height:calc(100vh - 56px); overflow:auto; padding:7px; color:var(--label-primary); background:var(--surface); border:1px solid var(--border); border-radius:12px; box-shadow:0 14px 36px rgba(0,0,0,.2); scrollbar-width:thin; }
  .menu[hidden] { display:none; }
  .sectionLabel { padding:7px 10px 4px; color:var(--label-tertiary); font-size:10px; font-weight:600; line-height:14px; letter-spacing:.08em; text-transform:uppercase; }
  .item { appearance:none; width:100%; min-height:33px; display:flex; align-items:center; justify-content:space-between; gap:20px; padding:6px 10px; color:inherit; background:transparent; border:0; border-radius:7px; font:inherit; font-size:13px; line-height:20px; text-align:left; cursor:pointer; }
  .item:hover, .item:focus-visible, .zoomButton:hover, .zoomButton:focus-visible, .zoomReset:hover, .zoomReset:focus-visible { outline:none; background:var(--hover); }
  .item.danger { color:var(--danger); }
  kbd { flex:none; color:var(--label-tertiary); font:11px/16px ui-monospace,"SFMono-Regular",Consolas,monospace; }
  .separator { height:1px; margin:6px 3px; background:var(--separator); }
  .zoomRow { min-height:37px; display:grid; grid-template-columns:1fr 30px 54px 30px; align-items:center; gap:3px; padding:3px 7px 3px 10px; font-size:13px; }
  .zoomButton, .zoomReset { appearance:none; height:27px; padding:0; color:inherit; background:var(--layer); border:0; border-radius:6px; font:inherit; cursor:pointer; }
  .zoomReset { font-size:11px; }
  :root[data-theme="dark"] .menu { box-shadow:0 18px 42px rgba(0,0,0,.46); }
  @media (prefers-reduced-motion:reduce) { * { scroll-behavior:auto !important; } }
`

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', mountWindowsMenu, { once: true })
} else {
  mountWindowsMenu()
}
