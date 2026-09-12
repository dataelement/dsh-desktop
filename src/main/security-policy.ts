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

export function isTrustedAppUrl(rawUrl: string, appUrl?: string): boolean {
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol === 'file:' || parsed.protocol === 'dsh-recovery:') return true
  } catch {
    return false
  }
  if (!appUrl || !isHarnessUrl(appUrl)) return false
  try {
    return new URL(rawUrl).origin === new URL(appUrl).origin
  } catch {
    return false
  }
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
