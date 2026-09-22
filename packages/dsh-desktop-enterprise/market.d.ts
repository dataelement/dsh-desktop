import type { Context } from '@deepseek-ai/cordis'
import type { MarketRuntimeFiber } from './market-runtime.js'
export interface InstalledMarketPlugin {
  name: string; version: string; digest: string; directory: string; generation_id: string; plugin_id: string;
  version_id: string; revision: number; enabled: boolean; status: string; display_name: string; error?: string; config?: Record<string, unknown>; description?: string
}
export interface MarketAccount {
  connected: boolean; desktopVersion?: string; base?: string; user?: { id: string }; tenant?: { id: string; name?: string }; sessionExpiresAt?: string
}
export interface MarketState extends MarketAccount { configured: boolean; target: string; desktopVersion: string; accountKey: string | null; connected: boolean; online: boolean; installed: Omit<InstalledMarketPlugin, 'directory' | 'config'>[]; error?: string; expiresAt?: number }
export interface MarketController {
  state(): MarketState
  synchronize(): Promise<void>
  catalog(query?: string, page?: number): Promise<MarketState & { data: unknown[]; total: number; installReady?: boolean }>
  act(input: { action: string; plugin_id: string; version_id?: string; config?: Record<string, unknown> }): Promise<MarketState>
  stop(clearLease?: boolean): Promise<void>
  tick(): Promise<void>
}
export declare function createMarketController(ctx: Context, account: {
  state(): MarketAccount
  marketRequest(path: string, body?: unknown, binary?: boolean): Promise<unknown>
}, options?: { home?: string; target?: string; publicKey?: string; desktopVersion?: string;
  load?: (record: InstalledMarketPlugin) => Promise<MarketRuntimeFiber> }): MarketController

export declare function applyEnterpriseMarket(ctx: Context, account: {
  state(): MarketAccount
  refreshState?(): Promise<unknown>
  refreshProfile?(): Promise<unknown>
  marketRequest(path: string, body?: unknown, binary?: boolean): Promise<unknown>
}): MarketController

export declare function isMarketVersionCompatible(version: string, minimum: string): boolean
