export const RESEARCH_CANVAS_WHEEL_REGION_CHANNEL = 'research:canvas-wheel:set-region'
export const RESEARCH_CANVAS_WHEEL_EVENT_CHANNEL = 'research:canvas-wheel:native'

export type ResearchCanvasWheelRegionUpdate =
  | {
      active: false
      generation: number
      ownerId: string
    }
  | {
      active: true
      generation: number
      ownerId: string
      left: number
      top: number
      width: number
      height: number
    }

export type ResearchCanvasNativeWheel = {
  generation: number
  ownerId: string
  clientX: number
  clientY: number
  deltaX: number
  deltaY: number
  deltaMode: 0
}
