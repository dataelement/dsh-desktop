/**
 * Host half of open-in-app: three routes on the composition's `webServer`
 * serving the resolved application catalog, per-application icons, and the
 * launch endpoint the browser split button
 * (`@deepseek-ai/dsh-client-ui-open-in-app`) posts to.
 *
 * Security has one home, here. Every route asks the composition's
 * `connection` service for a rejection first (`requestRejection`): its
 * Host/Origin fence defeats DNS rebinding and cross-site calls, and its
 * browser authentication (the login-token cookie) gates every caller before
 * any resolution result, icon, or launch is reachable. On top of that fence
 * the open route validates its body at the wire: an `application/json` media
 * type, a 64 KiB ceiling, string `app`/`path` fields, a resolved-available
 * catalog id, and an absolute path naming an existing directory.
 *
 * The catalog resolves lazily, once per plugin life, on the first request
 * that needs it, into one map of verified launchers: the apps route serves
 * its keys and the open route launches its values, so a click, menu open, or
 * page reload never re-runs detection. A launch that finds its executable
 * gone (`ENOENT`) invalidates that one entry and re-resolves it once.
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export type * from './shared.ts';
/** Cordis function-plugin name. */
export declare const name = "open-in-app";
/** The route carrier, the trust fence guarding every route, and the PATH resolver. */
export declare const inject: string[];
/** Open-in-app host configuration. */
export interface Config {
    /**
     * Per-command deadline in milliseconds for catalog-resolution host
     * commands (`xcode-select`, the Windows registry reads).
     */
    readonly probeTimeoutMs: number;
    /**
     * Per-command deadline in milliseconds for icon-extraction host commands
     * (`plutil`/`sips` on macOS, the PowerShell extraction on Windows).
     */
    readonly iconTimeoutMs: number;
    /**
     * Early-failure watch window per launch, in milliseconds: a launcher still
     * running when the window closes counts as launched and keeps running, so
     * this bounds how long the open route holds a successful launch, not how
     * long an application may live.
     */
    readonly launchWatchMs: number;
}
export declare const Config: z<Config>;
/** Register the apps, icon, and open routes behind the connection trust fence. */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map