import {
  createBoundedSessionModelSelectionStore,
  resolveSessionModelSelection,
  type DurableSessionModelSelection
} from '@deepseek-ai/dsh-host-apiproxy'
import type { ModelSelection } from '@deepseek-ai/dsh-agent'
import { ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import { describe, expect, it } from 'vitest'

type Selection = ModelSelection

function selection(provider: string, model: string, reasoningEffort?: string): Selection {
  return {
    provider,
    model,
    ...(reasoningEffort === undefined ? {} : { reasoningEffort: ReasoningEffortId(reasoningEffort) })
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

    expect(resolve('blank')).toEqual({ current: fallback, routable: false })
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
  })
})
