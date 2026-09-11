import { afterEach, describe, expect, it } from 'vitest'
import {
  API_PATHS,
  CLIENT_ID,
  createPkceTransaction,
  parseAuthorization,
  parseConfig,
  parseModels,
  parseToken,
  parseUsage
} from '../packages/dsh-desktop-enterprise/contract.js'
import { createMockEnterpriseServer } from '../scripts/mock-bisheng-enterprise.mjs'

let service: ReturnType<typeof createMockEnterpriseServer> | undefined

afterEach(async () => {
  await service?.close()
  service = undefined
})

async function postJson(url: string, body: unknown, headers: Record<string, string> = {}) {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body)
  })
}

async function issueSession(origin: string) {
  const pkce = createPkceTransaction()
  const redirectUri = 'http://127.0.0.1:49152/dsh/callback'
  const authorizationResponse = await postJson(`${origin}${API_PATHS.authorizations}`, {
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    code_challenge: pkce.codeChallenge,
    code_challenge_method: 'S256',
    state: pkce.state,
    device_name: 'QA Mac'
  })
  const authorization = parseAuthorization(await authorizationResponse.json(), origin)
  const browserResponse = await fetch(`${origin}/__mock/authorize`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      auth_id: authorization.auth_id,
      email: 'alice@demo.bisheng.local',
      password: 'WorkBuddy123!',
      decision: 'allow'
    })
  })
  const html = await browserResponse.text()
  const callbackLiteral = /location\.replace\((".*?")\)/u.exec(html)?.[1]
  expect(callbackLiteral).toBeTruthy()
  const callback = new URL(JSON.parse(callbackLiteral!))
  expect(callback.origin + callback.pathname).toBe(redirectUri)
  expect(callback.searchParams.get('state')).toBe(pkce.state)
  const ticket = callback.searchParams.get('identity_ticket')
  expect(ticket).toMatch(/^ticket_/u)
  const tokenResponse = await postJson(`${origin}${API_PATHS.token}`, {
    grant_type: 'identity_ticket',
    identity_ticket: ticket,
    auth_id: authorization.auth_id,
    code_verifier: pkce.codeVerifier
  })
  expect(tokenResponse.status).toBe(200)
  return {
    authorization,
    pkce,
    ticket,
    raw: await tokenResponse.json()
  }
}

