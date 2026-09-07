import { afterEach, describe, expect, it, vi } from 'vitest'
import { PiAiAdapter, type PiAiAdapterOptions } from '@deepseek-ai/dsh-llm-pi-ai'
import { resolveRetryPolicy } from '@deepseek-ai/dsh-llm'
import { opencodeGoProvider } from '@earendil-works/pi-ai/providers/opencode-go'

const sessionHeader = 'x-deepseek-harness-session-id'

afterEach(() => vi.unstubAllGlobals())

function fixture(headers: Record<string, string> = {}) {
  const requests: { url: string; headers: Headers; body: string }[] = []
  vi.stubGlobal('fetch', async (url: string | URL, init?: RequestInit) => {
    requests.push({ url: String(url), headers: new Headers(init?.headers), body: String(init?.body) })
    return new Response(JSON.stringify({ error: { message: 'End request capture' } }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    })
  })
  const profiles: ReturnType<PiAiAdapterOptions['profiles']> = new Map([
    ['opencode-go', {
      provider: 'opencode-go', displayName: 'OpenCode Go', headers,
      piProvider: opencodeGoProvider(), streamIdleTimeoutMs: 5000,
      configuredMaxTokens: new Map(), maxRequestImageBytes: 1024,
      requestImagePixelBudget: 1024, requestImageMaxBytes: 1024,
      retryPolicy: resolveRetryPolicy({ mode: 'normal', maxRetries: 0 }, 'test')
    }]
  ])
  const adapter = new PiAiAdapter({
    profiles: () => profiles,
    resolveApiKey: async () => 'test-key',
    auth: {} as PiAiAdapterOptions['auth']
  })
  async function send(sessionId?: string | number, model = 'deepseek-v4-flash', prepared = false) {
    const options = {
      provider: 'opencode-go', model,
      ...(sessionId === undefined ? {} : { sessionId }),
      messages: [{ role: 'user', content: [{ type: 'text', text: String(sessionId ?? 'no-session') }] }],
      maxTokens: 8
    } as Parameters<PiAiAdapter['stream']>[0]
    const call = prepared ? await adapter.prepareCall('opencode-go', model) : adapter
    for await (const _chunk of call.stream(options)) { /* Consume through HTTP dispatch. */ }
  }
  return { requests, send }
}

describe('pi-ai session headers', () => {
  it.each([
    ['deepseek-v4-flash', '/chat/completions'],
    ['minimax-m3', '/messages'],
    ['gpt-5.6-luna', '/responses']
  ])('sends the Harness session through %s', async (model, endpoint) => {
    const { send, requests } = fixture()
    await send('session-parent', model)
    expect(requests).toHaveLength(1)
    expect(requests[0]!.url).toContain(endpoint)
    expect(requests[0]!.headers.get(sessionHeader)).toBe('session-parent')
    expect(requests[0]!.headers.get('user-agent')).toContain('deepseek-harness/')
  })

  it('retains identity across repeated and prepared calls without mixing concurrent sessions', async () => {
    const { send, requests } = fixture()
    await send('parent')
    await send('parent', 'deepseek-v4-flash', true)
    await Promise.all([send('child'), send('other')])
    expect(requests.map(request => request.headers.get(sessionHeader)).sort())
      .toEqual(['child', 'other', 'parent', 'parent'])
    for (const request of requests) {
      expect(JSON.parse(request.body).messages[0].content).toBe(request.headers.get(sessionHeader))
    }
  })

  it.each([sessionHeader, 'X-DeepSeek-Harness-Session-ID'])('overrides configured %s with the current session', async name => {
    const { send, requests } = fixture({ [name]: 'stale-session', 'x-custom-header': 'retained' })
    await send(42)
    expect(requests).toHaveLength(1)
    expect(requests[0]!.headers.get(sessionHeader)).toBe('42')
    expect(requests[0]!.headers.get('x-custom-header')).toBe('retained')
  })

  it('does not invent a session for calls without one', async () => {
    const { send, requests } = fixture()
    await send()
    expect(requests).toHaveLength(1)
    expect(requests[0]!.headers.has(sessionHeader)).toBe(false)
  })
})
