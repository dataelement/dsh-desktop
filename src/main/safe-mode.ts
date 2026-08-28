import type { ProfileCompatibilityIssue } from './state/profile-compatibility'

export type SafeModeLocale = 'en' | 'zh'

export interface SafeModeIssueViewModel extends ProfileCompatibilityIssue {
  kindLabel: string
  severityLabel: string
  actionLabel: string
  versionLabel?: string
}

export interface SafeModeViewModel {
  locale: SafeModeLocale
  brand: string
  badge: string
  heading: string
  summary: string
  plugins: string[]
  issues: SafeModeIssueViewModel[]
  issueHeading: string
  issueEmptyMessage: string
  repairLabel: string
  repairBusyLabel: string
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
  issues?: readonly ProfileCompatibilityIssue[]
  notice?: string
  noticeTone?: 'success' | 'error'
}): SafeModeViewModel {
  const plugins = [...new Set(options.plugins)]
  const issues = (options.issues ?? []).map((issue): SafeModeIssueViewModel => {
    const zh = options.locale === 'zh'
    const kindLabel = zh
      ? issue.kind === 'core-version-mismatch'
        ? '核心版本冲突'
        : issue.kind === 'missing-client-module'
          ? '插件版本不兼容'
          : 'Workspace 依赖污染'
      : issue.kind === 'core-version-mismatch'
        ? 'Core version conflict'
        : issue.kind === 'missing-client-module'
          ? 'Incompatible plugin'
          : 'Workspace dependency conflict'
    const actionLabel = zh
      ? issue.resolution === 'disable-plugin'
        ? '暂停插件（保留数据）'
        : issue.resolution === 'quarantine-workspace'
          ? '隔离 Workspace（可恢复）'
          : '重建冲突依赖'
      : issue.resolution === 'disable-plugin'
        ? 'Disable plugin (keep data)'
        : issue.resolution === 'quarantine-workspace'
          ? 'Quarantine workspace (recoverable)'
          : 'Rebuild conflicting dependencies'
    const versionLabel = issue.installedVersion
      ? zh
        ? `当前 ${issue.installedVersion}${issue.expectedVersion ? ` · 需要 ${issue.expectedVersion}` : ''}`
        : `Installed ${issue.installedVersion}${issue.expectedVersion ? ` · expected ${issue.expectedVersion}` : ''}`
      : undefined
    return {
      ...issue,
      kindLabel,
      severityLabel: zh ? (issue.severity === 'blocking' ? '阻断' : '警告') : issue.severity,
      actionLabel,
      versionLabel
    }
  })

  if (options.locale === 'zh') {
    return {
      locale: 'zh',
      brand: 'DSH Desktop',
      badge: '安全模式',
      heading: '',
      summary: '安全模式会暂时停用所有第三方插件，确保基础功能正常使用，但不会删除插件。同时检查核心版本、客户端模块和 Workspace 依赖；兼容性修复会先备份。',
      plugins,
      issues,
      issueHeading: '兼容性检查',
      issueEmptyMessage: '未发现核心版本、客户端模块或 Workspace 依赖冲突。',
      repairLabel: '应用所选修复',
      repairBusyLabel: '正在修复…',
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
    summary: 'Safe Mode temporarily disables all third-party plugins so core features remain available, but does not delete them. It also checks core versions, client modules, and workspace dependencies; compatibility repairs are backed up first.',
    plugins,
    issues,
    issueHeading: 'Compatibility check',
    issueEmptyMessage: 'No core version, client module, or workspace dependency conflicts were found.',
    repairLabel: 'Apply selected repairs',
    repairBusyLabel: 'Repairing…',
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
