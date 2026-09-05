import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { projectRoot } from './patch-path'

const piAiIndex = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-llm-pi-ai',
  'lib',
  'index.js'
)

interface CatalogModel {
  id: string
  name: string
  api: string
  baseUrl: string
  contextWindow: number
  maxTokens: number
  input: string[]
}

interface DiscoveredModel {
  id: string
  name?: string
  contextWindow?: number
  maxTokens?: number
}

interface ResolvedModel {
  id: string
  api: string
  baseUrl: string
  contextWindow: number
  maxTokens: number
}

/**
 * Lift one whole function out of the bundled adapter. These are module-private
 * and the bundle is generated, so a brace scan is the only stable way to take a
 * complete body: line offsets move with every upstream release.
 */
function extractFunction(source: string, signature: string): string {
  let start = source.indexOf(`function ${signature}`)
  expect(start, `missing function ${signature}`).toBeGreaterThanOrEqual(0)
  if (source.slice(start - 6, start) === 'async ') start -= 6

  let depth = 0
  let entered = false
  for (let index = source.indexOf('{', start); index < source.length; index++) {
    if (source[index] === '{') {
      depth++
      entered = true
      continue
    }
    if (source[index] === '}') {
      depth--
      if (entered && depth === 0) return source.slice(start, index + 1)
    }
  }
  throw new Error(`unbalanced function ${signature}`)
}

class StubLlmError extends Error {
  readonly code: string
  constructor(message: string, code: string, options?: ErrorOptions) {
    super(message, options)
    this.code = code
  }
}

/** The real opencode-go snapshot shape: three protocols, two base URLs. */
const ZEN_V1 = 'https://opencode.ai/zen/go/v1'
const ZEN_ROOT = 'https://opencode.ai/zen/go'

function snapshot(): Map<string, CatalogModel> {
  const models = new Map<string, CatalogModel>()
  const add = (model: CatalogModel): void => void models.set(model.id, model)
  add({
    id: 'minimax-m3',
    name: 'MiniMax M3',
    api: 'anthropic-messages',
    baseUrl: ZEN_ROOT,
    contextWindow: 200000,
    maxTokens: 8192,
    input: ['text']
  })
  for (const id of ['deepseek-v4-pro', 'glm-5.3', 'kimi-k3']) {
    add({
      id,
      name: `${id} (catalog)`,
      api: 'openai-completions',
      baseUrl: ZEN_V1,
      contextWindow: 1000000,
      maxTokens: 384000,
      input: ['text']
    })
  }
  add({
    id: 'gpt-5.6-luna',
    name: 'GPT 5.6 Luna',
    api: 'openai-responses',
    baseUrl: ZEN_V1,
    contextWindow: 272000,
    maxTokens: 128000,
    input: ['text']
  })
  return models
}

/** What the gateway advertises: the shipped ids plus ones newer than the snapshot. */
const LIVE_IDS = [
  ...snapshot().keys(),
  'omen-alpha',
  'qwen3.8-flash',
  'grok-4.6'
]

function listingReply(ids: readonly string[]): unknown {
  const body = JSON.stringify({
    object: 'list',
    data: ids.map((id) => ({ id, object: 'model' }))
  })
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-length': String(body.length) }),
    body: new Blob([body]).stream()
  }
}

type Discover = (request: { provider?: string }) => Promise<DiscoveredModel[]>

/** Build the discovery half of the adapter over a stubbed catalog and endpoint. */
async function loadDiscovery(
  reply: () => Promise<unknown>
): Promise<Discover> {
  const source = await readFile(piAiIndex, 'utf8')
  const factory = new Function(
    'LlmError',
    'catalogModels',
    'fetch',
    'attributionHeaders',
    'normalizeApiKey',
    'MAX_RESPONSE_BYTES',
    `
      const LISTABLE_PROTOCOLS = new Set(["openai-completions", "openai-responses"]);
      function usableProbeKey(raw) { return raw.trim() }
      ${extractFunction(source, 'capacity(...candidates)')}
      ${extractFunction(source, 'label(...candidates)')}
      ${extractFunction(source, 'listingUrl(baseURL)')}
      ${extractFunction(source, 'readBounded(response, url)')}
      ${extractFunction(source, 'readListing(body)')}
      ${extractFunction(source, 'catalogEndpoint(defaults, listable)')}
      ${extractFunction(source, 'discoverModels(request, storedProfile)')}
      ${extractFunction(
        source,
        'listEndpointModels(request, storedProfile, baseURL, api$1)'
      )}
      return discoverModels
    `
  ) as (
    error: typeof StubLlmError,
    catalogModels: (provider: string) => Map<string, CatalogModel>,
    fetchImpl: () => Promise<unknown>,
    attributionHeaders: () => Record<string, string>,
    normalizeApiKey: (value: string) => { ok: true; value: string },
    maxBytes: number
  ) => Discover

  return factory(
    StubLlmError,
    (provider) => (provider === 'opencode-go' ? snapshot() : new Map()),
    reply,
    () => ({}),
    (value: string) => ({ ok: true as const, value }),
    4 * 1024 * 1024
  )
}

