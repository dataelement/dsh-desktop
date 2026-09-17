import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export type { PluginsEventFrame } from './events.ts';
export { EVENTS_ENDPOINT } from './events.ts';
/** Cordis plugin name. */
export declare const name = "client-hmr";
/** Required services: the web plugin table and the route registry. */
export declare const inject: string[];
/** Plugin config, validated by the same-named schemastery schema. */
export interface Config {
    /** Bundle stat-poll interval in milliseconds (default 500, the build-side watcher's polling default). */
    pollIntervalMs?: number;
}
export declare const Config: z<Config>;
/**
 * Mount the dev chain: bundle watches, rebuilt reporting, and the SSE channel.
 * @param ctx - host plugin context carrying clientModuleHost and webServer.
 * @param config - validated {@link Config}.
 */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map