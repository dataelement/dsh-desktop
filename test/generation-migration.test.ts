import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  confirmMigration,
  isProfileMigrated,
  migrateProfileToGenerations,
  rollBackMigration
} from '../src/main/state/generation-migration'
import { listGenerations, readDesired, registryLayout, writeDesired } from '../packages/dsh-desktop-market-installer/generations/registry'

const installCalls: string[] = []

// The installer's pnpm step is stubbed via a module mock so the migration's
// generation installs run offline.
vi.mock('dsh-desktop-market-installer/generations/installer', async () => {
  const actual = await vi.importActual<
    typeof import('../packages/dsh-desktop-market-installer/generations/installer')
  >('../packages/dsh-desktop-market-installer/generations/installer')
  return {
    ...actual,
    installGeneration: async (
      options: Parameters<typeof actual.installGeneration>[0]
    ) => {
      installCalls.push(options.expectedPluginName ?? options.pluginSpec)
      const name = options.expectedPluginName ?? options.pluginSpec.replace(/@[^@/]+$/u, '')
      let version = options.pluginSpec.split('@').at(-1) ?? '0.0.0'
      if (options.sourceDirectory) {
        const source = JSON.parse(await readFile(join(options.sourceDirectory, 'package.json'), 'utf8'))
        version = source.version
      }
      return actual.installGeneration({
        ...options,
        runInstall: async (stagingDir: string) => {
          const pkg = join(stagingDir, 'node_modules', name)
          await mkdir(pkg, { recursive: true })
          await writeFile(
            join(pkg, 'package.json'),
            JSON.stringify({ name, version, dsh: { bundle: { patch: 'cordis.patch.yml' } } })
          )
          await writeFile(join(pkg, 'cordis.patch.yml'), '[]\n')
          await writeFile(join(stagingDir, 'pnpm-lock.yaml'), `lock-${name}-${version}\n`)
          return { code: 0, output: 'Done' }
        }
      })
    }
  }
})

