/** Built-in Harness languages; this module has no process or persistence dependencies. */
export const DESKTOP_LOCALES = ['zh', 'en', 'ja', 'es', 'fr', 'de', 'ru', 'pt'] as const
export type DesktopLocale = typeof DESKTOP_LOCALES[number]

/** Match UI dictionaries without changing the original saved preference. */
export function desktopLocale(value: unknown): DesktopLocale | undefined {
  if (typeof value !== 'string') return undefined
  const primary = value.trim().toLowerCase().replaceAll('_', '-').split('-')[0]
  return DESKTOP_LOCALES.find(locale => locale === primary)
}

/** Keep a reported active tag separate from the vocabulary available in Desktop. */
export function desktopLanguageState(value: unknown): { active: string; display: DesktopLocale } | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined
  return { active: value, display: desktopLocale(value) ?? 'en' }
}

/** Explicit display boundary for recovery/standalone surfaces not yet translated. */
export function legacyLocale(value: unknown): 'zh' | 'en' {
  return desktopLocale(value) === 'zh' ? 'zh' : 'en'
}

export function preferredDesktopLocale(languages: readonly string[]): DesktopLocale {
  for (const language of languages) {
    const matched = desktopLocale(language)
    if (matched !== undefined) return matched
  }
  return 'en'
}

/** Resolve only a supported native target; unknown explicit plugin tags are not fallbacks. */
export function effectiveNativeLocale(preference: string | undefined, languages: readonly string[]): DesktopLocale | undefined {
  if (preference === undefined || preference.trim() === '' || preference.trim().toLowerCase() === 'auto') {
    return preferredDesktopLocale(languages)
  }
  return desktopLocale(preference)
}

/** Cocoa identifiers are a closed mapping, never interpolated from renderer input. */
export function nativeLanguage(locale: DesktopLocale): string {
  return { zh: 'zh-Hans', en: 'en', ja: 'ja', es: 'es', fr: 'fr', de: 'de', ru: 'ru', pt: 'pt-BR' }[locale]
}
