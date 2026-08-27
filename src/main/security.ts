import { shell, type BrowserWindow } from 'electron'
import { canGrantWindowPermission, isTrustedAppUrl } from './security-policy'

export function secureWindow(window: BrowserWindow): void {
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

  window.webContents.on('will-frame-navigate', (event) => {
    if (event.isMainFrame) {
      const initiator = event.initiator
      const mainFrame = window.webContents.mainFrame
      if (
        !initiator ||
        initiator.processId !== mainFrame.processId ||
        initiator.routingId !== mainFrame.routingId
      ) {
        event.preventDefault()
      }
      return
    }
    if (isPreviewUrl(event.url)) return
    event.preventDefault()
  })

  window.webContents.on('will-attach-webview', (event) => event.preventDefault())
  window.webContents.session.setPermissionCheckHandler(
    (_webContents, permission, requestingOrigin, details) =>
      canGrantWindowPermission(
        permission,
        details.requestingUrl ?? requestingOrigin,
        details.isMainFrame
      )
  )
  window.webContents.session.setPermissionRequestHandler(
    (_webContents, permission, callback, details) => {
      callback(
        canGrantWindowPermission(permission, details.requestingUrl, details.isMainFrame)
      )
    }
  )
}

function isPreviewUrl(rawUrl: string): boolean {
  try {
    return new URL(rawUrl).protocol === 'sherlock-preview:'
  } catch {
    return false
  }
}
