export interface MarketInstallRecord {
  catalogId: string
  pluginName: string
  version: string
  source?: string
  installedAt?: string
}

export interface MarketInstallStore {
  read(): Promise<Record<string, MarketInstallRecord>>
  record(id: string, value: MarketInstallRecord): Promise<Record<string, MarketInstallRecord>>
  forget(id: string): Promise<Record<string, MarketInstallRecord>>
  forgetPlugin(pluginName: string): Promise<Record<string, MarketInstallRecord>>
}

export function createMarketInstallStore(root: string): MarketInstallStore
