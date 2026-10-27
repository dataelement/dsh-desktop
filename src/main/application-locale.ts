import { parse } from 'yaml'

export type HarnessLocale = 'en' | 'zh'

/** Profile patch entry that stores the language chosen in Desktop settings. */
const LOCALE_PLUGIN_NAME = '@deepseek-ai/dsh-client-locale'

const en = {
  'memoryRecovery.heading': 'The application ran out of memory and has stopped to release resources',
  'graphicsRecovery.heading': 'Repeated graphics failures: page recovery could not be confirmed',
  'memoryRecovery.description': 'Saved sessions and configuration are preserved. Restarting may repeat the failure; close other memory-intensive applications first.',
  'graphicsRecovery.description': 'Quit, or restart with hardware acceleration disabled. Software rendering may increase CPU usage.',
  'common.quit': 'Quit',
  'graphicsRecovery.restart': 'Restart without hardware acceleration',

  'windowRecovery.heading': 'Unable to display the window',
  'windowRecovery.description': 'Please restart DSH Desktop to try again.',
  'common.restart': 'Restart'
}

export type ApplicationMessageKey = keyof typeof en

// This catalog must also be available before Harness and its locale service start.
const messages: Record<HarnessLocale, Record<ApplicationMessageKey, string>> = {
  en,
  zh: {
    'memoryRecovery.heading': '应用内存不足，已停止运行以释放资源',
    'graphicsRecovery.heading': '图形进程反复异常，页面未能恢复响应',
    'memoryRecovery.description': '已保存的会话和配置不会被删除。重启可能再次触发同一问题，请先关闭其他高内存应用。',
    'graphicsRecovery.description': '可以退出，或关闭硬件加速后重新启动。软件渲染可能增加 CPU 占用。',
    'common.quit': '退出',
    'graphicsRecovery.restart': '关闭硬件加速并重启',

    'windowRecovery.heading': '窗口暂时无法显示',
    'windowRecovery.description': '请重新启动 DSH Desktop 后重试。',
    'common.restart': '重新启动'
  }
}

export function applicationText(locale: HarnessLocale, key: ApplicationMessageKey): string {
  return messages[locale][key]
}

/**
 * A language the user chose in Desktop. Only the `zh` and `en` primary tags
 * count; anything else is left unresolved so the caller can try the next source.
 */
export function explicitHarnessLocale(preference: unknown): HarnessLocale | undefined {
  if (typeof preference !== 'string') return undefined
  const primary = preference.trim().toLowerCase().split('-')[0]
  if (primary === 'zh' || primary === 'en') return primary
  return undefined
}

/** The first explicit Desktop choice among the sources, ignoring empty and unknown tags. */
export function chosenHarnessLocale(sources: readonly unknown[]): HarnessLocale | undefined {
  for (const source of sources) {
    const locale = explicitHarnessLocale(source)
    if (locale) return locale
  }
  return undefined
}

/**
 * Desktop choice first, then the machine language. `reported` is the live
 * selection from the page, `profilePreference` is the current profile patch,
 * and `settingsPreference` is the legacy settings document.
 */
export function selectHarnessLocale(options: {
  reported?: unknown
  profilePreference?: unknown
  settingsPreference?: unknown
  preferredSystemLanguages: readonly string[]
}): HarnessLocale {
  return chosenHarnessLocale([
    options.reported,
    options.profilePreference,
    options.settingsPreference
  ]) ?? resolveHarnessLocale(undefined, options.preferredSystemLanguages)
}

export function resolveHarnessLocale(
  preference: unknown,
  preferredSystemLanguages: readonly string[]
): HarnessLocale {
  return explicitHarnessLocale(preference)
    ?? (preferredSystemLanguages[0]?.toLowerCase().startsWith('zh') ? 'zh' : 'en')
}

/**
 * Read `config.preference` from a profile `cordis.patch.yml`.
 * A missing locale row, a damaged document, or a layer that is not a sequence
 * means this profile has no saved Desktop language.
 */
export function localePreferenceFromProfilePatch(patchText: string): unknown {
  let value: unknown
  try {
    value = parse(patchText)
  } catch {
    return undefined
  }
  if (!Array.isArray(value)) return undefined

  for (const row of value) {
    if (!row || typeof row !== 'object') continue
    const entry = row as { id?: unknown; name?: unknown; config?: unknown }
    if (entry.id !== 'locale' && entry.name !== LOCALE_PLUGIN_NAME) continue
    const config = entry.config
    if (!config || typeof config !== 'object') return undefined
    return (config as { preference?: unknown }).preference
  }
  return undefined
}
