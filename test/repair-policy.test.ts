import { describe, expect, it } from 'vitest'
import { buildRepairPlan, canOpenRecoveryAgent } from '../src/main/repair-policy'

describe('repair rounds', () => {
  const upgrades = [{ packageName: 'a', targetVersion: '2.0.0' }]
  it('upgrades first without disabling a second plugin in the same round', () => {
    expect(buildRepairPlan({ plugins: ['a', 'b'], upgrades })).toEqual({ kind: 'known', action: 'upgrade', plugins: ['a'], upgrades })
  })
  it('disables after the upgrade was already attempted, including interrupted attempts', () => {
    const plan = buildRepairPlan({ plugins: ['a'], upgrades, attempts: [{ action: 'upgrade', plugins: ['a'], versions: { a: '2.0.0' }, status: 'pending' }] })
    expect(plan.action).toBe('disable')
    expect(plan.upgrades).toEqual([])
  })
  it('keeps known identity after exhaustion so application rollback remains possible', () => {
    const plan = buildRepairPlan({ plugins: ['a'], attempts: [{ action: 'disable', plugins: ['a'] }] })
    expect(plan.kind).toBe('known')
    expect(plan.action).toBeUndefined()
  })
  it('does not guess unknown faults or repeat a configuration repair', () => {
    expect(buildRepairPlan({ plugins: [] }).kind).toBe('unknown')
    expect(buildRepairPlan({ plugins: [], configurationRepairable: true, attempts: [{ action: 'configuration', plugins: [] }] }).action).toBeUndefined()
  })
  it('allows a new incident after the prior repair was verified by the renderer', () => {
    expect(buildRepairPlan({ plugins: ['a'], upgrades, attempts: [{ action: 'upgrade', plugins: ['a'], versions: { a: '2.0.0' }, status: 'verified' }] }).action).toBe('upgrade')
  })
  it('does not repeat a failed disable round and leaves the known fallback available', () => {
    const plan = buildRepairPlan({ plugins: ['a'], attempts: [{ action: 'disable', plugins: ['a'], status: 'failed' }] })
    expect(plan).toEqual({ kind: 'known', plugins: [], upgrades: [] })
  })
  it('does not let a prior plugin round consume an independent configuration repair', () => {
    const plan = buildRepairPlan({ plugins: [], configurationRepairable: true, attempts: [{ action: 'disable', plugins: ['a'], status: 'restart' }] })
    expect(plan.action).toBe('configuration')
  })
  it('retries none of the recorded versions after a restart but can apply a genuinely newer update', () => {
    const attempts = [{ action: 'upgrade' as const, plugins: ['a'], versions: { a: '2.0.0' }, status: 'failed' as const }]
    expect(buildRepairPlan({ plugins: ['a'], upgrades, attempts }).action).toBe('disable')
    expect(buildRepairPlan({ plugins: ['a'], upgrades: [{ packageName: 'a', targetVersion: '2.0.1' }], attempts }).action).toBe('upgrade')
  })

  it('upgrades an identified core component without ever offering to disable it', () => {
    const candidate = { packageName: 'dshmarket', targetVersion: '2.0.0' }
    const first = buildRepairPlan({ plugins: [], upgradeOnlyPlugins: ['dshmarket'], upgrades: [candidate] })
    expect(first.action).toBe('upgrade')
    expect(first.plugins).toEqual(['dshmarket'])
    const exhausted = buildRepairPlan({ plugins: [], upgradeOnlyPlugins: ['dshmarket'], upgrades: [candidate], attempts: [{ action: 'upgrade', plugins: ['dshmarket'], versions: { dshmarket: '2.0.0' }, status: 'restart' }] })
    expect(exhausted).toEqual({ kind: 'known', plugins: [], upgrades: [] })
  })
  it('can disable third-party plugins while keeping a core-only failure identified', () => {
    const plan = buildRepairPlan({ plugins: ['a', 'dshmarket'], upgradeOnlyPlugins: ['dshmarket'] })
    expect(plan).toEqual({ kind: 'known', action: 'disable', plugins: ['a'], upgrades: [] })
    expect(buildRepairPlan({ plugins: [], upgradeOnlyPlugins: ['dshmarket'] }).kind).toBe('known')
  })

})

describe('recovery Agent admission', () => {
  it.each(['upgrade', 'disable', 'configuration'] as const)('rejects Agent entry while a known %s repair remains', action => {
    expect(canOpenRecoveryAgent({ kind: 'known', action, plugins: [], upgrades: [] })).toBe(false)
  })

  it('allows unknown problems, including the fallback plan used after rollback failure', () => {
    expect(canOpenRecoveryAgent({ kind: 'unknown', plugins: [], upgrades: [] })).toBe(true)
  })

  it('allows identified problems only after available repair rounds are exhausted', () => {
    const plan = buildRepairPlan({ plugins: ['a'], attempts: [{ action: 'disable', plugins: ['a'], status: 'failed' }] })
    expect(canOpenRecoveryAgent(plan)).toBe(true)
  })
})
