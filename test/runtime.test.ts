import { afterEach, describe, expect, it } from 'vitest'
import { EventEmitter } from 'node:events'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ChildProcessWithoutNullStreams, SpawnOptionsWithoutStdio } from 'node:child_process'
import {
  buildHarnessArguments,
  buildHarnessSpawnOptions,
  buildNodeArguments,
  formatExitCode,
  HarnessRuntime,
  HARNESS_PROFILE
} from '../src/main/runtime/harness-runtime'
import { canGrantWindowPermission, isTrustedAppUrl } from '../src/main/security-policy'
import {
  isAbortedNavigationError,
  shouldLoadHarnessUrl
} from '../src/main/window-navigation'

describe('Harness launch contract', () => {
  it('binds the web server to a random loopback port', () => {
    expect(buildHarnessArguments(43127)).toEqual([
      'web',
      '--host',
      '127.0.0.1',
      '--port',
      '43127'
    ])
  })

  it('applies the desktop composition patch before web arguments', () => {
    expect(buildHarnessArguments(43127, 'C:\\app\\dsh-desktop.patch.yml')).toEqual([
      'web',
      '--patch',
      'C:\\app\\dsh-desktop.patch.yml',
      '--host',
      '127.0.0.1',
      '--port',
      '43127'
    ])
  })

  it('launches Harness with the bundled Node.js runtime', () => {
    const options = buildHarnessSpawnOptions(
      'C:\\Users\\tester\\AppData\\Roaming\\dsh-desktop\\launch-root',
      'C:\\Users\\tester\\AppData\\Roaming\\dsh-desktop\\harness',
      'win32',
      {
        ELECTRON_RUN_AS_NODE: '1',
        PATH: 'fallback-path',
        Path: 'windows-path'
      }
    )

    expect(options).toMatchObject({
      cwd: 'C:\\Users\\tester\\AppData\\Roaming\\dsh-desktop\\launch-root',
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: {
        DSH_HOME: 'C:\\Users\\tester\\AppData\\Roaming\\dsh-desktop\\harness',
        NO_COLOR: '1',
        Path: 'windows-path'
      }
    })
    expect(options.env).toMatchObject({ DSH_DESKTOP_PROFILES: HARNESS_PROFILE })
    expect(options.env).not.toHaveProperty('ELECTRON_RUN_AS_NODE')
  })

  it('passes the internal-loader flag directly to bundled Node.js', () => {
    expect(
      buildNodeArguments(
        'C:\\app\\harness-node-entry.mjs',
        'C:\\app\\dsh\\lib\\bin.js',
        43127,
        'C:\\app\\dsh-desktop.patch.yml'
      )
    ).toEqual([
      '--expose-internals',
      'C:\\app\\harness-node-entry.mjs',
      'C:\\app\\dsh\\lib\\bin.js',
      'web',
      '--patch',
      'C:\\app\\dsh-desktop.patch.yml',
      '--host',
      '127.0.0.1',
      '--port',
      '43127'
    ])
  })

  // `--import` takes a module specifier: a bare Windows path is read as a `c:`
  // URL scheme and Node exits before the harness entry ever runs.
  it('injects profile module paths via --import as a file URL', () => {
    expect(
      buildNodeArguments(
        'C:\\app\\harness-node-entry.mjs',
        'C:\\app\\dsh\\lib\\bin.js',
        43127,
        'C:\\app\\dsh-desktop.patch.yml',
        'file:///C:/app/profile-module-paths.mjs'
      )
    ).toEqual([
      '--expose-internals',
      '--import',
      'file:///C:/app/profile-module-paths.mjs',
      'C:\\app\\harness-node-entry.mjs',
      'C:\\app\\dsh\\lib\\bin.js',
      'web',
      '--patch',
      'C:\\app\\dsh-desktop.patch.yml',
      '--host',
      '127.0.0.1',
      '--port',
      '43127'
    ])
  })

  it('makes native Windows termination codes diagnosable', () => {
    expect(formatExitCode(4294930435)).toContain(
      '0xFFFF7003, Crashpad handler unavailable'
    )
  })
})

