/**
 * @deepseek-ai/dsh-headless — one-shot direct Agent driver. The bundle patch
 * rides over dsh-base without Host, HTTP, or browser plugins; this runner
 * creates one Agent through the core registry, drives the task to quiescence,
 * streams provider reasoning to stderr, flushes its Session, prints the final
 * assistant text to stdout, and exits.
 *
 * @module @deepseek-ai/dsh-headless
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
/** Stable Cordis plugin name. */
export declare const name = "headless-runner";
/** Core services required before the one-shot turn can start. */
export declare const inject: string[];
/** Plugin config: the task resolved from this app's injected provider service. */
export interface Config {
    /** The prompt text for the single run. */
    task: string;
}
export declare const Config: z<Config>;
/** Process-facing effects of one run: output streams plus the launcher's bounded exit request. */
interface HeadlessIo {
    stdout: {
        write(chunk: string): unknown;
    };
    stderr: {
        write(chunk: string): unknown;
    };
    /** Request process exit with `code` after the tree disposes. */
    exit(code: number): void;
}
/** The process streams the runner writes to; tests substitute captures. */
export declare const internals: {
    stdout: HeadlessIo['stdout'];
    stderr: HeadlessIo['stderr'];
};
/**
 * Mount the one-shot direct driver.
 * @param ctx - plugin context carrying core services and the launcher-provided exit request.
 * @param config - validated task config.
 */
export declare function apply(ctx: Context, config: Config): void;
export {};
//# sourceMappingURL=index.d.ts.map