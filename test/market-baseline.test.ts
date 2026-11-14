import { lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { demoteMarketGeneration, ensureMarketBaseline, marketUsableWithoutBaseline, readProfileMarket } from '../src/main/profile/market-baseline'
import { runProfileStartupMaintenance, type ProfileStartupMaintenanceDeps } from '../src/main/profile/profile-startup-maintenance'
import { readDesired, registryLayout, writeDesired, writeGenerationMeta } from 'dsh-desktop-market-installer/generations/registry'

const homes: string[] = []
afterEach(async () => { await Promise.all(homes.splice(0).map((home) => rm(home, { recursive: true, force: true }))) })

function startup(ensure: () => Promise<void>): ProfileStartupMaintenanceDeps {
  return {
    note: () => {}, recoverInterruptedMigration: async () => ({ outcome: 'no-snapshot' }),
    incompletePluginRestoreId: async () => undefined, preparePackageStore: async () => {},
    demoteMarketGeneration: async () => false,
    enforcePendingPluginRemovals: async () => {}, prepareGenerationsForLaunch: async () => {},
    shouldDeferProfileMaintenance: async () => false,
    migrateProfileToGenerations: async () => ({ outcome: 'no-op' }),
    ensureMarketBaseline: ensure, marketUsableWithoutBaseline: async () => false,
    reportProfileConsistency: async () => {}, inspectProfileBootInputs: async () => undefined,
    pruneUnresolvableBundles: async () => []
  }
}

describe('ordinary market startup', () => {
  it.each([false, true])('never invokes legacy market hooks (removal deferred: %s)', async (deferred) => {
    const ensure = vi.fn(async () => { throw new Error('registry unavailable') })
    const deps = startup(ensure)
    deps.demoteMarketGeneration = vi.fn(async () => true)
    deps.marketUsableWithoutBaseline = vi.fn(async () => false)
    deps.shouldDeferProfileMaintenance = async () => deferred
    expect(await runProfileStartupMaintenance(deps)).toMatchObject({ outcome: 'normal-profile' })
    expect(ensure).not.toHaveBeenCalled()
    expect(deps.demoteMarketGeneration).not.toHaveBeenCalled()
    expect(deps.marketUsableWithoutBaseline).not.toHaveBeenCalled()
  })

  it('runs without legacy market hooks and exposes a broken market as repairable', async () => {
    const deps = startup(async () => {})
    delete deps.demoteMarketGeneration
    delete deps.ensureMarketBaseline
    delete deps.marketUsableWithoutBaseline
    deps.inspectProfileBootInputs = async () => ({ message: 'invalid market bundle', packageName: 'dshmarket' })
    expect(await runProfileStartupMaintenance(deps)).toMatchObject({ outcome: 'safe-recovery', repairable: true, repairTarget: 'dshmarket' })
  })

  describe('unresolvable bundle declarations', () => {
    it('prunes once and boots normally when that clears the preflight', async () => {
      const notes: string[] = []
      const deps = startup(async () => {})
      deps.note = (line) => notes.push(line)
      let pruned = false
      deps.pruneUnresolvableBundles = async () => { pruned = true; return ['gone-plugin'] }
      deps.inspectProfileBootInputs = async () => pruned
        ? undefined
        : { message: 'failed to prepare profile bundle gone-plugin', packageName: 'gone-plugin' }
      expect(await runProfileStartupMaintenance(deps)).toMatchObject({ outcome: 'normal-profile' })
      expect(notes.join('\n')).toContain('removed unresolvable bundle declaration(s): gone-plugin')
    })

    it('still enters repairable Safe Mode when pruning does not clear it', async () => {
      const deps = startup(async () => {})
      deps.pruneUnresolvableBundles = async () => ['gone-plugin']
      // A bundle that exists but declares no dsh.bundle is not prunable.
      deps.inspectProfileBootInputs = async () => ({
        message: 'failed to prepare profile bundle broken-plugin', packageName: 'broken-plugin'
      })
      expect(await runProfileStartupMaintenance(deps)).toMatchObject({
        outcome: 'safe-recovery', repairable: true, repairTarget: 'broken-plugin'
      })
    })

    it('does not retry when there was nothing to prune', async () => {
      const deps = startup(async () => {})
      const inspect = vi.fn(async () => ({ message: 'broken profile manifest' }))
      deps.inspectProfileBootInputs = inspect
      deps.pruneUnresolvableBundles = async () => []
      expect(await runProfileStartupMaintenance(deps)).toMatchObject({ outcome: 'safe-recovery', repairable: true })
      expect(inspect).toHaveBeenCalledTimes(1)
    })

    it('keeps the normal Profile when pruning itself throws', async () => {
      const deps = startup(async () => {})
      deps.pruneUnresolvableBundles = async () => { throw new Error('manifest locked') }
      deps.inspectProfileBootInputs = async () => ({ message: 'failed to prepare profile bundle gone-plugin' })
      expect(await runProfileStartupMaintenance(deps)).toMatchObject({ outcome: 'safe-recovery', repairable: true })
    })
  })

  it('keeps compatibility baseline calls inert for a projected market', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-market-ordinary-'))
    homes.push(home)
    const profile = join(home, 'profiles', 'web')
    const generationId = 'dshmarket+1.15.0+test'
    const generation = join(registryLayout(home).generations, generationId)
    const pkg = join(generation, 'node_modules', 'dshmarket')
    await mkdir(pkg, { recursive: true })
    await writeFile(join(pkg, 'package.json'), JSON.stringify({ name: 'dshmarket', version: '1.15.0' }))
    await writeGenerationMeta(generation, { pluginName: 'dshmarket', version: '1.15.0' })
    await writeDesired(home, [generationId])
    await mkdir(join(profile, 'node_modules'), { recursive: true })
    const market = join(profile, 'node_modules', 'dshmarket')
    await symlink(pkg, market, 'junction')
    const manifest = JSON.stringify({ dependencies: { dshmarket: '1.15.0' }, dsh: { profile: { bundles: ['dshmarket'] }, desktop: { generationProjection: { plugins: { dshmarket: { generationId } } } } }, pnpm: { overrides: { dshmarket: 'link:../.generations/live/' + generationId + '/node_modules/dshmarket' } } })
    await writeFile(join(profile, 'package.json'), manifest)
    const upgrade = vi.fn()
    expect(await demoteMarketGeneration(home)).toBe(false)
    await ensureMarketBaseline({ dshHome: home, dshEntryPath: '/unused/dsh', nodeExecutablePath: process.execPath, pnpmEntryPath: '/unused/pnpm', pnpmRunnerPath: '/unused/runner' }, upgrade)
    expect(upgrade).not.toHaveBeenCalled()
    expect(await readFile(join(profile, 'package.json'), 'utf8')).toBe(manifest)
    expect((await lstat(market)).isSymbolicLink()).toBe(true)
    expect(await readDesired(home)).toEqual([generationId])
    expect(await marketUsableWithoutBaseline(home)).toBe(true)
    expect(await readProfileMarket(home)).toEqual({ installedVersion: '1.15.0' })
  })
})