describe('Harness launch wiring', () => {
  const roots: string[] = []

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
  })

  async function launchOnce(
    options: { withProfileModulePaths: boolean }
  ): Promise<{ args: string[]; environment: NodeJS.ProcessEnv }> {
    const root = await mkdtemp(join(tmpdir(), 'dsh-desktop-runtime-'))
    roots.push(root)

    const paths: Record<string, string> = {}
    for (const name of ['bin.js', 'node', 'harness-node-entry.mjs', 'dsh-desktop.patch.yml']) {
      paths[name] = join(root, name)
      await writeFile(paths[name]!, '')
    }
    const profileModulePathsPath = join(root, 'profile-module-paths.mjs')
    if (options.withProfileModulePaths) await writeFile(profileModulePathsPath, '')

    let captured: { args: string[]; environment: NodeJS.ProcessEnv } | undefined
    const runtime = new HarnessRuntime({
      dshEntryPath: paths['bin.js']!,
      nodeExecutablePath: paths['node']!,
      nodeEntryPath: paths['harness-node-entry.mjs']!,
      profileModulePathsPath,
      dshPatchPath: paths['dsh-desktop.patch.yml']!,
      dshHome: join(root, 'harness'),
      logPath: join(root, 'logs', 'harness.log'),
      startupTimeoutMs: 1,
      onChanged: () => {},
      launchProcess: (_executable, args, spawnOptions: SpawnOptionsWithoutStdio) => {
        captured = { args, environment: spawnOptions.env ?? {} }
        const child = new EventEmitter() as unknown as ChildProcessWithoutNullStreams
        Object.assign(child, { stdout: new EventEmitter(), stderr: new EventEmitter(), exitCode: 0 })
        return child
      }
    })

    await runtime.start(join(root, 'launch'))
    await runtime.stop()
    expect(captured).toBeDefined()
    return captured!
  }

  // A bare Windows path is read as a `c:` URL scheme and Node exits before the
  // harness entry runs, so the preload has to be handed over as a file URL.
  it('preloads the profile resolution shim as a file URL', async () => {
    const { args, environment } = await launchOnce({ withProfileModulePaths: true })

    const specifier = args[args.indexOf('--import') + 1]
    expect(specifier).toMatch(/^file:\/\//)
    expect(new URL(specifier!).pathname).toContain('profile-module-paths.mjs')
    expect(environment.DSH_DESKTOP_PROFILES).toBe(HARNESS_PROFILE)
  })

  it('starts without the shim rather than crashing when it is missing', async () => {
    const { args } = await launchOnce({ withProfileModulePaths: false })

    expect(args).not.toContain('--import')
    expect(args[0]).toBe('--expose-internals')
  })
})

describe('navigation trust boundary', () => {
  it('only trusts the launcher and loopback HTTP pages', () => {
    expect(isTrustedAppUrl('file:///app/index.html')).toBe(true)
    expect(isTrustedAppUrl('http://127.0.0.1:43127')).toBe(true)
    expect(isTrustedAppUrl('http://localhost:43127')).toBe(true)
    expect(isTrustedAppUrl('https://127.0.0.1:43127')).toBe(false)
    expect(isTrustedAppUrl('http://example.com')).toBe(false)
    expect(isTrustedAppUrl('javascript:alert(1)')).toBe(false)
  })

  it('only grants clipboard writes from the trusted main frame', () => {
    expect(
      canGrantWindowPermission(
        'clipboard-sanitized-write',
        'http://127.0.0.1:43127/session',
        true
      )
    ).toBe(true)
    expect(
      canGrantWindowPermission(
        'clipboard-sanitized-write',
        'http://localhost:43127/session',
        true
      )
    ).toBe(true)
    expect(
      canGrantWindowPermission('clipboard-read', 'http://127.0.0.1:43127/session', true)
    ).toBe(false)
    expect(
      canGrantWindowPermission(
        'clipboard-sanitized-write',
        'http://127.0.0.1:43127/session',
        false
      )
    ).toBe(false)
    expect(
      canGrantWindowPermission(
        'clipboard-sanitized-write',
        'https://example.com/session',
        true
      )
    ).toBe(false)
    expect(
      canGrantWindowPermission('clipboard-sanitized-write', 'file:///tmp/app.html', true)
    ).toBe(false)
  })
})

describe('Harness window activation', () => {
  it('preserves the current page when the existing Harness instance is focused again', () => {
    expect(
      shouldLoadHarnessUrl(
        'http://127.0.0.1:43127/settings/models',
        'http://127.0.0.1:43127'
      )
    ).toBe(false)
  })

  it('loads the page for a new window or a restarted Harness instance', () => {
    expect(shouldLoadHarnessUrl('about:blank', 'http://127.0.0.1:43127')).toBe(true)
    expect(
      shouldLoadHarnessUrl('http://127.0.0.1:43127/settings', 'http://127.0.0.1:43128')
    ).toBe(true)
  })

  it('recognizes Electron navigation cancellation without hiding other load failures', () => {
    expect(isAbortedNavigationError({ code: 'ERR_ABORTED', errno: -3 })).toBe(true)
    expect(
      isAbortedNavigationError(
        new Error("ERR_ABORTED (-3) loading 'http://127.0.0.1:43127/'")
      )
    ).toBe(true)
    expect(isAbortedNavigationError({ code: 'ERR_CONNECTION_REFUSED', errno: -102 })).toBe(
      false
    )
  })
})
