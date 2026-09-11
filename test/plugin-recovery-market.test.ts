import { describe, expect, it } from 'vitest'
import { checkBlockingPluginUpdates, selectPluginRecoveryTarget } from '../src/main/plugin-recovery-market'
import type { PluginHealthReport } from '../src/main/state/plugin-market-check'

describe('per-plugin recovery checks', () => {
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
