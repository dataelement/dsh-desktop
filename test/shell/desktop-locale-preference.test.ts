import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { savedDesktopLocalePreference, savedDesktopLocaleValue } from '../../src/main/shell/desktop-locale-preference'
import { DESKTOP_LOCALES, desktopLocale, desktopLanguageState, effectiveNativeLocale, legacyLocale, preferredDesktopLocale } from '../../src/shared/desktop-locale'
import { applicationText, resolveHarnessLocale } from '../../src/main/application-locale'

const patch = (language: string) => `- id: locale\n  config:\n    preference: ${language}\n`

describe('Desktop language boundaries', () => {
  it('recognizes eight languages and regions without requiring recovery translations', () => {
    for (const language of DESKTOP_LOCALES) {
      expect(desktopLocale(`${language}_XX`)).toBe(language)
      expect(resolveHarnessLocale(language, ['zh-CN'])).toBe(language)
      expect(applicationText(language, 'common.restart')).toBe(language === 'zh' ? '重新启动' : 'Restart')
    }
    expect(desktopLocale('ko')).toBeUndefined()
    expect(preferredDesktopLocale(['ko', 'ja-JP'])).toBe('ja')
    expect(legacyLocale('fr')).toBe('en')
  })

  it('keeps unknown active languages rather than retaining a previous display state', () => {
    expect(desktopLanguageState('ja')).toEqual({ active: 'ja', display: 'ja' })
    expect(desktopLanguageState('it')).toEqual({ active: 'it', display: 'en' })
    expect(desktopLanguageState(false)).toBeUndefined()
  })

  it('filters malformed bootstrap values and preserves explicit auto over legacy settings', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-language-validation-'))
    await mkdir(join(home, 'profiles', 'desktop'), { recursive: true })
    for (const invalid of ['123', 'false', '{ nested: value }', '[]']) {
      await writeFile(join(home, 'settings.yaml'), `locale:\n  preference: ${invalid}\n`)
      expect(await savedDesktopLocaleValue(home, 'desktop')).toBeUndefined()
    }
    await writeFile(join(home, 'settings.yaml'), 'locale:\n  preference: ja\n')
    await writeFile(join(home, 'profiles', 'desktop', 'cordis.patch.yml'), patch('auto'))
    expect(await savedDesktopLocaleValue(home, 'desktop')).toBe('auto')
    expect(await savedDesktopLocalePreference(home, 'desktop')).toBeUndefined()
  })

  it('does not read an unusable legacy path when the Profile is authoritative', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-language-legacy-'))
    await mkdir(join(home, 'profiles', 'desktop'), { recursive: true })
    await mkdir(join(home, 'settings.yaml'))
    // With no authoritative Profile the legacy read error is still diagnostic.
    await expect(savedDesktopLocaleValue(home, 'desktop')).rejects.toThrow()
    for (const preference of ['ja', 'auto', 'it']) {
      await writeFile(join(home, 'profiles', 'desktop', 'cordis.patch.yml'), patch(preference))
      expect(await savedDesktopLocaleValue(home, 'desktop')).toBe(preference)
    }
  })

  it('resolves default and auto targets without pretending they were explicitly stored', () => {
    for (const languages of [['ko-KR'], ['ko-KR', 'ja-JP'], ['zh-CN'], []]) {
      for (const preference of [undefined, 'auto', '']) {
        expect(effectiveNativeLocale(preference, languages)).toBe(preferredDesktopLocale(languages))
      }
      for (const preference of DESKTOP_LOCALES) {
        expect(effectiveNativeLocale(preference, languages)).toBe(preference)
      }
      expect(effectiveNativeLocale('it', languages)).toBeUndefined()
    }
  })

  it('previews the web-to-desktop migration without changing files', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-language-migration-'))
    await mkdir(join(home, 'profiles', 'web'), { recursive: true })
    await writeFile(join(home, 'profiles', 'web', 'cordis.patch.yml'), patch('ja'))
    expect(await savedDesktopLocalePreference(home, 'desktop')).toBe('ja')
    await mkdir(join(home, 'profiles', 'desktop'))
    // Existing desktop has authority even when it has no language row.
    expect(await savedDesktopLocalePreference(home, 'desktop')).toBeUndefined()
    await writeFile(join(home, 'profiles', 'desktop', 'cordis.patch.yml'), patch('fr'))
    expect(await savedDesktopLocalePreference(home, 'desktop')).toBe('fr')
    expect(await savedDesktopLocalePreference(home, 'desktop-safe-mode')).toBeUndefined()
    await writeFile(join(home, 'settings.yaml'), 'locale:\n  preference: zh\n')
    await writeFile(join(home, 'profiles', 'desktop', 'cordis.patch.yml'), patch('it'))
    expect(await savedDesktopLocaleValue(home, 'desktop')).toBe('it')
    expect(await savedDesktopLocalePreference(home, 'desktop')).toBeUndefined()
  })
})
