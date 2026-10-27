import { join } from 'node:path'
import { homedir } from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ReviewEngine, sessionKey } from './engine.mjs'
const exec = promisify(execFile)
export const name = 'dsh-page-review'
export const inject = ['webServer']
const BASE = '/api/page-review'
export function trusted(req) {
  if (
    !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)
  )
    return false
  if (req.headers.forwarded || req.headers['x-forwarded-for']) return false
  let u
  try {
    u = new URL('http://' + req.headers.host)
  } catch {
    return false
  }
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname)) return false
  if (req.headers['sec-fetch-site'] === 'cross-site') return false
  if (req.headers.origin && req.headers.origin !== u.origin) return false
  if (req.method === 'POST' && !req.headers.origin) return false
  return true
}
const json = (res, value, status = 200) => {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(value))
}
export async function bodyOf(req, maxBytes = 128 * 1024) {
  let bytes = 0,
    chunks = []
  for await (const c of req) {
    bytes += c.length
    if (bytes > maxBytes) throw Error('请求过大')
    chunks.push(c)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}
async function discover(hostOrigin) {
  let text = ''
  try {
    text = (
      await exec('/usr/sbin/lsof', ['-nP', '-iTCP', '-sTCP:LISTEN'], {
        timeout: 3000,
        maxBuffer: 512 * 1024,
      })
    ).stdout
  } catch {}
  const ports = [
    ...new Set(
      [...text.matchAll(/:(\d+)\s+\(LISTEN\)/g)].map((m) => Number(m[1])),
    ),
  ]
    .filter((p) => p !== Number(new URL(hostOrigin).port) && p > 1024)
    .slice(0, 48)
  const results = await Promise.all(
    ports.map(async (port) => {
      try {
        const url = `http://127.0.0.1:${port}/`,
          r = await fetch(url, { signal: AbortSignal.timeout(800) })
        if (!r.headers.get('content-type')?.includes('text/html')) {
          await r.body?.cancel()
          return null
        }
        const reader = r.body.getReader()
        let text = ''
        while (text.length < 20000) {
          const { value, done } = await reader.read()
          if (done) break
          text += new TextDecoder().decode(value)
          if (text.includes('</title>')) break
        }
        await reader.cancel()
        return {
          url,
          title: (
            text.match(/<title[^>]*>([^<]*)/i)?.[1] || `本地网页 · ${port}`
          ).trim(),
        }
      } catch {
        return null
      }
    }),
  )
  return results
    .filter(Boolean)
    .sort((a, b) => Number(new URL(a.url).port) - Number(new URL(b.url).port))
}
export function apply(ctx, config = {}) {
  const engine = new ReviewEngine(
    join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'page-review'),
    config,
  )
  ctx.effect(() =>
    ctx.webServer.register({
      kind: 'prefix',
      path: BASE,
      handler: async (req, res) => {
        if (!trusted(req)) {
          json(res, { ok: false, error: '请求来源不可信' }, 403)
          return
        }
        try {
          const origin = 'http://' + req.headers.host,
            url = new URL(req.url, origin),
            route = url.pathname.slice(BASE.length)
          if (req.method === 'GET' && route === '/discover') {
            json(res, { ok: true, value: await discover(origin) })
            return
          }
          if (req.method === 'GET' && route === '/capture') {
            const s = await engine.session(
                sessionKey(url.searchParams.get('session')),
              ),
              c = await engine.capture(s, url.searchParams.get('id'))
            const bytes = Buffer.from(c.data, 'base64')
            res.writeHead(200, {
              'content-type': 'image/jpeg',
              'cache-control': 'private, no-store',
              'content-length': bytes.length,
            })
            res.end(bytes)
            return
          }
          if (req.method === 'GET' && route === '/capture-meta') {
            const s = await engine.session(
                sessionKey(url.searchParams.get('session')),
              ),
              { data, ...capture } = await engine.capture(
                s,
                url.searchParams.get('id'),
              )
            json(res, { ok: true, value: capture })
            return
          }
          if (
            req.method === 'GET' &&
            (route === '/state' || route === '/frame')
          ) {
            const id = sessionKey(url.searchParams.get('session'))
            const value = await engine.run(id, (s) =>
              route === '/state'
                ? engine.state(s)
                : engine.frame(s, url.searchParams.get('tab') || undefined),
            )
            json(res, { ok: true, value })
            return
          }
          if (req.method !== 'POST') {
            json(res, { ok: false, error: '不支持的请求' }, 405)
            return
          }
          const a = await bodyOf(
              req,
              route === '/document-capture' ? 7 * 1024 * 1024 : 128 * 1024,
            ),
            sid = sessionKey(a.session)
          let value
          value = await engine.run(sid, async (s) => {
            if (route === '/browser') return engine.action(s, a, origin)
            if (route === '/document-capture')
              return engine.documentCapture(s, a)
            if (route === '/pick') return engine.pick(s, a)
            if (route === '/hover') return engine.hover(s, a)
            if (route === '/note') return engine.note(s, a)
            if (route === '/prepare') return engine.prepare(s, a.ids)
            if (route === '/ack') return engine.acknowledge(s, a.deliveryId)
            throw Error('未知操作')
          })
          json(res, { ok: true, value })
        } catch (error) {
          if (!res.headersSent)
            json(res, { ok: false, error: error.message || '操作失败' }, 400)
          else res.destroy()
        }
      },
    }),
  )
  ctx.effect(() => () => {
    return engine.close()
  })
}
