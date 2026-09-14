import { randomUUID } from 'node:crypto'

import { getOrCreateAnonymousUserId } from '@deepseek-ai/dsh-anonymous-user-id'
import { credentialRef } from '@deepseek-ai/dsh-credentials'

/** Stable Cordis plugin name. */
export const name = 'dsh-desktop-vinabot'

/** Host services used to persist the provider and expose same-origin routes. */
export const inject = ['connection', 'settings', 'credentials', 'agentDefaultModel']

export const VINABOT_ORIGIN = 'https://router.vinabot.ai'
export const VINABOT_API_BASE = `${VINABOT_ORIGIN}/v1`
export const VINABOT_PROVIDER = 'vinabot'
export const VINABOT_ANTHROPIC_PROVIDER = 'vinabot-anthropic'
export const VINABOT_CHAT_PROVIDER = 'vinabot-chat'
export const VINABOT_CREDENTIAL_REF = 'VINABOT_API_KEY'
export const VINABOT_SETTINGS_NAMESPACE = 'llm-pi-ai'

export const VINABOT_PROVIDER_BY_PROTOCOL = Object.freeze({
  'openai-responses': VINABOT_PROVIDER,
  'anthropic-messages': VINABOT_ANTHROPIC_PROVIDER,
  'openai-completions': VINABOT_CHAT_PROVIDER
})

export const VINABOT_RESPONSES_REASONING_EFFORTS = Object.freeze({
  low: 'low',
  medium: 'medium',
  high: 'high',
  xhigh: 'xhigh',
  max: 'max'
})

export const VINABOT_ANTHROPIC_REASONING_EFFORTS = Object.freeze({
  low: 'low',
  high: 'high',
  max: 'max'
})

export const VINABOT_CHAT_REASONING_EFFORTS = Object.freeze({
  low: 'low',
  high: 'high',
  max: 'max'
})

export const STATUS_PATH = '/api/dsh-desktop/vinabot/status'
export const LOGIN_PATH = '/api/dsh-desktop/vinabot/login'
export const TWO_FACTOR_PATH = '/api/dsh-desktop/vinabot/2fa'
export const CONFIGURE_PATH = '/api/dsh-desktop/vinabot/configure'
export const CANCEL_PATH = '/api/dsh-desktop/vinabot/cancel'

const MAX_LOCAL_BODY_BYTES = 16 * 1024
const MAX_UPSTREAM_BODY_BYTES = 4 * 1024 * 1024
const REQUEST_TIMEOUT_MS = 30_000
const FLOW_TTL_MS = 10 * 60 * 1000
const MAX_FLOWS = 16
const TEXT_INPUT = Object.freeze(['text'])
const IMAGE_INPUT = Object.freeze(['text', 'image'])

const MODEL_FAMILY_RULES = Object.freeze([
  Object.freeze({ family: /(?:^|[^a-z0-9])gpt(?=$|[^a-z0-9])/iu, minimum: Object.freeze([5, 6]) }),
  Object.freeze({ family: /(?:^|[^a-z0-9])claude(?=$|[^a-z0-9])/iu, minimum: Object.freeze([5, 0]) }),
  Object.freeze({ family: /(?:^|[^a-z0-9])deepseek(?=$|[^a-z0-9])/iu, minimum: Object.freeze([4, 1]) }),
  Object.freeze({ family: /(?:^|[^a-z0-9])glm(?=$|[^a-z0-9])/iu, minimum: Object.freeze([5, 3]) }),
  Object.freeze({ family: /(?:^|[^a-z0-9])kimi?(?=$|[^a-z0-9])/iu, minimum: Object.freeze([3, 0]) })
])

/** An expected integration failure with a safe client-facing message. */
export class VinabotIntegrationError extends Error {
  constructor(message, status = 400, code = 'VINABOT_ERROR', options) {
    super(message, options)
    this.name = 'VinabotIntegrationError'
    this.status = status
    this.code = code
  }
}

/** Avoid reflecting arbitrarily large or control-character-filled upstream messages. */
function safeMessage(value, fallback) {
  if (typeof value !== 'string') return fallback
  const normalized = value.replace(/[\u0000-\u001f\u007f]/gu, ' ').trim()
  return normalized.length === 0 ? fallback : normalized.slice(0, 500)
}

