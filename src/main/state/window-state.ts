import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { type BrowserWindow, screen } from 'electron'

export interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized?: boolean
  zoomLevel?: number
}

export const DEFAULT_WINDOW_WIDTH = 1380
export const DEFAULT_WINDOW_HEIGHT = 900
export const MIN_WINDOW_WIDTH = 900
export const MIN_WINDOW_HEIGHT = 640

export class WindowStateManager {
  private state: WindowState
  private readonly filePath: string
  private saveTimer?: NodeJS.Timeout

  constructor(storageDir: string) {
    this.filePath = join(storageDir, 'window-state.json')
    this.state = this.loadState()
  }

  getState(): WindowState {
    return { ...this.state }
  }

  private loadState(): WindowState {
    try {
      if (existsSync(this.filePath)) {
        const parsed = JSON.parse(readFileSync(this.filePath, 'utf8'))
        if (typeof parsed === 'object' && parsed !== null) {
          return {
            width: typeof parsed.width === 'number' && parsed.width >= MIN_WINDOW_WIDTH ? parsed.width : DEFAULT_WINDOW_WIDTH,
            height: typeof parsed.height === 'number' && parsed.height >= MIN_WINDOW_HEIGHT ? parsed.height : DEFAULT_WINDOW_HEIGHT,
            x: typeof parsed.x === 'number' ? parsed.x : undefined,
            y: typeof parsed.y === 'number' ? parsed.y : undefined,
            isMaximized: typeof parsed.isMaximized === 'boolean' ? parsed.isMaximized : false,
            zoomLevel: typeof parsed.zoomLevel === 'number' && Number.isFinite(parsed.zoomLevel) ? parsed.zoomLevel : 0
          }
        }
      }
    } catch {
      // fallback to default
    }
    return {
      width: DEFAULT_WINDOW_WIDTH,
      height: DEFAULT_WINDOW_HEIGHT,
      isMaximized: false,
      zoomLevel: 0
    }
  }

  public validateBounds(state: WindowState): { x?: number; y?: number; width: number; height: number } {
    let { width, height, x, y } = state
    width = Math.max(MIN_WINDOW_WIDTH, width || DEFAULT_WINDOW_WIDTH)
    height = Math.max(MIN_WINDOW_HEIGHT, height || DEFAULT_WINDOW_HEIGHT)

    if (x !== undefined && y !== undefined) {
      try {
        const visibleDisplays = screen.getAllDisplays()
        const isVisible = visibleDisplays.some((display) => {
          const { x: dx, y: dy, width: dw, height: dh } = display.workArea
          return x! >= dx - 50 && x! + 100 <= dx + dw && y! >= dy - 50 && y! + 100 <= dy + dh
        })
        if (!isVisible) {
          x = undefined
          y = undefined
        }
      } catch {
        x = undefined
        y = undefined
      }
    }

    return { width, height, x, y }
  }

  public track(window: BrowserWindow): void {
    const updateState = (): void => {
      if (window.isDestroyed()) return
      const isMaximized = window.isMaximized()
      if (!isMaximized && !window.isMinimized() && !window.isFullScreen()) {
        const bounds = window.getBounds()
        this.state.width = bounds.width
        this.state.height = bounds.height
        this.state.x = bounds.x
        this.state.y = bounds.y
      }
      this.state.isMaximized = isMaximized
      this.scheduleSave()
    }

    window.on('resize', updateState)
    window.on('move', updateState)
    window.on('maximize', updateState)
    window.on('unmaximize', updateState)

    // Track zoom
    const trackZoom = (): void => {
      if (window.isDestroyed() || window.webContents.isDestroyed()) return
      const zoomLevel = window.webContents.getZoomLevel()
      if (Number.isFinite(zoomLevel)) {
        this.state.zoomLevel = zoomLevel
        this.scheduleSave()
      }
    }

    window.webContents.on('zoom-changed', trackZoom)

    // Restore zoom on did-finish-load
    window.webContents.on('did-finish-load', () => {
      if (window.isDestroyed() || window.webContents.isDestroyed()) return
      if (typeof this.state.zoomLevel === 'number' && this.state.zoomLevel !== 0) {
        window.webContents.setZoomLevel(this.state.zoomLevel)
      }
    })

    window.once('close', () => {
      this.flushSync()
    })
  }

  public setZoomLevel(zoomLevel: number): void {
    if (Number.isFinite(zoomLevel)) {
      this.state.zoomLevel = zoomLevel
      this.scheduleSave()
    }
  }

  public scheduleSave(delayMs = 400): void {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => {
      this.saveTimer = undefined
      this.flushSync()
    }, delayMs)
  }

  public flushSync(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = undefined
    }
    try {
      writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), 'utf8')
    } catch (err) {
      console.warn('[window-state] failed to save window state', err)
    }
  }
}
