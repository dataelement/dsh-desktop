import { readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
import { projectRoot } from './patch-path'
// @ts-expect-error Local host plugins are authored as ESM JavaScript.
import * as accounts from '../packages/dsh-desktop-multi-account/accounts.mjs'
// @ts-expect-error Local host plugins are authored as ESM JavaScript.
import { apply as applyHost } from '../packages/dsh-desktop-multi-account/index.js'

const NOW = '2026-10-26T10:00:00.000Z'
const flush = async (rounds = 12) => {
  for (let i = 0; i < rounds; i += 1) await new Promise((resolve) => setImmediate(resolve))
}

// --------------------------------------------------------------- pure logic

describe('multi-account pure logic', () => {
  it('derives credential references like the Models page', () => {
    expect(accounts.deriveKeyRef('openrouter')).toBe('OPENROUTER_API_KEY')
    expect(accounts.deriveKeyRef('minimax-cn')).toBe('MINIMAX_CN_API_KEY')
    // Route ids are slugs in practice; the rule itself is upstream's verbatim.
    expect(accounts.deriveKeyRef('kilo-gateway')).toBe('KILO_GATEWAY_API_KEY')
  })

  it('sanitizes untrusted state without inventing credentials', () => {
    expect(accounts.sanitizeState(undefined)).toEqual({ version: 1, providers: {} })
    expect(accounts.sanitizeState({ version: 99, providers: {} })).toEqual({ version: 1, providers: {} })
    const cleaned = accounts.sanitizeState({
      version: 1,
      providers: {
        good: {
          strategy: 'nonsense',
          activeId: 'missing',
          accounts: [
            { id: 'a', label: ' A ', apiKey: ' key-a ', enabled: true, createdAt: NOW },
            { id: 'a', label: 'dup id', apiKey: 'key-b' },
            { id: 'c', label: 'dup key', apiKey: 'key-a' },
            { id: 'd', label: 'blank', apiKey: '   ' },
            'garbage'
          ]
        },
        empty: { strategy: 'manual', activeId: null, accounts: [] }
      }
    })
    expect(Object.keys(cleaned.providers)).toEqual(['good'])
    expect(cleaned.providers.good.strategy).toBe('manual')
    expect(cleaned.providers.good.activeId).toBeNull()
    expect(cleaned.providers.good.accounts).toHaveLength(1)
    expect(cleaned.providers.good.accounts[0]).toMatchObject({ id: 'a', label: 'A', apiKey: 'key-a' })
  })

  it('adds accounts, activates the first, and rejects duplicate keys', () => {
    const state = accounts.emptyState()
    const first = accounts.addAccount(state, 'openrouter', { label: 'Work', apiKey: 'sk-1' }, { id: 'id-1', now: NOW })
    accounts.addAccount(state, 'openrouter', { label: 'Spare', apiKey: 'sk-2' }, { id: 'id-2', now: NOW })
    expect(state.providers.openrouter.activeId).toBe(first.id)
    expect(() => accounts.addAccount(state, 'openrouter', { apiKey: ' sk-1 ' }, { id: 'id-3', now: NOW }))
      .toThrow(expect.objectContaining({ code: 'duplicate-key' }))
    expect(() => accounts.addAccount(state, 'openrouter', { apiKey: 'has space' }, { id: 'id-4', now: NOW }))
      .toThrow(expect.objectContaining({ code: 'invalid-key' }))
    expect(() => accounts.addAccount(state, 'openrouter', { apiKey: '' }, { id: 'id-5', now: NOW }))
      .toThrow(expect.objectContaining({ code: 'invalid-key' }))
  })

  it('moves activeness by list position on disable and remove', () => {
    const state = accounts.emptyState()
    for (const [id, key] of [['a', 'k-a'], ['b', 'k-b'], ['c', 'k-c']] as const) {
      accounts.addAccount(state, 'p', { apiKey: key }, { id, now: NOW })
    }
    accounts.setActiveAccount(state, 'p', 'b')
    accounts.updateAccount(state, 'p', 'b', { enabled: false })
    // Successor of b by position is c, not the head of the list.
    expect(state.providers.p.activeId).toBe('c')
    accounts.removeAccount(state, 'p', 'c')
    expect(state.providers.p.activeId).toBe('a')
    accounts.removeAccount(state, 'p', 'a')
    accounts.removeAccount(state, 'p', 'b')
    expect(state.providers.p).toBeUndefined()
  })

  it('activating a disabled account enables it', () => {
    const state = accounts.emptyState()
    accounts.addAccount(state, 'p', { apiKey: 'k-a' }, { id: 'a', now: NOW })
    accounts.addAccount(state, 'p', { apiKey: 'k-b' }, { id: 'b', now: NOW })
    accounts.updateAccount(state, 'p', 'b', { enabled: false })
    accounts.setActiveAccount(state, 'p', 'b')
    expect(state.providers.p.accounts[1]?.enabled).toBe(true)
    expect(state.providers.p.activeId).toBe('b')
  })

  it('walks successors with wrap-around, exclusions, and disabled skipped', () => {
    const state = accounts.emptyState()
    for (const [id, key] of [['a', 'k-a'], ['b', 'k-b'], ['c', 'k-c']] as const) {
      accounts.addAccount(state, 'p', { apiKey: key }, { id, now: NOW })
    }
    accounts.updateAccount(state, 'p', 'b', { enabled: false })
    const provider = state.providers.p
    expect(accounts.nextEnabledAfter(provider, 'a')?.id).toBe('c')
    expect(accounts.nextEnabledAfter(provider, 'c')?.id).toBe('a')
    expect(accounts.nextEnabledAfter(provider, 'a', new Set(['c']))).toBeUndefined()
    expect(accounts.nextEnabledAfter(provider, null)?.id).toBe('a')
  })

  it('classifies account-terminal failures as switchable', () => {
    for (const code of ['AUTH', 'FORBIDDEN', 'QUOTA', 'ACCOUNT_QUOTA', 'RATE_LIMIT', 'INVALID_CREDENTIAL', 'MISSING_CREDENTIAL']) {
      expect(accounts.isSwitchableFailure({ code })).toBe(true)
    }
    for (const status of [401, 402, 403, 429]) {
      expect(accounts.isSwitchableFailure({ code: 'PI_AI_ERROR', status })).toBe(true)
    }
    for (const code of ['INVALID_REQUEST', 'SERVER', 'TIMEOUT', 'TRANSPORT', 'EMPTY_RESPONSE', 'CONTEXT_WINDOW_EXCEEDED']) {
      expect(accounts.isSwitchableFailure({ code })).toBe(false)
    }
    expect(accounts.isSwitchableFailure(undefined)).toBe(false)
    expect(accounts.isSwitchableFailure({})).toBe(false)
  })

  it('projects a redacted view without secret material', () => {
    const state = accounts.emptyState()
    accounts.addAccount(state, 'p', { label: 'Work', apiKey: 'sk-secret-123' }, { id: 'a', now: NOW })
    const view = accounts.providerView('p', state.providers.p, {
      displayName: 'P',
      settingsNs: 'llm-pi-ai',
      manageable: true,
      credentialRef: 'P_API_KEY',
      importable: false
    })
    const serialized = JSON.stringify(view)
    expect(serialized).not.toContain('sk-secret-123')
    expect(view.accounts[0]?.fingerprint).toBe(accounts.keyFingerprint('sk-secret-123'))
    expect(view.accounts[0]?.fingerprint).toHaveLength(10)
  })
})

// ------------------------------------------------------------ host behavior

interface Chunk { type: string;[key: string]: unknown }

const usage = (): Chunk => ({ type: 'usage', usage: { inputTokens: 1, outputTokens: 1 } })
const finishStop = (): Chunk => ({ type: 'finish', reason: { kind: 'stop' } })
const finishError = (code: string, status?: number): Chunk => ({
  type: 'finish',
  reason: { kind: 'error', failure: { code, message: code, ...(status === undefined ? {} : { status }) } }
})
const textDelta = (text: string): Chunk => ({ type: 'text-delta', index: 0, text })
const blockStart = (): Chunk => ({ type: 'block-start', index: 0, blockType: 'text' })

class FakeCredentials {
  refs = new Map<string, string>()
  records = new Map<string, { kind: string; payload?: unknown }>()
  setCalls: Array<[string, string]> = []

  async resolve(ref: string) {
    const value = this.refs.get(ref)
    return value === undefined ? undefined : { value, source: 'stored' }
  }

  async describe(ref: string) {
    return { configured: this.refs.has(ref), writable: true }
  }

  async set(ref: string, value: string) {
    this.setCalls.push([ref, value])
    this.refs.set(ref, value)
  }

  async unset(ref: string) {
    this.refs.delete(ref)
  }

  async readRecord(key: string) {
    return this.records.get(key)
  }

  async modifyRecord(key: string, mutate: (current: unknown) => Promise<unknown>) {
    const next = await mutate(this.records.get(key))
    if (next !== undefined) this.records.set(key, next as { kind: string })
    return this.records.get(key)
  }
}

// `settings.describe()` returns schemastery's serialized form: a
// `{ uid, refs }` envelope with numeric cross-references. Mirror that for
// pi-ai; exercise the live callable-node representation for deepseek.
const schemaNode = (shape: Record<string, unknown>): unknown => Object.assign(() => undefined, shape)
const PI_AI_SCHEMA = {
  uid: 4,
  refs: {
    1: { type: 'string', meta: { role: 'credential-ref' } },
    2: { type: 'object', meta: {}, dict: { apiKeyEnv: 1, baseURL: 1 } },
    3: { type: 'dict', meta: {}, inner: 2, sKey: 1 },
    4: { type: 'object', meta: {}, dict: { providers: 3 } }
  }
}
const DEEPSEEK_SCHEMA = schemaNode({
  type: 'object',
  dict: { apiKeyEnv: schemaNode({ type: 'string' }), baseURL: schemaNode({ type: 'string' }) }
})
const ACCOUNT_SCHEMA = { type: 'object', dict: { modelsTimeoutMs: { type: 'number' } } }

interface Descriptor {
  ns: string
  revision: number
  value: Record<string, unknown>
  schema: unknown
}

function createHost(shared?: { credentials: FakeCredentials }) {
  const credentials = shared?.credentials ?? new FakeCredentials()
  const descriptors: Descriptor[] = [
    {
      ns: 'llm-pi-ai',
      revision: 1,
      value: { providers: { openrouter: { baseURL: 'https://openrouter.ai/api/v1' } } },
      schema: PI_AI_SCHEMA
    },
    { ns: 'llm-deepseek', revision: 1, value: { apiKeyEnv: 'DEEPSEEK_API_KEY' }, schema: DEEPSEEK_SCHEMA },
    { ns: 'llm-deepseek-account', revision: 1, value: {}, schema: ACCOUNT_SCHEMA }
  ]
  const mutateCalls: Array<{ ns: string; ops: unknown[] }> = []
  const settings = {
    describe: () => descriptors.map((d) => ({ ...d, value: structuredClone(d.value) })),
    mutate: async (ns: string, ops: Array<{ op: string; path: string[]; value?: unknown }>) => {
      mutateCalls.push({ ns, ops: structuredClone(ops) as unknown[] })
      const descriptor = descriptors.find((d) => d.ns === ns)
      if (!descriptor) throw new Error(`unknown namespace ${ns}`)
      for (const op of ops) {
        if (op.op !== 'set') continue
        let target: Record<string, unknown> = descriptor.value
        for (const segment of op.path.slice(0, -1)) {
          target[segment] = (target[segment] as Record<string, unknown>) ?? {}
          target = target[segment] as Record<string, unknown>
        }
        target[op.path[op.path.length - 1] as string] = op.value
      }
      descriptor.revision += 1
    }
  }
  const llm = {
    listConfigurableProviders: () => [
      // The real pi-ai directory shape: env fallback named via nativeAuth.
      {
        provider: 'openrouter',
        displayName: 'OpenRouter',
        settingsNs: 'llm-pi-ai',
        settingsPath: ['providers', 'openrouter'],
        nativeAuth: { env: ['OPENROUTER_API_KEY'], oauth: false }
      },
      { provider: 'deepseek', displayName: 'DeepSeek', settingsNs: 'llm-deepseek', settingsPath: [] },
      { provider: 'deepseek-account', displayName: 'DeepSeek Account', settingsNs: 'llm-deepseek-account', settingsPath: [] },
      {
        provider: 'codex',
        displayName: 'Codex',
        settingsNs: 'llm-pi-ai',
        settingsPath: ['providers', 'codex'],
        nativeAuth: { env: [], oauth: true }
      },
      {
        provider: 'hybrid',
        displayName: 'Hybrid',
        settingsNs: 'llm-pi-ai',
        settingsPath: ['providers', 'hybrid'],
        nativeAuth: { env: ['HYBRID_API_KEY'], oauth: true }
      }
    ]
  }
  const services: Record<string, unknown> = { credentials, llm, settings }
  const routes = new Map<string, { fetch: (request: Request) => Promise<Response> }>()
  const handlers = new Map<string, Array<(...args: never[]) => unknown>>()
  const ctx = {
    get: (name: string) => services[name],
    inject: (_deps: string[], callback: () => void) => callback(),
    effect: (fn: () => unknown) => {
      fn()
      return () => undefined
    },
    on: (event: string, handler: (...args: never[]) => unknown) => {
      handlers.set(event, [...(handlers.get(event) ?? []), handler])
      return () => undefined
    },
    connection: {
      fetch: {
        register: (route: { path: string; fetch: (request: Request) => Promise<Response> }) => {
          routes.set(route.path, route)
          return async () => undefined
        }
      }
    },
    logger: { warn: vi.fn(), info: vi.fn() }
  }
  ;(applyHost as (c: unknown) => void)(ctx)

  const callRoute = async (path: string, init?: RequestInit) => {
    const route = routes.get(path)
    if (!route) throw new Error(`route not registered: ${path}`)
    return route.fetch(new Request(`http://test${path}`, init))
  }
  const getState = async () => {
    const response = await callRoute('/api/desktop-multi-account/state')
    return response.json() as Promise<{ providers: Array<Record<string, any>> }>
  }
  const mutate = async (body: unknown) => {
    const response = await callRoute('/api/desktop-multi-account/mutate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
    return { status: response.status, payload: (await response.json()) as Record<string, any> }
  }
  const stream = async (provider: string, next: () => AsyncIterable<Chunk>) => {
    const handler = handlers.get('llm/stream')?.[0]
    if (!handler) throw new Error('llm/stream handler not registered')
    const iterable = (handler as (options: unknown, n: typeof next) => AsyncIterable<Chunk>)({ provider, model: 'm' }, next)
    const chunks: Chunk[] = []
    for await (const chunk of iterable) chunks.push(chunk)
    return chunks
  }
  return { credentials, descriptors, mutateCalls, handlers, callRoute, getState, mutate, stream }
}

async function hostWithAccounts(strategy = 'failover') {
  const host = createHost()
  await host.mutate({ action: 'add-account', provider: 'openrouter', label: 'Main', apiKey: 'key-a' })
  await host.mutate({ action: 'add-account', provider: 'openrouter', label: 'Spare', apiKey: 'key-b' })
  if (strategy !== 'manual') await host.mutate({ action: 'set-strategy', provider: 'openrouter', strategy })
  return host
}

const streamOf = (chunks: Chunk[]) => async function* () {
  for (const chunk of chunks) yield chunk
}

describe('multi-account host', () => {
  it('reports manageability from schema and native auth, redacted', async () => {
    const host = createHost()
    const { providers } = await host.getState()
    const byId = new Map(providers.map((p) => [p.provider as string, p]))
    expect(byId.get('openrouter')).toMatchObject({ manageable: true, credentialRef: 'OPENROUTER_API_KEY', settingsNs: 'llm-pi-ai' })
    expect(byId.get('deepseek')).toMatchObject({ manageable: true, credentialRef: 'DEEPSEEK_API_KEY' })
    // OAuth-only and the sign-in route the Models page special-cases stay out.
    expect(byId.get('deepseek-account')).toMatchObject({ manageable: false, unavailableReason: 'oauth-account' })
    expect(byId.get('codex')).toMatchObject({ manageable: false, unavailableReason: 'oauth-account' })
    // OAuth-capable routes with env keys still take API keys, like upstream.
    expect(byId.get('hybrid')).toMatchObject({ manageable: true, credentialRef: 'HYBRID_API_KEY' })
  })

  it('adds accounts, wires apiKeyEnv once, and applies the active key', async () => {
    const host = createHost()
    const first = await host.mutate({ action: 'add-account', provider: 'openrouter', label: 'Work', apiKey: 'key-a' })
    expect(first.status).toBe(200)
    expect(first.payload.provider.accounts).toHaveLength(1)
    expect(JSON.stringify(first.payload)).not.toContain('key-a')
    expect(host.mutateCalls).toEqual([
      { ns: 'llm-pi-ai', ops: [{ op: 'set', path: ['providers', 'openrouter', 'apiKeyEnv'], value: 'OPENROUTER_API_KEY' }] }
    ])
    expect(host.credentials.refs.get('OPENROUTER_API_KEY')).toBe('key-a')

    const second = await host.mutate({ action: 'add-account', provider: 'openrouter', label: 'Spare', apiKey: 'key-b' })
    expect(second.status).toBe(200)
    expect(host.mutateCalls).toHaveLength(1) // already wired; no second settings write
    expect(host.credentials.refs.get('OPENROUTER_API_KEY')).toBe('key-a') // still the active first account

    const spareId = second.payload.provider.accounts[1].id as string
    await host.mutate({ action: 'set-active', provider: 'openrouter', accountId: spareId })
    expect(host.credentials.refs.get('OPENROUTER_API_KEY')).toBe('key-b')

    const record = host.credentials.records.get('dsh-desktop-multi-account/state')
    expect(record?.kind).toBe('grant')
    expect(JSON.stringify(record?.payload)).toContain('key-a') // durable in the credential record only
  })

  it('rejects invalid mutations with coded errors', async () => {
    const host = createHost()
    await host.mutate({ action: 'add-account', provider: 'openrouter', apiKey: 'key-a' })
    const dup = await host.mutate({ action: 'add-account', provider: 'openrouter', apiKey: 'key-a' })
    expect(dup).toMatchObject({ status: 400, payload: { code: 'duplicate-key' } })
    const unknown = await host.mutate({ action: 'add-account', provider: 'nope', apiKey: 'k' })
    expect(unknown).toMatchObject({ status: 404, payload: { code: 'unknown-provider' } })
    const oauth = await host.mutate({ action: 'add-account', provider: 'codex', apiKey: 'k' })
    expect(oauth).toMatchObject({ status: 400, payload: { code: 'provider-not-manageable' } })
    const badType = await host.callRoute('/api/desktop-multi-account/mutate', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: '{}'
    })
    expect(badType.status).toBe(415)
  })

  it('imports the currently stored key without it crossing the wire', async () => {
    const host = createHost()
    host.credentials.refs.set('DEEPSEEK_API_KEY', 'existing-deepseek-key')
    const before = await host.getState()
    expect(before.providers.find((p) => p.provider === 'deepseek')?.importable).toBe(true)
    const result = await host.mutate({ action: 'import-current', provider: 'deepseek', label: 'Imported' })
    expect(result.status).toBe(200)
    expect(result.payload.provider.accounts).toHaveLength(1)
    expect(JSON.stringify(result.payload)).not.toContain('existing-deepseek-key')
    const again = await host.mutate({ action: 'import-current', provider: 'deepseek' })
    expect(again).toMatchObject({ status: 400, payload: { code: 'duplicate-key' } })
  })

  it('passes unmanaged providers through untouched', async () => {
    const host = createHost()
    const chunks = await host.stream('openrouter', () => streamOf([textDelta('hi'), finishStop()])())
    expect(chunks).toEqual([textDelta('hi'), finishStop()])
    expect(host.credentials.setCalls).toEqual([])
  })

  it('fails over invisibly before first content on quota errors', async () => {
    const host = await hostWithAccounts('failover')
    host.credentials.setCalls.length = 0
    let attempts = 0
    const seenKeys: Array<string | undefined> = []
    const chunks = await host.stream('openrouter', () => {
      attempts += 1
      seenKeys.push(host.credentials.refs.get('OPENROUTER_API_KEY'))
      return attempts === 1
        ? streamOf([usage(), finishError('QUOTA', 402)])()
        : streamOf([textDelta('hello'), finishStop()])()
    })
    expect(attempts).toBe(2)
    expect(seenKeys).toEqual(['key-a', 'key-b'])
    // Only the successful attempt reaches the consumer — no usage/error residue.
    expect(chunks).toEqual([textDelta('hello'), finishStop()])

    const { providers } = await host.getState()
    const view = providers.find((p) => p.provider === 'openrouter')
    expect(view?.accounts[0]?.lastError?.code).toBe('QUOTA')
    expect(view?.accounts[1]?.id).toBe(view?.activeId)
    expect(view?.accounts[1]?.lastUsedAt).not.toBeNull()
  })

  it('does not retry request-shape failures', async () => {
    const host = await hostWithAccounts('failover')
    let attempts = 0
    const chunks = await host.stream('openrouter', () => {
      attempts += 1
      return streamOf([usage(), finishError('INVALID_REQUEST', 400)])()
    })
    expect(attempts).toBe(1)
    expect(chunks).toEqual([usage(), finishError('INVALID_REQUEST', 400)])
    expect(host.credentials.refs.get('OPENROUTER_API_KEY')).toBe('key-a')
  })

  it('surfaces every account failing, with the last error preserved', async () => {
    const host = await hostWithAccounts('failover')
    const chunks = await host.stream('openrouter', () => streamOf([usage(), finishError('AUTH', 401)])())
    expect(chunks).toEqual([usage(), finishError('AUTH', 401)])
    const { providers } = await host.getState()
    const view = providers.find((p) => p.provider === 'openrouter')
    expect(view?.accounts.every((a: Record<string, any>) => a.lastError?.code === 'AUTH')).toBe(true)
  })

  it('cannot replay after content, but advances for the next call', async () => {
    const host = await hostWithAccounts('failover')
    const chunks = await host.stream('openrouter', () =>
      streamOf([blockStart(), textDelta('partial'), finishError('AUTH', 401)])())
    expect(chunks).toEqual([blockStart(), textDelta('partial'), finishError('AUTH', 401)])
    await flush()
    expect(host.credentials.refs.get('OPENROUTER_API_KEY')).toBe('key-b')
  })

  it('manual strategy never switches on its own', async () => {
    const host = await hostWithAccounts('manual')
    let attempts = 0
    const chunks = await host.stream('openrouter', () => {
      attempts += 1
      return streamOf([finishError('QUOTA')])()
    })
    expect(attempts).toBe(1)
    expect(chunks).toEqual([finishError('QUOTA')])
    await flush()
    expect(host.credentials.refs.get('OPENROUTER_API_KEY')).toBe('key-a')
    const { providers } = await host.getState()
    expect(providers.find((p) => p.provider === 'openrouter')?.accounts[0]?.lastError?.code).toBe('QUOTA')
  })

  it('rotates accounts per call under round-robin', async () => {
    const host = createHost()
    for (const [label, key] of [['A', 'key-a'], ['B', 'key-b'], ['C', 'key-c']] as const) {
      await host.mutate({ action: 'add-account', provider: 'openrouter', label, apiKey: key })
    }
    await host.mutate({ action: 'set-strategy', provider: 'openrouter', strategy: 'round-robin' })
    const seen: Array<string | undefined> = []
    for (let i = 0; i < 4; i += 1) {
      await host.stream('openrouter', () => {
        seen.push(host.credentials.refs.get('OPENROUTER_API_KEY'))
        return streamOf([finishStop()])()
      })
    }
    expect(seen).toEqual(['key-b', 'key-c', 'key-a', 'key-b'])
  })

  it('retries a thrown credential failure before any chunk', async () => {
    const host = await hostWithAccounts('failover')
    let attempts = 0
    const chunks = await host.stream('openrouter', () => {
      attempts += 1
      if (attempts === 1) {
        return (async function* () {
          throw Object.assign(new Error('unauthorized'), { code: 'AUTH' })
        })()
      }
      return streamOf([textDelta('ok'), finishStop()])()
    })
    expect(attempts).toBe(2)
    expect(chunks).toEqual([textDelta('ok'), finishStop()])
  })

  it('adopts external credential edits into the pool', async () => {
    const host = await hostWithAccounts('manual')
    const emit = (ref: string) => {
      for (const handler of host.handlers.get('credentials/reference-updated') ?? []) {
        ;(handler as (r: string) => void)(ref)
      }
    }
    // Stock editor replaces the key with the spare account's key → activate it.
    host.credentials.refs.set('OPENROUTER_API_KEY', 'key-b')
    const setCallsBefore = host.credentials.setCalls.length
    emit('OPENROUTER_API_KEY')
    await flush()
    let view = (await host.getState()).providers.find((p) => p.provider === 'openrouter')
    expect(view?.accounts[1]?.id).toBe(view?.activeId)
    expect(host.credentials.setCalls.length).toBe(setCallsBefore) // adopted, not overwritten

    // Stock editor writes a brand-new key → the active account adopts it.
    host.credentials.refs.set('OPENROUTER_API_KEY', 'fresh-key')
    emit('OPENROUTER_API_KEY')
    await flush()
    await host.mutate({ action: 'set-strategy', provider: 'openrouter', strategy: 'manual' }) // flush write-behind
    const record = host.credentials.records.get('dsh-desktop-multi-account/state')
    expect(JSON.stringify(record?.payload)).toContain('fresh-key')
    view = (await host.getState()).providers.find((p) => p.provider === 'openrouter')
    expect(view?.accounts).toHaveLength(2)
  })

  it('re-applies the active account on boot from the stored record', async () => {
    const first = await hostWithAccounts('failover')
    first.credentials.refs.set('OPENROUTER_API_KEY', 'drifted-while-closed')
    // A fresh apply() over the same credential store = app restart. The
    // boot convergence repairs the drift before any model call happens.
    createHost({ credentials: first.credentials })
    await flush()
    expect(first.credentials.refs.get('OPENROUTER_API_KEY')).toBe('key-a')
  })
})

// ------------------------------------------------------------------- client

function createReactStub() {
  const createElement = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) => ({
    type,
    props: { ...(props ?? {}) },
    children
  })
  const element = (init: unknown) => [init, () => undefined]
  return {
    Fragment: Symbol.for('react.fragment'),
    createElement,
    useState: element,
    useEffect: () => undefined,
    useRef: (init: unknown) => ({ current: init }),
    useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot()
  }
}

