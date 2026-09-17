/**
 * Opt-in request-preparation tmux-location context. Eligible step attempts
 * append durable, source-attributed context naming the tmux session, window,
 * and pane this agent process runs in, plus the window's pane-tree layout.
 *
 * The plugin pulls state once per turn, for the first request (`step === 1`), by
 * running one `tmux display-message` through the `ctx.shell` executor service. It
 * confirms this process genuinely runs inside the pane `$TMUX_PANE` names by
 * matching the pane's `#{pane_tty}` against this process's controlling terminal,
 * so a terminal that merely inherited `$TMUX`/`$TMUX_PANE` from a tmux ancestor
 * (e.g. a VS Code integrated terminal) reads as "not in tmux". It re-injects
 * only when the rendered tmux state changes since the last injection (a moved,
 * renamed, or re-laid-out pane), with an optional `refreshIntervalMs` floor
 * between injections. Absent tmux environment, an inherited-only environment,
 * absent `ctx.shell`, or a failed query is a no-op, never an error: an executor
 * rejection is contained and logged as a warning so the turn continues.
 *
 * @module @deepseek-ai/dsh-tmux-context
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { z as zod } from 'zod';
/** Cordis plugin name used by loader diagnostics. */
export declare const name = "tmux-context";
/** The agent registry that owns pre-step processing. */
export declare const inject: string[];
/** Per-turn tmux-location scheduling. Invalid values fail plugin load. */
export interface Config {
    /** Minimum milliseconds between durable injections in one session. Omit or set to 0 to inject on every eligible change. */
    refreshIntervalMs?: number;
}
/** Schemastery validation for {@link Config}. */
export declare const Config: z<Config>;
declare const tmuxContextStateSchema: zod.ZodNullable<zod.ZodObject<{
    state: zod.ZodString;
    time: zod.ZodNumber;
}, zod.core.$strip>>;
type TmuxContextState = zod.infer<typeof tmuxContextStateSchema>;
/**
 * Register a prepended pre-step listener for the lifetime of `ctx`.
 * @param ctx - plugin context; the listener is disposed with it.
 * @param config - durable refresh scheduling configuration.
 * @throws when the refresh interval is invalid.
 */
declare module '@deepseek-ai/dsh-session-projection/types' {
    interface SessionProjectionStateMap {
        /** The stable state block of this plugin's latest durable injection, or null. */
        tmuxContext: TmuxContextState;
    }
}
export declare function apply(ctx: Context, config: Config): void;
export {};
//# sourceMappingURL=index.d.ts.map