/** Return the OpenAI-compatible spelling accepted by the relay. */
export function normalizeApiKey(value) {
  const key = typeof value === 'string' ? value.trim() : ''
  if (key.length === 0) {
    throw new VinabotIntegrationError('VinaRouter 没有返回可用的 API 密钥。', 502, 'API_KEY_MISSING')
  }
  return key.startsWith('sk-') ? key : `sk-${key}`
}

export function isClaudeModel(model) {
  const id = typeof model?.id === 'string' ? model.id : ''
  const names = [model?.name, model?.display_name, model?.displayName]
    .filter((value) => typeof value === 'string')
    .join(' ')
  return `${id} ${names}`.toLowerCase().includes('claude')
}

function modelLabels(model) {
  return [model?.id, model?.name, model?.display_name, model?.displayName]
    .filter((value) => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim().toLowerCase())
}

function versionAfterFamily(label, family) {
  const match = family.exec(label)
  if (match === null || match.index === undefined) return undefined
  const tail = label.slice(match.index + match[0].length)
  const version = tail.match(/^[^0-9]{0,32}(\d{1,2})(?:[._-](\d{1,3}))?/u)
  if (version === null) return undefined
  return [Number(version[1]), Number(version[2] ?? 0)]
}

function versionAtLeast(actual, minimum) {
  return actual[0] > minimum[0] || actual[0] === minimum[0] && actual[1] >= minimum[1]
}

/** Restrict discovery to the model families and minimum versions supported by this integration. */
export function isAllowedVinabotModel(model) {
  const labels = modelLabels(model)
  return MODEL_FAMILY_RULES.some(({ family, minimum }) => labels.some((label) => {
    const version = versionAfterFamily(label, family)
    return version !== undefined && versionAtLeast(version, minimum)
  }))
}

function isTextOnlyGlm53(model) {
  const id = typeof model?.id === 'string' ? model.id.trim().toLowerCase() : ''
  const leaf = id.split('/').at(-1) ?? ''
  return /^glm[-_. ]*5[._-]3$/u.test(leaf)
}

/** Every admitted model accepts images except the base glm-5.3 model. */
export function inputModalitiesOfModel(model) {
  return isAllowedVinabotModel(model) && !isTextOnlyGlm53(model)
    ? [...IMAGE_INPUT]
    : [...TEXT_INPUT]
}

/** Map NewAPI endpoint identifiers into the text protocols DSH can use here. */
export function protocolsOfModel(model) {
  const endpoints = Array.isArray(model?.supported_endpoint_types)
    ? model.supported_endpoint_types
    : []
  const claude = isClaudeModel(model)
  const protocols = []
  if (endpoints.includes('openai-response') || !claude && endpoints.includes('openai')) {
    protocols.push('openai-responses')
  }
  if (endpoints.includes('anthropic') || claude) protocols.push('anthropic-messages')
  if (endpoints.includes('openai')) protocols.push('openai-completions')
  return protocols
}

/** Prefer native reasoning/tool protocols, with Claude routed through Messages. */
export function recommendedProtocol(model) {
  const protocols = Array.isArray(model?.protocols) ? model.protocols : protocolsOfModel(model)
  if (isClaudeModel(model) && protocols.includes('anthropic-messages')) {
    return 'anthropic-messages'
  }
  if (protocols.includes('openai-responses')) return 'openai-responses'
  if (protocols.includes('anthropic-messages')) return 'anthropic-messages'
  if (protocols.includes('openai-completions')) return 'openai-completions'
  return isClaudeModel(model) ? 'anthropic-messages' : 'openai-responses'
}

/** Keep only admitted agent models that have a supported wire protocol. */
export function normalizeModels(payload) {
  const rows = Array.isArray(payload?.data) ? payload.data : []
  const seen = new Set()
  const models = []
  for (const row of rows) {
    const id = typeof row?.id === 'string' ? row.id.trim() : ''
    if (id.length === 0 || seen.has(id)) continue
    if (!isAllowedVinabotModel(row)) continue
    const protocols = protocolsOfModel(row)
    if (protocols.length === 0) continue
    seen.add(id)
    const label = [row?.name, row?.display_name, row?.displayName]
      .find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0)
    models.push({
      id,
      name: typeof label === 'string' ? label.trim() : id,
      protocols,
      input: inputModalitiesOfModel(row)
    })
  }
  return models
}

function asObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : undefined
}

async function readBoundedResponse(response) {
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_UPSTREAM_BODY_BYTES) {
    await response.body?.cancel().catch(() => {})
    throw new VinabotIntegrationError('VinaRouter 返回的数据过大。', 502, 'UPSTREAM_TOO_LARGE')
  }
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.byteLength > MAX_UPSTREAM_BODY_BYTES) {
    throw new VinabotIntegrationError('VinaRouter 返回的数据过大。', 502, 'UPSTREAM_TOO_LARGE')
  }
  const text = new TextDecoder().decode(bytes)
  if (text.length === 0) return {}
  try {
    return JSON.parse(text)
  } catch (cause) {
    throw new VinabotIntegrationError(
      'VinaRouter 返回了无法解析的数据。',
      502,
      'UPSTREAM_INVALID_JSON',
      { cause }
    )
  }
}

function requestSignal(parentSignal) {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  return parentSignal === undefined ? timeout : AbortSignal.any([parentSignal, timeout])
}

/** Small, secret-redacting client for the documented VinaRouter endpoints. */
export class VinabotClient {
  constructor(fetchImpl = globalThis.fetch) {
    this.fetch = fetchImpl
  }

  async request(path, options = {}) {
    const headers = new Headers({ accept: 'application/json' })
    if (options.accessToken !== undefined) {
      headers.set('authorization', `Bearer ${options.accessToken}`)
    } else if (options.apiKey !== undefined) {
      headers.set('authorization', `Bearer ${options.apiKey}`)
    }
    let body
    if (options.body !== undefined) {
      headers.set('content-type', 'application/json')
      body = JSON.stringify(options.body)
    }
    let response
    try {
      response = await this.fetch(`${VINABOT_ORIGIN}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body,
        signal: requestSignal(options.signal)
      })
    } catch (cause) {
      if (options.signal?.aborted) {
        throw new VinabotIntegrationError('操作已取消。', 499, 'ABORTED', { cause })
      }
      throw new VinabotIntegrationError(
        '无法连接 VinaRouter，请检查网络后重试。',
        502,
        'UPSTREAM_UNREACHABLE',
        { cause }
      )
    }
    const payload = await readBoundedResponse(response)
    if (!response.ok || payload?.success === false) {
      const fallback = response.status === 401 || response.status === 403
        ? '登录信息或权限无效。'
        : `VinaRouter 请求失败（HTTP ${response.status}）。`
      throw new VinabotIntegrationError(
        safeMessage(payload?.message ?? payload?.error?.message, fallback),
        response.status >= 400 && response.status < 500 ? response.status : 502,
        'UPSTREAM_REJECTED'
      )
    }
    return payload
  }

  async logout(accessToken, sid) {
    if (typeof accessToken !== 'string' || accessToken.length === 0) return
    const headers = new Headers({
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`
    })
    if (typeof sid === 'string' && sid.length > 0) headers.set('x-auth-session', sid)
    try {
      const response = await this.fetch(`${VINABOT_ORIGIN}/api/user/auth/logout`, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(10_000)
      })
      await response.body?.cancel().catch(() => {})
    } catch {
      // Best effort: the short-lived panel token is never persisted locally.
    }
  }
}

function tokenItems(payload) {
  const data = asObject(payload?.data)
  return Array.isArray(data?.items) ? data.items : []
}

function newestEnabledToken(items, tokenName) {
  return items
    .filter((item) => item?.name === tokenName && item?.status === 1 && Number.isInteger(item?.id))
    .sort((left, right) => right.id - left.id)[0]
}

function requireText(value, label, maxLength) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (text.length === 0) {
    throw new VinabotIntegrationError(`请输入${label}。`, 400, 'INVALID_INPUT')
  }
  if (text.length > maxLength) {
    throw new VinabotIntegrationError(`${label}过长。`, 400, 'INVALID_INPUT')
  }
  return text
}

