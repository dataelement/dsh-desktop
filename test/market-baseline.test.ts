import { lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { demoteMarketGeneration, ensureMarketBaseline, marketUsableWithoutBaseline, readProfileMarket, VERIFIED_MARKET_BASELINE } from '../src/main/state/market-baseline'
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
    ensureMarketBaseline: ensure, marketUsableWithoutBaseline: async () => false,
    reportProfileConsistency: async () => {}, inspectProfileBootInputs: async () => undefined,
    pruneUnresolvableBundles: async () => []
  }
}

describe('market baseline at normal startup', () => {
  it('never ships dshmarket in the app or dev dependencies, where it would shadow the profile copy', async () => {
    // Harness resolves bundles from its installation before the profile, so a
    // packaged dshmarket would silently win over every market upgrade.
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
    expect(pkg.dependencies?.dshmarket).toBeUndefined()
    expect(pkg.devDependencies?.dshmarket).toBeUndefined()
  })

  it('reports when the installation shadows the profile market', async () => {
    const { options } = await fixture('1.48.0')
    const fakeApp = await mkdtemp(join(tmpdir(), 'dsh-shadowed-app-'))
    homes.push(fakeApp)
    const fakeMarket = join(fakeApp, 'node_modules', 'dshmarket')
    await mkdir(fakeMarket, { recursive: true })
    await writeFile(join(fakeMarket, 'package.json'), JSON.stringify({ name: 'dshmarket', version: VERIFIED_MARKET_BASELINE }))
    await writeFile(join(fakeApp, 'package.json'), JSON.stringify({ name: 'fake-dsh' }))
    const dshEntryPath = join(fakeApp, 'lib', 'bin.js')
    const lines: string[] = []
    await ensureMarketBaseline({ ...options, dshEntryPath, note: (line) => lines.push(line) }, vi.fn())
    expect(lines).toEqual([expect.stringContaining(`shadowed by ${VERIFIED_MARKET_BASELINE}`)])
  })

  it('stays quiet when Harness loads the profile market', async () => {
    const { home, options } = await fixture('1.48.0')
    const lines: string[] = []
    const dshEntryPath = join(home, 'app', 'lib', 'bin.js')
    await ensureMarketBaseline({ ...options, dshEntryPath, note: (line) => lines.push(line) }, vi.fn())
    expect(lines).toEqual([])
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
    const generationPackage = join(registryLayout(home).generations, 'live', 'dshmarket+test+aabb', 'node_modules', 'dshmarket')
    await mkdir(generationPackage, { recursive: true })
    await writeFile(join(generationPackage, 'package.json'), JSON.stringify({ name: 'dshmarket', version: VERIFIED_MARKET_BASELINE }))
    await symlink(generationPackage, market, 'junction')
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

  it('does not repair a pnpm isolated-store symlink pointing into .pnpm/', async () => {
    const { home, market, options } = await fixture(VERIFIED_MARKET_BASELINE)
    // Simulate pnpm isolated mode: node_modules/dshmarket is a symlink to .pnpm/…
    const pnpmStoreDir = join(home, 'profiles', 'web', 'node_modules', '.pnpm', `dshmarket@${VERIFIED_MARKET_BASELINE}`, 'node_modules', 'dshmarket')
    await mkdir(pnpmStoreDir, { recursive: true })
    await writeFile(join(pnpmStoreDir, 'package.json'), JSON.stringify({ name: 'dshmarket', version: VERIFIED_MARKET_BASELINE }))
    await rm(market, { recursive: true, force: true })
    await symlink(pnpmStoreDir, market, 'junction')

    const upgrade = vi.fn()
    await ensureMarketBaseline(options, upgrade)
    expect(upgrade).not.toHaveBeenCalled()
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

  it.each(['recovery', 'restore'] as const)('does not upgrade during %s deferral', async (gate) => {
    const ensure = vi.fn(async () => {})
    const deps = startup(ensure)
    if (gate === 'recovery') deps.recoverInterruptedMigration = async () => ({ outcome: 'recovery-required', reason: 'locked' })
    if (gate === 'restore') deps.incompletePluginRestoreId = async () => 'restore-id'
    await runProfileStartupMaintenance(deps)
    expect(ensure).not.toHaveBeenCalled()
  })

  it('upgrades 1.31.1 before an unrelated migration fails, then checks the retained Profile', async () => {
    const { market, options } = await fixture('1.31.1')
    const deps = startup(() => ensureMarketBaseline(options, async ({ targetVersion }) => {
      await writeFile(join(market, 'package.json'), JSON.stringify({ name: 'dshmarket', version: targetVersion }))
      return { ok: true }
    }))
    deps.migrateProfileToGenerations = async () => {
      expect(await readInstalledPluginVersion(options.dshHome, 'dshmarket')).toBe(VERIFIED_MARKET_BASELINE)
      return { outcome: 'deferred-failure', reason: 'unrelated plugin missing', profileState: 'legacy-intact' }
    }
    deps.prepareGenerationsForLaunch = vi.fn()
    deps.inspectProfileBootInputs = async () => ({ message: 'failed to prepare profile bundle unrelated-plugin', packageName: 'unrelated-plugin' })
    expect(await runProfileStartupMaintenance(deps)).toMatchObject({ outcome: 'safe-recovery', repairable: true, repairTarget: 'unrelated-plugin', reason: expect.stringContaining('unrelated-plugin') })
    expect(deps.prepareGenerationsForLaunch).not.toHaveBeenCalled()
    deps.inspectProfileBootInputs = async () => undefined
    expect(await runProfileStartupMaintenance(deps)).toMatchObject({ outcome: 'normal-profile', migration: { outcome: 'deferred-failure' } })
  })

  it('opens repairable recovery if the market upgrade fails, without starting migration', async () => {
    const deps = startup(async () => { throw new Error('install failed') })
    deps.migrateProfileToGenerations = vi.fn()
    expect(await runProfileStartupMaintenance(deps)).toMatchObject({ outcome: 'safe-recovery', repairable: true })
    expect(deps.migrateProfileToGenerations).not.toHaveBeenCalled()
  })

  // pnpm 404s, fetch failures and EPERM are ordinary in restricted networks.
  // Losing the normal Profile over one is a worse outcome than an old market.
  it('keeps booting when the baseline install fails but the installed market still loads', async () => {
    const notes: string[] = []
    const deps = startup(async () => { throw new Error('ERR_PNPM_META_FETCH_FAIL') })
    deps.note = (line) => notes.push(line)
    deps.marketUsableWithoutBaseline = async () => true
    deps.migrateProfileToGenerations = vi.fn(async () => ({ outcome: 'no-op' }) as const)
    expect(await runProfileStartupMaintenance(deps)).toMatchObject({ outcome: 'normal-profile' })
    expect(deps.migrateProfileToGenerations).toHaveBeenCalled()
    expect(notes.join('\n')).toContain('market baseline deferred, keeping the installed market')
  })

  it('still blocks when inspecting the installed market itself throws', async () => {
    const deps = startup(async () => { throw new Error('install failed') })
    deps.marketUsableWithoutBaseline = async () => { throw new Error('unreadable') }
    expect(await runProfileStartupMaintenance(deps)).toMatchObject({ outcome: 'safe-recovery', repairable: true })
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

  describe('marketUsableWithoutBaseline', () => {
    it('accepts a readable shared-tree market below the baseline', async () => {
      const { home } = await fixture('1.15.0')
      expect(await marketUsableWithoutBaseline(home)).toBe(true)
    })

    it('rejects a missing market', async () => {
      const { home, market } = await fixture()
      await rm(market, { recursive: true })
      expect(await marketUsableWithoutBaseline(home)).toBe(false)
    })

    it('rejects an unreadable or versionless market', async () => {
      const { home, market } = await fixture()
      await writeFile(join(market, 'package.json'), '{broken')
      expect(await marketUsableWithoutBaseline(home)).toBe(false)
    })

    it('rejects a generation link, which projection relinks on every launch', async () => {
      const { home, profile, market } = await fixture()
      const generation = join(home, '.generations', 'live', 'dshmarket')
      await mkdir(generation, { recursive: true })
      await writeFile(join(generation, 'package.json'), JSON.stringify({ name: 'dshmarket', version: '1.48.0' }))
      await rm(market, { recursive: true })
      await symlink(generation, join(profile, 'node_modules', 'dshmarket'))
      expect(await marketUsableWithoutBaseline(home)).toBe(false)
    })
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

  it('preserves an upgraded market version >= 1.45.1 when demoting back to shared tree', async () => {
    const { home, profile, market } = await fixture()
    const generationDir = join(registryLayout(home).generations, 'dshmarket+1.47.0+cafebabe')
    const generationPackage = join(generationDir, 'node_modules', 'dshmarket')
    await mkdir(generationPackage, { recursive: true })
    await writeFile(join(generationPackage, 'package.json'), JSON.stringify({ name: 'dshmarket', version: '1.47.0' }))
    await writeGenerationMeta(generationDir, { pluginName: 'dshmarket', version: '1.47.0' })
    await writeDesired(home, ['dshmarket+1.47.0+cafebabe'])
    await rm(market, { recursive: true, force: true })
    await symlink(generationPackage, market, 'junction')
    const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
    manifest.dsh.desktop = {
      generationProjection: {
        version: 1,
        plugins: { dshmarket: { generationId: 'dshmarket+1.47.0+cafebabe', visibleVersion: '1.47.0', previousOverride: { present: false } } }
      }
    }
    manifest.dependencies.dshmarket = '1.47.0'
    await writeFile(join(profile, 'package.json'), JSON.stringify(manifest, undefined, 2))

    expect(await demoteMarketGeneration(home)).toBe(true)

    const after = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
    expect(after.dependencies.dshmarket).toBe('1.47.0')
  })

  it('upgrades to the newer declared version when declared version exceeds the baseline', async () => {
    const { options, profile, market } = await fixture()
    // Simulate generation link with broken/missing active version, but declared version is 1.47.0
    await rm(market, { recursive: true, force: true })
    const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
    manifest.dependencies.dshmarket = '1.47.0'
    await writeFile(join(profile, 'package.json'), JSON.stringify(manifest, undefined, 2))

    const upgrade = vi.fn(async ({ dshHome, targetVersion }: { dshHome: string; targetVersion: string }) => {
      const packageDir = join(profile, 'node_modules', 'dshmarket')
      await mkdir(packageDir, { recursive: true })
      await writeFile(join(packageDir, 'package.json'), JSON.stringify({ name: 'dshmarket', version: targetVersion }))
      return { ok: true }
    })

    await ensureMarketBaseline(options, upgrade)
    expect(upgrade).toHaveBeenCalledWith(expect.objectContaining({ targetVersion: '1.47.0' }))
    expect(await readInstalledPluginVersion(options.dshHome, 'dshmarket')).toBe('1.47.0')
  })

  it('pins the version a declared range names, since the installer verifies an exact version', async () => {
    const { options, profile, market } = await fixture()
    await rm(market, { recursive: true, force: true })
    const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
    manifest.dependencies.dshmarket = '^1.47.0'
    await writeFile(join(profile, 'package.json'), JSON.stringify(manifest, undefined, 2))

    const upgrade = vi.fn(async ({ targetVersion }: { dshHome: string; targetVersion: string }) => {
      const packageDir = join(profile, 'node_modules', 'dshmarket')
      await mkdir(packageDir, { recursive: true })
      await writeFile(join(packageDir, 'package.json'), JSON.stringify({ name: 'dshmarket', version: targetVersion }))
      return { ok: true }
    })

    await ensureMarketBaseline(options, upgrade)
    expect(upgrade).toHaveBeenCalledWith(expect.objectContaining({ targetVersion: '1.47.0' }))
  })
})

describe('the market Safe Mode can act on', () => {
  it('reads the declared market and its installed version', async () => {
    const { home } = await fixture('1.48.0')
    expect(await readProfileMarket(home)).toEqual({ installedVersion: '1.48.0' })
  })

  it('still offers a declared market whose package is missing', async () => {
    const { home, market } = await fixture()
    await rm(market, { recursive: true, force: true })
    expect(await readProfileMarket(home)).toEqual({})
  })

  it('leaves a removed market out of view', async () => {
    const { home, profile } = await fixture()
    await writeFile(join(profile, 'package.json'), JSON.stringify({
      dependencies: { 'other-plugin': '1.0.0' },
      dsh: { profile: { bundles: ['other-plugin'] } }
    }))
    expect(await readProfileMarket(home)).toBeUndefined()
  })
})
