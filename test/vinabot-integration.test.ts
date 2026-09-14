import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { patchPath } from './patch-path'

import {
  VINABOT_ANTHROPIC_PROVIDER,
  VINABOT_CHAT_PROVIDER,
  VINABOT_CREDENTIAL_REF,
  STATUS_PATH,
  VINABOT_PROVIDER,
  VINABOT_ANTHROPIC_REASONING_EFFORTS,
  VINABOT_CHAT_REASONING_EFFORTS,
  VINABOT_RESPONSES_REASONING_EFFORTS,
  VINABOT_SETTINGS_NAMESPACE,
  VinabotIntegration,
  inputModalitiesOfModel,
  isAllowedVinabotModel,
  isClaudeModel,
  normalizeApiKey,
  normalizeModels,
  protocolsOfModel,
  recommendedProtocol
} from '../packages/dsh-desktop-vinabot/index.js'

interface FakeContext {
  settings: {
    get: (namespace: string) => unknown
    mutate: (namespace: string, operations: Array<{ op: string; path: string[]; value?: unknown }>) => Promise<void>
  }
  credentials: {
    describe: () => Promise<{ configured: boolean; writable: boolean }>
    set: (_ref: unknown, value: string) => Promise<void>
  }
  agentDefaultModel: {
    currentSelection: () => { provider: string; model: string }
    saveSelection: (selection: { provider: string; model: string }) => Promise<void>
  }
}

function fakeContext(): FakeContext & {
  section: { providers: Record<string, unknown> }
  secret?: string
  selection: { provider: string; model: string }
} {
  const context = {
    section: { providers: {} as Record<string, unknown> },
    secret: undefined as string | undefined,
    selection: { provider: 'deepseek-official', model: 'deepseek-chat' },
    settings: {
      get(namespace: string) {
        expect(namespace).toBe(VINABOT_SETTINGS_NAMESPACE)
        return context.section
      },
      async mutate(
        namespace: string,
        operations: Array<{ op: string; path: string[]; value?: unknown }>
      ) {
        expect(namespace).toBe(VINABOT_SETTINGS_NAMESPACE)
        for (const operation of operations) {
          expect(operation.path[0]).toBe('providers')
          const provider = operation.path[1]
          if (provider === undefined) throw new Error('provider route is missing')
          if (operation.op === 'set') context.section.providers[provider] = operation.value
          if (operation.op === 'unset') delete context.section.providers[provider]
        }
      }
    },
    credentials: {
      async describe() {
        return { configured: context.secret !== undefined, writable: true }
      },
      async set(_ref: unknown, value: string) {
        context.secret = value
      }
    },
    agentDefaultModel: {
      currentSelection() {
        return context.selection
      },
      async saveSelection(selection: { provider: string; model: string }) {
        context.selection = selection
      }
    }
  }
  return context
}

function json(value: unknown, init?: ResponseInit): Response {
  return Response.json(value, init)
}

