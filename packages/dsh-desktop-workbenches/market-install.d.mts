export interface MarketInstallRecord {
  catalogId: string
  pluginName: string
  version: string
  source?: string
  installedAt?: string
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
  constructor(message: string, status?: number, code?: 'download_failed' | 'download_interrupted' | 'invalid_download_url' | 'unsafe_download_url', params?: { diagnostic: string })
  status: number
  code?: 'download_failed' | 'download_interrupted' | 'invalid_download_url' | 'unsafe_download_url'
  params?: { diagnostic: string }
}