/** Parse a small JSON request without allowing a browser to allocate an unbounded body. */
async function readLocalJson(request) {
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_LOCAL_BODY_BYTES) {
    throw new VinabotIntegrationError('请求数据过大。', 413, 'REQUEST_TOO_LARGE')
  }
  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > MAX_LOCAL_BODY_BYTES) {
    throw new VinabotIntegrationError('请求数据过大。', 413, 'REQUEST_TOO_LARGE')
  }
  try {
    return asObject(JSON.parse(text)) ?? {}
  } catch (cause) {
    throw new VinabotIntegrationError('请求不是有效的 JSON。', 400, 'INVALID_JSON', { cause })
  }
}

function flowPresentation(flow) {
  if (flow.stage === '2fa') {
    return { ok: true, stage: '2fa', flowId: flow.id }
  }
  return {
    ok: true,
    stage: 'models',
    flowId: flow.id,
    displayName: flow.displayName,
    models: flow.models.map((model) => ({
      id: model.id,
      name: model.name,
      protocols: [...model.protocols],
      input: [...model.input]
    }))
  }
}

/**
 * Stateful setup coordinator. Secrets live only in its Host-side flow map and
 * are committed straight into the DSH credential provider on confirmation.
 */
export class VinabotIntegration {
  constructor(ctx, options = {}) {
    this.ctx = ctx
    this.client = new VinabotClient(options.fetchImpl)
    this.now = options.now ?? Date.now
    this.uuid = options.randomUUID ?? randomUUID
    const anonymousId = String(options.anonymousId ?? getOrCreateAnonymousUserId())
    this.tokenName = `dsh-desktop-${anonymousId.replace(/-/gu, '').slice(0, 8)}`
    this.flows = new Map()
  }

  async purgeExpiredFlows() {
    const now = this.now()
    const expired = [...this.flows.values()].filter((flow) => flow.expiresAt <= now)
    for (const flow of expired) {
      this.flows.delete(flow.id)
      await this.client.logout(flow.accessToken, flow.sid)
    }
  }

  createFlow(value) {
    if (this.flows.size >= MAX_FLOWS) {
      throw new VinabotIntegrationError('登录操作过多，请稍后重试。', 429, 'TOO_MANY_FLOWS')
    }
    const id = this.uuid()
    const flow = {
      id,
      expiresAt: this.now() + FLOW_TTL_MS,
      ...value
    }
    this.flows.set(id, flow)
    return flow
  }

  requireFlow(flowId, expectedStage) {
    const id = requireText(flowId, '登录流程标识', 128)
    const flow = this.flows.get(id)
    if (flow === undefined || flow.expiresAt <= this.now()) {
      if (flow !== undefined) this.flows.delete(id)
      throw new VinabotIntegrationError('登录已过期，请重新登录。', 410, 'FLOW_EXPIRED')
    }
    if (flow.stage !== expectedStage) {
      throw new VinabotIntegrationError('登录流程状态无效，请重新登录。', 409, 'FLOW_STATE_INVALID')
    }
    return flow
  }

  async status() {
    const section = asObject(this.ctx.settings.get(VINABOT_SETTINGS_NAMESPACE))
    const providers = asObject(section?.providers)
    const profiles = Object.values(VINABOT_PROVIDER_BY_PROTOCOL).flatMap((provider) => {
      const profile = asObject(providers?.[provider])
      return profile === undefined ? [] : [{ provider, profile }]
    })
    let credentialConfigured = false
    if (profiles.some(({ profile }) => profile.apiKeyEnv === VINABOT_CREDENTIAL_REF)) {
      try {
        credentialConfigured = (await this.ctx.credentials.describe(
          credentialRef(VINABOT_CREDENTIAL_REF)
        )).configured === true
      } catch {
        credentialConfigured = false
      }
    }
    const models = profiles.flatMap(({ provider, profile }) => Array.isArray(profile.models)
      ? profile.models.flatMap((model) => {
        const id = typeof model?.id === 'string' ? model.id : ''
        return id.length === 0 ? [] : [{
          id,
          name: model?.name ?? id,
          provider,
          protocol: profile.api
        }]
      })
      : [])
    const selected = this.ctx.agentDefaultModel.currentSelection()
    const selectedProfile = profiles.find(({ provider }) => provider === selected?.provider)?.profile
    const firstProfile = profiles[0]?.profile
    return {
      ok: true,
      configured: profiles.length > 0 && credentialConfigured && models.length > 0,
      credentialConfigured,
      provider: profiles.some(({ provider }) => provider === selected?.provider)
        ? selected.provider
        : VINABOT_PROVIDER,
      displayName: selectedProfile?.displayName ?? firstProfile?.displayName ?? 'VinaRouter',
      baseURL: selectedProfile?.baseURL ?? firstProfile?.baseURL ?? VINABOT_API_BASE,
      protocol: selectedProfile?.api ?? firstProfile?.api,
      models,
      selected: profiles.some(({ provider }) => provider === selected?.provider) ? selected : undefined
    }
  }

