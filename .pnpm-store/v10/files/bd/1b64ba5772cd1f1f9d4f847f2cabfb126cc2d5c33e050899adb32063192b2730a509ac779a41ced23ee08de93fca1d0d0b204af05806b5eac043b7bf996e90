/** Session Controller adapter for React selector hooks and Slot scope data. */
import { Service, type Context } from '@deepseek-ai/cordis';
import type { ISessions, SessionBinding, SessionListState, SessionSnapshot, UseProjection } from '@deepseek-ai/dsh-api-session-controller/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { HostObservable, KeyedStandardSource, MaybeSnapshotSelectorHook, SlotScopeAdapter, SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots';
/** Selector hook over the Session Controller list and current selection. */
export type UseSessions = SnapshotSelectorHook<SessionListState>;
/** Selector hook over one Session's lifecycle and control state. */
export type SessionSnapshotSelector = SnapshotSelectorHook<SessionSnapshot>;
/** Public name for the Session lifecycle selector hook. */
export type UseSession = SessionSnapshotSelector;
/** Common identity carried by every Session-scoped pending interaction. */
export interface SessionPendingInteractionBase {
    /** Opaque request identity; a replacement request must use a new key. */
    readonly key: string;
    /** Domain-owned presentation discriminator. */
    readonly kind: string;
    /** Session whose UI can answer this interaction. */
    readonly sessionId: SessionId;
}
/** Declaration-merged roster of domain-owned pending interaction values. */
export interface SessionPendingInteractionMap {
}
/** Every pending interaction contributed by the assembled Client. */
export type SessionPendingInteraction = [
    keyof SessionPendingInteractionMap
] extends [never] ? SessionPendingInteractionBase : SessionPendingInteractionMap[keyof SessionPendingInteractionMap];
/** Current effective pending interaction by Session. */
export type SessionPendingInteractionSnapshot = ReadonlyMap<SessionId, SessionPendingInteraction>;
/** Selector hook over Session-scoped pending interactions. */
export type UseSessionPendingInteraction = SnapshotSelectorHook<SessionPendingInteractionSnapshot>;
/** Publish one pending interaction and define how plugin teardown delegates it. */
export type PendingInteractionPublisher<T extends SessionPendingInteractionBase> = (interaction: T, delegate: () => Promise<void>) => () => void;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface GlobalStandardProps {
        /** Session list and current selection. */
        useSessions: UseSessions;
        /** Pending user interaction presented by a Session-scoped UI consumer. */
        useSessionPendingInteraction: UseSessionPendingInteraction;
    }
    interface SessionStandardProps {
        /** Current Session lifecycle and control state. */
        useSession: SessionSnapshotSelector;
        /** Current Session identity. */
        sessionId: SessionId;
        /** Host-computed projection values addressed by projection key. */
        useProjection: UseProjection;
    }
    interface SessionMaybeStandardProps {
        /** Current Session state, absent while no Session is selected. */
        useSession: MaybeSnapshotSelectorHook<SessionSnapshot>;
        /** Current Session identity, absent while no Session is selected. */
        sessionId: SessionId | undefined;
        /** Host-computed projection values; every key is absent without a Session. */
        useProjection: UseProjection;
    }
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Session Controller adapter and session-scoped source registry. */
        uiSession: UiSession;
    }
}
type SessionSourceRoster = readonly string[] | undefined;
type SessionSourceRecord<Roster extends SessionSourceRoster, Value> = Roster extends readonly string[] ? Readonly<Record<Roster[number], Value>> : never;
/** Bare values produced by one Session-scoped source contribution. */
export interface SessionSourceContribution<Hooks extends SessionSourceRoster = SessionSourceRoster, KeyedHooks extends SessionSourceRoster = SessionSourceRoster, Props extends SessionSourceRoster = SessionSourceRoster> {
    readonly hooks?: SessionSourceRecord<Hooks, HostObservable<unknown>>;
    readonly keyedHooks?: SessionSourceRecord<KeyedHooks, KeyedStandardSource>;
    readonly props?: SessionSourceRecord<Props, unknown>;
}
/** Static roster and per-Session resolver for one standard-props contribution. */
export interface SessionSourceDescriptor<Hooks extends SessionSourceRoster = SessionSourceRoster, KeyedHooks extends SessionSourceRoster = SessionSourceRoster, Props extends SessionSourceRoster = SessionSourceRoster> {
    readonly hooks?: Hooks;
    readonly keyedHooks?: KeyedHooks;
    readonly props?: Props;
    /**
     * Resolve every declared member for one Session binding.
     * @param binding - Controller-owned Session binding.
     * @returns all declared bare sources and stable props.
     */
    resolve(binding: SessionBinding): SessionSourceContribution<NoInfer<Hooks>, NoInfer<KeyedHooks>, NoInfer<Props>>;
}
/** Session-scoped source roster and renderer adapter. */
export declare class UiSession extends Service {
    private readonly sessions;
    private readonly descriptors;
    private bindings;
    private absent;
    private currentBinding;
    private readonly currentListeners;
    private readonly pendingDomains;
    private pendingSnapshot;
    private readonly pendingListeners;
    /** Root source of pending UI interactions, independent from Controller snapshots. */
    readonly pendingInteractions: HostObservable<SessionPendingInteractionSnapshot>;
    /** Renderer-facing adapter for `session` and `session-maybe` scopes. */
    readonly adapter: SlotScopeAdapter;
    /**
     * @param ctx - Client root context.
     * @param sessions - Controller-owned Session object layer.
     */
    constructor(ctx: Context, sessions: ISessions);
    /**
     * Register one Session-scoped standard-source contribution.
     * @param descriptor - static member roster and per-binding resolver.
     * @returns disposer owned by the caller's Cordis fiber.
     */
    provide<const Hooks extends SessionSourceRoster = undefined, const KeyedHooks extends SessionSourceRoster = undefined, const Props extends SessionSourceRoster = undefined>(descriptor: SessionSourceDescriptor<Hooks, KeyedHooks, Props>): () => void;
    /**
     * Register one pending-interaction domain and return its publication function.
     * Domain teardown first removes its visible values, then delegates and awaits
     * every still-active owner request.
     * @param precedence - deterministic cross-domain precedence; larger values win.
     * @returns a function that publishes one interaction and its teardown delegation.
     */
    registerPendingInteraction<T extends SessionPendingInteractionBase>(precedence: (interaction: T) => number): PendingInteractionPublisher<T>;
    private rebuildBindings;
    private resolve;
    private resolveCurrent;
    private publishCurrent;
    private publishPendingInteractions;
    private createMaterializedBinding;
    private materialize;
    private materializeAbsent;
}
/** Required Controller and renderer services. */
export declare const inject: string[];
/**
 * Install the Session root source and scoped adapter.
 * @param ctx - Client Cordis context.
 */
export declare function apply(ctx: Context): void;
export {};
//# sourceMappingURL=index.d.ts.map