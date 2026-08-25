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

  it('explains that plugins are blocked before offering removal', () => {
    const model = buildSafeModeViewModel({
      locale: 'zh',
      plugins: ['plugin-a', '@example/plugin-b', 'plugin-a']
    })
    expect(model.badge).toBe('安全模式')
    expect(model.heading).toBe('')
    expect(model.summary).toContain('暂时停用所有第三方插件')
    expect(model.summary).toContain('确保基础功能正常使用')
    expect(model.summary).toContain('但不会删除插件')
    expect(model.summary).toContain('如需恢复正常模式')
    expect(model.plugins).toEqual(['plugin-a', '@example/plugin-b'])
    expect(model.safetyNote).toContain('未选中的插件不会被删除')
  })

  it('provides complete English labels for every Safe Mode action', () => {
    const model = buildSafeModeViewModel({ locale: 'en', plugins: ['plugin-a'] })
    expect(model).toMatchObject({
      badge: 'Safe Mode',
      heading: '',
      selectionHint: 'Select plugins to remove',
      uninstallLabel: 'Remove selected plugins',
      agentLabel: 'Close',
      restartLabel: 'Exit Safe Mode and restart',
      quitLabel: 'Quit DSH Desktop'
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
    expect(html).toContain('type = \'checkbox\'')
    expect(html).toContain("window.dshSafeMode.action('uninstall', plugins)")
    expect(html).toContain("window.dshSafeMode.action('agent', [])")
    expect(html).toContain('class="close" id="agent"')
    expect(html).toContain('class="button primary" id="restart"')
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
    expect(main).toContain("ipcMain.handle('safe-mode:manage'")
    expect(main).toContain('safeModeManagerWindow')
    expect(main).toContain('modal: true')
    expect(main).toContain('assertTrustedSafeModeManagerEvent(event)')
    expect(main).toContain('`成功卸载 ${selected.length} 个插件。`')
    expect(main).toContain("label: isChinese ? '以安全模式重启…' : 'Restart as Safe Mode…'")
    expect(main).toContain("return { active: safeModeVisible, locale: harnessLocale() }")
    expect(preload).toContain("safeModeLocale === 'zh' ? '安全模式' : 'Safe Mode'")
    expect(preload).toContain("safeModeLocale === 'zh' ? '卸载插件' : 'Remove plugins'")
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
