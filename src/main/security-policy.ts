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
    if (parsed.protocol === 'file:' || parsed.protocol === 'dsh-recovery:') return true
  } catch {
    return false
  }
  return isHarnessUrl(rawUrl)
}

function isFileUrl(rawUrl: string): boolean {
  try {
    return new URL(rawUrl).protocol === 'file:'
  } catch {
    return false
  }
}

/**
 * Guest-initiated navigations only. Main-process loadFile does not emit
 * will-navigate, so overlay pages can still open. A drop on the Harness
 * session would otherwise navigate to the user's file:// path.
 */
export function shouldAllowWindowNavigation(currentUrl: string, targetUrl: string): boolean {
  if (isHarnessUrl(currentUrl) && isFileUrl(targetUrl)) return false
  return isTrustedAppUrl(targetUrl)
}

export function canGrantWindowPermission(
  permission: string,
  requestingUrl: string | undefined,
  isMainFrame: boolean
): boolean {
  return (
    permission === 'clipboard-sanitized-write' &&
    isMainFrame &&
    requestingUrl !== undefined &&
    isHarnessUrl(requestingUrl)
  )
}
