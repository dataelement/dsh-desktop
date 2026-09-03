import { describe, expect, it, vi } from 'vitest'
import { createHiddenConsole } from '../build/windows-hidden-console.mjs'

describe('createHiddenConsole', () => {
  it('allocates a console and hides it with SW_HIDE', () => {
    const allocConsole = vi.fn(() => true)
    const getConsoleWindow = vi.fn(() => 123n)
    const showWindow = vi.fn(() => true)

    const load = vi.fn((name: string) => {
      if (name === 'kernel32.dll') {
        return {
          func: vi.fn((fn: string) =>
            fn === 'AllocConsole' ? allocConsole : getConsoleWindow
          )
        }
      }
      if (name === 'user32.dll') {
        return { func: vi.fn(() => showWindow) }
      }
      throw new Error(`unexpected library ${name}`)
    })

    expect(createHiddenConsole({ load })).toBe(true)
    expect(allocConsole).toHaveBeenCalledOnce()
    expect(showWindow).toHaveBeenCalledWith(123n, 0)
  })

  it('returns false without hiding when AllocConsole fails', () => {
    const allocConsole = vi.fn(() => false)
    const showWindow = vi.fn()
    const load = vi.fn((name: string) => {
      if (name === 'kernel32.dll') {
        return {
          func: vi.fn((fn: string) => (fn === 'AllocConsole' ? allocConsole : vi.fn(() => 0n)))
        }
      }
      return { func: vi.fn(() => showWindow) }
    })

    expect(createHiddenConsole({ load })).toBe(false)
    expect(showWindow).not.toHaveBeenCalled()
  })

  it('skips ShowWindow when GetConsoleWindow returns a null window', () => {
    const allocConsole = vi.fn(() => true)
    const showWindow = vi.fn()
    const load = vi.fn((name: string) => {
      if (name === 'kernel32.dll') {
        return {
          func: vi.fn((fn: string) => (fn === 'AllocConsole' ? allocConsole : vi.fn(() => null)))
        }
      }
      return { func: vi.fn(() => showWindow) }
    })

    expect(createHiddenConsole({ load })).toBe(true)
    expect(showWindow).not.toHaveBeenCalled()
  })

  it('swallows loader errors and returns false', () => {
    const load = vi.fn(() => {
      throw new Error('win32 unavailable')
    })
    expect(createHiddenConsole({ load })).toBe(false)
  })
})
