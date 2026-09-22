import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  confirmMigration,
  inspectMigrationRecoveryLock,
  isProfileMigrated,
  migrateProfileToGenerations,
  recoverInterruptedMigration,
  rollBackMigration
} from '../src/main/state/generation-migration'
import { runProfileStartupMaintenance } from '../src/main/state/profile-startup-maintenance'
import {
  readDesired,
  registryLayout,
  writeDesired,
  writeGenerationMeta
} from '../packages/dsh-desktop-market-installer/generations/registry'

/**
 * Regression tests for the failure paths called out in the Windows 0.7.1
 * triage (issue #250). Each test simulates one of the failure modes the
 * tri-state migration result and the verified rollback are supposed to
 * surface instead of swallowing, so that the launch flow has the information
 * it needs to skip shared-tree repair or to preserve a snapshot for manual
 * recovery.
 *
 * The mock for the installer module is a single switchable instance built
 * with `vi.hoisted` + `vi.mock` so the per-test state is read at call time
 * from a shared object. Using `vi.doMock` per test is not enough: the module
 * graph caches the import after the first dynamic `import()` call, so the
 * subsequent tests would see the un-mocked installer.
 */

type FailureMode =
  | { kind: 'ok' }
  | { kind: 'staging-404'; detail: string }
  | { kind: 'peer-validation-fail'; problems: string[] }

const failureMode: { current: FailureMode } = vi.hoisted(() => ({
  current: { kind: 'ok' as const }
}))

const installCalls: { name: string; spec: string }[] = vi.hoisted(() => [])

// Switchable fault injection for the rename used during rollback. The
// production code imports `rename` from `node:fs/promises`; in ESM we cannot
// spy on individual exports of a namespace, so we replace the module's
// `rename` here. The default behaviour is to defer to the real
// implementation; a per-test predicate lets a specific path throw.
const renameFault: { matches?: (from: string) => boolean; message: string } = vi.hoisted(
  () => ({ message: 'EPERM: operation not permitted, rename' })
)
const rmFault: { matches?: (path: string) => boolean; message: string } = vi.hoisted(
  () => ({ message: 'EBUSY: resource busy or locked, rm' })
)
const writeFault: { matches?: (path: string) => boolean; message: string } = vi.hoisted(
  () => ({ message: 'EIO: simulated crash before rollback journal commit' })
)

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
    rename: async (from: Parameters<typeof actual.rename>[0], to: Parameters<typeof actual.rename>[1]) => {
      if (
        renameFault.matches &&
        typeof from === 'string' &&
        renameFault.matches(from)
      ) {
        throw Object.assign(new Error(renameFault.message), { code: 'EPERM' })
      }
      return actual.rename(from, to)
    },
    rm: async (path: Parameters<typeof actual.rm>[0], options?: Parameters<typeof actual.rm>[1]) => {
      if (rmFault.matches && typeof path === 'string' && rmFault.matches(path)) {
        throw Object.assign(new Error(rmFault.message), { code: 'EBUSY' })
      }
      return actual.rm(path, options)
    },
    writeFile: async (
      path: Parameters<typeof actual.writeFile>[0],
      data: Parameters<typeof actual.writeFile>[1],
      options?: Parameters<typeof actual.writeFile>[2]
    ) => {
      if (writeFault.matches && typeof path === 'string' && writeFault.matches(path)) {
        throw Object.assign(new Error(writeFault.message), { code: 'EIO' })
      }
      return actual.writeFile(path, data, options)
    }
  }
})

