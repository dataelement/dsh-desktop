import type { Context } from '@deepseek-ai/cordis'
export interface MarketRuntimeRecord { name: string; directory: string; config?: Record<string, unknown> }
export interface MarketRuntimeFiber { dispose(): Promise<void>; readonly state?: number }
export declare function createMarketRuntime(ctx: Context): (record: MarketRuntimeRecord) => Promise<MarketRuntimeFiber>
