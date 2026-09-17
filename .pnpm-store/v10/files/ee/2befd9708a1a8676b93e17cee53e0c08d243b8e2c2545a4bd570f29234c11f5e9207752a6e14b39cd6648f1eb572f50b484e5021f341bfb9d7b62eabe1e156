import { ManualCompactionError } from "@deepseek-ai/dsh-compaction";
//#region lib/types/index.js
/**
* Human-facing `/compact` command over the backend-independent compaction seam.
* @module @deepseek-ai/dsh-command-compact
*/
const name = "command-compact";
const inject = ["commands", "compaction"];
const USAGE = "Usage: /compact (no arguments)";
/** Fail loudly if a locally closed union gains an unhandled member. */
/* v8 ignore start -- closed-union backstop is unreachable without violating the TypeScript contract */
function assertNever(value) {
	throw new TypeError(`unknown manual compaction error code: ${String(value)}`);
}
/* v8 ignore stop */
/** Convert expected capability failures into concise human-only outcomes. */
function expectedFailure(error) {
	switch (error.code) {
		case "busy": return {
			kind: "error",
			text: "Compaction is unavailable because this process has an active compaction, or the agent is not idle."
		};
		case "cancelled": return {
			kind: "error",
			text: "Compaction cancelled."
		};
		case "changed": return {
			kind: "error",
			text: "The history selected for compaction changed before it could be replaced. The conversation is unchanged; the attempt is recorded in the session log."
		};
		case "summary": return {
			kind: "error",
			text: "Compaction could not produce a useful summary. The conversation is unchanged; the attempt is recorded in the session log."
		};
		case "commit": return {
			kind: "error",
			text: "Compaction did not finish cleanly; some session history may have changed. Inspect the current session state before retrying."
		};
		case "persistence": return {
			kind: "error",
			text: "Compaction finished, but the session could not be saved."
		};
		/* v8 ignore next 2 -- ManualCompactionErrorCode is closed and every member is handled above */
		default: return assertNever(error.code);
	}
}
/** Execute one argument-free manual compaction request. */
async function executeCompact(ctx, invocation) {
	if (invocation.rawInput.trim().length > 0) return {
		kind: "error",
		text: USAGE
	};
	try {
		const result = await ctx.compaction.compactNow(invocation.agent, invocation.signal, invocation.commandId);
		if (result === null) return {
			kind: "success",
			text: "No compactable history yet."
		};
		return {
			kind: "success",
			text: `Compacted ${result.shadowedSeqs.length} history items (~${result.shadowedTokenCount} tokens).`,
			sourceEventSeq: result.summarySeq
		};
	} catch (error) {
		if (invocation.signal.aborted) return {
			kind: "error",
			text: "Compaction cancelled."
		};
		if (error instanceof ManualCompactionError) return expectedFailure(error);
		throw error;
	}
}
/**
* Register `/compact` for every composed human-command adapter.
* @param ctx - context carrying the command registry and the compaction seam.
*/
function apply(ctx) {
	const active = /* @__PURE__ */ new Set();
	const handler = (invocation) => {
		const operation = executeCompact(ctx, invocation);
		active.add(operation);
		const retire = () => {
			active.delete(operation);
		};
		operation.then(retire, retire);
		return operation;
	};
	ctx.effect(function* () {
		yield async () => {
			await Promise.allSettled(active);
		};
		yield ctx.commands.register({
			name: "compact",
			description: "Compact older conversation history",
			handler
		});
	}, "command-compact lifecycle");
}
//#endregion
export { apply, inject, name };
