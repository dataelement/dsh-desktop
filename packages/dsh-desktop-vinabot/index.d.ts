export declare const name: string
export declare const inject: readonly string[]

export declare const VINABOT_ORIGIN: string
export declare const VINABOT_API_BASE: string
export declare const VINABOT_PROVIDER: string
export declare const VINABOT_ANTHROPIC_PROVIDER: string
export declare const VINABOT_CHAT_PROVIDER: string
export declare const VINABOT_PROVIDER_BY_PROTOCOL: Readonly<Record<VinabotProtocol, string>>
export declare const VINABOT_RESPONSES_REASONING_EFFORTS: Readonly<{
  low: 'low'
  medium: 'medium'
  high: 'high'
  xhigh: 'xhigh'
  max: 'max'
}>
export declare const VINABOT_ANTHROPIC_REASONING_EFFORTS: Readonly<{
  low: 'low'
  high: 'high'
  max: 'max'
}>
export declare const VINABOT_CHAT_REASONING_EFFORTS: Readonly<{
  low: 'low'
  high: 'high'
  max: 'max'
}>
export declare const VINABOT_CREDENTIAL_REF: string
export declare const VINABOT_SETTINGS_NAMESPACE: string

export declare const STATUS_PATH: string
export declare const LOGIN_PATH: string
export declare const TWO_FACTOR_PATH: string
export declare const CONFIGURE_PATH: string
export declare const CANCEL_PATH: string

export interface VinabotModel {
  id: string
  name: string
  protocols: VinabotProtocol[]
  input: Array<'text' | 'image'>
}

export type VinabotProtocol = 'openai-completions' | 'openai-responses' | 'anthropic-messages'

export interface VinabotIntegrationOptions {
  fetchImpl?: typeof globalThis.fetch
  now?: () => number
  randomUUID?: () => string
  anonymousId?: string
}

export declare class VinabotIntegrationError extends Error {
  readonly status: number
  readonly code: string
  constructor(message: string, status?: number, code?: string, options?: ErrorOptions)
}

export declare function normalizeApiKey(value: unknown): string
export declare function isClaudeModel(model: unknown): boolean
export declare function isAllowedVinabotModel(model: unknown): boolean
export declare function inputModalitiesOfModel(model: unknown): Array<'text' | 'image'>
export declare function protocolsOfModel(model: unknown): VinabotModel['protocols']
export declare function recommendedProtocol(model: unknown): VinabotProtocol
export declare function normalizeModels(payload: unknown): VinabotModel[]

export declare class VinabotClient {
  constructor(fetchImpl?: typeof globalThis.fetch)
  request(path: string, options?: Record<string, unknown>): Promise<unknown>
  logout(accessToken?: string, sid?: string): Promise<void>
}

export declare class VinabotIntegration {
  constructor(ctx: any, options?: VinabotIntegrationOptions)
  status(): Promise<Record<string, unknown>>
  login(input: Record<string, unknown>, signal?: AbortSignal): Promise<Record<string, unknown>>
  verifyTwoFactor(input: Record<string, unknown>, signal?: AbortSignal): Promise<Record<string, unknown>>
  configure(input: Record<string, unknown>): Promise<Record<string, unknown>>
  cancel(input: Record<string, unknown>): Promise<{ ok: true }>
  dispose(): Promise<void>
}

export declare function apply(ctx: any): void
