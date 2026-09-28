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

  it('marks plugins as still being checked until the market check answers', () => {
    const pending = buildSafeModeViewModel({ locale: 'zh', plugins: ['dsh-a', 'dsh-b'], disabledPlugins: ['dsh-b'], healthPending: true })
    expect(pending.pluginItems[0]?.statusLabel).toBe('（正在检查更新…）')
    expect(pending.pluginItems[1]?.statusLabel).toBe('（已停用）')
    expect(pending.upgradeReadyCount).toBe(0)
    const answered = buildSafeModeViewModel({
      locale: 'zh', plugins: ['dsh-a'], healthPending: true,
      healthReports: [{ packageName: 'dsh-a', installedVersion: '1.0.0', latestVersion: '1.1.0', healthStatus: 'upgrade-available', healthLabel: '有更新', upgradeReady: true, upgradeVersion: '1.1.0' }]
    })
    expect(answered.pluginItems[0]?.statusLabel).toBe('（有更新）')
    expect(answered.pluginItems[0]?.upgradeButtonLabel).toBe('升级至 v1.1.0')
  })

  it('treats installed Profile plugins uniformly as Safe Mode targets', () => {
    const model = buildSafeModeViewModel({
      locale: 'zh', plugins: ['dsh-image-generation'],
      suspectedPlugins: ['dsh-image-generation'], healthPending: true
    })
    expect(model.pluginItems[0]).toMatchObject({
      name: 'dsh-image-generation', suspected: true,
      statusLabel: '（本次启动日志推断，正在检查更新…）',
      actionLabel: '停用插件（不删除）'
    })
    const disabled = buildSafeModeViewModel({
      locale: 'en', plugins: ['dsh-image-generation'], disabledPlugins: ['dsh-image-generation']
    })
    expect(disabled.pluginItems[0]).toMatchObject({
      disabled: true, enableButtonLabel: 'Re-enable'
    })
  })

  it('shows static references as informational findings without blocking or selecting a repair', () => {
    const model = buildSafeModeViewModel({
      locale: 'zh', plugins: ['dsh-dream-skin'], issues: [{
        id: 'static:legacy', kind: 'unverified-module-reference', severity: 'warning',
        packageName: 'dsh-dream-skin', source: 'lib/client.js',
        detail: 'Legacy compatibility fallback', resolution: 'inspect-only',
        target: 'dsh-dream-skin', groupId: 'plugin:dsh-dream-skin',
        groupName: 'dsh-dream-skin', groupKind: 'plugin'
      }]
    })
    expect(model.restartConfirm).toBeUndefined()
    expect(model.pluginItems[0]?.incompatible).toBe(false)
    expect(model.issueGroups[0]).toMatchObject({
      name: 'dsh-dream-skin', severityLabel: '警告', issueIds: [],
      actionLabel: '仅提示；运行正常时无需处理'
    })
    expect(model.issueGroups[0]?.issues[0]?.kindLabel).toBe('兼容性待确认')
  })

  it('explains isolation and presents plugin leftovers in one cleanup plan', () => {
    const model = buildSafeModeViewModel({
      locale: 'zh',
      plugins: ['plugin-a', '@example/plugin-b', 'plugin-a']
    })
    expect(model.badge).toBe('安全模式')
    expect(model.heading).toBe('')
    expect(model.summary).toBe('安全模式暂时跳过第三方插件。停用有问题的插件后重启；插件和数据都会保留。')
    expect(model.plugins).toEqual(['plugin-a', '@example/plugin-b'])
    expect(model.pluginItems).toEqual([
      { name: 'plugin-a', actionLabel: '停用插件（不删除）', incompatible: false, suspected: false, disabled: false },
      { name: '@example/plugin-b', actionLabel: '停用插件（不删除）', incompatible: false, suspected: false, disabled: false }
    ])
    expect(model.safetyNote).toBe('停用不会删除任何内容：插件、工作区、会话和模型配置都会保留，可在这里或插件市场中重新启用。')
  })

  it('provides complete English labels for every Safe Mode action', () => {
    const model = buildSafeModeViewModel({ locale: 'en', plugins: ['plugin-a'] })
    expect(model).toMatchObject({
      badge: 'Safe Mode',
      heading: '',
      selectionHint: 'Select plugins to disable',
      applyLabel: 'Disable selected plugins',
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
      actionLabel: '停用插件（不删除）',
      incompatible: true,
      suspected: false,
      disabled: false
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
      { name: 'plugin-a', actionLabel: '停用插件（不删除）', incompatible: false, suspected: false, disabled: false }
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

  it('keeps long startup diagnostics available behind a short notice in both locales', () => {
    const cause = 'peerDependencies: ' + '@deepseek-ai/dsh-client-runtime@0.1.0-rc.8 | '.repeat(20)
    const enNotice = `Normal Profile startup checks failed. Safe Mode is available. ${cause}`
    const en = buildSafeModeViewModel({ locale: 'en', plugins: ['example'], notice: enNotice, noticeTone: 'error' })
    expect(en.noticeSummary).toBe('Normal Profile startup checks failed.')
    expect(en.notice).toBe(enNotice)
    const zhNotice = `正常 Profile 启动检查未通过。已进入安全模式。${cause}`
    const zh = buildSafeModeViewModel({ locale: 'zh', plugins: ['example'], notice: zhNotice, noticeTone: 'error' })
    expect(zh.noticeSummary).toBe('正常 Profile 启动检查未通过。')
    expect(zh.notice).toBe(zhNotice)
    expect(buildSafeModeViewModel({ locale: 'en', plugins: [], notice: 'Short error.' }).noticeSummary).toBeUndefined()
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
      actionLabel: '停用插件（不删除）',
      incompatible: false,
      suspected: true,
      disabled: false
    })
  })

  it('shows a disabled plugin as off with a re-enable action instead of a selection', () => {
    const model = buildSafeModeViewModel({ locale: 'zh', plugins: ['plugin-a', 'plugin-b'], disabledPlugins: ['plugin-b'] })
    expect(model.pluginItems[1]).toEqual({
      name: 'plugin-b',
      statusLabel: '（已停用）',
      actionLabel: '已停用，退出安全模式后也不会加载',
      incompatible: false,
      suspected: false,
      disabled: true,
      enableButtonLabel: '重新启用'
    })
    expect(model.pluginItems[0]).toMatchObject({ name: 'plugin-a', disabled: false })
    expect(model.pluginItems[0]).not.toHaveProperty('enableButtonLabel')
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
      suspectedPlugins: ['plugin-a'],
      healthReports: [
        {
          packageName: 'plugin-a',
          installedVersion: '1.0.0',
          latestVersion: '2.0.0',
          healthStatus: 'incompatible-upgrade-available',
          healthLabel: '未找到兼容更新，可尝试 latest v2.0.0（兼容性未确认）',
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
    expect(model.upgradeAllLabel).toBe('一键升级 1 个有更新的插件')
    const itemA = model.pluginItems.find((p) => p.name === 'plugin-a')
    expect(itemA?.upgradeReady).toBe(true)
    expect(itemA?.statusLabel).toContain('兼容性未确认')
    expect(itemA?.upgradeVersion).toBe('2.0.0')
    expect(itemA?.upgradeButtonLabel).toBe('升级至 v2.0.0')
    const itemB = model.pluginItems.find((p) => p.name === 'plugin-b')
    expect(itemB?.upgradeReady).toBe(false)
    expect(itemB?.upgradeButtonLabel).toBeUndefined()
  })
})
