export type HarnessLocale = 'en' | 'zh'

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

export function resolveHarnessLocale(
  preference: unknown,
  preferredSystemLanguages: readonly string[]
): HarnessLocale {
  if (preference === 'zh' || preference === 'en') return preference

  return preferredSystemLanguages[0]?.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}
