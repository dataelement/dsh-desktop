import { describe, expect, it, vi } from 'vitest'
import { attachHiddenConsole, HIDDEN_CONSOLE_ENV } from '../build/windows-hide-console-import.mjs'

interface NativeCall {
  library: string
  name: string
  args: unknown[]
}

function fakeLoad(allocates: boolean, calls: NativeCall[]) {
  return (library: string) => ({
    func(name: string) {
      return (...args: unknown[]) => {
        calls.push({ library, name, args })
        if (name === 'AllocConsole') return allocates
        if (name === 'GetConsoleWindow') return 7
        return true
      }
    }
  })
}

describe('windows hidden console bootstrap', () => {
  it('attaches a console, hides it, and marks the process', () => {
    const calls: NativeCall[] = []
    const env: NodeJS.ProcessEnv = {}
    expect(attachHiddenConsole({ load: fakeLoad(true, calls), env, platform: 'win32' })).toBe(true)
    expect(env[HIDDEN_CONSOLE_ENV]).toBe('1')
    expect(calls.map(call => `${call.library}:${call.name}`)).toEqual([
      'kernel32.dll:AllocConsole',
      'kernel32.dll:GetConsoleWindow',
      'user32.dll:ShowWindow'
    ])
    expect(calls[2]?.args).toEqual([7, 0])
  })

  it('leaves the marker unset when AllocConsole fails', () => {
    const env: NodeJS.ProcessEnv = {}
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    expect(attachHiddenConsole({ load: fakeLoad(false, []), env, platform: 'win32' })).toBe(false)
    expect(env[HIDDEN_CONSOLE_ENV]).toBeUndefined()
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
