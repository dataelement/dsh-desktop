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

export function isTrustedAppUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol === 'file:' || parsed.protocol === 'dsh-recovery:' || parsed.protocol === 'dsh-desktop:') return true
  } catch {
    return false
  }
  return isHarnessUrl(rawUrl)
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
