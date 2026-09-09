import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PROFILE_TEMPLATES } from '@deepseek-ai/dsh-app-boot'
import { afterEach, describe, expect, it } from 'vitest'
import {
  isProjectedGenerationPlugin,
  prepareGenerationsForLaunch,
  uninstallGenerationPlugin
} from '../src/main/state/generation-launch'
import {
  ensureRegistryDirectories,
  readDesired,
  registryLayout,
  writeDesired,
  writeGenerationMeta
} from '../packages/dsh-desktop-market-installer/generations/registry'

describe('the launch-process half of the generation model', () => {
  const homes: string[] = []
  const silent = (): void => undefined

  async function freshHome(): Promise<string> {
    const home = await mkdtemp(join(tmpdir(), 'dsh-genlaunch-'))
    homes.push(home)
    await mkdir(join(home, 'profiles', 'web'), { recursive: true })
    await writeFile(
      join(home, 'profiles', 'web', 'package.json'),
      JSON.stringify({
        name: 'dsh-profile-web',
        private: true,
        dependencies: {},
        dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } }
      })
    )
    return home
  }

  async function fakeGeneration(home: string, id: string, pluginName: string): Promise<void> {
    const dir = join(registryLayout(home).generations, id)
    const pkg = join(dir, 'node_modules', pluginName)
    await mkdir(pkg, { recursive: true })
    await writeFile(
      join(pkg, 'package.json'),
      JSON.stringify({ name: pluginName, version: '1.0.0', dsh: { bundle: { patch: 'p.yml' } } })
    )
    await writeGenerationMeta(dir, { pluginName, version: '1.0.0' })
  }

  afterEach(async () => {
    await Promise.all(homes.map((home) => rm(home, { recursive: true, force: true })))
    homes.length = 0
  })

  it('initializes a missing web profile from the shipped template before projection', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-genlaunch-empty-'))
    homes.push(home)

    await prepareGenerationsForLaunch(home, silent)

    const profileDir = join(home, 'profiles', 'web')
    const manifest = JSON.parse(await readFile(join(profileDir, 'package.json'), 'utf8'))
    const template = PROFILE_TEMPLATES.web
    expect(template).toBeDefined()
    expect(manifest.dsh.profile.bundles).toEqual(template?.bundles)
    expect(await readFile(join(profileDir, 'cordis.patch.yml'), 'utf8')).toContain('[]')
    expect(await readFile(join(profileDir, 'pnpm-workspace.yaml'), 'utf8')).toContain(
      'nodeLinker: hoisted'
    )
  })

  it('is a no-op on a profile that has never used a generation', async () => {
    const home = await freshHome()
    await expect(prepareGenerationsForLaunch(home, silent)).resolves.toBeUndefined()
    expect(await readDesired(home)).toEqual([])
  })

  it('does not wire failed Harness startup to a generation-set rollback', async () => {
    const main = await readFile('src/main/index.ts', 'utf8')
    expect(main).not.toContain('rollBackToLastKnownGood')
    expect(main).not.toContain('desiredIsUntried')
    expect(main).toContain("A failed launch must not rewrite the user's enabled plugin set")
  })

  it('sweeps an unreferenced generation and projects the desired one on launch', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await fakeGeneration(home, 'keep+1+x', 'keeper')
    await fakeGeneration(home, 'orphan+2+y', 'orphan')
    await writeDesired(home, ['keep+1+x'])
    await mkdir(join(registryLayout(home).staging, 'leftover'), { recursive: true })

    await prepareGenerationsForLaunch(home, silent)

    // orphan gone, staging cleared, keeper linked
    const { existsSync } = await import('node:fs')
    expect(existsSync(join(registryLayout(home).generations, 'orphan+2+y'))).toBe(false)
    expect(existsSync(join(registryLayout(home).staging, 'leftover'))).toBe(false)
    expect(existsSync(join(home, 'profiles', 'web', 'node_modules', 'keeper'))).toBe(true)
    const manifest = JSON.parse(await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8'))
    expect(manifest.dsh.profile.bundles).toContain('keeper')
  })

  it('knows a generation install from a plain manifest one', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await fakeGeneration(home, 'dshmarket+1.44.0+af88ab682bc0', 'dshmarket')
    await writeDesired(home, ['dshmarket+1.44.0+af88ab682bc0'])

    expect(await isProjectedGenerationPlugin(home, 'dshmarket')).toBe(true)
    expect(await isProjectedGenerationPlugin(home, 'never-installed')).toBe(false)
  })

  it('does not reproject an uninstalled market generation on the next launch (#330)', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await fakeGeneration(home, 'dshmarket+1.44.0+af88ab682bc0', 'dshmarket')
    await writeDesired(home, ['dshmarket+1.44.0+af88ab682bc0'])
    await prepareGenerationsForLaunch(home, silent)

    const profile = join(home, 'profiles', 'web')
    const { existsSync } = await import('node:fs')
    expect(existsSync(join(profile, 'node_modules', 'dshmarket'))).toBe(true)

    expect(await uninstallGenerationPlugin(home, 'dshmarket', silent)).toBe(true)
    // The restart that follows the uninstall is what used to bring it back.
    await prepareGenerationsForLaunch(home, silent)

    expect(await readDesired(home)).toEqual([])
    const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
    expect(Object.keys(manifest.dependencies ?? {})).not.toContain('dshmarket')
    expect(manifest.dsh.profile.bundles).not.toContain('dshmarket')
    expect(manifest.pnpm?.overrides ?? {}).not.toHaveProperty('dshmarket')
    expect(existsSync(join(profile, 'node_modules', 'dshmarket'))).toBe(false)
  })

  it('reprojects a generation that only a pnpm-level removal touched (#330)', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await fakeGeneration(home, 'dshmarket+1.44.0+af88ab682bc0', 'dshmarket')
    await writeDesired(home, ['dshmarket+1.44.0+af88ab682bc0'])
    await prepareGenerationsForLaunch(home, silent)

    // Exactly what `dsh plugin remove --workspace-root dshmarket` leaves
    // behind: the manifest rows are gone, `desired` is untouched.
    const manifestPath = join(home, 'profiles', 'web', 'package.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    delete manifest.dependencies.dshmarket
    delete manifest.pnpm?.overrides?.dshmarket
    manifest.dsh.profile.bundles = manifest.dsh.profile.bundles.filter(
      (name: string) => name !== 'dshmarket'
    )
    await writeFile(manifestPath, JSON.stringify(manifest))

    await prepareGenerationsForLaunch(home, silent)

    // Back, in full — this is the bug the generation branch exists to avoid.
    const reprojected = JSON.parse(await readFile(manifestPath, 'utf8'))
    expect(await readDesired(home)).toEqual(['dshmarket+1.44.0+af88ab682bc0'])
    expect(reprojected.dsh.profile.bundles).toContain('dshmarket')
  })

  it('uninstalls the market through the generation path rather than pnpm alone', async () => {
    const main = await readFile('src/main/index.ts', 'utf8')
    const uninstall = main.slice(
      main.indexOf('async function disableMarketGeneration'),
      main.indexOf('function registerHarnessHandlers')
    )
    expect(uninstall).toContain('isProjectedGenerationPlugin')
    expect(uninstall).toContain('uninstallGenerationPlugin')
    // The pnpm removal stays, for a profile that never used a generation.
    expect(uninstall).toContain('removeProfilePluginWithDsh')
  })

  it('does not retain or restore generations from a stale rollback pointer', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await fakeGeneration(home, 'keep+1+x', 'keeper')
    await fakeGeneration(home, 'old+1+y', 'old-plugin')
    await writeDesired(home, ['keep+1+x'])
    await writeFile(
      join(registryLayout(home).root, 'last-known-good.json'),
      `${JSON.stringify(['old+1+y'])}\n`,
      'utf8'
    )

    await prepareGenerationsForLaunch(home, silent)

    const { existsSync } = await import('node:fs')
    expect(await readDesired(home)).toEqual(['keep+1+x'])
    expect(existsSync(join(registryLayout(home).generations, 'old+1+y'))).toBe(false)
    expect(existsSync(join(registryLayout(home).generations, 'keep+1+x'))).toBe(true)
  })
})
