/**
 * SlotRegistry: the renderer-owned Cordis service over the pure
 * SlotCore (ui-slots owns registration semantics, the declaration ledger,
 * the load-time validations, and the unload cascade). This layer owns what
 * needs a live application: the 'slots/changed' event bridge, register and
 * declaration injection through the caller's ctx.effect (fiber unload
 * collects both), the renderer installation contract (install()/renderSlot('root') +
 * the SlotRendererHost face), and the store INSTANCE axis — handle x scope
 * key -> create/cache, dropped with the last holding entry, session instances
 * cleared (with persisted state) on scope death.
 */
import { Service } from '@deepseek-ai/cordis';
import type { Context } from '@deepseek-ai/cordis';
import { SlotCore } from '@deepseek-ai/dsh-client-ui-slots';
import type { LiveSlotNode, LocaleFace, OwnerOf, SlotMap, SlotRenderer, RootStandardSourceContribution, ScopedStandardSourceBinding, SlotScope, SlotScopeAdapter, SlotSpec, StoredEntry } from '@deepseek-ai/dsh-client-ui-slots';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface SlotMap {
        /**
         * The built-in render-tree root hole (seeded by SlotCore): the one slot the
         * shell itself renders, and the ancestor of every other seat. OCCUPIED by
         * ui-layout's AppFrame, which declares the sidebar, conversation, details,
         * and shell.overlay seats inside it.
         *
         * DO NOT register here. This is a single slot, so a second entry does not
         * sit beside the frame — it shadows it, and a dynamically registered entry
         * is assigned a lower priority than the shipped one, which makes it the
         * winner: the page would render your component alone, with every seat the
         * frame declares gone. For a surface of your own that floats over the whole
         * app, register into `shell.overlay` instead (a list slot: additive, and
         * click-through until your entry opts into pointer events).
         */
        'root': {
            kind: 'single';
            scope: 'root';
            owner: RootOwnerProps;
        };
    }
}
/** Root owner share: the shell supplies nothing — the frame is inject-assembled. */
export interface RootOwnerProps {
    children?: never;
}
/** One synchronous effect installed while an injected slot declaration is live. */
type SlotInjectionEffect = (() => void) | Iterable<() => void, void, void>;
/** cordis Service layer of the slot system; see the module doc for the split with SlotCore. */
export declare class SlotRegistry extends Service {
    private readonly _core;
    /** Store-instance axis: handle -> mounted scope, refcount, resolved instances. */
    private readonly _stores;
    /** Latest live Context generation for each scoped store key. */
    private readonly _storeScopeOwners;
    private _renderer;
    private _locale;
    private _host;
    private readonly _rootContributions;
    private readonly _rootListeners;
    private _rootBinding;
    private readonly _rootSource;
    private readonly _scopes;
    private _scopeRevision;
    private readonly _scopeListeners;
    private readonly _scopeRevisionSource;
    /**
     * @param ctx - owning root context.
     */
    constructor(ctx: Context);
    /**
     * The single registration API. The typed face IS the core's register
     * (both overloads reused verbatim — one authority, no structural copy;
     * see SlotCore.register for children declaration, store seat, inject
     * face, load-time validation, and the unload cascade). This layer adds:
     * disposal through the caller's ctx.effect (fiber unload = cascade),
     * exclusive-factory minting (`store: createXxxStore` becomes a per-entry
     * handle), the registrant diagnostics stamp, and store-instance lifecycle
     * on the entry axis.
     *
     * Declared here, implemented by prototype assignment below the class: it
     * MUST stay a prototype method (never an instance arrow) — the cordis
     * service proxy binds `this.ctx` to the CALLER's context at call time,
     * which is what routes the effect (and the unload cascade) into the
     * caller's fiber. An arrow property would freeze `this` to the service's
     * own root ctx and silently break per-plugin disposal.
     */
    readonly register: SlotCore['register'];
    /**
     * Install an effect for each declaration lifetime of a slot. The callback
     * runs synchronously when the declaration already exists; otherwise it runs
     * inside the declaring `register()` call after the declaration is committed.
     * Collapse disposes the effect and a later declaration runs it again.
     * Callback effects are synchronous disposers; iterable effects install
     * transactionally and dispose in reverse order. The controller belongs to
     * the caller's fiber, so plugin unload cancels a pending wait and removes any
     * active contribution.
     *
     * @param key - declared SlotMap key to depend on.
     * @param callback - creates one disposer or an iterable of disposers.
     * @returns idempotent disposer for the wait and active effect.
     * @throws callback setup failures synchronously when the slot is already declared.
     */
    inject(key: keyof SlotMap & string, callback: () => SlotInjectionEffect): () => void;
    /**
     * Install the shell's renderer (ui-renderer's createSlotRenderer product).
     * Boot-once: a second install throws. Runs through the caller's ctx.effect,
     * so shell fiber unload uninstalls the renderer.
     * @param renderer - the outlet machinery implementing SlotRenderer.
     */
    install(renderer: SlotRenderer): void;
    /**
     * Install the locale face backing the `t` standard seat (the locale
     * plugin's product; same boot-once discipline as the renderer install).
     * Runs through the caller's ctx.effect, so the installing fiber's unload
     * uninstalls the face.
     * @param face - namespace binder + revision observable.
     */
    installLocale(face: LocaleFace): void;
    /**
     * Contribute domain-owned root data. Hook names must be globally unique;
     * registration and disposal republish one atomic root binding.
     * @param contribution - bare sources and stable props.
     * @returns disposer owned by the caller's Cordis fiber.
     */
    provideRoot(contribution: RootStandardSourceContribution): () => void;
    /**
     * Install the owner adapter for one strict scope. Its optional counterpart
     * resolves through the same adapter.
     * @param scope - strict scope name.
     * @param adapter - current/resolved binding source and release notifications.
     */
    installScope(scope: Exclude<SlotScope, 'root' | 'session-maybe'>, adapter: SlotScopeAdapter): void;
    /**
     * Bind all scoped Store handles to one owner Context lifetime. The cleanup
     * materializes an otherwise-unused handle before clearing it, because a
     * previous application run may have persisted state for a Slot that this
     * scope never rendered. Rebinding the same key transfers cleanup ownership
     * to the newest Context generation.
     *
     * @param binding - materialized scope identity and its owning Context.
     */
    bindStoreScope(binding: Pick<ScopedStandardSourceBinding, 'key' | 'ctx'>): void;
    /**
     * The single ctx-level render entry: the shell renders 'root'; every other
     * key renders inside components through the props renderSlot face. All
     * three guards are fail-loud boot-order checks, no fallback.
     * @param key - must be 'root' (runtime-enforced for dynamically composed callers).
     * @param owner - owner share for the root entry (the shell supplies {}).
     * @returns the rendered root tree.
     */
    renderSlot<K extends keyof SlotMap & string>(key: K, owner: OwnerOf<K>): ReturnType<SlotRenderer['renderRoot']>;
    /**
     * Snapshot entries for a key (render-erased view; stable reference between mutations).
     * @param key - SlotMap key.
     * @returns registered entries.
     */
    entries(key: keyof SlotMap & string): readonly StoredEntry[];
    /**
     * Shadowing winners per cell for a key: the first live (non-abdicated)
     * entry of each cell in priority order — what outlets render; chain keys
     * pass through unchanged (election consumes every entry). The raw
     * {@link SlotsService.entries} view stays the inspection surface. Fresh
     * array per call, not a uSES getSnapshot source.
     * @param key - SlotMap key.
     * @returns the winning entry per occupied cell.
     */
    entriesOfSlot(key: keyof SlotMap & string): readonly StoredEntry[];
    /**
     * Export the current JSON-safe Slot declaration tree for read-only inspection.
     * @param root - exact live Slot root; omitted returns all roots.
     * @returns selected Slot trees.
     */
    snapshot(root?: string): LiveSlotNode[];
    /**
     * Observe entry boundary crashes (every render-time entry failure the
     * boundaries contain, abdicating or not) — the supervision seam for
     * plugins mirroring contribution health. Fires synchronously per report,
     * after the registry mutated for abdicating crashes. Callers own the
     * disposer (wire it through ctx.effect for fiber-lifetime cleanup, as with
     * {@link SlotsService.subscribe}).
     * @param fn - called with the slot key, the crashed entry, the crash
     * cause, and `abdicated`: whether the crash retired the entry from its cell.
     * @returns unsubscribe.
     */
    onEntryError(fn: (key: string, entry: StoredEntry, error: unknown, info: {
        abdicated: boolean;
    }) => void): () => void;
    /**
     * Look up a declared spec (register-declared or the built-in 'root').
     * @param key - SlotMap key.
     * @returns spec or undefined.
     */
    spec<K extends keyof SlotMap & string>(key: K): SlotSpec<SlotMap[K]> | undefined;
    /**
     * Subscribe to a key's registration changes (microtask-batched).
     * @param key - SlotMap key.
     * @param fn - change callback.
     * @returns unsubscribe.
     */
    subscribe(key: keyof SlotMap & string, fn: () => void): () => void;
    /**
     * Version counter for uSES pairing.
     * @param key - SlotMap key.
     * @returns current version.
     */
    getVersion(key: keyof SlotMap & string): number;
    /** Delegating registration path: factory minting + registrant stamp + core write + instance-axis bookkeeping. */
    private _register;
    /** Build the domain-neutral host face once; installed adapters remain live through getters. */
    private hostFace;
    /** Validate and atomically publish the current root contribution roster. */
    private rebuildRootBinding;
    /** Publish one installed-scope roster transition after the map is authoritative. */
    private publishScopeRevision;
    /** Resolve (create or reuse) the store instance for a registered handle under a scope key. */
    private resolveStore;
    /** Clear every live non-root Store handle for one dead scope key. */
    private clearStoreScope;
    /** Bind (or re-reference) a handle on the axis; cross-scope conflicts already threw in the core. */
    private _acquire;
    /** Drop one reference; the last holder's unload drops the record (instances go with it — engine stores need no explicit dispose). */
    private _release;
}
export {};
//# sourceMappingURL=registry.d.ts.map