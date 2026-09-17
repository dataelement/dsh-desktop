/**
 * Dynamic-package runner, browser half: the load engine that turns one browser
 * half's source into a live cordis plugin (closure → guard → module table →
 * loader entry, ./runtime.ts), plus the retract announcement that unloads it.
 *
 * Nothing loads on activation: this page holds no dynamic package until a
 * dispatch arrives, and a dispatch only follows a model `cordis_run` or a user
 * pressing a card's start control. A refresh therefore starts clean by design —
 * host process memory still holds the definition, the page simply does not run
 * it until asked again.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { ApprovalRequestId, CordisDynamicPluginId, DynamicCordisInventoryRow } from '@deepseek-ai/dsh-api-remotes/client';
import type { DynamicCordisLivePackage } from './runtime.ts';
import type { CordisRunActivity, CordisRunFailure, CordisUserRunRequest } from './orchestrator.ts';
import type { CordisObservable, DynamicCordisRenderFailure } from './runtime.ts';
export { CordisRunOrchestrator } from './orchestrator.ts';
export { ClientCordisInspectRegistry } from './inspect-registry.ts';
export type { ClientCordisInspectHost, ClientCordisInspectProviderRegistration, ClientCordisInspectQueryContext, } from './inspect-registry.ts';
export type { CordisRunActivity, CordisRunFailure, CordisRunHostSeam, CordisRunOrchestratorEnv, CordisRunRequest, CordisUserRunRequest, } from './orchestrator.ts';
export { DynamicCordisPackageRunner } from './runtime.ts';
export type { CordisObservable, DynamicCordisClientHalf, DynamicCordisLivePackage, DynamicCordisLoadErrorCause, DynamicCordisLoadResult, DynamicCordisRenderFailure, DynamicCordisRunnerEnv, } from './runtime.ts';
export { DynamicCordisStyles, evaluateClientHalf, isDynamicCordisPlugin } from './evaluator.ts';
export type { DynamicCordisClosureEnv, DynamicCordisEvaluatedPlugin } from './evaluator.ts';
export { dynamicCordisContext } from './guard.ts';
export type { DynamicCordisGuardEnv, DynamicCordisSlotLedgerRow } from './guard.ts';
export { ClientTimerService } from './timer.ts';
export type { ApprovalRequestId, CordisDynamicPackageId, CordisDynamicPluginId, CordisDynamicPluginRunId, DynamicCordisPackage, } from '@deepseek-ai/dsh-api-remotes/client';
/**
 * What a run surface reads and calls. The activity map is the single home of
 * "a run is in flight", so an affordance never keeps its own copy — that is what
 * makes it survive a remount.
 */
export interface CordisRunnerFace {
    /** Each definition's in-flight run activity. */
    readonly activeRuns: CordisObservable<ReadonlyMap<CordisDynamicPluginId, CordisRunActivity>>;
    /** The last failure of this page's own run attempt, per definition. */
    readonly lastRunError: CordisObservable<ReadonlyMap<CordisDynamicPluginId, CordisRunFailure>>;
    /**
     * This page's last render crash per definition: a browser half that loaded
     * cleanly and then broke while React rendered it. Page-local and current by
     * construction — cleared when the package stops, is retracted, or loads again —
     * which is what makes it safe for a row to render directly. The host keeps its
     * own last-across-pages copy for the model; the two have different owners and
     * lifetimes and neither is derived from the other.
     */
    readonly renderFailures: CordisObservable<ReadonlyMap<CordisDynamicPluginId, DynamicCordisRenderFailure>>;
    /**
     * Restore pending approvals after a page reconnect or missed event.
     * @param rows - current dynamic Plugin inventory.
     */
    reconcileApprovals(rows: readonly DynamicCordisInventoryRow[]): void;
    /**
     * Answer one run request with "run it" and drive both halves.
     * @param requestId - the request being answered; unknown or settled ids are a no-op.
     * @param approveFutureVersions - whether this decision covers later Packages of the same Plugin.
     * @returns after the orchestration settled.
     */
    approve(requestId: ApprovalRequestId, approveFutureVersions: boolean): Promise<void>;
    /**
     * Answer one run request with "do not run it".
     * @param requestId - the request being answered; unknown or settled ids are a no-op.
     * @returns after the refusal reached the host.
     */
    decline(requestId: ApprovalRequestId): Promise<void>;
    /**
     * Run a definition here at the user's own request (the gesture authorizes it).
     * A definition with a browser half also loads onto this page; a host-only one
     * only comes up in the host process.
     * @param request - the definition to run, its session, and whether it has a browser half.
     * @returns after the orchestration settled.
     */
    startUserRun(request: CordisUserRunRequest): Promise<void>;
    /**
     * Observe what this page has loaded.
     * @param fn - notified after every converged load or unload.
     * @returns unsubscribe.
     */
    subscribe(fn: () => void): () => void;
    /**
     * Read what this page currently has loaded.
     * @returns immutable rows for live Client halves.
     */
    getSnapshot(): readonly DynamicCordisLivePackage[];
    /**
     * Whether this page loaded a definition's browser half — page-local truth,
     * never the host's "it is running".
     * @param pluginId - stable Plugin identity.
     * @returns true while a load is live here.
     */
    isLoaded(pluginId: CordisDynamicPluginId): boolean;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Run orchestration and page-local load state: what run surfaces read and call. */
        dynamicCordisRunner: CordisRunnerFace;
    }
}
/** Stable Cordis plugin name. */
export declare const name = "cordis-client-runner";
/**
 * Required services: the loader/module chain for entries, the slot registry for
 * contributions, and the `dynamicCordisRunner` Remote namespace. Declaring the
 * namespace parks this plugin until the host side exists, so a page never loads
 * a browser half whose host half it could not reach.
 */
export declare const inject: string[];
/**
 * Client plugin body: build the runner and subscribe the dispatch family.
 * @param ctx - client root context.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map