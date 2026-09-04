import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildSafeModeViewModel, shouldStartInSafeMode } from '../src/main/safe-mode'
import {
  ensureSafeModeProfile,
  SAFE_MODE_BUNDLES,
  SAFE_MODE_PROFILE
} from '../src/main/state/safe-mode-profile'

describe('Safe Mode', () => {
  it('is opt-in through an exact command-line switch', () => {
    expect(shouldStartInSafeMode(['DSH Desktop', '--safe-mode'])).toBe(true)
    expect(shouldStartInSafeMode(['DSH Desktop', '--safe-mode=false'])).toBe(false)
  })

  it('explains isolation and presents plugin leftovers in one cleanup plan', () => {
    const model = buildSafeModeViewModel({
      locale: 'zh',
      plugins: ['plugin-a', '@example/plugin-b', 'plugin-a']
    })
    expect(model.badge).toBe('安全模式')
    expect(model.heading).toBe('')
    expect(model.summary).toBe('部分第三方插件可能导致系统异常。安全模式会暂时停用所有第三方插件，确保基础功能正常使用，但不会删除插件。如需恢复正常模式，可尝试卸载近期安装的插件后重启。')
    expect(model.summary).toContain('确保基础功能正常使用')
    expect(model.summary).toContain('但不会删除插件')
    expect(model.plugins).toEqual(['plugin-a', '@example/plugin-b'])
    expect(model.pluginItems).toEqual([
      { name: 'plugin-a', actionLabel: '卸载插件', incompatible: false, suspected: false },
      { name: '@example/plugin-b', actionLabel: '卸载插件', incompatible: false, suspected: false }
    ])
    expect(model.safetyNote).toBe('工作区、会话、模型配置和未选中的插件不会被删除。')
  })

  it('provides complete English labels for every Safe Mode action', () => {
    const model = buildSafeModeViewModel({ locale: 'en', plugins: ['plugin-a'] })
    expect(model).toMatchObject({
      badge: 'Safe Mode',
      heading: '',
      selectionHint: 'Select plugins to remove',
      applyLabel: 'Remove selected plugins',
      agentLabel: 'Close',
      restartLabel: 'Exit Safe Mode and restart',
      quitLabel: 'Quit DSH Desktop'
    })
  })

  it('merges incompatible version findings into one removable root plugin row', () => {
    const model = buildSafeModeViewModel({
      locale: 'zh',
      plugins: ['dsh-dream-skin'],
      issues: [{
        id: 'missing-client-module:dsh-dream-skin:runtime',
        kind: 'missing-client-module',
        severity: 'blocking',
        packageName: 'dsh-dream-skin',
        installedVersion: '0.4.14',
        source: 'dsh-dream-skin/lib/client.js',
        detail: '缺少客户端模块。',
        resolution: 'disable-plugin',
        target: 'dsh-dream-skin',
        groupId: 'plugin:dsh-dream-skin',
        groupName: 'dsh-dream-skin',
        groupKind: 'plugin'
      }, {
        id: 'missing-client-module:dsh-dream-skin:dependency',
        kind: 'missing-client-module',
        severity: 'blocking',
        packageName: 'dream-skin-dependency',
        source: 'dsh-dream-skin dependency tree',
        detail: '依赖缺少客户端模块。',
        resolution: 'disable-plugin',
        target: 'dsh-dream-skin',
        groupId: 'plugin:dsh-dream-skin',
        groupName: 'dsh-dream-skin',
        groupKind: 'plugin'
      }]
    })
    expect(model.plugins).toEqual(['dsh-dream-skin'])
    expect(model.pluginItems[0]).toEqual({
      name: 'dsh-dream-skin',
      statusLabel: '（版本不兼容）',
      statusTone: 'danger',
      actionLabel: '卸载插件',
      incompatible: true,
      suspected: false
    })
    expect(model.issueGroups).toEqual([])
    expect(model.restartLabel).toBe('退出安全模式并重启')
    expect(model.restartConfirm).toContain('仍有 1 组阻断问题')
  })

  it('keeps non-plugin compatibility repairs in the separate repair area', () => {
    const model = buildSafeModeViewModel({
      locale: 'zh',
      plugins: ['plugin-a'],
      issues: [{
        id: 'core-version-mismatch:@deepseek-ai/example',
        kind: 'core-version-mismatch',
        severity: 'blocking',
        packageName: '@deepseek-ai/example',
        installedVersion: '1.0.0',
        expectedVersion: '2.0.0',
        source: 'Profile node_modules',
        detail: '版本冲突。',
        resolution: 'rebuild-profile',
        target: '@deepseek-ai/example',
        groupId: 'profile:core-dependencies',
        groupKind: 'profile'
      }]
    })
    expect(model.pluginItems).toEqual([
      { name: 'plugin-a', actionLabel: '卸载插件', incompatible: false, suspected: false }
    ])
    expect(model.issueGroups[0]).toMatchObject({
      name: 'Profile',
      kindLabel: 'Profile',
      issueIds: ['core-version-mismatch:@deepseek-ai/example']
    })
  })

  it('marks successful removal notices for green presentation', () => {
    const model = buildSafeModeViewModel({
      locale: 'zh',
      plugins: ['plugin-a'],
      notice: '成功卸载 1 个插件。',
      noticeTone: 'success'
    })
    expect(model.notice).toBe('成功卸载 1 个插件。')
    expect(model.noticeTone).toBe('success')
  })

  it('shows every removal generation as a separate backup and blocks cleanup until a healthy boot', () => {
    const model = buildSafeModeViewModel({
      locale: 'zh',
      plugins: [],
      backups: [{
        removalId: 'removal-1',
        pluginName: 'paid-plugin',
        backupDirectory: '/recovery/removal-1',
        disabledAt: '2026-08-29T13:00:00.000Z',
        status: 'removed',
        integrity: 'verified',
        canRestore: true,
        generationIds: ['paid-plugin+1.0.0+abc']
      }, {
        removalId: 'removal-2',
        pluginName: 'paid-plugin',
        backupDirectory: '/recovery/removal-2',
        disabledAt: '2026-08-29T14:00:00.000Z',
        bootVerifiedAt: '2026-08-29T14:10:00.000Z',
        status: 'removed',
        integrity: 'verified',
        canRestore: true,
        generationIds: ['paid-plugin+2.0.0+def']
      }]
    })
    expect(model.backupItems).toHaveLength(2)
    expect(model.backupItems.map((entry) => entry.removalId)).toEqual(['removal-1', 'removal-2'])
    expect(model.backupItems[0]?.cleanupReady).toBe(false)
    expect(model.backupItems[0]?.restoreReady).toBe(true)
    expect(model.backupItems[1]?.cleanupReady).toBe(true)
    expect(model.backupSummary).toContain('不会按启动次数自动删除')
  })

  it('locks every mutating recovery action while migration rollback is incomplete', () => {
    const model = buildSafeModeViewModel({
      locale: 'zh',
      plugins: ['plugin-a'],
      recoveryLocked: true,
      backups: [{
        removalId: 'locked-backup',
        pluginName: 'plugin-a',
        backupDirectory: '/recovery/locked-backup',
        disabledAt: '2026-08-29T14:00:00.000Z',
        bootVerifiedAt: '2026-08-29T14:10:00.000Z',
        status: 'removed',
        integrity: 'verified',
        canRestore: true
      }]
    })
    expect(model.recoveryLocked).toBe(true)
    expect(model.backupItems[0]).toMatchObject({ cleanupReady: false, restoreReady: false })
    expect(model.backupSummary).toContain('不能修复、卸载或删除')
  })

  it('allows only the matching backup retry for an incomplete plugin restore', () => {
    const model = buildSafeModeViewModel({
      locale: 'zh',
      plugins: [],
      recoveryLocked: true,
      backupRestoreLocked: true,
      allowedRestoreId: 'retry-this',
      backups: [{
        removalId: 'retry-this',
        pluginName: 'plugin-a',
        backupDirectory: '/recovery/retry-this',
        disabledAt: '2026-08-29T14:00:00.000Z',
        restoreStartedAt: '2026-08-29T14:05:00.000Z',
        restoreFailure: 'projection failed',
        status: 'removed',
        integrity: 'verified',
        canRestore: true
      }, {
        removalId: 'not-this-one',
        pluginName: 'plugin-b',
        backupDirectory: '/recovery/not-this-one',
        disabledAt: '2026-08-29T13:00:00.000Z',
        status: 'removed',
        integrity: 'verified',
        canRestore: true
      }]
    })
    expect(model.backupItems[0]).toMatchObject({ restoreReady: true, cleanupReady: false })
    expect(model.backupItems[0]?.statusLabel).toContain('上次恢复未完成')
    expect(model.backupItems[1]?.restoreReady).toBe(false)
    expect(model.backupSummary).toContain('只允许重试')
  })

  it('puts harness-log suspects first and marks them without preselecting removal', () => {
    const model = buildSafeModeViewModel({
      locale: 'zh',
      plugins: ['plugin-a', 'plugin-b'],
      suspectedPlugins: ['plugin-b']
    })
    expect(model.plugins).toEqual(['plugin-b', 'plugin-a'])
    expect(model.pluginItems[0]).toEqual({
      name: 'plugin-b',
      statusLabel: '（本次启动日志推断）',
      statusTone: 'warning',
      actionLabel: '卸载插件',
      incompatible: false,
      suspected: true
    })
  })

  it('ships a selectable management page with no remote content', async () => {
    const html = await readFile('build/safe-mode.html', 'utf8')
    expect(html).toContain('id="items"')
    expect(html).toContain('type = \'checkbox\'')
    expect(html).toContain("window.dshSafeMode.action('apply', { plugins, issues })")
    expect(html).toContain('model.issueGroups')
    expect(html).toContain('model.pluginItems')
    expect(html).toContain('plugin.statusLabel')
    expect(html).toContain("plugin.statusTone === 'warning'")
    expect(html.match(/<section class="list-card"/g)).toHaveLength(1)
    expect(html).toContain('checkbox.dataset.issueIds')
    expect(html).toContain("document.createElement('details')")
    expect(html).toContain("window.dshSafeMode.action('agent', {})")
    expect(html).not.toContain('id="backup-card"')
    expect(html).not.toContain("window.dshSafeMode.action('backup-open'")
    expect(html).not.toContain("window.dshSafeMode.action('backup-restore'")
    expect(html).not.toContain("window.dshSafeMode.action('backup-delete'")
    expect(html).toContain('id="recovery-open"')
    expect(html).toContain('class="close" id="agent"')
    expect(html).toContain('class="button primary" id="restart"')
    expect(html).toContain('class="actions"')
    expect(html).toContain('id="apply"')
    expect(html).not.toContain('id="repair"')
    expect(html).not.toContain('id="uninstall"')
    expect(html).not.toContain('class="exit-panel"')
    expect(html).not.toContain('id="exit-heading"')
    expect(html).toContain('window.confirm(String(model.restartConfirm))')
    expect(html).toContain('background: rgba(18,18,20,.28)')
    expect(html).toContain("model.noticeTone === 'success'")
    expect(html).toContain("default-src 'none'")
    expect(html).not.toContain('http://')
    expect(html).not.toContain('https://')
  })

  it('wires Safe Mode into startup, IPC, and the packaged resources', async () => {
    const [main, preload, manifest] = await Promise.all([
      readFile('src/main/index.ts', 'utf8'),
      readFile('src/preload/index.ts', 'utf8'),
      readFile('package.json', 'utf8')
    ])
    expect(main).toContain('shouldStartInSafeMode(process.argv)')
    expect(main).toContain('ensureSafeModeProfile(dshHome)')
    expect(main).toContain('runtime.start(launchDirectory, SAFE_MODE_PROFILE)')
    expect(main).toContain('inspectMigrationRecoveryLock(dshHome)')
    expect(main).toContain('let recoveryLocked = await refreshMigrationRecoveryLock(dshHome)')
    expect(main.match(/refreshMigrationRecoveryLock\(dshHome\)/g)?.length ?? 0)
      .toBeGreaterThanOrEqual(7)
    expect(main).toContain("ipcMain.handle('safe-mode:action'")
    expect(main).toContain("action !== 'backup-open'")
    expect(main).toContain("action !== 'backup-restore'")
    expect(main).toContain("action !== 'backup-delete'")
    expect(main).toContain('cleanupVerifiedRemovalBackup(')
    expect(main).toContain('restorePluginRemovalBackup(')
    expect(main).toContain('snapshotPluginRemovalLedger(dshHome)')
    expect(main).toContain('canRetryLockedPluginRestore(dshHome, action.removalId)')
    expect(main.indexOf('removalBackups = await snapshotPluginRemovalLedger(dshHome)'))
      .toBeLessThan(main.indexOf('pendingRemovals = await listPendingPluginRemovals(dshHome)'))
    expect(main).toContain("ipcMain.handle('harness:renderer-healthy'")
    expect(main).toContain('confirmMigration(dshHome, (line) => runtime.note(line), healthy)')
    expect(main).toContain('inspectProfileCompatibility(')
    expect(main).toContain('repairSafeModeCompatibilityIssues(')
    expect(main).toContain('reconcileLegacyProfile: async () =>')
    expect(main).toContain('rebuilding the web profile after removing')
    expect(main).toContain('normal mode remains blocked by')
    expect(main).toContain('[safe-mode] user exited with')
    expect(main).toContain("ipcMain.handle('safe-mode:manage'")
    expect(main).toContain("ipcMain.handle('safe-mode:exit', async")
    expect(main).toContain("return { ok: false, blocked: true }")
    expect(main).toContain('safeModeManagerWindow')
    expect(main).toContain('safeModeSuspectedPlugins = [...new Set(detection.plugins)]')
    expect(main).toContain('modal: true')
    expect(main).toContain('assertTrustedSafeModeManagerEvent(event)')
    expect(main).toContain('`处理完成：修复 ${repaired} 项，卸载 ${selectedPlugins.length} 个插件。`')
    expect(main).toContain("label: isChinese ? '以安全模式重启…' : 'Restart as Safe Mode…'")
    expect(main).toContain("return { active: safeModeVisible, locale: harnessLocale() }")
    expect(preload).toContain("safeModeLocale === 'zh' ? '安全模式' : 'Safe Mode'")
    expect(preload).toContain("safeModeLocale === 'zh' ? '卸载插件' : 'Remove plugins'")
    expect(preload).toContain("safeModeLocale === 'zh' ? '退出安全模式' : 'Exit Safe Mode'")
    expect(preload).toContain("safeModeLocale === 'zh'")
    expect(preload).toContain("ipcRenderer.invoke('safe-mode:action', action, selection)")
    expect(preload).toContain("ipcRenderer.invoke('harness:renderer-healthy')")
    expect(preload).toContain('RENDERER_HEALTH_HEARTBEAT_MS')
    expect(main).toContain('PROFILE_BOOT_STABILITY_MS = 60_000')
    expect(main).toContain('clearProfileBootConfirmation()')
    expect(main).toContain('reportProfileConsistency: () => reportProfileConsistency(dshHome)')
    expect(main).not.toContain('repairProfilePackages:')
    expect(main).not.toContain('pruneMissingProfileBundles:')
    expect(JSON.parse(manifest).build.extraResources).toContainEqual({
      from: 'build/safe-mode.html',
      to: 'safe-mode.html'
    })
  })

  it('creates a managed core-only profile and repairs later modifications', async () => {
    const dshHome = join(__dirname, '.temp-safe-mode-profile')
    try {
      const directory = await ensureSafeModeProfile(dshHome)
      expect(directory).toBe(join(dshHome, 'profiles', SAFE_MODE_PROFILE))
      const manifestPath = join(directory, 'package.json')
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
      expect(manifest.dependencies).toEqual({})
      expect(manifest.dsh.profile.bundles).toEqual(SAFE_MODE_BUNDLES)
      expect(await readFile(join(directory, 'cordis.patch.yml'), 'utf8')).toContain('[]')

      manifest.dependencies['third-party-plugin'] = '1.0.0'
      manifest.dsh.profile.bundles.push('third-party-plugin')
      await writeFile(manifestPath, JSON.stringify(manifest))
      await ensureSafeModeProfile(dshHome)
      const repaired = JSON.parse(await readFile(manifestPath, 'utf8'))
      expect(repaired.dependencies).toEqual({})
      expect(repaired.dsh.profile.bundles).toEqual(SAFE_MODE_BUNDLES)
    } finally {
      await rm(dshHome, { recursive: true, force: true })
    }
  })

  it('enriches plugin items with health reports and upgrade candidates', () => {
    const model = buildSafeModeViewModel({
      locale: 'zh',
      plugins: ['plugin-a', 'plugin-b'],
      healthReports: [
        {
          packageName: 'plugin-a',
          installedVersion: '1.0.0',
          latestVersion: '2.0.0',
          healthStatus: 'incompatible-fixed-in-latest',
          healthLabel: '不兼容（最新版 v2.0.0 已适配）',
          upgradeReady: true,
          upgradeVersion: '2.0.0'
        },
        {
          packageName: 'plugin-b',
          installedVersion: '1.2.0',
          latestVersion: '1.2.0',
          healthStatus: 'up-to-date',
          healthLabel: '已是最新版',
          upgradeReady: false
        }
      ]
    })
    expect(model.upgradeReadyCount).toBe(1)
    expect(model.upgradeAllLabel).toBe('一键升级 1 个已适配插件')
    const itemA = model.pluginItems.find((p) => p.name === 'plugin-a')
    expect(itemA?.upgradeReady).toBe(true)
    expect(itemA?.upgradeVersion).toBe('2.0.0')
    expect(itemA?.upgradeButtonLabel).toBe('升级至 v2.0.0')
    const itemB = model.pluginItems.find((p) => p.name === 'plugin-b')
    expect(itemB?.upgradeReady).toBe(false)
    expect(itemB?.upgradeButtonLabel).toBeUndefined()
  })
})
