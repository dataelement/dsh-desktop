import { desktopMenuMessages } from './menu-messages'

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
  return desktopMenuMessages(locale).enterprise
}

export function updateMenuLabel(locale: string): string {
  return desktopMenuMessages(locale).update
}

export function aboutMenuLabel(locale: string): string {
  return desktopMenuMessages(locale).about
}

export function safeModeMenuLabel(locale: string): string {
  return desktopMenuMessages(locale).safeMode
}

export function restartMenuLabel(locale: string): string {
  return desktopMenuMessages(locale).restart
}

export function shortcutFileMenuLabels(locale: string): { fileMenu: string, closePage: string } {
  const { fileMenu, closePage } = desktopMenuMessages(locale)
  return { fileMenu, closePage }
}

/** Role actions remain native; their labels follow the Desktop language. */
export function standardMenuLabels(locale: string) {
  const { edit, undo, redo, cut, copy, paste, selectAll, window, minimize, close } = desktopMenuMessages(locale)
  return { edit, undo, redo, cut, copy, paste, selectAll, window, minimize, close }
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
 * Windows keeps a hidden copy of this command set so accelerators survive; the visible
 * caption is the in-page 应用 / 编辑 menu.
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
  const text = desktopMenuMessages(options.locale)
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
          label: text.hide.replace('{app}', options.appName),
          accelerator: 'Command+H',
          click: options.hide
        },
        { label: text.hideOthers, accelerator: 'Command+Alt+H', click: options.hideOthers },
        { label: text.showAll, click: options.unhideAll },
        { type: 'separator' },
        {
          label: text.quitApp.replace('{app}', options.appName),
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

/**
 * Hidden Windows application menu. The bar stays invisible; roles and the
 * Harness accelerators remain registered. The page caption draws 应用 / 编辑
 * and does not register those accelerators again.
 */
export function buildWindowsApplicationMenu(options: {
  locale: string
  connectPhone: () => void
  restart: () => void
  restartSafeMode?: () => void
  showHarnessLog: () => void
  checkForUpdates: () => void
  quit: () => void
}): DesktopMenuItem[] {
  const text = desktopMenuMessages(options.locale)
  const standard = standardMenuLabels(options.locale)
  return [
    {
      label: text.application,
      submenu: [
        {
          label: text.phone,
          accelerator: 'CmdOrCtrl+Shift+M',
          click: options.connectPhone
        },
        {
          label: restartMenuLabel(options.locale),
          accelerator: 'CmdOrCtrl+Shift+R',
          click: options.restart
        },
        ...(options.restartSafeMode === undefined
          ? []
          : [{ label: safeModeMenuLabel(options.locale), click: options.restartSafeMode }]),
        {
          label: text.log,
          click: options.showHarnessLog
        },
        { type: 'separator' },
        { label: updateMenuLabel(options.locale), accelerator: 'CmdOrCtrl+U', click: options.checkForUpdates },
        { type: 'separator' },
        { role: 'quit', label: text.exit, click: options.quit }
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
      label: text.view,
      submenu: [
        { role: 'reload', label: text.reload },
        { role: 'toggleDevTools', label: text.devtools },
        { type: 'separator' },
        { role: 'resetZoom', label: text.actualSize },
        { role: 'zoomIn', label: text.zoomIn },
        { role: 'zoomOut', label: text.zoomOut },
        { type: 'separator' },
        { role: 'togglefullscreen', label: text.fullscreen }
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
