/**
 * dsh-market host entry: mounts the market's HTTP routes once the profile
 * composes the webServer and shell services.
 */
import type { Context } from '@deepseek-ai/cordis';
import { type MarketConfig } from './routes.ts';
export declare const name = "dsh-market";
/** Optional cordis.yml configuration; profile defaults to `web`. */
export type Config = Partial<Pick<MarketConfig, 'profile' | 'allowRestart' | 'maxSnapshots'>>;
export declare function apply(ctx: Context, config?: Config): void;
