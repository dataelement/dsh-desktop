import {
  RESEARCH_CANVAS_WHEEL_EVENT_CHANNEL,
  RESEARCH_CANVAS_WHEEL_REGION_CHANNEL,
  type ResearchCanvasNativeWheel,
  type ResearchCanvasWheelRegionUpdate
} from '../shared/research-canvas-wheel'

type IpcRendererLike = {
  sendSync(channel: string, value: unknown): unknown
  on(channel: string, listener: (event: unknown, value: unknown) => void): unknown
  removeListener(channel: string, listener: (event: unknown, value: unknown) => void): unknown
}

export type ResearchCanvasWheelBridge = Readonly<{
  setRegion(value: ResearchCanvasWheelRegionUpdate): boolean
  subscribe(listener: (value: ResearchCanvasNativeWheel) => void): () => void
}>

export function createResearchCanvasWheelBridge(
  ipcRenderer: IpcRendererLike
): ResearchCanvasWheelBridge {
  return Object.freeze({
    setRegion(value: ResearchCanvasWheelRegionUpdate): boolean {
      return ipcRenderer.sendSync(RESEARCH_CANVAS_WHEEL_REGION_CHANNEL, value) === true
    },
    subscribe(listener: (value: ResearchCanvasNativeWheel) => void): () => void {
      if (typeof listener !== 'function') throw new TypeError('Research canvas wheel listener required.')
      let active = true
      const onWheel = (_event: unknown, value: unknown) => {
        if (active) listener(value as ResearchCanvasNativeWheel)
      }
      ipcRenderer.on(RESEARCH_CANVAS_WHEEL_EVENT_CHANNEL, onWheel)
      return () => {
        if (!active) return
        active = false
        ipcRenderer.removeListener(RESEARCH_CANVAS_WHEEL_EVENT_CHANNEL, onWheel)
      }
    }
  })
}
