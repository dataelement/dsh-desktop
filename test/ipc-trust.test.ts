import { describe, expect, it, vi } from 'vitest'
import {
  assertTrustedMainWindowEvent,
  isTrustedMainWindowEvent,
  registerPrivilegedMainWindowHandlers
} from '../src/main/ipc-trust'

function trustedFixture() {
  const webContents = { mainFrame: { processId: 7, routingId: 41 } }
  const window = {
    isDestroyed: () => false,
    webContents
  }
  return { webContents, window }
}

describe('main-window IPC trust', () => {
  it('accepts a new WebFrameMain wrapper for the same routed main frame', () => {
    const { webContents, window } = trustedFixture()

    expect(isTrustedMainWindowEvent({
      sender: webContents,
      senderFrame: { processId: 7, routingId: 41 }
    }, window)).toBe(true)
  })

  it('rejects subframes, other webContents, missing frames, and destroyed windows', () => {
    const { webContents, window } = trustedFixture()

    expect(isTrustedMainWindowEvent({
      sender: webContents,
      senderFrame: { processId: 7, routingId: 42 }
    }, window)).toBe(false)
    expect(isTrustedMainWindowEvent({
      sender: {},
      senderFrame: { processId: 7, routingId: 41 }
    }, window)).toBe(false)
    expect(isTrustedMainWindowEvent({
      sender: webContents,
      senderFrame: null
    }, window)).toBe(false)
    expect(isTrustedMainWindowEvent({
      sender: webContents,
      senderFrame: { processId: 7, routingId: 41 }
    }, {
      ...window,
      isDestroyed: () => true
    })).toBe(false)
  })

  it('prevents a child frame from reaching a privileged handler', () => {
    const { webContents, window } = trustedFixture()
    const childEvent = {
      sender: webContents,
      senderFrame: { processId: 7, routingId: 42 }
    }

    expect(() => assertTrustedMainWindowEvent(childEvent, window)).toThrow(
      'main Sherlock window'
    )
  })

  it('rejects child frames through the production privileged handler registration', async () => {
    const { webContents, window } = trustedFixture()
    const childEvent = {
      sender: webContents,
      senderFrame: { processId: 7, routingId: 42 }
    }
    const invokeHandlers = new Map<
      string,
      (event: typeof childEvent, ...args: unknown[]) => unknown
    >()
    type SyncEvent = typeof childEvent & { returnValue: unknown }
    const syncHandlers = new Map<
      string,
      (event: SyncEvent, ...args: unknown[]) => void
    >()
    const ipcMain = {
      removeHandler: vi.fn(),
      removeAllListeners: vi.fn(),
      handle: (
        channel: string,
        handler: (event: typeof childEvent, ...args: unknown[]) => unknown
      ) => invokeHandlers.set(channel, handler),
      on: (
        channel: string,
        handler: (event: SyncEvent, ...args: unknown[]) => void
      ) => syncHandlers.set(channel, handler)
    }
    const dependencies = {
      showHarnessLog: vi.fn(),
      openDirectory: vi.fn(async () => '/workspace'),
      showItemInFolder: vi.fn(() => ({ ok: true })),
      researchFilesAvailable: vi.fn(async () => [true]),
      researchCanvasStorageGet: vi.fn(() => 'stored'),
      researchCanvasStorageSet: vi.fn(() => true),
      onStorageReadRejected: vi.fn(),
      onStorageWriteRejected: vi.fn()
    }
    registerPrivilegedMainWindowHandlers({
      ipcMain,
      getMainWindow: () => window,
      ...dependencies
    })

    for (const [channel, args] of [
      ['harness:show-log', []],
      ['directory-picker:open', []],
      ['filesystem:show-item-in-folder', ['/workspace/report.pdf']],
      ['research:files-available', [['/workspace/report.pdf']]]
    ] as const) {
      const handler = invokeHandlers.get(channel)
      expect(handler, channel).toBeTypeOf('function')
      await expect(Promise.resolve().then(() => handler?.(childEvent, ...args))).rejects.toThrow(
        'main Sherlock window'
      )
    }

    for (const [channel, rejectedValue] of [
      ['research:canvas-storage:get', null],
      ['research:canvas-storage:set', false]
    ] as const) {
      const event = {
        sender: webContents,
        senderFrame: { processId: 7, routingId: 42 },
        returnValue: undefined as unknown
      }
      const handler = syncHandlers.get(channel)
      expect(handler, channel).toBeTypeOf('function')
      handler?.(event)
      expect(event.returnValue, channel).toBe(rejectedValue)
    }

    expect(dependencies.showHarnessLog).not.toHaveBeenCalled()
    expect(dependencies.openDirectory).not.toHaveBeenCalled()
    expect(dependencies.showItemInFolder).not.toHaveBeenCalled()
    expect(dependencies.researchFilesAvailable).not.toHaveBeenCalled()
    expect(dependencies.researchCanvasStorageGet).not.toHaveBeenCalled()
    expect(dependencies.researchCanvasStorageSet).not.toHaveBeenCalled()
  })
})
