import { describe, expect, it } from 'vitest'
import { checkBlockingPluginUpdates, selectPluginRecoveryTarget, PluginRecoveryEvidence, runPluginRecoveryUpgrades, planPluginRecovery, runPluginRecoveryPlan } from '../src/main/plugin-recovery-market'
import type { ProfileCompatibilityIssue } from '../src/main/state/profile-compatibility'
import type { PluginHealthReport } from '../src/main/state/plugin-market-check'

describe('per-plugin recovery checks', () => {
  it('plans upgrades and removals together while leaving unknown checks untouched', async () => {
    const checks = await checkBlockingPluginUpdates({
      plugins: ['update', 'latest', 'unknown'], attemptedUpgrades: new Map(), locale: 'zh',
      check: async packageName => ({ packageName,
        healthStatus: packageName === 'update' ? 'incompatible-upgrade-available' : packageName === 'latest' ? 'incompatible-no-fix' : 'check-failed',
        healthLabel: packageName, upgradeReady: packageName === 'update',
        upgradeVersion: packageName === 'update' ? '1.5.0' : undefined
      })
    })
    const plan = planPluginRecovery(checks)
    expect(plan.upgrades.map(candidate => candidate.packageName)).toEqual(['update'])
    expect(plan.removals).toEqual(['latest'])
    expect(plan.skipped).toEqual(['unknown'])
    const calls: string[] = []
    const result = await runPluginRecoveryPlan(plan, {
      upgrade: async candidate => { calls.push(`upgrade:${candidate.packageName}@${candidate.targetVersion}`); return { ok: true } },
      remove: async plugin => { calls.push(`remove:${plugin}`); return { removed: true } }
    })
    expect(calls).toEqual(['upgrade:update@1.5.0', 'remove:latest'])
    expect(result.upgrades[0]?.ok).toBe(true)
    expect(result.removals[0]?.removed).toBe(true)
  })

  it('does not turn a failed upgrade into a removal and preserves pending removal outcomes', async () => {
    const removals: string[] = []
    const result = await runPluginRecoveryPlan({ upgrades: [{ packageName: 'a', targetVersion: '2.0.0' }], removals: ['b', 'c'], skipped: [] }, {
      upgrade: async () => { throw new Error('offline') },
      remove: async plugin => {
        removals.push(plugin)
        if (plugin === 'b') return { removed: false, pending: true }
        throw new Error('locked')
      }
    })
    expect(removals).toEqual(['b', 'c'])
    expect(result.upgrades[0]?.ok).toBe(false)
    expect(result.removals).toMatchObject([{ plugin: 'b', removed: false, pending: true }, { plugin: 'c', removed: false, detail: 'locked' }])
  })
  const blocking = (target: string): ProfileCompatibilityIssue => ({
    id: target, kind: 'missing-client-module', severity: 'blocking', packageName: target,
    source: 'fixture', detail: 'missing', resolution: 'disable-plugin', target
  })

  it('does not offer latest for a repaired intermediate version just because another plugin still blocks', async () => {
    const evidence = new PluginRecoveryEvidence()
    const attemptedUpgrades = new Map([['a', '1.5.0']])
    evidence.installed('a')
    evidence.inspect([blocking('b')])
    const checked: string[] = []
    const check = async (packageName: string): Promise<PluginHealthReport> => {
      checked.push(packageName)
      return { packageName, healthStatus: 'incompatible-upgrade-available', healthLabel: 'latest fallback', upgradeReady: true, upgradeVersion: '2.0.0' }
    }
    await checkBlockingPluginUpdates({ plugins: evidence.targets(['a', 'b'], []), attemptedUpgrades, locale: 'zh', check })
    expect(checked).toEqual(['b'])
    // A fresh run can prove that only B still fails. A stays out of recovery.
    evidence.freshLaunch()
    expect(evidence.targets(['b'], [])).toEqual(['b'])
    // Genuine fresh failure of the intermediate A must still be recoverable.
    expect(evidence.targets(['a', 'b'], [])).toEqual(['a', 'b'])
  })

  it('uses current blocking evidence for the repaired plugin, but never warnings', () => {
    const evidence = new PluginRecoveryEvidence()
    evidence.installed('a')
    evidence.inspect([{ ...blocking('a'), severity: 'warning' }, blocking('b')])
    expect(evidence.targets(['a', 'b'], [])).toEqual(['b'])
    evidence.inspect([blocking('a'), blocking('b')])
    expect(evidence.targets(['a', 'b'], ['b'])).toEqual(['a'])
  })

  it('upgrades the selected versions serially and retains success when another install fails', async () => {
    const calls: string[] = []
    let active = 0
    const results = await runPluginRecoveryUpgrades([
      { packageName: 'a', targetVersion: '1.5.0' },
      { packageName: 'b', targetVersion: '2.0.0' },
      { packageName: 'c', targetVersion: '3.0.0' }
    ], async candidate => {
      expect(active++).toBe(0)
      calls.push(`${candidate.packageName}@${candidate.targetVersion}`)
      await Promise.resolve()
      active--
      if (candidate.packageName === 'b') throw new Error('network failure')
      return { ok: true }
    })
    expect(calls).toEqual(['a@1.5.0', 'b@2.0.0', 'c@3.0.0'])
    expect(results.map(result => result.ok)).toEqual([true, false, true])
  })
  it('checks every unique blocker and isolates unavailable metadata', async () => {
    const called: string[] = []
    const results = await checkBlockingPluginUpdates({
      plugins: ['@a/widget', '@b/widget', 'offline', '@a/widget'],
      attemptedUpgrades: new Map(), locale: 'zh',
      check: async (packageName): Promise<PluginHealthReport> => {
        called.push(packageName)
        if (packageName === 'offline') throw new Error('offline')
        return packageName === '@a/widget'
          ? { packageName, healthStatus: 'incompatible-upgrade-available', healthLabel: 'latest fallback', detail: '兼容性未确认', upgradeReady: true, upgradeVersion: '2.0.0' }
          : { packageName, healthStatus: 'incompatible-no-fix', healthLabel: '请卸载', upgradeReady: false }
      }
    })
    expect(called).toEqual(['@a/widget', '@b/widget', 'offline'])
    expect(results[0]?.upgradeCandidate).toMatchObject({ packageName: '@a/widget', targetVersion: '2.0.0' })
    expect(results[1]).toMatchObject({ packageName: '@b/widget', hint: '请卸载', upgradeCandidate: undefined })
    expect(results[2]?.hint).toContain('未能检查更新')
  })

  it('does not retry an attempted version while other plugins remain upgradeable', async () => {
    const results = await checkBlockingPluginUpdates({
      plugins: ['a', 'b'], attemptedUpgrades: new Map([['a', '2.0.0']]), locale: 'en',
      check: async (packageName) => ({ packageName, healthStatus: 'incompatible-upgrade-available', healthLabel: 'update', upgradeReady: true, upgradeVersion: '2.0.0' })
    })
    expect(results[0]?.upgradeCandidate).toBeUndefined()
    expect(results[0]?.hint).toContain('remove the plugin')
    expect(results[1]?.upgradeCandidate?.packageName).toBe('b')
  })

  it('targets exact package names, rejecting unrelated or removed packages', () => {
    const plugins = ['@a/widget', '@b/widget']
    expect(selectPluginRecoveryTarget('upgrade:@a/widget', plugins)).toEqual({ type: 'upgrade', plugin: '@a/widget' })
    expect(selectPluginRecoveryTarget('uninstall:@b/widget', plugins)).toEqual({ type: 'uninstall', plugin: '@b/widget' })
    for (const action of ['uninstall:widget', 'uninstall:removed', 'upgrade:', 'remove:@a/widget']) {
      expect(selectPluginRecoveryTarget(action, plugins)).toBeUndefined()
    }
  })
})
