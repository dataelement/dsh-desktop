import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RendererNavigationRecovery } from '../src/main/main-window-recovery'

function deferred() {
  let resolve: () => void = () => {}
  let reject: (error: Error) => void = () => {}
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function fixture() {
  const events = new EventEmitter()
  const loads: ReturnType<typeof deferred>[] = []
  const load = vi.fn(() => { const item = deferred(); loads.push(item); return item.promise })
  const error = vi.fn()
  const recovery = new RendererNavigationRecovery({ onError: error, load, cancelled: () => false, cooldownMs: 50, timeoutMs: 100, healthyMs: 200 })
  events.on('render-process-gone', () => recovery.rendererGone())
  events.on('did-fail-load', (url: string, code: number) => recovery.loadFailed(url, code))
  return { events, loads, load, recovery, error }
}
afterEach(() => vi.useRealTimers())
describe('owned renderer navigation recovery', () => {
  it('keeps a native loss across paired failures, replaces it on a later loss and clears it after health', async () => {
    vi.useFakeTimers()
    const diagnostics: import('../src/main/main-window-recovery').RendererRecoveryDiagnostic[] = []
    const recovery = new RendererNavigationRecovery({
      load: async () => {}, cancelled: () => false, onError: vi.fn(),
      onDiagnostic: event => diagnostics.push(event), cooldownMs: 1, healthyMs: 10
    })
    await recovery.navigate('http://127.0.0.1/')
    recovery.rendererGone(undefined, { reason: 'launch-failed', exitCode: 18 })
    recovery.loadFailed('http://127.0.0.1/', -2)
    await vi.advanceTimersByTimeAsync(1)
    expect(diagnostics.at(-1)).toMatchObject({ phase: 'load-completed', reloadCount: 1,
      rendererLoss: { reason: 'launch-failed', exitCode: 18 } })
    recovery.rendererGone(undefined, { reason: 'crashed', exitCode: 23 })
    await vi.advanceTimersByTimeAsync(1)
    expect(diagnostics.at(-1)?.rendererLoss).toEqual({ reason: 'crashed', exitCode: 23 })
    await vi.advanceTimersByTimeAsync(9)
    expect(recovery.reloadCount).toBe(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(diagnostics.at(-1)).toMatchObject({ phase: 'budget-reset', reloadCount: 0 })
    expect(diagnostics.at(-1)?.rendererLoss).toBeUndefined()
    recovery.dispose()
  })

  it('records load timeouts and exhaustion without a renderer event', async () => {
    vi.useFakeTimers()
    const diagnostics: import('../src/main/main-window-recovery').RendererRecoveryDiagnostic[] = []
    const recovery = new RendererNavigationRecovery({
      load: () => new Promise(() => {}), cancelled: () => false, onError: vi.fn(),
      onDiagnostic: event => diagnostics.push(event), timeoutMs: 10, cooldownMs: 1
    })
    const result = expect(recovery.navigate('file:///splash.html')).rejects.toThrow('renderer')
    await vi.advanceTimersByTimeAsync(50)
    await result
    expect(diagnostics.filter(event => event.phase === 'load-failed')).toHaveLength(4)
    expect(diagnostics.filter(event => event.phase === 'load-failed').every(event => event.code === 'RENDERER_LOAD_TIMEOUT')).toBe(true)
    expect(diagnostics.at(-1)).toMatchObject({ phase: 'exhausted', reloadCount: 3 })
    expect(vi.getTimerCount()).toBe(0)
    recovery.dispose()
  })

  it('diagnostic failures cannot prevent a successful navigation', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const recovery = new RendererNavigationRecovery({
      load: async () => {}, cancelled: () => false, onError: vi.fn(),
      onDiagnostic: () => { throw new Error('unwritable diagnostics') }
    })
    try { await expect(recovery.navigate('file:///splash.html')).resolves.toBe(true) }
    finally { recovery.dispose(); warn.mockRestore() }
  })

  it.each(['closed', 'superseded'])('does not surface a background terminal rejection after %s', async reason => {
    vi.useFakeTimers()
    const f = fixture()
    const initial = f.recovery.navigate('file:///splash.html')
    f.loads[0]?.resolve()
    await initial
    for (let i = 1; i <= 3; i++) {
      f.recovery.rendererGone()
      await vi.advanceTimersByTimeAsync(50)
      f.loads[i]?.resolve()
      await vi.advanceTimersByTimeAsync(0)
    }
    f.recovery.rendererGone()
    if (reason === 'closed') f.recovery.dispose()
    else {
      const current = f.recovery.navigate('file:///new.html')
      f.loads[4]?.resolve()
      await current
    }
    await vi.advanceTimersByTimeAsync(0)
    expect(f.error).not.toHaveBeenCalled()
    f.recovery.dispose()
  })

  it('preserves the current client route after a loaded renderer is lost', async () => {
    vi.useFakeTimers()
    const f = fixture()
    const initial = f.recovery.navigate('http://127.0.0.1/')
    f.loads[0]?.resolve()
    await initial
    f.recovery.rendererGone('http://127.0.0.1/session/current')
    await vi.advanceTimersByTimeAsync(50)
    expect(f.load).toHaveBeenLastCalledWith('http://127.0.0.1/session/current', expect.any(Function))
    f.loads[1]?.resolve()
    await vi.advanceTimersByTimeAsync(0)
    f.recovery.dispose()
  })

  it('does not load a replacement after navigation-generation cancellation during backoff', async () => {
    vi.useFakeTimers()
    const f = fixture()
    let superseded = false
    const result = f.recovery.navigate('file:///splash.html', false, () => superseded)
    f.events.emit('render-process-gone')
    await vi.advanceTimersByTimeAsync(10)
    superseded = true
    await vi.advanceTimersByTimeAsync(40)
    await expect(result).resolves.toBe(false)
    expect(f.load).toHaveBeenCalledTimes(1)
    expect(f.error).not.toHaveBeenCalled()
    f.recovery.dispose()
  })

  it('coalesces delayed paired notifications during backoff', async () => {
    vi.useFakeTimers()
    const f = fixture()
    const result = f.recovery.navigate('file:///splash.html')
    f.events.emit('render-process-gone')
    await vi.advanceTimersByTimeAsync(10)
    f.events.emit('did-fail-load', 'file:///splash.html', -2)
    f.events.emit('render-process-gone')
    await vi.advanceTimersByTimeAsync(40)
    expect(f.load).toHaveBeenCalledTimes(2)
    f.loads[1]?.resolve()
    await expect(result).resolves.toBe(true)
    expect(f.error).not.toHaveBeenCalled()
    f.recovery.dispose()
  })

  it('rearms one healthy reset and does not let older success timers clear a newer streak', async () => {
    vi.useFakeTimers()
    const f = fixture()
    const initial = f.recovery.navigate('file:///splash.html')
    f.loads[0]?.resolve()
    await initial
    for (let i = 1; i <= 3; i++) {
      await vi.advanceTimersByTimeAsync(40)
      f.events.emit('render-process-gone')
      await vi.advanceTimersByTimeAsync(50)
      f.loads[i]?.resolve()
      await vi.advanceTimersByTimeAsync(0)
      expect(f.recovery.reloadCount).toBe(i)
      expect(vi.getTimerCount()).toBe(1)
    }
    f.events.emit('render-process-gone')
    await vi.advanceTimersByTimeAsync(0)
    expect(f.error).toHaveBeenCalledTimes(1)
    f.events.emit('render-process-gone')
    expect(f.error).toHaveBeenCalledTimes(1)
    expect(f.load).toHaveBeenCalledTimes(4)
    f.recovery.dispose()
  })

  it('isolates replacement windows and cancels old backoff timers', async () => {
    vi.useFakeTimers()
    const old = fixture()
    const abandoned = old.recovery.navigate('file:///splash.html')
    old.events.emit('render-process-gone')
    await vi.advanceTimersByTimeAsync(10)
    old.recovery.dispose()
    await expect(abandoned).resolves.toBe(false)
    const current = fixture()
    const loaded = current.recovery.navigate('file:///splash.html')
    current.loads[0]?.resolve()
    await loaded
    await vi.advanceTimersByTimeAsync(1000)
    expect(old.load).toHaveBeenCalledTimes(1)
    expect(current.recovery.reloadCount).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    current.recovery.dispose()
  })
  it('awaits replacement success when the load promise rejects before paired events', async () => {
    vi.useFakeTimers()
    const f = fixture()
    let done = false
    const result = f.recovery.navigate('file:///splash.html').then(value => { done = true; return value })
    const error = Object.assign(new Error('ERR_FAILED'), { code: 'ERR_FAILED' })
    f.loads[0]?.reject(error)
    f.events.emit('render-process-gone')
    f.events.emit('did-fail-load', 'file:///splash.html', -2)
    f.loads[0]?.reject(error)
    await vi.advanceTimersByTimeAsync(50)
    expect(f.load).toHaveBeenCalledTimes(2)
    expect(done).toBe(false)
    f.loads[1]?.resolve()
    await expect(result).resolves.toBe(true)
    f.recovery.dispose()
  })
  it('preserves a missing resource error without retry', async () => {
    const f = fixture()
    const result = f.recovery.navigate('file:///missing.html')
    const error = Object.assign(new Error('missing'), { code: 'ERR_FILE_NOT_FOUND' })
    f.loads[0]?.reject(error)
    await expect(result).rejects.toBe(error)
    expect(f.load).toHaveBeenCalledTimes(1)
    f.recovery.dispose()
  })
})
