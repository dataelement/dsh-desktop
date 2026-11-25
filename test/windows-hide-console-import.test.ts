import { describe, expect, it, vi } from 'vitest'
import { attachHiddenConsole, attachParentRequested, HIDDEN_CONSOLE_ENV } from '../build/windows-hide-console-import.mjs'

interface NativeCall {
  library: string
  name: string
  args: unknown[]
}

type NativeResult = boolean | number | null

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
  it('reads attach=parent from the import URL', () => {
    expect(attachParentRequested('file:///C:/app/windows-hide-console-import.mjs?attach=parent')).toBe(true)
    expect(attachParentRequested('file:///C:/Program%20Files/DSH/%E4%B8%AD%E6%96%87/windows-hide-console-import.mjs?x=1&attach=parent')).toBe(true)
    expect(attachParentRequested('file:///C:/app/windows-hide-console-import.mjs')).toBe(false)
    expect(attachParentRequested('not a url')).toBe(false)
  })

  it('allocates and hides a console when attach was not requested', () => {
    const calls: NativeCall[] = []
    const env: NodeJS.ProcessEnv = {}
    expect(attachHiddenConsole({ load: fakeLoad({ AllocConsole: true, GetConsoleWindow: 7 }, calls), env, platform: 'win32' })).toBe(true)
    expect(env[HIDDEN_CONSOLE_ENV]).toBe('1')
    expect(names(calls)).toEqual([
      'kernel32.dll:AllocConsole',
      'kernel32.dll:GetConsoleWindow',
      'user32.dll:ShowWindow'
    ])
    expect(calls[2]?.args).toEqual([7, 0])
    expect(calls.some(call => call.name === 'AttachConsole')).toBe(false)
  })

  it('keeps a hidden parent console without allocating one', () => {
    const calls: NativeCall[] = []
    const env: NodeJS.ProcessEnv = {}
    expect(attachHiddenConsole({
      load: fakeLoad({ AttachConsole: true, GetConsoleWindow: 7, IsWindowVisible: false }, calls),
      env,
      platform: 'win32',
      attachParent: true
    })).toBe(true)
    expect(env[HIDDEN_CONSOLE_ENV]).toBe('1')
    expect(names(calls)).toEqual([
      'kernel32.dll:AttachConsole',
      'kernel32.dll:GetConsoleWindow',
      'user32.dll:IsWindowVisible'
    ])
    expect(calls[0]?.args).toEqual([0xFFFFFFFF])
  })

  it('keeps a parent console that has no window', () => {
    const calls: NativeCall[] = []
    const env: NodeJS.ProcessEnv = {}
    expect(attachHiddenConsole({
      load: fakeLoad({ AttachConsole: true, GetConsoleWindow: null }, calls),
      env,
      platform: 'win32',
      attachParent: true
    })).toBe(true)
    expect(env[HIDDEN_CONSOLE_ENV]).toBe('1')
    expect(names(calls)).toEqual([
      'kernel32.dll:AttachConsole',
      'kernel32.dll:GetConsoleWindow'
    ])
  })

  it('drops a visible parent console and allocates a hidden one', () => {
    const calls: NativeCall[] = []
    const env: NodeJS.ProcessEnv = {}
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    expect(attachHiddenConsole({
      load: fakeLoad({
        AttachConsole: true,
        GetConsoleWindow: call => call === 1 ? 7 : 9,
        IsWindowVisible: true,
        AllocConsole: true
      }, calls),
      env,
      platform: 'win32',
      attachParent: true
    })).toBe(true)
    expect(env[HIDDEN_CONSOLE_ENV]).toBe('1')
    expect(names(calls)).toEqual([
      'kernel32.dll:AttachConsole',
      'kernel32.dll:GetConsoleWindow',
      'user32.dll:IsWindowVisible',
      'kernel32.dll:FreeConsole',
      'kernel32.dll:AllocConsole',
      'kernel32.dll:GetConsoleWindow',
      'user32.dll:ShowWindow'
    ])
    expect(calls[6]?.args).toEqual([9, 0])
    expect(write).toHaveBeenCalledWith(expect.stringContaining('parent console is visible'))
    write.mockRestore()
  })

  it('reports a visible parent console that cannot be released without allocating', () => {
    const calls: NativeCall[] = []
    const env: NodeJS.ProcessEnv = {}
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    expect(attachHiddenConsole({
      load: fakeLoad({ AttachConsole: true, GetConsoleWindow: 7, IsWindowVisible: true, FreeConsole: false }, calls),
      env,
      platform: 'win32',
      attachParent: true
    })).toBe(false)
    expect(env[HIDDEN_CONSOLE_ENV]).toBeUndefined()
    expect(names(calls)).toEqual([
      'kernel32.dll:AttachConsole',
      'kernel32.dll:GetConsoleWindow',
      'user32.dll:IsWindowVisible',
      'kernel32.dll:FreeConsole'
    ])
    expect(write).toHaveBeenCalledWith(expect.stringContaining('could not be released'))
    write.mockRestore()
  })

  it('allocates a hidden console when the parent has none', () => {
    const calls: NativeCall[] = []
    const env: NodeJS.ProcessEnv = {}
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    expect(attachHiddenConsole({
      load: fakeLoad({ AttachConsole: false, AllocConsole: true, GetConsoleWindow: 7 }, calls),
      env,
      platform: 'win32',
      attachParent: true
    })).toBe(true)
    expect(env[HIDDEN_CONSOLE_ENV]).toBe('1')
    expect(names(calls)).toEqual([
      'kernel32.dll:AttachConsole',
      'kernel32.dll:AllocConsole',
      'kernel32.dll:GetConsoleWindow',
      'user32.dll:ShowWindow'
    ])
    expect(calls[0]?.args).toEqual([0xFFFFFFFF])
    expect(write).toHaveBeenCalledWith(expect.stringContaining('parent console was not attached'))
    write.mockRestore()
  })

  it('leaves the marker unset when attach and AllocConsole both fail', () => {
    const calls: NativeCall[] = []
    const env: NodeJS.ProcessEnv = {}
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    expect(attachHiddenConsole({
      load: fakeLoad({ AttachConsole: false, AllocConsole: false }, calls),
      env,
      platform: 'win32',
      attachParent: true
    })).toBe(false)
    expect(env[HIDDEN_CONSOLE_ENV]).toBeUndefined()
    expect(names(calls)).toEqual([
      'kernel32.dll:AttachConsole',
      'kernel32.dll:AllocConsole'
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
      platform: 'darwin',
      attachParent: true
    })).toBe(false)
    expect(env[HIDDEN_CONSOLE_ENV]).toBeUndefined()
  })
})
