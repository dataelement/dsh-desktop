/**
 * Client mirror of the Host settings document: the one `settings.describe`
 * reader in the browser. Every settings consumer derives from this store —
 * per-namespace scopes through `SettingsScopeBinder.bind`, cross-namespace
 * surfaces through the binder's shared describe face — so startup cost and
 * freshness are properties of this class, not of how many features own a
 * preference. The Host stays the fact source: the mirror re-reads on the
 * invalidations its owning plugin subscribes to and folds write answers in
 * through {@link SettingsDescribeMirror.acceptView}.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { SettingsNamespaceView } from '@deepseek-ai/dsh-api-remotes/client';
/** The full `settings.describe` answer the mirror serves. */
export interface SettingsDescribeView {
    /** Every namespace a live Host plugin registered, as the Host reported it. */
    namespaces: readonly SettingsNamespaceView[];
    /** Whether the settings provider accepts writes. */
    writable: boolean;
    /** Whether a native settings document exists for the Host to open. */
    hasDocument: boolean;
}
/** Mirror state every derived settings surface renders from. */
export interface SettingsMirrorSnapshot {
    /**
     * `unavailable` is the terminal non-loopback state; `ready` persists across
     * later failed refreshes (the held view keeps serving); `idle` means no
     * answer is held and no read is running, so `ensure` will start one.
     */
    status: 'idle' | 'loading' | 'ready' | 'unavailable';
    /** The last good answer; undefined until the first success. */
    view: SettingsDescribeView | undefined;
    /** The latest refresh failure message, cleared by the next success. */
    error: string | null;
}
/**
 * The mirror as cross-namespace surfaces consume it: current answer,
 * subscription, first-use read, and the write-answer fold. `load` stays off
 * this face — invalidation refreshes belong to the mirror's owning plugin.
 */
export interface SettingsDescribeFace {
    /** @returns the current sync snapshot (stable reference until the next change). */
    getSnapshot(): SettingsMirrorSnapshot;
    /**
     * Observe snapshot replacements.
     * @param listener - invoked after each snapshot change.
     * @returns the disposer removing this listener.
     */
    subscribe(listener: () => void): () => void;
    /**
     * Resolve once an answer is held (or the mirror is terminally unavailable),
     * reading only from `idle`.
     * @returns settlement of the current or newly started read, if any.
     */
    ensure(): Promise<void>;
    /**
     * Fold one write answer's namespace view into the held view without a wire
     * read, invalidating any older read still in flight.
     * @param view - the namespace view a settings write answered with.
     */
    acceptView(view: SettingsNamespaceView): void;
}
/**
 * Serializes every Host `settings.describe` read behind one snapshot store.
 * Concurrent {@link load} calls fold into the in-flight read plus one rerun,
 * so an invalidation arriving mid-read is never lost and never duplicated.
 */
export declare class SettingsDescribeMirror implements SettingsDescribeFace {
    private readonly ctx;
    private readonly persistence;
    private readonly store;
    private inFlight;
    private rerun;
    private generation;
    /**
     * @param ctx - the providing plugin's context, whose `remote.settings`
     * namespace answers the describe read.
     * @param persistence - client-selected Host persistence; non-loopback pages may remain process-local.
     */
    constructor(ctx: ClientContext, persistence?: 'host' | 'memory');
    /** @returns the current sync snapshot (stable reference until the next change). */
    getSnapshot(): SettingsMirrorSnapshot;
    /**
     * Observe snapshot replacements.
     * @param listener - invoked after each snapshot change.
     * @returns the disposer removing this listener.
     */
    subscribe(listener: () => void): () => void;
    /**
     * Refresh from the Host. A call during an in-flight read marks one rerun
     * after it settles instead of racing a second wire read.
     * @returns settlement after this call's freshness is reflected.
     */
    load(): Promise<void>;
    /**
     * Resolve once an answer is held (or the mirror is terminally unavailable),
     * reading only from `idle`. The cheap idempotent entry for surfaces that
     * render on first use.
     * @returns settlement of the current or newly started read, if any.
     */
    ensure(): Promise<void>;
    /**
     * Fold one write answer's namespace view into the held view without a wire
     * read, and invalidate any read still in flight. With no held document, the
     * answer is not published as a partial document; an in-flight read reruns so
     * it cannot publish a document fetched before the write committed.
     * @param view - the namespace view a settings write answered with.
     */
    acceptView(view: SettingsNamespaceView): void;
    /**
     * Convenience row lookup on the held view.
     * @param ns - namespace identity.
     * @returns the namespace view, or undefined while unanswered or unregistered.
     */
    namespace(ns: string): SettingsNamespaceView | undefined;
    private run;
    private shouldRerun;
}
//# sourceMappingURL=settings-mirror.d.ts.map