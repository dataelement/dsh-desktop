/**
 * The ACP profile's command-line and stdin-lifetime provider. A successful
 * parse publishes {@link ACP_APP_STARTUP_SERVICE}; the ACP bridge waits for
 * that service, so help starts no transport.
 * @module @deepseek-ai/dsh-acp-app
 */
import type { Context } from '@deepseek-ai/cordis';
/** Stable Cordis plugin name. */
export declare const name = "acp-app-startup";
/** Launcher service required before this app can parse its invocation. */
export declare const inject: string[];
/** Service the ACP bridge row waits for before claiming stdio. */
export declare const ACP_APP_STARTUP_SERVICE = "acpAppStartup";
/**
 * Accept an ACP profile invocation, publish readiness, and bind EOF to the
 * launcher's bounded shutdown.
 * @param ctx - plugin context carrying command-line and exit launcher values.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map