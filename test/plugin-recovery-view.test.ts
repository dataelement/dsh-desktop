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
  it('offers one-click repair and rollback together for a known cause', () => {
    const model = buildPluginRecoveryViewModel({ snapshot: failedSnapshot(), plugins: ['a'], removedPlugins: [], locale: 'zh', rollbackVersion: '0.12.0',
      upgradeCandidate: { packageName: 'a', targetVersion: '2' } })
    expect(model.heading).toContain('无法正常启动')
    expect(model.summary).toContain('同意方案')
    expect(model.repairDetails).toContain('升级插件 a 至 2')
    expect(model.canRepair).toBe(true)
    expect(model.primaryLabel).toBe('一键修复')
    expect(model.rollbackLabel).toContain('0.12.0')
    expect(model.roundAction).toContain('升级')
    expect(model.canUninstall).toBe(false)
    expect(model.progress).toBeUndefined()
  })
  it('keeps a visible rollback option disabled with a nearby explanation when unavailable', () => {
    const model = buildPluginRecoveryViewModel({ snapshot: failedSnapshot(), plugins: ['a'], removedPlugins: [], locale: 'zh' })
    expect(model.rollbackVisible).toBe(true)
    expect(model.rollbackLabel).toBeUndefined()
    expect(model.rollbackUnavailableReason).toContain('没有可回退')
    expect(model.repairDetails).toContain('停用插件 a（保留插件文件和数据）')
  })
  it('provides an English repair plan without technical Profile terminology', () => {
    const model = buildPluginRecoveryViewModel({ snapshot: failedSnapshot(), plugins: [], removedPlugins: [], locale: 'en', repairPlan: { kind: 'known', action: 'configuration', plugins: [], upgrades: [] } })
    expect(model.repairDetailsLabel).toBe('View repair plan')
    expect(model.repairDetails?.join(' ')).not.toMatch(/profile/i)
    expect(model.summary).toContain('Review it below')
  })
  it('only offers Safe Mode Agent for an unknown cause even if rollback exists', () => {
    const model = buildPluginRecoveryViewModel({ snapshot: failedSnapshot(), plugins: [], removedPlugins: [], locale: 'en', rollbackVersion: '0.12.0' })
    expect(model.safeModeOnly).toBe(true)
    expect(model.canRepair).toBe(false)
    expect(model.rollbackLabel).toBeUndefined()
    expect(model.primaryLabel).toBe('Ask Agent to help')
    expect(model.summary).toContain('Safe Mode')
  })
  it('keeps rollback available when known one-click rounds are exhausted', () => {
    const model = buildPluginRecoveryViewModel({ snapshot: failedSnapshot(), plugins: ['a'], removedPlugins: [], locale: 'zh', rollbackVersion: '0.12.0', repairPlan: { kind: 'known', plugins: [], upgrades: [] } })
    expect(model.canRepair).toBe(false)
    expect(model.rollbackLabel).toContain('0.12.0')
  })
  it('describes reversible disable instead of uninstall when no upgrade is available', () => {
    const model = buildPluginRecoveryViewModel({ snapshot: failedSnapshot(), plugins: ['a'], removedPlugins: [], locale: 'zh' })
    expect(model.roundAction).toContain('停用')
    expect(model.primaryLabel).toBe('一键修复')
    expect(model.uninstallLabel).toBeUndefined()
  })
  it.each(['upgrade', 'disable', 'configuration'] as const)('keeps Agent hidden while a known %s repair remains after a failed round', action => {
    const model = buildPluginRecoveryViewModel({
      snapshot: failedSnapshot(), plugins: ['a'], removedPlugins: [], locale: 'zh',
      rollbackVersion: '0.12.0', repairAttempted: true,
      repairPlan: { kind: 'known', action, plugins: ['a'], upgrades: [] }
    })
    expect(model.canRepair).toBe(true)
    expect(model.primaryLabel).toBe('一键修复')
    expect(model.offerRepairAgent).toBe(false)
    expect(model.notice).toContain('请选择下一步')
    expect(model.rollbackLabel).toContain('0.12.0')
    expect(model.safeModeOnly).toBe(false)
  })
  it('leaves exhausted repairs as a user choice between Agent and available rollback', () => {
    const model = buildPluginRecoveryViewModel({
      snapshot: failedSnapshot(), plugins: [], removedPlugins: [], locale: 'en',
      rollbackVersion: '0.12.0', repairAttempted: true,
      repairPlan: { kind: 'known', plugins: [], upgrades: [] }
    })
    expect(model.canRepair).toBe(false)
    expect(model.offerRepairAgent).toBe(false)
    expect(model.primaryLabel).toBe('Ask Agent to help')
    expect(model.rollbackLabel).toContain('0.12.0')
    expect(model.safeModeOnly).toBe(false)
    expect(model.notice).toContain('Choose what to do next')
  })
  it('preserves operation-specific failure notices and does not show an extra Agent before repair', () => {
    const model = buildPluginRecoveryViewModel({
      snapshot: failedSnapshot(), plugins: ['a'], removedPlugins: [], locale: 'en', notice: 'Repair could not be applied.'
    })
    expect(model.offerRepairAgent).toBe(false)
    expect(model.notice).toBe('Repair could not be applied.')
  })
  it('labels simulated rollback without changing the target version', () => {
    const model = buildPluginRecoveryViewModel({
      snapshot: failedSnapshot(), plugins: ['a'], removedPlugins: [], locale: 'zh',
      rollbackVersion: '0.12.0', rollbackSimulation: true
    })
    expect(model.rollbackLabel).toBe('回退应用至 0.12.0（模拟）')
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
    ['failed to apply loader entry example', '插件代码加载失败'],
    ['duplicate loader entry id: storage', '插件注册了重复的服务组件'],
    ['duplicate loader entry id: dsh-image-generation', '插件注册了重复的服务组件'],
    ['duplicate loader entry id: another-host-plugin', '插件注册了重复的服务组件'],
    ['single slot "conversation.hero.workspace.directoryFlow" already has a registration at priority 0', '插件存在界面插槽冲突']
  ])('describes known startup failures: %s', (log, expectedTitle) => {
    expect(describePluginFailure([`[stderr] ${log}`], 'zh').title).toBe(expectedTitle)
  })

})
