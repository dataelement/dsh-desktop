/**
 * Per-session model directory: the ONE state both selection entries share.
 * The /model popup and composer seat combine one shared Host catalog with the
 * Session's durable selection projection, then submit through the same
 * selectModel call. A switch made in either entry updates this shared state.
 */
import type { ModelCatalogFailure, ModelProviderGroup, ModelSelection } from '@deepseek-ai/dsh-api-session-controller/types';
import type { SessionId } from '@deepseek-ai/dsh-api-remotes/client';
import type { TypertClientRemote } from '@deepseek-ai/dsh-typert-protocol';
import type { ObservableSnapshot, SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { ModelCatalogDirectory } from './catalog.ts';
/** Directory snapshot both entries render from. */
export interface ModelDirectoryState {
    /** Effective selection: durable next-request projection, then Host default. */
    current: ModelSelection | null;
    /**
     * Whether an adapter serves the current selection's provider, as the host reports
     * it — null before the first load, which is NOT the same as blocked. Read
     * this rather than "current matches no group": catalog membership is
     * advisory, so a route serving a model it stopped advertising is missing
     * from the groups yet perfectly usable.
     */
    routable: boolean | null;
    /** Successfully loaded provider groups (last good load). */
    groups: readonly ModelProviderGroup[];
    /** Provider-local failures from the last load; usable groups stay usable. */
    failures: readonly ModelCatalogFailure[];
    /** Lifecycle of the in-flight operation. */
    status: 'idle' | 'loading' | 'ready' | 'selecting' | 'error';
    /** Whole-request or selection failure text; null when none. */
    error: string | null;
}
/** One session's shared directory controller; disposed with the session scope. */
export declare class ModelDirectory {
    private readonly sessions;
    private readonly sessionId;
    private readonly available;
    private readonly catalog;
    private readonly projected;
    /** The shared snapshot both entries render from (uSES-safe store). */
    readonly store: SnapshotStore<ModelDirectoryState>;
    /** Latest selection operation wins; an older response never overwrites a newer one. */
    private generation;
    private disposed;
    private resolved;
    private readonly unsubscribeCatalog;
    private readonly unsubscribeSelection;
    /**
     * @param sessions - the session wire face (captured from the plugin's root connection).
     * @param sessionId - the owning session.
     * @param available - whether this session may use Agent-bound model RPCs.
     * @param catalog - Host-generation catalog shared by every Session.
     * @param projected - durable model selection projected from Session history.
     */
    constructor(sessions: Pick<TypertClientRemote['session'], 'selectModel'>, sessionId: SessionId, available: () => boolean, catalog: ModelCatalogDirectory, projected: ObservableSnapshot<unknown>);
    /**
     * Ensure the Host generation's shared advisory catalog is loaded.
     * @returns the fresh directory value.
     */
    load(): Promise<ModelDirectoryState>;
    /**
     * Select the complete provider/model/reasoning selection. The durable
     * projection frame updates the shared current; failures surface on the store
     * and throw so each entry's own retry surface engages.
     * @param selection - provider, provider-owned model id, and optional adapter-owned effort.
   */
    select(selection: ModelSelection): Promise<void>;
    /**
     * Invalidate an in-flight selection response from the previous Host generation.
     */
    resetConnected(): void;
    /** Scope teardown: late settlements lose write access to the store. */
    dispose(): void;
    private assertAvailable;
    private syncInputs;
}
//# sourceMappingURL=directory.d.ts.map