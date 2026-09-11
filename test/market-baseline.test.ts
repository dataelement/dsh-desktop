import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ensureMarketBaseline, VERIFIED_MARKET_BASELINE } from '../src/main/state/market-baseline'
import { runProfileStartupMaintenance, type ProfileStartupMaintenanceDeps } from '../src/main/state/profile-startup-maintenance'
import { readInstalledPluginVersion } from '../src/main/state/plugin-market-check'
import { projectGenerations } from 'dsh-desktop-market-installer/generations/projection'
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
  const options = { dshHome: home, dshEntryPath: resolve('node_modules/@deepseek-ai/dsh/lib/bin.js'), nodeExecutablePath: process.execPath, pnpmEntryPath: '/unused/pnpm' }
  return { home, profile, market, options }
}

function startup(ensure: () => Promise<void>): ProfileStartupMaintenanceDeps {
  return {
    note: () => {}, recoverInterruptedMigration: async () => ({ outcome: 'no-snapshot' }),
    incompletePluginRestoreId: async () => undefined, preparePackageStore: async () => {},
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

  it('upgrades an already-migrated Profile despite a newer declaration, and verifies the projected package', async () => {
    const { home, profile, options } = await fixture()
    const upgrade = vi.fn(async () => {
      // Exercise the real generation projection over a legacy real directory.
      const generation = join(registryLayout(home).generations, 'market-upgrade')
      const pkg = join(generation, 'node_modules', 'dshmarket')
      await mkdir(pkg, { recursive: true })
      await writeFile(join(pkg, 'package.json'), JSON.stringify({ name: 'dshmarket', version: VERIFIED_MARKET_BASELINE, main: 'index.js', dsh: { bundle: { patch: 'cordis.patch.yml' } } }))
      await writeFile(join(pkg, 'index.js'), 'export default () => {}')
      await writeFile(join(pkg, 'cordis.patch.yml'), '[]')
      await writeGenerationMeta(generation, { pluginName: 'dshmarket', version: VERIFIED_MARKET_BASELINE })
      await writeDesired(home, ['market-upgrade'])
      await projectGenerations(home)
      return { ok: true }
    })
    const deps = startup(() => ensureMarketBaseline(options, upgrade))
    expect(await runProfileStartupMaintenance(deps)).toMatchObject({ outcome: 'normal-profile' })
    expect(upgrade).toHaveBeenCalledWith(expect.objectContaining({ pluginName: 'dshmarket', targetVersion: VERIFIED_MARKET_BASELINE }))
    expect(await readInstalledPluginVersion(home, 'dshmarket')).toBe(VERIFIED_MARKET_BASELINE)
    const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
    expect(manifest.dependencies['other-plugin']).toBe('1.0.0')
    await expect(readFile(join(profile, '.install-complete'))).rejects.toMatchObject({ code: 'ENOENT' })
    await runProfileStartupMaintenance(deps)
    expect(upgrade).toHaveBeenCalledTimes(1)
  })

  it.each(['1.45.1', '1.46.0', '2.0.0'])('does not reinstall or downgrade active %s', async (version) => {
    const { options } = await fixture(version)
    const upgrade = vi.fn()
    await ensureMarketBaseline(options, upgrade)
    expect(upgrade).not.toHaveBeenCalled()
  })

  it('projects a staged higher version before deciding whether to upgrade', async () => {
    const { options, market } = await fixture()
    const upgrade = vi.fn()
    const deps = startup(() => ensureMarketBaseline(options, upgrade))
    deps.prepareGenerationsForLaunch = async () => { await writeFile(join(market, 'package.json'), JSON.stringify({ version: '1.50.0' })) }
    await runProfileStartupMaintenance(deps)
    expect(upgrade).not.toHaveBeenCalled()
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

  it.each(['recovery', 'restore', 'removal', 'migration'] as const)('does not upgrade during %s deferral', async (gate) => {
    const ensure = vi.fn(async () => {})
    const deps = startup(ensure)
    if (gate === 'recovery') deps.recoverInterruptedMigration = async () => ({ outcome: 'recovery-required', reason: 'locked' })
    if (gate === 'restore') deps.incompletePluginRestoreId = async () => 'restore-id'
    if (gate === 'removal') deps.shouldDeferProfileMaintenance = async () => true
    if (gate === 'migration') deps.migrateProfileToGenerations = async () => ({ outcome: 'deferred-failure', reason: 'deferred', profileState: 'legacy-intact' })
    await runProfileStartupMaintenance(deps)
    expect(ensure).not.toHaveBeenCalled()
  })
})
