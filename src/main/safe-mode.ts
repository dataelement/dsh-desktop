import type { ProfileCompatibilityIssue } from './state/profile-compatibility'

export type SafeModeLocale = 'en' | 'zh'

export interface SafeModeIssueViewModel extends ProfileCompatibilityIssue {
  kindLabel: string
  severityLabel: string
  actionLabel: string
  versionLabel?: string
}

export interface SafeModeIssueGroupViewModel {
  id: string
  name: string
  kindLabel: string
  severityLabel: string
  actionLabel: string
  countLabel: string
  detailLabel: string
  issueIds: string[]
  issues: SafeModeIssueViewModel[]
}

export interface SafeModePluginViewModel {
  name: string
  statusLabel?: string
  actionLabel: string
  incompatible: boolean
}

export interface SafeModeViewModel {
  locale: SafeModeLocale
  brand: string
  badge: string
  heading: string
  summary: string
  plugins: string[]
  pluginItems: SafeModePluginViewModel[]
  issueGroups: SafeModeIssueGroupViewModel[]
  emptyMessage: string
  selectionHint: string
  safetyNote: string
  applyLabel: string
  applyBusyLabel: string
  selectAllLabel: string
  agentLabel: string
  agentBusyLabel: string
  restartLabel: string
  restartBusyLabel: string
  restartConfirm?: string
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
  const pluginIssues = issues.filter((issue) => issue.resolution === 'disable-plugin')
  const incompatiblePlugins = new Set(pluginIssues.map((issue) => issue.target))
  const plugins = [...new Set([
    ...options.plugins,
    ...incompatiblePlugins
  ])]
  const pluginItems = plugins.map((name): SafeModePluginViewModel => {
    const incompatible = incompatiblePlugins.has(name)
    return {
      name,
      statusLabel: incompatible
        ? options.locale === 'zh' ? '（版本不兼容）' : '(version incompatible)'
        : undefined,
      actionLabel: options.locale === 'zh' ? '卸载插件' : 'Remove plugin',
      incompatible
    }
  })
  const groups = new Map<string, SafeModeIssueViewModel[]>()
  for (const issue of issues.filter((issue) => issue.resolution !== 'disable-plugin')) {
    const id = issue.groupId ?? `${issue.resolution}:${issue.target}`
    const grouped = groups.get(id) ?? []
    grouped.push(issue)
    groups.set(id, grouped)
  }
  const issueGroups = [...groups.entries()].map(([id, grouped]): SafeModeIssueGroupViewModel => {
    const first = grouped[0]!
    const zh = options.locale === 'zh'
    const groupKind = first.groupKind ?? (
      first.resolution === 'disable-plugin'
        ? 'plugin'
        : first.resolution === 'quarantine-workspace'
          ? 'workspace'
          : 'profile'
    )
    const name = groupKind === 'profile'
      ? zh ? 'Profile 核心依赖' : 'Profile core dependencies'
      : first.groupName ?? first.packageName
    const actionLabel = [...new Set(grouped.map((issue) => issue.actionLabel))].join(zh ? '；' : '; ')
    return {
      id,
      name,
      kindLabel: zh
        ? groupKind === 'plugin' ? '根插件' : groupKind === 'workspace' ? 'Workspace' : 'Profile'
        : groupKind === 'plugin' ? 'Root plugin' : groupKind === 'workspace' ? 'Workspace' : 'Profile',
      severityLabel: grouped.some((issue) => issue.severity === 'blocking')
        ? zh ? '阻断' : 'blocking'
        : zh ? '警告' : 'warning',
      actionLabel,
      countLabel: zh ? `包含 ${grouped.length} 项检测结果` : `${grouped.length} finding${grouped.length === 1 ? '' : 's'}`,
      detailLabel: zh ? `查看 ${grouped.length} 项详情` : `View ${grouped.length} detail${grouped.length === 1 ? '' : 's'}`,
      issueIds: grouped.map((issue) => issue.id),
      issues: grouped
    }
  })
  const blockingGroups = new Set(
    issues
      .filter((issue) => issue.severity === 'blocking')
      .map((issue) => issue.groupId ?? `${issue.resolution}:${issue.target}`)
  ).size

  if (options.locale === 'zh') {
    return {
      locale: 'zh',
      brand: 'DSH Desktop',
      badge: '安全模式',
      heading: '',
      summary: '部分第三方插件可能导致系统异常。安全模式会暂时停用所有第三方插件，确保基础功能正常使用，但不会删除插件。如需恢复正常模式，可尝试卸载近期安装的插件后重启。',
      plugins,
      pluginItems,
      issueGroups,
      emptyMessage: '当前 Profile 中没有可卸载的第三方插件。',
      selectionHint: '选择要卸载的插件',
      safetyNote: '工作区、会话、模型配置和未选中的插件不会被删除。',
      applyLabel: '卸载所选插件',
      applyBusyLabel: '正在卸载…',
      selectAllLabel: '全选',
      agentLabel: '关闭',
      agentBusyLabel: '正在关闭…',
      restartLabel: '退出安全模式并重启',
      restartBusyLabel: '正在重启…',
      restartConfirm: blockingGroups > 0
        ? `仍有 ${blockingGroups} 组阻断问题。退出后会重新启用第三方插件，可能再次启动失败。仍然退出安全模式吗？`
        : undefined,
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
    pluginItems,
    issueGroups,
    emptyMessage: 'There are no removable third-party plugins in this profile.',
    selectionHint: 'Select plugins to remove',
    safetyNote: 'Workspaces, sessions, model settings, and unselected plugins will not be removed.',
    applyLabel: 'Remove selected plugins',
    applyBusyLabel: 'Removing…',
    selectAllLabel: 'Select all',
    agentLabel: 'Close',
    agentBusyLabel: 'Closing…',
    restartLabel: 'Exit Safe Mode and restart',
    restartBusyLabel: 'Restarting…',
    restartConfirm: blockingGroups > 0
      ? `${blockingGroups} blocking group${blockingGroups === 1 ? '' : 's'} remain. Third-party plugins will be enabled again and startup may fail. Exit Safe Mode anyway?`
      : undefined,
    quitLabel: 'Quit DSH Desktop',
    notice: options.notice,
    noticeTone: options.noticeTone
  }
}
