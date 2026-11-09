export const ENTERPRISE_URL = 'https://dshdesktop.com/zh/enterprise/'

export interface DesktopMenuItem {
  id?: string
  label?: string
  type?: 'separator'
  role?: string
  enabled?: boolean
  accelerator?: string
  submenu?: DesktopMenuItem[]
  click?: () => void
}

export function enterpriseMenuLabel(locale: string): string {
  return locale.toLowerCase().startsWith('zh') ? '了解企业版' : 'Explore Enterprise'
}

export function updateMenuLabel(locale: string): string {
  return locale.toLowerCase().startsWith('zh') ? '检查更新…' : 'Check for Updates…'
}

export function aboutMenuLabel(locale: string): string {
  return locale.toLowerCase().startsWith('zh') ? '关于 DSH Desktop' : 'About DSH Desktop'
}

export function safeModeMenuLabel(locale: string): string {
  return locale.toLowerCase().startsWith('zh') ? '以安全模式重启…' : 'Restart as Safe Mode…'
}

export function restartMenuLabel(locale: string): string {
  return locale.toLowerCase().startsWith('zh') ? '重启' : 'Restart'
}

export function shortcutFileMenuLabels(locale: string): { fileMenu: string, closePage: string } {
  return locale.toLowerCase().startsWith('zh')
    ? { fileMenu: '文件', closePage: '关闭页面或窗口' }
    : { fileMenu: 'File', closePage: 'Close Page or Window' }
}

/** Edit and Window titles. Role actions stay; their visible text follows the Desktop language. */
export function standardMenuLabels(locale: string): {
  edit: string
  undo: string
  redo: string
  cut: string
  copy: string
  paste: string
  selectAll: string
  window: string
  minimize: string
  close: string
} {
  return locale.toLowerCase().startsWith('zh')
    ? {
      edit: '编辑',
      undo: '撤销',
      redo: '重做',
      cut: '剪切',
      copy: '拷贝',
      paste: '粘贴',
      selectAll: '全选',
      window: '窗口',
      minimize: '最小化',
      close: '关闭'
    }
    : {
      edit: 'Edit',
      undo: 'Undo',
      redo: 'Redo',
      cut: 'Cut',
      copy: 'Copy',
      paste: 'Paste',
      selectAll: 'Select All',
      window: 'Window',
      minimize: 'Minimize',
      close: 'Close'
    }
}

/** Keep About first. The file menu follows the application menu when shortcuts are installed. */
export function insertFileMenu(items: readonly DesktopMenuItem[], fileMenu: DesktopMenuItem | undefined): DesktopMenuItem[] {
  if (fileMenu === undefined) return [...items]
  const [application, ...rest] = items
  if (application === undefined) return [fileMenu]
  return [application, fileMenu, ...rest]
}

/** The in-app about dialog is mounted only on the application document. */
export function aboutUsesPage(url: string, scheme: string): boolean {
  try {
    const destination = new URL(url)
    return destination.protocol === `${scheme}:` && destination.hostname === 'app'
  } catch {
    return false
  }
}

/** Open http(s) outside the app window. Any other URL stays closed. */
export function externalUrlToOpen(url: string): string | undefined {
  try {
    const destination = new URL(url)
    if (destination.protocol !== 'https:' && destination.protocol !== 'http:') return undefined
    return destination.href
  } catch {
    return undefined
  }
}

/**
 * macOS application menu. About opens the product dialog.
 * The next item checks for an update. Download starts only after consent.
 * Enterprise opens the product site.
 * Restart starts the current Host again. Safe Mode relaunches into the core profile when that action is supplied.
 * Phone pairing stays out of this menu.
 * Other platforms keep Electron's menu; their enterprise entry is the settings footer.
 */
export function buildDarwinDesktopMenu(options: {
  locale: string
  appName: string
  openEnterprise: () => void
  showAbout: () => void
  checkForUpdates: () => void
  restart?: () => void
  restartSafeMode?: () => void
  hide: () => void
  hideOthers: () => void
  unhideAll: () => void
  quit: () => void
}): DesktopMenuItem[] {
  const chinese = options.locale.toLowerCase().startsWith('zh')
  const standard = standardMenuLabels(options.locale)
  return [
    {
      label: options.appName,
      submenu: [
        { label: aboutMenuLabel(options.locale), click: options.showAbout },
        { label: updateMenuLabel(options.locale), accelerator: 'CmdOrCtrl+U', click: options.checkForUpdates },
        { label: enterpriseMenuLabel(options.locale), click: options.openEnterprise },
        ...(options.restart === undefined
          ? []
          : [{ label: restartMenuLabel(options.locale), accelerator: 'CmdOrCtrl+Shift+R', click: options.restart }]),
        ...(options.restartSafeMode === undefined
          ? []
          : [{ label: safeModeMenuLabel(options.locale), click: options.restartSafeMode }]),
        { type: 'separator' },
        {
          label: chinese ? `隐藏 ${options.appName}` : `Hide ${options.appName}`,
          accelerator: 'Command+H',
          click: options.hide
        },
        { label: chinese ? '隐藏其他' : 'Hide Others', accelerator: 'Command+Alt+H', click: options.hideOthers },
        { label: chinese ? '全部显示' : 'Show All', click: options.unhideAll },
        { type: 'separator' },
        {
          label: chinese ? `退出 ${options.appName}` : `Quit ${options.appName}`,
          accelerator: 'Command+Q',
          click: options.quit
        }
      ]
    },
    {
      label: standard.edit,
      submenu: [
        { role: 'undo', label: standard.undo },
        { role: 'redo', label: standard.redo },
        { type: 'separator' },
        { role: 'cut', label: standard.cut },
        { role: 'copy', label: standard.copy },
        { role: 'paste', label: standard.paste },
        { role: 'selectAll', label: standard.selectAll }
      ]
    },
    {
      label: standard.window,
      submenu: [
        { role: 'minimize', label: standard.minimize },
        { role: 'close', label: standard.close }
      ]
    }
  ]
}
