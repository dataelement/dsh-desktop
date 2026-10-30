import { describe, expect, it } from 'vitest'
import {
  applicationText,
  localePreferenceFromProfilePatch,
  resolveHarnessLocale,
  selectHarnessLocale
} from '../src/main/application-locale'

const englishChoice = `
- id: locale
  name: "@deepseek-ai/dsh-client-locale"
  config:
    preference: en
`

const chineseTagChoice = `
- name: "@deepseek-ai/dsh-client-locale"
  config:
    preference: zh-CN
`

describe('application locale', () => {
  it('uses the selected application language for native copy rather than the system language', () => {
    expect(applicationText(resolveHarnessLocale('en', ['zh-CN']), 'common.restart')).toBe('Restart')
    expect(applicationText(resolveHarnessLocale('zh', ['en-US']), 'common.restart')).toBe('重新启动')
    expect(applicationText(resolveHarnessLocale(undefined, ['zh-TW']), 'windowRecovery.heading')).toBe('窗口暂时无法显示')
  })

  it('uses the saved DSH preference when one exists', () => {
    expect(resolveHarnessLocale('en', ['zh-Hans-CN'])).toBe('en')
    expect(resolveHarnessLocale('zh', ['en-US'])).toBe('zh')
  })

  it('defaults the first launch from the preferred system language', () => {
    expect(resolveHarnessLocale(undefined, ['zh-Hans-CN', 'en-US'])).toBe('zh')
    expect(resolveHarnessLocale(undefined, ['zh-Hant-TW', 'en-US'])).toBe('zh')
    expect(resolveHarnessLocale(undefined, ['en-US', 'zh-Hans-CN'])).toBe('en')
    expect(resolveHarnessLocale(undefined, [])).toBe('en')
  })

  it('falls back to the system language when the saved preference is invalid', () => {
    expect(resolveHarnessLocale('auto', ['zh-CN'])).toBe('zh')
    expect(resolveHarnessLocale({ value: 'zh' }, ['en-US'])).toBe('en')
  })

  it('reads the language chosen in Desktop from the profile patch', () => {
    expect(localePreferenceFromProfilePatch(englishChoice)).toBe('en')
    expect(localePreferenceFromProfilePatch(chineseTagChoice)).toBe('zh-CN')
    expect(resolveHarnessLocale('zh-CN', ['en-US'])).toBe('zh')
    expect(resolveHarnessLocale('en-GB', ['zh-CN'])).toBe('en')
  })

  it('ignores a missing or damaged profile patch', () => {
    expect(localePreferenceFromProfilePatch('[')).toBeUndefined()
    expect(localePreferenceFromProfilePatch('preference: zh')).toBeUndefined()
    expect(localePreferenceFromProfilePatch('- id: other\n  config:\n    preference: zh\n')).toBeUndefined()
  })

  it('prefers the Desktop choice over the machine language', () => {
    expect(selectHarnessLocale({
      reported: 'en',
      profilePreference: 'zh',
      settingsPreference: 'zh',
      preferredSystemLanguages: ['zh-CN']
    })).toBe('en')
    expect(selectHarnessLocale({
      profilePreference: localePreferenceFromProfilePatch(englishChoice),
      settingsPreference: 'zh',
      preferredSystemLanguages: ['zh-CN']
    })).toBe('en')
    expect(selectHarnessLocale({
      profilePreference: 'ja',
      settingsPreference: 'en',
      preferredSystemLanguages: ['zh-CN']
    })).toBe('en')
    expect(selectHarnessLocale({
      profilePreference: localePreferenceFromProfilePatch(chineseTagChoice),
      preferredSystemLanguages: ['en-US']
    })).toBe('zh')
    expect(selectHarnessLocale({
      preferredSystemLanguages: ['zh-CN']
    })).toBe('zh')
  })
})
