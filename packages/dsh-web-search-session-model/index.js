import z from '@deepseek-ai/schemastery'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import {
  installSettingsSection,
  settingsNamespace
} from '@deepseek-ai/dsh-settings'
import { WebError } from '@deepseek-ai/dsh-web'

export const name = 'web-search-session-model'
export const inject = ['agents', 'credentials', 'settings', 'web']
export const SESSION_MODEL_SEARCH_PROVIDER_ID = 'sherlock-session-model'
export const SESSION_MODEL_SEARCH_SETTINGS_NAMESPACE = settingsNamespace(
  'web-search-session-model'
)
export const SEARCH_MODES = ['auto', 'native-only', 'off']
export const Config = z.object({ mode: z.union(SEARCH_MODES).default('auto') })

const LLM_PI_AI_SETTINGS_NAMESPACE = settingsNamespace('llm-pi-ai')
const DEFAULT_MAX_OUTPUT_TOKENS = 4096
const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1'
const LOCAL_SEARCH_URL_ENV = 'SHERLOCK_LOCAL_SEARCH_URL'
const LOCAL_SEARCH_TOKEN_ENV = 'SHERLOCK_LOCAL_SEARCH_TOKEN'

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function selectedModel(ctx) {
  const agent = ctx.get('agents')?.currentInitiator()
  const config = agent?.session.requestHeader()?.config
  const provider = nonEmptyString(config?.provider)
  const model = nonEmptyString(config?.model)
  if (!provider || !model) {
    throw new WebError(
      'Web search needs an active session model selection.',
      'WEB_MODEL_SELECTION_MISSING'
    )
  }
  return { agent, provider, model }
}

function providerProfile(ctx, provider) {
  const settings = ctx.get('settings')?.get(LLM_PI_AI_SETTINGS_NAMESPACE)
  const providers = isRecord(settings) && isRecord(settings.providers)
    ? settings.providers
    : undefined
  return providers && isRecord(providers[provider]) ? providers[provider] : undefined
}

function supportsResponses(provider, profile) {
  const protocol = nonEmptyString(profile?.api)
  return protocol === 'openai-responses' || (provider === 'openai' && protocol === undefined)
}

export function resolveSessionSearchRoute(ctx) {
  const { provider, model } = selectedModel(ctx)
  const profile = providerProfile(ctx, provider)
  return {
    provider,
    model,
    ...(supportsResponses(provider, profile)
      ? { nativeKind: 'openai-responses' }
      : {}),
    ...(profile ? { profile } : {})
  }
}

function responsesBaseURL(provider, profile) {
  const baseURL =
    nonEmptyString(profile?.baseURL) ??
    (provider === 'openai' ? DEFAULT_OPENAI_BASE_URL : undefined)
  if (!baseURL || !URL.canParse(baseURL)) {
    throw new WebError(
      `The selected model provider "${provider}" has no valid Responses API base URL.`,
      'WEB_MODEL_ROUTE_UNAVAILABLE'
    )
  }
  const parsed = new URL(baseURL)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new WebError(
      `The selected model provider "${provider}" must use an HTTP(S) API endpoint.`,
      'WEB_MODEL_ROUTE_UNAVAILABLE'
    )
  }
  return baseURL.replace(/\/+$/u, '')
}

async function resolveApiKey(ctx, provider, profile) {
  const configuredRef = nonEmptyString(profile?.apiKeyEnv)
  const fallbackRef = provider === 'openai' ? 'OPENAI_API_KEY' : undefined
  const ref = credentialRef(configuredRef ?? fallbackRef ?? `${provider.toUpperCase()}_API_KEY`)
  const credentials = ctx.get('credentials')
  const hit = credentials
    ? await credentials.resolve(ref)
    : launchEnvironmentOf(ctx).get(ref)
  const value = nonEmptyString(hit?.value)
  if (!value) {
    throw new WebError(
      `The selected model provider "${provider}" has no API key for "${ref}".`,
      'WEB_PROVIDER_CREDENTIAL_MISSING'
    )
  }
  return { apiKey: value, apiKeyRef: ref }
}

