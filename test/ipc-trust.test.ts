import { describe, expect, it, vi } from 'vitest'
import {
  assertTrustedMainWindowEvent,
  isTrustedMainWindowEvent,
  registerTrustedMainWindowHandler,
  registerTrustedMainWindowListener
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

  it('rejects privileged invoke handlers before their dependencies run', async () => {
    const { webContents, window } = trustedFixture()
    const childEvent = {
      sender: webContents,
      senderFrame: { processId: 7, routingId: 42 }
    }
    const handlers = new Map<string, (event: typeof childEvent) => unknown>()
    const ipcMain = {
      handle: (
        channel: string,
        handler: (event: typeof childEvent) => unknown
      ) => handlers.set(channel, handler)
    }
    const guardedChannels = [
      'harness:show-log',
      'directory-picker:open',
      'filesystem:show-item-in-folder',
      'research:files-available'
    ]
    const privilegedDependencies = new Map<string, ReturnType<typeof vi.fn>>()

    for (const channel of guardedChannels) {
      const dependency = vi.fn()
      privilegedDependencies.set(channel, dependency)
      registerTrustedMainWindowHandler(
        ipcMain,
        channel,
        () => window,
        dependency
      )
    }

    for (const channel of guardedChannels) {
      const handler = handlers.get(channel)
      expect(handler, channel).toBeTypeOf('function')
      await expect(Promise.resolve().then(() => handler?.(childEvent))).rejects.toThrow(
        'main Sherlock window'
      )
      expect(privilegedDependencies.get(channel), channel).not.toHaveBeenCalled()
    }
  })

  it('rejects privileged synchronous Research handlers before storage runs', () => {
    const { webContents, window } = trustedFixture()
    const handlers = new Map<
      string,
      (event: { sender: unknown; senderFrame: { processId: number; routingId: number }; returnValue: unknown }) => void
    >()
    const ipcMain = {
      on: (
        channel: string,
        handler: (event: { sender: unknown; senderFrame: { processId: number; routingId: number }; returnValue: unknown }) => void
      ) => handlers.set(channel, handler)
    }
    const dependencies = {
      get: vi.fn(() => 'stored'),
      set: vi.fn(() => true)
    }
    registerTrustedMainWindowListener(
      ipcMain,
      'research:canvas-storage:get',
      () => window,
      dependencies.get,
      null
    )
    registerTrustedMainWindowListener(
      ipcMain,
      'research:canvas-storage:set',
      () => window,
      dependencies.set,
      false
    )

    for (const [channel, rejectedValue] of [
      ['research:canvas-storage:get', null],
      ['research:canvas-storage:set', false]
    ] as const) {
      const event = {
        sender: webContents,
        senderFrame: { processId: 7, routingId: 42 },
        returnValue: undefined as unknown
      }
      const handler = handlers.get(channel)
      expect(handler, channel).toBeTypeOf('function')
      handler?.(event)
      expect(event.returnValue, channel).toBe(rejectedValue)
    }
    expect(dependencies.get).not.toHaveBeenCalled()
    expect(dependencies.set).not.toHaveBeenCalled()
  })
})
