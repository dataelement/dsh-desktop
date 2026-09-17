import { z } from "zod";
import { assistantStreamFirstTokenTime } from "@deepseek-ai/dsh-llm";
//#region lib/types/projection.js
/**
* The `sessionStats` projection unit: a pure fold of step boundaries, stream
* embedded streams, tool pairs, and assembled assistant messages into whole-log counts
* and wall times.
*
* `step/end` — not `assistant/message` — is the counted step event because it
* is the step lifecycle authority: the loop appends exactly one per entered
* step, in a `finally`, so completed, failed, cancelled, and max-tokens steps
* all land one. Counting assembled assistant messages instead would overcount
* max-tokens usage-host messages (empty content, excluded from the surface)
* and undercount cancelled steps (aborted before the message assembles).
*
* The wall-time folds mirror the client window fold field by field
* (`deriveStats` in dsh-client-ui-conversation, that fold's whole-window
* fallback role): model time is `step/start` → `assistant/message`, first
* token is the first non-empty delta chunk and survives an in-step
* `llm/retry`, decode spans first token → assembled message on steps that
* also report output tokens, and tool time pairs `tool/call` → `tool/result`
* by callId. A cancelled step assembles no message, so its partial stream
* time stays uncounted in every time figure — matching the window, which
* renders it as an untimed interrupted node.
*
* @module @deepseek-ai/dsh-session-stats/projection
*/
const sessionStatsSchema = z.object({
	turns: z.number().int().nonnegative(),
	steps: z.number().int().nonnegative(),
	llmMs: z.number().nonnegative(),
	toolMs: z.number().nonnegative(),
	ttftMs: z.number().nonnegative(),
	ttftSteps: z.number().int().nonnegative(),
	decodeMs: z.number().nonnegative(),
	decodeTokens: z.number().nonnegative()
}).strict();
/**
* The fold state's shape (totals plus in-flight boundaries), validated on
* persisted-cache rows after their `ver` gate — the unit's input boundary.
* The view is a strict subset of the state, so this schema extends
* `sessionStatsSchema` (the wire output boundary) with the boundary fields.
*/
const sessionStatsStateSchema = sessionStatsSchema.extend({
	lastTurn: z.number().int().nonnegative().nullable(),
	openStep: z.object({
		turn: z.number().int().nonnegative(),
		step: z.number().int().nonnegative(),
		startTime: z.number().nonnegative(),
		firstTokenTime: z.number().nonnegative().nullable()
	}).nullable(),
	pendingCalls: z.record(z.string(), z.number().nonnegative())
});
/**
* Provider-reported completion tokens, guarded the way the window fold guards
* node usage.
* @param usage - the assistant/message event's optional usage record.
* @returns the output-token count, or null when unreported or invalid.
*/
function usageOutputTokens(usage) {
	if (typeof usage !== "object" || usage === null) return null;
	const value = usage.outputTokens;
	return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}
/** The `sessionStats` unit registered on `ctx.sessionProjections` (exported for the unit spec). */
const sessionStatsProjectionDefinition = {
	key: "sessionStats",
	stateVersion: 1,
	stateSchema: sessionStatsStateSchema,
	init: () => ({
		turns: 0,
		steps: 0,
		llmMs: 0,
		toolMs: 0,
		ttftMs: 0,
		ttftSteps: 0,
		decodeMs: 0,
		decodeTokens: 0,
		lastTurn: null,
		openStep: null,
		pendingCalls: {}
	}),
	apply: (state, event) => {
		switch (event.type) {
			case "step/start": return {
				...state,
				openStep: {
					turn: event.data.turn,
					step: event.data.step,
					startTime: event.time,
					firstTokenTime: null
				}
			};
			case "assistant/attempt": {
				const open = state.openStep;
				if (open === null || open.turn !== event.data.turn || open.step !== event.data.step) return state;
				const first = assistantStreamFirstTokenTime(event.data.stream) ?? null;
				if (open.firstTokenTime !== null || first === null) return state;
				return {
					...state,
					openStep: {
						...open,
						firstTokenTime: first
					}
				};
			}
			case "assistant/message": {
				const open = state.openStep;
				if (open === null || open.turn !== event.data.turn || open.step !== event.data.step) return state;
				const firstToken = open.firstTokenTime ?? assistantStreamFirstTokenTime(event.data.stream) ?? null;
				const next = {
					...state,
					llmMs: state.llmMs + Math.max(0, event.time - open.startTime),
					openStep: null
				};
				if (firstToken !== null) {
					next.ttftMs += Math.max(0, firstToken - open.startTime);
					next.ttftSteps += 1;
					const outputTokens = usageOutputTokens(event.data.usage);
					if (outputTokens !== null) {
						next.decodeMs += Math.max(0, event.time - firstToken);
						next.decodeTokens += outputTokens;
					}
				}
				return next;
			}
			case "tool/call": return {
				...state,
				pendingCalls: {
					...state.pendingCalls,
					[event.data.callId]: event.time
				}
			};
			case "tool/result": {
				const callId = event.data.message.source.callId;
				const dispatched = Object.hasOwn(state.pendingCalls, callId) ? state.pendingCalls[callId] : void 0;
				if (dispatched === void 0) return state;
				const pendingCalls = Object.fromEntries(Object.entries(state.pendingCalls).filter(([id]) => id !== callId));
				return {
					...state,
					toolMs: state.toolMs + Math.max(0, event.time - dispatched),
					pendingCalls
				};
			}
			case "step/end": return {
				...state,
				turns: state.lastTurn === event.data.turn ? state.turns : state.turns + 1,
				steps: state.steps + 1,
				lastTurn: event.data.turn,
				openStep: null
			};
			case "turn/end": return Object.keys(state.pendingCalls).length === 0 ? state : {
				...state,
				pendingCalls: {}
			};
			default: return state;
		}
	},
	wire: {
		viewSchema: sessionStatsSchema,
		view: (state) => ({
			turns: state.turns,
			steps: state.steps,
			llmMs: state.llmMs,
			toolMs: state.toolMs,
			ttftMs: state.ttftMs,
			ttftSteps: state.ttftSteps,
			decodeMs: state.decodeMs,
			decodeTokens: state.decodeTokens
		})
	}
};
//#endregion
//#region lib/types/index.js
/**
* Function plugin registering the `sessionStats` projection unit: whole-log
* turn/step counts and LLM/tool/first-token/decode wall times served through
* the session-projection seam (registry snapshot, change feed, and every
* projection carrier), so clients render full-session figures that paging and
* compaction cannot change. The plugin owns only the fold; delivery is the
* seam's.
*
* @module @deepseek-ai/dsh-session-stats
*/
/** Cordis plugin name. */
const name = "session-stats";
/** The projection registry is the plugin's whole purpose; without it the fiber stays pending. */
const inject = ["sessionProjections"];
/**
* Register the `sessionStats` unit; the registration is an effect on this
* plugin's fiber, so unloading removes the key.
* @param ctx - registrant context carrying the projection registry.
*/
function apply(ctx) {
	ctx.sessionProjections.register(sessionStatsProjectionDefinition);
}
//#endregion
export { apply, inject, name };
