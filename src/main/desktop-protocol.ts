import { protocol } from 'electron'
import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'

/**
 * `dsh-desktop://desktop/<name>` serves the desktop's own pages (the ones in
 * `build/`) on a real origin, so the Harness page can frame them. `file:` is
 * not embeddable from an http page, and a native view over the window would
 * paint above every Harness modal.
 */
export const DESKTOP_SCHEME = 'dsh-desktop'
export const DESKTOP_HOST = 'desktop'
export const SAFE_MODE_PAGE = 'safe-mode.html'

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif'
}

/**
 * The resource a desktop URL asks for: one path segment with a servable
 * extension, or undefined for anything else (another scheme or host, a nested
 * path, traversal, an unknown type).
 */
export function resolveDesktopResourceName(rawUrl: string): string | undefined {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return undefined
  }
  if (url.protocol !== `${DESKTOP_SCHEME}:` || url.host !== DESKTOP_HOST) return undefined
  let name: string
  try {
    name = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
  } catch {
    return undefined
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*(\.[A-Za-z0-9_-]+)*$/.test(name)) return undefined
  return extname(name) in CONTENT_TYPES ? name : undefined
}

export function desktopResourceUrl(name: string, query: Record<string, string> = {}): string {
  const url = new URL(`${DESKTOP_SCHEME}://${DESKTOP_HOST}/${name}`)
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
  return url.href
}

/** Must run before the app is ready. */
export function registerDesktopScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: DESKTOP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }
  ])
}

/** Runs once the app is ready; `resolvePath` maps a resource name to its file. */
export function installDesktopProtocol(resolvePath: (name: string) => string): void {
  protocol.handle(DESKTOP_SCHEME, async (request) => {
    const name = resolveDesktopResourceName(request.url)
    if (!name) return new Response('Not found', { status: 404 })
    try {
      const body = await readFile(resolvePath(name))
      return new Response(body, { headers: { 'content-type': CONTENT_TYPES[extname(name)] ?? 'application/octet-stream' } })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}
