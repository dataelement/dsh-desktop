import { lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { demoteMarketGeneration, ensureMarketBaseline, VERIFIED_MARKET_BASELINE } from '../src/main/state/market-baseline'
import { runProfileStartupMaintenance, type ProfileStartupMaintenanceDeps } from '../src/main/state/profile-startup-maintenance'
import { readInstalledPluginVersion } from '../src/main/state/plugin-market-check'
import { readDesired, registryLayout, writeDesired, writeGenerationMeta } from 'dsh-desktop-market-installer/generations/registry'

const homes: string[] = []
afterEach(async () => { await Promise.all(homes.splice(0).map((home) => rm(home, { recursive: true, force: true }))) })

async function fixture(version = '1.15.0') {
  const home = await mkdtemp(join(tmpdir(), 'dsh-market-baseline-'))
  homes.push(home)
  const profile = join(home, 'profiles', 'web')
  const market = join(profile, 'node_modules', 'dshmarket')
  await mkdir(market, { recursive: true })
  await writeFile(join(market, 'package.json'), JSON.stringify({ name: 'dshmarket', version }))
  await writeFile(join(profile, 'package.json'), JSON.stringify({
    dependencies: { dshmarket: '^1.45.1', 'other-plugin': '1.0.0' },
    dsh: { profile: { bundles: ['dshmarket', 'other-plugin'] } }
  }))
  await writeFile(join(profile, '.generations-migrated'), 'already migrated')
  await writeFile(join(profile, '.install-complete'), 'previous fingerprint')
  const options = { dshHome: home, dshEntryPath: resolve('node_modules/@deepseek-ai/dsh/lib/bin.js'), nodeExecutablePath: process.execPath, pnpmEntryPath: '/unused/pnpm', pnpmRunnerPath: '/unused/pnpm-runner.mjs' }
  return { home, profile, market, options }
}

function startup(ensure: () => Promise<void>): ProfileStartupMaintenanceDeps {
  return {
    note: () => {}, recoverInterruptedMigration: async () => ({ outcome: 'no-snapshot' }),
    incompletePluginRestoreId: async () => undefined, preparePackageStore: async () => {},
    demoteMarketGeneration: async () => false,
    enforcePendingPluginRemovals: async () => {}, prepareGenerationsForLaunch: async () => {},
    shouldDeferProfileMaintenance: async () => false,
    migrateProfileToGenerations: async () => ({ outcome: 'no-op' }),
    ensureMarketBaseline: ensure, reportProfileConsistency: async () => {}
  }
}

describe('market baseline at normal startup', () => {
  it('keeps the baseline aligned with the bundled market', async () => {
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
    expect(VERIFIED_MARKET_BASELINE).toBe(pkg.dependencies.dshmarket)
  })

  it('upgrades an already-migrated Profile in the shared tree, never as a generation', async () => {
    const { home, profile, market, options } = await fixture()
    const upgrade = vi.fn(async () => {
      // dshmarket is never a generation: simulate the shared-tree reinstall
      // landing a newer real directory in place.
      await writeFile(join(market, 'package.json'), JSON.stringify({ name: 'dshmarket', version: VERIFIED_MARKET_BASELINE }))
      return { ok: true }
    })
    const deps = startup(() => ensureMarketBaseline(options, upgrade))
    expect(await runProfileStartupMaintenance(deps)).toMatchObject({ outcome: 'normal-profile' })
    expect(upgrade).toHaveBeenCalledWith(expect.objectContaining({ targetVersion: VERIFIED_MARKET_BASELINE }))
    expect(await readInstalledPluginVersion(home, 'dshmarket')).toBe(VERIFIED_MARKET_BASELINE)
    expect((await lstat(market)).isSymbolicLink()).toBe(false)
    const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
    expect(manifest.dependencies['other-plugin']).toBe('1.0.0')
    await expect(readFile(join(profile, '.install-complete'))).rejects.toMatchObject({ code: 'ENOENT' })
    await runProfileStartupMaintenance(deps)
    expect(upgrade).toHaveBeenCalledTimes(1)
  })

  it('repairs a dshmarket generation link even when its version already meets the baseline', async () => {
    const { home, profile, market, options } = await fixture(VERIFIED_MARKET_BASELINE)
    // An earlier, buggy build left dshmarket projected as a generation link
    // instead of the real shared-tree directory it must always be.
    await rm(market, { recursive: true, force: true })
    const generationDir = join(home, 'elsewhere-generation', 'node_modules', 'dshmarket')
    await mkdir(generationDir, { recursive: true })
    await writeFile(join(generationDir, 'package.json'), JSON.stringify({ name: 'dshmarket', version: VERIFIED_MARKET_BASELINE }))
    await symlink(generationDir, market, 'junction')
    expect((await lstat(market)).isSymbolicLink()).toBe(true)

    const upgrade = vi.fn(async () => {
      await rm(market, { force: true })
      await mkdir(market, { recursive: true })
      await writeFile(join(market, 'package.json'), JSON.stringify({ name: 'dshmarket', version: VERIFIED_MARKET_BASELINE }))
      return { ok: true }
    })
    await ensureMarketBaseline(options, upgrade)
    expect(upgrade).toHaveBeenCalledTimes(1)
    expect((await lstat(market)).isSymbolicLink()).toBe(false)
    const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
    expect(manifest.dependencies['other-plugin']).toBe('1.0.0')
  })

  it.each(['1.45.1', '1.46.0', '2.0.0'])('does not reinstall or downgrade active %s', async (version) => {
    const { options } = await fixture(version)
    const upgrade = vi.fn()
    await ensureMarketBaseline(options, upgrade)
    expect(upgrade).not.toHaveBeenCalled()
  })

  it('runs before projection, which must never be able to re-link the market', async () => {
    const { options, market } = await fixture()
    const order: string[] = []
    const upgrade = vi.fn(async () => {
      order.push('upgrade')
      await writeFile(join(market, 'package.json'), JSON.stringify({ name: 'dshmarket', version: VERIFIED_MARKET_BASELINE }))
      return { ok: true }
    })
    const deps = startup(() => ensureMarketBaseline(options, upgrade))
    deps.prepareGenerationsForLaunch = async () => { order.push('projection') }
    await runProfileStartupMaintenance(deps)
    expect(order).toEqual(['upgrade', 'projection'])
  })

  it('demotes a projected market: drops the link and pointer, keeps the declaration', async () => {
    const { home, profile, market } = await fixture()
    // The shape an earlier build left behind: a generation link, a desired
    // pointer, and projection ownership in the manifest.
    const generationDir = join(registryLayout(home).generations, 'dshmarket+1.38.0+deadbeef')
    const generationPackage = join(generationDir, 'node_modules', 'dshmarket')
    await mkdir(generationPackage, { recursive: true })
    await writeFile(join(generationPackage, 'package.json'), JSON.stringify({ name: 'dshmarket', version: '1.38.0' }))
    await writeGenerationMeta(generationDir, { pluginName: 'dshmarket', version: '1.38.0' })
    await writeDesired(home, ['dshmarket+1.38.0+deadbeef'])
    await rm(market, { recursive: true, force: true })
    await symlink(generationPackage, market, 'junction')
    const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
    manifest.dsh.desktop = {
      generationProjection: {
        version: 1,
        plugins: { dshmarket: { generationId: 'dshmarket+1.38.0+deadbeef', visibleVersion: '1.38.0', previousOverride: { present: false } } }
      }
    }
    manifest.pnpm = { overrides: { dshmarket: 'link:../.generations/live/dshmarket+1.38.0+deadbeef/node_modules/dshmarket' } }
    await writeFile(join(profile, 'package.json'), JSON.stringify(manifest, undefined, 2))

    expect(await demoteMarketGeneration(home)).toBe(true)

    await expect(lstat(market)).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await readDesired(home)).toEqual([])
    const after = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
    // The declaration survives: without it every later repair reads the market
    // as deliberately uninstalled and declines to put it back.
    expect(after.dependencies.dshmarket).toBe('1.38.0')
    expect(after.dsh.profile.bundles).toContain('dshmarket')
    expect(after.dsh.desktop?.generationProjection).toBeUndefined()
    expect(after.pnpm?.overrides?.dshmarket).toBeUndefined()
    // The generation directory itself is left for the ordinary sweep.
    expect(await readFile(join(generationPackage, 'package.json'), 'utf8')).toContain('1.38.0')
    // Idempotent once there is nothing left to demote.
    expect(await demoteMarketGeneration(home)).toBe(false)
  })

  it('blocks startup on installation failure and leaves the old package and desired pointer intact', async () => {
    const { options, home, profile } = await fixture()
    const original = await readFile(join(profile, 'package.json'), 'utf8')
    const result = await runProfileStartupMaintenance(startup(() => ensureMarketBaseline(options, async () => ({ ok: false, detail: 'registry unavailable' }))))
    expect(result).toMatchObject({ outcome: 'safe-recovery', reason: expect.stringContaining('registry unavailable') })
    expect(await readInstalledPluginVersion(home, 'dshmarket')).toBe('1.15.0')
    expect(await readFile(join(profile, 'package.json'), 'utf8')).toBe(original)
    expect(await readDesired(home)).toEqual([])
  })

  it('rejects a successful installer result if the active version did not change', async () => {
    const { options } = await fixture()
    await expect(ensureMarketBaseline(options, async () => ({ ok: true }))).rejects.toThrow('active version is 1.15.0')
  })

  it('repairs a missing enabled market but does not resurrect a removed market', async () => {
    const { options, market, profile } = await fixture()
    await rm(market, { recursive: true })
    const upgrade = vi.fn(async () => ({ ok: false, detail: 'install attempted' }))
    await expect(ensureMarketBaseline(options, upgrade)).rejects.toThrow('install attempted')
    await writeFile(join(profile, 'package.json'), JSON.stringify({ dependencies: {} }))
    await ensureMarketBaseline(options, upgrade)
    expect(upgrade).toHaveBeenCalledTimes(1)
  })

  it.each(['recovery', 'restore', 'migration'] as const)('does not upgrade during %s deferral', async (gate) => {
    const ensure = vi.fn(async () => {})
    const deps = startup(ensure)
    if (gate === 'recovery') deps.recoverInterruptedMigration = async () => ({ outcome: 'recovery-required', reason: 'locked' })
    if (gate === 'restore') deps.incompletePluginRestoreId = async () => 'restore-id'
    if (gate === 'migration') deps.migrateProfileToGenerations = async () => ({ outcome: 'deferred-failure', reason: 'deferred', profileState: 'legacy-intact' })
    await runProfileStartupMaintenance(deps)
    expect(ensure).not.toHaveBeenCalled()
  })

  it('still repairs the market while a plugin removal is pending verification', async () => {
    // The removal is only marked verified by a successful boot, and a market
    // that cannot load is what stops the boot — deferring the repair behind
    // that gate is a livelock, not caution.
    const order: string[] = []
    const ensure = vi.fn(async () => { order.push('market') })
    const demote = vi.fn(async () => { order.push('demote'); return true })
    const deps = startup(ensure)
    deps.demoteMarketGeneration = demote
    deps.shouldDeferProfileMaintenance = async () => true
    deps.prepareGenerationsForLaunch = async () => { order.push('projection') }

    const result = await runProfileStartupMaintenance(deps)

    expect(result).toMatchObject({ migration: { outcome: 'maintenance-deferred' } })
    expect(order).toEqual(['demote', 'market', 'projection'])
  })
})
