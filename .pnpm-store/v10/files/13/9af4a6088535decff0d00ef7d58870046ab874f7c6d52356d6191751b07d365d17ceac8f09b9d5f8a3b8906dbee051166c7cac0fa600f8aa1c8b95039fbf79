/**
 * Hero-chip controller: which preset the NEXT session gets.
 *
 * The new-session screen has no session, so a pick is staged rather than
 * applied. It reaches a session when one becomes current and is still blank —
 * whether the workspace connect created it or reused an existing blank one,
 * which is why staging cannot simply ride along on `sessions.create`.
 *
 * The stage is forgotten once applied: the next new session starts from the
 * deployment default again, matching the workspace picker beside it.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client';
import { type SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { AgentPresetOption } from './settings-store.ts';
/** Hero-chip snapshot. */
export interface AgentPresetSeatState {
    /** Presets the deployment supplies; empty means the chip renders nothing. */
    options: readonly AgentPresetOption[];
    /** The staged choice, empty until the roster loads. */
    current: string;
    /** A rejected apply's message, cleared by the next attempt. */
    error: string | null;
    busy: boolean;
    /**
     * One-shot cue that the chip should introduce itself (the creator-draft
     * entry staged the pick from another screen, so the user never touched the
     * chip); the renderer clears it via `introduced()` once played.
     */
    introduce: boolean;
}
/** Stages the next session's preset and applies it when one appears. */
export declare class AgentPresetSeatController {
    private readonly ctx;
    /** The session the hero is about to hand over to, when there is one. */
    private readonly currentSession;
    /** Chip snapshot the renderer subscribes to. */
    readonly store: SnapshotStore<AgentPresetSeatState>;
    /**
     * The deployment default, so a consumed stage can fall back to it without
     * re-reading the roster.
     */
    private fallback;
    /** Set while a pick is waiting for a session; cleared once applied. */
    private staged;
    constructor(ctx: ClientContext, 
    /** The session the hero is about to hand over to, when there is one. */
    currentSession: () => Pick<SessionSummary, 'id' | 'blank' | 'projectionValues'> | undefined);
    private set;
    /**
     * Read the roster and open the chip on the deployment default.
    * @returns once the snapshot reflects the host.
    */
    load(): Promise<void>;
    /**
     * Stage one preset for the next session, applying it immediately when a
     * blank session is already current.
     *
     * The refusal is returned as well as stored, because the two readers need
     * different things from it: the chip's own label carries the standing state,
     * while the caller that made this pick is the one that has to say why the
     * label came back — and only it knows the pick was a person's, not the
     * applier catching up with a session that just became current.
     * @param id - the preset to stage.
     * @returns the refusal text, or undefined once the pick settled.
     */
    select(id: string): Promise<string | undefined>;
    /**
     * Stage a pick WITHOUT the immediate apply, for a flow that starts the
     * receiving session after the pick (the settings section's creator entry).
     * `select()`'s immediate apply would meet the still-current running session
     * and drop the stage as unservable; staging alone leaves it for the
     * list-change applier, which fires when the started session becomes
     * current.
     * @param id - the preset to stage.
     * @param introduce - true when the stage came from another screen and the
     * chip should announce itself on the session it lands on.
     */
    stage(id: string, introduce?: boolean): void;
    /** Acknowledge the introduction cue once the chip has played it. */
    introduced(): void;
    /**
     * Hand the staged choice to the current session, if there is one to take it.
     *
     * Called both by `select()` and by whoever observes the current session
     * changing, because the session may appear either before or after the pick.
     * @returns once the switch settled, or immediately when there is nothing to do.
     */
    apply(): Promise<void>;
}
//# sourceMappingURL=seat-store.d.ts.map