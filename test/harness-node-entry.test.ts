import { execFileSync, spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { applyWindowsHide } from '../build/windows-child-process-hide.mjs'
import { projectRoot } from './patch-path'

describe('linked Profile plugin host dependency fallback', () => {
  it('keeps the plugin local and resolves only missing @deepseek-ai peers from the host', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-host-module-fallback-'))
    try {
      const host = join(root, 'host')
      const localPlugin = join(root, 'local-plugin')
      const profileModules = join(root, 'profile', 'node_modules')
      const hostPeer = join(host, 'node_modules', '@deepseek-ai', 'host-peer')
      const hostOrdinary = join(host, 'node_modules', 'ordinary-host-only')
      await Promise.all([
        mkdir(hostPeer, { recursive: true }),
        mkdir(hostOrdinary, { recursive: true }),
        mkdir(localPlugin, { recursive: true }),
        mkdir(profileModules, { recursive: true })
      ])
      await Promise.all([
        writeFile(join(hostPeer, 'package.json'), JSON.stringify({ name: '@deepseek-ai/host-peer', type: 'module', exports: './index.js' })),
        writeFile(join(hostPeer, 'index.js'), 'export const source = "host-peer"\n'),
        writeFile(join(hostOrdinary, 'package.json'), JSON.stringify({ name: 'ordinary-host-only', type: 'module', exports: './index.js' })),
        writeFile(join(hostOrdinary, 'index.js'), 'export const source = "host-ordinary"\n'),
        writeFile(join(localPlugin, 'package.json'), JSON.stringify({ name: 'linked-plugin', type: 'module', exports: './index.js' })),
        writeFile(join(localPlugin, 'index.js'), `
          import { source } from '@deepseek-ai/host-peer'
          let ordinary = 'missing'
          try { await import('ordinary-host-only'); ordinary = 'host-leaked' } catch {}
          export const result = { source, ordinary }
        `),
        writeFile(join(host, 'entry.mjs'), `
          export async function runCli() {
            const plugin = await import(${JSON.stringify(pathToFileURL(join(profileModules, 'linked-plugin', 'index.js')).href)})
            process.stdout.write('fixture:' + JSON.stringify(plugin.result) + '\\n')
          }
        `)
      ])
      await symlink(localPlugin, join(profileModules, 'linked-plugin'))

      const result = spawnSync(process.execPath, [
        join(projectRoot, 'build', 'harness-node-entry.mjs'),
        join(host, 'entry.mjs')
      ], { encoding: 'utf8' })

      expect(result.status, result.stderr).toBe(0)
      expect(result.stdout).toContain('fixture:{"source":"host-peer","ordinary":"missing"}')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  // Reproduces the shape seen in production crash reports: a host package in
  // the shared Profile tree is older than the subpath its importer needs, so
  // resolution fails with ERR_PACKAGE_PATH_NOT_EXPORTED rather than not-found.
  it('retries a stale host peer whose subpath the installation does export', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-host-module-subpath-'))
    try {
      const host = join(root, 'host')
      const profileModules = join(root, 'profile', 'node_modules')
      const stalePeer = join(profileModules, '@deepseek-ai', 'host-peer')
      const hostPeer = join(host, 'node_modules', '@deepseek-ai', 'host-peer')
      const plugin = join(profileModules, '@deepseek-ai', 'host-peer-local', 'lib')
      await Promise.all([
        mkdir(stalePeer, { recursive: true }),
        mkdir(hostPeer, { recursive: true }),
        mkdir(plugin, { recursive: true })
      ])
      await Promise.all([
        // The stale copy resolves first and has no './control'.
        writeFile(join(stalePeer, 'package.json'), JSON.stringify({
          name: '@deepseek-ai/host-peer', type: 'module', exports: { '.': './index.js' }
        })),
        writeFile(join(stalePeer, 'index.js'), 'export const source = "stale"\n'),
        writeFile(join(hostPeer, 'package.json'), JSON.stringify({
          name: '@deepseek-ai/host-peer', type: 'module', exports: { '.': './index.js', './control': './control.js' }
        })),
        writeFile(join(hostPeer, 'index.js'), 'export const source = "host"\n'),
        writeFile(join(hostPeer, 'control.js'), 'export const control = "host-control"\n'),
        writeFile(join(plugin, '..', 'package.json'), JSON.stringify({
          name: '@deepseek-ai/host-peer-local', type: 'module', exports: './lib/index.js'
        })),
        writeFile(join(plugin, 'index.js'), `
          import { control } from '@deepseek-ai/host-peer/control'
          import { source } from '@deepseek-ai/host-peer'
          export const result = { control, source }
        `),
        writeFile(join(host, 'entry.mjs'), `
          export async function runCli() {
            const plugin = await import(${JSON.stringify(pathToFileURL(join(profileModules, '@deepseek-ai', 'host-peer-local', 'lib', 'index.js')).href)})
            process.stdout.write('fixture:' + JSON.stringify(plugin.result) + '\\n')
          }
        `)
      ])

      const result = spawnSync(process.execPath, [
        join(projectRoot, 'build', 'harness-node-entry.mjs'),
        join(host, 'entry.mjs')
      ], { encoding: 'utf8' })

      expect(result.status, result.stderr).toBe(0)
      // Only the missing subpath comes from the host; the bare specifier keeps
      // resolving to the copy the plugin's own tree provides.
      expect(result.stdout).toContain('fixture:{"control":"host-control","source":"stale"}')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  // Crash reports lose `code` to Harness's wrapper, so `imported from <plugin>`
  // is the only thing that still names the faulty plugin. The host retry must
  // not overwrite it with the installation entry.
  it('keeps the importing plugin in the failure when the host cannot help either', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-host-module-diagnostic-'))
    try {
      const host = join(root, 'host')
      const localPlugin = join(root, 'local-plugin')
      const profileModules = join(root, 'profile', 'node_modules')
      await Promise.all([
        mkdir(join(host, 'node_modules'), { recursive: true }),
        mkdir(localPlugin, { recursive: true }),
        mkdir(profileModules, { recursive: true })
      ])
      await Promise.all([
        writeFile(join(localPlugin, 'package.json'), JSON.stringify({ name: 'linked-plugin', type: 'module', exports: './index.js' })),
        writeFile(join(localPlugin, 'index.js'), "import '@deepseek-ai/nowhere-at-all'\n"),
        writeFile(join(host, 'entry.mjs'), `
          export async function runCli() {
            try {
              await import(${JSON.stringify(pathToFileURL(join(profileModules, 'linked-plugin', 'index.js')).href)})
            } catch (error) {
              process.stdout.write('fixture-code:' + error.code + '\\n')
              process.stdout.write('fixture-message:' + error.message.replaceAll('\\n', ' | ') + '\\n')
            }
          }
        `)
      ])
      await symlink(localPlugin, join(profileModules, 'linked-plugin'))

      const result = spawnSync(process.execPath, [
        join(projectRoot, 'build', 'harness-node-entry.mjs'),
        join(host, 'entry.mjs')
      ], { encoding: 'utf8' })

      expect(result.status, result.stderr).toBe(0)
      expect(result.stdout).toContain('fixture-code:ERR_MODULE_NOT_FOUND')
      const message = result.stdout.split('fixture-message:')[1] ?? ''
      // The plugin's own physical path, not the host entry, owns the failure.
      expect(message).toContain(localPlugin)
      expect(message).toContain('host fallback from')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('applyWindowsHide helper', () => {
  it('adds windowsHide: true when options is undefined', () => {
    expect(applyWindowsHide(undefined)).toEqual({ windowsHide: true })
  })

  it('adds windowsHide: true to existing options', () => {
    expect(applyWindowsHide({ cwd: '/tmp' })).toEqual({ cwd: '/tmp', windowsHide: true })
  })

  it('preserves explicit windowsHide: false', () => {
    expect(applyWindowsHide({ windowsHide: false })).toEqual({ windowsHide: false })
  })

  it('preserves explicit windowsHide: true', () => {
    expect(applyWindowsHide({ windowsHide: true })).toEqual({ windowsHide: true })
  })

  it('adds windowsHide: true to empty options object', () => {
    expect(applyWindowsHide({})).toEqual({ windowsHide: true })
  })

  it('preserves all other options alongside windowsHide', () => {
    expect(applyWindowsHide({ cwd: 'C:\\test', env: { FOO: 'bar' }, stdio: 'pipe' })).toEqual({
      cwd: 'C:\\test',
      env: { FOO: 'bar' },
      stdio: 'pipe',
      windowsHide: true
    })
  })
})

describe('windowsHide ESM built-in synchronization', () => {
  it('reaches modules that import spawn as a named ESM export', () => {
    const helperUrl = pathToFileURL(
      join(process.cwd(), 'build', 'windows-child-process-hide.mjs')
    ).href
    const script = `
      import childProcess from 'node:child_process'
      import { syncBuiltinESMExports } from 'node:module'
      import { enforceWindowsChildProcessHide } from ${JSON.stringify(helperUrl)}

      let observed
      childProcess.spawn = (_command, _args, options) => {
        observed = options
        return { marker: true }
      }
      enforceWindowsChildProcessHide(childProcess, syncBuiltinESMExports)

      const fixture = await import('data:text/javascript,' + encodeURIComponent(
        'import { spawn } from "node:child_process"; export function run() { return spawn("fixture", [], { cwd: "C:/fixture" }) }'
      ))
      fixture.run()
      process.stdout.write(JSON.stringify(observed))
    `
    const output = execFileSync(process.execPath, ['--input-type=module', '--eval', script], {
      encoding: 'utf8'
    })

    expect(JSON.parse(output)).toEqual({ cwd: 'C:/fixture', windowsHide: true })
  })
})

describe('windowsHide patching for spawn', () => {
  let spawnSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    spawnSpy = vi.fn(() => ({ on: vi.fn(), stdout: { on: vi.fn() }, stderr: { on: vi.fn() } }))
  })

  function makePatchedSpawn(original: any) {
    return function patchedSpawn(command: string, args?: string[] | any, options?: any) {
      if (Array.isArray(args)) {
        return original(command, args, applyWindowsHide(options))
      }
      return original(command, applyWindowsHide(args))
    }
  }

  it('injects windowsHide: true for spawn(command, args, options)', () => {
    const patched = makePatchedSpawn(spawnSpy)
    patched('pwsh', ['-Command', 'echo hi'], { cwd: 'C:\\test' })
    expect(spawnSpy).toHaveBeenCalledWith(
      'pwsh',
      ['-Command', 'echo hi'],
      { cwd: 'C:\\test', windowsHide: true }
    )
  })

  it('injects windowsHide: true for spawn(command, options) (no args array)', () => {
    const patched = makePatchedSpawn(spawnSpy)
    patched('pwsh', { cwd: 'C:\\test' })
    expect(spawnSpy).toHaveBeenCalledWith(
      'pwsh',
      { cwd: 'C:\\test', windowsHide: true }
    )
  })

  it('respects explicit windowsHide: false override', () => {
    const patched = makePatchedSpawn(spawnSpy)
    patched('pwsh', ['-Command', 'echo hi'], { windowsHide: false })
    expect(spawnSpy).toHaveBeenCalledWith(
      'pwsh',
      ['-Command', 'echo hi'],
      { windowsHide: false }
    )
  })

  it('works with no args and no options', () => {
    const patched = makePatchedSpawn(spawnSpy)
    patched('pwsh')
    expect(spawnSpy).toHaveBeenCalledWith(
      'pwsh',
      { windowsHide: true }
    )
  })
})

describe('windowsHide patching for spawnSync', () => {
  let spawnSyncSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    spawnSyncSpy = vi.fn(() => ({ status: 0, stdout: '', stderr: '' }))
  })

  function makePatchedSpawnSync(original: any) {
    return function patchedSpawnSync(command: string, args?: string[] | any, options?: any) {
      if (Array.isArray(args)) {
        return original(command, args, applyWindowsHide(options))
      }
      return original(command, applyWindowsHide(args))
    }
  }

  it('injects windowsHide: true with args and options', () => {
    const patched = makePatchedSpawnSync(spawnSyncSpy)
    patched('pwsh', ['-Command', 'echo hi'], { encoding: 'utf8' })
    expect(spawnSyncSpy).toHaveBeenCalledWith(
      'pwsh',
      ['-Command', 'echo hi'],
      { encoding: 'utf8', windowsHide: true }
    )
  })
})

describe('windowsHide patching for exec', () => {
  let execSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    execSpy = vi.fn(() => ({ on: vi.fn() }))
  })

  function makePatchedExec(original: any) {
    return function patchedExec(command: string, options?: any, callback?: any) {
      if (typeof options === 'function') {
        return original(command, applyWindowsHide(undefined), options)
      }
      return original(command, applyWindowsHide(options), callback)
    }
  }

  it('injects windowsHide: true with options and callback', () => {
    const patched = makePatchedExec(execSpy)
    const cb = () => {}
    patched('pwsh -Command echo hi', { cwd: 'C:\\test' }, cb)
    expect(execSpy).toHaveBeenCalledWith(
      'pwsh -Command echo hi',
      { cwd: 'C:\\test', windowsHide: true },
      cb
    )
  })

  it('injects windowsHide: true with callback only (no options)', () => {
    const patched = makePatchedExec(execSpy)
    const cb = () => {}
    patched('pwsh -Command echo hi', cb)
    expect(execSpy).toHaveBeenCalledWith(
      'pwsh -Command echo hi',
      { windowsHide: true },
      cb
    )
  })

  it('injects windowsHide: true with options only (no callback)', () => {
    const patched = makePatchedExec(execSpy)
    patched('pwsh -Command echo hi', { cwd: 'C:\\test' })
    expect(execSpy).toHaveBeenCalledWith(
      'pwsh -Command echo hi',
      { cwd: 'C:\\test', windowsHide: true },
      undefined
    )
  })
})

describe('windowsHide patching for execFile', () => {
  let execFileSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    execFileSpy = vi.fn(() => ({ on: vi.fn() }))
  })

  function makePatchedExecFile(original: any) {
    return function patchedExecFile(file: string, args?: any, options?: any, callback?: any) {
      if (typeof args === 'function') {
        return original(file, applyWindowsHide(undefined), undefined, args)
      }
      if (typeof options === 'function') {
        return original(file, args, applyWindowsHide(undefined), options)
      }
      return original(file, args, applyWindowsHide(options), callback)
    }
  }

  it('injects windowsHide: true with args, options, and callback', () => {
    const patched = makePatchedExecFile(execFileSpy)
    const cb = () => {}
    patched('pwsh', ['-Command', 'echo hi'], { cwd: 'C:\\test' }, cb)
    expect(execFileSpy).toHaveBeenCalledWith(
      'pwsh',
      ['-Command', 'echo hi'],
      { cwd: 'C:\\test', windowsHide: true },
      cb
    )
  })

  it('injects windowsHide: true with args and callback (no options)', () => {
    const patched = makePatchedExecFile(execFileSpy)
    const cb = () => {}
    patched('pwsh', ['-Command', 'echo hi'], cb)
    expect(execFileSpy).toHaveBeenCalledWith(
      'pwsh',
      ['-Command', 'echo hi'],
      { windowsHide: true },
      cb
    )
  })

  it('injects windowsHide: true with callback only (no args, no options)', () => {
    const patched = makePatchedExecFile(execFileSpy)
    const cb = () => {}
    patched('pwsh', cb)
    expect(execFileSpy).toHaveBeenCalledWith(
      'pwsh',
      { windowsHide: true },
      undefined,
      cb
    )
  })
})

describe('windowsHide patching for fork', () => {
  let forkSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    forkSpy = vi.fn(() => ({ on: vi.fn(), send: vi.fn() }))
  })

  function makePatchedFork(original: any) {
    return function patchedFork(modulePath: string, args?: string[] | any, options?: any) {
      if (Array.isArray(args)) {
        return original(modulePath, args, applyWindowsHide(options))
      }
      return original(modulePath, applyWindowsHide(args))
    }
  }

  it('injects windowsHide: true with args and options', () => {
    const patched = makePatchedFork(forkSpy)
    patched('/path/to/worker.js', ['--foo'], { cwd: 'C:\\test' })
    expect(forkSpy).toHaveBeenCalledWith(
      '/path/to/worker.js',
      ['--foo'],
      { cwd: 'C:\\test', windowsHide: true }
    )
  })

  it('injects windowsHide: true with options only (no args)', () => {
    const patched = makePatchedFork(forkSpy)
    patched('/path/to/worker.js', { cwd: 'C:\\test' })
    expect(forkSpy).toHaveBeenCalledWith(
      '/path/to/worker.js',
      { cwd: 'C:\\test', windowsHide: true }
    )
  })
})

describe('DSH entry dispatch', () => {
  /**
   * Harness 0.1.5 moved the CLI behind `if (import.meta.main)` and exports
   * `runCli`. The Node entry imports the CLI rather than being it, so a plain
   * import loads the module, runs nothing, and lets the process exit 0 with no
   * diagnostics — the desktop then reports only "Harness stopped unexpectedly
   * (exit code 0)". Lock both halves of the contract.
   */
  it('finds the runCli export the packaged CLI gates behind import.meta.main', async () => {
    const bin = await readFile(join(projectRoot, 'node_modules/@deepseek-ai/dsh/lib/bin.js'), 'utf8')

    // Upstream still gates on import.meta.main and still exports runCli, so
    // the entry has to call it rather than rely on import side effects.
    expect(bin).toContain('import.meta.main')
    expect(bin).toMatch(/export \{[^}]*\brunCli\b/)
  })
})