/** Build the catalog-resolution half of the adapter over a stubbed catalog. */
async function loadResolution(): Promise<
  (request: Record<string, unknown>) => { models: ResolvedModel[] }
> {
  const source = await readFile(piAiIndex, 'utf8')
  const factory = new Function(
    'catalogModels',
    'catalogProvider',
    `
      const NO_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
      function invalid(provider, detail) {
        throw new Error('llm-pi-ai: provider "' + provider + '" ' + detail)
      }
      function assertOfferedCompatFields() {}
      function configuredCompatEntries() { return [] }
      function compatProtocols() { return [] }
      function declaredInput(value) {
        return value === undefined || value.length === 0 ? undefined : value
      }
      function resolveModelReasoning() { return {} }
      function resolveModelCompat() { return {} }
      ${extractFunction(source, 'catalogEndpoint(defaults, listable)')}
      ${extractFunction(source, 'resolveRouteModels(request)')}
      return resolveRouteModels
    `
  ) as (
    catalogModels: () => Map<string, CatalogModel>,
    // The real opencode-go provider ships no provider-level baseUrl, so a model
    // outside the snapshot has nothing to inherit but the catalog's entries.
    catalogProvider: () => { id: string }
  ) => (request: Record<string, unknown>) => { models: ResolvedModel[] }

  return factory(snapshot, () => ({ id: 'opencode-go' }))
}

const ROUTE_DEFAULTS = {
  provider: 'opencode-go',
  defaultContextWindow: 262144,
  defaultMaxTokens: 32768,
  defaultInput: ['text']
}

describe('catalog-route model discovery', () => {
  it('reports gateway models the installed catalog has not caught up with', async () => {
    const discoverModels = await loadDiscovery(async () =>
      listingReply(LIVE_IDS)
    )

    const found = await discoverModels({ provider: 'opencode-go' })
    const ids = found.map((model) => model.id)

    // The catalog is a build-time snapshot; answering from it alone made this
    // action unable to ever report a model newer than the installed pi-ai.
    expect(ids).toContain('omen-alpha')
    expect(ids).toContain('qwen3.8-flash')
    expect(ids).toContain('grok-4.6')
    for (const shipped of snapshot().keys()) expect(ids).toContain(shipped)
    // The catalog carries capacities a listing does not disclose, so it wins.
    expect(found.find((model) => model.id === 'deepseek-v4-pro')).toMatchObject({
      name: 'deepseek-v4-pro (catalog)',
      contextWindow: 1000000,
      maxTokens: 384000
    })
  })

  it('answers from the shipped catalog when the endpoint cannot be read', async () => {
    const discoverModels = await loadDiscovery(async () => {
      throw new TypeError('network down')
    })

    // Answering a catalog route offline has always been possible; an
    // unreachable endpoint must not turn into an error or an empty list.
    await expect(
      discoverModels({ provider: 'opencode-go' })
    ).resolves.toHaveLength(snapshot().size)
  })
})

describe('catalog-route model resolution', () => {
  it('serves a model the installed catalog does not describe', async () => {
    const resolveRouteModels = await loadResolution()

    const { models } = resolveRouteModels({
      ...ROUTE_DEFAULTS,
      models: [{ id: 'deepseek-v4-pro' }, { id: 'omen-alpha' }]
    })

    // Without inherited endpoint facts this route refused to resolve at all
    // ("needs an api"), so a model adopted from the gateway was unusable.
    expect(models.find((model) => model.id === 'omen-alpha')).toMatchObject({
      api: 'openai-completions',
      baseUrl: ZEN_V1,
      contextWindow: 262144,
      maxTokens: 32768
    })
  })

  it('does not drag a sibling onto the dominant protocol', async () => {
    const resolveRouteModels = await loadResolution()

    const { models } = resolveRouteModels({
      ...ROUTE_DEFAULTS,
      models: [
        { id: 'minimax-m3' },
        { id: 'gpt-5.6-luna' },
        { id: 'omen-alpha' }
      ]
    })

    // The endpoint is inferred by plurality, so the guard that matters is that
    // a minority-protocol sibling keeps its own api and baseUrl.
    expect(models.find((model) => model.id === 'minimax-m3')).toMatchObject({
      api: 'anthropic-messages',
      baseUrl: ZEN_ROOT
    })
    expect(models.find((model) => model.id === 'gpt-5.6-luna')).toMatchObject({
      api: 'openai-responses',
      baseUrl: ZEN_V1
    })
  })
})
