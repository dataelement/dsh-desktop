import { shell, type BrowserWindow } from 'electron'
import { isTrustedAppUrl, isTrustedPopupUrl } from './security-policy'
import { installWindowPermissions } from './window-permissions'

export function secureWindow(
  window: Pick<BrowserWindow, 'webContents'>,
  allowMicrophone = false,
  controlledBrowser = false,
  appUrls: () => readonly (string | undefined)[] = () => []
): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedPopupUrl(url, [window.webContents.getURL(), ...appUrls()])) return { action: 'allow' }
    if (url.startsWith('https://') || url.startsWith('http://')) void shell.openExternal(url)
    return { action: 'deny' }
  })

  window.webContents.on('will-navigate', (event, url) => {
    if (isTrustedAppUrl(url)) return
    event.preventDefault()
    if (url.startsWith('https://') || url.startsWith('http://')) void shell.openExternal(url)
  })

  // Only the primary window has a separately installed, lease-scoped guest policy.
  if (!controlledBrowser) window.webContents.on('will-attach-webview', (event) => event.preventDefault())
  installWindowPermissions(window.webContents.session, window.webContents, allowMicrophone)
}
