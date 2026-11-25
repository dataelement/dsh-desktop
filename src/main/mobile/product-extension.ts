import type { IncomingHttpHeaders } from 'node:http'

export interface MobileRpcResult { ok: boolean; value?: unknown; error?: string }
/** Main-process only. Product code validates its own RPC inputs before using this transport. */
export interface MobileProductTransport {
  port(): number | undefined
  channelToken(): string
  request(path: string, init: RequestInit): Promise<Response>
  invoke(endpoint: string, args: Record<string, unknown>): Promise<MobileRpcResult>
  forward(method: string, payload: unknown): Promise<MobileRpcResult>
}
export interface MobileProductExtension {
  /** Rechecked before stream frames and every second while idle; must be synchronous and side-effect free.
   * Validate the request account against the current account. False or a thrown error revokes access.
   * The bridge always checks loopback and its capability before accepting a request. */
  authorizeRemote(headers: IncomingHttpHeaders): boolean
  attach?(transport: MobileProductTransport): (() => void | Promise<void>) | void
  rpc?(input: { method?: unknown; payload?: unknown }, transport: MobileProductTransport): Promise<MobileRpcResult | undefined>
  renderPage?(locale: 'en' | 'zh'): string
  /** Per-stream state belongs in this factory and is discarded when that stream closes. */
  sessionProjection?(sessionId: string, view: string | null): { assistantStream?: boolean; project(value: unknown): unknown }
}
