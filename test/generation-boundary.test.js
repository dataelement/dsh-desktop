import { lstat, mkdir, mkdtemp, readFile, readlink, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDesktopPnpmService } from '../packages/dsh-desktop-market-installer/index.js'
import { installGeneration } from '../packages/dsh-desktop-market-installer/generations/installer.mjs'
import { projectGenerations } from '../packages/dsh-desktop-market-installer/generations/projection.mjs'
import {
  listGenerations,
  readDesired
} from '../packages/dsh-desktop-market-installer/generations/registry.mjs'

/**
 * `runExternalMarketPluginInstall` is the boundary dsh-market 1.6+
 * feature-detects for `add`. These drive it through a stubbed pnpm so they run
 * anywhere; the live pnpm path is covered by scripts/generation-poc.mjs.
 */
describe('the market install boundary', () => {
  const homes = []

  async function freshHome() {
    const home = await mkdtemp(join(tmpdir(), 'dsh-boundary-'))
    homes.push(home)
    await mkdir(join(home, 'profiles', 'web'), { recursive: true })
    await writeFile(
      join(home, 'profiles', 'web', 'package.json'),
      JSON.stringify({
        name: 'dsh-profile-web',
        private: true,
        dependencies: { dshmarket: '^1.35.0' },
        dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dshmarket'] } }
      })
    )
    return home
  }

  afterEach(async () => {
    await Promise.all(homes.map((home) => rm(home, { recursive: true, force: true })))
    homes.length = 0
  })

  function drainHandle(handle) {
    let stdout = ''
    let stderr = ''
    handle.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    handle.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    return handle.done.then(({ exitCode }) => ({ exitCode, stdout, stderr }))
  }

  /** A stub that populates a staging node_modules the way pnpm would. */
  function stubGenerationInstall(pluginName, version) {
    return async (stagingDir) => {
      const pkg = join(stagingDir, 'node_modules', pluginName)
      await mkdir(pkg, { recursive: true })
      await writeFile(
        join(pkg, 'package.json'),
        JSON.stringify({ name: pluginName, version, dsh: { bundle: { patch: 'cordis.patch.yml' } } })
      )
      await writeFile(join(pkg, 'cordis.patch.yml'), '[]\n')
      await writeFile(join(stagingDir, 'pnpm-lock.yaml'), `lock-${pluginName}-${version}\n`)
      return { code: 0, output: 'Done in 3.1s' }
    }
  }

  function service(home, runGenerationInstall) {
    return createDesktopPnpmService({
      binDirectory: join(home, '.desktop-bin'),
      dshEntryPath: join(home, 'bin.js'),
      executablePath: process.execPath,
      home,
      runGenerationInstall
    })
  }

  it('exposes the boundary method dsh-market feature-detects', () => {
    const svc = createDesktopPnpmService({
      binDirectory: '/tmp/bin',
      dshEntryPath: '/tmp/bin.js',
      home: '/tmp/home'
    })
    expect(typeof svc.runExternalMarketPluginInstall).toBe('function')
  })

  it('fetches from the registry the market read version metadata from (#337)', async () => {
    const home = await freshHome()
    await mkdir(join(home, 'profiles', 'web', '.dsh-market'), { recursive: true })
    await writeFile(
      join(home, 'profiles', 'web', '.dsh-market', 'state.json'),
      JSON.stringify({ region: 'china', regionAuto: true })
    )

    let npmrc = ''
    const svc = createDesktopPnpmService({
      binDirectory: join(home, '.desktop-bin'),
      dshEntryPath: join(home, 'bin.js'),
      executablePath: process.execPath,
      home,
      // Not process.env: a developer machine with npm_config_registry set
      // would otherwise make this assert the opposite branch.
      environment: {},
      runGenerationInstall: async (stagingDir) => {
        npmrc = await readFile(join(stagingDir, '.npmrc'), 'utf8')
        return stubGenerationInstall('demo-plugin', '9.9.9')(stagingDir)
      }
    })

    const result = await drainHandle(svc.runExternalMarketPluginInstall(
      ['add', 'demo-plugin@9.9.9'],
      join(home, 'profiles', 'web'),
      undefined
    ))

    expect(result.exitCode).toBe(0)
    expect(npmrc).toContain('registry=https://mirrors.cloud.tencent.com/npm/')
  })

  it('passes release-age overrides and refuses to promote an install with blocked scripts', async () => {
    const home = await freshHome()
    const before = await readDesired(home)
    const policies = []
    const svc = service(home, async staging => {
      policies.push(await readFile(join(staging, '.npmrc'), 'utf8'))
      return { code: 1, output: 'ERR_PNPM_IGNORED_BUILDS Ignored build scripts: node-pty' }
    })
    const failed = await drainHandle(svc.runExternalMarketPluginInstall(
      ['add', 'demo@1.0.0'], join(home, 'profiles', 'web')))
    expect(failed.exitCode).toBe(1)
    expect(failed.stderr).toContain('ERR_PNPM_IGNORED_BUILDS')
    expect(policies[0]).not.toContain('strict-dep-builds=')
    expect(policies[0]).toContain('minimum-release-age=1440')
    await drainHandle(svc.runExternalMarketPluginInstall(
      ['add', '--config.minimumReleaseAge=0', 'demo@1.0.0'], join(home, 'profiles', 'web')))
    expect(policies[1]).toContain('minimum-release-age=0')
    await drainHandle(svc.runExternalMarketPluginInstall(
      ['add', '--config.minimum-release-age=0', 'demo@1.0.0'], join(home, 'profiles', 'web')))
    expect(policies[2]).toContain('minimum-release-age=0')
    expect(await readDesired(home)).toEqual(before)
  })

  it('exposes a new generation for market validation and defers bundle activation until cold start', async () => {
    const home = await freshHome()
    const svc = service(home, stubGenerationInstall('demo-plugin', '9.9.9'))

    const handle = svc.runExternalMarketPluginInstall(
      ['add', 'demo-plugin@9.9.9'],
      join(home, 'profiles', 'web'),
      undefined
    )
    const result = await drainHandle(handle)

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('isolated generation')
    expect(result.stdout).toContain('staged for next restart: demo-plugin')

    const desired = await readDesired(home)
    expect(desired).toHaveLength(1)
    expect(desired[0]).toMatch(/^demo-plugin\+9\.9\.9\+/u)

    const manifest = JSON.parse(await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8'))
    expect(manifest.dsh.profile.bundles).not.toContain('demo-plugin')
    expect(manifest.dependencies['demo-plugin']).toBe('9.9.9')
    expect(manifest.pnpm.overrides['demo-plugin']).toMatch(/^link:/u)
    const link = join(home, 'profiles', 'web', 'node_modules', 'demo-plugin')
    expect((await lstat(link)).isSymbolicLink()).toBe(true)
    const validationTarget = await readlink(link)

    await projectGenerations(home)
    expect((await lstat(link)).isSymbolicLink()).toBe(true)
    expect(await readlink(link)).toBe(validationTarget)
    const activeManifest = JSON.parse(
      await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8')
    )
    expect(activeManifest.dsh.profile.bundles).toContain('demo-plugin')
  })

  it('routes a market removal through desired.json instead of the shared profile CLI', async () => {
    const home = await freshHome()
    const svc = service(home, stubGenerationInstall('demo-plugin', '9.9.9'))
    await drainHandle(
      svc.runExternalMarketPluginInstall(
        ['add', 'demo-plugin@9.9.9'],
        join(home, 'profiles', 'web')
      )
    )
    await projectGenerations(home)
    const link = join(home, 'profiles', 'web', 'node_modules', 'demo-plugin')
    const activeTarget = await readlink(link)

    const result = await drainHandle(
      svc.runPlugin(['remove', '--workspace-root', 'demo-plugin'], join(home, 'profiles', 'web'))
    )

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Disabling demo-plugin generation for the next restart')
    expect(await readDesired(home)).toEqual([])
    const manifest = JSON.parse(await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8'))
    expect(manifest.dependencies['demo-plugin']).toBeUndefined()
    expect(manifest.pnpm?.overrides?.['demo-plugin']).toBeUndefined()
    // Uninstall immediately removes the plugin from the next Harness boot's
    // composition. Its active link remains intact until the process stops.
    expect(manifest.dsh.profile.bundles).not.toContain('demo-plugin')
    expect(await readlink(link)).toBe(activeTarget)

    await projectGenerations(home)
    await expect(lstat(link)).rejects.toMatchObject({ code: 'ENOENT' })
    const inactiveManifest = JSON.parse(
      await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8')
    )
    expect(inactiveManifest.dsh.profile.bundles).not.toContain('demo-plugin')
  })

  it('replaces a stale validation-only link when a rejected install is retried', async () => {
    const home = await freshHome()
    const firstService = service(home, stubGenerationInstall('broken-plugin', '1.0.0'))
    await drainHandle(
      firstService.runExternalMarketPluginInstall(
        ['add', 'broken-plugin@1.0.0'],
        join(home, 'profiles', 'web')
      )
    )
    const link = join(home, 'profiles', 'web', 'node_modules', 'broken-plugin')
    expect((await lstat(link)).isSymbolicLink()).toBe(true)
    const rejectedTarget = await readlink(link)

    await drainHandle(
      firstService.runPlugin(['remove', 'broken-plugin'], join(home, 'profiles', 'web'))
    )
    expect(await readlink(link)).toBe(rejectedTarget)

    await drainHandle(
      service(home, stubGenerationInstall('broken-plugin', '2.0.0')).runExternalMarketPluginInstall(
        ['add', 'broken-plugin@2.0.0'],
        join(home, 'profiles', 'web')
      )
    )

    expect(await readlink(link)).not.toBe(rejectedTarget)
    expect((await readDesired(home))[0]).toMatch(/^broken-plugin\+2\.0\.0\+/u)
  })

  it('keeps the active generation link unchanged until an update reaches cold start', async () => {
    const home = await freshHome()
    await drainHandle(
      service(home, stubGenerationInstall('widget', '1.0.0')).runExternalMarketPluginInstall(
        ['add', 'widget@1.0.0'],
        join(home, 'profiles', 'web')
      )
    )
    await projectGenerations(home)
    const link = join(home, 'profiles', 'web', 'node_modules', 'widget')
    const firstTarget = await readlink(link)

    await drainHandle(
      service(home, stubGenerationInstall('widget', '2.0.0')).runExternalMarketPluginInstall(
        ['add', 'widget@2.0.0'],
        join(home, 'profiles', 'web')
      )
    )

    expect(await readlink(link)).toBe(firstTarget)
    const staged = JSON.parse(await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8'))
    expect(staged.dependencies.widget).toBe('2.0.0')

    await projectGenerations(home)
    expect(await readlink(link)).not.toBe(firstTarget)
  })

  it('stages a dshmarket self-update without touching its real profile directory', async () => {
    const home = await freshHome()
    const profile = join(home, 'profiles', 'web')
    // dshmarket is a core bundle: a real hoisted directory, not a link. #352
    // tried to switch it live and every self-update threw "Cannot switch a
    // non-link plugin directory".
    await mkdir(join(profile, 'node_modules', 'dshmarket'), { recursive: true })
    await writeFile(
      join(profile, 'node_modules', 'dshmarket', 'package.json'),
      JSON.stringify({ name: 'dshmarket', version: '1.39.0' })
    )

    const result = await drainHandle(
      service(home, stubGenerationInstall('dshmarket', '1.45.1')).runExternalMarketPluginInstall(
        ['add', 'dshmarket@1.45.1'],
        profile
      )
    )

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('staged for next restart: dshmarket@1.45.1')
    expect(result.stderr).not.toContain('non-link plugin directory')
    // The live directory is left exactly as it was; projection swaps it on the
    // next cold start while Harness is stopped.
    const entry = await lstat(join(profile, 'node_modules', 'dshmarket'))
    expect(entry.isSymbolicLink()).toBe(false)
    expect(
      JSON.parse(await readFile(join(profile, 'node_modules', 'dshmarket', 'package.json'), 'utf8')).version
    ).toBe('1.39.0')
    expect((await readDesired(home))[0]).toMatch(/^dshmarket\+1\.45\.1\+/u)
  })

  it('replaces an earlier generation of the same plugin', async () => {
    const home = await freshHome()
    await drainHandle(
      service(home, stubGenerationInstall('widget', '1.0.0')).runExternalMarketPluginInstall(
        ['add', 'widget@1.0.0'],
        join(home, 'profiles', 'web')
      )
    )
    await drainHandle(
      service(home, stubGenerationInstall('widget', '2.0.0')).runExternalMarketPluginInstall(
        ['add', 'widget@2.0.0'],
        join(home, 'profiles', 'web')
      )
    )

    const desired = await readDesired(home)
    expect(desired).toHaveLength(1)
    expect(desired[0]).toMatch(/^widget\+2\.0\.0\+/u)
  })

  it('stages an exact copy of an installed external source and records its provenance', async () => {
    const home = await freshHome()
    const source = join(home, 'legacy-source-plugin')
    await mkdir(source, { recursive: true })
    await writeFile(join(source, 'package.json'), JSON.stringify({ name: 'source-plugin', version: '1.2.3' }))
    await writeFile(join(source, 'installed-marker.txt'), 'exact installed tree\n')

    const result = await installGeneration({
      dshHome: home,
      pluginSpec: 'github:example/source-plugin#main',
      expectedPluginName: 'source-plugin',
      sourceSpec: 'github:example/source-plugin#main',
      sourceDirectory: source,
      nodeExecutablePath: process.execPath,
      pnpmEntryPath: 'unused',
      runInstall: async (stagingDir) => {
        expect(await readFile(join(stagingDir, 'source', 'source-plugin', 'installed-marker.txt'), 'utf8'))
          .toBe('exact installed tree\n')
        return stubGenerationInstall('source-plugin', '1.2.3')(stagingDir)
      }
    })

    expect(result.ok).toBe(true)
    expect(await listGenerations(home)).toEqual([
      expect.objectContaining({
        pluginName: 'source-plugin',
        version: '1.2.3',
        sourceSpec: 'github:example/source-plugin#main'
      })
    ])
  })

  it('serialises against a concurrent operation', async () => {
    const home = await freshHome()
    const svc = service(home, async () => {
      await new Promise((resolve) => setTimeout(resolve, 60))
      return { code: 1, output: 'stub' }
    })
    const first = svc.runExternalMarketPluginInstall(['add', 'a@1.0.0'], join(home, 'profiles', 'web'))
    expect(() =>
      svc.runExternalMarketPluginInstall(['add', 'b@1.0.0'], join(home, 'profiles', 'web'))
    ).toThrow('Another desktop pnpm operation is already running.')
    await first.done.catch(() => undefined)
  })
})
