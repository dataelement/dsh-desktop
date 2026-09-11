export declare const CONTRACT_VERSION = "0.5.0"
export declare const CLIENT_ID = "dsh-desktop"
export declare const CALLBACK_PATH = "/dsh/callback"
export declare const ACCESS_REFRESH_SKEW_MS = 60000
export declare const COMPATIBLE_CONTRACT_VERSIONS: readonly ['0.4.0', '0.5.0']
export declare const API_PATHS: Readonly<Record<'config' | 'authorizations' | 'token' | 'logout' | 'models' | 'chat' | 'usage', string>>

export interface EnterpriseModel {
  id: string
  object: string
  created: number
  owned_by: string
  display_name: string
  capabilities: { streaming: boolean; tools: boolean; reasoning_content: boolean }
}

export declare class EnterpriseApiError extends Error {
  status?: number
  code?: string
  type?: string
  requestId?: string
  uncertain: boolean
}

export declare function createPkceTransaction(): {
  codeVerifier: string
  codeChallenge: string
  state: string
}
export declare function pkceChallenge(codeVerifier: string): string
export declare function parseConfig(value: unknown): { enabled: false } | {
  enabled: true
  client_id: 'dsh-desktop'
  contract_version: '0.4.0' | '0.5.0'
}
export declare function parseAuthorization(value: unknown, base: string): {
  auth_id: string
  authorize_url: string
  expires_in: number
}
export declare function parseToken(value: unknown, base: string, receivedAt?: number): Record<string, unknown> & {
  base: string
  access_token: string
  refresh_token: string
  session_id: string
}
export declare function parseModels(value: unknown): EnterpriseModel[]
export declare function parseUsage(value: unknown): Record<string, unknown> & {
  source: 'live' | 'persisted' | 'unavailable'
  quota_state: 'available' | 'exhausted' | 'unavailable'
  used: number | null
  limit: number | null
  remaining: number | null
  as_of: string | null
}
export declare function accessNeedsRefresh(session: { access_expires_at: string }, now?: number): boolean
export declare function requestJson(base: string, path: string, options?: Record<string, unknown>): Promise<{
  body: unknown
  requestId?: string
}>
