/**
 * The workspace browser's viewing store: the session-list grouping mode,
 * persisted across reloads. Module level exports the factory only (a
 * module-level handle would pin the store identity across plugin reloads);
 * register() receives the factory and the browser derives its PropsStore
 * share from the return type.
 */
import { type EngineStoreHandle } from '@deepseek-ai/dsh-client-store';
/** Browser-local order account for the hierarchy-free flat Session list. */
export declare const FLAT_SESSION_ORDER_KEY = "__flat_session_order__";
/** Session-list grouping mode: workspace sections or one flat recency list. */
export type SessionGroupBy = 'workspace' | 'flat';
/** Session order: user-arranged only, or user-arranged plus activity promotion. */
export type SessionOrderBy = 'manual' | 'updated';
/** Workspace browser viewing state persisted across surface remounts and reloads. */
type WorkspaceViewState = {
    groupBy: SessionGroupBy;
    orderBy: SessionOrderBy;
    /** Explicit zero-or-five-session state keyed by Workspace group identity. */
    groupExpansion: Record<string, boolean>;
    /** Shared editable order per Workspace group plus the browser-local flat-list account. */
    sessionOrderByAccount: Record<string, string[]>;
    /** Last observed update timestamps per order account for one-time promotion events. */
    sessionUpdatedAtByAccount: Record<string, Record<string, number>>;
};
/**
 * Annotation twin of the actions literal below (the export needs a declared
 * return type); drift fails assignability at the defineStore call.
 */
type WorkspaceViewActions = {
    setGroupBy: (draft: WorkspaceViewState, mode: SessionGroupBy) => void;
    setOrderBy: (draft: WorkspaceViewState, mode: SessionOrderBy) => void;
    setGroupExpanded: (draft: WorkspaceViewState, key: string, expanded: boolean) => void;
    retainAccountKeys: (draft: WorkspaceViewState, workspaceKeys: readonly string[]) => void;
    syncSessionOrderAccount: (draft: WorkspaceViewState, accountKey: string, order: string[], updatedAt: Record<string, number>) => void;
    setSessionOrder: (draft: WorkspaceViewState, accountKey: string, order: string[]) => void;
};
/**
 * Create the workspace browser viewing store handle.
 * @returns the store handle (spec + type + identity + factory in one).
 */
export declare function createWorkspaceViewStore(): EngineStoreHandle<WorkspaceViewState, WorkspaceViewActions>;
export {};
//# sourceMappingURL=stores.d.ts.map