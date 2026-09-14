export type SupportedPlatform = 'mac' | 'mac-intel' | 'windows'

export interface RolloutRelease {
  id?: string
  version: string
  platform: SupportedPlatform
  percentage?: number
  revision?: number
  algorithm?: string
  seed?: string
  enabled?: boolean
  notes?: string
  [key: string]: unknown
}

export interface ConfigureRolloutOptions {
  version: string
  percentage?: number
  token?: string
  baseUrl?: string
  fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>
  notes?: string
  log?: (message: string) => void
  warn?: (message: string) => void
}

export interface ConfigureRolloutResult {
  platform: SupportedPlatform
  action: 'created' | 'updated' | 'updated-after-conflict'
  data: RolloutRelease
}

export const SUPPORTED_PLATFORMS: SupportedPlatform[]
export const DEFAULT_BASE_URL: string
export const DEFAULT_PERCENTAGE: number

export function isValidVersion(value: unknown): value is string
export function configureRollout(options: ConfigureRolloutOptions): Promise<ConfigureRolloutResult[]>