  async login(input, signal) {
    await this.purgeExpiredFlows()
    const username = requireText(input?.username, '用户名', 256)
    const password = requireText(input?.password, '密码', 4096)
    const platform = await this.client.request('/api/status', { signal })
    if (platform?.data?.turnstile_check === true) {
      throw new VinabotIntegrationError(
        'VinaRouter 当前启用了人机验证，请先在网站登录并通过“手动配置”粘贴 API 密钥。',
        409,
        'TURNSTILE_REQUIRED'
      )
    }
    const payload = await this.client.request('/api/user/login', {
      method: 'POST',
      body: { username, password },
      signal
    })
    const data = asObject(payload?.data)
    if (data?.require_2fa === true) {
      const flowToken = requireText(data.flow_token, '两步验证流程令牌', 4096)
      return flowPresentation(this.createFlow({ stage: '2fa', flowToken }))
    }
    return this.finishPanelLogin(data, signal)
  }

  async verifyTwoFactor(input, signal) {
    await this.purgeExpiredFlows()
    const flow = this.requireFlow(input?.flowId, '2fa')
    const code = requireText(input?.code, '验证码', 128)
    const payload = await this.client.request('/api/user/login/2fa', {
      method: 'POST',
      body: { flow_token: flow.flowToken, code },
      signal
    })
    this.flows.delete(flow.id)
    return this.finishPanelLogin(asObject(payload?.data), signal)
  }

  async finishPanelLogin(data, signal) {
    const accessToken = requireText(data?.access_token, '登录令牌', 8192)
    const sid = typeof data?.session?.sid === 'string' ? data.session.sid : undefined
    const displayName = [data?.user?.display_name, data?.user?.username]
      .find((value) => typeof value === 'string' && value.trim().length > 0)
    const flow = this.createFlow({
      stage: 'loading',
      accessToken,
      sid,
      displayName: typeof displayName === 'string' ? displayName.trim() : undefined
    })
    try {
      const searchPath = `/api/token/search?p=1&page_size=100&keyword=${encodeURIComponent(this.tokenName)}`
      let search = await this.client.request(searchPath, { accessToken, signal })
      let token = newestEnabledToken(tokenItems(search), this.tokenName)
      if (token === undefined) {
        await this.client.request('/api/token/', {
          method: 'POST',
          accessToken,
          body: {
            name: this.tokenName,
            expired_time: -1,
            unlimited_quota: true,
            model_limits_enabled: false
          },
          signal
        })
        search = await this.client.request(searchPath, { accessToken, signal })
        token = newestEnabledToken(tokenItems(search), this.tokenName)
      }
      if (token === undefined) {
        throw new VinabotIntegrationError(
          '已创建 API 令牌，但无法在令牌列表中找到它。',
          502,
          'TOKEN_NOT_FOUND'
        )
      }
      const keyPayload = await this.client.request(`/api/token/${String(token.id)}/key`, {
        method: 'POST',
        accessToken,
        signal
      })
      const apiKey = normalizeApiKey(keyPayload?.data?.key)
      const modelPayload = await this.client.request('/v1/models', { apiKey, signal })
      flow.stage = 'models'
      flow.apiKey = apiKey
      flow.models = normalizeModels(modelPayload)
      flow.tokenId = token.id
      return flowPresentation(flow)
    } catch (error) {
      this.flows.delete(flow.id)
      await this.client.logout(accessToken, sid)
      throw error
    }
  }

