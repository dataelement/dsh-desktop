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

export function shortcutFileMenuLabels(locale: string): { fileMenu: string, closePage: string } {
  return locale.toLowerCase().startsWith('zh')
    ? { fileMenu: '文件', closePage: '关闭页面或窗口' }
    : { fileMenu: 'File', closePage: 'Close Page or Window' }
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
 * Safe Mode relaunches into the core profile when that action is supplied.
 * Phone pairing stays out of this menu.
 * Other platforms keep Electron's menu; their enterprise entry is the settings footer.
 */
export function buildDarwinDesktopMenu(options: {
  locale: string
  appName: string
  openEnterprise: () => void
  showAbout: () => void
  checkForUpdates: () => void
  restartSafeMode?: () => void
  hide: () => void
  hideOthers: () => void
  unhideAll: () => void
  quit: () => void
}): DesktopMenuItem[] {
  const chinese = options.locale.toLowerCase().startsWith('zh')
  return [
    {
      label: options.appName,
      submenu: [
        { label: aboutMenuLabel(options.locale), click: options.showAbout },
        { label: updateMenuLabel(options.locale), accelerator: 'CmdOrCtrl+U', click: options.checkForUpdates },
        { label: enterpriseMenuLabel(options.locale), click: options.openEnterprise },
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
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ]
}
