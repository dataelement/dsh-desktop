import { describe, expect, it, vi } from 'vitest'

const shellOpenExternal = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({
  shell: { openExternal: shellOpenExternal }
}))

import { secureWindow } from '../src/main/security'

type NavigationEvent = {
  preventDefault(): void
  url?: string
  isMainFrame?: boolean
}

function secureWindowFixture() {
  const listeners = new Map<string, (event: NavigationEvent, url?: string) => void>()
  const permissionCheck = vi.fn()
  const permissionRequest = vi.fn()
  const webContents = {
    on: vi.fn((event: string, listener: (event: NavigationEvent, url?: string) => void) => {
      listeners.set(event, listener)
    }),
    setWindowOpenHandler: vi.fn(),
    session: {
      setPermissionCheckHandler: permissionCheck,
      setPermissionRequestHandler: permissionRequest
    }
  }
  secureWindow({ webContents } as never)
  return { listeners, webContents }
}

describe('main-window navigation security', () => {
  it('cancels child-frame navigation outside the preview protocol', () => {
    const { listeners } = secureWindowFixture()
    const willFrameNavigate = listeners.get('will-frame-navigate')
    expect(willFrameNavigate).toBeTypeOf('function')

    for (const url of [
      'file:///Users/example/private.txt',
      'http://example.com/',
      'http://127.0.0.1:4310/settings',
      'dsh-recovery://plugin-error/'
    ]) {
      const preventDefault = vi.fn()
      willFrameNavigate?.({ url, isMainFrame: false, preventDefault })
      expect(preventDefault, url).toHaveBeenCalledOnce()
    }

    const allowPreview = vi.fn()
    willFrameNavigate?.({
      url: 'sherlock-preview://opaque-token/index.html',
      isMainFrame: false,
      preventDefault: allowPreview
    })
    expect(allowPreview).not.toHaveBeenCalled()
  })

  it('leaves trusted main-frame navigation on the existing policy', () => {
    const { listeners } = secureWindowFixture()
    const willNavigate = listeners.get('will-navigate')
    const preventDefault = vi.fn()

    willNavigate?.({ preventDefault }, 'http://127.0.0.1:4310/research')

    expect(preventDefault).not.toHaveBeenCalled()
    expect(shellOpenExternal).not.toHaveBeenCalled()
  })
})
