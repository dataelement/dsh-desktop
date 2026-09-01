import type { ResearchWebReaderResult } from '../main/state/research-web-reader'

type ResearchWebReaderInvoke = (channel: string, value: unknown) => Promise<unknown>

export type ResearchWebReaderRequest = {
  sessionId: string
  nodeId: string
  url: string
}

export function createResearchWebReaderBridge(invoke: ResearchWebReaderInvoke) {
  return Object.freeze({
    read(value: ResearchWebReaderRequest) {
      return invoke('research:web-reader:read', value) as Promise<ResearchWebReaderResult>
    }
  })
}
