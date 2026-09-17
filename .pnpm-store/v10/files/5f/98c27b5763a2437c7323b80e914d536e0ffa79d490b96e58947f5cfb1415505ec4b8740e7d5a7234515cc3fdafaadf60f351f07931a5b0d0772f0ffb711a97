/**
 * The `turnOutline` projection unit: a pure fold of `turn/start` boundaries,
 * first human prompts, and final assistant responses into the whole-log turn
 * outline the chat rail renders for turns outside a client's paged event
 * window.
 *
 * `turn/start` — not the prompt `user/message` — anchors each entry because
 * its seq is the load-through target for a jump: the loop logs `turn/start`
 * before the turn's prompt and steps, so a window paged back through that seq
 * contains the whole turn. Previews mirror the rail's loaded-turn previews
 * (space-joined text blocks, collapsed whitespace, an ellipsis when clipped)
 * with budgets sized to the rail card's clamps — one prompt line, up to three
 * response lines — so a turn shows the same words before and after its events
 * load. The response commits at `turn/end` from a draft of the newest
 * text-bearing assistant message; draft-only applies keep the `turns` array's
 * identity, so the identity-gated change feed pushes at most three times per
 * turn (boundary, prompt, response).
 *
 * @module @deepseek-ai/dsh-session-turn-outline/projection
 */
import { z } from 'zod';
import { type SessionEvent } from '@deepseek-ai/dsh-session';
import type { TurnOutlineEntry, TurnOutlineState } from './types.ts';
/** The `turnOutline` unit registered on `ctx.sessionProjections` (exported for the unit spec). */
export declare const turnOutlineProjectionDefinition: {
    key: "turnOutline";
    stateVersion: number;
    stateSchema: z.ZodType<TurnOutlineState, unknown, z.core.$ZodTypeInternals<TurnOutlineState, unknown>>;
    init: () => TurnOutlineState;
    apply: (state: NoInfer<TurnOutlineState>, event: SessionEvent) => TurnOutlineState;
    wire: {
        viewSchema: z.ZodType<readonly TurnOutlineEntry[], unknown, z.core.$ZodTypeInternals<readonly TurnOutlineEntry[], unknown>>;
        view: (state: NoInfer<TurnOutlineState>) => readonly TurnOutlineEntry[];
    };
};
//# sourceMappingURL=projection.d.ts.map