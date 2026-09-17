/** Session-local ownership index for Package business views on `cordis_run` cards. */
import type { SessionId } from '@deepseek-ai/dsh-api-remotes/client';
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots';
import type { CordisDynamicPackageId, CordisDynamicPluginId, CordisDynamicPluginRunId } from './events.ts';
/** Stable keyed-slot identity of one Package-owned business view. */
export type CordisToolViewKey = `${CordisDynamicPluginId}.${CordisDynamicPackageId}`;
/** One successful tool result competing to host a Package business view. */
export interface CordisRunCardPointer {
    readonly key: CordisToolViewKey;
    readonly callId: string;
    readonly seq: number;
    readonly pluginRunId: CordisDynamicPluginRunId;
}
/** Per-session observable index consumed by every mounted Run card. */
export interface CordisRunCardStore extends HostObservable<ReadonlyMap<CordisToolViewKey, CordisRunCardPointer>> {
    /** Publish one successful Run result; only a greater log sequence can replace it. */
    observe(pointer: CordisRunCardPointer): void;
}
/** Page-lifetime registry that gives all cards of one session the same Store. */
export declare class CordisRunCardRegistry {
    private readonly sessions;
    /**
     * Return the persistent page-local Store for a session.
     * @param sessionId - session whose cards share supersession state.
     * @returns the page-local Store retained for that session.
     */
    forSession(sessionId: SessionId): CordisRunCardStore;
}
/**
 * Build the Package business-view key shared by registrations and Run cards.
 * @param pluginId - stable Plugin identity.
 * @param packageId - immutable Package identity.
 * @returns the shared business-view key.
 */
export declare function cordisToolViewKey(pluginId: CordisDynamicPluginId, packageId: CordisDynamicPackageId): CordisToolViewKey;
//# sourceMappingURL=run-card-index.d.ts.map