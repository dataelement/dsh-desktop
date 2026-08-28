import type {
  BrowserWindow,
  Event as ElectronEvent,
  IpcMain,
  MouseInputEvent,
  MouseWheelInputEvent,
  WebContentsDidStartNavigationEventParams
} from 'electron'
import { registerTrustedMainWindowListener } from '../ipc-trust'
import {
  RESEARCH_CANVAS_WHEEL_EVENT_CHANNEL,
  RESEARCH_CANVAS_WHEEL_REGION_CHANNEL,
  type ResearchCanvasNativeWheel,
  type ResearchCanvasWheelRegionUpdate
} from '../../shared/research-canvas-wheel'

const MAX_REGION_COORDINATE = 1_000_000
const MAX_REGION_SIZE = 32_768
const MAX_WHEEL_DELTA = 4_096
const MAX_RETIRED_OWNER_IDS = 64
const COMMAND_MODIFIERS = new Set(['meta', 'command', 'cmd'])

type ActiveRegion = Extract<ResearchCanvasWheelRegionUpdate, { active: true }>

function plainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value).sort()
  return keys.length === expected.length && keys.every((key, index) => key === expected[index])
}

function validGeneration(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === 'number' && value > 0
}

function validOwnerId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value)
}

function boundedFinite(value: unknown, maximum: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= maximum
}

function parseRegionUpdate(value: unknown): ResearchCanvasWheelRegionUpdate | null {
  if (
    !plainRecord(value) || typeof value.active !== 'boolean' ||
    !validGeneration(value.generation) || !validOwnerId(value.ownerId)
  ) {
    return null
  }
  if (!value.active) {
    return exactKeys(value, ['active', 'generation', 'ownerId'])
      ? { active: false, generation: value.generation, ownerId: value.ownerId }
      : null
  }
  if (!exactKeys(value, ['active', 'generation', 'height', 'left', 'ownerId', 'top', 'width'])) return null
  if (
    !boundedFinite(value.left, MAX_REGION_COORDINATE) ||
    !boundedFinite(value.top, MAX_REGION_COORDINATE) ||
    typeof value.width !== 'number' || !Number.isFinite(value.width) ||
    typeof value.height !== 'number' || !Number.isFinite(value.height) ||
    value.width <= 0 || value.height <= 0 ||
    value.width > MAX_REGION_SIZE || value.height > MAX_REGION_SIZE ||
    !Number.isFinite(value.left + value.width) ||
    !Number.isFinite(value.top + value.height)
  ) {
    return null
  }
  return {
    active: true,
    generation: value.generation,
    ownerId: value.ownerId,
    left: value.left,
    top: value.top,
    width: value.width,
    height: value.height
  }
}

function commandWheel(mouse: MouseInputEvent): mouse is MouseWheelInputEvent {
  return mouse.type === 'mouseWheel' &&
    Array.isArray(mouse.modifiers) &&
    mouse.modifiers.some((modifier) => COMMAND_MODIFIERS.has(modifier))
}

export class ResearchCanvasWheelRouter {
  private activeRegion: ActiveRegion | null = null
  private currentOwnerId: string | null = null
  private lastGeneration = 0
  private readonly retiredOwnerIds = new Set<string>()
  private disposed = false

  private readonly onBeforeMouseEvent = (
    event: ElectronEvent,
    mouse: MouseInputEvent
  ): void => {
    const region = this.activeRegion
    if (region === null || !commandWheel(mouse)) return
    const { x, y, deltaX, deltaY } = mouse
    if (
      !boundedFinite(x, MAX_REGION_COORDINATE) ||
      !boundedFinite(y, MAX_REGION_COORDINATE) ||
      !boundedFinite(deltaX, MAX_WHEEL_DELTA) ||
      !boundedFinite(deltaY, MAX_WHEEL_DELTA) ||
      (deltaX === 0 && deltaY === 0) ||
      x < region.left || x >= region.left + region.width ||
      y < region.top || y >= region.top + region.height
    ) {
      return
    }
    const payload: ResearchCanvasNativeWheel = {
      generation: region.generation,
      ownerId: region.ownerId,
      clientX: x,
      clientY: y,
      deltaX,
      deltaY,
      deltaMode: 0
    }
    try {
      this.window.webContents.send(RESEARCH_CANVAS_WHEEL_EVENT_CHANNEL, payload)
    } catch {
      this.clear()
      return
    }
    event.preventDefault()
  }

