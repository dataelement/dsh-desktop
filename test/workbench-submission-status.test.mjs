import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply } from '../packages/dsh-desktop-workbenches/index.js'
import { pullNumberFrom, readSubmissionStatus } from '../packages/dsh-desktop-workbenches/submission-status.mjs'

afterEach(() => { vi.unstubAllGlobals() })

const LINK = 'https://github.com/dataelement/awesome-dsh-workbench/pull/12'
const pull = (patch = {}) => ({ html_url: LINK, title: 'Add project helper', user: { login: 'author' }, updated_at: '2026-09-21T00:00:00Z', state: 'open', draft: false, merged_at: null, ...patch })
const github = (pullBody, reviews = []) => vi.fn(async (url) => Response.json(url.includes('/reviews') ? reviews : pullBody))

describe('workbench submission status', () => {
  it('accepts only pull requests in the market repository', () => {
    expect(pullNumberFrom(LINK)).toBe(12)
    expect(pullNumberFrom(`${LINK}?w=1`)).toBe(12)
    expect(pullNumberFrom(' https://GitHub.com/dataelement/awesome-dsh-workbench/pull/7/ ')).toBe(7)
    for (const bad of ['https://github.com/other/repo/pull/1', 'https://github.com/dataelement/awesome-dsh-workbench/issues/1', 'http://github.com/dataelement/awesome-dsh-workbench/pull/1', '', undefined]) {
      expect(() => pullNumberFrom(bad)).toThrow(/dataelement\/awesome-dsh-workbench/)
    }
  })

  it('reports merged, closed and draft pull requests without reading reviews', async () => {
    for (const [patch, status] of [[{ merged_at: '2026-09-22T00:00:00Z', state: 'closed' }, 'merged'], [{ state: 'closed' }, 'closed'], [{ draft: true }, 'draft']]) {
      const fetchImpl = github(pull(patch))
      expect(await readSubmissionStatus(LINK, { fetchImpl })).toEqual({ number: 12, url: LINK, title: 'Add project helper', author: 'author', updatedAt: '2026-09-21T00:00:00Z', status })
      expect(fetchImpl).toHaveBeenCalledTimes(1)
    }
  })

  it('counts a change request only while it is the reviewer\'s latest word', async () => {
    const changes = { user: { login: 'maintainer' }, state: 'CHANGES_REQUESTED' }
    const approved = { user: { login: 'maintainer' }, state: 'APPROVED' }
    const comment = { user: { login: 'other' }, state: 'COMMENTED' }
    expect((await readSubmissionStatus(LINK, { fetchImpl: github(pull(), [changes, comment]) })).status).toBe('changes-requested')
    expect((await readSubmissionStatus(LINK, { fetchImpl: github(pull(), [changes, approved]) })).status).toBe('open')
    expect((await readSubmissionStatus(LINK, { fetchImpl: github(pull(), []) })).status).toBe('open')
  })

  it('explains missing pull requests and GitHub rate limits', async () => {
    await expect(readSubmissionStatus(LINK, { fetchImpl: async () => new Response('', { status: 404 }) })).rejects.toThrow('not found')
    await expect(readSubmissionStatus(LINK, { fetchImpl: async () => new Response('', { status: 403 }) })).rejects.toThrow(/limiting requests/)
  })

  it('serves the status through the local host without storing it', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-workbench-status-'))
    try {
      const routes = []
      apply({ effect: fn => fn(), inject() {}, reflect: { provide() {} }, connection: { fetch: { register(route) { routes.push(route) } } } }, { root })
      const route = routes.find(value => value.path === '/api/desktop-workbenches/submission-status')
      vi.stubGlobal('fetch', github(pull()))
      const ok = await route.fetch(new Request(`http://localhost/api/desktop-workbenches/submission-status?url=${encodeURIComponent(LINK)}`))
      expect(ok.status).toBe(200)
      expect((await ok.json()).status).toBe('open')
      const bad = await route.fetch(new Request('http://localhost/api/desktop-workbenches/submission-status?url=https%3A%2F%2Fexample.com'))
      expect(bad.status).toBe(400)
      expect(fetch).toHaveBeenCalledTimes(2)
    } finally { await rm(root, { recursive: true, force: true }) }
  })
})