/** Resolve native Responses options only after the route is allowlisted. */
export async function resolveSessionSearchOptions(ctx) {
  const { agent, provider, model } = selectedModel(ctx)
  const profile = providerProfile(ctx, provider)
  if (!supportsResponses(provider, profile)) {
    throw new WebError(
      `The selected model provider "${provider}" does not expose a verified Responses web_search route.`,
      'WEB_MODEL_SEARCH_UNSUPPORTED'
    )
  }
  const { apiKey, apiKeyRef } = await resolveApiKey(ctx, provider, profile)
  const headers = isRecord(profile?.headers)
    ? Object.fromEntries(
        Object.entries(profile.headers).filter(
          ([key, value]) =>
            typeof value === 'string' && key.toLowerCase() !== 'authorization'
        )
      )
    : {}
  return {
    provider,
    model,
    apiKey,
    apiKeyRef,
    baseURL: responsesBaseURL(provider, profile),
    headers,
    recordRequest: (request) => {
      agent?.session.append('web/session-model-search-llm-request', request)
    }
  }
}

function responseSources(body) {
  const sources = []
  const seen = new Set()
  const add = (candidate) => {
    if (!isRecord(candidate)) return
    const url = nonEmptyString(candidate.url)
    if (!url || seen.has(url) || !URL.canParse(url)) return
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return
    seen.add(url)
    sources.push({
      url,
      ...(nonEmptyString(candidate.title) ? { title: candidate.title } : {}),
      ...(nonEmptyString(candidate.snippet) ? { snippet: candidate.snippet } : {})
    })
  }
  for (const item of Array.isArray(body.output) ? body.output : []) {
    if (!isRecord(item)) continue
    if (item.type === 'web_search_call' && isRecord(item.action)) {
      for (const source of Array.isArray(item.action.sources) ? item.action.sources : []) {
        add(source)
      }
    }
    for (const part of Array.isArray(item.content) ? item.content : []) {
      if (!isRecord(part)) continue
      for (const annotation of Array.isArray(part.annotations) ? part.annotations : []) {
        if (isRecord(annotation) && annotation.type === 'url_citation') add(annotation)
      }
    }
  }
  return sources
}

function responseText(body) {
  const pieces = []
  for (const item of Array.isArray(body.output) ? body.output : []) {
    if (!isRecord(item)) continue
    for (const part of Array.isArray(item.content) ? item.content : []) {
      if (isRecord(part) && part.type === 'output_text' && nonEmptyString(part.text)) {
        pieces.push(part.text)
      }
    }
  }
  return pieces.join('\n').trim()
}

function usedWebSearch(body) {
  return (Array.isArray(body.output) ? body.output : []).some(
    (item) => isRecord(item) && item.type === 'web_search_call'
  )
}

function apiErrorMessage(body, status) {
  if (isRecord(body?.error) && nonEmptyString(body.error.message)) return body.error.message
  if (nonEmptyString(body?.message)) return body.message
  return `HTTP ${status}`
}

function unsupportedSearch(status, message) {
  return (
    status === 404 ||
    status === 405 ||
    (status >= 400 &&
      status < 500 &&
      /(?:web.?search|responses|unknown tool|unsupported)/iu.test(message))
  )
}

function aborted(signal, error) {
  return (
    signal?.aborted === true ||
    (error instanceof DOMException && error.name === 'AbortError') ||
    (isRecord(error) && error.code === 'WEB_ABORTED')
  )
}

function abortWebError(signal, cause) {
  return new WebError('Web search was aborted.', 'WEB_ABORTED', {
    cause: signal?.aborted === true ? signal.reason : cause
  })
}

