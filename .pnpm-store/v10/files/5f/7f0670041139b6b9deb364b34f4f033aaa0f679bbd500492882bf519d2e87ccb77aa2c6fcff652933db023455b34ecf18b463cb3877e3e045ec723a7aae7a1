/**
 * The SDK profile's command-line and stdin-lifetime provider. A successful
 * parse publishes {@link SDK_APP_STARTUP_SERVICE}; the JSON-RPC server waits
 * for that service, so help starts no transport.
 * @module @deepseek-ai/dsh-sdk-app
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
/** Stable Cordis plugin name. */
export declare const name = "sdk-app-startup";
/** Launcher service required before this app can parse its invocation. */
export declare const inject: string[];
/** Service the JSON-RPC server row waits for before claiming stdio. */
export declare const SDK_APP_STARTUP_SERVICE = "sdkAppStartup";
/** SDK stdio startup configuration. */
export interface Config {
    /** Profile name rendered in help and diagnostics (default `sdk`). */
    profile?: string;
}
/** Validate and default SDK stdio startup configuration. */
export declare const Config: z<Config>;
/**
 * Accept an SDK profile invocation, publish readiness, and bind EOF to the
 * launcher's bounded shutdown.
 * @param ctx - plugin context carrying command-line and exit launcher values.
 * @param config - selected profile identity for command help.
 */
export declare function apply(ctx: Context, config?: Config): void;
//# sourceMappingURL=index.d.ts.map