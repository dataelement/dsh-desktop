/**
 * Per-package browser lifecycle: evaluate the closure, wrap `apply` in the guard
 * facade, seat a ready-made factory in the module table, and create a loader
 * entry — so dynamic packages ride the exact machinery static plugins do
 * (activation gating on inject, fiber-effect cleanup, status projection). Unload
 * = loader entry removal (fiber disposal cascades slot entries and facade
 * effects) + factory invalidation + style removal.
 *
 * The engine answers its caller: `load` resolves with what this page ended up
 * with, which is what the run orchestration reports back to the host. Loads
 * converge by Plugin Run ID against live state, not history: loading the exact
 * activation this page already runs is a no-op that still answers, another run
 * replaces it, and the same Package after a retract loads afresh. Per-Plugin
 * serialization keeps a second request from interleaving with one in flight.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Loader } from '@deepseek-ai/cordis-plugin-loader';
import type { CordisDynamicPackageId, CordisDynamicPluginId, CordisDynamicPluginRunId, SessionId } from '@deepseek-ai/dsh-api-remotes/client';
import type { ClientModuleSystem } from '@deepseek-ai/dsh-client-modules/client';
import type { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client';
/**
 * Snapshot source a surface can subscribe to (the render seam's observable
 * shape). Lives here because both this engine and the run orchestration publish
 * through it, and the orchestration already depends on this module.
 */
export interface CordisObservable<T> {
    /** Current value; the reference is stable between mutations. */
    getSnapshot(): T;
    /**
     * Observe mutations.
     * @param fn - notified after each committed change.
     * @returns unsubscribe.
     */
    subscribe(fn: () => void): () => void;
}
/** Which stage of a load failed, as the page classified it. */
export type DynamicCordisLoadErrorCause = 'evaluate' | 'module-import' | 'activate';
/** Error fields retained by the page runner and Host transport. */
export interface CordisErrorDetails {
    /** Original error message. */
    message: string;
    /** Original stack when the thrown value supplied one. */
    stack?: string;
}
/** One package's browser half as the host handed it over. */
export interface DynamicCordisClientHalf {
    /** Stable Plugin instance. */
    pluginId: CordisDynamicPluginId;
    /** Immutable Package source version. */
    packageId: CordisDynamicPackageId;
    /** Exact activation. */
    pluginRunId: CordisDynamicPluginRunId;
    /** Session the run is carried out for; a later render failure is reported under it. */
    agentId: SessionId;
    /** Label from the define call; also the plugin name. */
    name: string;
    /** Browser-half source: an async function body returning a plugin. */
    code: string;
}
/**
 * One render-time crash of a dynamic package's slot entry, as this page reports
 * it. Post-settle diagnosis only: the run it belongs to was answered long before
 * (a package that crashes while rendering loaded successfully), so this never
 * reaches a run resolution.
 */
export interface DynamicCordisRenderFailure {
    /** Slot key the crashed entry rendered under. */
    slot: string;
    /** What the author has to read to fix it: the crash text, plus a redirect when it names a withheld global. */
    message: string;
    /** Original render failure stack when available. */
    stack?: string;
    /** Whether the crash retired the entry from its cell — the package's UI is gone, not merely broken. */
    abdicated: boolean;
}
/**
 * What this page ended up with. A parked package is a success — the browser half
 * settled and waits on declared services this page has not got.
 */
