import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ shell: { openExternal: vi.fn().mockResolvedValue(undefined) } }))
import { shell } from 'electron'
import { secureWindow } from '../src/main/security'

describe('desktop link routing', () => {
  it('routes other origins externally and follows the current runtime port', () => {
    const listeners = new Map<string, (...args: any[]) => void>()
    let open!: (details: { url: string }) => { action: string }
    let appUrl = 'http://127.0.0.1:43127'
    const webContents = {
      setWindowOpenHandler: vi.fn((handler) => { open = handler }),
      on: vi.fn((event, handler) => { listeners.set(event, handler) }),
      session: {
        setPermissionCheckHandler: vi.fn(),
        setPermissionRequestHandler: vi.fn()
      }
    }
    secureWindow({ webContents } as unknown as Parameters<typeof secureWindow>[0], () => appUrl)
    expect(open({ url: `${appUrl}/session` })).toEqual({ action: 'allow' })
    for (const url of ['http://127.0.0.1:8080/', 'http://localhost:8080/', 'https://example.com/']) {
      expect(open({ url })).toEqual({ action: 'deny' })
      expect(shell.openExternal).toHaveBeenLastCalledWith(url)
      const preventDefault = vi.fn()
      listeners.get('will-navigate')!({ preventDefault }, url)
      expect(preventDefault).toHaveBeenCalledOnce()
    }
    const preventDefault = vi.fn()
    listeners.get('will-navigate')!({ preventDefault }, `${appUrl}/settings`)
    expect(preventDefault).not.toHaveBeenCalled()
    appUrl = 'http://127.0.0.1:43128'
    expect(open({ url: 'http://127.0.0.1:43127/session' })).toEqual({ action: 'deny' })
    expect(open({ url: `${appUrl}/session` })).toEqual({ action: 'allow' })
    vi.mocked(shell.openExternal).mockClear()
    expect(open({ url: 'javascript:alert(1)' })).toEqual({ action: 'deny' })
    expect(shell.openExternal).not.toHaveBeenCalled()
  })
})