async function searchResponses(options, request, signal) {
  if (signal?.aborted) throw abortWebError(signal)
  const endpoint = `${options.baseURL}/responses`
  const body = {
    model: options.model,
    input: `Search the web for this query and return a concise factual answer with citations: ${request.query}`,
    tools: [{ type: 'web_search' }],
    tool_choice: 'required',
    include: ['web_search_call.action.sources'],
    max_output_tokens: DEFAULT_MAX_OUTPUT_TOKENS
  }
  options.recordRequest?.({
    endpoint,
    provider: options.provider,
    model: options.model,
    apiKeyRef: options.apiKeyRef,
    body
  })
  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      redirect: 'error',
      headers: {
        ...options.headers,
        authorization: `Bearer ${options.apiKey}`,
        'content-type': 'application/json',
        accept: 'application/json',
        'user-agent': 'sherlock/0.6.8'
      },
      body: JSON.stringify(body),
      ...(signal ? { signal } : {})
    })
  } catch (error) {
    if (aborted(signal, error)) throw abortWebError(signal, error)
    throw new WebError(
      `Selected model web search request failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      'WEB_PROVIDER_ERROR',
      { cause: error }
    )
  }
  let parsed
  try {
    parsed = await response.json()
  } catch (error) {
    if (aborted(signal, error)) throw abortWebError(signal, error)
    throw new WebError(
      `Selected model returned an unreadable web search response (HTTP ${response.status}).`,
      'WEB_PROVIDER_ERROR',
      { cause: error }
    )
  }
  if (!response.ok) {
    const detail = apiErrorMessage(parsed, response.status)
    const code = unsupportedSearch(response.status, detail)
      ? 'WEB_MODEL_SEARCH_UNSUPPORTED'
      : 'WEB_PROVIDER_ERROR'
    throw new WebError(`Selected model web search failed: ${detail}`, code, {
      status: response.status
    })
  }
  if (!isRecord(parsed) || !usedWebSearch(parsed)) {
    throw new WebError(
      'The selected model API returned no web_search call.',
      'WEB_MODEL_SEARCH_UNSUPPORTED'
    )
  }
  const content = responseText(parsed)
  const sources = responseSources(parsed)
  if (sources.length === 0) {
    throw new WebError(
      'The selected model API returned no citeable web sources.',
      'WEB_MODEL_SEARCH_UNSUPPORTED'
    )
  }
  return {
    ...(content ? { content } : {}),
    sources,
    truncated: false
  }
}

function validateLocalEndpoint(endpoint) {
  const url = nonEmptyString(endpoint?.url)
  const token = nonEmptyString(endpoint?.token)
  if (!url || !token || !URL.canParse(url)) {
    throw new WebError(
      'Sherlock local browser search is unavailable.',
      'WEB_LOCAL_SEARCH_UNAVAILABLE'
    )
  }
  const parsed = new URL(url)
  if (parsed.protocol !== 'http:' || parsed.hostname !== '127.0.0.1') {
    throw new WebError(
      'Sherlock local browser search endpoint is invalid.',
      'WEB_LOCAL_SEARCH_UNAVAILABLE'
    )
  }
  return { url: parsed.origin, token }
}

function localEndpointFromEnvironment() {
  return validateLocalEndpoint({
    url: process.env[LOCAL_SEARCH_URL_ENV],
    token: process.env[LOCAL_SEARCH_TOKEN_ENV]
  })
}

function localSources(body) {
  if (!isRecord(body) || !Array.isArray(body.sources)) return []
  const seen = new Set()
  return body.sources.flatMap((candidate) => {
    if (!isRecord(candidate)) return []
    const url = nonEmptyString(candidate.url)
    if (!url || seen.has(url) || !URL.canParse(url)) return []
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return []
    seen.add(url)
    return [{
      url,
      ...(nonEmptyString(candidate.title) ? { title: candidate.title } : {}),
      ...(nonEmptyString(candidate.snippet) ? { snippet: candidate.snippet } : {})
    }]
  })
}

export async function searchLocalBrowser(
  request,
  signal,
  endpoint = localEndpointFromEnvironment()
) {
  if (signal?.aborted) throw abortWebError(signal)
  const local = validateLocalEndpoint(endpoint)
  let response
  try {
    response = await fetch(`${local.url}/search`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${local.token}`,
        'content-type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify({
        query: request.query,
        maxResults: request.maxResults
      }),
      ...(signal ? { signal } : {})
    })
  } catch (error) {
    if (aborted(signal, error)) throw abortWebError(signal, error)
    throw new WebError(
      'Sherlock local browser search could not be reached.',
      'WEB_LOCAL_SEARCH_UNAVAILABLE',
      { cause: error }
    )
  }
  let parsed
  try {
    parsed = await response.json()
  } catch (error) {
    if (aborted(signal, error)) throw abortWebError(signal, error)
    throw new WebError(
      'Sherlock local browser search returned an unreadable response.',
      'WEB_LOCAL_SEARCH_FAILED',
      { cause: error }
    )
  }
  if (!response.ok) {
    throw new WebError(
      isRecord(parsed) && nonEmptyString(parsed.error)
        ? parsed.error
        : 'Sherlock local browser search failed.',
      'WEB_LOCAL_SEARCH_FAILED',
      { status: response.status }
    )
  }
  const sources = localSources(parsed)
  if (sources.length === 0) {
    throw new WebError(
      'Sherlock local browser search returned no usable sources.',
      'WEB_LOCAL_SEARCH_FAILED'
    )
  }
  return {
    ...(nonEmptyString(parsed.content) ? { content: parsed.content } : {}),
    sources,
    truncated: parsed.truncated === true
  }
}