export type DynamicCordisLoadResult = {
    ok: true;
    pluginRunId: CordisDynamicPluginRunId;
    waitingFor?: string[];
} | ({
    ok: false;
    cause: DynamicCordisLoadErrorCause;
    error?: unknown;
} & CordisErrorDetails);
/** Runner dependencies, resolved by the plugin entry at activation. */
export interface DynamicCordisRunnerEnv {
    /** The client root context (service reads and the guard's fiber owner). */
    ctx: Context;
    /** Client cordis Loader: dynamic packages become entries under it. */
    loader: Loader;
    /** Module table, for factory invalidation before every (re-)registration. */
    modules: ClientModuleSystem;
    /** Slot registry, for the entry-crash supervision seam. */
    slots: SlotRegistry;
    /** Route one `host.call` to the package's host half through the Remote namespace. */
    invoke(pluginId: CordisDynamicPluginId, pluginRunId: CordisDynamicPluginRunId, method: string, args: unknown): Promise<unknown>;
    /**
     * Send one render-time crash back to the session that authored the package.
     * Fire-and-forget by contract: the crash already happened, and a failed report
     * must not become a second failure.
     * @param agentId - session the crashed package was run for.
     * @param id - the crashed package.
     * @param failure - slot, teaching text, and whether the entry was retired.
     */
    reportRenderFailure(agentId: SessionId, pluginId: CordisDynamicPluginId, pluginRunId: CordisDynamicPluginRunId, failure: DynamicCordisRenderFailure): void;
    /** Send one post-activation Client guard rejection to the owning Agent. */
    reportGuardFailure(agentId: SessionId, pluginId: CordisDynamicPluginId, pluginRunId: CordisDynamicPluginRunId, failure: CordisErrorDetails): void;
}
/** One live package's contribution summary in this page. */
export interface DynamicCordisLivePackage {
    /** Stable Plugin instance. */
    pluginId: CordisDynamicPluginId;
    /** Immutable Package source version. */
    packageId: CordisDynamicPackageId;
    /** Exact activation loaded in this page. */
    pluginRunId: CordisDynamicPluginRunId;
    /** Label from the define call. */
    name: string;
    /** Slot names this package registered into here. */
    slots: string[];
    /** Live injected-style tag count. */
    styleCount: number;
}
/** The browser-side load engine for dynamic packages. */
export declare class DynamicCordisPackageRunner {
    private readonly env;
    private readonly live;
    /** Serializes load/unload per package id (a second request can outrun a slow load). */
    private readonly queues;
    private readonly changeListeners;
    /** Page-local shadowing rank. A later registration receives a lower priority. */
    private nextPriority;
    /**
     * Which package seated which component, and for whom. Component identity is the
     * only attribution key that holds:
     * - the registry stores the component verbatim, so a crashed entry carries its
     *   own way back — no parallel entry ledger to keep in step;
     * - `entry.registrant` is `options.registrant ?? fiber.name` and the facade does
     *   not strip a package-supplied one, so a package could name itself something
     *   else — attributing by it would let a package impersonate another;
     * - the assigned shadowing priority is unique but absent on chain entries (their
     *   election is deliberately left alone), so it would miss chain crashes;
     * - a package torn down between the crash and the report is still attributable,
     *   because this index does not depend on the live record.
     *
     * Two packages cannot collide here: each browser half is evaluated in its own
     * closure, so no component object reaches two of them. A collision is only
     * possible inside ONE package (the same component seated twice), where both
     * entries map to the same id and the value is identical.
     */
    private readonly owners;
    /** This page's last render crash per package: what a run surface shows on the row. */
    private readonly failures;
    private readonly unwatch;
    private snapshotCache;
    private failureCache;
    /** @param env - loader/module/slot wiring plus the two host verbs this engine uses. */
    constructor(env: DynamicCordisRunnerEnv);
    /**
     * Observe live-set changes (the run-state surface's re-render seam).
     * @param fn - notified after every converged mutation.
     * @returns unsubscribe.
     */
    subscribe(fn: () => void): () => void;
    /**
     * This page's last render crash per package, on the same notification channel as
     * the live set — a surface that already subscribed learns about a crash without
     * a second mechanism to wire.
     */
    readonly renderFailures: CordisObservable<ReadonlyMap<CordisDynamicPluginId, DynamicCordisRenderFailure>>;
    /**
     * What this page currently has loaded (stable reference between mutations, so
     * it can back a snapshot selector).
     * @returns one row per live package.
     */
    getSnapshot(): readonly DynamicCordisLivePackage[];
    /**
     * Whether this page has the browser half loaded — page-local truth, never the
     * host's "it is running".
     * @param pluginId - stable Plugin identity.
     * @returns true while one activation of the Plugin is live here.
     */
    isLoaded(pluginId: CordisDynamicPluginId): boolean;
    /**
     * Load one browser half into this page and answer what happened.
     * @param half - source for one exact Host activation.
     * @returns the outcome the run orchestration reports to the host.
     */
    load(half: DynamicCordisClientHalf): Promise<DynamicCordisLoadResult>;
    /**
     * Unload one package (`cordis/dynamic-retract`: a stop, or an undefine
     * that stops first).
     * @param pluginId - stable Plugin identity.
     * @param pluginRunId - exact activation being retracted; a newer run survives.
     */
    retract(pluginId: CordisDynamicPluginId, pluginRunId: CordisDynamicPluginRunId): void;
    /** Unload everything (plugin disposal path). */
    dispose(): Promise<void>;
    private notify;
    /** Queue one package operation behind that package's previous ones. */
    private enqueue;
    private mount;
    /**
     * Wrap the evaluated plugin so `apply` sees the guard facade; the surface
     * doubles as the module-table module. The plugin's OWN `inject` survives (the
     * object form's declaration is the facade's service gate, mirroring the host
     * sandbox reading `ctx.fiber.inject`); the function form has no declaration
     * site and therefore reaches no service.
     */
    private guardedSurface;
    /**
     * Unload one package's contributions. Takes the pieces rather than the record
     * because a load can fail before any record is seated.
     */
    private teardown;
}
/**
 * Preserve error fields for a load result without fabricating a stack.
 * @param error - original thrown value.
 * @returns its message and original string stack, when present.
 */
export declare function errorDetails(error: unknown): CordisErrorDetails;
//# sourceMappingURL=runtime.d.ts.map