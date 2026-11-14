import { desktopLocale, nativeLanguage, type DesktopLocale } from '../../shared/desktop-locale'
import { nativeLocaleMessages } from './native-locale-messages'

const ATTEMPT_FLAG = '--dsh-native-language-attempt='

/** A new user-requested restart starts a new calibration lifecycle. */
export function clearNativeLocaleAttempt(argv: readonly string[]): string[] {
  const ownedOverride = argv.some(arg => arg.startsWith(ATTEMPT_FLAG))
  const result: string[] = []
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg?.startsWith(ATTEMPT_FLAG)) continue
    // Only remove a language override paired with our own calibration marker.
    // Otherwise a user-supplied Cocoa launch argument remains theirs to control.
    if (ownedOverride && arg === '-AppleLanguages') {
      const value = argv[index + 1]
      if (value !== undefined && !value.startsWith('-')) index++
      continue
    }
    if (ownedOverride && arg?.startsWith('-AppleLanguages=')) continue
    if (arg !== undefined) result.push(arg)
  }
  return result
}

/** Read a requested override for diagnostics; actual language must come from Cocoa. */
export function nativeLocaleArgument(argv: readonly string[]): DesktopLocale | undefined {
  const index = argv.indexOf('-AppleLanguages')
  const value = index < 0 ? undefined : argv[index + 1]
  return typeof value === 'string' ? desktopLocale(value.replace(/^\(|\)$/g, '')) : undefined
}

/** Replace only our language arguments, retaining safe-mode and other launch flags. */
export function nativeLocaleRelaunchArguments(argv: readonly string[], locale: DesktopLocale): string[] {
  const args: string[] = []
  for (let index = 1; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === '-AppleLanguages') {
      const value = argv[index + 1]
      if (value !== undefined && !value.startsWith('-')) index++
    } else if (arg !== undefined && !arg.startsWith('-AppleLanguages=') && !arg.startsWith(ATTEMPT_FLAG)) {
      args.push(arg)
    }
  }
  return [...args, '-AppleLanguages', `(${nativeLanguage(locale)})`, `${ATTEMPT_FLAG}${locale}`]
}

/** An optional presentation feature must never force an unbounded restart or block boot. */
export function shouldCalibrateNativeLocale(options: {
  platform: string
  preference: unknown
  actual: unknown
  argv: readonly string[]
}): boolean {
  const target = desktopLocale(options.preference)
  return options.platform === 'darwin' && target !== undefined
    && target !== desktopLocale(options.actual)
    && !options.argv.includes(`${ATTEMPT_FLAG}${target}`)
}

export async function confirmNativeLocaleRestart(options: {
  locale: DesktopLocale
  confirm: (prompt: ReturnType<typeof nativeLocaleRestartPrompt>) => Promise<boolean>
  savedLocale: () => Promise<DesktopLocale | undefined>
  notSaved: () => Promise<void>
  restart: () => void
}): Promise<'deferred' | 'restarting' | 'not-saved'> {
  if (!await options.confirm(nativeLocaleRestartPrompt(options.locale))) return 'deferred'
  if (await options.savedLocale() !== options.locale) {
    await options.notSaved()
    return 'not-saved'
  }
  options.restart()
  return 'restarting'
}

export function nativeLocaleRestartPrompt(locale: DesktopLocale): {
  message: string
  detail: string
  buttons: string[]
} {
  const text = nativeLocaleMessages[locale]
  return { message: text.restartHeading, detail: text.restartDetail, buttons: [text.later, text.restart] }
}

/** Owns one window's chooser; duplicate requests cannot enqueue dialogs or relaunches. */
export class NativeDirectoryPicker {
  private busy = false
  private deferred: DesktopLocale | undefined
  private restarting = false

  languageChanged(): void {
    this.deferred = undefined
  }

  async pick(options: {
    locale: DesktopLocale
    /** Raw active language; unsupported plugin languages must not trigger a fallback restart. */
    target?: string
    nativeLocale: DesktopLocale | undefined
    native: boolean
    confirmRestart: () => Promise<'deferred' | 'restarting' | 'not-saved'>
    open: (locale: DesktopLocale | undefined) => Promise<string | null>
  }): Promise<string | null> {
    if (this.busy || this.restarting) return null
    this.busy = true
    try {
      const target = desktopLocale(options.target ?? options.locale)
      if (!options.native || target === undefined || target === options.nativeLocale) {
        this.deferred = undefined
        return await options.open(options.native ? options.nativeLocale : options.locale)
      }
      if (this.deferred !== target) {
        const outcome = await options.confirmRestart()
        if (outcome === 'restarting') this.restarting = true
        if (outcome !== 'deferred') return null
        this.deferred = target
      }
      return await options.open(options.nativeLocale)
    } finally {
      this.busy = false
    }
  }
}