vi.mock('dsh-desktop-market-installer/generations/installer', async () => {
  const actual = await vi.importActual<
    typeof import('../packages/dsh-desktop-market-installer/generations/installer')
  >('../packages/dsh-desktop-market-installer/generations/installer')
  return {
    ...actual,
    installGeneration: async (
      options: Parameters<typeof actual.installGeneration>[0]
    ) => {
      const mode = failureMode.current
      const name = options.expectedPluginName ?? options.pluginSpec.replace(/@[^@/]+$/u, '')
      installCalls.push({ name, spec: options.pluginSpec })
      if (mode.kind === 'staging-404') {
        return { ok: false as const, detail: mode.detail }
      }
      // For 'ok' and 'peer-validation-fail' we run the real installer with a
      // synthetic runInstall so the staging tree matches the shape
      // validateGeneration expects.
      return actual.installGeneration({
        ...options,
        runInstall: async (stagingDir: string) => {
          const version = options.pluginSpec.split('@').at(-1) ?? '0.0.0'
          const pkg = join(stagingDir, 'node_modules', name)
          await mkdir(pkg, { recursive: true })
          await writeFile(
            join(pkg, 'package.json'),
            JSON.stringify({
              name,
              version,
              dsh: { bundle: { patch: 'cordis.patch.yml' } },
              ...(mode.kind === 'peer-validation-fail'
                ? { dependencies: { '@deepseek-ai/cordis': '*' } }
                : {})
            })
          )
          await writeFile(join(pkg, 'cordis.patch.yml'), '[]\n')
          await writeFile(join(stagingDir, 'pnpm-lock.yaml'), `lock-${name}-${version}\n`)
          return { code: 0, output: 'Done' }
        }
      })
    },
    verifyGenerationPeers: async (
      dshHome: string,
      generation: Parameters<typeof actual.verifyGenerationPeers>[1]
    ) => {
      return actual.verifyGenerationPeers(dshHome, generation)
    }
  }
})

