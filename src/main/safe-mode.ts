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
      heading: '管理被屏蔽的第三方插件',
      summary: '安全模式中的 Agent 会继续在隔离的核心 Profile 中运行。这里管理的是正常 web Profile 中被屏蔽的第三方插件。',
      plugins,
      emptyMessage: '当前 Profile 中没有可卸载的第三方插件。',
      selectionHint: '选择要卸载的插件',
      safetyNote: '工作区、会话、模型配置和未选中的插件不会被删除。',
      uninstallLabel: '卸载所选插件',
      uninstallBusyLabel: '正在卸载…',
      selectAllLabel: '全选',
      agentLabel: '返回 Agent',
      agentBusyLabel: '正在返回…',
      restartLabel: '退出安全模式并正常启动',
      restartBusyLabel: '正在启动…',
      quitLabel: '退出 DSH Desktop',
      notice: options.notice
    }
  }

  return {
    locale: 'en',
    brand: 'DSH Desktop',
    badge: 'Safe Mode',
    heading: 'Manage blocked third-party plugins',
    summary: 'The Agent keeps running in Safe Mode with an isolated core profile. This page manages blocked plugins from the normal web profile.',
    plugins,
    emptyMessage: 'There are no removable third-party plugins in this profile.',
    selectionHint: 'Select plugins to remove',
    safetyNote: 'Workspaces, sessions, model settings, and unselected plugins will not be removed.',
    uninstallLabel: 'Remove selected plugins',
    uninstallBusyLabel: 'Removing…',
    selectAllLabel: 'Select all',
    agentLabel: 'Return to Agent',
    agentBusyLabel: 'Returning…',
    restartLabel: 'Exit Safe Mode and start normally',
    restartBusyLabel: 'Starting…',
    quitLabel: 'Quit DSH Desktop',
    notice: options.notice
  }
}
