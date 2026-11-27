import { describe, expect, it, vi } from 'vitest'
import {
  applyWindowsHide,
  attachHiddenConsole,
  enforceWindowsChildProcessHide,
  HIDDEN_CONSOLE_ENV
} from '../build/windows-hide-console-import.mjs'

interface NativeCall {
  library: string
  name: string
  args: unknown[]
}

type NativeResult = boolean | number | null

const STD_INPUT_HANDLE = 0xFFFFFFF6
const STD_OUTPUT_HANDLE = 0xFFFFFFF5
const STD_ERROR_HANDLE = 0xFFFFFFF4

function fakeLoad(handlers: Record<string, NativeResult | ((call: number) => NativeResult)>, calls: NativeCall[]) {
  return (library: string) => ({
    func(name: string) {
      return (...args: unknown[]) => {
        calls.push({ library, name, args })
        const handler = handlers[name]
        const call = calls.filter(entry => entry.name === name).length
        if (typeof handler === 'function') return handler(call)
        if (handler === undefined) return true
        return handler
      }
    }
  })
}

function names(calls: NativeCall[]) {
  return calls.map(call => `${call.library}:${call.name}`)
}

describe('windows hidden console bootstrap', () => {
  it('allocates a hidden console and puts the original standard handles back', () => {
    const calls: NativeCall[] = []
    const env: NodeJS.ProcessEnv = {}
    expect(attachHiddenConsole({ load: fakeLoad({ AllocConsole: true, GetConsoleWindow: 7 }, calls), env, platform: 'win32' })).toBe(true)
    expect(env[HIDDEN_CONSOLE_ENV]).toBe('1')
    expect(names(calls)).toEqual([
      'kernel32.dll:GetStdHandle',
      'kernel32.dll:GetStdHandle',
      'kernel32.dll:GetStdHandle',
      'kernel32.dll:AllocConsole',
      'kernel32.dll:GetConsoleWindow',
      'user32.dll:ShowWindow',
      'kernel32.dll:SetStdHandle',
      'kernel32.dll:SetStdHandle',
      'kernel32.dll:SetStdHandle'
    ])
    expect(calls[0]?.args).toEqual([STD_INPUT_HANDLE])
    expect(calls[1]?.args).toEqual([STD_OUTPUT_HANDLE])
    expect(calls[2]?.args).toEqual([STD_ERROR_HANDLE])
    expect(calls[5]?.args).toEqual([7, 0])
    expect(calls[6]?.args).toEqual([STD_INPUT_HANDLE, true])
    expect(calls[7]?.args).toEqual([STD_OUTPUT_HANDLE, true])
    expect(calls[8]?.args).toEqual([STD_ERROR_HANDLE, true])
    expect(calls.some(call => call.name === 'AttachConsole')).toBe(false)
  })

  it('skips ShowWindow when the new console has no window', () => {
    const calls: NativeCall[] = []
    const env: NodeJS.ProcessEnv = {}
    expect(attachHiddenConsole({
      load: fakeLoad({ AllocConsole: true, GetConsoleWindow: null }, calls),
      env,
      platform: 'win32'
    })).toBe(true)
    expect(env[HIDDEN_CONSOLE_ENV]).toBe('1')
    expect(names(calls)).toEqual([
      'kernel32.dll:GetStdHandle',
      'kernel32.dll:GetStdHandle',
      'kernel32.dll:GetStdHandle',
      'kernel32.dll:AllocConsole',
      'kernel32.dll:GetConsoleWindow',
      'kernel32.dll:SetStdHandle',
      'kernel32.dll:SetStdHandle',
      'kernel32.dll:SetStdHandle'
    ])
  })

  it('restores standard handles when AllocConsole fails', () => {
    const calls: NativeCall[] = []
    const env: NodeJS.ProcessEnv = {}
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    expect(attachHiddenConsole({
      load: fakeLoad({ AllocConsole: false }, calls),
      env,
      platform: 'win32'
    })).toBe(false)
    expect(env[HIDDEN_CONSOLE_ENV]).toBeUndefined()
    expect(names(calls)).toEqual([
      'kernel32.dll:GetStdHandle',
      'kernel32.dll:GetStdHandle',
      'kernel32.dll:GetStdHandle',
      'kernel32.dll:AllocConsole',
      'kernel32.dll:SetStdHandle',
      'kernel32.dll:SetStdHandle',
      'kernel32.dll:SetStdHandle'
    ])
    expect(write).toHaveBeenCalledWith(expect.stringContaining('AllocConsole returned false'))
    write.mockRestore()
  })

  it('swallows a loader failure', () => {
    const env: NodeJS.ProcessEnv = {}
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    expect(attachHiddenConsole({
      load: () => { throw new Error('koffi missing') },
      env,
      platform: 'win32'
    })).toBe(false)
    expect(env[HIDDEN_CONSOLE_ENV]).toBeUndefined()
    expect(write).toHaveBeenCalledWith(expect.stringContaining('koffi missing'))
    write.mockRestore()
  })

  it('does nothing off Windows', () => {
    const env: NodeJS.ProcessEnv = {}
    expect(attachHiddenConsole({
      load: () => { throw new Error('should not load') },
      env,
      platform: 'darwin'
    })).toBe(false)
    expect(env[HIDDEN_CONSOLE_ENV]).toBeUndefined()
  })
})

describe('applyWindowsHide', () => {
  it('adds windowsHide true when undefined', () => {
    expect(applyWindowsHide(undefined)).toEqual({ windowsHide: true })
    expect(applyWindowsHide({})).toEqual({ windowsHide: true })
    expect(applyWindowsHide({ cwd: 'dir' })).toEqual({ cwd: 'dir', windowsHide: true })
  })

  it('preserves explicit windowsHide value', () => {
    expect(applyWindowsHide({ windowsHide: false })).toEqual({ windowsHide: false })
    expect(applyWindowsHide({ windowsHide: true })).toEqual({ windowsHide: true })
  })
})

describe('enforceWindowsChildProcessHide', () => {
  it('patches childProcess methods to inject windowsHide on Windows', () => {
    let capturedOptions: unknown
    const fakeCp = {
      spawn: vi.fn((_cmd, _args, opts) => { capturedOptions = opts; return {} }),
      spawnSync: vi.fn(),
      exec: vi.fn(),
      execSync: vi.fn(),
      execFile: vi.fn(),
      execFileSync: vi.fn(),
      fork: vi.fn()
    } as any

    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })
    try {
      enforceWindowsChildProcessHide(fakeCp, () => {})
      fakeCp.spawn('codex.exe', ['--version'])
      expect(capturedOptions).toEqual({ windowsHide: true })

      fakeCp.spawn('codex.exe', ['--version'], { windowsHide: false })
      expect(capturedOptions).toEqual({ windowsHide: false })
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
    }
  })
})
