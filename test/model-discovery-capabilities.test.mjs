import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

const adapter = readFileSync('node_modules/@deepseek-ai/dsh-llm-pi-ai/lib/index.js', 'utf8')
const llm = readFileSync('node_modules/@deepseek-ai/dsh-llm/lib/index.js', 'utf8')
const client = readFileSync('node_modules/@deepseek-ai/dsh-client-ui-settings-models/lib/client.js', 'utf8')
const levels = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']
function helper(source, name, indent = '') {
  const start = source.indexOf('function ' + name + '(')
  expect(start).toBeGreaterThanOrEqual(0)
  return source.slice(start, source.indexOf('\n' + indent + '}', start) + indent.length + 2)
}
const parse = new Function('LlmError', helper(adapter, 'capacity') + helper(adapter, 'label') + helper(adapter, 'discoveryObject') + helper(adapter, 'listingCapabilities') + helper(adapter, 'readListing') + ';return readListing')(Error)
const catalog = new Function('THINKING_LEVELS', helper(adapter, 'catalogReasoning') + ';return catalogReasoning')(levels)
const adopt = new Function(helper(client, 'adopt', '\t\t') + ';return adopt')()
const openrouter = (reasoning, input_modalities = ['text', 'image']) => parse({ data: [{ id: 'model', architecture: { input_modalities }, reasoning }] }, 'openai-completions')[0]
const support = supported => ({ supported })
const anthropic = (thinking, effort, image = true) => parse({ data: [{ id: 'claude', capabilities: { image_input: support(image), thinking, effort } }] }, 'anthropic-messages')[0]

it('reads documented OpenRouter shapes with exact none, max and xhigh wire values', () => {
  const candidate = openrouter({ mandatory: false, default_effort: 'none', default_enabled: false, supports_max_tokens: true, supported_efforts: ['max', 'xhigh', 'high', 'low', 'none', null] }, ['text', 'image', 'file', 'audio', 'video'])
  expect(candidate.inputModalities).toEqual(['text', 'image'])
  expect(candidate.reasoningEfforts).toEqual({ max: 'max', xhigh: 'xhigh', high: 'high', low: 'low', off: 'none' })
  expect(adopt(candidate)).toMatchObject({ input: ['text', 'image'], reasoningEfforts: candidate.reasoningEfforts, compat: { thinkingFormat: 'openrouter' } })
  expect(openrouter({ mandatory: true, supported_efforts: ['none', 'high'] }).reasoningEfforts).toEqual({ high: 'high' })
})

it('distinguishes null allowlists from missing, empty and malformed metadata without guessing', () => {
  expect(Object.keys(openrouter({ mandatory: false, supported_efforts: null }).reasoningEfforts).sort()).toEqual([...levels].sort())
  for (const reasoning of [undefined, true, {}, { mandatory: false }, { mandatory: false, supported_efforts: [] }, { mandatory: false, supported_efforts: ['none'] }, { mandatory: 'false', supported_efforts: ['high'] }, { mandatory: false, supported_efforts: ['high', 'future'] }, { mandatory: false, supported_efforts: 'high' }, { mandatory: false, supported_efforts: ['high'], default_enabled: 'yes' }]) {
    expect(openrouter(reasoning)).not.toHaveProperty('reasoningEfforts')
  }
  for (const modalities of [null, 'image', [], ['text', 7], ['text', 'future'], ['audio']]) expect(openrouter(undefined, modalities)).not.toHaveProperty('inputModalities')
  expect(parse({ data: [null, 1, [], { id: 'plain', supported_parameters: ['reasoning'] }] }, 'openai-completions')).toEqual([{ id: 'plain', name: 'plain' }])
})

it('adopts Anthropic adaptive capabilities only when effort dispatch is representable', () => {
  const thinking = { supported: true, types: { adaptive: support(true), enabled: support(true), disabled: support(true), between_tools: support(true) } }
  const effort = { supported: true, low: support(true), medium: support(false), high: support(true), xhigh: support(true), max: support(true) }
  expect(adopt(anthropic(thinking, effort))).toMatchObject({ input: ['text', 'image'], reasoningEfforts: { low: 'low', high: 'high', xhigh: 'xhigh', max: 'max', off: null }, compat: { forceAdaptiveThinking: true } })
  expect(anthropic({ ...thinking, types: { adaptive: support(true), between_tools: support(true) } }, effort).reasoningEfforts).not.toHaveProperty('off')
  expect(anthropic({ supported: false }, effort, false)).toMatchObject({ inputModalities: ['text'], reasoningEfforts: false })
  for (const t of [undefined, { supported: 'true' }, { supported: true }, { supported: true, types: { enabled: support(true), adaptive: support(false) } }]) expect(anthropic(t, effort)).not.toHaveProperty('reasoningEfforts')
  expect(anthropic(thinking, { supported: true, high: support('true') })).not.toHaveProperty('reasoningEfforts')
})

