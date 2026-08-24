import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { WebError } from '@deepseek-ai/dsh-web'

export const name = 'web-search-session-model'
export const inject = ['agents', 'credentials', 'settings', 'web']
export const SESSION_MODEL_SEARCH_PROVIDER_ID = 'sherlock-session-model'

const LLM_PI_AI_SETTINGS_NAMESPACE = settingsNamespace('llm-pi-ai')
const DEFAULT_MAX_OUTPUT_TOKENS = 4096
const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1'

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
  const providers = isRecord(settings) && isRecord(settings.providers) ? settings.providers : undefined
  const profile = providers && isRecord(providers[provider]) ? providers[provider] : undefined
  if (!profile) {
    throw new WebError(
      `The selected model provider "${provider}" has no user-configured API route for web search.`,
      'WEB_MODEL_ROUTE_UNAVAILABLE'
    )
  }
  return profile
}

function responsesBaseURL(provider, profile) {
  const protocol = nonEmptyString(profile.api)
  if (protocol === 'anthropic-messages') {
    throw new WebError(
      `The selected model provider "${provider}" does not expose the OpenAI Responses web_search API.`,
      'WEB_MODEL_SEARCH_UNSUPPORTED'
    )
  }
  const baseURL =
    nonEmptyString(profile.baseURL) ??
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
  const configuredRef = nonEmptyString(profile.apiKeyEnv)
  const fallbackRef = provider === 'openai' ? 'OPENAI_API_KEY' : undefined
  const ref = credentialRef(configuredRef ?? fallbackRef ?? `${provider.toUpperCase()}_API_KEY`)
  const credentials = ctx.get('credentials')
  const hit = credentials ? await credentials.resolve(ref) : launchEnvironmentOf(ctx).get(ref)
  const value = nonEmptyString(hit?.value)
  if (!value) {
    throw new WebError(
      `The selected model provider "${provider}" has no API key for "${ref}".`,
      'WEB_PROVIDER_CREDENTIAL_MISSING'
    )
  }
  return { apiKey: value, apiKeyRef: ref }
}

/** Resolve the endpoint, model, and credential from the exact Agent driving this tool call. */
export async function resolveSessionSearchOptions(ctx) {
  const { provider, model } = selectedModel(ctx)
  const profile = providerProfile(ctx, provider)
  const { apiKey, apiKeyRef } = await resolveApiKey(ctx, provider, profile)
  const headers = isRecord(profile.headers)
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
    headers
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
      ...(nonEmptyString(candidate.title) ? { title: candidate.title } : {})
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
    (error instanceof DOMException && error.name === 'AbortError')
  )
}

export class SessionModelSearchProvider {
  id = SESSION_MODEL_SEARCH_PROVIDER_ID

  constructor(resolveOptions) {
    this.resolveOptions = resolveOptions
  }

  available() {
    return true
  }

  async search(request, signal) {
    const options = await this.resolveOptions()
    if (signal?.aborted) {
      throw new WebError('Selected-model web search was aborted.', 'WEB_ABORTED', {
        cause: signal.reason
      })
    }
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
          'user-agent': 'sherlock/0.1.1'
        },
        body: JSON.stringify(body),
        ...(signal ? { signal } : {})
      })
    } catch (error) {
      if (aborted(signal, error)) {
        throw new WebError('Selected-model web search was aborted.', 'WEB_ABORTED', {
          cause: error
        })
      }
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
    return {
      ...(content ? { content } : {}),
      sources: responseSources(parsed),
      truncated: false
    }
  }
}

export function apply(ctx) {
  ctx.web.registerSearchProvider(
    new SessionModelSearchProvider(() => resolveSessionSearchOptions(ctx))
  )
}
