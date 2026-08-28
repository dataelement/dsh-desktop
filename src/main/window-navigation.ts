export function shouldLoadHarnessUrl(currentUrl: string, targetUrl: string): boolean {
  if (currentUrl === '' || currentUrl === 'about:blank') return true

  try {
    return new URL(currentUrl).origin !== new URL(targetUrl).origin
  } catch {
    return true
  }
}

export function desktopHarnessUrl(
  url: string,
  platform: NodeJS.Platform,
  authToken?: string
): string {
  // Since 0.1.2-alpha.1 the Host authenticates the whole API before dispatch.
  // Only `GET /?token=...` trades the per-process launch token for the signed
  // session cookie; API paths and Authorization headers refuse it. So the
  // window's first navigation has to carry the token, and Chromium keeps the
  // cookie for every later request on this authority. A reload after the
  // exchange sends a stale token, which the Host redirects to a clean `/`
  // whenever the cookie is still valid.
  if (platform !== 'win32' && authToken === undefined) return url

  try {
    const parsed = new URL(url)
    if (authToken !== undefined) parsed.searchParams.set('token', authToken)
    if (platform === 'win32') {
      parsed.searchParams.set('dsh-desktop-mode', 'advanced')
      parsed.searchParams.set('dsh-desktop-platform', platform)
    }
    return parsed.toString()
  } catch {
    return url
  }
}

export function isAbortedNavigationError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false

  const navigationError = error as { code?: unknown; errno?: unknown; message?: unknown }
  if (navigationError.code === 'ERR_ABORTED' || navigationError.errno === -3) return true

  return (
    typeof navigationError.message === 'string' &&
    /(?:^|\s)ERR_ABORTED\s*\(-3\)(?:\s|$)/.test(navigationError.message)
  )
}