  private readonly onDidStartNavigation = (
    event: ElectronEvent<WebContentsDidStartNavigationEventParams>,
    _url?: string,
    isInPlace?: boolean,
    isMainFrame?: boolean
  ): void => {
    const navigationIsMainFrame = typeof event.isMainFrame === 'boolean'
      ? event.isMainFrame
      : isMainFrame === true
    const sameDocument = typeof event.isSameDocument === 'boolean'
      ? event.isSameDocument
      : isInPlace === true
    if (navigationIsMainFrame && !sameDocument) this.resetForDocumentLifecycle()
  }

  private readonly onRendererGone = (): void => this.resetForDocumentLifecycle()
  private readonly onWindowClosed = (): void => this.dispose()

  private retireOwner(ownerId: string): void {
    this.retiredOwnerIds.delete(ownerId)
    this.retiredOwnerIds.add(ownerId)
    while (this.retiredOwnerIds.size > MAX_RETIRED_OWNER_IDS) {
      const oldest = this.retiredOwnerIds.values().next().value as string | undefined
      if (oldest === undefined) break
      this.retiredOwnerIds.delete(oldest)
    }
  }

  constructor(private readonly window: BrowserWindow) {
    window.webContents.on('before-mouse-event', this.onBeforeMouseEvent)
    window.webContents.on('did-start-navigation', this.onDidStartNavigation)
    window.webContents.on('render-process-gone', this.onRendererGone)
    window.webContents.on('destroyed', this.onRendererGone)
    window.on('closed', this.onWindowClosed)
  }

  setRegion(value: unknown): boolean {
    if (this.disposed) return false
    const update = parseRegionUpdate(value)
    if (
      update === null ||
      update.generation <= this.lastGeneration ||
      this.retiredOwnerIds.has(update.ownerId)
    ) return false
    if (this.currentOwnerId !== update.ownerId) {
      if (!update.active) return false
      if (this.currentOwnerId !== null) this.retireOwner(this.currentOwnerId)
      this.currentOwnerId = update.ownerId
    }
    this.lastGeneration = update.generation
    this.activeRegion = update.active ? update : null
    return true
  }

  clear(): void {
    this.activeRegion = null
  }

  private resetForDocumentLifecycle(): void {
    this.activeRegion = null
    this.currentOwnerId = null
    this.lastGeneration = 0
    this.retiredOwnerIds.clear()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.resetForDocumentLifecycle()
    this.window.webContents.off('before-mouse-event', this.onBeforeMouseEvent)
    this.window.webContents.off('did-start-navigation', this.onDidStartNavigation)
    this.window.webContents.off('render-process-gone', this.onRendererGone)
    this.window.webContents.off('destroyed', this.onRendererGone)
    this.window.off('closed', this.onWindowClosed)
  }
}

export function installResearchCanvasWheelRouter(window: BrowserWindow): ResearchCanvasWheelRouter {
  return new ResearchCanvasWheelRouter(window)
}

export function registerResearchCanvasWheelIpc(options: {
  ipcMain: IpcMain
  getMainWindow(): BrowserWindow | undefined
  getRouter(): ResearchCanvasWheelRouter | undefined
  onRejected?(error: unknown): void
}): void {
  options.ipcMain.removeAllListeners(RESEARCH_CANVAS_WHEEL_REGION_CHANNEL)
  registerTrustedMainWindowListener(
    options.ipcMain,
    RESEARCH_CANVAS_WHEEL_REGION_CHANNEL,
    options.getMainWindow,
    (_event, value: unknown) => options.getRouter()?.setRegion(value) ?? false,
    false,
    options.onRejected
  )
}
