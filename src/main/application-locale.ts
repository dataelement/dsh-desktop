export type HarnessLocale = 'en' | 'zh'

const en = {
  'windowRecovery.heading': 'Unable to display the window',
  'windowRecovery.description': 'Please restart DSH Desktop to try again.',
  'common.restart': 'Restart'
}

export type ApplicationMessageKey = keyof typeof en

// This catalog must also be available before Harness and its locale service start.
const messages: Record<HarnessLocale, Record<ApplicationMessageKey, string>> = {
  en,
  zh: {
    'windowRecovery.heading': '窗口暂时无法显示',
    'windowRecovery.description': '请重新启动 DSH Desktop 后重试。',
    'common.restart': '重新启动'
  }
}

export function applicationText(locale: HarnessLocale, key: ApplicationMessageKey): string {
  return messages[locale][key]
}

export function resolveHarnessLocale(
  preference: unknown,
  preferredSystemLanguages: readonly string[]
): HarnessLocale {
  if (preference === 'zh' || preference === 'en') return preference

  return preferredSystemLanguages[0]?.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}
