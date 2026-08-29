import { mkdtemp, mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ensureStoreDirPinned, inspectStoreConsistency } from '../src/main/state/profile-store'
import {
  INSTALL_PATH,
  MARKET_PACKAGE,
  RECOMMENDED_MARKET_VERSION,
  STATUS_PATH,
  UNINSTALL_PATH,
  buildPnpmEnvironment,
  buildInstallArguments,
  buildUninstallArguments,
  cleanStaleTemporaryDirectories,
  createDesktopPnpmService,
  createDesktopProfilesService,
  ensurePnpmShim,
  isTrustedRequest,
  readMarketInstallation,
  resolvePnpmEntry,
  stagePnpmRunner,
  updateProfileNpmrc
} from '../packages/dsh-desktop-market-installer/index.js'

describe('desktop plugin market installer', () => {
  it('pins the only install target accepted by the host', () => {
    expect(buildInstallArguments('/app/dsh/bin.js')).toEqual([
      '/app/dsh/bin.js',
      'plugin',
      '--profile',
      'web',
      'add',
      '--workspace-root',
      'dshmarket@latest'
    ])
    expect(MARKET_PACKAGE).toBe('dshmarket')
    expect(RECOMMENDED_MARKET_VERSION).toBe('latest')
    expect(STATUS_PATH).toBe('/dsh-desktop/market-installer/status')
    expect(INSTALL_PATH).toBe('/dsh-desktop/market-installer/install')
    expect(UNINSTALL_PATH).toBe('/dsh-desktop/market-installer/uninstall')
    expect(buildUninstallArguments('/app/dsh/bin.js')).toEqual([
      '/app/dsh/bin.js',
      'plugin',
      '--profile',
      'web',
      'remove',
      '--workspace-root',
      'dshmarket'
    ])
  })

  it('ships a resolvable pnpm binary instead of relying on the user PATH', () => {
    expect(resolvePnpmEntry()).toMatch(/node_modules[/\\]pnpm[/\\]bin[/\\]pnpm\.(c|m)js$/u)
  })

  it('removes only Desktop’s exact legacy pnpm settings and preserves sensitive config bytes', () => {
    const npmrc = [
      '# user configuration',
      'registry=https://registry.example.test/',
      '//registry.example.test/:_authToken=${NPM_TOKEN}',
      'cafile=/profile/private-ca.pem',
      'store-dir=/profile/.pnpm-store',
      'package-import-method=clone-or-copy',
      'child-concurrency=1',
      'side-effects-cache=true',
      ''
    ].join('\r\n')

    const expected = [
      '# user configuration',
      'registry=https://registry.example.test/',
      '//registry.example.test/:_authToken=${NPM_TOKEN}',
      'cafile=/profile/private-ca.pem',
      'store-dir=/profile/.pnpm-store',
      'side-effects-cache=true',
      ''
    ].join('\r\n')

    expect(updateProfileNpmrc(npmrc)).toBe(expected)
    expect(updateProfileNpmrc(expected)).toBe(expected)
  })

  it('leaves user-selected or partial pnpm tuning untouched', () => {
    const custom = 'package-import-method=copy\nchild-concurrency=8\nstore-dir=/keep\n'
    const partialLegacy = 'package-import-method=clone-or-copy\nstore-dir=/keep\n'
    expect(updateProfileNpmrc(custom)).toBe(custom)
    expect(updateProfileNpmrc(partialLegacy)).toBe(partialLegacy)
  })

  it('keeps the store consistent through pinning and packaged shim regeneration', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-market-store-pin-'))
    const profile = join(home, 'profiles', 'web')
    const store = join(profile, '.pnpm-store')
    await mkdir(join(profile, 'node_modules'), { recursive: true })
    await writeFile(join(profile, 'package.json'), '{}', 'utf8')
    await writeFile(
      join(profile, 'node_modules', '.modules.yaml'),
      `  "storeDir": "${store}/v10",\n`,
      'utf8'
    )
    await writeFile(
      join(profile, '.npmrc'),
      'package-import-method=clone-or-copy\nchild-concurrency=1\nside-effects-cache=false\n',
      'utf8'
    )

    await expect(ensureStoreDirPinned(home)).resolves.toBe(store)
    await ensurePnpmShim(home)

    expect(await readFile(join(profile, '.npmrc'), 'utf8')).toBe(
      `side-effects-cache=false\nstore-dir=${store}\n`
    )
    await expect(inspectStoreConsistency(home)).resolves.toBeUndefined()
  })

  it('generates packaged node and pnpm shims in desktop-bin', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-market-shim-'))
    const binDir = await ensurePnpmShim(home)
    expect(binDir).toBe(join(home, '.desktop-bin'))

    const runner = await readFile(join(binDir, 'pnpm-runner.mjs'), 'utf8')
    expect(runner).toContain('runWithLockRecovery')
    await expect(stagePnpmRunner(binDir)).resolves.toBe(join(binDir, 'pnpm-runner.mjs'))
    // A directory that cannot hold the staged copy still leaves pnpm reachable
    // through the packaged original rather than taking the shims down.
    await expect(stagePnpmRunner(join(binDir, 'missing', 'deeper'))).resolves.toMatch(
      /packages[/\\]dsh-desktop-market-installer[/\\]pnpm-runner\.mjs$/u
    )

    if (process.platform === 'win32') {
      const pnpmCmd = await readFile(join(binDir, 'pnpm.cmd'), 'utf8')
      const nodeCmd = await readFile(join(binDir, 'node.cmd'), 'utf8')
      expect(pnpmCmd).toContain(process.execPath)
      expect(pnpmCmd).toContain('pnpm')
      expect(pnpmCmd).toContain(join(binDir, 'pnpm-runner.mjs'))
      expect(pnpmCmd).toContain('set ELECTRON_RUN_AS_NODE=1')
      expect(nodeCmd).toContain(process.execPath)
      expect(nodeCmd).toContain('set ELECTRON_RUN_AS_NODE=1')
    } else {
      const pnpmScript = await readFile(join(binDir, 'pnpm'), 'utf8')
      const nodeScript = await readFile(join(binDir, 'node'), 'utf8')
      expect(pnpmScript).toContain(process.execPath)
      expect(pnpmScript).toContain('pnpm')
      expect(pnpmScript).toContain(join(binDir, 'pnpm-runner.mjs'))
      expect(pnpmScript).toContain('export ELECTRON_RUN_AS_NODE=1')
      expect(nodeScript).toContain(process.execPath)
      expect(nodeScript).toContain('export ELECTRON_RUN_AS_NODE=1')
    }

    const npmrc = await readFile(join(home, 'profiles', 'web', '.npmrc'), 'utf8')
    expect(npmrc).toContain('side-effects-cache=false')
    expect(npmrc).not.toContain('package-import-method')
    expect(npmrc).not.toContain('child-concurrency')
  })

  it('cleans up staging and sidelined directories left by interrupted installations', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-market-clean-'))
    const nodeModules = join(home, 'profiles', 'web', 'node_modules')
    const staleTmpDir = join(nodeModules, 'argparse_tmp_12345_1')
    const sidelinedDir = join(nodeModules, 'argparse.dsh-old-1787317710932')
    const validDir = join(nodeModules, 'argparse')
    await mkdir(staleTmpDir, { recursive: true })
    await mkdir(sidelinedDir, { recursive: true })
    await mkdir(validDir, { recursive: true })

    await cleanStaleTemporaryDirectories(home)

    const { existsSync } = await import('node:fs')
    expect(existsSync(staleTmpDir)).toBe(false)
    expect(existsSync(sidelinedDir)).toBe(false)
    expect(existsSync(validDir)).toBe(true)
  })

  it('cleans the leftovers inside a package\u2019s own node_modules', async () => {
    // A replaced dependency of a dependency stages under the dependent, so a
    // sweep that stops at the top level leaves one copy behind per attempt.
    const home = await mkdtemp(join(tmpdir(), 'dsh-market-clean-nested-'))
    const nodeModules = join(home, 'profiles', 'web', 'node_modules')
    const nested = join(nodeModules, 'cytoscape-fcose', 'node_modules')
    const scoped = join(nodeModules, '@deepseek-ai')
    const nestedStale = join(nested, 'cose-base.dsh-old-1787327060846')
    const scopedStale = join(scoped, 'dsh-settings_tmp_7408_2')
    const kept = join(nested, 'cose-base')
    await mkdir(nestedStale, { recursive: true })
    await mkdir(scopedStale, { recursive: true })
    await mkdir(kept, { recursive: true })
    await writeFile(join(kept, 'package.json'), JSON.stringify({ name: 'cose-base' }), 'utf8')

    await cleanStaleTemporaryDirectories(home)

    const { existsSync } = await import('node:fs')
    expect(existsSync(nestedStale)).toBe(false)
    expect(existsSync(scopedStale)).toBe(false)
    expect(existsSync(kept)).toBe(true)
  })

  it('clears a tree whose path is not ASCII', async () => {
    // Node's recursive `rm` reports success and removes nothing under such a
    // path on Windows. A profile lives under the user's home, so one non-ASCII
    // character in the account name used to disable this sweep entirely.
    const home = join(await mkdtemp(join(tmpdir(), 'dsh-market-unicode-')), '\u6570\u636e\u9879\u7d20')
    const nodeModules = join(home, 'profiles', 'web', 'node_modules')
    const stale = join(nodeModules, 'dshmarket_tmp_7408_13', 'lib')
    await mkdir(stale, { recursive: true })
    await writeFile(join(stale, 'index.js'), 'export default 1', 'utf8')

    await cleanStaleTemporaryDirectories(home)

    const { existsSync } = await import('node:fs')
    expect(existsSync(join(nodeModules, 'dshmarket_tmp_7408_13'))).toBe(false)
  })

  it('exposes the active Desktop profile without inferring it from argv', async () => {
    const home = join('C:\\Users\\tester', 'AppData', 'Roaming', 'dsh-desktop', 'harness')
    const profiles = createDesktopProfilesService(home)

    expect(profiles.current).toEqual({
      name: 'web',
      dir: join(home, 'profiles', 'web')
    })
    expect(profiles.list()).toEqual([profiles.current])
    await expect(profiles.select('web')).resolves.toBeUndefined()
    await expect(profiles.select('other')).rejects.toThrow('only exposes the web profile')
  })

  it('runs plugin mutations through one packaged pnpm operation boundary', async () => {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'dsh-desktop-pnpm-service-')))
    const binDirectory = join(root, '.desktop-bin')
    const fakeDshEntry = join(root, 'fake-dsh.mjs')
    await mkdir(binDirectory, { recursive: true })
    await writeFile(
      fakeDshEntry,
      [
        "process.stdout.write(JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd(), path: process.env.PATH, runAsNode: process.env.ELECTRON_RUN_AS_NODE }))",
        "await new Promise((resolve) => setTimeout(resolve, Number(process.env.DSH_DESKTOP_TEST_DELAY_MS ?? '0')))"
      ].join('\n'),
      'utf8'
    )

    const environment = {
      ...process.env,
      DSH_DESKTOP_TEST_DELAY_MS: '80',
      ELECTRON_RUN_AS_NODE: '1'
    }
    const service = createDesktopPnpmService({
      binDirectory,
      dshEntryPath: fakeDshEntry,
      executablePath: process.execPath,
      environment
    })
    const handle = service.runPlugin(['remove', 'example-plugin'], root)
    expect(() => service.runPlugin(['install'], root)).toThrow(
      'Another desktop pnpm operation is already running.'
    )

    let stdout = ''
    handle.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8')
    })
    await expect(handle.done).resolves.toEqual({ exitCode: 0, signal: null })
    const invocation = JSON.parse(stdout)
    expect(invocation.args).toEqual([
      'plugin',
      '--profile',
      'web',
      'remove',
      'example-plugin'
    ])
    expect(invocation.cwd).toBe(root)
    expect(invocation.path.split(process.platform === 'win32' ? ';' : ':')[0]).toBe(
      binDirectory
    )
    // The macOS helper binary only runs the dsh CLI as Node when the child
    // environment carries ELECTRON_RUN_AS_NODE, so the spawn must not strip it.
    expect(invocation.runAsNode).toBe('1')
    const pnpmEnv = buildPnpmEnvironment(binDirectory, environment)
    // On macOS the child is spawned as the Electron helper binary, which only
    // runs the dsh CLI as Node when ELECTRON_RUN_AS_NODE is set; the harness
    // entry declares it for its children, so the environment must pass it
    // through rather than stripping it.
    expect(pnpmEnv.ELECTRON_RUN_AS_NODE).toBe('1')
    expect(pnpmEnv.npm_config_side_effects_cache).toBe('false')
    expect(pnpmEnv.npm_config_child_concurrency).toBeUndefined()
    expect(pnpmEnv.npm_config_package_import_method).toBeUndefined()

    const next = service.runPlugin(['install'], root)
    await expect(next.done).resolves.toEqual({ exitCode: 0, signal: null })
    await service.dispose()
    expect(() => service.runPlugin(['install'], root)).toThrow('has been disposed')
  })

  it('rejects a package operation that was already aborted', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-desktop-pnpm-abort-'))
    const controller = new AbortController()
    controller.abort(new Error('cancelled before start'))
    const service = createDesktopPnpmService({
      binDirectory: join(root, '.desktop-bin'),
      dshEntryPath: join(root, 'unused-dsh-entry.mjs'),
      executablePath: process.execPath
    })

    expect(() => service.runPlugin(['install'], root, controller.signal)).toThrow(
      'cancelled before start'
    )
    await service.dispose()
  })

  it('reports both the requested dependency and installed package version', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-market-status-'))
    const profile = join(home, 'profiles', 'web')
    await mkdir(join(profile, 'node_modules', 'dshmarket'), { recursive: true })
    await writeFile(
      join(profile, 'package.json'),
      JSON.stringify({ dependencies: { dshmarket: '1.9.0' } }),
      'utf8'
    )
    await writeFile(
      join(profile, 'node_modules', 'dshmarket', 'package.json'),
      JSON.stringify({ name: 'dshmarket', version: '1.9.0' }),
      'utf8'
    )

    await expect(readMarketInstallation(home)).resolves.toEqual({
      dependency: '1.9.0',
      installedVersion: '1.9.0'
    })
  })

  it('allows loopback status reads but requires same-origin mutation requests', () => {
    const request = (headers = {}, remoteAddress = '127.0.0.1') => ({
      headers,
      socket: { remoteAddress }
    })

    expect(isTrustedRequest(request())).toBe(true)
    expect(
      isTrustedRequest(
        request({ origin: 'http://127.0.0.1:51923', host: '127.0.0.1:51923' }),
        true
      )
    ).toBe(true)
    expect(
      isTrustedRequest(
        request({ origin: 'https://attacker.example', host: '127.0.0.1:51923' }),
        true
      )
    ).toBe(false)
    expect(
      isTrustedRequest(request({ forwarded: 'for=127.0.0.1' }), false)
    ).toBe(false)
    expect(isTrustedRequest(request({}, '192.168.1.5'))).toBe(false)
  })

  it('registers a placeholder before install and a stable management tab afterward', async () => {
    const client = await readFile(
      join(process.cwd(), 'packages', 'dsh-desktop-market-installer', 'client.js'),
      'utf8'
    )
    const desktopPatch = await readFile(
      join(process.cwd(), 'build', 'dsh-desktop.patch.yml'),
      'utf8'
    )
    const preload = await readFile(join(process.cwd(), 'src', 'preload', 'index.ts'), 'utf8')

    expect(client).toContain("entry?.id === 'dshmarket'")
    expect(client).toContain("id: 'market'")
    expect(client).toContain('order: 40')
    expect(client).toContain("id: 'desktop-market-management'")
    expect(client).toContain("name: 'settings.plugins.tab'")
    expect(client).toContain(
      '只会移除 dsh-market。通过插件市场安装的其他插件将继续保留。'
    )
    expect(desktopPatch).toContain('name: dsh-desktop-market-installer')
    expect(desktopPatch).toContain('inject: [desktopProfiles]')
    expect(desktopPatch).toContain('allowRestart: false')
    expect(preload).toContain("restartHarness: (): Promise<{ ok: boolean }>")
  })
})
