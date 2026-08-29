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

interface HarnessCookieStore {
  get(filter: { url: string }): Promise<Array<{ name: string }>>
  remove(url: string, name: string): Promise<void>
}

/**
 * Harness names its browser-session cookie from the request authority, which
 * includes the random port. Cookies themselves are not port-scoped, so every
 * restart otherwise leaves another 30-day cookie for 127.0.0.1 until Chromium
 * eventually sends a header large enough for Node to reject with HTTP 431.
 */
export async function clearStaleHarnessAuthCookies(
  cookies: HarnessCookieStore,
  rendererUrl: string,
  authToken?: string
): Promise<number> {
  if (authToken === undefined) return 0

  let origin: string
  try {
    const parsed = new URL(rendererUrl)
    if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) return 0
    origin = `${parsed.origin}/`
  } catch {
    return 0
  }

  const stale = (await cookies.get({ url: origin })).filter(({ name }) =>
    name.startsWith('dsh-auth-')
  )
  await Promise.all(stale.map(({ name }) => cookies.remove(origin, name)))
  return stale.length
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
