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
    // The settings add-provider surface keeps its real provider grid …
    expect(patch).toContain('dshProviderGrid')
    expect(patch).toContain('aria-pressed')
    expect(installed).toContain('className: "dshProviderCard"')
    expect(installed).toContain('providerPickerOpen')
    expect(installed).toContain('providerSearch: "搜索提供方"')
    expect(installed).toContain('.dshProviderCard[aria-pressed=true]{border-color:var(--dsw-alias-border-l1)')
    expect(installed).toContain('SETTINGS_PROVIDER_PRIORITY')
    expect(installed.indexOf('"deepseek-official"')).toBeLessThan(installed.indexOf('"openai"'))
    expect(installed).toContain('left.entry.displayName.localeCompare(right.entry.displayName)')
    // … but the first-run dialog no longer advertises a provider chooser it
    // cannot render: the ONBOARDING_PROVIDERS list and the multi-provider
    // copy were dead code (setSelectedProvider had no call sites). The dialog
    // is back to configuring the default DeepSeek provider it actually shows.
    expect(patch).not.toContain('ONBOARDING_PROVIDERS')
    expect(patch).not.toContain('Connect a model provider')
    expect(patch).not.toContain('接入模型提供方')
    expect(installed).not.toContain('Mainstream catalog routes exposed during first-run setup')
    expect(installed).toContain('onboardingDescription: "配置 DeepSeek 官方模型，即可开始使用。"')
    expect(installed).toContain('onboardingSave: "保存并继续"')
  })
})
