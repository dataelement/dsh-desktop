import { BrowserWindow, dialog, nativeTheme } from 'electron'
import type { DesktopLocale } from '../../shared/desktop-locale'
import { desktopDailyText } from '../../shared/desktop-daily-messages'
import { updateText } from '../../shared/desktop-update-messages'
import { LanMobileBridge } from '../mobile/lan-mobile-bridge'
import { secureWindow } from '../security'
import { shouldOpenInternetTunnel } from './mobile-pairing'

export async function presentMobilePairing(options: {
  bridge: LanMobileBridge
  parent?: BrowserWindow
  current?: BrowserWindow
  locale: DesktopLocale
  iconPath?: string
  hostReady: boolean
}): Promise<BrowserWindow | undefined> {
  const t = (key: Parameters<typeof desktopDailyText>[1]) => desktopDailyText(options.locale, key)
  const parent = options.parent !== undefined && !options.parent.isDestroyed() ? options.parent : undefined
  if (!options.hostReady) {
    await showNotice(parent, options.locale, {
      type: 'info',
      message: t('mobileStarting'),
      detail: t('mobileWait')
    })
    return undefined
  }
  let snapshot = await options.bridge.start()
  if (snapshot.desktopUrl === undefined) {
    await options.bridge.stop()
    await showNotice(parent, options.locale, {
      type: 'warning',
      message: t('mobileFailed'),
      detail: t('tryAgain')
    })
    return undefined
  }
  if (shouldOpenInternetTunnel(snapshot)) snapshot = await options.bridge.toggleTunnel(true)
  const desktopUrl = options.bridge.createDesktopUrl()
  if (desktopUrl === undefined) return undefined
  if (options.current !== undefined && !options.current.isDestroyed()) options.current.destroy()
  const window = new BrowserWindow({
    width: 560,
    height: 720,
    minWidth: 420,
    minHeight: 560,
    title: pairingTitle(options.locale),
    ...(options.iconPath === undefined ? {} : { icon: options.iconPath }),
    ...(parent === undefined ? {} : { parent }),
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#141416' : '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  })
  secureWindow(window)
  await window.loadURL(desktopUrl)
  window.show()
  window.focus()
  return window
}

function pairingTitle(locale: DesktopLocale): string {
  return desktopDailyText(locale, 'mobileWindowTitle')
}

async function showNotice(
  parent: BrowserWindow | undefined,
  locale: DesktopLocale,
  notice: { type: 'info' | 'warning'; message: string; detail: string }
): Promise<void> {
  const box = { ...notice, buttons: [updateText(locale, 'ok')] }
  await (parent === undefined ? dialog.showMessageBox(box) : dialog.showMessageBox(parent, box))
}
