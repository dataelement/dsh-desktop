import { BrowserWindow, dialog, nativeTheme } from 'electron'
import type { DesktopLocale } from '../../shared/desktop-locale'
import { desktopDailyText } from '../../shared/desktop-daily-messages'
import { updateText } from '../../shared/desktop-update-messages'
import { LanMobileBridge } from '../mobile/lan-mobile-bridge'
import { secureWindow } from '../security'
import { shouldOpenInternetTunnel } from './mobile-pairing'

// Coalesce repeated clicks while the bridge or local page is still opening.
const pendingWindows = new WeakMap<LanMobileBridge, Promise<BrowserWindow | undefined>>()

interface MobilePairingOptions {
  bridge: LanMobileBridge
  parent?: BrowserWindow
  current?: BrowserWindow
  locale: DesktopLocale
  iconPath?: string
  hostReady: boolean
}

export async function presentMobilePairing(options: MobilePairingOptions): Promise<BrowserWindow | undefined> {
  const pending = pendingWindows.get(options.bridge)
  if (pending !== undefined) return pending
  const opening = openMobilePairing(options)
  pendingWindows.set(options.bridge, opening)
  try {
    return await opening
  } finally {
    pendingWindows.delete(options.bridge)
  }
}

async function openMobilePairing(options: MobilePairingOptions): Promise<BrowserWindow | undefined> {
  const t = (key: Parameters<typeof desktopDailyText>[1]) => desktopDailyText(options.locale, key)
  const parent = options.parent !== undefined && !options.parent.isDestroyed() ? options.parent : undefined
  if (options.current !== undefined && !options.current.isDestroyed()) {
    options.current.show()
    options.current.focus()
    return options.current
  }
  if (!options.hostReady) {
    await showNotice(parent, options.locale, {
      type: 'info',
      message: t('mobileStarting'),
      detail: t('mobileWait')
    })
    return undefined
  }
  const snapshot = await options.bridge.start()
  if (snapshot.desktopUrl === undefined) {
    await options.bridge.stop()
    await showNotice(parent, options.locale, {
      type: 'warning',
      message: t('mobileFailed'),
      detail: t('tryAgain')
    })
    return undefined
  }
  const desktopUrl = options.bridge.createDesktopUrl()
  if (desktopUrl === undefined) return undefined
  const window = new BrowserWindow({
    width: 500,
    height: 640,
    minWidth: 380,
    minHeight: 540,
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
  window.show()
  window.focus()
  // Start without awaiting before requesting HTML, so the first page already
  // selects internet mode and renders download/tunnel progress (or its error).
  if (shouldOpenInternetTunnel(snapshot)) {
    void options.bridge.toggleTunnel(true).catch((error: unknown) => {
      console.error('[mobile-pairing] Failed to enable internet pairing:', error)
    })
  }
  try {
    await window.loadURL(desktopUrl)
  } catch (error) {
    if (!window.isDestroyed()) window.destroy()
    throw error
  }
  if (window.isDestroyed()) return undefined
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
