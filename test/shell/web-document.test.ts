import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { authenticateWebHost, dispatchAppDocument, forwardWebRequest, serveWebDocument } from '../../src/main/shell/window/web-document'
import { resolveDesktopPaths } from '../../src/main/shell/paths'
import { desktopErrorState } from '../../src/main/shell/backend/startup-error'
import { readDesktopHostEvent } from '../../src/main/shell/backend/host-process'

const temporary: string[] = []
const originalFetch = globalThis.fetch

afterEach(async () => {
  globalThis.fetch = originalFetch
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('shell document and paths', () => {
  it('keeps the profile under the supplied home', () => {
    const paths = resolveDesktopPaths('/tmp/dsh-home')
    expect(paths.profile).toBe(join('/tmp/dsh-home', 'profiles', 'desktop'))
    expect(paths.lock).toBe(join('/tmp/dsh-home', 'profiles', 'desktop', 'lock'))
  })

  it('serves the index with the boot hook and rejects parent paths', async () => {
    const root = await mkdtemp(join(tmpdir(), 'shell-web-'))
    temporary.push(root)
    await writeFile(join(root, 'index.html'), '<head><title>DSH</title>')
    const index = await serveWebDocument(new Request('dsh-app://app/'), root)
    expect(index.status).toBe(200)
    expect(await index.text()).toContain('__DSH_BOOT_READY__')
    const escaped = await serveWebDocument(new Request('dsh-app://app/foo:bar'), root)
    expect(escaped.status).toBe(400)
    const missing = await serveWebDocument(new Request('dsh-app://app/missing.js'), root)
    expect(missing.status).toBe(404)
  })

  it('keeps only the host cookie name and value', async () => {
    globalThis.fetch = (async () => new Response(null, {
      status: 303,
      headers: { 'set-cookie': 'dsh=token; HttpOnly; Path=/' }
    })) as typeof fetch
    await expect(authenticateWebHost('http://127.0.0.1:9/')).resolves.toBe('dsh=token')
  })

  it('refuses a foreign origin and drops the host set-cookie', async () => {
    const foreign = await forwardWebRequest(new Request('dsh-app://app/api', { headers: { origin: 'https://example.test' } }), 'http://127.0.0.1:9/', 'dsh=token')
    expect(foreign.status).toBe(403)
    globalThis.fetch = (async (_input, init) => {
      const headers = new Headers(init?.headers)
      expect(headers.get('cookie')).toBe('dsh=token')
      expect(headers.get('origin')).toBeNull()
      return new Response('ok', { headers: { 'set-cookie': 'dsh=token', 'content-type': 'text/plain' } })
    }) as typeof fetch
    const response = await forwardWebRequest(new Request('dsh-app://app/plugins/app.js', { headers: { origin: 'dsh-app://app' } }), 'http://127.0.0.1:9/', 'dsh=token')
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('keeps every nested failure message', () => {
    const error = new AggregateError([new Error('inner')], 'outer')
    expect(desktopErrorState(error).message).toContain('inner')
  })

  it('refuses to proxy an application request before the shell has a host cookie', async () => {
    let called = false
    globalThis.fetch = (() => { called = true; return Promise.resolve(new Response()) }) as typeof fetch
    const response = await dispatchAppDocument(new Request('dsh-app://app/api/session'), { frontendRoot: '/unused' })
    expect(response.status).toBe(503)
    expect(called).toBe(false)
  })

  it('rejects a host event without the lifecycle type', () => {
    expect(readDesktopHostEvent({ type: 'ready' })).toBeUndefined()
    expect(readDesktopHostEvent({ type: 'ready', url: 'http://127.0.0.1:9/' })?.type).toBe('ready')
    expect(readDesktopHostEvent({ type: 'fatal', message: 'stopped', diagnostic: 'activate failed' })).toEqual({
      type: 'fatal', message: 'stopped', diagnostic: 'activate failed'
    })
    expect(readDesktopHostEvent({ type: 'starting', runId: 'not-a-uuid' })).toBeUndefined()
  })
})
