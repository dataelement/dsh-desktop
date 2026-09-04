import type { ProfileCompatibilityIssue } from './state/profile-compatibility'
import type { PluginHealthReport, PluginHealthStatus } from './state/plugin-market-check'

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
  statusTone?: 'warning' | 'danger' | 'success'
  actionLabel: string
  incompatible: boolean
  suspected: boolean
  healthStatus?: PluginHealthStatus
  healthLabel?: string
  installedVersion?: string
  latestVersion?: string
  upgradeReady?: boolean
  upgradeVersion?: string
  upgradeButtonLabel?: string
}

export interface SafeModeBackupViewModel {
  removalId: string
  pluginName: string
  backupDirectory: string
  disabledAtLabel: string
  generationLabel?: string
  cleanupReady: boolean
  restoreReady: boolean
  statusLabel: string
  openLabel: string
  restoreLabel: string
  deleteLabel: string
  deleteConfirm: string
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
  backupItems: SafeModeBackupViewModel[]
  backupHeading: string
  backupSummary: string
  recoveryLocked: boolean
  recoveryOpenLabel: string
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
  upgradeAllLabel?: string
  upgradeAllBusyLabel?: string
  upgradeReadyCount: number
}

export function shouldStartInSafeMode(argv: readonly string[]): boolean {
  return argv.includes('--safe-mode')
}

