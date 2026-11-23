import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, readdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  WindowStateManager,
  resolveWindowBounds,
  DEFAULT_WINDOW_WIDTH,
  DEFAULT_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  MIN_WINDOW_HEIGHT,
  type WorkArea
} from '../src/main/shell/window/window-state'

const primary: WorkArea = { x: 0, y: 0, width: 1920, height: 1080 }
const laptop: WorkArea = { x: 0, y: 0, width: 1707, height: 1027 }

/** Same host check the shell passes into track(). */
function tracksApplicationZoom(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'dsh-app:' && parsed.hostname === 'app'
  } catch {
    return false
  }
}

function createFakeWindow(initialUrl: string, initialZoom: number) {
  let url = initialUrl
  let zoomLevel = initialZoom
  const windowListeners = new Map<string, Array<() => void>>()
  const contentsListeners = new Map<string, Array<() => void>>()
  const setZoomLevel = vi.fn((level: number) => {
    zoomLevel = level
  })
  const maximize = vi.fn()
  const webContents = {
    isDestroyed: () => false,
    getURL: () => url,
    getZoomLevel: () => zoomLevel,
    setZoomLevel,
    on(event: 'zoom-changed' | 'did-finish-load' | 'will-navigate', listener: () => void) {
      const listeners = contentsListeners.get(event) ?? []
      listeners.push(listener)
      contentsListeners.set(event, listeners)
    }
  }
  const window = {
    maximized: false,
    minimized: false,
    fullScreen: false,
    destroyed: false,
    bounds: { x: 10, y: 20, width: 1400, height: 900 },
    normalBounds: { x: 10, y: 20, width: 1400, height: 900 },
    isDestroyed: () => window.destroyed,
    isMaximized: () => window.maximized,
    isMinimized: () => window.minimized,
    isFullScreen: () => window.fullScreen,
    getBounds: () => ({ ...window.bounds }),
    getNormalBounds: () => ({ ...window.normalBounds }),
    maximize,
    on(event: 'resize' | 'move' | 'maximize' | 'unmaximize' | 'close', listener: () => void) {
      const listeners = windowListeners.get(event) ?? []
      listeners.push(listener)
      windowListeners.set(event, listeners)
    },
    webContents
  }
  return {
    window,
    setZoomLevel,
    maximize,
    setUrl(next: string) { url = next },
    setZoom(next: number) { zoomLevel = next },
    emit(event: string) {
      for (const listener of windowListeners.get(event) ?? []) listener()
    },
    emitContents(event: string) {
      for (const listener of contentsListeners.get(event) ?? []) listener()
    }
  }
}

