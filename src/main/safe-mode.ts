export type SafeModeLocale = 'en' | 'zh'

export interface SafeModeViewModel {
  locale: SafeModeLocale
  brand: string
  badge: string
  heading: string
  summary: string
  plugins: string[]
  emptyMessage: string
  selectionHint: string
  safetyNote: string
  uninstallLabel: string
  uninstallBusyLabel: string
  selectAllLabel: string
  restartLabel: string
  restartBusyLabel: string
  quitLabel: string
  notice?: string
}

export function shouldStartInSafeMode(argv: readonly string[]): boolean {
  return argv.includes('--safe-mode')
}

export function buildSafeModeViewModel(options: {
  locale: SafeModeLocale
  plugins: readonly string[]
  notice?: string
}): SafeModeViewModel {
  const plugins = [...new Set(options.plugins)]

  if (options.locale === 'zh') {
    return {
      locale: 'zh',
      brand: 'DSH Desktop',
      badge: '安全模式',
      heading: '第三方插件已被屏蔽',
      summary: 'Harness 当前没有启动，因此已安装的第三方插件不会运行。你可以选择并卸载有问题的插件，然后正常重启。',
      plugins,
      emptyMessage: '当前 Profile 中没有可卸载的第三方插件。',
      selectionHint: '选择要卸载的插件',
      safetyNote: '工作区、会话、模型配置和未选中的插件不会被删除。',
      uninstallLabel: '卸载所选插件',
      uninstallBusyLabel: '正在卸载…',
      selectAllLabel: '全选',
      restartLabel: '退出安全模式并启动 Harness',
      restartBusyLabel: '正在启动…',
      quitLabel: '退出 DSH Desktop',
      notice: options.notice
    }
  }

  return {
    locale: 'en',
    brand: 'DSH Desktop',
    badge: 'Safe Mode',
    heading: 'Third-party plugins are blocked',
    summary: 'Harness is not running, so installed third-party plugins cannot start. Select any problem plugins to remove, then restart normally.',
    plugins,
    emptyMessage: 'There are no removable third-party plugins in this profile.',
    selectionHint: 'Select plugins to remove',
    safetyNote: 'Workspaces, sessions, model settings, and unselected plugins will not be removed.',
    uninstallLabel: 'Remove selected plugins',
    uninstallBusyLabel: 'Removing…',
    selectAllLabel: 'Select all',
    restartLabel: 'Exit Safe Mode and start Harness',
    restartBusyLabel: 'Starting…',
    quitLabel: 'Quit DSH Desktop',
    notice: options.notice
  }
}
