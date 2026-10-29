import { shell, type BrowserWindow } from 'electron'
import { isTrustedAppUrl } from './security-policy'
import { installWindowPermissions } from './window-permissions'

export function secureWindow(window: Pick<BrowserWindow, 'webContents'>, allowMicrophone = false): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedAppUrl(url)) return { action: 'allow' }
    if (url.startsWith('https://') || url.startsWith('http://')) void shell.openExternal(url)
    return { action: 'deny' }
  })

  window.webContents.on('will-navigate', (event, url) => {
    if (isTrustedAppUrl(url)) return
    event.preventDefault()
    if (url.startsWith('https://') || url.startsWith('http://')) void shell.openExternal(url)
  })

  window.webContents.on('will-attach-webview', (event) => event.preventDefault())
  installWindowPermissions(window.webContents.session, window.webContents, allowMicrophone)
}