describe('WindowStateManager', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'dsh-window-state-test-'))
  })

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // ignore
    }
  })

  function writeState(value: unknown): void {
    writeFileSync(join(tempDir, 'window-state.json'), JSON.stringify(value), 'utf8')
  }

  function readSaved(): Record<string, unknown> {
    return JSON.parse(readFileSync(join(tempDir, 'window-state.json'), 'utf8')) as Record<string, unknown>
  }

  it('provides the current shell defaults when no file exists', () => {
    const state = new WindowStateManager(tempDir).getState()
    expect(state.width).toBe(DEFAULT_WINDOW_WIDTH)
    expect(state.height).toBe(DEFAULT_WINDOW_HEIGHT)
    expect(state.width).toBe(1280)
    expect(state.height).toBe(820)
    expect(state.isMaximized).toBe(false)
    expect(state.zoomLevel).toBe(0)
  })

  it('reads a legacy window-state file including its zoom', () => {
    writeState({ width: 1637, height: 999, x: 100, y: 80, isMaximized: false, zoomLevel: 0.5 })
    expect(new WindowStateManager(tempDir).getState()).toEqual({
      width: 1637,
      height: 999,
      x: 100,
      y: 80,
      isMaximized: false,
      zoomLevel: 0.5
    })
  })

  it('keeps a narrow window and replaces one below the shell minimum', () => {
    writeState({ width: 600, height: 700 })
    expect(new WindowStateManager(tempDir).getState()).toMatchObject({ width: 600, height: 700 })

    writeState({ width: 400, height: 500 })
    const state = new WindowStateManager(tempDir).getState()
    expect(state.width).toBe(DEFAULT_WINDOW_WIDTH)
    expect(state.height).toBe(DEFAULT_WINDOW_HEIGHT)
  })

  it('clamps an extreme saved zoom and ignores non-finite numbers', () => {
    writeState({ width: 1637, height: 999, zoomLevel: 99 })
    expect(new WindowStateManager(tempDir).getState().zoomLevel).toBe(3)

    writeState({ width: Number.POSITIVE_INFINITY, height: Number.NaN, x: Number.NaN, zoomLevel: Number.NEGATIVE_INFINITY })
    const state = new WindowStateManager(tempDir).getState()
    expect(state.width).toBe(DEFAULT_WINDOW_WIDTH)
    expect(state.height).toBe(DEFAULT_WINDOW_HEIGHT)
    expect(state.x).toBeUndefined()
    expect(state.zoomLevel).toBe(0)
  })

  it('drops only the fields that are not finite numbers', () => {
    writeState({ width: '1600', height: 999, x: null, y: 80, isMaximized: false, zoomLevel: 0.5 })
    expect(new WindowStateManager(tempDir).getState()).toEqual({
      width: DEFAULT_WINDOW_WIDTH,
      height: 999,
      x: undefined,
      y: 80,
      isMaximized: false,
      zoomLevel: 0.5
    })
  })

  it('handles corrupted JSON gracefully', () => {
    writeFileSync(join(tempDir, 'window-state.json'), 'not a valid json {{{{', 'utf8')
    const state = new WindowStateManager(tempDir).getState()
    expect(state.width).toBe(DEFAULT_WINDOW_WIDTH)
    expect(state.height).toBe(DEFAULT_WINDOW_HEIGHT)
    expect(state.zoomLevel).toBe(0)
  })

  it('enforces minWidth and minHeight constraints', () => {
    const bounds = new WindowStateManager(tempDir).validateBounds({ width: 400, height: 300, zoomLevel: 0 })
    expect(bounds.width).toBe(MIN_WINDOW_WIDTH)
    expect(bounds.height).toBe(MIN_WINDOW_HEIGHT)
    expect(MIN_WINDOW_WIDTH).toBe(520)
    expect(MIN_WINDOW_HEIGHT).toBe(600)
  })

  it('samples the live zoom on the application page even without a zoom event', () => {
    const manager = new WindowStateManager(tempDir)
    const fake = createFakeWindow('dsh-app://app/', 0)
    manager.track(fake.window, { tracksZoom: tracksApplicationZoom })
    fake.setZoom(2)
    manager.flushSync()

    expect(readSaved().zoomLevel).toBe(2)
    expect(readdirSync(tempDir).filter(name => name.endsWith('.tmp'))).toEqual([])
  })

  it('does not let the splash or recovery page overwrite a saved zoom', () => {
    writeState({ width: 1280, height: 820, zoomLevel: 1.5 })
    const manager = new WindowStateManager(tempDir)
    const fake = createFakeWindow('file:///splash.html', 0)
    manager.track(fake.window, { tracksZoom: tracksApplicationZoom })
    manager.flushSync()
    expect(readSaved().zoomLevel).toBe(1.5)

    fake.setUrl('dsh-desktop://desktop/plugin-recovery.html')
    fake.setZoom(0)
    manager.flushSync()
    expect(readSaved().zoomLevel).toBe(1.5)
  })

  it('restores zoom once, and only after the application document loads', () => {
    writeState({ width: 1280, height: 820, zoomLevel: 1 })
    const manager = new WindowStateManager(tempDir)
    const fake = createFakeWindow('file:///splash.html', 0)
    manager.track(fake.window, { tracksZoom: tracksApplicationZoom })

    fake.emitContents('did-finish-load')
    expect(fake.setZoomLevel).not.toHaveBeenCalled()

    fake.setUrl('dsh-app://app/')
    fake.emitContents('did-finish-load')
    expect(fake.setZoomLevel).toHaveBeenCalledTimes(1)
    expect(fake.setZoomLevel).toHaveBeenCalledWith(1)

    fake.setZoom(2.5)
    fake.emitContents('did-finish-load')
    expect(fake.setZoomLevel).toHaveBeenCalledTimes(1)
  })

  it('does not apply a saved zoom of zero', () => {
    const manager = new WindowStateManager(tempDir)
    const fake = createFakeWindow('dsh-app://app/', 0)
    manager.track(fake.window, { tracksZoom: tracksApplicationZoom })
    fake.emitContents('did-finish-load')
    fake.emitContents('did-finish-load')
    expect(fake.setZoomLevel).not.toHaveBeenCalled()
  })

  it('flushes again on a later close and keeps the normal bounds while maximized', () => {
    const manager = new WindowStateManager(tempDir)
    const fake = createFakeWindow('dsh-app://app/', 0)
    manager.track(fake.window, { tracksZoom: tracksApplicationZoom })
    fake.window.bounds = { x: 12, y: 34, width: 1637, height: 999 }
    fake.window.normalBounds = { x: 12, y: 34, width: 1637, height: 999 }
    fake.emit('resize')
    fake.emit('close')
    expect(readSaved()).toMatchObject({ x: 12, y: 34, width: 1637, height: 999 })

    fake.window.maximized = true
    fake.window.bounds = { x: 0, y: 0, width: 1920, height: 1080 }
    fake.emit('resize')
    fake.emit('close')
    expect(readSaved()).toMatchObject({ x: 12, y: 34, width: 1637, height: 999, isMaximized: true })
  })

  it('keeps the restored size when resize reports the maximized work area first', () => {
    const manager = new WindowStateManager(tempDir)
    const fake = createFakeWindow('dsh-app://app/', 0)
    manager.track(fake.window, { tracksZoom: tracksApplicationZoom })
    fake.window.normalBounds = { x: 12, y: 34, width: 1637, height: 999 }
    fake.window.bounds = { x: 0, y: 0, width: 1920, height: 1080 }
    fake.emit('resize')
    fake.emit('close')
    expect(readSaved()).toMatchObject({ x: 12, y: 34, width: 1637, height: 999, isMaximized: false })
  })

  it('captures the application zoom before a page navigation leaves it', () => {
    writeState({ width: 1280, height: 820, zoomLevel: 1 })
    const manager = new WindowStateManager(tempDir)
    const fake = createFakeWindow('dsh-app://app/', 2)
    manager.track(fake.window, { tracksZoom: tracksApplicationZoom })

    fake.emitContents('will-navigate')
    fake.setUrl('file:///splash.html')
    fake.setZoom(0)
    manager.flushSync()
    expect(readSaved().zoomLevel).toBe(2)
  })

  it('captures zoom for a programmatic load that does not emit will-navigate', () => {
    writeState({ width: 1280, height: 820, zoomLevel: 0.5 })
    const manager = new WindowStateManager(tempDir)
    const fake = createFakeWindow('dsh-app://app/', 2.5)
    manager.track(fake.window, { tracksZoom: tracksApplicationZoom })

    manager.captureApplicationZoom()
    fake.setUrl('file:///splash.html')
    fake.setZoom(0)
    manager.flushSync()
    expect(readSaved().zoomLevel).toBe(2.5)
  })

  it('maximizes once, and skips a destroyed window', () => {
    writeState({ width: 1280, height: 820, isMaximized: true })
    const manager = new WindowStateManager(tempDir)
    const fake = createFakeWindow('dsh-app://app/', 0)
    fake.window.destroyed = true
    manager.restoreMaximized(fake.window)
    expect(fake.maximize).not.toHaveBeenCalled()

    fake.window.destroyed = false
    manager.restoreMaximized(fake.window)
    manager.restoreMaximized(fake.window)
    expect(fake.maximize).toHaveBeenCalledTimes(1)
  })
})

