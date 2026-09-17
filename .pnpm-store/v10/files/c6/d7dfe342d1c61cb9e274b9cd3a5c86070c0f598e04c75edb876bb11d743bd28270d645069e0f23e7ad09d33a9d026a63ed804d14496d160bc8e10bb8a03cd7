import { z } from "zod";
import { SessionSeq } from "@deepseek-ai/dsh-session";
//#region lib/types/projection.js
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
/** Prompt budget: one rail-card line (13px over ~276px), ASCII worst case included. */
const PROMPT_PREVIEW_LIMIT = 50;
/** Response budget: three rail-card lines (12px over ~276px). */
const RESPONSE_PREVIEW_LIMIT = 120;
/** Space-join text blocks, collapse whitespace, and cap at `limit` with a trailing ellipsis when clipped. */
function preview(content, limit) {
	let text = "";
	let unread = false;
	for (const block of content) {
		if (block.type !== "text") continue;
		if (text.length >= limit * 2) {
			unread = true;
			break;
		}
		const clipped = block.text.length > limit * 2;
		const chunk = clipped ? block.text.slice(0, limit * 2) : block.text;
		text += text === "" ? chunk : ` ${chunk}`;
		if (clipped) {
			unread = true;
			break;
		}
	}
	const normalized = text.replace(/\s+/g, " ").trim();
	if (normalized.length > limit - 1) return `${normalized.slice(0, limit - 1).trimEnd()}…`;
	return unread ? `${normalized}…` : normalized;
}
const turnOutlineEntriesSchema = z.array(z.object({
	turn: z.number().int().nonnegative(),
	seq: z.number().int().nonnegative().transform(SessionSeq),
	prompt: z.string().max(PROMPT_PREVIEW_LIMIT),
	response: z.string().max(RESPONSE_PREVIEW_LIMIT)
}).strict()).superRefine((turns, context) => {
	let previous = -1;
	for (const entry of turns) {
		if (entry.turn <= previous) {
			context.addIssue({
				code: "custom",
				message: "turn outline entries must be strictly increasing by turn"
			});
			return;
		}
		previous = entry.turn;
	}
});
const turnOutlineStateSchema = z.object({
	turns: turnOutlineEntriesSchema,
	draft: z.string().max(RESPONSE_PREVIEW_LIMIT)
}).strict();
const EMPTY_OUTLINE = {
	turns: [],
	draft: ""
};
/** The `turnOutline` unit registered on `ctx.sessionProjections` (exported for the unit spec). */
const turnOutlineProjectionDefinition = {
	key: "turnOutline",
	stateVersion: 2,
	stateSchema: turnOutlineStateSchema,
	init: () => EMPTY_OUTLINE,
	apply: (state, event) => {
		switch (event.type) {
			case "turn/start": {
				const last = state.turns.at(-1);
				if (last !== void 0 && event.data.turn <= last.turn) return state;
				return {
					turns: [...state.turns, {
						turn: event.data.turn,
						seq: event.seq,
						prompt: "",
						response: ""
					}],
					draft: ""
				};
			}
			case "user/message": {
				if (event.data.source.kind !== "user") return state;
				const last = state.turns.at(-1);
				if (last === void 0 || last.prompt !== "") return state;
				const prompt = preview(event.data.content, PROMPT_PREVIEW_LIMIT);
				if (prompt === "") return state;
				return {
					turns: [...state.turns.slice(0, -1), {
						...last,
						prompt
					}],
					draft: state.draft
				};
			}
			case "assistant/message": {
				const draft = preview(event.data.message.content, RESPONSE_PREVIEW_LIMIT);
				if (draft === "" || draft === state.draft) return state;
				return {
					turns: state.turns,
					draft
				};
			}
			case "turn/end": {
				if (state.draft === "") return state;
				const last = state.turns.at(-1);
				if (last === void 0 || last.response === state.draft) return {
					turns: state.turns,
					draft: ""
				};
				return {
					turns: [...state.turns.slice(0, -1), {
						...last,
						response: state.draft
					}],
					draft: ""
				};
			}
			default: return state;
		}
	},
	wire: {
		viewSchema: turnOutlineEntriesSchema,
		view: (state) => state.turns
	}
};
//#endregion
//#region lib/types/index.js
/**
* Function plugin registering the `turnOutline` projection unit: the
* whole-log turn outline (turn number, `turn/start` seq, bounded prompt
* preview) served through the session-projection seam — registry snapshot,
* change feed, and every projection carrier — so a client can offer every
* turn of a session and target history paging at exact seqs without holding
* the events. The plugin owns only the fold; delivery is the seam's.
*
* @module @deepseek-ai/dsh-session-turn-outline
*/
/** Cordis plugin name. */
const name = "session-turn-outline";
/** The projection registry is the plugin's whole purpose; without it the fiber stays pending. */
const inject = ["sessionProjections"];
/**
* Register the `turnOutline` unit; the registration is an effect on this
* plugin's fiber, so unloading removes the key.
* @param ctx - registrant context carrying the projection registry.
*/
function apply(ctx) {
	ctx.sessionProjections.register(turnOutlineProjectionDefinition);
}
//#endregion
export { apply, inject, name };
