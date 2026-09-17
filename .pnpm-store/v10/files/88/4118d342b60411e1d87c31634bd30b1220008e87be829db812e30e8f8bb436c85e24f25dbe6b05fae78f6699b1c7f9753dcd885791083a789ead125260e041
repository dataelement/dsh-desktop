/**
 * Dynamic Cordis Plugin service: immutable package definitions, one active run
 * per Plugin, human-approved Client activation, and Host/Client invocation.
 * @module @deepseek-ai/dsh-cordis-host-runner
 */
import { Context } from '@deepseek-ai/cordis';
import type { Fiber } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { JsonValue } from '@deepseek-ai/dsh-util-values';
import type { DynamicCordisDefineReceipt, DynamicCordisDefineRequest, DynamicCordisPackageInspection, DynamicCordisPluginInspection, DynamicCordisReference } from './registry.ts';
import type { ApprovalRequestId, CordisDynamicPackageId, CordisDynamicPluginId, CordisDynamicPluginRunId, CordisErrorDetails, CordisDynamicRunMode, CordisInspectProviderManifest, CordisInspectQueryResolution, CordisInspectRequestId, CordisInspectResolveAck, DynamicCordisClientSource, DynamicCordisHostHalfResult, DynamicCordisInventoryRow, DynamicCordisInvokeResult, DynamicCordisRenderFailure, DynamicCordisResolveAck, DynamicCordisRunAttempt, DynamicCordisRunResolution, DynamicCordisRunResponse, DynamicCordisStopResponse, DynamicCordisUndefineReceipt } from './types.ts';
export type * from './types.ts';
export type { DynamicCordisDefineReceipt, DynamicCordisDefineRequest, DynamicCordisDefinition, DynamicCordisHandler, DynamicCordisPackageInspection, DynamicCordisPlugin, DynamicCordisPluginInspection, DynamicCordisReference, DynamicCordisRun, } from './registry.ts';
export { CordisInspectRegistryService } from './inspect-registry.ts';
export type { HostCordisInspectProviderRegistration } from './inspect-registry.ts';
export { HOST_BUILTIN_INSPECTION } from './sandbox.ts';
/**
 * Brand a Host-minted Plugin ID.
 * @param id - opaque identifier minted by the Host registry.
 * @returns the branded Plugin identifier.
 */
export declare function CordisDynamicPluginId(id: string): CordisDynamicPluginId;
/**
 * Brand a Host-minted Package ID.
 * @param id - opaque identifier minted by the Host registry.
 * @returns the branded Package identifier.
 */
export declare function CordisDynamicPackageId(id: string): CordisDynamicPackageId;
/**
 * Brand a Host-minted Plugin Run ID.
 * @param id - opaque identifier minted by the Host registry.
 * @returns the branded Plugin Run identifier.
 */
export declare function CordisDynamicPluginRunId(id: string): CordisDynamicPluginRunId;
/**
 * Brand a Host-minted approval request ID.
 * @param id - opaque identifier minted by the Host registry.
 * @returns the branded approval request identifier.
 */
