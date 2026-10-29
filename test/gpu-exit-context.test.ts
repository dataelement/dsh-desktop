import { EventEmitter } from 'node:events'
import { describe, expect, it } from 'vitest'
import { classifyGpuExit } from '../src/main/gpu-fallback'
import { createProcessRecovery } from './helpers/process-recovery'
import { isGpuLossFatal } from '../src/main/gpu-fallback'

const logoff = -1073741205

describe('GPU exit lifecycle', () => {
  it('only suppresses Windows logoff degradation after confirmed exit', () => {
    const app = new EventEmitter(), window = new EventEmitter()
    const controller = createProcessRecovery()
    controller.attach(app)
    const dispose = () => controller.dispose()
    app.emit('browser-window-created', {}, window)
    const fatal = (code = logoff, platform: NodeJS.Platform = 'win32') =>
      isGpuLossFatal('crashed', code, { platform, context: controller.exitContext })
    expect(fatal()).toBe(true)
    // Both requests can be cancelled; neither authorizes suppressing a fault.
    window.emit('query-session-end', { defaultPrevented: true })
    app.emit('before-quit', { defaultPrevented: true })
    app.emit('will-quit', { defaultPrevented: true })
    expect(fatal()).toBe(true)
    expect(classifyGpuExit('win32', logoff, controller.exitContext)).toBe('logoff-impact-unknown')
    window.emit('session-end')
    expect(fatal()).toBe(false)
    expect(fatal(logoff >>> 0)).toBe(false)
    expect(fatal(-1073741819)).toBe(true)
    expect(fatal(logoff, 'darwin')).toBe(true)
    expect(fatal(34)).toBe(false)
    dispose()
    expect(window.listenerCount('session-end')).toBe(0)
    expect(app.listenerCount('browser-window-created')).toBe(0)
  })

  it('tracks confirmed application exit and cleans up closed windows', () => {
    const app = new EventEmitter(), window = new EventEmitter()
    const controller = createProcessRecovery()
    controller.attach(app)
    const dispose = () => controller.dispose()
    app.emit('browser-window-created', {}, window)
    window.emit('closed')
    window.emit('session-end')
    expect(controller.exitContext.sessionEnding).toBe(false)
    app.emit('quit')
    expect(classifyGpuExit('win32', logoff, controller.exitContext)).toBe('logoff-during-exit')
    dispose()
    expect(app.listenerCount('quit')).toBe(0)
    expect(controller.exitContext.appExiting).toBe(true)
  })
})

it('keeps lifecycle evidence isolated between controller instances', () => {
  const first = createProcessRecovery(), second = createProcessRecovery()
  const app = new EventEmitter(), otherApp = new EventEmitter()
  first.attach(app); first.attach(app); second.attach(otherApp)
  expect(app.listenerCount('quit')).toBe(1)
  app.emit('quit')
  expect(first.exitContext.appExiting).toBe(true)
  expect(second.exitContext.appExiting).toBe(false)
  const snapshot = second.exitContext
  snapshot.sessionEnding = true
  expect(second.exitContext.sessionEnding).toBe(false)
  second.dispose()
})
