import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import type { BrowserWindow } from 'electron'
import {
  installResearchCanvasWheelRouter,
  registerResearchCanvasWheelIpc,
  type ResearchCanvasWheelRouter
} from '../src/main/state/research-canvas-wheel'
import {
  RESEARCH_CANVAS_WHEEL_EVENT_CHANNEL,
  RESEARCH_CANVAS_WHEEL_REGION_CHANNEL
} from '../src/shared/research-canvas-wheel'

function fixture() {
  const contents = new EventEmitter() as EventEmitter & {
    mainFrame: { processId: number; routingId: number }
    send: ReturnType<typeof vi.fn>
  }
  contents.mainFrame = { processId: 7, routingId: 41 }
  contents.send = vi.fn()
  const window = new EventEmitter() as EventEmitter & {
    isDestroyed(): boolean
    webContents: typeof contents
  }
  window.isDestroyed = () => false
  window.webContents = contents
  const router = installResearchCanvasWheelRouter(window as unknown as BrowserWindow)
  return { contents, window, router }
}

function wheelEvent() {
  return { preventDefault: vi.fn() }
}

describe('research canvas native wheel router', () => {
  it('routes only bounded Command-wheel inside the current active content-DIP region', () => {
    const { contents, router } = fixture()
    expect(router.setRegion({
      active: true, generation: 1,
      ownerId: 'canvas-1',
      left: 100, top: 50, width: 500, height: 400
    })).toBe(true)

    for (const mouse of [
      { type: 'mouseWheel', modifiers: [], x: 120, y: 80, deltaX: 0, deltaY: -100 },
      { type: 'mouseWheel', modifiers: ['control'], x: 120, y: 80, deltaX: 0, deltaY: -100 },
      { type: 'mouseMove', modifiers: ['meta'], x: 120, y: 80, deltaX: 0, deltaY: -100 },
      { type: 'mouseWheel', modifiers: ['meta'], x: 99, y: 80, deltaX: 0, deltaY: -100 },
      { type: 'mouseWheel', modifiers: ['meta'], x: 600, y: 80, deltaX: 0, deltaY: -100 },
      { type: 'mouseWheel', modifiers: ['meta'], x: 120, y: 450, deltaX: 0, deltaY: -100 },
      { type: 'mouseWheel', modifiers: ['meta'], x: 120, y: 80, deltaX: 0, deltaY: Number.NaN },
      { type: 'mouseWheel', modifiers: ['meta'], x: 120, y: 80, deltaX: 0, deltaY: 4_097 },
      { type: 'mouseWheel', modifiers: ['meta'], x: 120, y: 80, deltaX: 0, deltaY: 0 }
    ]) {
      const event = wheelEvent()
      contents.emit('before-mouse-event', event, mouse)
      expect(event.preventDefault).not.toHaveBeenCalled()
    }
    expect(contents.send).not.toHaveBeenCalled()

    for (const modifier of ['meta', 'command', 'cmd']) {
      const event = wheelEvent()
      contents.emit('before-mouse-event', event, {
        type: 'mouseWheel', modifiers: [modifier],
        x: 350, y: 250, deltaX: 3.5, deltaY: -120
      })
      expect(event.preventDefault).toHaveBeenCalledOnce()
    }
    expect(contents.send).toHaveBeenCalledTimes(3)
    expect(contents.send).toHaveBeenLastCalledWith(RESEARCH_CANVAS_WHEEL_EVENT_CHANNEL, {
      generation: 1,
      ownerId: 'canvas-1',
      clientX: 350,
      clientY: 250,
      deltaX: 3.5,
      deltaY: -120,
      deltaMode: 0
    })
  })

  it('rejects malformed and stale regions, clears only for main-frame lifecycle changes, and fails open on send error', () => {
    const { contents, window, router } = fixture()
    expect(router.setRegion({ active: true, generation: 1, ownerId: 'canvas-1', left: 0, top: 0, width: 500, height: 400 })).toBe(true)
    expect(router.setRegion({ active: true, generation: 1, ownerId: 'canvas-1', left: 0, top: 0, width: 1, height: 1 })).toBe(false)
    expect(router.setRegion({ active: true, generation: 2, ownerId: 'canvas-1', left: 0, top: 0, width: Infinity, height: 1 })).toBe(false)

    const emitCommandWheel = () => {
      const event = wheelEvent()
      contents.emit('before-mouse-event', event, {
        type: 'mouseWheel', modifiers: ['meta'], x: 100, y: 100, deltaX: 0, deltaY: -100
      })
      return event
    }
    contents.emit('did-start-navigation', { isMainFrame: false, isSameDocument: false }, 'sherlock-preview://child/', false, false)
    expect(emitCommandWheel().preventDefault).toHaveBeenCalledOnce()

    contents.emit('did-start-navigation', { isMainFrame: true, isSameDocument: true }, 'http://127.0.0.1:4310/#next', true, true)
    expect(emitCommandWheel().preventDefault).toHaveBeenCalledOnce()
    contents.emit('did-start-navigation', { isMainFrame: true, isSameDocument: false }, 'http://127.0.0.1:4310/', false, true)
    expect(emitCommandWheel().preventDefault).not.toHaveBeenCalled()
    expect(router.setRegion({ active: true, generation: 1, ownerId: 'canvas-2', left: 0, top: 0, width: 500, height: 400 })).toBe(true)
    contents.send.mockImplementationOnce(() => { throw new Error('renderer unavailable') })
    expect(emitCommandWheel().preventDefault).not.toHaveBeenCalled()
    expect(emitCommandWheel().preventDefault).not.toHaveBeenCalled()

    expect(router.setRegion({ active: true, generation: 1, ownerId: 'canvas-2', left: 0, top: 0, width: 500, height: 400 })).toBe(false)
    expect(router.setRegion({ active: true, generation: 2, ownerId: 'canvas-2', left: 0, top: 0, width: 500, height: 400 })).toBe(true)
    expect(router.setRegion({ active: false, generation: 3, ownerId: 'canvas-2' })).toBe(true)
    expect(emitCommandWheel().preventDefault).not.toHaveBeenCalled()
    window.emit('closed')
    expect(router.setRegion({ active: true, generation: 4, ownerId: 'canvas-2', left: 0, top: 0, width: 500, height: 400 })).toBe(false)
    expect(emitCommandWheel().preventDefault).not.toHaveBeenCalled()
    expect(contents.listenerCount('before-mouse-event')).toBe(0)
    expect(window.listenerCount('closed')).toBe(0)
  })

  it('keeps generation monotonic across owners and bounds recently retired owner state', () => {
    const { router } = fixture()
    expect(router.setRegion({
      active: true, generation: 5, ownerId: 'canvas-0',
      left: 0, top: 0, width: 500, height: 400
    })).toBe(true)
    expect(router.setRegion({
      active: true, generation: 4, ownerId: 'new-but-stale',
      left: 0, top: 0, width: 500, height: 400
    })).toBe(false)

    for (let index = 1; index <= 80; index += 1) {
      expect(router.setRegion({
        active: true, generation: 5 + index, ownerId: `canvas-${index}`,
        left: index, top: index, width: 500, height: 400
      })).toBe(true)
    }
    const internal = router as unknown as { retiredOwnerIds: Set<string> }
    expect(internal.retiredOwnerIds.size).toBeLessThanOrEqual(64)
    expect(internal.retiredOwnerIds.has('canvas-79')).toBe(true)
    expect(router.setRegion({
      active: true, generation: 86, ownerId: 'canvas-79',
      left: 0, top: 0, width: 500, height: 400
    })).toBe(false)
  })

  it('accepts synchronous region updates only from the current trusted main frame', () => {
    const { contents, window, router } = fixture()
    const listeners = new Map<string, (event: any, value: unknown) => void>()
    const ipcMain = {
      removeAllListeners: vi.fn((channel: string) => listeners.delete(channel)),
      on: vi.fn((channel: string, listener: (event: any, value: unknown) => void) => {
        listeners.set(channel, listener)
      })
    }
    registerResearchCanvasWheelIpc({
      ipcMain: ipcMain as unknown as Electron.IpcMain,
      getMainWindow: () => window as unknown as BrowserWindow,
      getRouter: () => router
    })
    expect(ipcMain.removeAllListeners).toHaveBeenCalledWith(RESEARCH_CANVAS_WHEEL_REGION_CHANNEL)
    const listener = listeners.get(RESEARCH_CANVAS_WHEEL_REGION_CHANNEL)
    expect(listener).toBeTypeOf('function')

    const child = {
      sender: contents,
      senderFrame: { processId: 7, routingId: 42 },
      returnValue: undefined
    }
    listener?.(child, { active: true, generation: 1, ownerId: 'canvas-1', left: 0, top: 0, width: 500, height: 400 })
    expect(child.returnValue).toBe(false)

    const trusted = {
      sender: contents,
      senderFrame: { processId: 7, routingId: 41 },
      returnValue: undefined
    }
    listener?.(trusted, { active: true, generation: 1, ownerId: 'canvas-1', left: 0, top: 0, width: 500, height: 400 })
    expect(trusted.returnValue).toBe(true)
    const event = wheelEvent()
    contents.emit('before-mouse-event', event, {
      type: 'mouseWheel', modifiers: ['meta'], x: 10, y: 10, deltaX: 0, deltaY: -10
    })
    expect(event.preventDefault).toHaveBeenCalledOnce()
  })
})