function loadClient(fetchImpl: typeof fetch) {
  const source = readFileSync(path.join(projectRoot, 'packages', 'dsh-desktop-multi-account', 'client.js'), 'utf8')
  let definition: { id: string; factory: (require: (id: string) => unknown) => any } | undefined
  const document = {
    getElementById: vi.fn(() => null),
    createElement: vi.fn(() => ({ id: '', dataset: {}, textContent: '' })),
    head: { appendChild: () => undefined }
  }
  vm.runInNewContext(source, {
    document,
    fetch: fetchImpl,
    window: { __ModuleLoader__: { load: (value: typeof definition) => { definition = value } } }
  })
  if (!definition) throw new Error('client.js did not register a plugin definition')
  const passthrough = () => null
  const primitives = {
    Button: passthrough,
    Input: passthrough,
    Modal: passthrough,
    SegmentedControl: passthrough,
    Switch: passthrough,
    IconUsersOutlineRegular: passthrough,
    IconPlusOutlineRegular: passthrough,
    IconTrashOutlineRegular: passthrough,
    IconEditOutlineRegular: passthrough,
    IconChevronUpOutlineRegular: passthrough,
    IconChevronDownOutlineRegular: passthrough,
    IconChevronRightOutlineRegular: passthrough,
    IconWarningOutlineRegular: passthrough
  }
  const plugin = definition.factory((id) => {
    if (id === 'react') return createReactStub()
    if (id === '@deepseek-ai/dsh-client-ui-primitives') {
      return new Proxy(primitives, {
        get: (target, key) => {
          if (!(key in target)) throw new Error(`UI primitives does not export ${String(key)}`)
          return Reflect.get(target, key)
        }
      })
    }
    throw new Error(`Unexpected client dependency: ${id}`)
  })
  return plugin as {
    apply: (ctx: unknown) => void
    createAccountsStore: () => any
    ProviderAccountsCard: (props: Record<string, unknown>) => unknown
  }
}

