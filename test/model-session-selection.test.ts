import {
  createBoundedSessionModelSelectionStore,
  createApiProxy,
  resolveSessionModelSelection,
  type DurableSessionModelSelection
} from '@deepseek-ai/dsh-host-apiproxy'
import type { ModelSelection } from '@deepseek-ai/dsh-agent'
import { ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import { describe, expect, it } from 'vitest'

type Selection = ModelSelection
type WireSelection = { provider: string, model: string, reasoningEffort?: string }
type RpcResult<T> = { result: { ok: true, value: T } | { ok: false, error: { message: string } } }

function selection(provider: string, model: string, reasoningEffort?: string): Selection {
  return {
    provider,
    model,
    ...(reasoningEffort === undefined ? {} : { reasoningEffort: ReasoningEffortId(reasoningEffort) })
  }
}

function rpc<T>(payload: T, id = 'rpc-test') {
  return { rpcId: id, payload } as never
}

function modelResult(response: RpcResult<{ current: WireSelection | null, routable: boolean }>) {
  if (!response.result.ok) throw new Error(response.result.error.message)
  return response.result.value
}

function createSettingsFixture() {
  let value: { selections: DurableSessionModelSelection[] } = { selections: [] }
  let rejectWrites = false
  const registered: string[] = []
  return {
    settings: {
      register(namespace: unknown) {
        registered.push(String(namespace))
        return {
          get: () => value,
          replace: async (next: { selections: DurableSessionModelSelection[] }) => {
            if (rejectWrites) throw new Error('settings disk unavailable')
            value = { selections: next.selections.map((entry) => ({ ...entry })) }
          }
        }
      }
    },
    registered,
    setRejectWrites(next: boolean) {
      rejectWrites = next
    }
  }
}

function createApiProxyFixture(
  settingsFixture: ReturnType<typeof createSettingsFixture>,
  defaultSelection: Selection,
  sessionId = 'proxy-session'
) {
  const session = {
    id: sessionId,
    header: {},
    requestHeader: () => undefined,
    deriveMessages: () => []
  }
  const agent = {
    id: sessionId,
    session,
    ctx: { on: () => () => undefined },
    inbox: { nextTurn: [], nextStep: [] }
  }
  const providers = [
    { id: 'openai', name: 'OpenAI' },
    { id: 'anthropic', name: 'Anthropic' }
  ]
  const ctx = {
    settings: settingsFixture.settings,
    agents: {
      get: (id: string) => id === sessionId ? agent : undefined,
      isOwnedBy: () => false
    },
    sessions: { get: (id: string) => id === sessionId ? session : undefined },
    llm: {
      listProviders: () => providers,
      listModels: async (provider: string) => [{ id: `${provider}-model`, name: `${provider} model` }],
      resolveModelInfo: async () => ({}),
      resolveCallConfig: async (requested: Selection) => requested
    },
    userQuestions: { registerProvider: () => () => undefined },
    workspaceRegistry: {},
    logger: { warn: () => undefined },
    get(name: string) {
      if (name === 'settings') return this.settings
      if (name === 'llm') return this.llm
      return undefined
    },
    inject(names: string[], callback: (next: unknown) => void) {
      if (names.every((name) => this.get(name) !== undefined)) callback(this)
    },
    effect(callback: () => unknown) {
      callback()
    },
    on: () => () => undefined
  }
  return {
    api: createApiProxy(ctx as never, { cwd: '/tmp', defaultModelSelection: () => defaultSelection }),
    agent
  }
}

describe('durable per-session model selection', () => {
  it('resolves the restart matrix without silently substituting an unavailable provider', async () => {
    let persisted: DurableSessionModelSelection[] = []
    const createStore = () => createBoundedSessionModelSelectionStore({
      load: () => persisted,
      persist: async (next) => {
        persisted = next.map((entry) => ({ ...entry }))
      }
    })
    const fallback = selection('deepseek-official', 'deepseek-v4-flash')
    const requested = selection('openai', 'gpt-5.6-sol')
    const chosen = selection('anthropic', 'claude-sonnet-4-5', 'high')

    const firstHost = createStore()
    await firstHost.save('selected-without-send', chosen)

    const restartedHost = createStore()
    const routeServed = (provider: string) => provider !== 'deepseek-official' && provider !== 'offline-provider'
    const resolve = (sessionId: string, request?: Selection) => resolveSessionModelSelection({
      live: undefined,
      durable: restartedHost.get(sessionId),
      request,
      defaultSelection: fallback,
      routeServed
    })

    expect(resolve('blank')).toEqual({ current: undefined, routable: false })
    expect(resolve('previously-requested', requested)).toEqual({ current: requested, routable: true })
    expect(resolve('selected-without-send', requested)).toEqual({ current: chosen, routable: true })

    await restartedHost.save('provider-no-longer-registered', selection('offline-provider', 'gone-model'))
    expect(resolve('provider-no-longer-registered', requested)).toEqual({
      current: selection('offline-provider', 'gone-model'),
      routable: false
    })
  })

  it('persists an isolated session selection before continuing and bounds the durable table', async () => {
    let persisted: DurableSessionModelSelection[] = []
    const store = createBoundedSessionModelSelectionStore({
      load: () => persisted,
      persist: async (next) => {
        persisted = next.map((entry) => ({ ...entry }))
      }
    })

    await store.save('session-a', selection('openai', 'gpt-5.6-sol'))
    await store.save('session-b', selection('anthropic', 'claude-sonnet-4-5'))
    expect(store.get('session-a')).toEqual(selection('openai', 'gpt-5.6-sol'))
    expect(store.get('session-b')).toEqual(selection('anthropic', 'claude-sonnet-4-5'))

    await expect(createBoundedSessionModelSelectionStore({
      load: () => persisted,
      persist: async () => {
        throw new Error('disk unavailable')
      }
    }).save('not-acknowledged', selection('openai', 'gpt-5.6-sol'))).rejects.toThrow('disk unavailable')

    await Promise.all(Array.from({ length: 257 }, (_, index) => store.save(
      `bounded-${index}`,
      selection('openai', `model-${index}`)
    )))
    expect(persisted).toHaveLength(256)
    expect(store.get('bounded-0')).toBeUndefined()
    expect(store.get('bounded-256')).toEqual(selection('openai', 'model-256'))

    expect(() => createBoundedSessionModelSelectionStore({
      limit: 0,
      load: () => persisted,
      persist: async () => undefined
    })).toThrow('positive finite integer')
  })

  it('uses the real session handlers to block an invalid default and preserve a selection across restart', async () => {
    const settingsFixture = createSettingsFixture()
    const blocked = createApiProxyFixture(
      settingsFixture,
      selection('deepseek-official', 'deepseek-v4-flash')
    )
    const blockedModels = modelResult(await blocked.api.sessions.models(rpc({ sessionId: 'proxy-session' })))
    expect(blockedModels).toEqual(expect.objectContaining({ current: null, routable: false }))

    const firstHost = createApiProxyFixture(settingsFixture, selection('openai', 'openai-model'))
    settingsFixture.setRejectWrites(true)
    const rejected = await firstHost.api.sessions.selectModel(rpc({
      sessionId: 'proxy-session',
      provider: 'anthropic',
      model: 'anthropic-model'
    }))
    expect(rejected.result.ok).toBe(false)
    expect(modelResult(await firstHost.api.sessions.models(rpc({ sessionId: 'proxy-session' }, 'after-reject'))))
      .toEqual(expect.objectContaining({ current: selection('openai', 'openai-model'), routable: true }))

    settingsFixture.setRejectWrites(false)
    const selected = await firstHost.api.sessions.selectModel(rpc({
      sessionId: 'proxy-session',
      provider: 'anthropic',
      model: 'anthropic-model'
    }, 'persist-selection'))
    expect(selected.result).toEqual(expect.objectContaining({ ok: true }))

    const restarted = createApiProxyFixture(settingsFixture, selection('openai', 'openai-model'))
    expect(settingsFixture.registered).toEqual([
      'session-model-selection',
      'session-model-selection',
      'session-model-selection'
    ])
    expect(modelResult(await restarted.api.sessions.models(rpc({ sessionId: 'proxy-session' }, 'after-restart'))))
      .toEqual(expect.objectContaining({ current: selection('anthropic', 'anthropic-model'), routable: true }))
  })
})
