import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import type { RuntimeSnapshot } from '../src/shared/contracts'
import {
  buildPluginRecoveryViewModel,
  describePluginFailure
} from '../src/main/plugin-recovery-view'

function failedSnapshot(logs: string[] = []): RuntimeSnapshot {
  return {
    phase: 'failed',
    message: 'Harness stopped unexpectedly. duplicate prefix route "/sidebar/api"',
    launchDirectory: '/Users/ray/Library/Application Support/dsh-desktop/launch-root',
    logs
  }
}

describe('plugin recovery view model', () => {
  it('offers a retry instead of a zero-action automatic recovery when all checks failed', () => {
    const model = buildPluginRecoveryViewModel({
      snapshot: failedSnapshot(), plugins: ['a', 'b'], removedPlugins: [], locale: 'zh',
      pluginChecks: ['a', 'b'].map(packageName => ({ packageName, hint: 'ENOTFOUND' }))
    })
    expect(model.retryCheckLabel).toBe('重新检查更新')
    expect(model.autoProcessLabel).toBeUndefined()
    expect(model.upgradeCandidate).toBeUndefined()
    expect(model.canUninstall).toBe(true)
  })
  it('keeps automatic processing as primary even when every blocker needs removal', () => {
    const model = buildPluginRecoveryViewModel({
      snapshot: failedSnapshot(), plugins: ['a', 'b'], removedPlugins: [], locale: 'zh',
      pluginChecks: ['a', 'b'].map(packageName => ({ packageName, hint: 'latest still fails', removalRecommended: true }))
    })
    expect(model.autoProcessLabel).toBe('一键自动处理（升级 0，卸载 2）')
  })
  it('shows a mixed automatic recovery plan as the primary action', () => {
    const model = buildPluginRecoveryViewModel({
      snapshot: failedSnapshot(), plugins: ['a', 'b', 'c'], removedPlugins: [], locale: 'zh',
      pluginChecks: [
        { packageName: 'a', hint: 'intermediate', upgradeCandidate: { packageName: 'a', targetVersion: '1.5.0' } },
        { packageName: 'b', hint: 'latest', upgradeCandidate: { packageName: 'b', targetVersion: '2.0.0' } },
        { packageName: 'c', hint: 'remove', removalRecommended: true }
      ]
    })
    expect(model.autoProcessLabel).toBe('一键自动处理（升级 2，卸载 1）')
    expect(model.pluginChecks).toHaveLength(3)
    expect(model.upgradeCandidate).toBeUndefined()
  })
  it('explains a duplicate route without exposing only a raw stack trace', () => {
    const description = describePluginFailure(
      ['[stderr] webserver: duplicate prefix route "/sidebar/api"'],
      'zh'
    )
    expect(description.title).toBe('插件使用了重复的服务入口')
    expect(description.detail).toContain('/sidebar/api')
    expect(description.detail).toContain('启动日志显示')
  })

  it('uses an honest generic explanation when the exact cause is unknown', () => {
    const description = describePluginFailure(
      ['[stderr] plugin initialization returned an unexpected error'],
      'zh'
    )
    expect(description.title).toBe('插件启动失败')
    expect(description.detail).toContain('无法自动判断更具体的原因')
    expect(description.detail).not.toContain('/sidebar/api')
  })

  it.each([
    ['cannot resolve profile bundle example', '插件没有完整安装'],
    ['package declares no dsh.bundle', '安装的包不是兼容的 DSH 插件'],
    ['failed to import loader entry example', '插件代码加载失败'],
    ['duplicate loader entry id: storage', '插件注册了重复的服务组件'],
    ['single slot "conversation.hero.workspace.directoryFlow" already has a registration at priority 0', '插件存在界面插槽冲突']
  ])('describes known startup failures: %s', (log, expectedTitle) => {
    expect(describePluginFailure([`[stderr] ${log}`], 'zh').title).toBe(expectedTitle)
  })

  it('presents multiple plugins as one recovery step', () => {
    const model = buildPluginRecoveryViewModel({
      snapshot: failedSnapshot(),
      plugins: ['plugin-a', 'plugin-b', 'plugin-a'],
      removedPlugins: [],
      locale: 'zh'
    })
    expect(model.heading).toBe('发现 2 个导致启动失败的插件')
    expect(model.summary).toBe('')
    expect(model.plugins).toEqual(['plugin-a', 'plugin-b'])
    expect(model.primaryLabel).toBe('卸载这 2 个插件并继续检测')
    expect(model.canUninstall).toBe(true)
    expect(model).not.toHaveProperty('restartLabel')
    expect(model).not.toHaveProperty('status')
    expect(model.advancedLabel).toBe('查看技术详情')
  })

  it('shows progress when recovery discovers another conflict after a restart', () => {
    const model = buildPluginRecoveryViewModel({
      snapshot: failedSnapshot(),
      plugins: ['plugin-b'],
      removedPlugins: ['plugin-a'],
      locale: 'zh'
    })
    expect(model.progress).toContain('已处理 1 个插件')
    expect(model.plugins).toEqual(['plugin-b'])
  })

  it('shows a readable name for a scoped package while recovery keeps its package id', () => {
    const model = buildPluginRecoveryViewModel({
      snapshot: failedSnapshot(),
      plugins: ['@deepseek-harness-tui/dsh-tui'],
      removedPlugins: [],
      locale: 'zh'
    })
    expect(model.plugins).toEqual(['dsh-tui'])
    expect(model.canUninstall).toBe(true)
  })

  it('offers Safe Mode when no plugin can be identified', () => {
    const model = buildPluginRecoveryViewModel({
      snapshot: failedSnapshot(),
      plugins: [],
      removedPlugins: [],
      locale: 'en'
    })
    expect(model.canUninstall).toBe(false)
    expect(model.summary).toContain('Enter Safe Mode')
    expect(model.primaryLabel).toBe('Enter Safe Mode')
    expect(model.primaryBusyLabel).toBe('Entering Safe Mode…')
  })

  it('wires the unresolved recovery action to Safe Mode', async () => {
    const html = await readFile('build/plugin-recovery.html', 'utf8')
    expect(html).toContain("model.canUninstall ? 'uninstall' : 'safe-mode'")
    expect(html).toContain("navigate('show-log')")
    expect(html).not.toContain('id="restart"')
  })

  it.each(['zh', 'en'] as const)('shows the latest fallback explanation instead of claiming compatibility (%s)', (locale) => {
    const upgradeHint = locale === 'zh' ? '未找到匹配版本，可尝试 latest；不保证兼容。' : 'Try latest; compatibility is not guaranteed.'
    const model = buildPluginRecoveryViewModel({
      snapshot: failedSnapshot(), plugins: ['plugin-a'], removedPlugins: [], locale,
      upgradeCandidate: { packageName: 'plugin-a', targetVersion: '2.0.0', upgradeHint }
    })
    expect(model.upgradeHint).toBe(upgradeHint)
    expect(model.upgradeLabel).toBeTruthy()
  })

  it.each(['zh', 'en'] as const)('makes removal the primary action when a latest-version plugin still blocks startup (%s)', (locale) => {
    const notice = locale === 'zh' ? '已是 latest，仍阻挡启动，请卸载此插件。' : 'Already at latest and still blocking startup; remove this plugin.'
    const model = buildPluginRecoveryViewModel({
      snapshot: failedSnapshot(), plugins: ['plugin-a'], removedPlugins: [], locale, notice
    })
    expect(model.notice).toBe(notice)
    expect(model.canUninstall).toBe(true)
    expect(model.upgradeCandidate).toBeUndefined()
    expect(model.primaryLabel).toBe(locale === 'zh' ? '卸载此插件并继续检测' : 'Remove this plugin and continue')
  })

  it('configures upgrade candidate when a compatible update is available', () => {
    const model = buildPluginRecoveryViewModel({
      snapshot: failedSnapshot(),
      plugins: ['plugin-a'],
      removedPlugins: [],
      locale: 'zh',
      upgradeCandidate: {
        packageName: 'plugin-a',
        targetVersion: '2.0.0',
        installedVersion: '1.0.0'
      }
    })
    expect(model.upgradeCandidate?.targetVersion).toBe('2.0.0')
    expect(model.upgradeLabel).toBe('升级插件并重启')
    expect(model.upgradeHint).toBe('该插件有新的兼容版本（v2.0.0）')
    expect(model.uninstallLabel).toBe('卸载插件')
  })
})
