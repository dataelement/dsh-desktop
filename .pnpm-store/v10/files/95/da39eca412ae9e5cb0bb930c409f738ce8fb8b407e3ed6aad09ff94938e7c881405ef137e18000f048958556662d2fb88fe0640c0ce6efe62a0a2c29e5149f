import type { InputEffect, InputEvent, InputState } from '../contract/input.ts';
/** The submit-plane slice of the published InputState. */
export interface SubmitSnapshot {
    readonly phase: InputState['phase'];
    readonly claim?: InputState['claim'];
}
/** Pure phase, claim, and attempt owner for one Session input. */
export declare class SubmitMachine {
    private phase;
    private claim;
    private seq;
    private inflight;
    /** Ordinary sends detached from the editor, retained for settlement validation and cancellation. */
    private readonly detached;
    /** Read-only snapshot of the submit-plane state. */
    get state(): SubmitSnapshot;
    /**
     * Feed one event through the machine.
     * @param ev - submit-plane event.
     * @returns effects for the SessionInput shell, in execution order.
     */
    dispatch(ev: InputEvent): readonly InputEffect[];
    /** Claimed integrity watch: a draft that breaks the token prefix releases the claim. */
    private onDraftChanged;
    /** The editor applied a claim-token replacement; busy phases refuse another claim. */
    private onClaim;
    /** Mint an attempt and controller without assigning its lifecycle owner. */
    private mintAttempt;
    /** Mint the frozen command/adjudication attempt. */
    private beginAttempt;
    /** Mint an ordinary send that leaves the phase plain. */
    private beginDetached;
    /** Default-send effects capture the sink input before the editor commit. */
    private detachedEffects;
    private onEnter;
    private onAdjudicated;
    private onAdjudicationFailed;
    /** Claimed command settlement retains the frozen transaction semantics. */
    private onSubmitSettled;
    /** Settle one ordinary send independently of current phase and other detached sends. */
    private onSinkSettled;
    /** Clear after an accepted attachment-only send; it has no text suffix to retain. */
    private onSendCommitted;
    private onRelease;
}
//# sourceMappingURL=machine.d.ts.map