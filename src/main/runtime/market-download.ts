import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'

const hosts = new Set(['raw.githubusercontent.com', 'codeload.github.com', 'github.com', 'objects.githubusercontent.com', 'release-assets.githubusercontent.com', 'market.dshdesktop.com'])
export function allowedMarketDownload(value: string): boolean {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.port && hosts.has(url.hostname) } catch { return false }
}

/** Narrow GET-only bridge to Chromium networking, which respects system proxy settings. */
export async function startMarketDownload(request: typeof fetch) {
  const token = randomBytes(32).toString('hex')
  const server = createServer(async (req, res) => {
    if (req.method !== 'GET' || req.headers.authorization !== `Bearer ${token}`) { res.writeHead(403).end(); return }
    let url = new URL(req.url || '/', 'http://localhost').searchParams.get('url') || ''
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)
    try {
      let response: Response | undefined
      for (let hop = 0; hop < 6; hop++) {
        if (!allowedMarketDownload(url)) { res.writeHead(400).end(); return }
        response = await request(url, { method: 'GET', redirect: 'manual', credentials: 'omit', signal: controller.signal })
        if (![301, 302, 303, 307, 308].includes(response.status)) break
        const location = response.headers.get('location')
        await response.body?.cancel()
        if (!location) throw new Error('Invalid redirect')
        url = new URL(location, url).href
        response = undefined
      }
      if (!response) throw new Error('Too many redirects')
      const chunks: Uint8Array[] = []
      let length = 0
      if (response.body) {
        const reader = response.body.getReader()
        try {
          while (true) {
            const part = await reader.read()
            if (part.done) break
            length += part.value.length
            if (length > 64 * 1024 * 1024) { await reader.cancel(); throw new Error('Download too large') }
            chunks.push(part.value)
          }
        } finally { reader.releaseLock() }
      }
      res.writeHead(response.status, { 'content-type': response.headers.get('content-type') || 'application/octet-stream', 'cache-control': 'no-store' })
      res.end(Buffer.concat(chunks))
    } catch (error) { console.warn('[market-download]', error instanceof Error ? error.name + ': ' + error.message.replace(/https?:\/\/\S+/g, '[url]') : 'Download failed'); if (!res.headersSent) res.writeHead(502); res.end('Market download failed') }
    finally { clearTimeout(timeout) }
  })
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  server.unref()
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Market download bridge unavailable')
  return { url: `http://127.0.0.1:${address.port}/`, token, close: () => server.close() }
}