export function buildSafeModeViewModel(options: {
  locale: SafeModeLocale
  plugins: readonly string[]
  suspectedPlugins?: readonly string[]
  issues?: readonly ProfileCompatibilityIssue[]
  healthReports?: readonly PluginHealthReport[]
  backups?: readonly {
    removalId: string
    pluginName: string
    backupDirectory: string
    disabledAt: string
    bootVerifiedAt?: string
    restoreStartedAt?: string
    restoreFailure?: string
    restoredAt?: string
    generationIds?: readonly string[]
    status?: 'backup-pending' | 'disabled' | 'cleanup-pending' | 'removed'
    integrity?: 'verified' | 'legacy-unverified' | 'incomplete'
    integrityDetail?: string
    canRestore?: boolean
  }[]
  recoveryLocked?: boolean
  backupRestoreLocked?: boolean
  allowedRestoreId?: string
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
  const suspectedPlugins = new Set(options.suspectedPlugins ?? [])
  const plugins = [...new Set([
    ...options.plugins,
    ...incompatiblePlugins,
    ...suspectedPlugins
  ])].sort((left, right) => Number(suspectedPlugins.has(right)) - Number(suspectedPlugins.has(left)))
  const healthReportByPlugin = new Map(
    (options.healthReports ?? []).map((report) => [report.packageName, report])
  )
  const pluginItems = plugins.map((name): SafeModePluginViewModel => {
    const incompatible = incompatiblePlugins.has(name)
    const suspected = suspectedPlugins.has(name)
    const report = healthReportByPlugin.get(name)
    const labels = [
      ...(suspected
        ? [options.locale === 'zh' ? '本次启动日志推断' : 'inferred from this startup log']
        : []),
      ...(incompatible
        ? [options.locale === 'zh' ? '版本不兼容' : 'version incompatible']
        : [])
    ]
    if (report?.healthLabel && !incompatible && !suspected) {
      labels.push(report.healthLabel)
    }
    const statusTone = incompatible
      ? 'danger'
      : suspected
        ? 'warning'
        : report?.upgradeReady
          ? 'success'
          : undefined
    const upgradeButtonLabel = report?.upgradeReady && report.upgradeVersion
      ? options.locale === 'zh'
        ? `升级至 v${report.upgradeVersion}`
        : `Upgrade to v${report.upgradeVersion}`
      : undefined

    return {
      name,
      statusLabel: labels.length > 0
        ? options.locale === 'zh'
          ? `（${labels.join('，')}）`
          : `(${labels.join(', ')})`
        : undefined,
      statusTone,
      actionLabel: options.locale === 'zh' ? '卸载插件' : 'Remove plugin',
      incompatible,
      suspected,
      ...(report?.healthStatus !== undefined ? { healthStatus: report.healthStatus } : {}),
      ...(report?.healthLabel !== undefined ? { healthLabel: report.healthLabel } : {}),
      ...(report?.installedVersion !== undefined ? { installedVersion: report.installedVersion } : {}),
      ...(report?.latestVersion !== undefined ? { latestVersion: report.latestVersion } : {}),
      ...(report?.upgradeReady !== undefined ? { upgradeReady: report.upgradeReady } : {}),
      ...(report?.upgradeVersion !== undefined ? { upgradeVersion: report.upgradeVersion } : {}),
      ...(upgradeButtonLabel !== undefined ? { upgradeButtonLabel } : {})
    }
  })
  const upgradeReadyCount = pluginItems.filter((item) => item.upgradeReady).length
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
      ? 'Profile'
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
  const backupItems = (options.backups ?? []).map((backup): SafeModeBackupViewModel => {
    const zh = options.locale === 'zh'
    const cleanupReady = backup.bootVerifiedAt !== undefined && backup.restoreStartedAt === undefined
    const generationCount = backup.generationIds?.length ?? 0
    const incomplete = backup.integrity === 'incomplete'
    const restoreLocked = options.backupRestoreLocked ?? options.recoveryLocked
    const restoreReady = backup.canRestore === true && (
      restoreLocked !== true || options.allowedRestoreId === backup.removalId
    )
    const statusLabel = incomplete
      ? zh
        ? `备份校验失败：${backup.integrityDetail ?? '内容不完整'}。已禁止自动恢复。`
        : `Backup verification failed: ${backup.integrityDetail ?? 'content is incomplete'}. Automatic restore is blocked.`
      : backup.restoreStartedAt !== undefined
        ? zh
          ? `上次恢复未完成，正常 Profile 已锁定。请重试恢复；备份仍保留。${backup.restoreFailure ? ` ${backup.restoreFailure}` : ''}`
          : `The previous restore is incomplete and the normal Profile is locked. Retry restore; the backup is still kept.${backup.restoreFailure ? ` ${backup.restoreFailure}` : ''}`
      : backup.integrity === 'legacy-unverified'
        ? zh
          ? '这是旧版保留的备份，没有内容校验清单；恢复前请先检查目录。'
          : 'This backup was kept by an older version and has no checksum inventory; inspect it before restoring.'
      : backup.status !== undefined && backup.status !== 'removed'
        ? zh
          ? `卸载尚未完成（${backup.status}）；恢复材料继续保留。`
          : `Removal is incomplete (${backup.status}); recovery material is still kept.`
        : backup.restoredAt !== undefined
          ? zh
            ? `已于 ${backup.restoredAt} 恢复；备份仍会保留，直到你明确删除。`
            : `Restored ${backup.restoredAt}; the backup remains until you explicitly delete it.`
          : cleanupReady
            ? zh ? '已通过正常启动验证；仍会保留，直到你确认删除' : 'Boot verified; kept until you confirm deletion'
            : zh ? '尚未通过正常启动验证，禁止删除' : 'Not boot verified; deletion is blocked'
    return {
      removalId: backup.removalId,
      pluginName: backup.pluginName,
      backupDirectory: backup.backupDirectory,
      disabledAtLabel: zh ? `卸载于 ${backup.disabledAt}` : `Removed ${backup.disabledAt}`,
      ...(generationCount === 0
        ? {}
        : {
            generationLabel: zh
              ? `包含 ${generationCount} 个 generation 备份`
              : `${generationCount} generation backup${generationCount === 1 ? '' : 's'}`
          }),
      cleanupReady: cleanupReady &&
        (backup.status ?? 'removed') === 'removed' &&
        options.recoveryLocked !== true,
      restoreReady,
      statusLabel,
      openLabel: zh ? '打开备份' : 'Open backup',
      restoreLabel: zh ? '恢复插件…' : 'Restore plugin…',
      deleteLabel: zh ? '永久删除…' : 'Delete permanently…',
      deleteConfirm: zh
        ? `永久删除 ${backup.pluginName} 的这份恢复备份？此操作不可撤销。`
        : `Permanently delete this recovery backup for ${backup.pluginName}? This cannot be undone.`
    }
  })

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
      backupItems,
      backupHeading: '插件恢复备份',
      backupSummary: options.recoveryLocked
        ? options.allowedRestoreId !== undefined
          ? '正常 Profile 已锁定；只允许重试对应的插件备份恢复。备份不能删除。'
          : '恢复事务尚未完成。恢复材料已锁定，只允许查看，不能修复、卸载或删除，也不能恢复。'
        : '备份不会按启动次数自动删除。你可以打开目录检查；只有正常模式稳定启动后，才允许逐份永久清理。',
      recoveryLocked: options.recoveryLocked === true,
      recoveryOpenLabel: '打开恢复材料目录',
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
      noticeTone: options.noticeTone,
      upgradeAllLabel: upgradeReadyCount > 0
        ? `一键升级 ${upgradeReadyCount} 个已适配插件`
        : undefined,
      upgradeAllBusyLabel: '正在批量升级…',
      upgradeReadyCount
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
    backupItems,
    backupHeading: 'Plugin recovery backups',
    backupSummary: options.recoveryLocked
      ? options.allowedRestoreId !== undefined
        ? 'The normal Profile is locked; only the matching plugin-backup restore retry is allowed. Backups cannot be deleted.'
        : 'A recovery transaction is incomplete. Recovery material is inspection-only; repair, removal, restore, and deletion are blocked.'
      : 'Backups are never deleted by launch count. Inspect them first; permanent per-backup cleanup is enabled only after a stable normal boot.',
    recoveryLocked: options.recoveryLocked === true,
    recoveryOpenLabel: 'Open recovery material folder',
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
    noticeTone: options.noticeTone,
    upgradeAllLabel: upgradeReadyCount > 0
      ? `Upgrade ${upgradeReadyCount} compatible plugin${upgradeReadyCount === 1 ? '' : 's'}`
      : undefined,
    upgradeAllBusyLabel: 'Upgrading plugins…',
    upgradeReadyCount
  }
}
