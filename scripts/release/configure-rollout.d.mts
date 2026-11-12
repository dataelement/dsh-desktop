export const SUPPORTED_PLATFORMS: readonly string[]
export const DEFAULT_BASE_URL: string
export const DEFAULT_PERCENTAGE: number

export function isValidVersion(value: unknown): boolean

export interface ConfigureRolloutOptions {
  version: string
  percentage?: number
  token?: string
  baseUrl?: string
  fetchImpl?: (url: any, init?: any) => Promise<any>
  notes?: string
  log?: (msg: string) => void
  warn?: (msg: string) => void
}

export interface RolloutResult {
  platform: string
  action: 'created' | 'updated' | 'updated-after-conflict'
  data: Record<string, unknown>
}

export function configureRollout(options: ConfigureRolloutOptions): Promise<RolloutResult[]>