describe('one-time profile migration to generations', () => {
  const homes: string[] = []
  const silent = (): void => undefined

  async function preUpgradeProfile(
    plugins: Record<string, string>,
    specs: Record<string, string> = {}
  ): Promise<string> {
    const home = await mkdtemp(join(tmpdir(), 'dsh-migrate-'))
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
      JSON.stringify({ name: 'dsh-profile-web', private: true, dependencies, dsh: { profile: { bundles } } })
    )
    await writeFile(join(dir, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n')
    // the shared-tree closure a generation resolves peers against
    await mkdir(join(home, 'profiles', 'node_modules'), { recursive: true })
    return home
  }

  function deps(home: string, reinstall = async () => ({ ok: true })) {
    return {
      dshHome: home,
      nodeExecutablePath: 'node',
      pnpmEntryPath: 'pnpm',
      dshEntryPath: 'bin.js',
      note: silent,
      reinstallSharedTree: reinstall
    }
  }

  afterEach(async () => {
    await Promise.all(homes.map((home) => rm(home, { recursive: true, force: true })))
    homes.length = 0
    installCalls.length = 0
  })

  it('moves community plugins to generations and trims the manifest', async () => {
    const home = await preUpgradeProfile({ 'dsh-vision-router': '2.0.1', 'plugin-two': '1.4.0' })

    const migrated = await migrateProfileToGenerations(deps(home))

    expect(migrated).toBe(true)
    expect(isProfileMigrated(home)).toBe(true)

    const manifest = JSON.parse(
      await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8')
    )
    // dependencies keep only the shared-tree package
    expect(manifest.dependencies.dshmarket).toBe('^1.35.0'); expect(manifest.dependencies['dsh-vision-router']).toMatch(/^link:/u)
    // bundles carry the in-box set plus the migrated plugin names
    expect(manifest.dsh.profile.bundles).toEqual([
      '@deepseek-ai/dsh-base',
      '@deepseek-ai/dsh-web-app',
      'dsh-vision-router',
      'plugin-two'
    ])

    const desired = await readDesired(home)
    expect(desired).toHaveLength(2)
    expect(desired.some((id) => id.startsWith('dsh-vision-router+2.0.1+'))).toBe(true)

    // the projected link resolves the plugin
    const link = join(home, 'profiles', 'web', 'node_modules', 'dsh-vision-router', 'package.json')
    expect(existsSync(link)).toBe(true)
  })

  it('is a no-op and self-marks when there are no community plugins', async () => {
    const home = await preUpgradeProfile({})
    const migrated = await migrateProfileToGenerations(deps(home))
    expect(migrated).toBe(false)
    expect(isProfileMigrated(home)).toBe(true)
    expect(await readDesired(home)).toEqual([])
  })

  it('restores the pre-upgrade profile when the shared-tree rebuild fails', async () => {
    const home = await preUpgradeProfile({ 'dsh-vision-router': '2.0.1' })
    const before = await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8')

    const migrated = await migrateProfileToGenerations(
      deps(home, async () => ({ ok: false, detail: 'pnpm blew up' }))
    )

    expect(migrated).toBe(false)
    expect(isProfileMigrated(home)).toBe(false)
    // manifest and node_modules are back
    expect(await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8')).toBe(before)
    expect(existsSync(join(home, 'profiles', 'web', 'node_modules', 'dsh-vision-router'))).toBe(true)
  })

  it('copies non-registry sources exactly and retains their original provenance', async () => {
    const home = await preUpgradeProfile(
      { 'source-plugin': '1.0.0' },
      { 'source-plugin': 'github:example/source-plugin#main' }
    )

    expect(await migrateProfileToGenerations(deps(home))).toBe(true)

    expect((await listGenerations(home)).find((item) => item.pluginName === 'source-plugin')).toMatchObject({
      pluginName: 'source-plugin',
      version: '1.0.0',
      sourceSpec: 'github:example/source-plugin#main'
    })
  })

  it('defers an identical failed migration, preserves desired, and retries after the profile changes', async () => {
    const home = await preUpgradeProfile({ 'plugin-one': '1.0.0' })
    await mkdir(registryLayout(home).root, { recursive: true })
    await writeDesired(home, ['previous-generation'])
    const failing = deps(home, async () => ({ ok: false, detail: 'shared tree failed' }))

    expect(await migrateProfileToGenerations(failing)).toBe(false)
    expect(await readDesired(home)).toEqual(['previous-generation'])
    expect(existsSync(join(home, 'profiles', 'web', 'node_modules', 'plugin-one'))).toBe(true)
    const firstAttempts = installCalls.length

    expect(await migrateProfileToGenerations(deps(home))).toBe(false)
    expect(installCalls).toHaveLength(firstAttempts)

    const manifestPath = join(home, 'profiles', 'web', 'package.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    manifest.dependencies['plugin-one'] = '~1.0.0'
    await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`)
    expect(await migrateProfileToGenerations(deps(home))).toBe(true)
    expect(installCalls.length).toBeGreaterThan(firstAttempts)
  })

  it('defers an unreadable installed plugin without touching the active profile or retrying unchanged input', async () => {
    const home = await preUpgradeProfile({ 'broken-plugin': '1.0.0' })
    const installedManifest = join(
      home,
      'profiles',
      'web',
      'node_modules',
      'broken-plugin',
      'package.json'
    )
    await writeFile(installedManifest, '{broken json')

    expect(await migrateProfileToGenerations(deps(home))).toBe(false)
    expect(isProfileMigrated(home)).toBe(false)
    expect(existsSync(join(home, 'profiles', 'web', 'node_modules', 'broken-plugin'))).toBe(true)
    expect(installCalls).toHaveLength(0)

    expect(await migrateProfileToGenerations(deps(home))).toBe(false)
    expect(installCalls).toHaveLength(0)

    await writeFile(installedManifest, JSON.stringify({ name: 'broken-plugin', version: '1.0.0' }))
    expect(await migrateProfileToGenerations(deps(home))).toBe(true)
    expect(installCalls).toEqual(['broken-plugin'])
  })

  it('rolls a migrated profile back to the snapshot on a failed launch, then discards it on a good one', async () => {
    const home = await preUpgradeProfile({ 'dsh-vision-router': '2.0.1' })
    await mkdir(registryLayout(home).root, { recursive: true })
    await writeDesired(home, ['previous-generation'])
    await migrateProfileToGenerations(deps(home))

    // failed launch → roll back
    const rolled = await rollBackMigration(home, silent)
    expect(rolled).toBe(true)
    expect(isProfileMigrated(home)).toBe(false)
    expect(await readDesired(home)).toEqual(['previous-generation'])
    const manifest = JSON.parse(
      await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8')
    )
    expect(manifest.dependencies['dsh-vision-router']).toBe('^2.0.1') // snapshot restored the pre-upgrade version spec

    // A profile edit changes the fingerprint, so migration can be tried again and confirmed.
    const manifestPath = join(home, 'profiles', 'web', 'package.json')
    const changed = JSON.parse(await readFile(manifestPath, 'utf8'))
    changed.dependencies['dsh-vision-router'] = '~2.0.1'
    await writeFile(manifestPath, `${JSON.stringify(changed)}\n`)
    await migrateProfileToGenerations(deps(home))
    await confirmMigration(home, silent)
    expect(existsSync(join(home, 'profiles', 'web', 'package.json.pre-generations'))).toBe(false)
    expect(existsSync(join(home, 'profiles', 'web', 'node_modules.pre-generations'))).toBe(false)
  })
})
