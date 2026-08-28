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

  it('explains isolation and separates plugin removal from other compatibility repair', () => {
    const model = buildSafeModeViewModel({
      locale: 'zh',
      plugins: ['plugin-a', '@example/plugin-b', 'plugin-a']
    })
    expect(model.badge).toBe('安全模式')
    expect(model.heading).toBe('')
    expect(model.summary).toContain('暂时停用所有第三方插件')
    expect(model.summary).toContain('确保基础功能正常使用')
    expect(model.summary).toContain('但不会删除插件')
    expect(model.summary).toContain('检查核心版本、客户端模块和 Workspace 依赖')
    expect(model.summary).toContain('版本不兼容的插件会在卸载列表中标记')
    expect(model.summary).toContain('其他兼容性修复会先备份')
    expect(model.plugins).toEqual(['plugin-a', '@example/plugin-b'])
    expect(model.pluginItems).toEqual([
      { name: 'plugin-a', incompatible: false },
      { name: '@example/plugin-b', incompatible: false }
    ])
    expect(model.safetyNote).toContain('未选中的插件不会被删除')
  })

  it('provides complete English labels for every Safe Mode action', () => {
    const model = buildSafeModeViewModel({ locale: 'en', plugins: ['plugin-a'] })
    expect(model).toMatchObject({
      badge: 'Safe Mode',
      heading: '',
      selectionHint: 'Plugin removal',
      issueHeading: 'Other compatibility repairs',
      repairLabel: 'Repair selected issues',
      uninstallLabel: 'Remove selected plugins',
      agentLabel: 'Close',
      restartLabel: 'Finish and exit Safe Mode',
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
      incompatible: true
    })
    expect(model.issueGroups).toEqual([])
    expect(model.restartLabel).toBe('暂不处理并退出安全模式')
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
      { name: 'plugin-a', incompatible: false }
    ])
    expect(model.issueGroups[0]).toMatchObject({
      name: 'Profile 核心依赖',
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

  it('ships a selectable management page with no remote content', async () => {
    const html = await readFile('build/safe-mode.html', 'utf8')
    expect(html).toContain('id="plugins"')
    expect(html).toContain('id="issues"')
    expect(html).toContain('type = \'checkbox\'')
    expect(html).toContain("window.dshSafeMode.action('uninstall', plugins)")
    expect(html).toContain("window.dshSafeMode.action('repair', issues)")
    expect(html).toContain('model.issueGroups')
    expect(html).toContain('model.pluginItems')
    expect(html).toContain('plugin.statusLabel')
    expect(html).toContain('compatibilitySection.hidden = true')
    expect(html.match(/<section class="list-card"/g)).toHaveLength(1)
    expect(html).toContain('checkbox.dataset.issueIds')
    expect(html).toContain("document.createElement('details')")
    expect(html).toContain("window.dshSafeMode.action('agent', [])")
    expect(html).toContain('class="close" id="agent"')
    expect(html).toContain('class="button primary" id="restart"')
    expect(html.indexOf('id="uninstall"')).toBeLessThan(html.indexOf('id="repair"'))
    expect(html).toContain('id="exit-heading"')
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
    expect(main).toContain("ipcMain.handle('safe-mode:action'")
    expect(main).toContain('inspectProfileCompatibility(')
    expect(main).toContain('repairSafeModeCompatibilityIssues(')
    expect(main).toContain('[safe-mode] user exited with')
    expect(main).toContain("ipcMain.handle('safe-mode:manage'")
    expect(main).toContain("ipcMain.handle('safe-mode:exit', async")
    expect(main).toContain("return { ok: false, blocked: true }")
    expect(main).toContain('safeModeManagerWindow')
    expect(main).toContain('modal: true')
    expect(main).toContain('assertTrustedSafeModeManagerEvent(event)')
    expect(main).toContain('`成功卸载 ${selected.length} 个插件。`')
    expect(main).toContain("label: isChinese ? '以安全模式重启…' : 'Restart as Safe Mode…'")
    expect(main).toContain("return { active: safeModeVisible, locale: harnessLocale() }")
    expect(preload).toContain("safeModeLocale === 'zh' ? '安全模式' : 'Safe Mode'")
    expect(preload).toContain("safeModeLocale === 'zh' ? '检查兼容性' : 'Check compatibility'")
    expect(preload).toContain("safeModeLocale === 'zh' ? '退出安全模式' : 'Exit Safe Mode'")
    expect(preload).toContain("safeModeLocale === 'zh'")
    expect(preload).toContain("ipcRenderer.invoke('safe-mode:action', action, plugins)")
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
})