const jsonResponse = (payload: unknown) => ({
  ok: true,
  status: 200,
  json: async () => payload
}) as unknown as Response

const STATE_PAYLOAD = {
  providers: [
    {
      provider: 'openrouter',
      displayName: 'OpenRouter',
      settingsNs: 'llm-pi-ai',
      manageable: true,
      credentialRef: 'OPENROUTER_API_KEY',
      importable: false,
      strategy: 'failover',
      activeId: 'a1',
      accounts: [
        { id: 'a1', label: 'Main', enabled: true, fingerprint: 'abc123', createdAt: NOW, lastUsedAt: null, lastError: null },
        { id: 'a2', label: 'Spare', enabled: true, fingerprint: 'def456', createdAt: NOW, lastUsedAt: null, lastError: null }
      ]
    },
    {
      provider: 'deepseek',
      displayName: 'DeepSeek',
      settingsNs: 'llm-deepseek',
      manageable: true,
      importable: true,
      strategy: 'manual',
      activeId: null,
      accounts: []
    },
    {
      provider: 'deepseek-account',
      displayName: 'DeepSeek Account',
      settingsNs: 'llm-deepseek-account',
      manageable: false,
      importable: false,
      strategy: 'manual',
      activeId: null,
      accounts: []
    }
  ]
}

