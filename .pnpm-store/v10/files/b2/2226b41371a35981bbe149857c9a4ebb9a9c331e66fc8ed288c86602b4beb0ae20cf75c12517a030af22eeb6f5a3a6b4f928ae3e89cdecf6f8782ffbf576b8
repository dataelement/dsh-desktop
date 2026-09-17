/**
 * Active Loader-backed plugin package inventory for official DeepSeek requests.
 * Host entries and the requesting agent's standing preset are resolved at request time;
 * installed dependencies and plugin fibers without Loader package provenance are excluded.
 * @module @deepseek-ai/dsh-plugin-package-inventory-deepseek
 */
import { type Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export type * from './types.ts';
/** Cordis plugin name. */
export declare const name = "plugin-package-inventory-deepseek";
/** Services required to locate host/requesting-agent entries and contribute the field. */
export declare const inject: string[];
/** Plugin-package request contribution configuration. */
export interface Config {
    /** Contribute `dsh_plugin_packages` to official DeepSeek requests. Defaults to `true`. */
    enabled?: boolean;
}
/** Validated plugin-package request contribution configuration. */
export declare const Config: z<Config>;
/**
 * Register the complete `dsh_plugin_packages` request contribution when enabled.
 * @param ctx - plugin context carrying Loader provenance and the DeepSeek request-extension registry.
 * @param config - validated default-on configuration.
 */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map