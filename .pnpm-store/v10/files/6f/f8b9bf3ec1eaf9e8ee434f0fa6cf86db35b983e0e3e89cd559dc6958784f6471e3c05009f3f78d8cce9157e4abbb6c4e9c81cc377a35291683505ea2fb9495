/**
 * Page-side run orchestration for model approvals and direct panel gestures.
 * Host activation always precedes Client loading. The same Plugin-keyed state
 * drives every surface, so remounting a panel never loses an open approval or
 * an in-flight transition.
 */
import type { ApprovalRequestId, CordisDynamicPackageId, CordisDynamicPluginId, CordisDynamicPluginRunId, CordisDynamicRunMode, DynamicCordisClientSource, DynamicCordisHostHalfResult, DynamicCordisInventoryRow, DynamicCordisResolveAck, DynamicCordisRunResolution, DynamicCordisRunResponse, SessionId } from '@deepseek-ai/dsh-api-remotes/client';
import type { CordisObservable, DynamicCordisPackageRunner } from './runtime.ts';
/** One Plugin's in-flight approval or activation. */
export type CordisRunActivity = {
    phase: 'awaiting-approval';
    requestId: ApprovalRequestId;
    agentId: SessionId;
    packageId: CordisDynamicPackageId;
    mode: CordisDynamicRunMode;
    name: string;
    purpose: string;
} | {
    phase: 'orchestrating';
    agentId: SessionId;
    packageId: CordisDynamicPackageId;
    mode: CordisDynamicRunMode;
};
/** Why this page's latest activation attempt failed. */
export interface CordisRunFailure {
    /** Package the attempt targeted. */
    packageId: CordisDynamicPackageId;
    /** Which half or settlement stage failed. */
    reason: 'host-half-failed' | 'client-half-failed';
    /** Actionable failure text. */
    message: string;
    /** Original failure stack when available. */
    stack?: string;
}
/** Host operations consumed by the orchestrator after transport folding. */
export interface CordisRunHostSeam {
    /** Start a new Host activation or attach this page to an existing one. */
    runHostHalf(agentId: SessionId, pluginId: CordisDynamicPluginId, packageId: CordisDynamicPackageId, mode: CordisDynamicRunMode, requestId: ApprovalRequestId | null, approveFutureVersions: boolean): Promise<DynamicCordisHostHalfResult>;
    /** Fetch Client source for one exact active run. */
    getClientCode(agentId: SessionId, pluginId: CordisDynamicPluginId, pluginRunId: CordisDynamicPluginRunId): Promise<DynamicCordisClientSource>;
    /** Settle a model-driven approval. */
    resolveRequestRun(requestId: ApprovalRequestId, resolution: DynamicCordisRunResolution): Promise<DynamicCordisResolveAck>;
    /** Settle a direct panel activation after this page handles its Client half. */
    settleUserRun(agentId: SessionId, pluginId: CordisDynamicPluginId, resolution: DynamicCordisRunResolution): Promise<DynamicCordisRunResponse>;
}
/** Dependencies of one page's orchestrator. */
export interface CordisRunOrchestratorEnv {
    /** Page-local Client loader. */
    runner: DynamicCordisPackageRunner;
    /** Folded Host RPC operations. */
    host: CordisRunHostSeam;
}
/** Forwarded approval request fields used by this page. */
export interface CordisRunRequest {
    requestId: ApprovalRequestId;
    agentId: SessionId;
    pluginId: CordisDynamicPluginId;
    packageId: CordisDynamicPackageId;
    mode: CordisDynamicRunMode;
    name: string;
    purpose: string;
    requiresApproval: boolean;
}
/** Direct panel activation request. */
export interface CordisUserRunRequest {
    agentId: SessionId;
    pluginId: CordisDynamicPluginId;
    packageId: CordisDynamicPackageId;
    mode: CordisDynamicRunMode;
    /** Host-only Packages finish without a Client load or settlement call. */
    hasClientHalf: boolean;
}
/** Drives Host → Client activation and publishes Plugin-keyed activity. */
export declare class CordisRunOrchestrator {
    private readonly env;
    private readonly requests;
    private readonly activity;
    private readonly failures;
    private readonly inFlight;
    private readonly listeners;
    private activityCache;
    private failureCache;
    /** @param env - Client loader and folded Host operations. */
    constructor(env: CordisRunOrchestratorEnv);
    /** Open approvals and current activation attempts, keyed by stable Plugin ID. */
    readonly activeRuns: CordisObservable<ReadonlyMap<CordisDynamicPluginId, CordisRunActivity>>;
    /** Latest page-side activation failure for each Plugin. */
    readonly lastRunError: CordisObservable<ReadonlyMap<CordisDynamicPluginId, CordisRunFailure>>;
    /**
     * Register a Client activation request, starting it immediately when the Plugin is already authorized.
     * @param request - forwarded approval and activation metadata.
     */
    open(request: CordisRunRequest): void;
    /**
     * Rebuild pending approvals and automatic Client activations from an authoritative Host inventory read.
     * @param rows - complete process-wide Plugin inventory.
     */
    reconcileApprovals(rows: readonly DynamicCordisInventoryRow[]): void;
    /**
     * Close an approval settled by another page or by cancellation.
     * @param requestId - approval request that can no longer be answered here.
     */
    close(requestId: ApprovalRequestId): void;
    /**
     * Approve and execute one still-open model request.
     * @param requestId - approval request to execute.
     * @param approveFutureVersions - whether this approval covers later Packages for the same Plugin.
     */
    approve(requestId: ApprovalRequestId, approveFutureVersions: boolean): Promise<void>;
    /**
     * Reject one still-open model request without executing either half.
     * @param requestId - approval request to reject.
     */
    decline(requestId: ApprovalRequestId): Promise<void>;
    /**
     * Execute a direct panel run; the user gesture itself authorizes it.
     * @param request - exact Package activation selected by the user.
     */
    startUserRun(request: CordisUserRunRequest): Promise<void>;
    private observe;
    private commit;
    private orchestrate;
    private drive;
    private startHost;
    private finishClientFailure;
    private settleDirect;
    private answer;
    private fail;
}
//# sourceMappingURL=orchestrator.d.ts.map