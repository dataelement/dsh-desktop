import { readInstalledVersion } from '../node_modules/dshmarket/lib/profile.js'
import { suspendGenerationProjectionForPnpm } from '../packages/dsh-desktop-market-installer/pnpm-runner.mjs'
import { EventEmitter } from 'node:events'
import { lstat, mkdir, mkdtemp, open, readFile, readlink, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDesktopPnpmService } from '../packages/dsh-desktop-market-installer/index.js'
import { installGeneration } from '../packages/dsh-desktop-market-installer/generations/installer.mjs'
import { projectGenerations, publishGenerationManifest, publishInstalledGeneration } from '../packages/dsh-desktop-market-installer/generations/projection.mjs'
import {
  listGenerations,
  sweepRegistry,
  readDesired,
  writeDesired
} from '../packages/dsh-desktop-market-installer/generations/registry.mjs'

const renameFault = vi.hoisted(() => ({ phase: '' }))
vi.mock('node:fs/promises', async importOriginal => {
  const fs = await importOriginal()
  return { ...fs, unlink: async path => {
    if (renameFault.phase === 'old-link' && process.platform === 'win32') {
      renameFault.phase = ''
      throw Object.assign(new Error('EPERM: simulated occupied junction'), { code: 'EPERM' })
    }
    return fs.unlink(path)
  }, rename: async (from, to) => {
    const matches = renameFault.phase === 'old-link' ? String(to).includes('.dsh-previous-')
      : renameFault.phase === 'new-link' ? String(from).includes('.dsh-next-')
      : renameFault.phase === 'manifest' ? String(to).replaceAll('\\', '/').endsWith('/profiles/web/package.json') : false
    if (matches) {
      renameFault.phase = ''
      throw Object.assign(new Error('EPERM: simulated occupied path'), { code: 'EPERM' })
    }
    return fs.rename(from, to)
  } }
})

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
    renameFault.phase = ''
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

  it.each(['auto-install-peers', 'autoInstallPeers', 'profile'])('preserves %s on a retry through the pnpm subprocess', async key => {
    const home = await freshHome()
    if (key === 'profile') await writeFile(join(home, 'profiles', 'web', 'pnpm-workspace.yaml'),
      'packages:\n  - .\nautoInstallPeers: false # host provides peers\n')
    const calls = []
    const svc = createDesktopPnpmService({
      binDirectory: join(home, '.desktop-bin'),
      dshEntryPath: join(home, 'bin.js'),
      executablePath: process.execPath,
      home,
      spawnProcess: (_exe, args, options) => {
        calls.push(args)
        const child = new EventEmitter()
        child.stdout = new EventEmitter()
        child.stderr = new EventEmitter()
        child.kill = () => {}
        queueMicrotask(async () => {
          if (key === 'profile' && calls.length === 1) {
            child.stderr.emit('data', Buffer.from('ERR_PNPM_MINIMUM_RELEASE_AGE_FAILURE'))
            child.emit('close', 1)
            return
          }
          if (!args.includes('--config.auto-install-peers=false')) {
            child.stderr.emit('data', Buffer.from('ERR_PNPM_FETCH_404 @deepseek-ai/dsh-type-meta Not Found'))
            child.emit('close', 1)
            return
          }
          await stubGenerationInstall('demo-plugin', '1.2.4')(options.cwd)
          child.emit('close', 0)
        })
        return child
      }
    })
    const profile = join(home, 'profiles', 'web')
    const first = await drainHandle(svc.runExternalMarketPluginInstall(['add', 'demo-plugin@1.2.4'], profile))
    expect(first.exitCode).toBe(1)
    expect(first.stderr).toContain(key === 'profile' ? 'ERR_PNPM_MINIMUM_RELEASE_AGE_FAILURE' : 'ERR_PNPM_FETCH_404')
    const retry = await drainHandle(svc.runExternalMarketPluginInstall(
      ['add', key === 'profile' ? '--config.minimumReleaseAge=0' : `--config.${key}=false`, 'demo-plugin@1.2.4'], profile))
    expect(retry.exitCode).toBe(0)
    expect(calls).toHaveLength(2)
    if (key === 'profile') expect(calls[0]).toContain('--config.auto-install-peers=false')
    else expect(calls[0]).not.toContain('--config.auto-install-peers=false')
    expect(calls[1]).toContain('--config.auto-install-peers=false')
    for (const args of calls) expect(args[2]).toBe('demo-plugin@1.2.4')
    expect(readInstalledVersion('web', 'demo-plugin', profile)).toBe('1.2.4')
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
    expect(result.stdout).toContain('installed in profile: demo-plugin@9.9.9')

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

  it('publishes the new version before returning success and retains old files until startup cleanup', async () => {
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
    const loadedFile = await open(join(firstTarget, 'package.json'), 'r')

    await drainHandle(
      service(home, stubGenerationInstall('widget', '2.0.0')).runExternalMarketPluginInstall(
        ['add', 'widget@2.0.0'],
        join(home, 'profiles', 'web')
      )
    )

    expect(JSON.parse(await loadedFile.readFile('utf8')).version).toBe('1.0.0')
    await loadedFile.close()
    expect(await readlink(link)).not.toBe(firstTarget)
    expect(JSON.parse(await readFile(join(link, 'package.json'), 'utf8')).version).toBe('2.0.0')
    expect(JSON.parse(await readFile(join(firstTarget, 'package.json'), 'utf8')).version).toBe('1.0.0')
    const staged = JSON.parse(await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8'))
    expect(staged.dependencies.widget).toBe('2.0.0')
    expect(readInstalledVersion('web', 'widget', join(home, 'profiles/web'))).toBe('2.0.0')

    await sweepRegistry(home)
    await projectGenerations(home)
    await expect(lstat(firstTarget)).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await readlink(link)).not.toBe(firstTarget)
  })

  it.each(['old-link', 'new-link', 'manifest'])('restores the previous profile when %s switching fails', async phase => {
    const home = await freshHome()
    const profile = join(home, 'profiles/web')
    await drainHandle(service(home, stubGenerationInstall('widget', '1.0.0'))
      .runExternalMarketPluginInstall(['add', 'widget@1.0.0'], profile))
    await projectGenerations(home)
    const link = join(profile, 'node_modules/widget')
    const oldTarget = await readlink(link)
    const beforeManifest = await readFile(join(profile, 'package.json'), 'utf8')
    const beforeDesired = await readDesired(home)
    renameFault.phase = phase
    const result = await drainHandle(service(home, stubGenerationInstall('widget', '2.0.0'))
      .runExternalMarketPluginInstall(['add', 'widget@2.0.0'], profile))
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('EPERM')
    expect(await readlink(link)).toBe(oldTarget)
    expect(await readFile(join(profile, 'package.json'), 'utf8')).toBe(beforeManifest)
    expect(await readDesired(home)).toEqual(beforeDesired)
    expect(JSON.parse(await readFile(join(link, 'package.json'), 'utf8')).version).toBe('1.0.0')
  })

  it('rolls back a cold-start directory replacement if manifest publication fails', async () => {
    const home = await freshHome()
    const profile = join(home, 'profiles/web')
    // A legacy plugin installed as a real directory, being moved onto a
    // generation for the first time. (Never dshmarket: that one is pinned to
    // the shared tree and is filtered out of generation resolution.)
    const legacy = join(profile, 'node_modules/widget')
    await mkdir(legacy, { recursive: true })
    await writeFile(join(legacy, 'package.json'), JSON.stringify({ name: 'widget', version: '1.39.0' }))
    const before = await readFile(join(profile, 'package.json'), 'utf8')
    const installed = await installGeneration({
      dshHome: home, pluginSpec: 'widget@1.45.1', nodeExecutablePath: process.execPath,
      pnpmEntryPath: 'unused', runInstall: stubGenerationInstall('widget', '1.45.1')
    })
    await writeDesired(home, [installed.generation.id])
    renameFault.phase = 'manifest'
    await expect(publishInstalledGeneration(home, 'widget', 'web', { allowRealDirectory: true, syncBundles: true })).rejects.toThrow('EPERM')
    expect((await lstat(legacy)).isSymbolicLink()).toBe(false)
    expect(readInstalledVersion('web', 'widget', profile)).toBe('1.39.0')
    expect(await readFile(join(profile, 'package.json'), 'utf8')).toBe(before)
    await publishInstalledGeneration(home, 'widget', 'web', { allowRealDirectory: true, syncBundles: true })
    expect(readInstalledVersion('web', 'widget', profile)).toBe('1.45.1')
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

  /** A stubbed dsh CLI child that reports one clean pnpm run. */
  function fakeCliSpawn(calls) {
    return (_executablePath, args, options) => {
      calls.push({ args, options })
      const child = new EventEmitter()
      child.stdout = new EventEmitter()
      child.stderr = new EventEmitter()
      child.pid = 4242
      child.exitCode = null
      setImmediate(async () => {
        const profile = options.cwd
        const isolation = await suspendGenerationProjectionForPnpm(profile)
        const spec = args.find(arg => arg.startsWith('dshmarket@'))
        const version = spec.slice(spec.lastIndexOf('@') + 1)
        await mkdir(join(profile, 'node_modules/dshmarket'), { recursive: true })
        await writeFile(join(profile, 'node_modules/dshmarket/package.json'), JSON.stringify({ name: 'dshmarket', version }))
        const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
        manifest.dependencies.dshmarket = version
        await writeFile(join(profile, 'package.json'), JSON.stringify(manifest))
        await isolation.restore()
        child.stdout.emit('data', Buffer.from('Progress: resolved 1, done\n'))
        child.exitCode = 0
        child.emit('close', 0, null)
      })
      return child
    }
  }

  it('updates dshmarket in the shared tree rather than switching its non-link directory', async () => {
    const home = await freshHome()
    const profile = join(home, 'profiles', 'web')
    // dshmarket is a core bundle: a real hoisted directory, never a link.
    await mkdir(join(profile, 'node_modules', 'dshmarket'), { recursive: true })
    await writeFile(
      join(profile, 'node_modules', 'dshmarket', 'package.json'),
      JSON.stringify({ name: 'dshmarket', version: '1.39.0' })
    )
    await mkdir(join(profile, '.dsh-market'), { recursive: true })
    await writeFile(
      join(profile, '.dsh-market', 'state.json'),
      JSON.stringify({ region: 'china', regionAuto: true })
    )

    const calls = []
    const svc = createDesktopPnpmService({
      binDirectory: join(home, '.desktop-bin'),
      dshEntryPath: join(home, 'bin.js'),
      executablePath: process.execPath,
      home,
      environment: {},
      spawnProcess: fakeCliSpawn(calls)
    })

    const result = await drainHandle(
      svc.runExternalMarketPluginInstall(['add', 'dshmarket@1.45.1'], profile)
    )

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('shared profile')
    // Routed through the ordinary shared-tree `add`, never installGeneration.
    expect(calls).toHaveLength(1)
    expect(calls[0].args).toEqual(
      expect.arrayContaining([
        'plugin', '--profile', 'web', 'add', '--workspace-root', 'dshmarket@1.45.1'
      ])
    )
    // Pinned to the market's own registry, exactly as the generation path is.
    expect(calls[0].options.env.npm_config_registry).toBe('https://mirrors.cloud.tencent.com/npm')
    // No generation artifacts: desired.json untouched, entry stays a real dir.
    expect(await readDesired(home)).toEqual([])
    expect((await lstat(join(profile, 'node_modules', 'dshmarket'))).isSymbolicLink()).toBe(false)
    const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
    expect(manifest.pnpm?.overrides?.dshmarket).toBeUndefined()
  })

  it('collapses a projected Market generation back into the shared tree on update', async () => {
    const home = await freshHome()
    const profile = join(home, 'profiles/web')
    // A build from before this fix left dshmarket projected as a generation.
    // Projection refuses to create that shape now, so write it by hand.
    const first = await installGeneration({
      dshHome: home, pluginSpec: 'dshmarket@1.45.1', nodeExecutablePath: process.execPath,
      pnpmEntryPath: 'unused', runInstall: stubGenerationInstall('dshmarket', '1.45.1')
    })
    await writeDesired(home, [first.generation.id])
    const marketPath = join(profile, 'node_modules/dshmarket')
    await mkdir(join(profile, 'node_modules'), { recursive: true })
    await symlink(join(first.generation.directory, 'node_modules', 'dshmarket'), marketPath, 'junction')
    expect((await lstat(marketPath)).isSymbolicLink()).toBe(true)

    const calls = []
    const svc = createDesktopPnpmService({
      binDirectory: join(home, '.desktop-bin'), dshEntryPath: join(home, 'bin.js'),
      executablePath: process.execPath, home, environment: {}, spawnProcess: fakeCliSpawn(calls)
    })
    const result = await drainHandle(svc.runExternalMarketPluginInstall(['add', 'dshmarket@1.46.0'], profile))

    expect(result.exitCode).toBe(0)
    // Never the generation path: the shared-tree CLI ran instead.
    expect(calls).toHaveLength(1)
    expect(readInstalledVersion('web', 'dshmarket', profile)).toBe('1.46.0')
    expect((await lstat(marketPath)).isSymbolicLink()).toBe(false)
    // The stale generation pointer has no further purpose.
    expect(await readDesired(home)).toEqual([])
  })

  it('repairs stale Market staging without changing an ordinary plugin during shared-tree update', async () => {
    const home = await freshHome()
    const profile = join(home, 'profiles/web')
    await drainHandle(service(home, stubGenerationInstall('widget', '1.0.0'))
      .runExternalMarketPluginInstall(['add', 'widget@1.0.0'], profile))
    await projectGenerations(home)
    const widgetLink = await readlink(join(profile, 'node_modules/widget'))
    await mkdir(join(profile, 'node_modules/dshmarket'), { recursive: true })
    await writeFile(join(profile, 'node_modules/dshmarket/package.json'), JSON.stringify({ name: 'dshmarket', version: '1.39.0' }))
    const staged = await installGeneration({
      dshHome: home, pluginSpec: 'dshmarket@1.44.0', nodeExecutablePath: process.execPath,
      pnpmEntryPath: 'unused', runInstall: stubGenerationInstall('dshmarket', '1.44.0')
    })
    const previous = await readDesired(home)
    await writeDesired(home, [...previous, staged.generation.id])
    await publishGenerationManifest(home)
    const svc = createDesktopPnpmService({ home, binDirectory: join(home, '.desktop-bin'),
      dshEntryPath: join(home, 'bin.js'), spawnProcess: fakeCliSpawn([]) })
    const result = await drainHandle(svc.runExternalMarketPluginInstall(['add', 'dshmarket@1.45.1'], profile))
    expect(result.exitCode).toBe(0)
    expect(readInstalledVersion('web', 'dshmarket', profile)).toBe('1.45.1')
    expect(readInstalledVersion('web', 'widget', profile)).toBe('1.0.0')
    expect(await readDesired(home)).toEqual(previous)
    await projectGenerations(home)
    expect(await readlink(join(profile, 'node_modules/widget'))).toBe(widgetLink)
    expect((await lstat(join(profile, 'node_modules/dshmarket'))).isSymbolicLink()).toBe(false)
    expect(readInstalledVersion('web', 'dshmarket', profile)).toBe('1.45.1')
  })

  it('rejects a shared-tree CLI success that leaves the installed version unchanged', async () => {
    const home = await freshHome()
    const profile = join(home, 'profiles/web')
    await mkdir(join(profile, 'node_modules/dshmarket'), { recursive: true })
    await writeFile(join(profile, 'node_modules/dshmarket/package.json'), JSON.stringify({ version: '1.39.0' }))
    const before = await readFile(join(profile, 'package.json'), 'utf8')
    const svc = createDesktopPnpmService({ home, binDirectory: join(home, '.desktop-bin'),
      dshEntryPath: join(home, 'bin.js'), spawnProcess: () => {
        const child = new EventEmitter()
        child.stdout = new EventEmitter()
        child.stderr = new EventEmitter()
        setImmediate(() => child.emit('close', 0, null))
        return child
      } })
    const result = await drainHandle(svc.runExternalMarketPluginInstall(['add', 'dshmarket@1.45.1'], profile))
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('expected 1.45.1, found 1.39.0')
    expect(await readFile(join(profile, 'package.json'), 'utf8')).toBe(before)
    expect(await readDesired(home)).toEqual([])
  })

  it('reports a failed dshmarket shared-tree update', async () => {
    const home = await freshHome()
    const profile = join(home, 'profiles', 'web')
    const svc = createDesktopPnpmService({
      binDirectory: join(home, '.desktop-bin'),
      dshEntryPath: join(home, 'bin.js'),
      executablePath: process.execPath,
      home,
      environment: {},
      spawnProcess: (_e, _a, _o) => {
        const child = new EventEmitter()
        child.stdout = new EventEmitter()
        child.stderr = new EventEmitter()
        child.exitCode = null
        setImmediate(() => {
          child.stderr.emit('data', Buffer.from('ERR_PNPM_NO_MATCHING_VERSION\n'))
          child.exitCode = 1
          child.emit('close', 1, null)
        })
        return child
      }
    })

    const result = await drainHandle(
      svc.runExternalMarketPluginInstall(['add', 'dshmarket@9.9.9'], profile)
    )

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Market install failed: 1')
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
