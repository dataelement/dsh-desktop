import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDesktopPnpmService } from '../packages/dsh-desktop-market-installer/index.js'
import { readDesired } from '../packages/dsh-desktop-market-installer/generations/registry.mjs'

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

  it('installs a generation, points desired at it, and reprojects', async () => {
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
    expect(result.stdout).toContain('enabled: demo-plugin')

    const desired = await readDesired(home)
    expect(desired).toHaveLength(1)
    expect(desired[0]).toMatch(/^demo-plugin\+9\.9\.9\+/u)

    const manifest = JSON.parse(await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8'))
    expect(manifest.dsh.profile.bundles).toContain('demo-plugin')
    expect(manifest.dependencies['demo-plugin']).toBeUndefined() // generations never go in dependencies
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
