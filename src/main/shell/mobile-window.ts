import { BrowserWindow, dialog, nativeTheme } from 'electron'
import { LanMobileBridge } from '../mobile/lan-mobile-bridge'
import { secureWindow } from '../security'
import { shouldOpenInternetTunnel } from './mobile-pairing'

export async function presentMobilePairing(options: {
  bridge: LanMobileBridge
  parent?: BrowserWindow
  current?: BrowserWindow
  locale: 'zh' | 'en'
  iconPath?: string
  hostReady: boolean
}): Promise<BrowserWindow | undefined> {
  const chinese = options.locale === 'zh'
  const parent = options.parent !== undefined && !options.parent.isDestroyed() ? options.parent : undefined
  if (!options.hostReady) {
    await showNotice(parent, {
      type: 'info',
      message: chinese ? '桌面服务还在启动。' : 'Harness is still starting.',
      detail: chinese ? '等 DSH Desktop 就绪后再连接手机。' : 'Wait until DSH Desktop is ready, then connect your phone again.'
    })
    return undefined
  }
  let snapshot = await options.bridge.start()
  if (snapshot.desktopUrl === undefined) {
    await options.bridge.stop()
    await showNotice(parent, {
      type: 'warning',
      message: chinese ? '手机桥没有启动。' : 'Failed to start mobile bridge.',
      detail: chinese ? '请再试一次。' : 'Please try again.'
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

function pairingTitle(locale: 'zh' | 'en'): string {
  return locale === 'zh' ? '连接移动设备' : 'Connect Mobile Device'
}

async function showNotice(
  parent: BrowserWindow | undefined,
  notice: { type: 'info' | 'warning'; message: string; detail: string }
): Promise<void> {
  const box = { ...notice, buttons: ['OK'] }
  await (parent === undefined ? dialog.showMessageBox(box) : dialog.showMessageBox(parent, box))
}
