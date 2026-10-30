export interface WorkbenchInstallEvidence {
  origin: 'local' | 'market' | 'unknown'
  contentVerified: boolean
  /** Only positive evidence of local or changed content requires update confirmation. */
  updateRisk: 'local' | 'modified' | null
  version?: string
  fingerprint?: string
  metadata: Record<string, string | undefined>
}

export interface MarketInstallRecord {
  catalogId: string
  pluginName: string
  version: string
  source?: string
  installedAt?: string
  /** v2:<sha256> hashes content independently of installation path; bare hashes are legacy v1. */
  fingerprint?: string
}

export interface MarketInstallStore {
  read(): Promise<Record<string, MarketInstallRecord>>
  record(id: string, value: MarketInstallRecord): Promise<Record<string, MarketInstallRecord>>
  forget(id: string): Promise<Record<string, MarketInstallRecord>>
  forgetPlugin(pluginName: string): Promise<Record<string, MarketInstallRecord>>
}

export function createMarketInstallStore(root: string): MarketInstallStore

export class MarketInstallError extends Error {
  constructor(message: string, status?: number, code?: 'download_failed' | 'download_interrupted' | 'invalid_download_url' | 'unsafe_download_url' | 'confirmation_required', params?: { diagnostic: string } | { updateRisk: 'local' | 'modified' })
  status: number
  code?: 'download_failed' | 'download_interrupted' | 'invalid_download_url' | 'unsafe_download_url' | 'confirmation_required'
  params?: { diagnostic: string } | { updateRisk: 'local' | 'modified' }
}
