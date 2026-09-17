/**
 * Browser-half closure evaluation: the package source runs as the body of an
 * async function whose parameters ARE the symbol surface. Shadowing parameters
 * (setTimeout/fetch/require/…) turn the ambient browser globals into teaching
 * redirects without touching the page. The host syntax-prechecked the source at
 * define time; SyntaxError handling here is the engine-divergence fallback and
 * reaches the model through the load report.
 */
import type { CordisDynamicPluginId } from '@deepseek-ai/dsh-api-remotes/client';
/** A mountable plugin as the closure must return it (FUNCTION or OBJECT form). */
export interface DynamicCordisEvaluatedPlugin {
    /** Optional plugin name; the runner overwrites it with the module id. */
    name?: string;
    /** Services the browser half declares; the runner overwrites it from the dispatched row. */
    inject?: string[];
    /** Plugin body receiving the guard facade. */
    apply: (ctx: unknown, config?: unknown) => unknown;
}
/** What the evaluator needs from the runner to build one package's closure. */
export interface DynamicCordisClosureEnv {
    /** Route `host.call` to this package's host half over the wire. */
    invoke(method: string, args: unknown): Promise<unknown>;
    /** Mirror one runtime error text into the load report (console.error copies). */
    noteError(message: string): void;
}
/**
 * Where each withheld browser global sends the author instead. One home for two
 * consumers: the closure traps below throw these, and a render crash whose
 * message names one of them gets the same redirect appended — a package that
 * reached the global some other way (`window.setInterval`) crashes with the
 * engine's own bare text, and the author needs the redirect either way.
 */
export declare const DYNAMIC_CLIENT_REDIRECTS: Readonly<Record<string, string>>;
/** Per-package style-tag bookkeeping behind the `styles.insert` symbol. */
export declare class DynamicCordisStyles {
    private readonly pluginId;
    private readonly tags;
    /** @param pluginId - owning Plugin ID, stamped as `data-dyn` on every tag. */
    constructor(pluginId: CordisDynamicPluginId);
    /**
     * Inject one stylesheet, removed automatically on package unload.
     * @param css - raw CSS text.
     * @returns disposer removing this one tag early.
     */
    insert(css: string): () => void;
    /** Live tag count (load-report contribution summary). */
    get count(): number;
    /** Remove every tag this package still owns (unload path). */
    dispose(): void;
}
/**
 * Narrow a closure return value to a mountable plugin (host guard mirror).
 * @param value - whatever the closure returned.
 * @returns whether the value is mountable.
 */
export declare function isDynamicCordisPlugin(value: unknown): value is DynamicCordisEvaluatedPlugin | ((ctx: unknown) => unknown);
/**
 * Evaluate one package's browser half and return the (un-guarded) plugin.
 * @param pluginId - stable Plugin ID (console tag and style ownership).
 * @param clientCode - the browser half's source: an async function body returning a plugin.
 * @param env - runner wiring for `host.call` and error mirroring.
 * @param styles - the package's style bookkeeping (owned by the caller so unload can dispose it).
 * @returns the plugin the closure returned.
 * @throws teaching errors for syntax failures and non-plugin returns.
 */
export declare function evaluateClientHalf(pluginId: CordisDynamicPluginId, clientCode: string, env: DynamicCordisClosureEnv, styles: DynamicCordisStyles): Promise<DynamicCordisEvaluatedPlugin | ((ctx: unknown) => unknown)>;
//# sourceMappingURL=evaluator.d.ts.map