export declare function ApprovalRequestId(id: string): ApprovalRequestId;
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Process-local dynamic Plugin registry and lifecycle service. */
        dynamicCordisRunner: DynamicCordisRunnerService;
    }
}
/** Runner configuration. */
export interface Config {
    /** Maximum synchronous VM evaluation time in milliseconds. */
    vmTimeoutMs?: number;
}
/** Host-only snapshot consumed by inspect and tool result rendering. */
export interface DynamicCordisSnapshotRow {
    pluginId: CordisDynamicPluginId;
    currentPackageId?: CordisDynamicPackageId;
    nextPackageId?: CordisDynamicPackageId;
    packages: Array<{
        packageId: CordisDynamicPackageId;
        name: string;
        purpose: string;
        hasHostHalf: boolean;
        hasClientHalf: boolean;
    }>;
    activeRun?: {
        pluginRunId: CordisDynamicPluginRunId;
        packageId: CordisDynamicPackageId;
        fiber?: Fiber;
        handlers: string[];
        renderFailure?: DynamicCordisRenderFailure;
    };
    latestRun?: DynamicCordisRunAttempt;
}
/** Dynamic Plugin registry and Host-half lifecycle. */
export declare class DynamicCordisRunnerService extends TypertRemoteService {
    static inject: string[];
    static Config: z<Config>;
    private readonly rootCtx;
    private readonly registry;
    private readonly inspectRegistry;
    private readonly starting;
    private readonly resolved;
    private group;
    /** Create the service under the Host composition. */
    constructor(ctx: Context, config: Config);
    /**
     * Define a new Plugin's first Package or append a Package to an existing Plugin.
     * @param request - Session ownership, Plugin selection, metadata, and source code.
     * @returns Host-minted Plugin and Package identities with declared-half metadata.
     */
    define(request: DynamicCordisDefineRequest): DynamicCordisDefineReceipt;
    /**
     * Remove a Plugin, its active run, and all immutable Packages.
     * @param agent - Agent whose Session must own the Plugin.
     * @param pluginId - Stable Plugin identity to remove.
     * @returns Whether removal succeeded and whether it stopped an active run.
     */
    undefine(agent: Agent, pluginId: CordisDynamicPluginId): Promise<DynamicCordisUndefineReceipt>;
    /**
     * Remove a Plugin from the user panel and queue the resulting state change for the model's next step.
     * @param agent - Agent whose Session owns the Plugin and receives the context.
     * @param pluginId - Stable Plugin identity to remove.
     * @returns Whether removal succeeded and whether it stopped an active run.
     */
    undefineFromPanel(agent: Agent, pluginId: CordisDynamicPluginId): Promise<DynamicCordisUndefineReceipt>;
    /**
     * Start or update one Package for a model tool call. An unauthorized Client
     * Package waits for approval; Plugin-wide authorization covers later versions.
     * @param agent - Agent whose Session must own the Plugin.
     * @param pluginId - Stable Plugin identity to activate.
     * @param packageId - Immutable Package version to activate.
     * @param mode - Whether to run the current version or switch versions.
     * @param signal - Tool-call cancellation signal while the activation request is being created.
     * @returns The successful activation identity or an actionable refusal.
     */
    run(agent: Agent, pluginId: CordisDynamicPluginId, packageId: CordisDynamicPackageId, mode: CordisDynamicRunMode, signal?: AbortSignal): Promise<DynamicCordisRunResponse>;
    /**
     * Start Host code for an approved request or a direct panel gesture.
     * @param agent - Agent whose Session must own the Plugin.
     * @param pluginId - Stable Plugin identity to activate.
     * @param packageId - Immutable Package version to activate.
     * @param mode - Whether to run the current version or switch versions.
     * @param requestId - Model-driven request identity, or null for a direct user gesture.
     * @param approveFutureVersions - Whether this approval covers later Packages of the same Plugin.
     * @returns The exact Host activation or a failure message.
     */
    runHostHalf(agent: Agent, pluginId: CordisDynamicPluginId, packageId: CordisDynamicPackageId, mode: CordisDynamicRunMode, requestId: ApprovalRequestId | null, approveFutureVersions: boolean): Promise<DynamicCordisHostHalfResult>;
    /**
     * Fetch Client code for the exact active run.
     * @param agent - Agent whose Session must own the Plugin.
     * @param pluginId - Stable Plugin identity to read.
     * @param pluginRunId - Exact active run authorized to receive source.
     * @returns Client source and its Plugin, Package, and run identities.
     */
    getClientCode(agent: Agent, pluginId: CordisDynamicPluginId, pluginRunId: CordisDynamicPluginRunId): DynamicCordisClientSource;
    /**
     * Resolve one model-driven Client activation request.
     * @param requestId - Request identity to settle once.
     * @param resolution - Browser refusal or exact Client activation result.
     * @returns Whether the still-pending request accepted this resolution.
     */
    resolveRequestRun(requestId: ApprovalRequestId, resolution: DynamicCordisRunResolution): Promise<DynamicCordisResolveAck>;
    /**
     * Settle a direct panel run after this page loaded or failed its Client half.
     * @param agent - Agent whose Session must own the Plugin.
     * @param pluginId - Stable Plugin identity being settled.
     * @param resolution - Exact Client activation result from the acting page.
     * @returns The committed activation or its failure.
     */
    settleUserRun(agent: Agent, pluginId: CordisDynamicPluginId, resolution: DynamicCordisRunResolution): Promise<DynamicCordisRunResponse>;
    /**
     * Stop the active run while retaining every Package version.
     * @param agent - Agent whose Session must own the Plugin.
     * @param pluginId - Stable Plugin identity to stop.
     * @returns Success or the reason no run was stopped.
     */
    stop(agent: Agent, pluginId: CordisDynamicPluginId): Promise<DynamicCordisStopResponse>;
    /**
     * Stop a Plugin from the user panel and queue the resulting state change for the model's next step.
     * @param agent - Agent whose Session owns the Plugin and receives the context.
     * @param pluginId - Stable Plugin identity to stop.
     * @returns Success or the reason no run was stopped.
     */
    stopFromPanel(agent: Agent, pluginId: CordisDynamicPluginId): Promise<DynamicCordisStopResponse>;
    /**
     * Replace the Host mirror of the Client inspect provider directory.
     * @param providers - complete Client provider manifest.
     * @returns null after accepting the manifest.
     */
    syncInspectManifest(providers: readonly CordisInspectProviderManifest[]): null;
    /**
     * Claim one pending Client inspect query with its live result.
     * @param agent - Session that owns the query.
     * @param requestId - exact pending query identity.
     * @param resolution - provider result or structured refusal.
     * @returns whether this answer won the query.
     */
    resolveInspectQuery(agent: Agent, requestId: CordisInspectRequestId, resolution: CordisInspectQueryResolution): CordisInspectResolveAck;
    /**
     * Frame-wide inventory, grouped as one row per stable Plugin.
     * @returns Source-free metadata for every process-local Plugin.
     */
    inventory(): DynamicCordisInventoryRow[];
    /**
     * Read one Session's Host-rich state for inspection and result rendering.
     * @param agent - Agent whose Session selects visible Plugins.
     * @returns Plugin versions, active runs, Host fibers, and render failures.
     */
    snapshot(agent: Agent): DynamicCordisSnapshotRow[];
    /**
     * Read source-free context for an explicit `@pluginId` user gesture.
     * @param agent - Agent whose Session must own the Plugin.
     * @param pluginId - Stable Plugin identity referenced by the user.
     * @returns The preferred modification base, or undefined when unavailable.
     */
    reference(agent: Agent, pluginId: CordisDynamicPluginId): DynamicCordisReference | undefined;
    /**
     * List source-free Plugin summaries owned by one Session.
     * @param agent - Agent whose Session selects visible Plugins.
     * @returns one summary per Plugin in creation order.
     */
    listPlugins(agent: Agent): DynamicCordisPluginInspection[];
    /**
     * Inspect one Plugin without returning Package source.
     * @param agent - Agent whose Session must own the Plugin.
     * @param pluginId - stable Plugin identity.
     * @returns version pointers, latest run, and all Package summaries.
     */
    inspectPlugin(agent: Agent, pluginId: CordisDynamicPluginId): DynamicCordisPluginInspection;
    /**
     * Read one exact immutable Package and its Host and Client source.
     * @param agent - Agent whose Session must own the Plugin.
     * @param pluginId - Stable Plugin identity that owns the Package.
     * @param packageId - Exact immutable Package identity to inspect.
     * @returns Package metadata, source, and the Plugin's lifecycle pointers.
     */
    inspectPackage(agent: Agent, pluginId: CordisDynamicPluginId, packageId: CordisDynamicPackageId): DynamicCordisPackageInspection;
    /**
     * Record a post-load render failure for the exact active run.
     * @param agent - Agent whose Session must own the Plugin.
     * @param pluginId - Stable Plugin identity that rendered.
     * @param pluginRunId - Exact active run that produced the failure.
     * @param failure - Slot, message, and entry-retirement result.
     * @returns Null after recording or ignoring a stale report.
     */
    reportRenderFailure(agent: Agent, pluginId: CordisDynamicPluginId, pluginRunId: CordisDynamicPluginRunId, failure: DynamicCordisRenderFailure): Promise<null>;
    /**
     * Report a Client guard rejection that happened after the Package completed activation.
     * @param agent - Agent whose Session must own the Plugin.
     * @param pluginId - Stable Plugin identity whose Client code was rejected.
     * @param pluginRunId - Exact active run that produced the rejection.
     * @param failure - Original guard message and stack.
     * @returns Null after reporting or ignoring a stale/startup failure.
     */
    reportClientGuardFailure(agent: Agent, pluginId: CordisDynamicPluginId, pluginRunId: CordisDynamicPluginRunId, failure: CordisErrorDetails): Promise<null>;
    /**
     * Invoke an active Host method while rejecting stale Client runs.
     * @param pluginId - Stable Plugin identity that owns the method.
     * @param pluginRunId - Exact active run authorizing the call.
     * @param method - Registered Host handler name.
     * @param args - JSON argument delivered to the handler.
     * @returns The JSON result or a typed invocation failure.
     */
    invoke(pluginId: CordisDynamicPluginId, pluginRunId: CordisDynamicPluginRunId, method: string, args: JsonValue): Promise<DynamicCordisInvokeResult>;
    private resolvePlan;
    private activate;
    private startFresh;
    private startHost;
    private settleActivation;
    private commitActivation;
    private runResponse;
    private announceResolved;
    private steerRunOutcome;
    private steerRenderFailure;
    private steerHostHandlerFailure;
    private steerGuardFailure;
    private claimRuntimeFailure;
    private injectUserRunOutcome;
    private injectUserContext;
    private cancelPending;
    private createAttempt;
    private failAttempt;
    private diagnostic;
    private retract;
    private owned;
    private requireGroup;
}
export default DynamicCordisRunnerService;
//# sourceMappingURL=index.d.ts.map