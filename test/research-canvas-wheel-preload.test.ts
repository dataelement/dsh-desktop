import { describe, expect, it, vi } from 'vitest'
import { createResearchCanvasWheelBridge } from '../src/preload/research-canvas-wheel'
import {
  RESEARCH_CANVAS_WHEEL_EVENT_CHANNEL,
  RESEARCH_CANVAS_WHEEL_REGION_CHANNEL
} from '../src/shared/research-canvas-wheel'

describe('research canvas preload wheel bridge', () => {
  it('exposes a frozen synchronous region publisher and disposable native-wheel subscription', () => {
    const listeners = new Map<string, (event: unknown, value: unknown) => void>()
    const ipc = {
      sendSync: vi.fn(() => true),
      on: vi.fn((channel: string, listener: (event: unknown, value: unknown) => void) => {
        listeners.set(channel, listener)
      }),
      removeListener: vi.fn((channel: string, listener: (event: unknown, value: unknown) => void) => {
        if (listeners.get(channel) === listener) listeners.delete(channel)
      })
    }
    const bridge = createResearchCanvasWheelBridge(ipc)
    expect(Object.isFrozen(bridge)).toBe(true)
    const region = { active: true as const, generation: 4, ownerId: 'canvas-1', left: 10, top: 20, width: 500, height: 400 }
    expect(bridge.setRegion(region)).toBe(true)
    expect(ipc.sendSync).toHaveBeenCalledWith(RESEARCH_CANVAS_WHEEL_REGION_CHANNEL, region)

    const values: unknown[] = []
    const unsubscribe = bridge.subscribe((value) => values.push(value))
    const value = {
      generation: 4, ownerId: 'canvas-1', clientX: 30, clientY: 40,
      deltaX: 0, deltaY: -100, deltaMode: 0 as const
    }
    listeners.get(RESEARCH_CANVAS_WHEEL_EVENT_CHANNEL)?.({}, value)
    expect(values).toEqual([value])
    unsubscribe()
    unsubscribe()
    expect(ipc.removeListener).toHaveBeenCalledTimes(1)
    expect(listeners.has(RESEARCH_CANVAS_WHEEL_EVENT_CHANNEL)).toBe(false)
  })
})
