/**
 * SessionInput shell: owns the per-session Lexical editor (text + chip
 * truth) and the pure SubmitMachine (phase/claim/attempt), and choreographs
 * everything between them — projections and InputState publication, the
 * scoped-event application verbs, the submit transaction plumbing
 * (adjudicate via the session's InputTriggerController; claim.submit; default
 * sink), the notice channel, and the draft persistence mirror.
 * Package-private; the hub alone constructs it and wires the scoped event
 * listeners onto it.
 */
import type { Context } from '@deepseek-ai/cordis';
import { type ObservableSnapshot, type SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { LexicalEditor } from 'lexical';
import type { ArbitrateKey, ArbitrateOutcome, CommandClaim, ConsumeTokenRequest, DraftAttachmentId, InputActions, InputNotice, InputState, InputTriggerController, QueuedMessage, ReferenceInsert, SessionInput, SubmitAttachment, SubmitOutcome, TokenSpan } from '../contract/input.ts';
import type { InputSubmitMode } from '../contract/composer-submission.ts';
/** Popup face the shell needs (dismissal only; typed structurally to avoid a value import). */
export interface PopupDismissFace {
    dismiss(): void;
}
/**
 * Construction dependencies of one facade. The slash/popup faces are THUNKS: the
 * shell is created inside the sessions provide materialization (before the
 * scope record is queryable), where `slash.sessionOf`/`command.popupFor`
 * cannot resolve yet — resolution defers to first interactive use.
 */
export interface SessionInputDeps {
    /** Session-scope ctx handed to claim.submit transactions. */
    actx: Context;
    /** Enter adjudication face resolver; absent/undefined answer = every '/' line falls to the default sink. */
    inputTriggers?: (() => InputTriggerController | undefined) | undefined;
    /** PopupSelect shell face resolver (dismissal on submit lock / escape). */
    popup?: (() => PopupDismissFace | undefined) | undefined;
    /** Queue read face; overlaid onto InputState.queue (absent = empty). */
    queue?: ObservableSnapshot<readonly QueuedMessage[]> | undefined;
    /**
     * Steer every still-pending queued message into the running turn, in FIFO
     * order (the empty-draft accelerated-Enter gesture); absent = unsupported.
     */
    steerQueue?: (() => void) | undefined;
    /** The plain-message sink (send choreography / materialize fork — the hub owns it). */
    defaultSink(text: string, attachmentIds: readonly DraftAttachmentId[], mode: InputSubmitMode, signal: AbortSignal): Promise<SubmitOutcome>;
    /** Command-plane attachment plumbing (the hub owns the conversation face and the copy). */
    commandAttachments: {
        /** Resolve ordered draft ids to wire payloads without sending them; rejects when an id no longer resolves. */
        serialize(ids: readonly DraftAttachmentId[]): Promise<readonly SubmitAttachment[]>;
        /** Free consumed draft attachments after a successful command submit. */
        release(ids: readonly DraftAttachmentId[]): void;
        /** Localized composer notice for a claimed command that does not accept attachments. */
        unsupportedNotice(token: string): string;
    };
}
/**
 * The per-session input facade: scoped-event application verbs +
 * setDraft/submit + the published InputState store, over a shell-owned
 * Lexical editor.
 */
export declare class SessionInputShell implements SessionInput {
    private readonly deps;
    /** Published editor projection + submit-plane state + queue overlay (the InputZone currency source). */
    readonly state: SnapshotStore<InputState>;
    /** Latest surfaced notice (null after clear); the bar renders errors as banners and information inline. */
    readonly notices: SnapshotStore<InputNotice | null>;
    /** The shell-owned editor (text + chip truth); the composer binds its contenteditable to it. */
    readonly editor: LexicalEditor;
    /** The public provide-channel action face (one stable identity per session). */
    readonly actions: InputActions;
    private readonly core;
    private projection;
    private rev;
    /** Stable occurrence ids per chip NodeKey (undo restores keys, so ids survive it too). */
    private readonly occurrenceIds;
    private occurrenceSeq;
    private readonly unregister;
    private noticeSeq;
    private lastMirroredDraft;
    private attachmentIds;
    private disposed;
    /** Draft persistence mirror (Conversation store write; receives the clipboard projection). */
    private mirrorFn;
    /** Live lexicon subscription disposer; undefined until the controller resolves. */
    private lexiconOff;
    /** Default sends retained until admission settles or scope disposal releases their attachments. */
    private readonly detachedDrafts;
    /** Failed default sends waiting to be restored together in submission order. */
    private readonly failedDetached;
    /** Revision of the last automatic failure restoration. */
    private failedRestoreRev;
    private restoringFailures;
    private attachmentFlightSeq;
    /** Attachment-only sends retained until admission settles or scope disposal releases their attachments. */
    private readonly attachmentFlights;
    constructor(deps: SessionInputDeps);
    /**
     * Run one editor edit whose result is observable on return. At the top
     * level this is a discrete update. Inside this editor's own update —
     * command handlers land here synchronously (space/enter picks, paste) —
     * $-functions are already legal, and wrapping them in update() would DEFER
     * them past the synchronous bail answer (and a nested discrete throws);
     * the body runs directly and the outer update commits it.
     * @param fn - the $-edit body.
     */
    private applyEdit;
    /**
     * Subscribe the text-ref re-scan to the controller's lexicon once the
     * controller resolves. The deps thunk cannot resolve at construction (the
     * shell is created inside the sessions provide materialization), so the
     * first interactive updates retry until it can.
     */
    private ensureLexiconSubscription;
    /** Re-project, run the claim watch, publish, and feed trigger tracking after every editor commit. */
    private onEditorUpdate;
    private occurrenceIdOf;
    /**
     * Replace the whole draft (persisted-draft seed and programmatic writes).
     * Placeholder-sanitized; newlines split paragraphs; the caret lands at the
     * end. Merged into history so a seed is not an undoable step of its own.
     * @param text - the full next draft.
     */
    setDraft(text: string): void;
    /** Append ordered attachment ids unless an admission transaction is locked. */
    addAttachments(ids: readonly DraftAttachmentId[]): boolean;
    /**
     * Remove one attachment id from this draft. Busy admission phases refuse, like
     * {@link addAttachments}: a removal landing while a command submit serializes
     * would otherwise vanish from the rail yet still ride the in-flight send.
     */
    removeAttachment(id: DraftAttachmentId): boolean;
    /**
     * Keep only ids that still resolve in the browser attachment registry.
     * @param available - live registry ids.
     */
    pruneAttachments(available: readonly DraftAttachmentId[]): void;
    /**
     * Clear the draft as a successful-send commit: the editor empties (no undo
     * unit) and the undo history is cut, so Ctrl/Cmd-Z cannot resurrect sent
     * content (the command path gets the same discipline from submit-settled).
     * @param attachmentIds - admitted attachment ids to remove from this draft.
     */
    commitSend(attachmentIds: readonly DraftAttachmentId[]): void;
    /**
     * Insert pasted plain text over the current editor selection
     * (placeholder-sanitized). The paste event's own default is suppressed by
     * the caller; PASTE_TAG makes the paste its own history boundary, so one
     * undo never removes both the paste and typing inside the merge window.
     * @param text - pasted plain text.
     */
    paste(text: string): void;
    /**
     * Enter adjudication + submit transaction + default sink. Effects fan out
     * from the machine; this method only feeds the event. Lock entry
     * (adjudicating/submitting) force-closes the transient layers: the popup
     * dismisses and the menu tracks frozen.
     */
    submit(mode?: InputSubmitMode): void;
    /**
     * Keyboard arbitration while the menu is open.
     * @param key - the intercepted key.
     * @param composing - IME composition guard state.
     * @returns the menu's verdict; 'pass' when no pipeline is mounted.
     */
    arbitrate(key: ArbitrateKey, composing: boolean): ArbitrateOutcome;
    /**
     * Steer every still-pending queued message into the running turn (the
     * empty-draft accelerated-Enter gesture). Execution belongs to the hub's
     * queue choreography; absent dep = the gesture falls back to the machine's
     * empty-draft no-op.
     */
    steerQueue(): void;
    /**
     * Space adjudication over the controller's hot state.
     * @returns true = a claim/insert was applied — the caller preventDefaults.
     */
    space(): boolean;
    /** Dismiss the popupSelect shell (any interaction outside the box). */
    dismissPopup(): void;
    /**
     * The live selection as a detect-coordinate span (menu-launcher synthetic
     * hits replace it on pick); an absent selection answers a collapsed span at
     * the document end.
     * @returns the ordered [start, end) span in detect coordinates.
     */
    caretSpan(): {
        start: number;
        end: number;
    };
    /**
     * Hot plain-text reference lexicon source for the decoration scan:
     * delegates to the controller's aggregated store. Stable
     * identity per shell; without a pipeline the snapshot is the empty Map and
     * subscribers never fire.
     */
    readonly lexicon: ObservableSnapshot<ReadonlyMap<'/' | '@', readonly string[]>>;
    /**
     * Apply one command claim (scoped begin-command event listener body): the
     * editor replaces [0, span.end) with the claim token, then the machine
     * enters claimed.
     * @param claim - the command claim from the pick path.
     * @param span - pick-time span snapshot (detect coordinates).
     * @returns whether the edit applied (phase, span CAS, and leading guard passed).
     */
    beginCommand(claim: CommandClaim, span: TokenSpan): boolean;
    /**
     * Apply one reference insertion (scoped insert-reference event listener
     * body): the editor replaces the span with one chip node, followed by a
     * separating space unless one is already next.
     * @param ref - the reference insertion from the pick path.
     * @param span - pick-time span snapshot (detect coordinates).
     * @returns whether the edit applied.
     */
    insertReference(ref: ReferenceInsert, span: TokenSpan): boolean;
    /**
     * Consume one command token after business success (scoped consume-token
     * event listener body). Span guard: revision CAS then splice; bare-token
     * guard: trimmed-draft equality then clear.
     * @param guard - exact span or bare-token guard.
     * @returns whether the token was consumed.
     */
    consumeToken(guard: ConsumeTokenRequest['guard']): boolean;
    /**
     * Insert plain reference text over the pick-time span (scoped insert-text
     * event listener body; the plain-text reference path). The editor gains
     * ordinary characters — no chip node; the chip look is a scan-derived
     * decoration, never state.
     * @param text - the plain reference text to splice in (e.g. `/name `).
     * @param span - pick-time span snapshot (detect coordinates).
     * @param keepCompleting - contract passenger; completion re-opening is
     * automatic here (the update listener re-tracks at the settled caret, so an
     * open token — a directory pick's trailing slash — reopens the menu without
     * an explicit re-track).
     * @returns whether the text was applied.
     */
    insertText(text: string, span: TokenSpan, keepCompleting?: boolean): boolean;
    /**
     * Surface a notice from outside the machine (detached command results).
     * @param level - severity tier.
     * @param text - notice body.
     */
    notify(level: 'info' | 'error', text: string): void;
    /**
     * Teardown the shell and return every browser-owned attachment still retained by
     * the draft or an unsettled default send.
     * @returns attachment ids the scope disposer must release.
     */
    dispose(): readonly DraftAttachmentId[];
    /** Read the live input state (guard derivation reads here). */
    get snapshot(): InputState;
    /**
     * Bind the draft persistence mirror (Conversation store write). Adopt-on-bind: the
     * store draft may hold a persisted value from a previous mount; the caller
     * seeds it via setDraft BEFORE binding, and afterwards every editor-adopted
     * draft mirrors out.
     * @param write - store draft write.
     * @returns the unbind disposer.
     */
    bindMirror(write: (text: string) => void): () => void;
    /** The claim token the decoration transform styles; null while unclaimed. */
    private activeClaimToken;
    /** Dispatch + execute, refreshing the claim decoration when the styled token flips. */
    private dispatchRun;
    private run;
    private execute;
    /**
     * Execute the commit-draft effect: clear the committed content (retaining
     * a pure typed-during-flight suffix when the snapshot allows) and cut the
     * undo history so sent content cannot resurrect.
     */
    private commitDraft;
    /**
     * Prompt serialization before the sink: expand each chip occurrence to its
     * owner's model form via the session controller's codec routing. Owner
     * missing or serialization failure rejects the detached send and restores
     * its editor snapshot. Chip-free drafts skip the async detour.
     */
    private sinkSerialized;
    /** Settle one detached default send independently of other sends. */
    private settleSink;
    /** Restore one failed detached send without overwriting text entered after a restoration. */
    private settleDetachedFailure;
    /** Rebuild all currently failed snapshots in submission order. */
    private restoreFailedDrafts;
    /** Return failed-send attachments to the head of the rail; release happens only after success. */
    private restoreAttachments;
    /** Enter adjudication: poll the session controller; failure = notice + draft retained (never a silent downgrade). */
    private adjudicate;
    /**
     * The submit transaction: claim.submit against the session scope; ok maps
     * from the outcome kind. An accepting claim receives the serialized draft
     * attachments, which are cleared and released only on a success outcome; a
     * failure (serialize, transport, or handler error) keeps draft and attachments
     * for correction.
     */
    private beginSubmit;
    /** Late-settlement guard: superseded attempts and disposed facades drop silently. */
    private dead;
    private compose;
    private publish;
}
//# sourceMappingURL=facade.d.ts.map