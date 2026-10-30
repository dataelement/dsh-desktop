import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadDesktopWindowAfterStop } from '../src/main/desktop-window-load'
import { RendererNavigationRecovery } from '../src/main/main-window-recovery'

function fixture(loading = true) {
  const contents = Object.assign(new EventEmitter(), {
    isLoading: vi.fn(() => loading), isDestroyed: vi.fn(() => false), stop: vi.fn()
  })
  const window = { isDestroyed: () => contents.isDestroyed(), webContents: contents, loadURL: vi.fn(async (_url: string) => {}) }
  const drained = () => { contents.isLoading.mockReturnValue(false); contents.emit('did-stop-loading') }
  return { contents, window, drained }
}
afterEach(() => vi.useRealTimers())

describe('desktop window native load drain', () => {
  it('does not touch native loading methods for a pre-cancelled request', async () => {
    const f = fixture()
    await loadDesktopWindowAfterStop(f.window, 'file:///new', () => true)
    expect(f.contents.isLoading).not.toHaveBeenCalled()
    expect(f.contents.stop).not.toHaveBeenCalled()
    expect(f.window.loadURL).not.toHaveBeenCalled()
  })

  it('cleans listeners and timer if native stop throws', async () => {
    vi.useFakeTimers()
    const f = fixture()
    const error = new Error('stop failed')
    f.contents.stop.mockImplementation(() => { throw error })
    await expect(loadDesktopWindowAfterStop(f.window, 'file:///new', () => false)).rejects.toBe(error)
    expect(f.window.loadURL).not.toHaveBeenCalled()
    expect(f.contents.listenerCount('did-stop-loading')).toBe(0)
    expect(f.contents.listenerCount('destroyed')).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not swallow an actual replacement load abort or retry it', async () => {
    const f = fixture(false)
    const error = Object.assign(new Error('replacement aborted'), { errno: -3, code: '' })
    f.window.loadURL.mockRejectedValue(error)
    await expect(loadDesktopWindowAfterStop(f.window, 'file:///new', () => false)).rejects.toBe(error)
    expect(f.window.loadURL).toHaveBeenCalledTimes(1)
  })

  it('cleans a cancelled drain at its own deadline without starting a late load', async () => {
    vi.useFakeTimers()
    const f = fixture()
    let cancelled = false
    const pending = loadDesktopWindowAfterStop(f.window, 'file:///new', () => cancelled, 100)
    cancelled = true
    await vi.advanceTimersByTimeAsync(100)
    await pending
    expect(f.window.loadURL).not.toHaveBeenCalled()
    expect(f.contents.listenerCount('did-stop-loading')).toBe(0)
    expect(f.contents.listenerCount('destroyed')).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('invalidates an interrupted attempt before a synchronous drain continuation can load', async () => {
    vi.useFakeTimers()
    const f = fixture()
    const owner = new RendererNavigationRecovery({
      load: (url, cancelled) => loadDesktopWindowAfterStop(f.window, url, cancelled),
      cancelled: () => false, onError: vi.fn(), timeoutMs: 100, cooldownMs: 50
    })
    const result = owner.navigate('file:///new')
    owner.rendererGone()
    f.drained()
    await vi.advanceTimersByTimeAsync(0)
    expect(f.window.loadURL).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(50)
    await expect(result).resolves.toBe(true)
    expect(f.window.loadURL).toHaveBeenCalledExactlyOnceWith('file:///new')
    owner.dispose()
  })

  it('does not stop an idle window before loading', async () => {
    const f = fixture(false)
    await loadDesktopWindowAfterStop(f.window, 'file:///new', () => false)
    expect(f.contents.stop).not.toHaveBeenCalled()
    expect(f.window.loadURL).toHaveBeenCalledWith('file:///new')
  })

  it('installs the replacement promise only after old abort notifications and stop completion', async () => {
    const f = fixture()
    const loaded = loadDesktopWindowAfterStop(f.window, 'file:///new', () => false)
    expect(f.contents.stop).toHaveBeenCalledTimes(1)
    f.contents.emit('did-fail-load', {}, -3, '', 'file:///old', true)
    await Promise.resolve()
    expect(f.window.loadURL).not.toHaveBeenCalled()
    f.drained()
    await loaded
    expect(f.window.loadURL).toHaveBeenCalledTimes(1)
    expect(f.contents.listenerCount('did-stop-loading')).toBe(0)
    expect(f.contents.listenerCount('destroyed')).toBe(0)
  })

  it('subscribes before stop, including synchronous completion', async () => {
    const f = fixture()
    f.contents.stop.mockImplementation(f.drained)
    await loadDesktopWindowAfterStop(f.window, 'file:///new', () => false)
    expect(f.window.loadURL).toHaveBeenCalledTimes(1)
  })

  it('bounds a drain that never completes and cleans listeners', async () => {
    vi.useFakeTimers()
    const f = fixture()
    const failed = expect(loadDesktopWindowAfterStop(f.window, 'file:///new', () => false, 100))
      .rejects.toMatchObject({ code: 'ERR_FAILED' })
    await vi.advanceTimersByTimeAsync(100)
    await failed
    expect(f.window.loadURL).not.toHaveBeenCalled()
    expect(f.contents.listenerCount('did-stop-loading')).toBe(0)
    expect(f.contents.listenerCount('destroyed')).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['closed', 'superseded'])('does not load after %s during a drain', async reason => {
    vi.useFakeTimers()
    const f = fixture()
    let cancelled = false
    const loaded = loadDesktopWindowAfterStop(f.window, 'file:///new', () => cancelled)
    if (reason === 'closed') {
      f.contents.isDestroyed.mockReturnValue(true)
      f.contents.emit('destroyed')
    } else { cancelled = true; f.drained() }
    await loaded
    expect(f.window.loadURL).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
    expect(f.contents.listenerCount('did-stop-loading')).toBe(0)
  })

  it('invalidates all timed-out attempts so a late drain cannot create phantom loads', async () => {
    vi.useFakeTimers()
    const f = fixture()
    const error = vi.fn()
    const owner = new RendererNavigationRecovery({
      load: (url, cancelled) => loadDesktopWindowAfterStop(f.window, url, cancelled, 5_000),
      cancelled: () => false, onError: error, timeoutMs: 100, cooldownMs: 50
    })
    const result = owner.navigate('file:///new')
    const failed = expect(result).rejects.toThrow('renderer')
    await vi.advanceTimersByTimeAsync(600)
    await failed
    f.drained()
    await vi.advanceTimersByTimeAsync(0)
    expect(f.window.loadURL).not.toHaveBeenCalled()
    expect(f.contents.listenerCount('did-stop-loading')).toBe(0)
    expect(f.contents.listenerCount('destroyed')).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    expect(error).not.toHaveBeenCalled()
    owner.dispose()
  })

  it('starts only the newest requested URL when superseded drains complete together', async () => {
    vi.useFakeTimers()
    const f = fixture()
    const owner = new RendererNavigationRecovery({
      load: (url, cancelled) => loadDesktopWindowAfterStop(f.window, url, cancelled),
      cancelled: () => false, onError: vi.fn()
    })
    const old = owner.navigate('file:///old')
    const current = owner.navigate('file:///new')
    f.drained()
    await expect(old).resolves.toBe(false)
    await expect(current).resolves.toBe(true)
    expect(f.window.loadURL).toHaveBeenCalledExactlyOnceWith('file:///new')
    owner.dispose()
    expect(vi.getTimerCount()).toBe(0)
  })
})
