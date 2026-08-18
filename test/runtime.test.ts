import { describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import { readFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { parse } from 'yaml'
import {
  buildHarnessArguments,
  buildHarnessSpawnOptions,
  buildNodeArguments,
  formatExitCode,
  HarnessRuntime
} from '../src/main/runtime/harness-runtime'
import {
  disableIncompatibleUserPlugins,
  extractLoaderEntryFailures,
  marketStatePath,
  profilePatchPath
} from '../src/main/runtime/plugin-recovery'
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

  it('makes native Windows termination codes diagnosable', () => {
    expect(formatExitCode(4294930435)).toContain(
      '0xFFFF7003, Crashpad handler unavailable'
    )
  })
})

describe('incompatible user plugin recovery', () => {
  it('disables only failed entries backed by user-installed packages', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-desktop-recovery-'))
    const pluginDirectory = join(home, 'profiles', 'web', 'node_modules', 'broken-plugin')
    const transientPluginDirectory = join(
      home,
      'profiles',
      'web',
      'node_modules',
      'transient-plugin'
    )
    await mkdir(pluginDirectory, { recursive: true })
    await mkdir(transientPluginDirectory, { recursive: true })
    await writeFile(
      join(pluginDirectory, 'package.json'),
      JSON.stringify({ name: 'broken-plugin' }),
      'utf8'
    )
    await writeFile(
      join(transientPluginDirectory, 'package.json'),
      JSON.stringify({ name: 'transient-plugin' }),
      'utf8'
    )
    await writeFile(
      profilePatchPath(home),
      [
        '# profile comment',
        '- id: broken',
        '  disabled: true',
        '- id: broken',
        '  disabled: false',
        '- id: kept',
        '  disabled: !!js process.env.KEEP_PLUGIN_DISABLED',
        '- id: forced',
        '  disabled: false',
        ''
      ].join('\n'),
      'utf8'
    )
    await mkdir(join(home, 'profiles', 'web', '.dsh-market'), { recursive: true })
    await writeFile(
      marketStatePath(home),
      JSON.stringify({
        disabled: ['already-disabled'],
        groups: { pinned: ['already-disabled'] },
        groupOrder: ['pinned']
      }),
      'utf8'
    )
    const stderr = [
      'Error: failed to apply loader entry broken (broken-plugin): unsupported JSON schema: schema.required is not supported',
      'Error: failed to apply loader entry transient (transient-plugin): ENOENT: missing user config',
      'Error: failed to apply loader entry core (@deepseek-ai/dsh-core): internal failure'
    ].join('\n')

    try {
      expect(extractLoaderEntryFailures(stderr)).toEqual([
        {
          id: 'broken',
          name: 'broken-plugin',
          reason: 'unsupported JSON schema: schema.required is not supported'
        },
        {
          id: 'transient',
          name: 'transient-plugin',
          reason: 'ENOENT: missing user config'
        },
        { id: 'core', name: '@deepseek-ai/dsh-core', reason: 'internal failure' }
      ])
      await expect(disableIncompatibleUserPlugins(home, stderr)).resolves.toEqual([
        'broken-plugin'
      ])
      const patchText = await readFile(profilePatchPath(home), 'utf8')
      expect(patchText).toContain('# profile comment')
      expect(patchText).toContain('disabled: !!js process.env.KEEP_PLUGIN_DISABLED')
      expect(patchText).toContain('- id: forced\n  disabled: false')
      expect(patchText.match(/- id: broken\n  disabled: true/g)).toHaveLength(2)
      expect(parse(patchText.replace('!!js ', ''))).toEqual([
        { id: 'broken', disabled: true },
        { id: 'broken', disabled: false },
        {
          id: 'kept',
          disabled: 'process.env.KEEP_PLUGIN_DISABLED'
        },
        { id: 'forced', disabled: false },
        { id: 'broken', disabled: true }
      ])
      expect(JSON.parse(await readFile(marketStatePath(home), 'utf8'))).toEqual({
        disabled: ['already-disabled', 'broken-plugin'],
        groups: { pinned: ['already-disabled'] },
        groupOrder: ['pinned']
      })
      await expect(disableIncompatibleUserPlugins(home, stderr)).resolves.toEqual([])
    } finally {
      await rm(home, { recursive: true, force: true })
    }
  })

  it('does not disable plugins for ENOENT startup errors', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-desktop-recovery-'))
    const pluginDirectory = join(home, 'profiles', 'web', 'node_modules', 'missing-config')
    await mkdir(pluginDirectory, { recursive: true })
    await writeFile(join(pluginDirectory, 'package.json'), '{"name":"missing-config"}', 'utf8')
    const stderr =
      'Error: failed to apply loader entry missing (missing-config): ENOENT: no such file or directory'

    try {
      await expect(disableIncompatibleUserPlugins(home, stderr)).resolves.toEqual([])
      await expect(readFile(profilePatchPath(home), 'utf8')).rejects.toMatchObject({
        code: 'ENOENT'
      })
      await expect(readFile(marketStatePath(home), 'utf8')).rejects.toMatchObject({
        code: 'ENOENT'
      })
    } finally {
      await rm(home, { recursive: true, force: true })
    }
  })

  it('does not overwrite invalid plugin market state', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-desktop-recovery-'))
    const pluginDirectory = join(home, 'profiles', 'web', 'node_modules', 'broken-plugin')
    await mkdir(pluginDirectory, { recursive: true })
    await writeFile(join(pluginDirectory, 'package.json'), '{"name":"broken-plugin"}', 'utf8')
    await mkdir(join(home, 'profiles', 'web', '.dsh-market'), { recursive: true })
    await writeFile(marketStatePath(home), '{invalid', 'utf8')
    const stderr =
      'Error: failed to apply loader entry broken (broken-plugin): unsupported JSON schema: unsupported'

    try {
      await expect(disableIncompatibleUserPlugins(home, stderr)).rejects.toThrow()
      await expect(readFile(marketStatePath(home), 'utf8')).resolves.toBe('{invalid')
      await expect(readFile(profilePatchPath(home), 'utf8')).rejects.toMatchObject({
        code: 'ENOENT'
      })
    } finally {
      await rm(home, { recursive: true, force: true })
    }
  })

  it('retries startup after disabling a failed user plugin', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-desktop-runtime-'))
    const home = join(root, 'harness')
    const profileDirectory = join(home, 'profiles', 'web')
    const pluginDirectory = join(profileDirectory, 'node_modules', 'broken-plugin')
    const dshEntry = join(root, 'fake-dsh.mjs')
    const desktopPatch = join(root, 'desktop.yml')
    await mkdir(pluginDirectory, { recursive: true })
    await writeFile(join(pluginDirectory, 'package.json'), '{"name":"broken-plugin"}', 'utf8')
    await writeFile(
      profilePatchPath(home),
      '# profile comment\n[]\n',
      'utf8'
    )
    await writeFile(desktopPatch, '[]\n', 'utf8')
    await writeFile(
      dshEntry,
      `import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { join } from 'node:path'
const patch = join(process.env.DSH_HOME, 'profiles', 'web', 'cordis.patch.yml')
if (!existsSync(patch) || !String(await import('node:fs/promises').then(fs => fs.readFile(patch, 'utf8'))).includes('id: broken')) {
  const port = Number(process.argv[process.argv.indexOf('--port') + 1])
  const transientServer = createServer((_request, response) => response.end('not ready'))
  await new Promise(resolve => transientServer.listen(port, '127.0.0.1', resolve))
  await new Promise(resolve => setTimeout(resolve, 500))
  await new Promise((resolve, reject) => transientServer.close(error => error ? reject(error) : resolve()))
  throw new Error('profile failed', { cause: new AggregateError([
    new Error('failed to apply loader entry broken (broken-plugin): service "example" has been registered')
  ]) })
}
const port = Number(process.argv[process.argv.indexOf('--port') + 1])
createServer((_request, response) => response.end('ok')).listen(port, '127.0.0.1')
`,
      'utf8'
    )

    const runtime = new HarnessRuntime({
      dshEntryPath: dshEntry,
      nodeExecutablePath: process.execPath,
      nodeEntryPath: resolve('build/harness-node-entry.mjs'),
      dshPatchPath: desktopPatch,
      dshHome: home,
      logPath: join(root, 'harness.log'),
      launchProcess: (executablePath, args, options) => spawn(executablePath, args, options),
      startupTimeoutMs: 5_000,
      onChanged: () => undefined
    })

    try {
      await runtime.start(root)
      expect(runtime.snapshot().phase).toBe('ready')
      expect(runtime.snapshot().logs.join('\n')).toContain(
        '[desktop] disabled incompatible plugins: broken-plugin'
      )
      expect(runtime.snapshot().disabledPlugins).toEqual(['broken-plugin'])
      expect(parse(await readFile(profilePatchPath(home), 'utf8'))).toEqual([
        { id: 'broken', disabled: true }
      ])
      expect(JSON.parse(await readFile(marketStatePath(home), 'utf8'))).toEqual({
        disabled: ['broken-plugin'],
        groups: {},
        groupOrder: []
      })
    } finally {
      await runtime.stop()
      await rm(root, { recursive: true, force: true })
    }
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
