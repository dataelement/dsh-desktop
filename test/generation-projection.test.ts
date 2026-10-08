import { existsSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { lstat, mkdir, mkdtemp, readFile, readlink, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { projectGenerations, publishGenerationManifest } from '../packages/dsh-desktop-market-installer/generations/projection'
import { suspendGenerationProjectionForPnpm } from '../packages/dsh-desktop-market-installer/pnpm-runner.mjs'
import {
  ensureRegistryDirectories,
  registryLayout,
  writeDesired,
  writeGenerationMeta
} from '../packages/dsh-desktop-market-installer/generations/registry'

const generationMetaReadFault: {
  matches?: (path: string) => boolean
} = vi.hoisted(() => ({}))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  const actualReadFile = actual.readFile as (...args: any[]) => Promise<any>
  return {
    ...actual,
    readFile: async (path: Parameters<typeof actual.readFile>[0], ...args: any[]) => {
      if (
        generationMetaReadFault.matches &&
        typeof path === 'string' &&
        generationMetaReadFault.matches(path)
      ) {
        throw Object.assign(new Error('EPERM: generation.json is temporarily locked'), {
          code: 'EPERM'
        })
      }
      return actualReadFile(path, ...args)
    }
  }
})

describe('generation projection onto the app-boot contract', () => {
  const execFileAsync = promisify(execFile)
  const pnpmEntry = join(dirname(createRequire(import.meta.url).resolve('pnpm')), 'bin', 'pnpm.cjs')
  const pnpmRunner = fileURLToPath(
    new URL('../packages/dsh-desktop-market-installer/pnpm-runner.mjs', import.meta.url)
  )
  const homes: string[] = []

  async function freshHome(): Promise<string> {
    const home = await mkdtemp(join(tmpdir(), 'dsh-projection-'))
    homes.push(home)
    return home
  }

  async function fakeGeneration(
    home: string,
    id: string,
    pluginName: string,
    version: string
  ): Promise<void> {
    const dir = join(registryLayout(home).generations, id)
    const pkg = join(dir, 'node_modules', pluginName)
    await mkdir(pkg, { recursive: true })
    await writeFile(
      join(pkg, 'package.json'),
      JSON.stringify({ name: pluginName, version, dsh: { bundle: { patch: 'cordis.patch.yml' } } })
    )
    await writeFile(join(pkg, 'cordis.patch.yml'), '[]\n')
    await writeGenerationMeta(dir, { pluginName, version })
  }

  async function initProfile(home: string): Promise<void> {
    const dir = join(home, 'profiles', 'web')
    await mkdir(join(dir, 'node_modules', 'dshmarket'), { recursive: true })
    await writeFile(
      join(dir, 'node_modules', 'dshmarket', 'package.json'),
      JSON.stringify({ name: 'dshmarket', version: '1.35.0', dsh: { bundle: { patch: './cordis.patch.yml' } } })
    )
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'dsh-profile-web',
        private: true,
        dependencies: { dshmarket: '^1.35.0' },
        dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dshmarket'] } }
      })
    )
  }

  afterEach(async () => {
    generationMetaReadFault.matches = undefined
    await Promise.all(homes.map((home) => rm(home, { recursive: true, force: true })))
    homes.length = 0
  })

  it('links enabled generations into the profile node_modules and lists them as bundles', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await initProfile(home)
    await fakeGeneration(home, 'sidebar+0.17.1+aaaa', 'dsh-better-sidebar', '0.17.1')
    await fakeGeneration(home, 'pet+1.0.0+bbbb', '@linxin666/dsh-pet', '1.0.0')
    await writeDesired(home, ['sidebar+0.17.1+aaaa', 'pet+1.0.0+bbbb'])

    const result = await projectGenerations(home)

    expect(result.linked.sort()).toEqual(['@linxin666/dsh-pet', 'dsh-better-sidebar'])

    const link = join(home, 'profiles', 'web', 'node_modules', 'dsh-better-sidebar')
    expect((await lstat(link)).isSymbolicLink()).toBe(true)
    const linkedManifest = JSON.parse(
      await readFile(join(link, 'package.json'), 'utf8')
    )
    expect(linkedManifest.dsh.bundle.patch).toBe('cordis.patch.yml')

    const manifest = JSON.parse(
      await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8')
    )
    // in-box bundles + the bundle-declaring dependency (dshmarket) stay in
    // front, enabled plugins follow
    expect(manifest.dsh.profile.bundles).toEqual([
      '@deepseek-ai/dsh-base',
      '@deepseek-ai/dsh-web-app',
      'dshmarket',
      '@linxin666/dsh-pet',
      'dsh-better-sidebar'
    ])
    expect(manifest.dependencies['dsh-better-sidebar']).toBe('0.17.1')
    expect(manifest.pnpm.overrides['dsh-better-sidebar']).toMatch(/^link:/u)
    expect(manifest.dsh.desktop.generationProjection.plugins['dsh-better-sidebar']).toMatchObject({
      generationId: 'sidebar+0.17.1+aaaa',
      visibleVersion: '0.17.1'
    })
    expect(manifest.dependencies.dshmarket).toBe('^1.35.0')
  })

  it.each(['cold-start', 'manifest-publication'])('preserves selected host bundles during %s projection', async (mode) => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await initProfile(home)
    const manifestPath = join(home, 'profiles', 'web', 'package.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    const official = '@deepseek-ai/dsh-experimental-schedule-bundle'
    manifest.dsh.profile.bundles.push(official)
    await writeFile(manifestPath, JSON.stringify(manifest))
    await fakeGeneration(home, 'a+1+x', 'plugin-a', '1.0.0')
    await writeDesired(home, ['a+1+x'])

    for (let launch = 0; launch < 2; launch++) {
      if (mode === 'cold-start') await projectGenerations(home)
      else await publishGenerationManifest(home, 'web', { syncBundles: true })
      const projected = JSON.parse(await readFile(manifestPath, 'utf8'))
      expect(projected.dsh.profile.bundles).toEqual([...manifest.dsh.profile.bundles, 'plugin-a'])
      expect(projected.dependencies).not.toHaveProperty(official)
      expect(projected.dsh.desktop.generationProjection.plugins).not.toHaveProperty(official)
    }

    const disabled = JSON.parse(await readFile(manifestPath, 'utf8'))
    disabled.dsh.profile.bundles = disabled.dsh.profile.bundles.filter((name: string) => name !== official)
    await writeFile(manifestPath, JSON.stringify(disabled))
    await projectGenerations(home)
    expect(JSON.parse(await readFile(manifestPath, 'utf8')).dsh.profile.bundles).not.toContain(official)
  })

  it('loads the selected official bundle in fresh Harness profile-loader processes after projection', async () => {
    const home = await freshHome()
    const profileDir = join(home, 'profiles', 'web')
    const official = '@deepseek-ai/dsh-experimental-schedule-bundle'
    await mkdir(profileDir, { recursive: true })
    await writeFile(join(profileDir, 'package.json'), JSON.stringify({
      name: 'dsh-profile-web', private: true, dependencies: {},
      dsh: { profile: { bundles: [official] } }
    }))
    const projectionUrl = new URL('../packages/dsh-desktop-market-installer/generations/projection.mjs', import.meta.url).href
    const anchor = createRequire(import.meta.url).resolve('@deepseek-ai/dsh-app-boot')
    const script = [
      'import { projectGenerations } from ' + JSON.stringify(projectionUrl),
      'import { loadProfile } from ' + JSON.stringify(pathToFileURL(anchor).href),
      'await projectGenerations(process.argv[1])',
      'const profile = loadProfile("dsh", "web", process.argv[2], process.argv[1])',
      'console.log(JSON.stringify(profile.layers.map((layer) => layer.packageName)))'
    ].join('\n')
    for (let launch = 0; launch < 2; launch++) {
      const { stdout } = await execFileAsync(process.execPath, ['--input-type=module', '-e', script, home, anchor])
      expect(JSON.parse(stdout)).toContain(official)
    }
    const marketDir = join(profileDir, '.dsh-market')
    await mkdir(marketDir, { recursive: true })
    const disabledState = JSON.stringify({ disabled: [official] })
    await writeFile(join(marketDir, 'state.json'), disabledState)
    const { stdout } = await execFileAsync(process.execPath, ['--input-type=module', '-e', script, home, anchor])
    expect(JSON.parse(stdout)).not.toContain(official)
    expect(await readFile(join(marketDir, 'state.json'), 'utf8')).toBe(disabledState)
  })

  it.each(['generation-marker', 'legacy-link'])('clears retired %s selections before metadata-only publication loses ownership', async (ownership) => {
    const home = await freshHome()
    await initProfile(home)
    const manifestPath = join(home, 'profiles', 'web', 'package.json')
    const official = '@deepseek-ai/dsh-experimental-schedule-bundle'
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    manifest.dsh.profile.bundles.push(official)
    await writeFile(manifestPath, JSON.stringify(manifest))
    if (ownership === 'generation-marker') {
      await fakeGeneration(home, 'a+1+x', 'plugin-a', '1.0.0')
      await writeDesired(home, ['a+1+x'])
      await projectGenerations(home)
      await writeDesired(home, [])
    } else {
      manifest.dsh.profile.bundles.push('plugin-a')
      manifest.dependencies['plugin-a'] = 'link:../.generations/live/old/node_modules/plugin-a'
      await writeFile(manifestPath, JSON.stringify(manifest))
    }

    await publishGenerationManifest(home)
    await projectGenerations(home)

    const projected = JSON.parse(await readFile(manifestPath, 'utf8'))
    expect(projected.dsh.profile.bundles).toContain(official)
    expect(projected.dsh.profile.bundles).not.toContain('plugin-a')
    expect(projected.dependencies).not.toHaveProperty('plugin-a')
  })

  it('removes legacy generation selections without dropping host selections', async () => {
    const home = await freshHome()
    await initProfile(home)
    const manifestPath = join(home, 'profiles', 'web', 'package.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    const official = '@deepseek-ai/dsh-experimental-schedule-bundle'
    manifest.dsh.profile.bundles.push(official, 'legacy-plugin', 'override-plugin')
    manifest.dependencies['legacy-plugin'] = 'link:../.generations/live/legacy/node_modules/legacy-plugin'
    manifest.pnpm = { overrides: { 'override-plugin': 'link:../.generations/live/old/node_modules/override-plugin' } }
    await writeFile(manifestPath, JSON.stringify(manifest))

    await projectGenerations(home)

    const projected = JSON.parse(await readFile(manifestPath, 'utf8'))
    expect(projected.dsh.profile.bundles).toEqual([
      '@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dshmarket', official
    ])
    expect(projected.dependencies).not.toHaveProperty('legacy-plugin')
    expect(projected.pnpm?.overrides).toBeUndefined()
  })

  it('drops the link and the bundle entry when a plugin stops being desired', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await initProfile(home)
    await fakeGeneration(home, 'a+1+x', 'plugin-a', '1.0.0')
    await fakeGeneration(home, 'b+2+y', 'plugin-b', '2.0.0')

    await writeDesired(home, ['a+1+x', 'b+2+y'])
    await projectGenerations(home)

    // user removes plugin-b
    await writeDesired(home, ['a+1+x'])
    const result = await projectGenerations(home)

    expect(result.unlinked).toEqual(['plugin-b'])
    expect(existsSync(join(home, "profiles", "web", "node_modules", "plugin-b"))).toBe(false)
    const manifest = JSON.parse(
      await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8')
    )
    expect(manifest.dsh.profile.bundles).not.toContain('plugin-b')
    expect(manifest.dependencies['plugin-b']).toBeUndefined()
    expect(manifest.pnpm?.overrides?.['plugin-b']).toBeUndefined()
    expect(manifest.dsh.desktop?.generationProjection?.plugins?.['plugin-b']).toBeUndefined()
  })

  it('restores a profile-owned pnpm override after the generation is disabled', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await initProfile(home)
    const manifestPath = join(home, 'profiles', 'web', 'package.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    manifest.pnpm = { overrides: { 'plugin-a': '1.0.1', unrelated: '3.0.0' } }
    await writeFile(manifestPath, JSON.stringify(manifest))
    await fakeGeneration(home, 'a+1+x', 'plugin-a', '1.0.0')

    await writeDesired(home, ['a+1+x'])
    await projectGenerations(home)
    let projected = JSON.parse(await readFile(manifestPath, 'utf8'))
    expect(projected.pnpm.overrides['plugin-a']).toMatch(/^link:/u)
    expect(projected.pnpm.overrides.unrelated).toBe('3.0.0')

    await writeDesired(home, [])
    await projectGenerations(home)
    projected = JSON.parse(await readFile(manifestPath, 'utf8'))
    expect(projected.pnpm.overrides['plugin-a']).toBe('1.0.1')
    expect(projected.pnpm.overrides.unrelated).toBe('3.0.0')
  })

  it('keeps projected generations outside pnpm while the manifest exposes a version', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    const dir = join(home, 'profiles', 'web')
    await mkdir(dir, { recursive: true })
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'dsh-profile-web', private: true, dependencies: {}, dsh: { profile: { bundles: [] } } })
    )
    await fakeGeneration(home, 'a+1+x', 'plugin-a', '1.0.0')
    await writeDesired(home, ['a+1+x'])
    await projectGenerations(home)
    const link = join(dir, 'node_modules', 'plugin-a')
    const targetBefore = await readlink(link)

    const result = await execFileAsync(
      process.execPath,
      [pnpmRunner, pnpmEntry, 'install', '--ignore-scripts', '--no-frozen-lockfile', '--offline'],
      { cwd: dir }
    )

    expect(result.stderr).toContain('excluded 1 generation projection(s) from pnpm')
    expect(result.stderr).toContain('restored 1 generation projection(s) after pnpm')
    const manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
    expect(manifest.dependencies['plugin-a']).toBe('1.0.0')
    expect(await readlink(link)).toBe(targetBefore)
    const installed = JSON.parse(await readFile(join(link, 'package.json'), 'utf8'))
    expect(installed.version).toBe('1.0.0')
    expect(await readFile(join(dir, 'pnpm-lock.yaml'), 'utf8')).not.toContain('plugin-a')
  })

  it('reconstructs market-facing fields at cold start after an interrupted pnpm run', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    const dir = join(home, 'profiles', 'web')
    await mkdir(dir, { recursive: true })
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'dsh-profile-web', dependencies: {}, dsh: { profile: { bundles: [] } } })
    )
    await fakeGeneration(home, 'a+1+x', 'plugin-a', '1.0.0')
    await writeDesired(home, ['a+1+x'])
    await projectGenerations(home)

    const isolation = await suspendGenerationProjectionForPnpm(dir)
    expect(isolation.plugins).toEqual(['plugin-a'])
    const interrupted = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
    expect(interrupted.dependencies['plugin-a']).toBeUndefined()
    expect(interrupted.dsh.desktop.generationProjection.plugins).toHaveProperty('plugin-a')

    await projectGenerations(home)
    const repaired = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
    expect(repaired.dependencies['plugin-a']).toBe('1.0.0')
    expect(repaired.pnpm.overrides['plugin-a']).toMatch(/^link:/u)
  })

  it('never touches a real pnpm-managed directory in node_modules', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await initProfile(home)
    const realDir = join(home, 'profiles', 'web', 'node_modules', 'dshmarket')
    await mkdir(realDir, { recursive: true })
    await writeFile(join(realDir, 'package.json'), JSON.stringify({ name: 'dshmarket', version: '1.35.0' }))

    await writeDesired(home, [])
    await projectGenerations(home)

    // still a real directory, still readable
    expect((await lstat(realDir)).isDirectory()).toBe(true)
    expect((await lstat(realDir)).isSymbolicLink()).toBe(false)
  })

  it('does not overwrite or project links onto an existing corrupt profile manifest', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await fakeGeneration(home, 'keep+1+x', 'keeper', '1.0.0')
    await writeDesired(home, ['keep+1+x'])
    const profile = join(home, 'profiles', 'web')
    const manifestPath = join(profile, 'package.json')
    const corrupt = '{"name":"dsh-profile-web",broken\n'
    await mkdir(profile, { recursive: true })
    await writeFile(manifestPath, corrupt, 'utf8')

    await expect(projectGenerations(home)).rejects.toThrow(/Profile manifest is invalid JSON/u)
    expect(await readFile(manifestPath, 'utf8')).toBe(corrupt)
    expect(existsSync(join(profile, 'node_modules', 'keeper'))).toBe(false)
  })

  async function projectedProfileForMetadataFailure(kind: string): Promise<{
    home: string
    generationDirectory: string
    manifestPath: string
    manifestBefore: string
    linkPath: string
    linkTarget: string
  }> {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await initProfile(home)
    const id = `${kind}+1+x`
    await fakeGeneration(home, id, `${kind}-plugin`, '1.0.0')
    await writeDesired(home, [id])
    await projectGenerations(home)
    const generationDirectory = join(registryLayout(home).generations, id)
    const manifestPath = join(home, 'profiles', 'web', 'package.json')
    const linkPath = join(home, 'profiles', 'web', 'node_modules', `${kind}-plugin`)
    return {
      home,
      generationDirectory,
      manifestPath,
      manifestBefore: await readFile(manifestPath, 'utf8'),
      linkPath,
      linkTarget: await readlink(linkPath)
    }
  }

  async function expectProjectionFailurePreservesProfile(
    fixture: Awaited<ReturnType<typeof projectedProfileForMetadataFailure>>,
    message: RegExp
  ): Promise<void> {
    await expect(projectGenerations(fixture.home)).rejects.toThrow(message)
    expect(await readFile(fixture.manifestPath, 'utf8')).toBe(fixture.manifestBefore)
    expect((await lstat(fixture.linkPath)).isSymbolicLink()).toBe(true)
    expect(await readlink(fixture.linkPath)).toBe(fixture.linkTarget)
  }

  it('preserves the existing projection when desired generation metadata is temporarily unreadable', async () => {
    const fixture = await projectedProfileForMetadataFailure('locked')
    generationMetaReadFault.matches = (path) =>
      path === join(fixture.generationDirectory, 'generation.json')

    await expectProjectionFailurePreservesProfile(fixture, /Generation metadata could not be read/u)
  })

  it('preserves the existing projection when generation metadata contains invalid JSON', async () => {
    const fixture = await projectedProfileForMetadataFailure('broken')
    await writeFile(join(fixture.generationDirectory, 'generation.json'), '{broken metadata\n', 'utf8')

    await expectProjectionFailurePreservesProfile(fixture, /Generation metadata is invalid JSON/u)
  })

  it('preserves the existing projection when generation metadata contains an unsafe package name', async () => {
    const fixture = await projectedProfileForMetadataFailure('unsafe')
    await writeFile(
      join(fixture.generationDirectory, 'generation.json'),
      JSON.stringify({ pluginName: '../../outside', version: '1.0.0' }),
      'utf8'
    )

    await expectProjectionFailurePreservesProfile(fixture, /safe npm package name/u)
  })

  it('preserves the existing projection when a desired generation loses its package root', async () => {
    const fixture = await projectedProfileForMetadataFailure('missing-root')
    await rm(
      join(fixture.generationDirectory, 'node_modules', 'missing-root-plugin'),
      { recursive: true, force: true }
    )

    await expectProjectionFailurePreservesProfile(
      fixture,
      /Enabled generation package root is missing or unreadable/u
    )
  })
})
