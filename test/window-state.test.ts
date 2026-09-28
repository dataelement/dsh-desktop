import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { WindowStateManager, DEFAULT_WINDOW_WIDTH, DEFAULT_WINDOW_HEIGHT, MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT } from '../src/main/state/window-state'

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

  it('provides sensible defaults when no file exists', () => {
    const manager = new WindowStateManager(tempDir)
    const state = manager.getState()
    expect(state.width).toBe(DEFAULT_WINDOW_WIDTH)
    expect(state.height).toBe(DEFAULT_WINDOW_HEIGHT)
    expect(state.isMaximized).toBe(false)
    expect(state.zoomLevel).toBe(0)
  })

  it('persists zoomLevel and bounds on flushSync', () => {
    const manager = new WindowStateManager(tempDir)
    manager.setZoomLevel(1.5)
    manager.flushSync()

    const saved = JSON.parse(readFileSync(join(tempDir, 'window-state.json'), 'utf8'))
    expect(saved.zoomLevel).toBe(1.5)
    expect(saved.width).toBe(DEFAULT_WINDOW_WIDTH)

    // Reopen manager
    const manager2 = new WindowStateManager(tempDir)
    expect(manager2.getState().zoomLevel).toBe(1.5)
  })

  it('handles corrupted JSON gracefully', () => {
    writeFileSync(join(tempDir, 'window-state.json'), 'not a valid json {{{{', 'utf8')
    const manager = new WindowStateManager(tempDir)
    const state = manager.getState()
    expect(state.width).toBe(DEFAULT_WINDOW_WIDTH)
    expect(state.height).toBe(DEFAULT_WINDOW_HEIGHT)
    expect(state.zoomLevel).toBe(0)
  })

  it('enforces minWidth and minHeight constraints', () => {
    const manager = new WindowStateManager(tempDir)
    const bounds = manager.validateBounds({
      width: 400,
      height: 300,
      zoomLevel: 0
    })
    expect(bounds.width).toBe(MIN_WINDOW_WIDTH)
    expect(bounds.height).toBe(MIN_WINDOW_HEIGHT)
  })
})
