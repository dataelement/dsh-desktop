import { readFile } from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const shellOpenExternal = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({
  shell: { openExternal: shellOpenExternal }
}))

import { secureWindow } from '../src/main/security'

beforeEach(() => shellOpenExternal.mockClear())

type NavigationEvent = {
  preventDefault(): void
  url?: string
  isMainFrame?: boolean
  initiator?: { processId: number; routingId: number } | null
}

function secureWindowFixture(allowsResearchFrameUrl: (url: string) => boolean = () => false) {
  const listeners = new Map<string, (event: NavigationEvent, url?: string) => void>()
  const permissionCheck = vi.fn()
  const permissionRequest = vi.fn()
  const mainFrame = { processId: 7, routingId: 41 }
  const webContents = {
    mainFrame,
    on: vi.fn((event: string, listener: (event: NavigationEvent, url?: string) => void) => {
      listeners.set(event, listener)
    }),
    setWindowOpenHandler: vi.fn(),
    session: {
      setPermissionCheckHandler: permissionCheck,
      setPermissionRequestHandler: permissionRequest
    }
  }
  secureWindow({ webContents } as never, { allowsResearchFrameUrl })
  return { listeners, mainFrame, webContents }
}

describe('main-window navigation security', () => {
  it('keeps the application preload and Node integration out of HTML child frames', async () => {
    const main = await readFile('src/main/index.ts', 'utf8')

    expect(main).toContain('nodeIntegration: false')
    expect(main).toContain('nodeIntegrationInSubFrames: false')
    expect(main).toContain('contextIsolation: true')
    expect(main).toContain('sandbox: true')
  })

  it('blocks child-frame HTTP navigation without spawning the system browser', () => {
    const { listeners } = secureWindowFixture()
    const willFrameNavigate = listeners.get('will-frame-navigate')
    for (const url of [
      'https://example.com/report',
      'https://example.com/second',
      'http://example.com/third'
    ]) {
      const preventDefault = vi.fn()
      willFrameNavigate?.({ url, isMainFrame: false, preventDefault })
      expect(preventDefault, url).toHaveBeenCalledOnce()
    }

    expect(shellOpenExternal).not.toHaveBeenCalled()
  })

  it('allows only research child-frame URLs approved by the active registry', () => {
    const allowsResearchFrameUrl = vi.fn((url: string) =>
      new URL(url).origin === 'https://approved.example'
    )
    const { listeners } = secureWindowFixture(allowsResearchFrameUrl)
    const willFrameNavigate = listeners.get('will-frame-navigate')
    const allowed = vi.fn()
    const blocked = vi.fn()

    willFrameNavigate?.({
      url: 'https://approved.example/dashboard',
      isMainFrame: false,
      preventDefault: allowed
    })
    willFrameNavigate?.({
      url: 'https://blocked.example/dashboard',
      isMainFrame: false,
      preventDefault: blocked
    })

    expect(allowsResearchFrameUrl).toHaveBeenCalledTimes(2)
    expect(allowed).not.toHaveBeenCalled()
    expect(blocked).toHaveBeenCalledOnce()
    expect(shellOpenExternal).not.toHaveBeenCalled()
  })

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

  it('cancels child-initiated navigation of the main frame', () => {
    const { listeners } = secureWindowFixture()
    const willFrameNavigate = listeners.get('will-frame-navigate')
    const childFrame = { processId: 7, routingId: 42 }

    for (const url of [
      'file:///Applications/Sherlock.app/Contents/Resources/plugin-recovery.html',
      'http://127.0.0.1:4310/research',
      'dsh-recovery://show-log/'
    ]) {
      const preventDefault = vi.fn()
      willFrameNavigate?.({
        url,
        isMainFrame: true,
        initiator: childFrame,
        preventDefault
      })
      expect(preventDefault, url).toHaveBeenCalledOnce()
    }
  })

  it('allows trusted main-frame navigation initiated by its routed main frame', () => {
    const { listeners, mainFrame } = secureWindowFixture()
    const willFrameNavigate = listeners.get('will-frame-navigate')
    const preventDefault = vi.fn()

    willFrameNavigate?.({
      url: 'http://127.0.0.1:4310/research',
      isMainFrame: true,
      initiator: { ...mainFrame },
      preventDefault
    })

    expect(preventDefault).not.toHaveBeenCalled()
  })

  it.each([
    { label: 'null', initiator: null },
    { label: 'undefined', initiator: undefined }
  ])('fails closed for a $label initiator targeting the main frame', ({ initiator }) => {
    const { listeners } = secureWindowFixture()
    const willFrameNavigate = listeners.get('will-frame-navigate')
    const preventDefault = vi.fn()

    willFrameNavigate?.({
      url: 'http://127.0.0.1:4310/research',
      isMainFrame: true,
      initiator,
      preventDefault
    })

    expect(preventDefault).toHaveBeenCalledOnce()
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