describe('BiSheng compatible client API mock', () => {
  it('accepts supported config versions while preserving the server version', () => {
    expect(parseConfig({
      enabled: true,
      client_id: 'dsh-desktop',
      contract_version: '0.4.0'
    })).toEqual({ enabled: true, client_id: 'dsh-desktop', contract_version: '0.4.0' })
    expect(parseConfig({
      enabled: true,
      client_id: 'dsh-desktop',
      contract_version: '0.5.0'
    })).toEqual({ enabled: true, client_id: 'dsh-desktop', contract_version: '0.5.0' })
    expect(() => parseConfig({
      enabled: true,
      client_id: 'dsh-desktop',
      contract_version: '0.3.0'
    })).toThrow('contract version is incompatible')
    expect(() => parseConfig({
      enabled: true,
      client_id: 'other-client',
      contract_version: '0.5.0'
    })).toThrow('contract version is incompatible')
  })

  it('runs config, PKCE login, models, usage, model streaming, refresh, and logout', async () => {
    service = createMockEnterpriseServer({ port: 0 })
    const origin = await service.listen()
    const config = parseConfig(await (await fetch(`${origin}${API_PATHS.config}`)).json())
    expect(config).toEqual({ enabled: true, client_id: 'dsh-desktop', contract_version: '0.5.0' })

    const issued = await issueSession(origin)
    const session = parseToken(issued.raw, origin, 0)
    expect(session).toMatchObject({
      base: origin,
      token_type: 'Bearer',
      user: { id: 'user-alice' },
      tenant: { id: 'tenant-demo' }
    })

    const replay = await postJson(`${origin}${API_PATHS.token}`, {
      grant_type: 'identity_ticket', identity_ticket: issued.ticket,
      auth_id: issued.authorization.auth_id, code_verifier: issued.pkce.codeVerifier
    })
    expect(replay.status).toBe(400)

    const headers = { authorization: `Bearer ${issued.raw.access_token}` }
    const models = parseModels(await (await fetch(`${origin}${API_PATHS.models}`, { headers })).json())
    expect(models.map((model) => model.id)).toEqual([
      'bisheng:42',
      'openai:gpt-4.1',
      'anthropic:claude-sonnet-4-5',
      'moonshot:kimi-k2'
    ])
    const usage = parseUsage(await (await fetch(`${origin}${API_PATHS.usage}`, { headers })).json())
    expect(usage).toMatchObject({ source: 'live', quota_state: 'available', used: 15248, limit: 300000 })
    const modelUsageBefore = parseUsage(await (await fetch(`${origin}${API_PATHS.usage}?model=bisheng%3A42`, { headers })).json())
    expect(modelUsageBefore).toMatchObject({ source: 'live', quota_state: 'available', used: 128, limit: 100000 })
    const gptUsage = parseUsage(await (await fetch(`${origin}${API_PATHS.usage}?model=openai%3Agpt-4.1`, { headers })).json())
    expect(gptUsage).toMatchObject({ source: 'live', quota_state: 'available', used: 8640, limit: 50000 })

    const chat = await postJson(`${origin}${API_PATHS.chat}`, {
      model: 'bisheng:42', messages: [{ role: 'user', content: 'hello' }],
      stream: true, stream_options: { include_usage: true }, n: 1
    }, headers)
    expect(chat.headers.get('content-type')).toContain('text/event-stream')
    const stream = await chat.text()
    expect(stream).toContain('Mock 联调成功')
    expect(stream).toContain('"usage"')
    expect(stream).toContain('"prompt_tokens_details"')
    expect(stream).toContain('"cached_tokens"')
    expect(stream).toContain('"cache_creation_tokens"')
    expect(stream).toContain('data: [DONE]')
    const modelUsageAfter = parseUsage(await (await fetch(`${origin}${API_PATHS.usage}?model=bisheng%3A42`, { headers })).json())
    if (typeof modelUsageBefore.used !== 'number' || typeof modelUsageAfter.used !== 'number') {
      throw new Error('Mock model usage should be live numeric usage.')
    }
    expect(modelUsageAfter.used).toBeGreaterThan(modelUsageBefore.used)

    const refreshedResponse = await postJson(`${origin}${API_PATHS.token}`, {
      grant_type: 'refresh_token', refresh_token: issued.raw.refresh_token
    })
    expect(refreshedResponse.status).toBe(200)
    const refreshed = await refreshedResponse.json()
    expect(refreshed.refresh_token).not.toBe(issued.raw.refresh_token)
    expect(refreshed.session_id).toBe(issued.raw.session_id)

    const logout = await postJson(`${origin}${API_PATHS.logout}`, {}, {
      authorization: `Bearer ${refreshed.access_token}`
    })
    expect(logout.status).toBe(204)
    expect((await fetch(`${origin}${API_PATHS.models}`, {
      headers: { authorization: `Bearer ${refreshed.access_token}` }
    })).status).toBe(401)
  })

  it('runs login and model streaming against a 0.4.0 server without cache token details', async () => {
    const legacyServer = { port: 0, contractVersion: '0.4.0' as const }
    service = createMockEnterpriseServer(legacyServer)
    const origin = await service.listen()
    const config = parseConfig(await (await fetch(`${origin}${API_PATHS.config}`)).json())
    expect(config).toEqual({ enabled: true, client_id: 'dsh-desktop', contract_version: '0.4.0' })

    const issued = await issueSession(origin)
    const session = parseToken(issued.raw, origin, 0)
    const headers = { authorization: `Bearer ${session.access_token}` }
    const chat = await postJson(`${origin}${API_PATHS.chat}`, {
      model: 'bisheng:42', messages: [{ role: 'user', content: 'hello' }],
      stream: true, stream_options: { include_usage: true }, n: 1
    }, headers)
    expect(chat.status).toBe(200)
    const stream = await chat.text()
    expect(stream).toContain('"usage"')
    expect(stream).toContain('"prompt_tokens"')
    expect(stream).not.toContain('"prompt_tokens_details"')
    expect(stream).not.toContain('"cached_tokens"')
    expect(stream).not.toContain('"cache_creation_tokens"')
  })

  it('detects refresh-token replay and revokes the session family', async () => {
    service = createMockEnterpriseServer({ port: 0 })
    const origin = await service.listen()
    const issued = await issueSession(origin)
    const first = await postJson(`${origin}${API_PATHS.token}`, {
      grant_type: 'refresh_token', refresh_token: issued.raw.refresh_token
    })
    const rotated = await first.json()
    const replay = await postJson(`${origin}${API_PATHS.token}`, {
      grant_type: 'refresh_token', refresh_token: issued.raw.refresh_token
    })
    expect(replay.status).toBe(401)
    expect((await replay.json()).error.code).toBe('refresh_token_reused')
    expect((await fetch(`${origin}${API_PATHS.models}`, {
      headers: { authorization: `Bearer ${rotated.access_token}` }
    })).status).toBe(401)
  })

  it('rejects callbacks outside 127.0.0.1 and unknown authorization fields', async () => {
    service = createMockEnterpriseServer({ port: 0 })
    const origin = await service.listen()
    const pkce = createPkceTransaction()
    const response = await postJson(`${origin}${API_PATHS.authorizations}`, {
      client_id: CLIENT_ID,
      redirect_uri: 'http://localhost:49152/dsh/callback',
      code_challenge: pkce.codeChallenge,
      code_challenge_method: 'S256',
      state: pkce.state,
      extra: true
    })
    expect(response.status).toBe(400)
  })

  it('accepts unavailable usage with null counters and observation time', () => {
    expect(parseUsage({
      month: '2026-09',
      billing_timezone: 'Asia/Shanghai',
      period_start: '2026-08-31T16:00:00Z',
      reset_at: '2026-09-30T16:00:00Z',
      used: null,
      limit: 1000,
      remaining: null,
      source: 'unavailable',
      as_of: null,
      quota_state: 'unavailable'
    })).toMatchObject({
      used: null,
      limit: 1000,
      remaining: null,
      source: 'unavailable',
      as_of: null,
      quota_state: 'unavailable'
    })
  })
})
