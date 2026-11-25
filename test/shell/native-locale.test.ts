import { describe, expect, it, vi } from 'vitest'
import { clearNativeLocaleAttempt, confirmNativeLocaleRestart, NativeDirectoryPicker, nativeLocaleArgument, nativeLocaleRelaunchArguments, shouldCalibrateNativeLocale } from '../../src/main/shell/native-locale'
import { DESKTOP_LOCALES, effectiveNativeLocale, nativeLanguage } from '../../src/shared/desktop-locale'
import { nativeLocaleMessages } from '../../src/main/shell/native-locale-messages'

describe('native language lifecycle', () => {
  it('preserves safe mode and replaces stale arguments for every supported language', () => {
    for (const locale of DESKTOP_LOCALES) {
      const args = nativeLocaleRelaunchArguments(['app', '-AppleLanguages', '(fr)', '--safe-mode', '--inspect=9229'], locale)
      expect(args).toEqual(['--safe-mode', '--inspect=9229', '-AppleLanguages', `(${nativeLanguage(locale)})`, `--dsh-native-language-attempt=${locale}`])
      expect(nativeLocaleArgument(['app', ...args])).toBe(locale)
      expect(nativeLocaleRelaunchArguments(['app', ...args], locale)).toEqual(args)
      expect(Object.values(nativeLocaleMessages[locale]).every(value => value.length > 0)).toBe(true)
    }
    expect(nativeLocaleRelaunchArguments(['app', '-AppleLanguages', '--safe-mode'], 'zh')).toContain('--safe-mode')
  })

  it('does not restart a matching native language or force unknown preferences', () => {
    for (const locale of DESKTOP_LOCALES) {
      expect(shouldCalibrateNativeLocale({ platform: 'darwin', preference: locale, actual: nativeLanguage(locale), argv: ['app'] })).toBe(false)
    }
    for (const preference of [undefined, 'auto', 'ko']) {
      expect(shouldCalibrateNativeLocale({ platform: 'darwin', preference, actual: 'en', argv: ['app'] })).toBe(false)
    }
    expect(shouldCalibrateNativeLocale({ platform: 'win32', preference: 'ja', actual: 'en', argv: ['app'] })).toBe(false)
  })

  it('bounds calibration to one attempt even if Cocoa ignores the override', () => {
    expect(shouldCalibrateNativeLocale({ platform: 'darwin', preference: 'ja', actual: 'en', argv: ['app'] })).toBe(true)
    expect(shouldCalibrateNativeLocale({ platform: 'darwin', preference: 'ja', actual: 'en', argv: ['app', '--dsh-native-language-attempt=ja'] })).toBe(false)
  })

  it('calibrates an unknown actual language instead of treating it as English', () => {
    expect(shouldCalibrateNativeLocale({ platform: 'darwin', preference: 'en', actual: 'ko', argv: ['app'] })).toBe(true)
  })

  it('does not let a previous target or user restart suppress calibration forever', () => {
    const argv = ['app', '--safe-mode', '-AppleLanguages', '(ja)', '--dsh-native-language-attempt=ja']
    expect(shouldCalibrateNativeLocale({ platform: 'darwin', preference: 'fr', actual: 'ja', argv })).toBe(true)
    const clean = clearNativeLocaleAttempt(argv)
    expect(clean).toContain('--safe-mode')
    expect(clean).not.toContain('(ja)')
    expect(clean).not.toContain('-AppleLanguages')
    expect(clearNativeLocaleAttempt(['app', '-AppleLanguages', '(fr)', '--safe-mode'])).toEqual(['app', '-AppleLanguages', '(fr)', '--safe-mode'])
    expect(shouldCalibrateNativeLocale({ platform: 'darwin', preference: 'ja', actual: 'en', argv: clean })).toBe(true)
  })

  it('does not restart into an English fallback for an unsupported plugin language', async () => {
    const confirmRestart = vi.fn(async () => 'deferred' as const)
    const open = vi.fn(async () => '/workspace')
    await new NativeDirectoryPicker().pick({ locale: 'en', target: 'it', nativeLocale: 'ja', native: true, confirmRestart, open })
    expect(confirmRestart).not.toHaveBeenCalled()
    expect(open).toHaveBeenCalledWith('ja')
  })

  it('uses system text when deferring with an unknown actual native language', async () => {
    const open = vi.fn(async () => '/workspace')
    await new NativeDirectoryPicker().pick({ locale: 'en', nativeLocale: undefined, native: true, confirmRestart: async () => 'deferred', open })
    expect(open).toHaveBeenCalledWith(undefined)
  })

  it('restarts only after consent and matching persisted settings', async () => {
    for (const confirmed of [false, true]) {
      for (const saved of ['en', 'ja'] as const) {
        const restart = vi.fn()
        const notSaved = vi.fn(async () => {})
        const savedLocale = vi.fn(async () => saved)
        const outcome = await confirmNativeLocaleRestart({ locale: 'ja', confirm: async () => confirmed, savedLocale, notSaved, restart })
        expect(outcome).toBe(!confirmed ? 'deferred' : saved === 'ja' ? 'restarting' : 'not-saved')
        expect(restart).toHaveBeenCalledTimes(confirmed && saved === 'ja' ? 1 : 0)
        expect(notSaved).toHaveBeenCalledTimes(confirmed && saved !== 'ja' ? 1 : 0)
      }
    }
  })

  it('allows a confirmed default/auto target and blocks a changed preference', async () => {
    for (const preference of [undefined, 'auto']) {
      for (const languages of [['ko'], ['ko', 'ja']]) {
        const locale = effectiveNativeLocale(preference, languages)
        if (locale === undefined) throw new Error('Expected a system fallback')
        const restart = vi.fn()
        const notSaved = vi.fn(async () => {})
        expect(await confirmNativeLocaleRestart({
          locale, confirm: async () => true,
          savedLocale: async () => effectiveNativeLocale(preference, languages), notSaved, restart
        })).toBe('restarting')
        expect(restart).toHaveBeenCalledOnce()
        expect(notSaved).not.toHaveBeenCalled()
        expect(await confirmNativeLocaleRestart({
          locale, confirm: async () => true,
          savedLocale: async () => effectiveNativeLocale('fr', languages), notSaved, restart
        })).toBe('not-saved')
      }
    }
  })

  it('does not restart when reading the effective saved target fails', async () => {
    const restart = vi.fn()
    await expect(confirmNativeLocaleRestart({
      locale: 'ja', confirm: async () => true,
      savedLocale: async () => { throw new Error('read failed') },
      notSaved: async () => {}, restart
    })).rejects.toThrow('read failed')
    expect(restart).not.toHaveBeenCalled()
  })

  it('continues opening in the native language after deferring and prompts once per target', async () => {
    const picker = new NativeDirectoryPicker()
    const confirmRestart = vi.fn(async () => 'deferred' as const)
    const open = vi.fn(async () => '/workspace')
    const options = { locale: 'ja' as const, nativeLocale: 'en' as const, native: true, confirmRestart, open }
    expect(await picker.pick(options)).toBe('/workspace')
    expect(await picker.pick(options)).toBe('/workspace')
    expect(confirmRestart).toHaveBeenCalledTimes(1)
    expect(open).toHaveBeenLastCalledWith('en')
    await picker.pick({ ...options, locale: 'fr' })
    expect(confirmRestart).toHaveBeenCalledTimes(2)
    await picker.pick({ ...options, locale: 'en' })
    await picker.pick(options)
    expect(confirmRestart).toHaveBeenCalledTimes(3)
    picker.languageChanged()
    await picker.pick(options)
    expect(confirmRestart).toHaveBeenCalledTimes(4)
  })

  it('does not open a panel when restarting or when settings are not saved', async () => {
    for (const outcome of ['restarting', 'not-saved'] as const) {
      const open = vi.fn(async () => '/workspace')
      const picker = new NativeDirectoryPicker()
      const options = { locale: 'ja' as const, nativeLocale: 'en' as const, native: true, confirmRestart: vi.fn(async () => outcome), open }
      expect(await picker.pick(options)).toBeNull()
      expect(open).not.toHaveBeenCalled()
      if (outcome === 'restarting') {
        expect(await picker.pick(options)).toBeNull()
        expect(options.confirmRestart).toHaveBeenCalledTimes(1)
      }
    }
  })

  it('coalesces concurrent requests and releases its guard after errors', async () => {
    const picker = new NativeDirectoryPicker()
    let release = () => {}
    const pending = new Promise<void>(resolve => { release = resolve })
    const open = vi.fn(async () => { await pending; return '/workspace' })
    const options = { locale: 'en' as const, nativeLocale: 'en' as const, native: true, confirmRestart: vi.fn(async () => 'deferred' as const), open }
    const first = picker.pick(options)
    expect(await picker.pick(options)).toBeNull()
    release()
    expect(await first).toBe('/workspace')
    await expect(picker.pick({ ...options, open: async () => { throw new Error('panel failed') } })).rejects.toThrow('panel failed')
    expect(await picker.pick(options)).toBe('/workspace')
  })
})
