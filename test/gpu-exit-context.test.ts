import { EventEmitter } from 'node:events'
import { describe, expect, it } from 'vitest'
import { classifyGpuExit, getGpuExitContext, trackGpuExitContext } from '../src/main/gpu-exit-context'
import { isGpuLossFatal } from '../src/main/gpu-fallback'

const logoff = -1073741205

describe('GPU exit lifecycle', () => {
  it('only suppresses Windows logoff degradation after confirmed exit', () => {
    const app = new EventEmitter(), window = new EventEmitter()
    const dispose = trackGpuExitContext(app)
    app.emit('browser-window-created', {}, window)
    const fatal = (code = logoff, platform: NodeJS.Platform = 'win32') =>
      isGpuLossFatal('crashed', code, { platform, context: getGpuExitContext(app) })
    expect(fatal()).toBe(true)
    // Both requests can be cancelled; neither authorizes suppressing a fault.
    window.emit('query-session-end', { defaultPrevented: true })
    app.emit('before-quit', { defaultPrevented: true })
    app.emit('will-quit', { defaultPrevented: true })
    expect(fatal()).toBe(true)
    expect(classifyGpuExit('win32', logoff, getGpuExitContext(app))).toBe('logoff-impact-unknown')
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
    const dispose = trackGpuExitContext(app)
    app.emit('browser-window-created', {}, window)
    window.emit('closed')
    window.emit('session-end')
    expect(getGpuExitContext(app).sessionEnding).toBe(false)
    app.emit('quit')
    expect(classifyGpuExit('win32', logoff, getGpuExitContext(app))).toBe('logoff-during-exit')
    dispose()
    expect(app.listenerCount('quit')).toBe(0)
    expect(getGpuExitContext(app).appExiting).toBe(false)
  })
})
