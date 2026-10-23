import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { RepairAgentService, type RepairEnvironment } from '../src/main/repair-agent'

const directories: string[] = []
afterEach(async () => { vi.unstubAllGlobals(); await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))) })

it('persists normal/safe sessions separately and restores a cold session after both processes restart', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'repair-session-'))
  directories.push(directory)
  const sessions: Array<{ sessionId: string; agentPreset: string }> = []
  const prompts: string[] = []
  let rosterReads = 0
  let environment: RepairEnvironment = 'safe'
  vi.stubGlobal('fetch', vi.fn(async (url: URL | string, init?: RequestInit) => {
    const endpoint = new URL(String(url)).pathname.replace('/api/', '')
    if (endpoint === '/') return new Response(null, { status: 302, headers: { 'set-cookie': 'sid=1; Path=/' } })
    const args = JSON.parse(String(init?.body)).payload.args
    let value: unknown = {}
    if (endpoint === 'workspace/create') value = { workspaceId: 'repair-workspace' }
    if (endpoint === 'session/create') {
      const session = { sessionId: `repair-${sessions.length + 1}`, agentPreset: args.request.agentPreset }
      sessions.push(session); value = session
    }
    if (endpoint === 'session/projections') { rosterReads++; value = { kind: 'sequenced', values: { agentPreset: sessions.find(session => session.sessionId === args.request.sessionId)?.agentPreset } } }
    if (endpoint === 'session/prompt') prompts.push(args.request.content[0].text)
    return Response.json({ result: { ok: true, value } })
  }))
  const service = () => new RepairAgentService({
    sessionStateDirectory: directory, environment: () => environment,
    harnessUrl: () => 'http://127.0.0.1:1', harnessAuthToken: () => 'new-runtime-token',
    ensureHarnessReady: async () => {}, workspaceDirectory: '/data/harness', locale: () => 'en'
  })
  const first = service()
  const safe = await first.initSession()
  await first.sendPrompt(safe.sessionId!, 'initial diagnostic')
  environment = 'normal'
  const normal = await first.initSession()
  expect(normal.sessionId).not.toBe(safe.sessionId)
  first.dispose()
  const restarted = service()
  expect(await restarted.initSession()).toMatchObject({ sessionId: normal.sessionId, created: false, needsBriefing: true })
  environment = 'safe'
  expect(await restarted.initSession()).toMatchObject({ sessionId: safe.sessionId, created: false, needsBriefing: false })
  await restarted.sendPrompt(safe.sessionId!, 'restart verification still failed')
  expect(prompts[1]).toBe('restart verification still failed')
  expect(sessions).toHaveLength(2)
  expect(rosterReads).toBe(2)
  const state = JSON.parse(await readFile(join(directory, 'repair-agent-sessions.json'), 'utf8'))
  expect(state.safe.sessionId).toBe(safe.sessionId)
  expect(state.normal.sessionId).toBe(normal.sessionId)
  await restarted.completeStartupRepair()
  const nextIncident = await restarted.initSession()
  expect(nextIncident).toMatchObject({ created: true, needsBriefing: true })
  expect(nextIncident.sessionId).not.toBe(safe.sessionId)
  environment = 'normal'
  expect((await restarted.initSession()).sessionId).toBe(normal.sessionId)
})

it('does not discard a saved repair conversation when the cold roster cannot be read', async () => {
  let calls = 0
  vi.stubGlobal('fetch', vi.fn(async (url: URL | string) => {
    const endpoint = new URL(String(url)).pathname.replace('/api/', '')
    if (endpoint === '/') return new Response(null, { status: 302, headers: { 'set-cookie': 'sid=1; Path=/' } })
    if (endpoint === 'session/projections') throw new Error('temporary connection loss')
    if (endpoint === 'session/create') calls++
    return Response.json({ result: { ok: true, value: endpoint === 'session/create' ? { sessionId: 'repair-one' } : { workspaceId: 'w1' } } })
  }))
  let token = 'before'
  const service = new RepairAgentService({ harnessUrl: () => 'http://127.0.0.1:1', harnessAuthToken: () => token,
    ensureHarnessReady: async () => {}, workspaceDirectory: '/data/harness', locale: () => 'en' })
  expect((await service.initSession()).ok).toBe(true)
  token = 'after'
  expect(await service.initSession()).toMatchObject({ ok: false, error: 'temporary connection loss' })
  expect(calls).toBe(1)
})

it('can retry reading session state after a failed write is repaired', async () => {
  const { RepairSessionStore } = await import('../src/main/state/repair-agent-sessions')
  const home = await mkdtemp(join(tmpdir(), 'repair-store-retry-'))
  directories.push(home)
  const directory = join(home, 'state')
  await writeFile(directory, 'not a directory')
  const store = new RepairSessionStore(directory)
  await expect(store.save('safe', { sessionId: 'repair-1', briefed: false })).rejects.toThrow()
  await rm(directory)
  await mkdir(directory)
  expect(await store.load('safe')).toBeUndefined()
  await store.save('safe', { sessionId: 'repair-1', briefed: false })
  expect(await store.load('safe')).toMatchObject({ sessionId: 'repair-1' })
})