describe('VinaRouter model normalization', () => {
  it('prefixes raw NewAPI keys exactly once', () => {
    expect(normalizeApiKey('abc')).toBe('sk-abc')
    expect(normalizeApiKey(' sk-abc ')).toBe('sk-abc')
    expect(() => normalizeApiKey('')).toThrow(/API 密钥/u)
  })

  it('keeps only the admitted model families and versions, with image capabilities', () => {
    expect(protocolsOfModel({ supported_endpoint_types: ['openai', 'openai-response'] })).toEqual([
      'openai-responses',
      'openai-completions'
    ])
    expect(normalizeModels({
      data: [
        { id: 'gpt-5.6-sol', name: 'GPT 5.6 Sol', supported_endpoint_types: ['openai'] },
        { id: 'gpt-5.5', supported_endpoint_types: ['openai-response'] },
        { id: 'claude-fable-5', supported_endpoint_types: ['anthropic'] },
        { id: 'claude-sonnet-4-5-20250929', supported_endpoint_types: ['anthropic'] },
        { id: 'deepseek/deepseek-v4.1-flash', supported_endpoint_types: ['openai-response'] },
        { id: 'deepseek-v4.0', supported_endpoint_types: ['openai-response'] },
        { id: 'glm-5.3', supported_endpoint_types: ['openai'] },
        { id: 'glm-5.3-flash', supported_endpoint_types: ['openai'] },
        { id: 'glm-5.2', supported_endpoint_types: ['openai'] },
        { id: 'kimi-k3', supported_endpoint_types: ['openai'] },
        { id: 'kimi-k2.7', supported_endpoint_types: ['openai'] },
        { id: 'image-model', supported_endpoint_types: ['image-generation'] },
        { id: 'gpt-5.6-sol', supported_endpoint_types: ['openai'] }
      ]
    })).toEqual([
      {
        id: 'gpt-5.6-sol',
        name: 'GPT 5.6 Sol',
        protocols: ['openai-responses', 'openai-completions'],
        input: ['text', 'image']
      },
      {
        id: 'claude-fable-5',
        name: 'claude-fable-5',
        protocols: ['anthropic-messages'],
        input: ['text', 'image']
      },
      { id: 'deepseek/deepseek-v4.1-flash', name: 'deepseek/deepseek-v4.1-flash', protocols: ['openai-responses'], input: ['text', 'image'] },
      { id: 'glm-5.3', name: 'glm-5.3', protocols: ['openai-responses', 'openai-completions'], input: ['text'] },
      { id: 'glm-5.3-flash', name: 'glm-5.3-flash', protocols: ['openai-responses', 'openai-completions'], input: ['text', 'image'] },
      { id: 'kimi-k3', name: 'kimi-k3', protocols: ['openai-responses', 'openai-completions'], input: ['text', 'image'] }
    ])
    expect(isAllowedVinabotModel({ id: 'gpt-6-astra' })).toBe(true)
    expect(isAllowedVinabotModel({ id: 'claude-opus-4-8' })).toBe(false)
    expect(inputModalitiesOfModel({ id: 'glm-5.3' })).toEqual(['text'])
    expect(inputModalitiesOfModel({ id: 'glm-5.3-flash' })).toEqual(['text', 'image'])
  })

  it('prefers Responses generally and Anthropic Messages for Claude', () => {
    expect(recommendedProtocol({
      id: 'gpt-5.6-sol',
      protocols: ['openai-responses', 'openai-completions']
    })).toBe('openai-responses')
    expect(isClaudeModel({ id: 'vendor-model', name: 'Claude Sonnet' })).toBe(true)
    expect(recommendedProtocol({
      id: 'claude-sonnet',
      protocols: ['openai-responses', 'anthropic-messages', 'openai-completions']
    })).toBe('anthropic-messages')
  })
})

