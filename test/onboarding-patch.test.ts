import { readFile } from 'node:fs/promises'
import { getBuiltinModels } from '@earendil-works/pi-ai/providers/all'
import { describe, expect, it } from 'vitest'
import { patchPath } from './patch-path'

const PI_AI_ONBOARDING_PROVIDERS = [
  'openai',
  'anthropic',
  'google',
  'openrouter',
  'xai',
  'moonshotai-cn',
  'minimax-cn',
  'zai-coding-cn',
  'mistral',
  'groq',
  'together'
] as const

describe('desktop provider onboarding patch', () => {
  it.each(PI_AI_ONBOARDING_PROVIDERS)('%s has a bundled model catalog', (provider) => {
    expect(getBuiltinModels(provider).length).toBeGreaterThan(0)
  })

  it('is captured as a reproducible dependency patch', async () => {
    const [patch, installed] = await Promise.all([
      readFile(patchPath('@deepseek-ai/dsh-client-ui-settings-models'), 'utf8'),
      readFile('node_modules/@deepseek-ai/dsh-client-ui-settings-models/lib/client.js', 'utf8')
    ])
    expect(patch).toContain('ONBOARDING_PROVIDERS')
    expect(patch).toContain('openrouter')
    expect(patch).toContain('接入模型提供方')
    expect(installed).toContain('SETTINGS_PROVIDER_RANK.get(left.row.entry.provider)')
    expect(installed).toContain('addCatalog: "第三方模型提供商"')
    expect(installed).toContain('addCustom: "自定义模型 API"')
    expect(installed).toContain('SETTINGS_PROVIDER_PRIORITY')
    expect(installed.indexOf('"deepseek-official"')).toBeLessThan(installed.indexOf('"openai"'))
    expect(installed).toContain('left.row.entry.displayName.localeCompare(right.row.entry.displayName)')
  })
})