describe('resolveWindowBounds', () => {
  it('clamps an oversized window to the work area that contains it', () => {
    expect(resolveWindowBounds(
      { width: 2400, height: 1400, x: 40, y: 30 },
      [{ workArea: laptop }],
      laptop
    )).toEqual({ x: 0, y: 0, width: 1707, height: 1027 })
  })

  it('drops an off-screen position and clamps the size to the primary display', () => {
    const bounds = resolveWindowBounds(
      { width: 2400, height: 900, x: -5000, y: -5000 },
      [{ workArea: laptop }],
      laptop
    )
    expect(bounds.x).toBeUndefined()
    expect(bounds.y).toBeUndefined()
    expect(bounds).toMatchObject({ width: 1707, height: 900 })
  })

  it('clamps to the secondary display instead of the primary', () => {
    const secondary: WorkArea = { x: 1920, y: 0, width: 1280, height: 800 }
    expect(resolveWindowBounds(
      { width: 2000, height: 900, x: 2000, y: 40 },
      [{ workArea: primary }, { workArea: secondary }],
      primary
    )).toEqual({ x: 1920, y: 0, width: 1280, height: 800 })
  })

  it('shifts a window that hangs off the far edges without changing its size', () => {
    expect(resolveWindowBounds(
      { width: 1280, height: 820, x: 1800, y: 900 },
      [{ workArea: primary }],
      primary
    )).toEqual({ x: 640, y: 260, width: 1280, height: 820 })
  })

  it('keeps a 50px overhang that is still considered on screen', () => {
    expect(resolveWindowBounds(
      { width: 800, height: 700, x: -50, y: -50 },
      [{ workArea: primary }],
      primary
    )).toEqual({ x: -50, y: -50, width: 800, height: 700 })
  })

  it('drops coordinates when no display is attached and keeps a size that has no work area to clamp to', () => {
    const bounds = resolveWindowBounds({ width: 1637, height: 999, x: 100, y: 80 }, [])
    expect(bounds).toEqual({ width: 1637, height: 999, x: undefined, y: undefined })
  })

  it('raises a tiny window to the shell minimum', () => {
    expect(resolveWindowBounds({ width: 400, height: 300 }, [], primary)).toEqual({
      width: MIN_WINDOW_WIDTH,
      height: MIN_WINDOW_HEIGHT,
      x: undefined,
      y: undefined
    })
  })
})
