import { isHarnessShellUrl } from '../shared/harness-boot'

function isHarnessUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl)
    return (
      url.protocol === 'http:' &&
      (url.hostname === '127.0.0.1' || url.hostname === 'localhost')
    )
  } catch {
    return false
  }
}

function parseUrl(rawUrl: string): URL | undefined {
  try {
    return new URL(rawUrl)
  } catch {
    return undefined
  }
}

function isAppProtocol(url: URL): boolean {
  return url.protocol === 'file:' || url.protocol === 'dsh-recovery:' || url.protocol === 'dsh-desktop:'
}

export function isTrustedAppUrl(rawUrl: string): boolean {
  const parsed = parseUrl(rawUrl)
  if (parsed === undefined) return false
  if (isAppProtocol(parsed)) return true
  return isHarnessUrl(rawUrl)
}

/**
 * An allowed popup becomes an in-app BrowserWindow that inherits the opener's
 * preload, so a loopback address alone is not enough: only the opener's own
 * origin and the running Harness backend qualify. Any other local server (a
 * user's dev server, a local tool) is ordinary web content for the system browser.
 */
export function isTrustedPopupUrl(rawUrl: string, appUrls: readonly (string | undefined)[]): boolean {
  const parsed = parseUrl(rawUrl)
  if (parsed === undefined) return false
  if (isAppProtocol(parsed)) return true
  if (!isHarnessUrl(rawUrl)) return false
  return appUrls.some((appUrl) => {
    const app = appUrl === undefined ? undefined : parseUrl(appUrl)
    return app !== undefined && isHarnessUrl(app.href) && app.origin === parsed.origin
  })
}

export function canGrantWindowPermission(
  permission: string,
  requestingUrl: string | undefined,
  isMainFrame: boolean,
  mediaTypes: readonly string[] = []
): boolean {
  return (
    (permission === 'clipboard-sanitized-write' ||
      permission === 'notifications' ||
      (permission === 'media' && mediaTypes.length === 1 && mediaTypes[0] === 'audio')) &&
    isMainFrame &&
    requestingUrl !== undefined &&
    (isHarnessUrl(requestingUrl) || isHarnessShellUrl(requestingUrl))
  )
}
