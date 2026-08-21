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
    expect(model.restartLabel).toBe('重启 Harness')
    expect(model.restartBusyLabel).toBe('正在重启…')
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

  it('falls back to resetting harness data when no plugin can be identified', () => {
    const model = buildPluginRecoveryViewModel({
      snapshot: failedSnapshot(),
      plugins: [],
      removedPlugins: [],
      locale: 'en'
    })
    expect(model.canUninstall).toBe(false)
    expect(model.canResetData).toBe(true)
    expect(model.primaryLabel).toBe('Reset Harness data')
    expect(model.primaryBusyLabel).toBe('Backing up and resetting…')
    expect(model.resetLabel).toBe('Reset Harness data')
    expect(model.resetDetail).toContain('Back up')
    expect(model.resetSafetyNote).toContain('Backs up')
    expect(model.logLabel).toBe('Open Harness log')
    expect(model.restartLabel).toBe('Restart Harness')
    expect(model.restartBusyLabel).toBe('Restarting…')
  })

  it('hides the reset option when a removable plugin is identified', () => {
    const model = buildPluginRecoveryViewModel({
      snapshot: failedSnapshot(),
      plugins: ['some-bad-plugin'],
      removedPlugins: [],
      locale: 'en'
    })
    expect(model.canUninstall).toBe(true)
    expect(model.canResetData).toBe(false)
    expect(model.primaryLabel).toBe('Remove this plugin and continue')
  })
})