  resolveProtocol(flow, selectedModel, requested) {
    const allowed = new Set([
      'auto',
      'openai-completions',
      'openai-responses',
      'anthropic-messages'
    ])
    const choice = typeof requested === 'string' ? requested : 'auto'
    if (!allowed.has(choice)) {
      throw new VinabotIntegrationError('API 协议无效。', 400, 'INVALID_PROTOCOL')
    }
    const discovered = flow.models.find((model) => model.id === selectedModel)
    if (choice !== 'auto') {
      if (discovered !== undefined && !discovered.protocols.includes(choice)) {
        throw new VinabotIntegrationError(
          '所选模型不支持这个 API 协议。',
          400,
          'PROTOCOL_UNSUPPORTED'
        )
      }
      return choice
    }
    return recommendedProtocol(discovered ?? { id: selectedModel, name: selectedModel, protocols: [] })
  }

  async configure(input) {
    await this.purgeExpiredFlows()
    const flow = this.requireFlow(input?.flowId, 'models')
    const rawSelections = Array.isArray(input?.selections)
      ? input.selections
      : [{ model: input?.model, protocol: input?.protocol }]
    if (rawSelections.length === 0) {
      throw new VinabotIntegrationError('请至少选择一个模型。', 400, 'NO_MODELS_SELECTED')
    }
    if (rawSelections.length > 100) {
      throw new VinabotIntegrationError('一次最多选择 100 个模型。', 400, 'TOO_MANY_MODELS')
    }
    const seen = new Set()
    const selections = rawSelections.map((raw) => {
      const selectedModel = requireText(raw?.model, '模型 ID', 512)
      if (seen.has(selectedModel)) {
        throw new VinabotIntegrationError('模型选择中存在重复项。', 400, 'DUPLICATE_MODEL')
      }
      seen.add(selectedModel)
      const discovered = flow.models.find((model) => model.id === selectedModel)
      return {
        model: selectedModel,
        protocol: this.resolveProtocol(flow, selectedModel, raw?.protocol),
        name: discovered?.name ?? selectedModel,
        input: discovered?.input ?? inputModalitiesOfModel({ id: selectedModel })
      }
    })
    const defaultModel = requireText(input?.defaultModel ?? selections[0]?.model, '默认模型', 512)
    const defaultSelection = selections.find((selection) => selection.model === defaultModel)
    if (defaultSelection === undefined) {
      throw new VinabotIntegrationError('默认模型必须包含在已选模型中。', 400, 'DEFAULT_NOT_SELECTED')
    }
    const grouped = new Map()
    for (const selection of selections) {
      const list = grouped.get(selection.protocol) ?? []
      const reasoningEfforts = selection.protocol === 'openai-responses'
        ? VINABOT_RESPONSES_REASONING_EFFORTS
        : selection.protocol === 'anthropic-messages'
          ? VINABOT_ANTHROPIC_REASONING_EFFORTS
          : VINABOT_CHAT_REASONING_EFFORTS
      list.push({
        id: selection.model,
        ...(selection.name === selection.model ? {} : { name: selection.name }),
        input: [...selection.input],
        reasoningEfforts: { ...reasoningEfforts }
      })
      grouped.set(selection.protocol, list)
    }
    const profiles = new Map()
    for (const [protocol, models] of grouped) {
      const provider = VINABOT_PROVIDER_BY_PROTOCOL[protocol]
      if (provider === undefined) {
        throw new VinabotIntegrationError('API 协议无效。', 400, 'INVALID_PROTOCOL')
      }
      const protocolLabel = protocol === 'openai-responses'
        ? 'Responses'
        : protocol === 'anthropic-messages' ? 'Anthropic' : 'Chat Completions'
      profiles.set(provider, {
        displayName: `VinaRouter · ${protocolLabel}`,
        apiKeyEnv: VINABOT_CREDENTIAL_REF,
        api: protocol,
        baseURL: VINABOT_API_BASE,
        models
      })
    }
    const ref = credentialRef(VINABOT_CREDENTIAL_REF)
    const credentialInfo = await this.ctx.credentials.describe(ref)
    if (!credentialInfo.writable) {
      throw new VinabotIntegrationError(
        'VINABOT_API_KEY 当前由只读来源提供，无法通过客户端替换。',
        409,
        'CREDENTIAL_READ_ONLY'
      )
    }
    const section = asObject(this.ctx.settings.get(VINABOT_SETTINGS_NAMESPACE))
    const providers = asObject(section?.providers)
    const managedProviders = Object.values(VINABOT_PROVIDER_BY_PROTOCOL)
    const previous = new Map(managedProviders.map((provider) => [
      provider,
      asObject(providers?.[provider])
    ]))
    const operations = managedProviders.flatMap((provider) => {
      const profile = profiles.get(provider)
      if (profile !== undefined) {
        return [{ op: 'set', path: ['providers', provider], value: profile }]
      }
      return previous.get(provider) === undefined
        ? []
        : [{ op: 'unset', path: ['providers', provider] }]
    })
    await this.ctx.settings.mutate(VINABOT_SETTINGS_NAMESPACE, operations)
    try {
      await this.ctx.credentials.set(ref, flow.apiKey)
    } catch (cause) {
      const rollback = managedProviders.map((provider) => {
        const profile = previous.get(provider)
        return profile === undefined
          ? { op: 'unset', path: ['providers', provider] }
          : { op: 'set', path: ['providers', provider], value: profile }
      })
      await this.ctx.settings.mutate(VINABOT_SETTINGS_NAMESPACE, rollback).catch(() => {})
      throw new VinabotIntegrationError(
        '模型配置已回滚，因为 API 密钥无法保存。',
        500,
        'CREDENTIAL_WRITE_FAILED',
        { cause }
      )
    }
    let warning
    const defaultProvider = VINABOT_PROVIDER_BY_PROTOCOL[defaultSelection.protocol]
    try {
      await this.ctx.agentDefaultModel.saveSelection({
        provider: defaultProvider,
        model: defaultModel
      })
    } catch {
      warning = 'VinaRouter 已接入，但默认模型未能保存；请在聊天输入框中手动选择一次。'
    }
    this.flows.delete(flow.id)
    await this.client.logout(flow.accessToken, flow.sid)
    return {
      ok: true,
      configured: true,
      provider: defaultProvider,
      model: defaultModel,
      protocol: defaultSelection.protocol,
      modelCount: selections.length,
      providerCount: profiles.size,
      warning
    }
  }

