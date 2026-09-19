import { describe, expect, it, vi } from 'vitest'
import {
  AppWindowRegistry,
  type AppWindowHandle
} from '../src/main/app-window-registry'

interface FakeWindow extends AppWindowHandle {
  destroy(): void
}

function createWindow(id: number): FakeWindow {
  let destroyed = false
  return {
    id,
    webContents: {
      id: id * 10,
      mainFrame: { id: id * 100 }
    },
    isDestroyed: () => destroyed,
    destroy: () => {
      destroyed = true
    }
  }
}

describe('AppWindowRegistry', () => {
  it('trusts only the main frame of a registered live window', () => {
    const registry = new AppWindowRegistry<FakeWindow>()
    const window = createWindow(1)
    registry.register(window, { primary: true })

    expect(registry.isTrustedFrameEvent({
      sender: window.webContents,
      senderFrame: window.webContents.mainFrame
    })).toBe(true)
    expect(registry.isTrustedFrameEvent({
      sender: window.webContents,
      senderFrame: { id: 'subframe' }
    })).toBe(false)
    expect(registry.isTrustedFrameEvent({
      sender: createWindow(2).webContents,
      senderFrame: window.webContents.mainFrame
    })).toBe(false)

    window.destroy()
    expect(registry.isTrustedFrameEvent({
      sender: window.webContents,
      senderFrame: window.webContents.mainFrame
    })).toBe(false)
  })

  it('requires the current primary main frame for app-wide health confirmation', () => {
    const registry = new AppWindowRegistry<FakeWindow>()
    const primary = createWindow(1)
    const secondary = createWindow(2)
    registry.register(primary, { primary: true })
    registry.register(secondary)

    expect(registry.isPrimaryFrameEvent({
      sender: primary.webContents,
      senderFrame: primary.webContents.mainFrame
    })).toBe(true)
    expect(registry.isPrimaryFrameEvent({
      sender: secondary.webContents,
      senderFrame: secondary.webContents.mainFrame
    })).toBe(false)
    expect(registry.isPrimaryFrameEvent({
      sender: primary.webContents,
      senderFrame: { id: 'subframe' }
    })).toBe(false)
  })

  it('keeps the first window primary until it closes', () => {
    const onPrimaryChange = vi.fn()
    const registry = new AppWindowRegistry<FakeWindow>({ onPrimaryChange })
    const primary = createWindow(1)
    const secondary = createWindow(2)

    registry.register(primary, { primary: true })
    registry.register(secondary)

    expect(registry.primaryWindow()).toBe(primary)
    expect(registry.isPrimary(secondary)).toBe(false)
    expect(onPrimaryChange).toHaveBeenCalledTimes(1)
  })

  it('promotes the newest surviving window when the primary closes', () => {
    const onPrimaryChange = vi.fn()
    const registry = new AppWindowRegistry<FakeWindow>({ onPrimaryChange })
    const primary = createWindow(1)
    const secondary = createWindow(2)
    const newest = createWindow(3)

    registry.register(primary, { primary: true })
    registry.register(secondary)
    registry.register(newest)
    registry.unregister(primary)

    expect(registry.primaryWindow()).toBe(newest)
    expect(registry.isPrimary(newest)).toBe(true)
    expect(onPrimaryChange).toHaveBeenLastCalledWith(newest)
  })

  it('removes closed secondary windows without changing the primary', () => {
    const onPrimaryChange = vi.fn()
    const registry = new AppWindowRegistry<FakeWindow>({ onPrimaryChange })
    const primary = createWindow(1)
    const secondary = createWindow(2)

    registry.register(primary, { primary: true })
    registry.register(secondary)
    registry.unregister(secondary)

    expect(registry.size).toBe(1)
    expect(registry.all()).toEqual([primary])
    expect(registry.primaryWindow()).toBe(primary)
    expect(onPrimaryChange).toHaveBeenCalledTimes(1)
  })
})
