/** One Host-generation model catalog shared by every Session selector. */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { ModelCatalog } from '@deepseek-ai/dsh-api-remotes/client';
import { type SnapshotStore } from '@deepseek-ai/dsh-client-store';
/** Observable lifecycle of the shared model catalog. */
export interface ModelCatalogState {
    value: ModelCatalog | null;
    status: 'idle' | 'loading' | 'ready' | 'error';
    error: string | null;
}
/** Loads at most one model catalog for the current Host generation. */
export declare class ModelCatalogDirectory {
    private readonly ctx;
    /** Current shared catalog value and load lifecycle. */
    readonly store: SnapshotStore<ModelCatalogState>;
    private generation;
    private inflight;
    /**
     * @param ctx - the providing plugin's context, whose `remote.session`
     * namespace carries the Host-generation catalog.
     */
    constructor(ctx: ClientContext);
    /**
     * Return the current generation's catalog, sharing its one in-flight load.
     * @returns the loaded global catalog.
     */
    load(): Promise<ModelCatalog>;
    /**
     * Invalidate the loaded catalog; the next explicit menu read reloads it.
     * @param clear - whether values from the previous Host generation must be hidden.
     */
    private invalidate;
    /** Invalidate and reload the catalog after a Host-side model input changes. */
    refresh(): void;
    /** Clear Host-specific values and load the replacement Host generation. */
    resetGeneration(): void;
}
//# sourceMappingURL=catalog.d.ts.map