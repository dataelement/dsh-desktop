import { randomUUID } from 'node:crypto'
import { closeSync, existsSync, fsyncSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { screen } from 'electron'

export interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized?: boolean
  zoomLevel?: number
}

export interface WorkArea {
  x: number
  y: number
  width: number
  height: number
}

export interface DisplayWorkArea {
  workArea: WorkArea
}

/** The window methods this manager actually uses, so tests can pass a fake. */
export interface TrackedWindow {
  isDestroyed(): boolean
  isMaximized(): boolean
  /** Bounds of the restored window, including while maximized, minimized, or fullscreen. */
  getNormalBounds(): { x: number; y: number; width: number; height: number }
  on(event: 'resize' | 'move' | 'maximize' | 'unmaximize' | 'close', listener: () => void): void
  webContents: TrackedWebContents
}

interface TrackedWebContents {
  isDestroyed(): boolean
  getURL(): string
  getZoomLevel(): number
  setZoomLevel(zoomLevel: number): void
  on(event: 'zoom-changed' | 'did-finish-load' | 'will-navigate', listener: () => void): void
}

interface MaximizableWindow {
  isDestroyed(): boolean
  isMaximized(): boolean
  maximize(): void
}

export interface WindowTrackOptions {
  /** True only for the application document. Splash and recovery pages use other origins. */
  tracksZoom: (url: string) => boolean
}

export const DEFAULT_WINDOW_WIDTH = 1280
export const DEFAULT_WINDOW_HEIGHT = 820
export const MIN_WINDOW_WIDTH = 520
export const MIN_WINDOW_HEIGHT = 600

const MIN_ZOOM_LEVEL = -3
const MAX_ZOOM_LEVEL = 3
const OFFSCREEN_TOLERANCE = 50
const VISIBLE_ANCHOR = 100

export class WindowStateManager {
  private state: WindowState
  private readonly filePath: string
  private saveTimer?: NodeJS.Timeout
  private trackedWindow?: TrackedWindow
  private tracksZoom?: (url: string) => boolean
  private zoomRestored = false
  private maximizedRestored = false

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
        const parsed = readRecord(JSON.parse(readFileSync(this.filePath, 'utf8')))
        if (parsed !== undefined) {
          const width = readFinite(parsed.width)
          const height = readFinite(parsed.height)
          return {
            width: width !== undefined && width >= MIN_WINDOW_WIDTH ? width : DEFAULT_WINDOW_WIDTH,
            height: height !== undefined && height >= MIN_WINDOW_HEIGHT ? height : DEFAULT_WINDOW_HEIGHT,
            x: readFinite(parsed.x),
            y: readFinite(parsed.y),
            isMaximized: typeof parsed.isMaximized === 'boolean' ? parsed.isMaximized : false,
            zoomLevel: clampZoom(parsed.zoomLevel)
          }
        }
      }
    } catch {
      // A torn or unreadable file falls back to the first-run size.
    }
    return {
      width: DEFAULT_WINDOW_WIDTH,
      height: DEFAULT_WINDOW_HEIGHT,
      isMaximized: false,
      zoomLevel: 0
    }
  }

  public validateBounds(state: WindowState): { x?: number; y?: number; width: number; height: number } {
    try {
      return resolveWindowBounds(state, screen.getAllDisplays(), screen.getPrimaryDisplay().workArea)
    } catch {
      return resolveWindowBounds(state, [])
    }
  }

  /**
   * Remember bounds, maximized, and the application-page zoom.
   * Menu zoom does not emit `zoom-changed` (that event is the mouse wheel), and
   * the wheel event can run before `getZoomLevel()` has caught up, so zoom is
   * read when leaving the application page and again at flush time.
   * `getNormalBounds()` stays at the restored size while a maximize `resize`
   * already reports the filled work area.
   */
  public track(window: TrackedWindow, options: WindowTrackOptions): void {
    this.trackedWindow = window
    this.tracksZoom = options.tracksZoom

    const updateState = (): void => {
      if (window.isDestroyed()) return
      const bounds = window.getNormalBounds()
      this.state.width = bounds.width
      this.state.height = bounds.height
      this.state.x = bounds.x
      this.state.y = bounds.y
      this.state.isMaximized = window.isMaximized()
      this.scheduleSave()
    }

    window.on('resize', updateState)
    window.on('move', updateState)
    window.on('maximize', updateState)
    window.on('unmaximize', updateState)
    window.webContents.on('zoom-changed', () => {
      if (window.isDestroyed() || window.webContents.isDestroyed()) return
      this.scheduleSave()
    })
    // Page-initiated navigations only. `loadURL` does not emit this event.
    window.webContents.on('will-navigate', () => {
      this.captureApplicationZoom()
    })
    window.webContents.on('did-finish-load', () => {
      this.restoreZoomOnce()
    })
    // `close` fires on every Windows hide-to-tray as well as the real quit.
    window.on('close', () => {
      this.flushSync()
    })
  }

  /**
   * Store the application zoom before the document changes.
   * Call this before `webContents.loadURL`: that path skips `will-navigate`,
   * and a later flush on the splash or recovery page would otherwise keep the
   * previous zoom and put it back on the next launch.
   */
  public captureApplicationZoom(): void {
    if (!this.sampleZoom()) return
    this.scheduleSave()
  }

  /**
   * Maximize once a document is ready to paint. Calling `maximize()` before
   * the window is shown also shows it, which would flash an empty frame ahead
   * of the splash page. The splash page calls this after its document loads.
   * If that load fails, the application page calls it before show. Later calls
   * do nothing.
   */
  public restoreMaximized(window: MaximizableWindow): void {
    if (this.maximizedRestored || window.isDestroyed()) return
    this.maximizedRestored = true
    if (this.state.isMaximized === true && !window.isMaximized()) window.maximize()
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
    this.sampleZoom()
    const temporary = join(dirname(this.filePath), `.window-state.${String(process.pid)}.${randomUUID()}.tmp`)
    let fd: number | undefined
    try {
      fd = openSync(temporary, 'w', 0o600)
      writeFileSync(fd, `${JSON.stringify(this.state, null, 2)}\n`, 'utf8')
      fsyncSync(fd)
      closeSync(fd)
      fd = undefined
      renameSync(temporary, this.filePath)
    } catch (err) {
      console.warn('[window-state] failed to save window state', err)
      if (fd !== undefined) {
        try { closeSync(fd) } catch { /* The temp file is removed below. */ }
      }
      try { unlinkSync(temporary) } catch { /* Nothing was written, or rename already consumed it. */ }
    }
  }

  /** Read the live zoom only while the application document is showing. */
  private sampleZoom(): boolean {
    const zoomLevel = this.applicationZoom()
    if (zoomLevel === undefined) return false
    this.state.zoomLevel = clampZoom(zoomLevel)
    return true
  }

  /**
   * Apply the saved zoom on the first application document only.
   * Chromium keeps that host's zoom for the rest of the session, including a
   * splash round-trip. Applying it again would put a stale value back after
   * the user had already changed the zoom.
   */
  private restoreZoomOnce(): void {
    if (this.zoomRestored) return
    const window = this.trackedWindow
    if (window === undefined || this.applicationZoom() === undefined) return
    this.zoomRestored = true
    const zoomLevel = this.state.zoomLevel
    if (zoomLevel !== undefined && zoomLevel !== 0) window.webContents.setZoomLevel(zoomLevel)
  }

  /** The current zoom when the tracked page is the application document. */
  private applicationZoom(): number | undefined {
    const window = this.trackedWindow
    const tracksZoom = this.tracksZoom
    if (window === undefined || tracksZoom === undefined) return undefined
    if (window.isDestroyed() || window.webContents.isDestroyed()) return undefined
    let url = ''
    try {
      url = window.webContents.getURL()
    } catch {
      return undefined
    }
    let applicable = false
    try {
      applicable = tracksZoom(url)
    } catch {
      return undefined
    }
    if (!applicable) return undefined
    const zoomLevel = window.webContents.getZoomLevel()
    return Number.isFinite(zoomLevel) ? zoomLevel : undefined
  }
}

