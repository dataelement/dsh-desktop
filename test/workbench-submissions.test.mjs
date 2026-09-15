import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { afterEach, describe, expect, it } from 'vitest'
import { apply } from '../packages/dsh-desktop-workbenches/index.js'
import { createSubmissionStore, MAX_SCREENSHOT_BYTES, MAX_SUBMISSION_BYTES } from '../packages/dsh-desktop-workbenches/submissions.mjs'

const roots = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'dsh-workbench-submissions-'))
  roots.push(root)
  return { root, store: createSubmissionStore(root) }
}
const png = bytes => `data:image/png;base64,${Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(bytes)]).toString('base64')}`
const packageBytes = () => { const tar = Buffer.alloc(1024); tar.write('ustar', 257, 'ascii'); return gzipSync(tar) }
const packageUrl = () => `data:application/gzip;base64,${packageBytes().toString('base64')}`
const valid = (patch = {}) => ({
  title: 'Research Desk',
  description: 'A focused workbench for evidence.\nSupports research notes.',
  author: 'Ada',
  repository: 'https://github.com/Example/Research-Desk.git/',
  screenshot: png(12),
  ...patch
})

describe('desktop workbench community submissions', () => {
  it('serves the bundled development guide to the local Agent', async () => {
    const { root } = await fixture()
    const routes = []
    apply({ connection: { fetch: { register(route) { routes.push(route) } } } }, { root })
    const route = routes.find(value => value.path === '/api/desktop-workbenches/development-guide')
    const response = await route.fetch(new Request('http://localhost/api/desktop-workbenches/development-guide'))
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/markdown')
    expect(await response.text()).toContain('# DSH Desktop 工作台开发指南')
  })
  it('accepts a GitHub-free workbench package and keeps its binary outside the market JSON', async () => {
    const { root, store } = await fixture()
    const created = await store.create(valid({ repository: undefined, screenshot: undefined, package: packageUrl() }))
    expect(created.repository).toBeNull()
    expect(created.packageSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(await readFile(join(root, `${created.id}.tgz`))).toEqual(packageBytes())
    expect(await createSubmissionStore(root).read()).toEqual([created])
    const metadata = await readFile(join(root, 'submissions.json'), 'utf8')
    expect(metadata).not.toContain('base64')
  })
  it('normalizes, persists and restores a pending submission without changing state v1', async () => {
    const { root, store } = await fixture()
    await writeFile(join(root, 'state.json'), '{"revision":0,"state":{"version":1}}')
    const created = await store.create(valid())
    expect(created).toMatchObject({
      title: 'Research Desk', author: 'Ada', repository: 'https://github.com/Example/Research-Desk', status: 'pending'
    })
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(Number.isNaN(Date.parse(created.createdAt))).toBe(false)
    expect(await createSubmissionStore(root).read()).toEqual([created])
    expect(await readFile(join(root, 'state.json'), 'utf8')).toBe('{"revision":0,"state":{"version":1}}')
    expect((await readdir(root)).sort()).toEqual(['state.json', 'submissions.json'])
  })

  it('serializes concurrent submissions and rejects duplicate repositories case-insensitively', async () => {
    const { store } = await fixture()
    const results = await Promise.allSettled([
      store.create(valid({ screenshot: undefined })),
      store.create(valid({ title: 'Duplicate', repository: 'https://github.com/example/research-desk' }))
    ])
    expect(results.map(result => result.status)).toEqual(['fulfilled', 'rejected'])
    expect(results[1].reason).toMatchObject({ status: 409 })
    expect(await store.read()).toHaveLength(1)
  })

  it.each([
    [{}, 400],
    [valid({ title: ' ' }), 400],
    [valid({ author: 'a'.repeat(81) }), 400],
    [valid({ repository: 'http://github.com/a/b' }), 400],
    [valid({ repository: 'https://gitlab.com/a/b' }), 400],
    [valid({ repository: 'https://github.com/a/b/issues' }), 400],
    [valid({ repository: undefined, package: 'data:application/gzip;base64,ZmFrZQ==' }), 400],
    [valid({ repository: undefined }), 400],
    [valid({ extra: true }), 400],
    [valid({ screenshot: 'data:image/png;base64,ZmFrZQ==' }), 400],
    [valid({ screenshot: 'data:image/gif;base64,R0lGODlh' }), 400],
    [valid({ screenshot: png(MAX_SCREENSHOT_BYTES) }), 413]
  ])('rejects invalid input without writing: %#', async (payload, status) => {
    const { root, store } = await fixture()
    await expect(Promise.resolve().then(() => store.create(payload))).rejects.toMatchObject({ status })
    expect(await readdir(root)).toEqual([])
  })

  it('does not overwrite corrupt stored submissions', async () => {
    const { root, store } = await fixture()
    await writeFile(join(root, 'submissions.json'), '{broken')
    await expect(store.read()).rejects.toMatchObject({ status: 500 })
    await expect(store.create(valid())).rejects.toMatchObject({ status: 500 })
    expect(await readFile(join(root, 'submissions.json'), 'utf8')).toBe('{broken')
  })

  it('registers GET/POST with no-store responses and enforces buffered request limits', async () => {
    const { root } = await fixture()
    const routes = []
    apply({ connection: { fetch: { register(route) { routes.push(route) } } } }, { root })
    const route = routes.find(value => value.path === '/api/desktop-workbenches/submissions')
    expect(route).toMatchObject({ methods: ['GET', 'POST'], requestBody: 'buffered' })
    const url = `http://localhost${route.path}`
    const initial = await route.fetch(new Request(url))
    expect(initial.headers.get('cache-control')).toBe('no-store')
    expect(await initial.json()).toEqual({ submissions: [] })
    const post = body => route.fetch(new Request(url, { method: 'POST', body }))
    expect((await post('{bad')).status).toBe(400)
    expect((await post('null')).status).toBe(400)
    const accepted = await post(JSON.stringify(valid()))
    expect(accepted.status).toBe(201)
    expect((await accepted.json()).submission.status).toBe('pending')
    const oversized = await route.fetch(new Request(url, {
      method: 'POST', body: '{}', headers: { 'content-length': String(MAX_SUBMISSION_BYTES + 1) }
    }))
    expect(oversized.status).toBe(413)
    let cancelled = false
    const stream = new ReadableStream({
      pull(controller) { controller.enqueue(new Uint8Array(512 * 1024)) },
      cancel() { cancelled = true }
    })
    const streamed = await route.fetch(new Request(url, { method: 'POST', body: stream, duplex: 'half' }))
    expect(streamed.status).toBe(413)
    expect(cancelled).toBe(true)
  })
})
