import { expect, it } from 'vitest'
import z from '@deepseek-ai/schemastery'
import { SettingsForms } from '@deepseek-ai/dsh-settings'

function settings(namespace, name) {
  const schema = namespace === 'llm-deepseek' || name === '@deepseek-ai/dsh-llm-deepseek-api-key'
    ? z.object({ baseURL: z.string().volatile(), maxTokens: z.number().volatile() })
    : z.object({ providers: z.dict(z.object({ baseURL: z.string(), displayName: z.string() })).volatile() })
  const entry = { options: { id: namespace, name }, fiber: { runtime: { Config: schema } } }
  let stored = {}
  const forms = Object.create(SettingsForms.prototype)
  forms.ownerContext = { configEditor: {
    entries: () => [entry],
    edit: async (_entry, change) => { stored = change(stored, {}) }
  } }
  forms.describe = () => [{ ns: namespace, revision: 1 }]
  return { forms, stored: () => stored }
}

it.each(['example.test', '', ' https://example.test', 'file:///tmp/config', 'https://user:pass@example.test', 'https://example.test?q=1'])('rejects invalid DeepSeek URL before persisting: %s', async baseURL => {
  const { forms, stored } = settings('llm-deepseek')
  await expect(forms.update('llm-deepseek', { baseURL })).rejects.toThrow('Model baseURL must')
  expect(stored()).toEqual({})
})

it('writes valid endpoints and retains unrelated settings', async () => {
  const { forms, stored } = settings('llm-deepseek')
  await forms.update('llm-deepseek', { maxTokens: 12345, baseURL: 'https://example.test/v1' })
  expect(stored()).toEqual({ maxTokens: 12345, baseURL: 'https://example.test/v1' })
})

it.each(['@deepseek-ai/dsh-llm-deepseek-api-key', '@deepseek-ai/dsh-llm-pi-ai'])('validates model entries with a custom id: %s', async name => {
  const { forms, stored } = settings('custom-entry', name)
  await expect(forms.update('custom-entry', name.endsWith('api-key') ? { baseURL: 'invalid' }
    : { providers: { custom: { baseURL: 'invalid' } } })).rejects.toThrow('Model baseURL must')
  expect(stored()).toEqual({})
})

it('validates custom provider writes at the same persistence boundary', async () => {
  const { forms, stored } = settings('llm-pi-ai')
  await expect(forms.mutate('llm-pi-ai', [{ op: 'set', path: ['providers', 'custom'], value: { baseURL: 'invalid' } }])).rejects.toThrow('Model baseURL must')
  expect(stored()).toEqual({})
  await forms.update('llm-pi-ai', { providers: { custom: { baseURL: 'http://localhost:8080/v1', displayName: 'Local' } } })
  expect(stored().providers.custom.displayName).toBe('Local')
})