describe('migration failure paths (issue #250)', () => {
  const homes: string[] = []
  const silent = (): void => undefined

  async function preUpgradeProfile(
    plugins: Record<string, string>,
    specs: Record<string, string> = {}
  ): Promise<string> {
    const home = await mkdtemp(join(tmpdir(), 'dsh-migrate-fail-'))
    homes.push(home)
    const dir = join(home, 'profiles', 'web')
    await mkdir(join(dir, 'node_modules'), { recursive: true })
    const dependencies: Record<string, string> = { dshmarket: '^1.35.0' }
    const bundles = ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']
    for (const [name, version] of Object.entries(plugins)) {
      dependencies[name] = specs[name] ?? `^${version}`
      bundles.push(name)
      const pkg = join(dir, 'node_modules', name)
      await mkdir(pkg, { recursive: true })
      await writeFile(join(pkg, 'package.json'), JSON.stringify({ name, version }))
    }
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'dsh-profile-web',
        private: true,
        dependencies,
        dsh: { profile: { bundles } }
      })
    )
    await writeFile(join(dir, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n')
    await writeFile(join(dir, '.install-complete'), 'legacy-install-fingerprint\n')
    await mkdir(join(home, 'profiles', 'node_modules'), { recursive: true })
    return home
  }

  function deps(home: string) {
    return {
      dshHome: home,
      nodeExecutablePath: 'node',
      pnpmEntryPath: 'pnpm',
      dshEntryPath: 'bin.js',
      note: silent,
      reinstallSharedTree: async () => ({ ok: true as const })
    }
  }

  async function installPreviousGeneration(home: string): Promise<void> {
    const directory = join(registryLayout(home).generations, 'previous-generation')
    const packageDirectory = join(directory, 'node_modules', 'previous-plugin')
    await mkdir(packageDirectory, { recursive: true })
    await writeFile(
      join(packageDirectory, 'package.json'),
      JSON.stringify({
        name: 'previous-plugin',
        version: '1.0.0',
        dsh: { bundle: { patch: 'cordis.patch.yml' } }
      })
    )
    await writeFile(join(packageDirectory, 'cordis.patch.yml'), '[]\n')
    await writeGenerationMeta(directory, {
      pluginName: 'previous-plugin',
      version: '1.0.0'
    })
    await writeDesired(home, ['previous-generation'])
  }

  function startup(
    home: string,
    migrationDeps: Parameters<typeof migrateProfileToGenerations>[0] = deps(home)
  ) {
    const prepareStore = vi.fn(async () => undefined)
    const enforce = vi.fn(async () => undefined)
    const prepare = vi.fn(async () => undefined)
    const report = vi.fn(async () => undefined)
    const run = () => runProfileStartupMaintenance({
      note: silent,
      recoverInterruptedMigration: () => recoverInterruptedMigration(home, silent),
      incompletePluginRestoreId: async () => undefined,
      preparePackageStore: prepareStore,
      demoteMarketGeneration: async () => false,
      enforcePendingPluginRemovals: enforce,
      prepareGenerationsForLaunch: prepare,
      shouldDeferProfileMaintenance: async () => false,
      migrateProfileToGenerations: () => migrateProfileToGenerations(migrationDeps),
      ensureMarketBaseline: async () => undefined,
      reportProfileConsistency: report
    })
    return { run, prepareStore, enforce, prepare, report }
  }

  beforeEach(() => {
    failureMode.current = { kind: 'ok' }
    installCalls.length = 0
    renameFault.matches = undefined
    rmFault.matches = undefined
    writeFault.matches = undefined
  })

  afterEach(async () => {
    await Promise.all(homes.map((home) => rm(home, { recursive: true, force: true })))
    homes.length = 0
  })

  it('returns deferred-failure when pnpm reports a 404 on the staging install (do not run profile repair)', async () => {
    failureMode.current = {
      kind: 'staging-404',
      detail: 'ERR_PNPM_FETCH_404  The latest release of @deepseek-ai/dsh-invariants is "0.0.1-rc.1"'
    }
    const home = await preUpgradeProfile({ 'dsh-web-ui-all': '0.3.6' })
    const manifestBefore = await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8')

    const launch = startup(home)
    const result = await launch.run()

    // The 404 must surface as a distinct outcome, not as no-op, so the launch
    // flow can skip the shared-tree repair that would otherwise run pnpm on
    // the legacy manifest and clobber the snapshot state.
    expect(result.outcome).toBe('normal-profile')
    expect(result.outcome === 'normal-profile' ? result.migration.outcome : undefined)
      .toBe('deferred-failure')
    expect(launch.prepare).not.toHaveBeenCalled()
    expect(launch.report).toHaveBeenCalledOnce()
    expect(isProfileMigrated(home)).toBe(false)
    // The pre-upgrade tree must still be there: the snapshot path the next
    // launch falls back to is gone only when the migration actually ran.
    expect(await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8')).toBe(manifestBefore)
    expect(existsSync(join(home, 'profiles', 'web', 'node_modules', 'dsh-web-ui-all'))).toBe(true)

    const callsAfterFirstFailure = installCalls.length
    const repeated = startup(home)
    const repeatedResult = await repeated.run()
    expect(repeatedResult.outcome === 'normal-profile' ? repeatedResult.migration.outcome : undefined)
      .toBe('deferred-failure')
    expect(installCalls).toHaveLength(callsAfterFirstFailure)
    expect(repeated.report).toHaveBeenCalledOnce()

    const deferredPath = join(home, 'profiles', 'web', '.generations-deferred.json')
    const deferred = JSON.parse(await readFile(deferredPath, 'utf8'))
    deferred.retryAfter = '2000-01-01T00:00:00.000Z'
    await writeFile(deferredPath, `${JSON.stringify(deferred, undefined, 2)}\n`)
    const retry = startup(home)
    await retry.run()
    expect(installCalls.length).toBeGreaterThan(callsAfterFirstFailure)
    expect(retry.report).toHaveBeenCalledOnce()
  })

  it('returns deferred-failure when peer validation fails, so a @deepseek-ai/* outside the closure is not silently allowed', async () => {
    // The Windows log shows migration running twice: the first time it
    // 404s on dsh-invariants; the second time peer validation fails because
    // @deepseek-ai/cordis resolves into the host. Both paths used to land in
    // the same boolean and both used to fall through to profile repair.
    failureMode.current = {
      kind: 'peer-validation-fail',
      problems: [
        '@deepseek-ai/cordis resolves outside the installation closure: ' +
          'C:\\Program Files\\DSH Desktop\\resources\\app\\node_modules\\@deepseek-ai\\cordis'
      ]
    }
    const home = await preUpgradeProfile({ 'dsh-agent-teams': '1.0.0' })
    const launch = startup(home)
    const result = await launch.run()

    expect(installCalls.length).toBeGreaterThan(0)
    expect(result.outcome).toBe('normal-profile')
    expect(result.outcome === 'normal-profile' ? result.migration.outcome : undefined)
      .toBe('deferred-failure')
    expect(launch.prepare).not.toHaveBeenCalled()
    expect(launch.report).toHaveBeenCalledOnce()
    expect(isProfileMigrated(home)).toBe(false)
  })

  it('defers an unreadable generation pointer without touching the legacy Profile', async () => {
    const home = await preUpgradeProfile({ 'pointer-plugin': '1.0.0' })
    const profile = join(home, 'profiles', 'web')
    const manifestBefore = await readFile(join(profile, 'package.json'), 'utf8')
    const desiredPath = join(registryLayout(home).root, 'desired.json')
    await mkdir(registryLayout(home).root, { recursive: true })
    await writeFile(desiredPath, '{broken pointer\n')

    const launch = startup(home)
    const result = await launch.run()

    expect(result.outcome).toBe('normal-profile')
    expect(result.outcome === 'normal-profile' ? result.migration : undefined)
      .toMatchObject({ outcome: 'deferred-failure', profileState: 'legacy-intact' })
    expect(launch.prepare).not.toHaveBeenCalled()
    expect(launch.report).toHaveBeenCalledOnce()
    expect(await readFile(join(profile, 'package.json'), 'utf8')).toBe(manifestBefore)
    expect(existsSync(join(profile, 'node_modules', 'pointer-plugin'))).toBe(true)
    expect(await readFile(desiredPath, 'utf8')).toBe('{broken pointer\n')
  })

  it('preserves the snapshot and reports failure when the Windows rename of node_modules back from .pre-generations throws', async () => {
    // The previous rollback swallowed rename errors via .catch(() => undefined)
    // and still reported success. A virus scanner or in-use file on Windows
    // can fail the rename; the user must not lose the snapshot as a result.
    const home = await preUpgradeProfile({ 'dsh-vision-router': '2.0.1' })

    await installPreviousGeneration(home)
    const migration = await migrateProfileToGenerations(deps(home))
    expect(migration.outcome).toBe('migrated')

    // Force the node_modules rename to throw — exactly the failure mode a
    // Windows file lock produces. The switchable mock above replaces
    // `fs.rename` while leaving the rest of `node:fs/promises` intact.
    renameFault.matches = (from) => from.endsWith('node_modules.pre-generations')
    try {
      const rolled = await rollBackMigration(home, silent)
      expect(rolled.outcome).toBe('recovery-required')
      const blockedLaunch = startup(home)
      const blocked = await blockedLaunch.run()
      expect(blocked.outcome).toBe('safe-recovery')
      expect(blockedLaunch.prepare).not.toHaveBeenCalled()
      expect(blockedLaunch.report).not.toHaveBeenCalled()
    } finally {
      renameFault.matches = undefined
    }

    // The failed-step snapshot must still be on disk for the user to
    // recover by hand. The other steps are independent renames in the same
    // loop, so the ones that did not hit the fault are expected to have
    // succeeded — the point of the fix is that the snapshot is preserved
    // for the step that failed rather than wiped on a single bad rename.
    expect(existsSync(join(home, 'profiles', 'web', 'node_modules.pre-generations'))).toBe(true)

    const recoveredLaunch = startup(home)
    const recovered = await recoveredLaunch.run()
    expect(recovered.outcome).toBe('normal-profile')
    expect(recovered.outcome === 'normal-profile' ? recovered.migration.outcome : undefined)
      .toBe('deferred-failure')
    expect(recoveredLaunch.prepare).not.toHaveBeenCalled()
    expect(recoveredLaunch.report).toHaveBeenCalledOnce()
    expect(existsSync(join(home, 'profiles', 'web', 'node_modules', 'dsh-vision-router'))).toBe(true)
    expect(await readFile(join(home, 'profiles', 'web', '.install-complete'), 'utf8'))
      .toBe('legacy-install-fingerprint\n')
  })

  it('enters safe recovery in the same startup when rebuild failure and Windows rollback EPERM combine', async () => {
    const home = await preUpgradeProfile({ 'dsh-vision-router': '2.0.1' })
    const failingDeps = {
      ...deps(home),
      reinstallSharedTree: async () => ({ ok: false as const, detail: 'fixture rebuild failure' })
    }
    renameFault.matches = (from) => from.endsWith('package.json.pre-generations')
    try {
      const launch = startup(home, failingDeps)
      const result = await launch.run()
      expect(result.outcome).toBe('safe-recovery')
      expect(launch.prepare).not.toHaveBeenCalled()
      expect(launch.report).not.toHaveBeenCalled()
      expect(existsSync(join(home, 'profiles', 'web', 'package.json.pre-generations'))).toBe(true)
    } finally {
      renameFault.matches = undefined
    }
  })

  it('restores paths that were not moved when snapshot creation stops on its second rename', async () => {
    const home = await preUpgradeProfile({ 'snapshot-plugin': '1.0.0' })
    const profile = join(home, 'profiles', 'web')
    const manifestBefore = await readFile(join(profile, 'package.json'), 'utf8')
    renameFault.matches = (from) => from === join(profile, 'package.json')
    try {
      const launch = startup(home)
      const result = await launch.run()
      expect(result.outcome).toBe('normal-profile')
      expect(result.outcome === 'normal-profile' ? result.migration.outcome : undefined)
        .toBe('deferred-failure')
      expect(launch.report).toHaveBeenCalledOnce()
    } finally {
      renameFault.matches = undefined
    }
    expect(await readFile(join(profile, 'package.json'), 'utf8')).toBe(manifestBefore)
    expect(await readFile(join(profile, '.install-complete'), 'utf8'))
      .toBe('legacy-install-fingerprint\n')
    expect(existsSync(join(profile, 'node_modules', 'snapshot-plugin'))).toBe(true)
    expect(existsSync(join(profile, '.generations-pre-migration.json'))).toBe(false)
  })

  it('fails closed when legacy snapshots survive without the journal that proves their origin', async () => {
    const home = await preUpgradeProfile({ 'journal-plugin': '1.0.0' })
    const profile = join(home, 'profiles', 'web')
    await rename(join(profile, 'package.json'), join(profile, 'package.json.pre-generations'))
    expect(await inspectMigrationRecoveryLock(home)).toBe(true)

    const launch = startup(home)
    const result = await launch.run()
    expect(result.outcome).toBe('safe-recovery')
    expect(launch.prepareStore).not.toHaveBeenCalled()
    expect(launch.enforce).not.toHaveBeenCalled()
    expect(launch.prepare).not.toHaveBeenCalled()
    expect(launch.report).not.toHaveBeenCalled()
    expect(existsSync(join(profile, 'package.json.pre-generations'))).toBe(true)
  })

  it('derives the recovery lock from a legacy journal without rewriting recovery evidence', async () => {
    const home = await preUpgradeProfile({ 'journal-plugin': '1.0.0' })
    const profile = join(home, 'profiles', 'web')
    await rename(join(profile, 'node_modules'), join(profile, 'node_modules.pre-generations'))
    await rename(join(profile, 'package.json'), join(profile, 'package.json.pre-generations'))
    const journalPath = join(profile, '.generations-pre-migration.json')
    const legacyJournal = `${JSON.stringify({
      desired: ['legacy-generation'],
      fingerprint: 'legacy-fingerprint'
    }, undefined, 2)}\n`
    await writeFile(journalPath, legacyJournal)

    expect(await inspectMigrationRecoveryLock(home)).toBe(true)
    expect(await readFile(journalPath, 'utf8')).toBe(legacyJournal)
  })

  it('allows only the exact incomplete restore before any startup Profile mutation', async () => {
    const prepareStore = vi.fn(async () => undefined)
    const enforce = vi.fn(async () => undefined)
    const prepare = vi.fn(async () => undefined)
    const migrate = vi.fn(async () => ({ outcome: 'no-op' as const }))
    const report = vi.fn(async () => undefined)

    const result = await runProfileStartupMaintenance({
      note: silent,
      recoverInterruptedMigration: async () => ({ outcome: 'no-snapshot' }),
      incompletePluginRestoreId: async () => 'removal-exact-retry',
      preparePackageStore: prepareStore,
      demoteMarketGeneration: async () => false,
      enforcePendingPluginRemovals: enforce,
      prepareGenerationsForLaunch: prepare,
      shouldDeferProfileMaintenance: async () => false,
      migrateProfileToGenerations: migrate,
      ensureMarketBaseline: async () => undefined,
      reportProfileConsistency: report
    })

    expect(result).toMatchObject({
      outcome: 'safe-recovery',
      allowedRestoreId: 'removal-exact-retry'
    })
    expect(prepareStore).not.toHaveBeenCalled()
    expect(enforce).not.toHaveBeenCalled()
    expect(prepare).not.toHaveBeenCalled()
    expect(migrate).not.toHaveBeenCalled()
    expect(report).not.toHaveBeenCalled()
  })

  it('fails closed when pending-removal enforcement propagates an I/O failure', async () => {
    const prepare = vi.fn(async () => undefined)
    const report = vi.fn(async () => undefined)
    const result = await runProfileStartupMaintenance({
      note: silent,
      recoverInterruptedMigration: async () => ({ outcome: 'no-snapshot' }),
      incompletePluginRestoreId: async () => undefined,
      preparePackageStore: async () => undefined,
      demoteMarketGeneration: async () => false,
      enforcePendingPluginRemovals: async () => {
        throw new Error('EPERM: could not persist the removal ledger')
      },
      prepareGenerationsForLaunch: prepare,
      shouldDeferProfileMaintenance: async () => false,
      migrateProfileToGenerations: async () => ({ outcome: 'no-op' }),
      ensureMarketBaseline: async () => undefined,
      reportProfileConsistency: report
    })

    expect(result).toMatchObject({ outcome: 'safe-recovery' })
    expect(result.outcome === 'safe-recovery' ? result.allowedRestoreId : undefined)
      .toBeUndefined()
    expect(prepare).not.toHaveBeenCalled()
    expect(report).not.toHaveBeenCalled()
  })

  it('fails closed when pending-removal enforcement fails after generation projection', async () => {
    let enforcementAttempt = 0
    const report = vi.fn(async () => undefined)
    const result = await runProfileStartupMaintenance({
      note: silent,
      recoverInterruptedMigration: async () => ({ outcome: 'no-snapshot' }),
      incompletePluginRestoreId: async () => undefined,
      preparePackageStore: async () => undefined,
      demoteMarketGeneration: async () => false,
      enforcePendingPluginRemovals: async () => {
        enforcementAttempt += 1
        if (enforcementAttempt === 2) {
          throw new Error('EBUSY: projected removal could not be verified')
        }
      },
      prepareGenerationsForLaunch: async () => undefined,
      shouldDeferProfileMaintenance: async () => false,
      migrateProfileToGenerations: async () => ({ outcome: 'no-op' }),
      ensureMarketBaseline: async () => undefined,
      reportProfileConsistency: report
    })

    expect(result).toMatchObject({ outcome: 'safe-recovery' })
    expect(result.outcome === 'safe-recovery' ? result.allowedRestoreId : undefined)
      .toBeUndefined()
    expect(enforcementAttempt).toBe(2)
    expect(report).not.toHaveBeenCalled()
  })

  it('fails closed on generation projection failure without running the read-only report', async () => {
    const report = vi.fn(async () => undefined)
    const result = await runProfileStartupMaintenance({
      note: silent,
      recoverInterruptedMigration: async () => ({ outcome: 'no-snapshot' }),
      incompletePluginRestoreId: async () => undefined,
      preparePackageStore: async () => undefined,
      demoteMarketGeneration: async () => false,
      enforcePendingPluginRemovals: async () => undefined,
      prepareGenerationsForLaunch: async () => {
        throw new Error('projection fixture failure')
      },
      shouldDeferProfileMaintenance: async () => false,
      migrateProfileToGenerations: async () => ({ outcome: 'no-op' }),
      ensureMarketBaseline: async () => undefined,
      reportProfileConsistency: report
    })

    expect(result).toMatchObject({ outcome: 'safe-recovery' })
    expect(result.outcome === 'safe-recovery' ? result.allowedRestoreId : undefined)
      .toBeUndefined()
    expect(report).not.toHaveBeenCalled()
  })

  it('keeps a confirmed journal when Windows rm cannot delete a snapshot, then retries cleanup without rolling back', async () => {
    const home = await preUpgradeProfile({ 'dsh-vision-router': '2.0.1' })

    await installPreviousGeneration(home)
    const migration = await migrateProfileToGenerations(deps(home))
    expect(migration.outcome).toBe('migrated')
    expect(await inspectMigrationRecoveryLock(home)).toBe(true)

    rmFault.matches = (path) => path.endsWith('node_modules.pre-generations')
    try {
      expect(await confirmMigration(home, silent)).toBe(false)
    } finally {
      rmFault.matches = undefined
    }

    expect(existsSync(join(home, 'profiles', 'web', 'node_modules.pre-generations'))).toBe(true)
    expect(isProfileMigrated(home)).toBe(true)
    // Cleanup is retryable but the migration decision is already committed;
    // Safe Mode must not lock explicit user recovery on leftover suffixes.
    expect(await inspectMigrationRecoveryLock(home)).toBe(false)
    expect(await recoverInterruptedMigration(home, silent)).toEqual({ outcome: 'no-snapshot' })
    expect(existsSync(join(home, 'profiles', 'web', 'node_modules.pre-generations'))).toBe(false)
    expect(isProfileMigrated(home)).toBe(true)
    expect(await inspectMigrationRecoveryLock(home)).toBe(false)
  })

  it('keeps the awaiting-boot snapshot when health changes before the journal commit', async () => {
    const home = await preUpgradeProfile({ 'dsh-vision-router': '2.0.1' })
    const profile = join(home, 'profiles', 'web')
    const migration = await migrateProfileToGenerations(deps(home))
    expect(migration.outcome).toBe('migrated')

    const healthy = vi.fn()
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
    expect(await confirmMigration(home, silent, healthy)).toBe(false)
    expect(healthy).toHaveBeenCalledTimes(2)
    expect(await inspectMigrationRecoveryLock(home)).toBe(true)
    expect(existsSync(join(profile, 'package.json.pre-generations'))).toBe(true)
    expect(existsSync(join(profile, 'node_modules.pre-generations'))).toBe(true)

    expect(await recoverInterruptedMigration(home, silent)).toEqual({ outcome: 'restored' })
    expect(isProfileMigrated(home)).toBe(false)
    expect(existsSync(join(profile, 'node_modules', 'dsh-vision-router'))).toBe(true)
  })

  it('resumes a rollback crash after snapshot activation even when no migrated live path was quarantined', async () => {
    const home = await preUpgradeProfile({ 'dsh-vision-router': '2.0.1' })
    const profile = join(home, 'profiles', 'web')
    const migration = await migrateProfileToGenerations(deps(home))
    expect(migration.outcome).toBe('migrated')

    const snapshotMarker = join(profile, '.install-complete.pre-generations')
    const liveMarker = join(profile, '.install-complete')
    const journalTemporaryPrefix = join(profile, '.generations-pre-migration.json.')
    writeFault.matches = (path) =>
      path.startsWith(journalTemporaryPrefix) &&
      !existsSync(snapshotMarker) &&
      existsSync(liveMarker)
    try {
      expect(await rollBackMigration(home, silent)).toMatchObject({
        outcome: 'recovery-required'
      })
    } finally {
      writeFault.matches = undefined
    }

    expect(existsSync(snapshotMarker)).toBe(false)
    expect(await readFile(liveMarker, 'utf8')).toBe('legacy-install-fingerprint\n')
    expect(await inspectMigrationRecoveryLock(home)).toBe(true)

    expect(await recoverInterruptedMigration(home, silent)).toEqual({ outcome: 'restored' })
    expect(await readFile(liveMarker, 'utf8')).toBe('legacy-install-fingerprint\n')
    expect(existsSync(join(profile, '.generations-pre-migration.json'))).toBe(false)
  })

  it('confirms a successful migration after a clean launch discards the snapshot only on user-confirmed cleanup', async () => {
    // Confirms the second half of the fix: even after confirmMigration is
    // called on a successful launch, the deferred marker is cleared, and a
    // retry with the same input is a no-op — the launch flow trusts the
    // state without re-running the migration on every start.
    const home = await preUpgradeProfile({ 'dsh-vision-router': '2.0.1' })
    await installPreviousGeneration(home)

    const migrated = await migrateProfileToGenerations(deps(home))
    expect(migrated.outcome).toBe('migrated')

    await confirmMigration(home, silent)
    expect(existsSync(join(home, 'profiles', 'web', 'package.json.pre-generations'))).toBe(false)
    expect(existsSync(join(home, 'profiles', 'web', 'node_modules.pre-generations'))).toBe(false)
    expect(isProfileMigrated(home)).toBe(true)

    // A second migration is a clean no-op.
    expect(await migrateProfileToGenerations(deps(home))).toEqual({ outcome: 'no-op' })
    // Desired generation pointer is preserved (not reset by confirmMigration).
    expect(await readDesired(home)).toContain('previous-generation')
  })
})
