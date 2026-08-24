import { composeEntries, loadOverlayPatches } from '@deepseek-ai/dsh-app-boot'
import { describe, expect, it } from 'vitest'

describe('desktop model provider policy', () => {
  it('disables the bundled DeepSeek model adapter in the effective desktop profile', () => {
    const base = loadOverlayPatches(
      'dsh-desktop-test',
      'node_modules/@deepseek-ai/dsh-base/cordis.patch.yml'
    )
    const desktop = loadOverlayPatches('dsh-desktop-test', 'build/dsh-desktop.patch.yml')
    const effective = composeEntries([base, desktop])

    expect(effective.find((entry) => entry.id === 'llm-deepseek')).toMatchObject({
      id: 'llm-deepseek',
      disabled: true
    })
  })

  it('routes web search through the current session model instead of DeepSeek', () => {
    const base = loadOverlayPatches(
      'dsh-desktop-test',
      'node_modules/@deepseek-ai/dsh-base/cordis.patch.yml'
    )
    const desktop = loadOverlayPatches('dsh-desktop-test', 'build/dsh-desktop.patch.yml')
    const effective = composeEntries([base, desktop])

    expect(effective.find((entry) => entry.id === 'web')).toMatchObject({
      id: 'web',
      config: { searchProvider: 'sherlock-session-model' }
    })
    expect(effective.find((entry) => entry.id === 'web-search-deepseek')).toMatchObject({
      id: 'web-search-deepseek',
      disabled: true
    })
    expect(effective.find((entry) => entry.id === 'web-search-session-model')).toMatchObject({
      id: 'web-search-session-model',
      name: 'dsh-web-search-session-model'
    })
  })
})
