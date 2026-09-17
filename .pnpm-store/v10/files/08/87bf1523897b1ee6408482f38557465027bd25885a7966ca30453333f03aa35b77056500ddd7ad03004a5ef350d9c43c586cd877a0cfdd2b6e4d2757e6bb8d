import { isDeepStrictEqual } from "node:util";
import { foldGoal } from "@deepseek-ai/dsh-goal";
//#region lib/types/prompt.js
/** Model-visible continuation prompt for one same-session goal round. */
/**
* Render the complete goal-round instruction retained in session history.
* @param goal - exact active goal revision being admitted.
* @param round - next positive round number.
* @returns a fresh one-block prompt for `Agent.followup()`.
*/
function renderGoalRoundPrompt(goal, round) {
	return [{
		type: "text",
		text: `<goal_round>
Objective: ${JSON.stringify(goal.objective)}\nRound: ${round}/${goal.maxGoalRounds}\n\nContinue working toward the objective in this same session. Treat the current workspace, tool results, and durable session state as authoritative; inspect them instead of assuming earlier narration is still current. Make concrete progress and verify the result. Before claiming completion, gather evidence that the whole objective is achieved, read the current goal, and mark it complete. If work remains, leave the goal active for the next round. Follow the configured goal-tool policy before reporting a blocker.
</goal_round>`
	}];
}
//#endregion
//#region lib/types/invariant.js
/** Package-owned goal-round prompt invariants. @module @deepseek-ai/dsh-goal-round-driver/invariant */
const PACKAGE_NAME = "@deepseek-ai/dsh-goal-round-driver";
/** Cordis companion plugin name. */
const name = "goal-round-driver-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/** Attribute strict goal-fold failures to this companion's reconstruction. */
function foldChecked(events, fail) {
	try {
		return foldGoal(events);
	} catch (error) {
		return fail(`cannot reconstruct the goal before a continuation message: ${error instanceof Error ? error.message : String(error)}`);
	}
}
/** Recreate the live-shaped view consumed by the package's pure prompt renderer. */
function goalView(folded, source, fail) {
	const goal = folded.goal;
	if (goal === void 0 || folded.createdAt === void 0 || folded.updatedAt === void 0 || goal.phase !== "active" || goal.id !== source.goalId || goal.revision !== source.revision || source.round !== folded.roundsStarted + 1 || source.round > goal.maxGoalRounds) return fail(`goal round ${source.round} cannot be reconstructed from the preceding durable goal state`);
	return {
		...goal,
		roundsStarted: folded.roundsStarted,
		createdAt: folded.createdAt,
		updatedAt: folded.updatedAt,
		activation: "armed"
	};
}
/** Validate one package-owned continuation message against its durable prefix. */
function validateEvent(prior, event, fail) {
	if (event.type !== "user/message") return;
	const source = event.data.source;
	if (source.kind !== "goal" || source.round <= 0) return;
	const expected = renderGoalRoundPrompt(goalView(foldChecked(prior, fail), source, fail), source.round);
	if (!isDeepStrictEqual(event.data.content, expected)) fail(`goal round ${source.round} content does not match the package-owned continuation prompt`);
}
/** Check existing sessions and every candidate event before Session publishes it. */
const install = Object.assign((ctx, fail) => {
	for (const session of ctx.sessions.list()) {
		const prior = [];
		for (const event of session.snapshotEvents()) {
			validateEvent(prior, event, fail);
			prior.push(event);
		}
	}
	ctx.on("internal/dispatch", (_mode, eventName, args) => {
		if (eventName !== "session/event") return;
		const [session, event] = args;
		validateEvent(session.snapshotEvents(), event, fail);
	}, { global: true });
}, { inject: ["sessions"] });
/**
* Register the goal-round-driver invariant companion.
* @param ctx - Cordis context carrying the invariant service.
* @returns the installed registration's disposer after setup succeeds.
*/
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
