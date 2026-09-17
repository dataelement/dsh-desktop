/**
 * Host transport for the settings-namespace scope contract. This file owns the
 * per-namespace derivation over the shared {@link SettingsDescribeMirror} and
 * the serialized write path. Reads never touch the wire here: the
 * mirror is the one `settings.describe` reader, and every scope is a selector
 * over its snapshot.
 */
import { Service } from '@deepseek-ai/cordis';
import type { Context } from '@deepseek-ai/cordis';
import type { SettingsPathOpView } from '@deepseek-ai/dsh-api-remotes/client';
import type { SettingsSchemaService } from './schema.ts';
import type { SettingsScope, SettingsScopeSnapshot, SettingsScopeSpec } from './settings-contract.ts';
import { SettingsDescribeMirror, type SettingsDescribeFace } from './settings-mirror.ts';
/**
 * One namespace's derived view over the shared describe mirror, plus that
 * namespace's serialized Host writes. Writes carry the latest known namespace
 * revision, fold their answers back into the mirror, and teardown waits for
 * the operation already crossing the wire.
 */
export declare class SettingsScopeController<T> implements SettingsScope<T> {
    private readonly ctx;
    private readonly spec;
    private readonly mirror;
    private readonly persistence;
    private readonly schema;
    private readonly store;
    private tail;
    private writeGeneration;
    private disposed;
    private readonly unsubscribe;
    /**
     * Revision answered by a superseded write still ahead of the mirror: the
     * mirror only folds the LATEST settlement in, so a queued successor takes
     * its fence from here first.
     */
    private pendingRevision;
    /**
     * @param ctx - the providing plugin's context, whose `remote.settings`
     * namespace carries this scope's writes (reads ride the mirror).
     * @param spec - namespace identity and optional narrowing decoder.
     * @param mirror - the shared describe mirror this scope derives from.
     * @param persistence - client-selected Host persistence; non-loopback pages may remain process-local.
     * @param schema - settings-owned schema operations.
     */
    constructor(ctx: Context, spec: SettingsScopeSpec<T>, mirror: SettingsDescribeMirror, persistence: 'host' | 'memory', schema: SettingsSchemaService);
    /** @returns the current sync snapshot (stable reference until the next change). */
    getSnapshot(): SettingsScopeSnapshot<T>;
    /**
     * Observe snapshot replacements.
     * @param listener - invoked after each snapshot change.
     * @returns the disposer removing this listener.
     */
    subscribe(listener: () => void): () => void;
    /**
     * Queue one field write; see {@link SettingsScope.set} for the ordering,
     * revision, and recovery contract.
     * @param field - scalar field inside the namespace section.
     * @param value - JSON-shaped value selected by the user.
     * @returns settlement after the write and any latest-write recovery read.
     */
    set(field: string, value: unknown): Promise<void>;
    /**
     * Queue one field clear; see {@link SettingsScope.unset} for the ordering,
     * revision, and recovery contract.
     * @param field - scalar field inside the namespace section.
     * @returns settlement after the clear and any latest-write recovery read.
     */
    unset(field: string): Promise<void>;
    /**
     * Queue one atomic namespace mutation; see {@link SettingsScope.mutate}.
     * @param ops - ordered field operations copied when queued.
     * @param expectedRevision - optional fixed revision read by the domain editor.
     * @returns settlement after the mutation and any latest-write recovery read.
     */
    mutate(ops: readonly SettingsPathOpView[], expectedRevision?: number): Promise<void>;
    /** Reload Host state for the latest failed write; superseded failures leave recovery to it. */
    private recover;
    /**
     * Stop queued operations, stop deriving, and wait for the current wire call
     * to settle.
     * @returns settlement after the controller reaches quiescence.
     */
    dispose(): Promise<void>;
    private enqueue;
    private derive;
    private decode;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        settingsScope: SettingsScopeBinder;
    }
}
/**
 * The settings domain's base service. Features that own a preference reach the
 * settings transport through this service rather than a shared function: the
 * client bundle purity gate forbids cross-plugin value imports and directs
 * cross-plugin collaboration through cordis services
 * (`packages/client/tsdown.client.ts`).
 */
export declare class SettingsScopeBinder extends Service {
    private readonly mirror;
    private readonly schema;
    private readonly persistence;
    /**
     * The PROVIDING fiber, kept because a Service reads `ctx` as its *consumer's*
     * fiber: letting a bound scope write through the caller's context would make
     * every caller declare `remote.settings` in its own `inject`.
     */
    private readonly owner;
    /**
     * @param ctx - the providing plugin's context.
     * @param config - the shared describe mirror every bound scope derives from,
     * the settings-owned schema operations, and the Host persistence the provider
     * resolved from `remote.$host`.
     */
    constructor(ctx: Context, config: {
        mirror: SettingsDescribeMirror;
        schema: SettingsSchemaService;
        persistence: 'host' | 'memory';
    });
    /**
     * The shared mirror's read/fold face for cross-namespace surfaces (schema
     * introspection, the served-namespace directory). Per-namespace consumers
     * use {@link bind}; both derive from the same snapshot, so they can never
     * disagree about the document.
     * @returns the describe face over the shared mirror.
     */
    describe(): SettingsDescribeFace;
    /**
     * Bind one namespace scope on the CALLER's plugin lifecycle — the service
     * proxy binds `this.ctx` to the caller at call time, so the scope's disposer
     * belongs to the calling fiber. The scope derives from the shared mirror
     * (whose invalidation subscriptions live with the providing plugin), so
     * binding adds no wire read of its own and activation never blocks on the
     * settings transport.
     * @param spec - domain-owned namespace contract.
     * @returns the bound scope consumed by the domain's services and rows.
     */
    bind<T>(spec: SettingsScopeSpec<T>): SettingsScope<T>;
}
//# sourceMappingURL=settings-scope.d.ts.map