function boundedResult(result, maxResults) {
  const limit = Number.isInteger(maxResults) && maxResults > 0 ? maxResults : 5
  return {
    ...(nonEmptyString(result.content) ? { content: result.content } : {}),
    sources: result.sources.slice(0, limit),
    truncated: result.truncated === true || result.sources.length > limit
  }
}

export class SessionModelSearchProvider {
  id = SESSION_MODEL_SEARCH_PROVIDER_ID

  constructor(dependencies) {
    this.dependencies =
      typeof dependencies === 'function'
        ? {
            mode: () => 'auto',
            resolveRoute: async () => ({ nativeKind: 'openai-responses' }),
            resolveNativeOptions: dependencies,
            searchLocal: searchLocalBrowser
          }
        : dependencies
  }

  available() {
    return true
  }

  async search(request, signal) {
    const mode = this.dependencies.mode()
    if (mode === 'off') {
      throw new WebError('Web search is disabled in Sherlock settings.', 'WEB_SEARCH_DISABLED')
    }
    if (signal?.aborted) throw abortWebError(signal)

    let route
    let nativeFailure
    try {
      route = await this.dependencies.resolveRoute()
    } catch (error) {
      if (aborted(signal, error)) throw abortWebError(signal, error)
      nativeFailure = error
    }

    if (route?.nativeKind === 'openai-responses') {
      try {
        const options = await this.dependencies.resolveNativeOptions(route)
        const result = await searchResponses(options, request, signal)
        return boundedResult(result, request.maxResults)
      } catch (error) {
        if (aborted(signal, error)) throw abortWebError(signal, error)
        nativeFailure = error
      }
    } else if (!nativeFailure) {
      nativeFailure = new WebError(
        `The selected model provider "${route?.provider ?? 'unknown'}" has no verified native web search adapter.`,
        'WEB_MODEL_SEARCH_UNSUPPORTED'
      )
    }

    if (mode === 'native-only') {
      throw new WebError(
        'The selected model does not provide a usable native web search route.',
        'WEB_NATIVE_SEARCH_REQUIRED',
        { cause: nativeFailure }
      )
    }

    try {
      const result = await this.dependencies.searchLocal(request, signal)
      return boundedResult(result, request.maxResults)
    } catch (error) {
      if (aborted(signal, error)) throw abortWebError(signal, error)
      throw error
    }
  }
}

export function apply(ctx, config = { mode: 'auto' }) {
  const entry = { mode: config.mode ?? 'auto' }
  let current = () => entry
  installSettingsSection(
    ctx,
    SESSION_MODEL_SEARCH_SETTINGS_NAMESPACE,
    Config,
    entry,
    {
      setSource: (source) => {
        current = source
      },
      onChange: () => {}
    }
  )
  ctx.web.registerSearchProvider(
    new SessionModelSearchProvider({
      mode: () => current().mode,
      resolveRoute: () => resolveSessionSearchRoute(ctx),
      resolveNativeOptions: () => resolveSessionSearchOptions(ctx),
      searchLocal: searchLocalBrowser
    })
  )
}
