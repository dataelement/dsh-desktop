import { describe, expect, it, vi, beforeEach } from 'vitest'
import { registerDesktopNotificationBridge, type DesktopNotificationPayload } from '../src/main/desktop-notification'
import { ipcMain, Notification } from 'electron'

vi.mock('electron', () => {
  const listeners: Record<string, Function[]> = {}
  class MockNotification {
    static isSupported = vi.fn(() => true)
    static instances: MockNotification[] = []
    title: string
    body?: string
    silent?: boolean
    icon?: string
    listeners: Record<string, Function[]> = {}

    constructor(options: { title: string; body?: string; silent?: boolean; icon?: string }) {
      this.title = options.title
      this.body = options.body
      this.silent = options.silent
      this.icon = options.icon
      MockNotification.instances.push(this)
    }

    on(event: string, listener: Function) {
      this.listeners[event] ??= []
      this.listeners[event]!.push(listener)
      return this
    }

    show = vi.fn()
    close = vi.fn(() => {
      for (const l of this.listeners['close'] ?? []) l()
    })

    _trigger(event: string) {
      for (const l of this.listeners[event] ?? []) l()
    }
  }

  return {
    app: {
      focus: vi.fn()
    },
    ipcMain: {
      on: vi.fn((channel: string, listener: Function) => {
        listeners[channel] ??= []
        listeners[channel]!.push(listener)
      }),
      removeListener: vi.fn((channel: string, listener: Function) => {
        listeners[channel] = (listeners[channel] ?? []).filter((l) => l !== listener)
      }),
      removeAllListeners: vi.fn((channel: string) => {
        delete listeners[channel]
      }),
      _trigger: (channel: string, event: unknown, ...args: unknown[]) => {
        for (const l of listeners[channel] ?? []) {
          l(event, ...args)
        }
      }
    },
    Notification: MockNotification
  }
})

describe('Desktop Notification Bridge', () => {
  let mockWindow: any
  let sender: any

  beforeEach(() => {
    vi.clearAllMocks()
    ;(Notification as any).instances = []
    sender = {
      isDestroyed: vi.fn(() => false),
      send: vi.fn()
    }
    mockWindow = {
      isDestroyed: vi.fn(() => false),
      isMinimized: vi.fn(() => false),
      restore: vi.fn(),
      show: vi.fn(),
      focus: vi.fn()
    }
  })

  it('registers IPC handlers and shows native notifications with icon', () => {
    const cleanup = registerDesktopNotificationBridge(() => mockWindow, () => '/path/to/icon.png')
    const trigger = (ipcMain as any)._trigger

    const payload: DesktopNotificationPayload = {
      id: 1,
      title: 'Agent Finished',
      options: {
        body: 'All tasks completed successfully.',
        silent: true
      }
    }

    trigger('dsh:notification-show', { sender }, payload)

    expect(mockWindow.show).not.toHaveBeenCalled()
    cleanup()
  })

  it('restores, shows, and focuses window when notification is clicked', () => {
    const cleanup = registerDesktopNotificationBridge(() => mockWindow, () => '/path/to/icon.png')
    const trigger = (ipcMain as any)._trigger

    mockWindow.isMinimized.mockReturnValue(true)

    trigger('dsh:notification-show', { sender }, {
      id: 42,
      title: 'Goal Reached',
      options: { body: 'Done' }
    })

    const created = (Notification as any).instances[0]
    expect(created).toBeDefined()
    expect(created.title).toBe('Goal Reached')
    expect(created.body).toBe('Done')

    // Simulate click
    created._trigger('click')

    expect(mockWindow.restore).toHaveBeenCalled()
    expect(mockWindow.show).toHaveBeenCalled()
    expect(mockWindow.focus).toHaveBeenCalled()
    expect(sender.send).toHaveBeenCalledWith('dsh:notification-clicked', 42)

    cleanup()
  })

  it('cleans up and sends closed event on notification close', () => {
    const cleanup = registerDesktopNotificationBridge(() => mockWindow, () => '/path/to/icon.png')
    const trigger = (ipcMain as any)._trigger

    trigger('dsh:notification-show', { sender }, {
      id: 99,
      title: 'Closing test'
    })

    const created = (Notification as any).instances[0]
    expect(created).toBeDefined()
    created._trigger('close')

    expect(sender.send).toHaveBeenCalledWith('dsh:notification-closed', 99)

    cleanup()
  })

  it('rejects invalid payloads without throwing', () => {
    const cleanup = registerDesktopNotificationBridge(() => mockWindow, () => '/path/to/icon.png')
    const trigger = (ipcMain as any)._trigger

    expect(() => {
      trigger('dsh:notification-show', { sender }, null)
      trigger('dsh:notification-show', { sender }, { id: 'invalid', title: 123 })
      trigger('dsh:notification-close', { sender }, 'not-a-number')
    }).not.toThrow()

    cleanup()
  })
})