  async cancel(input) {
    await this.purgeExpiredFlows()
    const flowId = typeof input?.flowId === 'string' ? input.flowId : ''
    const flow = this.flows.get(flowId)
    if (flow !== undefined) {
      this.flows.delete(flowId)
      await this.client.logout(flow.accessToken, flow.sid)
    }
    return { ok: true }
  }

  async dispose() {
    const flows = [...this.flows.values()]
    this.flows.clear()
    await Promise.all(flows.map((flow) => this.client.logout(flow.accessToken, flow.sid)))
  }
}

function errorResponse(error) {
  const expected = error instanceof VinabotIntegrationError
  return Response.json({
    ok: false,
    code: expected ? error.code : 'INTERNAL_ERROR',
    error: expected ? error.message : 'VinaRouter 集成发生内部错误。'
  }, {
    status: expected ? error.status : 500,
    headers: { 'cache-control': 'no-store' }
  })
}

function registerJsonRoute(connection, path, methods, handler) {
  connection.fetch.register({
    path,
    methods,
    requestBody: 'buffered',
    fetch: async (request) => {
      try {
        return Response.json(await handler(request), {
          headers: { 'cache-control': 'no-store' }
        })
      } catch (error) {
        return errorResponse(error)
      }
    }
  })
}

/** Register the setup API on the authenticated same-origin DSH connection. */
export function apply(ctx) {
  const integration = new VinabotIntegration(ctx)
  const connection = Reflect.get(ctx, 'connection')

  registerJsonRoute(connection, STATUS_PATH, ['GET'], () => integration.status())
  registerJsonRoute(connection, LOGIN_PATH, ['POST'], async (request) => {
    return integration.login(await readLocalJson(request), request.signal)
  })
  registerJsonRoute(connection, TWO_FACTOR_PATH, ['POST'], async (request) => {
    return integration.verifyTwoFactor(await readLocalJson(request), request.signal)
  })
  registerJsonRoute(connection, CONFIGURE_PATH, ['POST'], async (request) => {
    return integration.configure(await readLocalJson(request))
  })
  registerJsonRoute(connection, CANCEL_PATH, ['POST'], async (request) => {
    return integration.cancel(await readLocalJson(request))
  })

  ctx.effect(() => () => integration.dispose())
}
