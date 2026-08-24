import { createServer } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { KNOWN_SESSION_EVENT_TYPES, Session } from '@deepseek-ai/dsh-session'
import { PersistenceCoordinator } from '@deepseek-ai/dsh-session-persistence'
import {
  SessionModelSearchProvider,
  resolveSessionSearchOptions
} from '../packages/dsh-web-search-session-model/index.js'

const servers = new Set()

afterEach(async () => {
  await Promise.all(
    [...servers].map(
      (server) =>
        new Promise((resolve) => {
          server.close(() => resolve())
        })
    )
  )
  servers.clear()
})

async function listen(handler) {
  const server = createServer(handler)
  servers.add(server)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('test server did not bind')
  return `http://127.0.0.1:${address.port}`
}

function fakeContext({ baseURL, credential = 'user-model-key' }) {
  const credentialRefs = []
  const ctx = {
    agents: {
      currentInitiator() {
        return {
          session: {
            requestHeader() {
              return {
                config: { provider: 'openai', model: 'gpt-5.6-sol' }
              }
            },
            append() {}
          }
        }
      }
    },
    settings: {
      get(namespace) {
        if (namespace !== 'llm-pi-ai') return undefined
        return {
          providers: {
            openai: {
              baseURL: `${baseURL}/llmapi/v1`,
              apiKeyEnv: 'OPENAI_API_KEY'
            },
            'deepseek-official': {
              baseURL: 'https://api.deepseek.com/anthropic/v1',
              apiKeyEnv: 'DEEPSEEK_API_KEY'
            }
          }
        }
      }
    },
    credentials: {
      async resolve(ref) {
        credentialRefs.push(ref)
        return ref === 'OPENAI_API_KEY' ? { value: credential } : undefined
      }
    },
    get(name) {
      return this[name]
    }
  }
  return { ctx, credentialRefs }
}

describe('current-session model web search', () => {
  it('replays legacy session-model search events from persisted sessions', async () => {
    const id = 'session-web-search-legacy-replay-test'
    const meta = Session.create(id).header
    const events = [
      {
        type: 'web/session-model-search-llm-request',
        seq: 0,
        time: 1,
        data: {
          endpoint: 'https://example.com/responses',
          provider: 'openai',
          model: 'gpt-5.6-sol',
          apiKeyRef: 'OPENAI_API_KEY',
          body: { model: 'gpt-5.6-sol', input: 'current facts' }
        }
      }
    ]
    const ctx = {
      effect() {},
      on() {},
      sessions: {
        list: () => []
      }
    }
    const backend = {
      name: 'legacy-search-event-fixture',
      async loadStored() {
        return { meta, events, revision: 'fixture-revision' }
      }
    }
    const persistence = new PersistenceCoordinator(ctx, backend)

    await expect(persistence.readFrom(id, 0)).resolves.toMatchObject({
      events: [{ type: 'web/session-model-search-llm-request', seq: 0 }]
    })
  })

  it('keeps persisted search diagnostics replayable after a Harness restart', async () => {
    const session = Session.create('session-web-search-replay-test')
    session.append('request/header', {
      header: {
        config: { provider: 'openai', model: 'gpt-5.6-sol' }
      },
      reason: 'initial'
    })
    const { ctx } = fakeContext({ baseURL: 'https://example.com' })
    ctx.agents.currentInitiator = () => ({ session })
    const options = await resolveSessionSearchOptions(ctx)

    options.recordRequest?.({
      endpoint: 'https://example.com/responses',
      provider: 'openai',
      model: 'gpt-5.6-sol',
      apiKeyRef: 'OPENAI_API_KEY',
      body: { model: 'gpt-5.6-sol', input: 'current facts' }
    })

    expect(
      session.events.every(
        (event) => KNOWN_SESSION_EVENT_TYPES.has(event.type) || event.ignorable === true
      )
    ).toBe(true)
  })

  it('uses the selected model endpoint and credential and maps Responses citations', async () => {
    const requests = []
    const baseURL = await listen(async (request, response) => {
      let body = ''
      for await (const chunk of request) body += chunk
      requests.push({
        url: request.url,
        authorization: request.headers.authorization,
        body: JSON.parse(body)
      })
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(
        JSON.stringify({
          output: [
            {
              type: 'web_search_call',
              action: {
                sources: [
                  { url: 'https://example.com/a', title: 'Source A' },
                  { url: 'https://example.com/b', title: 'Source B' }
                ]
              }
            },
            {
              type: 'message',
              content: [
                {
                  type: 'output_text',
                  text: 'A concise sourced answer.',
                  annotations: [
                    {
                      type: 'url_citation',
                      url: 'https://example.com/a',
                      title: 'Source A duplicate'
                    },
                    {
                      type: 'url_citation',
                      url: 'https://example.com/c',
                      title: 'Source C'
                    }
                  ]
                }
              ]
            }
          ]
        })
      )
    })
    const { ctx, credentialRefs } = fakeContext({ baseURL })
    const provider = new SessionModelSearchProvider(() => resolveSessionSearchOptions(ctx))

    const result = await provider.search({ query: 'current facts', maxResults: 8 })

    expect(requests).toHaveLength(1)
    expect(requests[0]).toMatchObject({
      url: '/llmapi/v1/responses',
      authorization: 'Bearer user-model-key',
      body: {
        model: 'gpt-5.6-sol',
        tools: [{ type: 'web_search' }],
        include: ['web_search_call.action.sources']
      }
    })
    expect(requests[0].body.input).toContain('current facts')
    expect(credentialRefs).toEqual(['OPENAI_API_KEY'])
    expect(result).toEqual({
      content: 'A concise sourced answer.',
      sources: [
        { url: 'https://example.com/a', title: 'Source A' },
        { url: 'https://example.com/b', title: 'Source B' },
        { url: 'https://example.com/c', title: 'Source C' }
      ],
      truncated: false
    })
  })

  it('fails on the selected route credential without falling back to DeepSeek', async () => {
    const { ctx, credentialRefs } = fakeContext({
      baseURL: 'http://127.0.0.1:9',
      credential: ''
    })
    const provider = new SessionModelSearchProvider(() => resolveSessionSearchOptions(ctx))

    await expect(provider.search({ query: 'anything', maxResults: 8 })).rejects.toMatchObject({
      code: 'WEB_PROVIDER_CREDENTIAL_MISSING'
    })
    expect(credentialRefs).toEqual(['OPENAI_API_KEY'])
  })
})