/**
 * Fit a saved window onto the displays currently attached.
 * Coordinates stay only when a 100×100 anchor is inside some work area,
 * allowing 50px of overhang. Size is then limited to that display, or to the
 * primary display when the position is missing. A window that still crosses
 * the far edge is shifted back without shrinking it again.
 */
export function resolveWindowBounds(
  state: WindowState,
  displays: readonly DisplayWorkArea[],
  primaryWorkArea?: WorkArea
): { x?: number; y?: number; width: number; height: number } {
  let width = Math.max(MIN_WINDOW_WIDTH, finiteOr(state.width, DEFAULT_WINDOW_WIDTH))
  let height = Math.max(MIN_WINDOW_HEIGHT, finiteOr(state.height, DEFAULT_WINDOW_HEIGHT))
  const placed = displayContaining(state.x, state.y, displays)
  const x = placed === undefined ? undefined : state.x
  const y = placed === undefined ? undefined : state.y
  const reference = placed?.workArea ?? primaryWorkArea
  if (reference === undefined || x === undefined || y === undefined) {
    const clamped = clampToWorkArea(width, height, reference)
    return { width: clamped.width, height: clamped.height, x, y }
  }
  const clamped = clampToWorkArea(width, height, reference)
  width = clamped.width
  height = clamped.height
  return { width, height, ...shiftInside(x, y, width, height, reference) }
}

function clampToWorkArea(width: number, height: number, area: WorkArea | undefined): { width: number; height: number } {
  if (area === undefined) return { width, height }
  return {
    width: Math.min(width, Math.max(MIN_WINDOW_WIDTH, area.width)),
    height: Math.min(height, Math.max(MIN_WINDOW_HEIGHT, area.height))
  }
}

function displayContaining(
  x: number | undefined,
  y: number | undefined,
  displays: readonly DisplayWorkArea[]
): DisplayWorkArea | undefined {
  if (x === undefined || y === undefined) return undefined
  return displays.find(display => anchorVisible(x, y, display.workArea))
}

function anchorVisible(x: number, y: number, area: WorkArea): boolean {
  return x >= area.x - OFFSCREEN_TOLERANCE
    && x + VISIBLE_ANCHOR <= area.x + area.width
    && y >= area.y - OFFSCREEN_TOLERANCE
    && y + VISIBLE_ANCHOR <= area.y + area.height
}

function shiftInside(
  x: number,
  y: number,
  width: number,
  height: number,
  area: WorkArea
): { x: number; y: number } {
  let nextX = x
  let nextY = y
  const right = area.x + area.width
  const bottom = area.y + area.height
  if (nextX + width > right) nextX = right - width
  if (nextY + height > bottom) nextY = bottom - height
  return { x: nextX, y: nextY }
}

function finiteOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

function readFinite(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function clampZoom(value: unknown): number {
  const zoom = readFinite(value)
  if (zoom === undefined) return 0
  return Math.min(MAX_ZOOM_LEVEL, Math.max(MIN_ZOOM_LEVEL, zoom))
}
