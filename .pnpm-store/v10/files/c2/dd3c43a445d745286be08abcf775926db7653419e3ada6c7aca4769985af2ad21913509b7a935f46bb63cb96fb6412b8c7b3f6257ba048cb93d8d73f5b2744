import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { TokenSpan } from '@deepseek-ai/dsh-client-ui-input-trigger/client';
import type { SelectOption } from './contract.ts';
/**
 * The command token segment snapshotted at shell-open time, replayed to the
 * injected {@link PopupSelectDeps.consume} callback after a successful
 * selection. The Input side guards it: a menu-path span consumes iff draftRev
 * is unchanged, an enter-path line iff the trimmed draft still equals the
 * bare token.
 */
export type TokenSegment = {
    readonly via: 'menu';
    readonly span: TokenSpan;
} | {
    readonly via: 'enter';
    readonly token: string;
};
/**
 * Structural business spec the shell settles against — the popupSelect half
 * of CommandUiSpec, generic in the context value the opener captures (the
 * session wiring passes its session projection; the controller only carries
 * it from open() to the callbacks).
 */
export interface PopupSpec<TCtx> {
    /** Load the option rows once per open (retry after failure reuses the same signal). */
    options(context: TCtx, signal: AbortSignal): Promise<readonly SelectOption[]>;
    /** Settle the picked option against the open-time context. */
    onSelect(option: SelectOption, context: TCtx): void | Promise<void>;
}
/** Injected session-wiring callbacks of one controller (tests pass fakes). */
export interface PopupSelectDeps {
    /**
     * Consume the open-time token segment after a successful onSelect (the
     * wiring dispatches the consume-token event to the opening session).
     * @param segment - the open-time token segment snapshot.
     * @returns whether the token was consumed; false (CAS miss) is benign and
     * never retried.
     */
    consume(segment: TokenSegment): boolean;
    /** Return focus to the session composer (successful settle and Escape close paths). */
    focusComposer(): void;
}
/** Popup shell state (the shell component renders from here; closed = render null). */
export interface PopupState {
    readonly open: boolean;
    /** Command name the shell is open for (null while closed). */
    readonly command: string | null;
    /** Options-load lifecycle; 'failed' keeps the shell open for retry(). */
    readonly status: 'pending' | 'ready' | 'failed';
    /** Options as loaded — never re-fetched per keystroke; views render {@link filterOptions} over them. */
    readonly options: readonly SelectOption[];
    /** Local filter text over the loaded options. */
    readonly search: string;
    /** Highlight index into the filtered row list (0 when empty/pending). */
    readonly active: number;
    /** A select() settlement is in flight: further select/search/highlight no-op until it settles. */
    readonly submitting: boolean;
    /** Option waiting for explicit risk acknowledgement; null during normal selection. */
    readonly confirming: SelectOption | null;
    /** Caller-controlled checkbox state for the pending confirmation. */
    readonly acknowledged: boolean;
    /** Surfaced settlement failure (options load or onSelect); null when none. */
    readonly error: string | null;
}
/**
 * Filter option rows against the shell's local search text (case-insensitive
 * substring over label and detail; blank search keeps every row).
 * @param options - the loaded rows.
 * @param search - the shell's search text.
 * @returns the rows the shell shows and highlights over.
 */
export declare function filterOptions(options: readonly SelectOption[], search: string): readonly SelectOption[];
/**
 * Headless controller of one session's popupSelect shell. Late settlements
 * lose their write rights through binding identity: dismiss/dispose/reopen
 * swap the binding, so a settling options fetch or onSelect that no longer
 * matches writes nothing and consumes nothing.
 */
export declare class PopupSelectController<TCtx = unknown> {
    private readonly deps;
    /** Shell state store (the overlay component subscribes here). */
    readonly state: SnapshotStore<PopupState>;
    private binding;
    /**
     * @param deps - session-wiring callbacks (token consumption + composer focus).
     */
    constructor(deps: PopupSelectDeps);
    /**
     * Open the shell for one command: publish pending state and fetch options
     * once through the business spec. A reopen supersedes the previous shell
     * (its options fetch is aborted, its late settlements are dropped).
     * @param command - command name the shell serves.
     * @param spec - the registered popupSelect spec.
     * @param context - open-time context snapshot, handed verbatim to options/onSelect.
     * @param segment - open-time token segment snapshot for post-select consumption.
     */
    open(command: string, spec: PopupSpec<TCtx>, context: TCtx, segment: TokenSegment): void;
    /** Run the one options fetch of a binding; settlement rights die with the binding. */
    private load;
    /** Re-run a failed options fetch (search survives; no-op unless status is 'failed'). */
    retry(): void;
    /**
     * Replace the local search text (pure local filter — the provider is never
     * re-queried) and rebase the highlight onto the new filtered list.
     * @param search - the shell search input's text.
     */
    setSearch(search: string): void;
    /**
     * Move the highlight across the filtered rows (wraps around; no-op unless
     * options are ready and no selection is in flight).
     * @param dir - +1 down, -1 up.
     */
    move(dir: 1 | -1): void;
    /**
     * Set the highlight directly (pointer hover; no-op unless ready, idle, and
     * in filtered range).
     * @param index - filtered-row index.
     */
    highlight(index: number): void;
    /**
     * Select one filtered row: single-flight — the first call enters
     * `submitting` and later calls no-op until it settles. Success consumes the
     * open-time token segment (a false CAS answer is benign), closes, and
     * returns focus to the composer. Failure keeps the shell open with search,
     * highlight, and token intact, surfaces the error, and re-arms select as
     * the retry.
     * @param index - filtered-row index (callers pass the highlight or the clicked row).
     * @returns settled when the attempt has closed the shell or surfaced its failure.
     */
    select(index: number): Promise<void>;
    /**
     * Update the explicit checkbox for the currently pending risk gate.
     * @param acknowledged - whether the user has acknowledged the displayed risk.
     */
    acknowledge(acknowledged: boolean): void;
    /** Cancel only the risk gate and return to the still-open option picker. */
    cancelConfirmation(): void;
    /** Settle the gated option only after the checkbox is acknowledged. */
    confirm(): Promise<void>;
    /** Run the business settlement for an already admitted option. */
    private settle;
    /**
     * Close the shell; aborts a flying options fetch and revokes settlement
     * rights. An outside pointer interaction dismisses plainly (the click's own
     * target takes focus); Escape passes focusComposer to return focus explicitly.
     * @param opts - focusComposer: also restore composer focus (Escape path).
     */
    dismiss(opts?: {
        readonly focusComposer?: boolean;
    }): void;
    /** Scope-teardown disposer: abort in-flight work and clear state (no focus side effect). */
    dispose(): void;
}
//# sourceMappingURL=popup.d.ts.map