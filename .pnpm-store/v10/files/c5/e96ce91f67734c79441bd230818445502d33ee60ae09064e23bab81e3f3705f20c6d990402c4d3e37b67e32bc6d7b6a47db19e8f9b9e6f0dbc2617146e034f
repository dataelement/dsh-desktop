/**
 * The one-shot app's command-line provider: it parses the task positional and
 * `--help`, then publishes {@link HEADLESS_STARTUP_SERVICE}. The runner is an
 * ordinary consumer whose lazy config waits for that service.
 * @module @deepseek-ai/dsh-headless/startup
 */
import type { Context } from '@deepseek-ai/cordis';
/** Stable Cordis plugin name. */
export declare const name = "headless-startup";
/** Services required before the task can be resolved. */
export declare const inject: string[];
/** Service provided by this plugin and injected by the one-shot runner. */
export declare const HEADLESS_STARTUP_SERVICE = "headlessStartup";
/** What the runner row reads from {@link HEADLESS_STARTUP_SERVICE}. */
export interface HeadlessStartupValues {
    /** The task text this invocation asked for. */
    task: string;
}
/**
 * Parse and provide the one-shot task as an ordinary Cordis service. The
 * command's action publishes the task; a missing or whitespace-only task is a
 * usage error, so on rejection (and on `--help`) nothing is provided.
 * @param ctx - plugin context carrying the command line.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=startup.d.ts.map