it('preserves catalog support and explicit wire maps without inventing max/xhigh', () => {
  expect(catalog({ reasoning: false })).toBe(false)
  expect(catalog({ reasoning: true, api: 'openai-completions', thinkingLevelMap: { off: 'none', minimal: null, high: 'custom', xhigh: 'xhigh', max: 'max' } })).toEqual({ off: 'none', low: 'low', medium: 'medium', high: 'custom', xhigh: 'xhigh', max: 'max' })
  expect(catalog({ reasoning: true, api: 'openai-completions' })).not.toHaveProperty('max')
})

it('passes detached metadata through the real discovery service method', async () => {
  const start = llm.indexOf('async discoverModels(settingsNs, request, signal) {')
  const method = llm.slice(start, llm.indexOf('\n\t\t}', start) + 4)
  const service = new Function('LlmError', 'return ({' + method + '})')(Error)
  const candidate = openrouter({ mandatory: false, supported_efforts: ['high', 'none'] })
  service.discoveries = new Map([['pi', async () => [candidate]]])
  const result = await service.discoverModels('pi', { baseURL: 'https://models.example' })
  expect(result).toEqual([candidate])
  result[0].reasoningEfforts.high = 'changed'
  result[0].reasoningCompat.thinkingFormat = 'changed'
  result[0].inputModalities.push('changed')
  expect(candidate.reasoningEfforts.high).toBe('high')
  expect(candidate.reasoningCompat.thinkingFormat).toBe('openrouter')
  expect(candidate.inputModalities).toEqual(['text', 'image'])
})

it('sends exact provider payloads for off, max and xhigh through installed pi-ai', async () => {
  const { streamSimple: anthropicStream } = await import('@earendil-works/pi-ai/api/anthropic-messages')
  const { streamSimple: openaiStream } = await import('@earendil-works/pi-ai/api/openai-completions')
  const resolve = new Function('THINKING_LEVELS', helper(adapter, 'resolveModelReasoning') + ';return resolveModelReasoning')(levels)
  const profileOptions = new Function(helper(adapter, 'profileOptions') + ';return profileOptions')()
  const thinking = { supported: true, types: { adaptive: support(true), disabled: support(true) } }
  const effort = { supported: true, max: support(true), xhigh: support(true) }
  for (const [candidate, api, stream] of [[anthropic(thinking, effort), 'anthropic-messages', anthropicStream], [openrouter({ mandatory: false, supported_efforts: ['none', 'max', 'xhigh'] }), 'openai-completions', openaiStream]]) {
    const row = adopt(candidate)
    const model = { id: row.id, name: row.id, provider: 'test', api, baseUrl: 'https://models.example', input: row.input, maxTokens: 4096, contextWindow: 16384, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, ...resolve('test', row, undefined), compat: row.compat }
    for (const level of ['off', 'max', 'xhigh']) {
      let payload
      const events = stream(model, { messages: [{ role: 'user', content: 'Hi', timestamp: 1 }] }, { ...profileOptions({}, level, 'fixture-key'), onPayload(value) { payload = value; throw new Error('stop before network') } })
      await events.result()
      expect(payload).toBeDefined()
      if (api === 'anthropic-messages') {
        expect(payload.thinking.type).toBe(level === 'off' ? 'disabled' : 'adaptive')
        expect(payload.output_config?.effort).toBe(level === 'off' ? undefined : level)
      } else expect(payload.reasoning.effort).toBe(level === 'off' ? 'none' : level)
    }
  }
})

it('executes the picker adoption action without overwriting existing user configuration', () => {
  const start = client.indexOf('const configuredIds = new Set(')
  const end = client.indexOf('\n\t\t\tconst toggle = (id) => {', start)
  const action = `${client.slice(start, end)}\nreturn adoptPicked`
  const existing = { id: 'model', input: ['text'], reasoningEfforts: false, compat: { thinkingFormat: 'manual' } }
  const candidate = openrouter({ mandatory: false, supported_efforts: ['high'] })
  let result
  new Function('models', 'candidates', 'flipped', 'rowState', 'textOf', 'adopt', 'onChange', 'closePicker', action)([existing], [candidate, { ...candidate, id: 'new' }], new Set(['new']), { forget() {} }, (m, k) => m[k], adopt, next => { result = next }, () => {})()
  expect(result[0]).toBe(existing)
  expect(result[1]).toMatchObject({ id: 'new', input: ['text', 'image'], reasoningEfforts: { high: 'high' } })
})
