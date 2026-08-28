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

export interface SafeModeViewModel {
  locale: SafeModeLocale
  brand: string
  badge: string
  heading: string
  summary: string
  plugins: string[]
  issues: SafeModeIssueViewModel[]
  issueGroups: SafeModeIssueGroupViewModel[]
  issueHeading: string
  issueEmptyMessage: string
  issueSelectionHint: string
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
  restartConfirm?: string
  exitHeading: string
  exitHint: string
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
  const groups = new Map<string, SafeModeIssueViewModel[]>()
  for (const issue of issues) {
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
  const blockingGroups = issueGroups.filter((group) =>
    group.issues.some((issue) => issue.severity === 'blocking')
  ).length

  if (options.locale === 'zh') {
    return {
      locale: 'zh',
      brand: 'DSH Desktop',
      badge: '安全模式',
      heading: '',
      summary: '安全模式会暂时停用所有第三方插件，确保基础功能正常使用，但不会删除插件。同时检查核心版本、客户端模块和 Workspace 依赖；兼容性修复会先备份。',
      plugins,
      issues,
      issueGroups,
      issueHeading: '兼容性修复',
      issueEmptyMessage: '未发现核心版本、客户端模块或 Workspace 依赖冲突。',
      issueSelectionHint: '勾选只会加入修复计划；点击本区域的“修复所选问题”后才会执行。',
      repairLabel: '修复所选问题',
      repairBusyLabel: '正在修复…',
      emptyMessage: '当前 Profile 中没有可卸载的第三方插件。',
      selectionHint: '插件卸载（与兼容性修复无关）',
      safetyNote: '修复会先备份；卸载只作用于下方明确勾选的根插件，未选中的插件不会被删除。工作区、会话和模型配置不会被删除。',
      uninstallLabel: '卸载所选插件',
      uninstallBusyLabel: '正在卸载…',
      selectAllLabel: '全选',
      agentLabel: '关闭',
      agentBusyLabel: '正在关闭…',
      restartLabel: blockingGroups > 0 ? '暂不处理并退出安全模式' : '完成并退出安全模式',
      restartBusyLabel: '正在重启…',
      restartConfirm: blockingGroups > 0
        ? `仍有 ${blockingGroups} 组阻断问题。退出后会重新启用第三方插件，可能再次启动失败。仍然退出安全模式吗？`
        : undefined,
      exitHeading: '离开安全模式',
      exitHint: blockingGroups > 0
        ? '可以暂不处理并退出；重新启用第三方插件后，原问题可能再次出现。'
        : '兼容性检查已通过，可以重新启用第三方插件。',
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
    issueGroups,
    issueHeading: 'Compatibility repairs',
    issueEmptyMessage: 'No core version, client module, or workspace dependency conflicts were found.',
    issueSelectionHint: 'Selecting only adds a group to the repair plan. Click “Repair selected issues” in this section to apply changes.',
    repairLabel: 'Repair selected issues',
    repairBusyLabel: 'Repairing…',
    emptyMessage: 'There are no removable third-party plugins in this profile.',
    selectionHint: 'Plugin removal (separate from compatibility repair)',
    safetyNote: 'Repairs are backed up first. Removal affects only explicitly selected root plugins; workspaces, sessions, and model settings are preserved.',
    uninstallLabel: 'Remove selected plugins',
    uninstallBusyLabel: 'Removing…',
    selectAllLabel: 'Select all',
    agentLabel: 'Close',
    agentBusyLabel: 'Closing…',
    restartLabel: blockingGroups > 0 ? 'Exit Safe Mode without repairing' : 'Finish and exit Safe Mode',
    restartBusyLabel: 'Restarting…',
    restartConfirm: blockingGroups > 0
      ? `${blockingGroups} blocking group${blockingGroups === 1 ? '' : 's'} remain. Third-party plugins will be enabled again and startup may fail. Exit Safe Mode anyway?`
      : undefined,
    exitHeading: 'Leave Safe Mode',
    exitHint: blockingGroups > 0
      ? 'You can leave without repairing. The same problem may return after third-party plugins are enabled.'
      : 'Compatibility checks passed. Third-party plugins can be enabled again.',
    quitLabel: 'Quit DSH Desktop',
    notice: options.notice,
    noticeTone: options.noticeTone
  }
}
