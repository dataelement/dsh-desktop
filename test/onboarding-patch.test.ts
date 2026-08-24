import { readFile } from 'node:fs/promises'
import { getBuiltinModels } from '@earendil-works/pi-ai/providers/all'
import { describe, expect, it } from 'vitest'

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
      readFile('patches/@deepseek-ai+dsh-client-ui-settings-models+0.1.0-rc.7.patch', 'utf8'),
      readFile('node_modules/@deepseek-ai/dsh-client-ui-settings-models/lib/client.js', 'utf8')
    ])
    expect(patch).toContain('ONBOARDING_PROVIDERS')
    expect(patch).toContain('openrouter')
    expect(patch).toContain('接入模型提供方')
    expect(patch).toContain('dshProviderGrid')
    expect(patch).toContain('aria-pressed')
    expect(installed).toContain('className: "dshProviderCard"')
    expect(installed).toContain('providerPickerOpen')
    expect(installed).toContain('providerSearch: "搜索提供方"')
    expect(installed).toContain('.dshProviderCard[aria-pressed=true]{border-color:var(--dsw-alias-border-l1)')
    expect(installed).toContain('SETTINGS_PROVIDER_PRIORITY')
    expect(installed).not.toContain('displayName: "DeepSeek"')
    expect(installed).toContain('(0, react.useState)("openai")')
    expect(installed).toContain('Sherlock will enable that provider')
    expect(installed).toContain('left.entry.displayName.localeCompare(right.entry.displayName)')
  })
})