function collectStrings(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') out.push(node)
  else if (Array.isArray(node)) node.forEach((child) => collectStrings(child, out))
  else if (node !== null && typeof node === 'object') {
    const element = node as { children?: unknown[] }
    element.children?.forEach((child) => collectStrings(child, out))
  }
  return out
}

describe('multi-account client', () => {
  it('registers one provider-card entry per discovered namespace, with full locale dicts', async () => {
    const plugin = loadClient(async () => jsonResponse(STATE_PAYLOAD))
    const registrations: Array<{ config: Record<string, any>; component: unknown }> = []
    const localeDicts: Record<string, Record<string, Record<string, string>>> = {}
    const remoteSubs: string[] = []
    const ctx = {
      inject: (_deps: string[], callback: (scope: unknown) => void) => callback(ctx),
      effect: (fn: () => unknown) => {
        fn()
        return () => undefined
      },
      locale: {
        register: (ns: string, dicts: Record<string, Record<string, string>>) => {
          localeDicts[ns] = dicts
        },
        bind: () => (key: string) => key
      },
      remote: {
        $on: (event: string) => {
          remoteSubs.push(event)
          return () => undefined
        }
      },
      slots: {
        inject: (_name: string, callback: () => unknown) => callback(),
        register: (config: Record<string, any>, component: unknown) => {
          registrations.push({ config, component })
          return () => undefined
        }
      }
    }
    plugin.apply(ctx)
    await flush()
    expect(registrations.map((r) => [r.config.name, r.config.key]).sort()).toEqual([
      ['settings.models.provider-card', 'llm-deepseek'],
      ['settings.models.provider-card', 'llm-deepseek-account'],
      ['settings.models.provider-card', 'llm-pi-ai']
    ])
    expect(remoteSubs).toEqual(['credentials/reference-updated', 'llm/adapters-updated'])

    const dicts = localeDicts['desktop-multi-account']
    expect(dicts).toBeDefined()
    const keySets = Object.values(dicts ?? {}).map((dict) => Object.keys(dict).sort())
    expect(keySets.length).toBeGreaterThanOrEqual(2)
    for (const keys of keySets) expect(keys).toEqual(keySets[0])
  })

  it('store loads state and posts mutations, merging the returned view', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const plugin = loadClient(async (url: unknown, init?: RequestInit) => {
      calls.push({ url: String(url), init })
      if (String(url).endsWith('/state')) return jsonResponse(STATE_PAYLOAD)
      return jsonResponse({ provider: { ...STATE_PAYLOAD.providers[0], strategy: 'manual' } })
    })
    const store = plugin.createAccountsStore()
    await store.load()
    expect(store.getSnapshot().namespaces).toEqual(['llm-pi-ai', 'llm-deepseek', 'llm-deepseek-account'])
    await store.mutate({ action: 'set-strategy', provider: 'openrouter', strategy: 'manual' })
    expect(store.getSnapshot().providers.get('openrouter').strategy).toBe('manual')
    const post = calls.find((c) => c.init?.method === 'POST')
    expect(JSON.parse(String(post?.init?.body))).toEqual({ action: 'set-strategy', provider: 'openrouter', strategy: 'manual' })
  })

  it('card hides for unmanageable or unconfigured rows and summarizes managed ones', async () => {
    const plugin = loadClient(async () => jsonResponse(STATE_PAYLOAD))
    const store = plugin.createAccountsStore()
    await store.load()
    const api = { store, t: (key: string) => key }
    const card = plugin.ProviderAccountsCard

    const managed = card({ provider: { provider: 'openrouter', displayName: 'OpenRouter' }, configured: true, api })
    expect(collectStrings(managed)).toContain('cardSummary')

    const empty = card({ provider: { provider: 'deepseek', displayName: 'DeepSeek' }, configured: true, api })
    expect(collectStrings(empty)).toContain('cardEmpty')

    expect(card({ provider: { provider: 'deepseek-account', displayName: 'DeepSeek Account' }, configured: true, api })).toBeNull()
    expect(card({ provider: { provider: 'openrouter', displayName: 'OpenRouter' }, configured: false, api })).toBeNull()
  })
})
