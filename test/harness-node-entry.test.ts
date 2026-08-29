import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { applyWindowsHide } from '../build/windows-child-process-hide.mjs'

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
