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
  agentLabel: string
  agentBusyLabel: string
  restartLabel: string
  restartBusyLabel: string
  quitLabel: string
  notice?: string
  noticeTone?: 'success' | 'error'
}

export function shouldStartInSafeMode(argv: readonly string[]): boolean {
  return argv.includes('--safe-mode')
}

export function buildSafeModeViewModel(options: {
  locale: SafeModeLocale
  plugins: readonly string[]
  notice?: string
  noticeTone?: 'success' | 'error'
}): SafeModeViewModel {
  const plugins = [...new Set(options.plugins)]

  if (options.locale === 'zh') {
    return {
      locale: 'zh',
      brand: 'DSH Desktop',
      badge: '安全模式',
      heading: '',
      summary: '部分第三方插件可能导致系统异常。安全模式会暂时停用所有第三方插件，确保基础功能正常使用，但不会删除插件。如需恢复正常模式，可尝试卸载近期安装的插件后重启。',
      plugins,
      emptyMessage: '当前 Profile 中没有可卸载的第三方插件。',
      selectionHint: '选择要卸载的插件',
      safetyNote: '工作区、会话、模型配置和未选中的插件不会被删除。',
      uninstallLabel: '卸载所选插件',
      uninstallBusyLabel: '正在卸载…',
      selectAllLabel: '全选',
      agentLabel: '关闭',
      agentBusyLabel: '正在关闭…',
      restartLabel: '退出安全模式并重启',
      restartBusyLabel: '正在重启…',
      quitLabel: '退出 DSH Desktop',
      notice: options.notice,
      noticeTone: options.noticeTone
    }
  }

  return {
    locale: 'en',
    brand: 'DSH Desktop',
    badge: 'Safe Mode',
    heading: '',
    summary: 'Some third-party plugins may cause startup problems. Safe Mode temporarily disables all of them while the Agent remains available; the plugins are not deleted. Remove a recently installed plugin, then restart to try again.',
    plugins,
    emptyMessage: 'There are no removable third-party plugins in this profile.',
    selectionHint: 'Select plugins to remove',
    safetyNote: 'Workspaces, sessions, model settings, and unselected plugins will not be removed.',
    uninstallLabel: 'Remove selected plugins',
    uninstallBusyLabel: 'Removing…',
    selectAllLabel: 'Select all',
    agentLabel: 'Close',
    agentBusyLabel: 'Closing…',
    restartLabel: 'Exit Safe Mode and restart',
    restartBusyLabel: 'Restarting…',
    quitLabel: 'Quit DSH Desktop',
    notice: options.notice,
    noticeTone: options.noticeTone
  }
}
