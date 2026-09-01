import type {
  ResearchCanvasExportRequest,
  ResearchCanvasExportResult
} from '../main/state/research-canvas-export'

type ResearchCanvasExportInvoke = (channel: string, value: unknown) => Promise<unknown>

export function createResearchCanvasExportBridge(invoke: ResearchCanvasExportInvoke) {
  return Object.freeze({
    save(value: ResearchCanvasExportRequest) {
      return invoke('research:canvas-export:save', value) as Promise<ResearchCanvasExportResult>
    }
  })
}