describe('VinaRouter setup flow', () => {
  it('logs in, provisions a device token, stores it Host-side, and selects the model', async () => {
    const context = fakeContext()
    const calls: Array<{ url: string; init?: RequestInit }> = []
    let searchCount = 0
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const href = String(url)
      calls.push({ url: href, init })
      const path = new URL(href).pathname
      if (path === '/api/status') return json({ success: true, data: { turnstile_check: false } })
      if (path === '/api/user/login') {
        expect(JSON.parse(String(init?.body))).toEqual({ username: 'alice', password: 'secret' })
        return json({
          success: true,
          data: {
            access_token: 'panel-token',
            session: { sid: 'panel-session' },
            user: { display_name: 'Alice' }
          }
        })
      }
      if (path === '/api/token/search') {
        searchCount += 1
        return json({
          success: true,
          data: {
            items: searchCount === 1
              ? []
              : [{ id: 41, name: 'dsh-desktop-12345678', status: 1 }]
          }
        })
      }
      if (path === '/api/token/') {
        expect(JSON.parse(String(init?.body))).toMatchObject({
          name: 'dsh-desktop-12345678',
          unlimited_quota: true,
          model_limits_enabled: false
        })
        return json({ success: true })
      }
      if (path === '/api/token/41/key') {
        return json({ success: true, data: { key: 'raw-model-key' } })
      }
      if (path === '/v1/models') {
        expect(new Headers(init?.headers).get('authorization')).toBe('Bearer sk-raw-model-key')
        return json({
          success: true,
          data: [
            { id: 'gpt-5.6-chat', supported_endpoint_types: ['openai'] },
            { id: 'gpt-5.6-sol', name: 'GPT 5.6 Sol', supported_endpoint_types: ['openai', 'openai-response'] },
            { id: 'deepseek-v4.1', supported_endpoint_types: ['openai-response'] },
            { id: 'claude-fable-5', name: 'Claude Fable 5', supported_endpoint_types: ['openai', 'anthropic'] },
            { id: 'image-d', supported_endpoint_types: ['image-generation'] }
          ]
        })
      }
      if (path === '/api/user/auth/logout') return json({ success: true })
      throw new Error(`Unexpected request: ${href}`)
    })
    const integration = new VinabotIntegration(context, {
      fetchImpl,
      anonymousId: '12345678-1234-1234-1234-123456789abc',
      randomUUID: () => 'flow-1'
    })

    const login = await integration.login({ username: 'alice', password: 'secret' })
    expect(login).toEqual({
      ok: true,
      stage: 'models',
      flowId: 'flow-1',
      displayName: 'Alice',
      models: [
        { id: 'gpt-5.6-chat', name: 'gpt-5.6-chat', protocols: ['openai-responses', 'openai-completions'], input: ['text', 'image'] },
        { id: 'gpt-5.6-sol', name: 'GPT 5.6 Sol', protocols: ['openai-responses', 'openai-completions'], input: ['text', 'image'] },
        { id: 'deepseek-v4.1', name: 'deepseek-v4.1', protocols: ['openai-responses'], input: ['text', 'image'] },
        { id: 'claude-fable-5', name: 'Claude Fable 5', protocols: ['anthropic-messages', 'openai-completions'], input: ['text', 'image'] }
      ]
    })
    expect(JSON.stringify(login)).not.toContain('panel-token')
    expect(JSON.stringify(login)).not.toContain('raw-model-key')

    const configured = await integration.configure({
      flowId: 'flow-1',
      selections: [
        { model: 'gpt-5.6-sol', protocol: 'auto' },
        { model: 'claude-fable-5', protocol: 'auto' },
        { model: 'gpt-5.6-chat', protocol: 'openai-completions' }
      ],
      defaultModel: 'gpt-5.6-sol'
    })
    expect(configured).toMatchObject({
      ok: true,
      configured: true,
      provider: VINABOT_PROVIDER,
      model: 'gpt-5.6-sol',
      protocol: 'openai-responses',
      modelCount: 3,
      providerCount: 3
    })
    expect(context.secret).toBe('sk-raw-model-key')
    expect(context.selection).toEqual({ provider: VINABOT_PROVIDER, model: 'gpt-5.6-sol' })
    expect(context.section.providers[VINABOT_PROVIDER]).toEqual({
      displayName: 'VinaRouter · Responses',
      apiKeyEnv: VINABOT_CREDENTIAL_REF,
      api: 'openai-responses',
      baseURL: 'https://router.vinabot.ai/v1',
      models: [{
        id: 'gpt-5.6-sol',
        name: 'GPT 5.6 Sol',
        input: ['text', 'image'],
        reasoningEfforts: VINABOT_RESPONSES_REASONING_EFFORTS
      }]
    })
    expect(context.section.providers[VINABOT_ANTHROPIC_PROVIDER]).toEqual({
      displayName: 'VinaRouter · Anthropic',
      apiKeyEnv: VINABOT_CREDENTIAL_REF,
      api: 'anthropic-messages',
      baseURL: 'https://router.vinabot.ai/v1',
      models: [{
        id: 'claude-fable-5',
        name: 'Claude Fable 5',
        input: ['text', 'image'],
        reasoningEfforts: VINABOT_ANTHROPIC_REASONING_EFFORTS
      }]
    })
    expect(context.section.providers[VINABOT_CHAT_PROVIDER]).toEqual({
      displayName: 'VinaRouter · Chat Completions',
      apiKeyEnv: VINABOT_CREDENTIAL_REF,
      api: 'openai-completions',
      baseURL: 'https://router.vinabot.ai/v1',
      models: [{
        id: 'gpt-5.6-chat',
        input: ['text', 'image'],
        reasoningEfforts: VINABOT_CHAT_REASONING_EFFORTS
      }]
    })
    expect(calls.some((call) => new URL(call.url).pathname === '/api/user/auth/logout')).toBe(true)

    await expect(integration.status()).resolves.toMatchObject({
      configured: true,
      credentialConfigured: true,
      protocol: 'openai-responses',
      selected: { provider: VINABOT_PROVIDER, model: 'gpt-5.6-sol' }
    })
  })

  it('keeps a two-factor flow secret and supports cancellation', async () => {
    const context = fakeContext()
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const path = new URL(String(url)).pathname
      if (path === '/api/status') return json({ success: true, data: { turnstile_check: false } })
      if (path === '/api/user/login') {
        return json({ success: true, data: { require_2fa: true, flow_token: 'private-2fa-token' } })
      }
      throw new Error(`Unexpected request: ${String(url)}`)
    })
    const integration = new VinabotIntegration(context, {
      fetchImpl,
      anonymousId: '12345678-1234-1234-1234-123456789abc',
      randomUUID: () => 'flow-2fa'
    })

    const result = await integration.login({ username: 'alice', password: 'secret' })
    expect(result).toEqual({ ok: true, stage: '2fa', flowId: 'flow-2fa' })
    expect(JSON.stringify(result)).not.toContain('private-2fa-token')
    await expect(integration.cancel({ flowId: 'flow-2fa' })).resolves.toEqual({ ok: true })
  })

  it('chooses Responses automatically for a Responses-only model', async () => {
    const context = fakeContext()
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const path = new URL(String(url)).pathname
      if (path === '/api/status') return json({ success: true, data: { turnstile_check: false } })
      if (path === '/api/user/login') {
        return json({ success: true, data: { access_token: 'panel', session: {}, user: {} } })
      }
      if (path === '/api/token/search') {
        return json({ success: true, data: { items: [{ id: 1, name: 'dsh-desktop-12345678', status: 1 }] } })
      }
      if (path === '/api/token/1/key') return json({ success: true, data: { key: 'key' } })
      if (path === '/v1/models') {
        return json({ success: true, data: [{ id: 'gpt-5.6-sol', supported_endpoint_types: ['openai-response'] }] })
      }
      if (path === '/api/user/auth/logout') return json({ success: true })
      throw new Error(`Unexpected request: ${String(url)}`)
    })
    const integration = new VinabotIntegration(context, {
      fetchImpl,
      anonymousId: '12345678-1234-1234-1234-123456789abc',
      randomUUID: () => 'flow-response'
    })
    await integration.login({ username: 'alice', password: 'secret' })

    await expect(integration.configure({
      flowId: 'flow-response',
      model: 'gpt-5.6-sol',
      protocol: 'auto'
    })).resolves.toMatchObject({ protocol: 'openai-responses' })
    expect(context.section.providers[VINABOT_PROVIDER]).toMatchObject({
      api: 'openai-responses',
      models: [{ id: 'gpt-5.6-sol', input: ['text', 'image'] }]
    })
  })
})

