import { readFile } from 'node:fs/promises'
import { extname, relative, resolve, sep } from 'node:path'

const MIME: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
}

const BOOT = '<script>globalThis.__DSH_BOOT_READY__ = Promise.withResolvers()</script>'

const WITHHELD_RESPONSE_HEADERS = [
  'set-cookie',
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'te',
  'trailer',
  'upgrade',
  'proxy-authenticate',
  'proxy-authorization'
]

const PLUGIN_BUNDLE_PATH = /^\/plugins\//u
const STATIC_DOCUMENT = /^\/(?:|index\.html|favicon\.svg|manifest\.webmanifest|assets\/.+)$/u

export interface AppDocumentTarget {
  frontendRoot: string
  hostUrl?: string
  cookie?: string
}

/** Serve a static app document, or refuse to proxy until the shell holds a Host cookie. */
export function dispatchAppDocument(request: Request, target: AppDocumentTarget): Promise<Response> {
  const url = new URL(request.url)
  if (url.hostname !== 'app') return Promise.resolve(new Response(null, { status: 404 }))
  if (STATIC_DOCUMENT.test(url.pathname)) return serveWebDocument(request, target.frontendRoot)
  if (target.hostUrl === undefined || target.cookie === undefined || target.cookie.length === 0) {
    return Promise.resolve(new Response(null, { status: 503 }))
  }
  return forwardWebRequest(request, target.hostUrl, target.cookie)
}

/** Read one application-owned static file. The index waits for Host injections. */
export async function serveWebDocument(request: Request, root: string): Promise<Response> {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405 })
  const url = new URL(request.url)
  const relativePath = documentPath(url.pathname)
  if (relativePath === undefined) return new Response(null, { status: 400 })
  const directory = resolve(root)
  const target = resolve(directory, relativePath)
  if (!isInsideDirectory(directory, target)) return new Response(null, { status: 403 })
  let body: Buffer
  try {
    body = await readFile(target)
  } catch (error) {
    if (isNotFound(error)) return new Response(null, { status: 404 })
    throw error
  }
  const content = relativePath === 'index.html'
    ? body.toString().replace('<head>', `<head>${BOOT}`)
    : new Uint8Array(body)
  return new Response(request.method === 'HEAD' ? null : content, {
    headers: { 'content-type': MIME[extname(target)] ?? 'application/octet-stream' }
  })
}

/** Exchange the Host launch URL for the cookie the shell keeps out of the page. */
export async function authenticateWebHost(url: string): Promise<string> {
  const response = await fetch(url, { redirect: 'manual' })
  const cookie = response.headers.get('set-cookie')
  await response.body?.cancel()
  if (response.status !== 303 || cookie === null) throw new Error('Desktop Host authentication failed')
  const end = cookie.indexOf(';')
  return end < 0 ? cookie : cookie.slice(0, end)
}

/**
 * Forward an application-origin request to its authenticated Host.
 * Plugin bundles are `no-store`: the Host marks them immutable under a revision that changes every launch.
 */
export async function forwardWebRequest(request: Request, host: string, cookie: string): Promise<Response> {
  const source = new URL(request.url)
  const origin = request.headers.get('origin')
  if (origin !== null && origin !== 'dsh-app://app') return new Response(null, { status: 403 })
  const target = new URL(host)
  target.pathname = source.pathname
  target.search = source.search
  const headers = new Headers(request.headers)
  for (const name of ['host', 'origin', 'cookie', 'sec-fetch-site']) headers.delete(name)
  headers.set('cookie', cookie)
  // The document origin is dsh-app://app. Host mutation checks compare Origin
  // with their own loopback host, the same rewrite the socket path already does.
  if (origin === 'dsh-app://app') headers.set('origin', target.origin)
  const init: RequestInit & { duplex: 'half' } = {
    method: request.method,
    headers,
    body: request.body,
    signal: request.signal,
    duplex: 'half',
    redirect: 'manual'
  }
  const response = await fetch(target, init)
  const outgoing = new Headers(response.headers)
  for (const name of WITHHELD_RESPONSE_HEADERS) outgoing.delete(name)
  if (PLUGIN_BUNDLE_PATH.test(source.pathname)) outgoing.set('cache-control', 'no-store')
  return new Response(response.body, { status: response.status, headers: outgoing })
}

function documentPath(pathname: string): string | undefined {
  if (/%(?:2f|5c|25)/i.test(pathname)) return undefined
  let path: string
  try {
    path = decodeURIComponent(pathname)
  } catch {
    return undefined
  }
  if (path.includes('\\') || path.includes('\0') || path.split('/').some(part => part === '.' || part === '..')) return undefined
  if (path === '/' || path === '/index.html') return 'index.html'
  if (path.startsWith('/') && path.length > 1 && !path.includes('//') && !path.includes(':')) return path.slice(1)
  return undefined
}

function isInsideDirectory(directory: string, target: string): boolean {
  const relativePath = relative(directory, target)
  return relativePath !== '' && relativePath !== '..' && !relativePath.startsWith(`..${sep}`)
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}