describe('VinaRouter package wiring', () => {
  it('mounts the Host plugin and exposes setup and settings client surfaces', async () => {
    const root = join(import.meta.dirname, '..')
    const [composition, host, client, manifest, dshPatch] = await Promise.all([
      readFile(join(root, 'build', 'dsh-desktop.patch.yml'), 'utf8'),
      readFile(join(root, 'packages', 'dsh-desktop-vinabot', 'index.js'), 'utf8'),
      readFile(join(root, 'packages', 'dsh-desktop-vinabot', 'client.js'), 'utf8'),
      readFile(join(root, 'package.json'), 'utf8'),
      readFile(patchPath('@deepseek-ai/dsh'), 'utf8')
    ])
    expect(composition).toContain('name: dsh-desktop-vinabot')
    expect(JSON.parse(manifest).dependencies['dsh-desktop-vinabot']).toBe(
      'file:packages/dsh-desktop-vinabot'
    )
    expect(dshPatch).toContain('"dsh-desktop-vinabot": "0.1.0"')
    expect(STATUS_PATH).toBe('/api/dsh-desktop/vinabot/status')
    expect(host).toContain("requestBody: 'buffered'")
    expect(client).toContain("const STATUS_PATH = '/api/dsh-desktop/vinabot/status'")
    expect(client).toContain("ctx.slots.inject('settings.onboarding'")
    expect(client).toContain("ctx.slots.inject('settings.section'")
    expect(client).toContain("type: 'checkbox'")
    expect(client).toContain("useState('openai-responses')")
    expect(client).toContain("protocolAnthropic: 'Anthropic API'")
    expect(client).not.toContain('VINABOT_API_KEY')
  })
})
