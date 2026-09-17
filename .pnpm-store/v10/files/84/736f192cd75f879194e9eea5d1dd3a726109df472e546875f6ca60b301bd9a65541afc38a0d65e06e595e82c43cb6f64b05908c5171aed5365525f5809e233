import { isDeepStrictEqual } from "node:util";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
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
//#region lib/types/index.js
/**
* Same-session goal-round driver over public agent, session, and goal services.
* @module @deepseek-ai/dsh-goal-round-driver
*/
const name = "goal-round-driver";
const inject = [
	"agents",
	"goals",
	"sessions"
];
/** Whether a source identifies an automatic, positive-numbered goal round. */
function isGoalRoundSource(source) {
	return source.kind === "goal" && source.round > 0;
}
/** Compare a source to one reserved identity. */
function sameRound(source, round) {
	return source.goalId === round.goalId && source.revision === round.revision && source.round === round.round;
}
/** Compare the complete queued record to the driver's reservation. */
function sameQueued(content, source, attempt) {
	return isGoalRoundSource(source) && sameRound(source, attempt) && isDeepStrictEqual(content, attempt.content);
}
/** Exact current ref for a view. */
function goalRef(goal) {
	return {
		id: goal.id,
		revision: goal.revision
	};
}
/** Human-readable unexpected values for logs. */
function renderThrown(value) {
	return value instanceof Error ? value.message : String(value);
}
/** Install automatic same-session continuation and its race fences. */
function apply(ctx) {
	const states = /* @__PURE__ */ new Map();
	/** Create state for an exact currently live agent. */
	function stateFor(agent) {
		const existing = states.get(agent);
		if (existing !== void 0) return existing;
		const state = {
			agent,
			attempt: void 0,
			competingQueued: false,
			needsCheckpoint: false,
			requested: false,
			run: void 0,
			stopping: false
		};
		states.set(agent, state);
		return state;
	}
	/** Read only when the exact Agent remains live. */
	function currentGoal(state) {
		if (ctx.agents.get(state.agent.id) !== state.agent) return void 0;
		return ctx.goals.get(state.agent);
	}
	/** Whether this exact lifecycle is quiescent with no competing prompt. */
	function readyToDrive(state) {
		return ctx.fiber.state === 2 && !state.stopping && ctx.agents.get(state.agent.id) === state.agent && state.agent.status === "idle" && !state.competingQueued;
	}
	/** Recheck every condition that an awaited checkpoint may have changed. */
	function readyAfterCheckpoint(state) {
		return readyToDrive(state) && !state.needsCheckpoint;
	}
	/** Remove automatic authority while preserving the durable phase. */
	function disarm(state) {
		try {
			if (currentGoal(state)?.activation === "armed") ctx.goals.disarm(state.agent);
		} catch (error) {
			ctx.logger.warn(`goal-round-driver: could not disarm agent "${state.agent.id}": ${renderThrown(error)}`);
		}
	}
	/** Preserve claimed step context when this driver drops only its own round. */
	function restoreOtherClaimed(agent, messages, messageId) {
		const retained = messages.filter((message) => message.id !== messageId && !(message.source.kind === "goal" && message.source.round === 0));
		for (const message of retained.toReversed()) {
			if (agent.inbox.nextStep.some((candidate) => candidate.id === message.id) || agent.inbox.nextTurn.some((candidate) => candidate.id === message.id)) continue;
			agent.inbox.prepend("next-step", message);
		}
	}
	/** Process admitted work at quiescence, then reserve at most one next round. */
	async function drive(state) {
		const { agent } = state;
		if (!readyToDrive(state)) return;
		if (state.needsCheckpoint) {
			state.needsCheckpoint = false;
			try {
				await ctx.sessions.flush(agent.session);
			} catch (error) {
				ctx.logger.warn(`goal-round-driver: durability checkpoint failed for agent "${agent.id}": ${renderThrown(error)}`);
				disarm(state);
				return;
			}
			if (!readyAfterCheckpoint(state)) return;
		}
		if (state.attempt !== void 0) {
			state.attempt = void 0;
			state.needsCheckpoint = true;
			state.requested = true;
			return;
		}
		const goal = currentGoal(state);
		if (goal === void 0 || goal.phase !== "active" || goal.activation !== "armed") return;
		if (goal.roundsStarted >= goal.maxGoalRounds) {
			ctx.goals.block(agent, goalRef(goal), {
				code: "round-limit",
				message: `Goal reached its configured limit of ${goal.maxGoalRounds} rounds.`
			});
			return;
		}
		const round = goal.roundsStarted + 1;
		const content = renderGoalRoundPrompt(goal, round);
		const message = createUserMessage({
			content,
			source: {
				kind: "goal",
				goalId: goal.id,
				revision: goal.revision,
				round
			}
		});
		state.attempt = {
			goalId: goal.id,
			revision: goal.revision,
			round,
			messageId: message.id,
			content,
			phase: "queued",
			cancelled: false,
			stale: false
		};
		try {
			agent.followup(message);
		} catch (error) {
			state.attempt = void 0;
			ctx.logger.warn(`goal-round-driver: could not queue round ${round} for agent "${agent.id}": ${renderThrown(error)}`);
			const latest = currentGoal(state);
			if (latest !== void 0 && latest.id === goal.id && latest.revision === goal.revision && latest.phase === "active" && latest.activation === "armed") ctx.goals.block(agent, goalRef(latest), {
				code: "queue-failed",
				message: `Could not queue goal round ${round}: ${renderThrown(error)}`
			});
		}
	}
	/** Coalesce triggers onto one agent-local serialized driver. */
	function requestDrive(state) {
		/* v8 ignore next -- teardown may race a final trigger after synchronously closing the step fence */
		if (state.stopping) return;
		state.requested = true;
		if (state.run !== void 0) return;
		let run;
		try {
			run = ctx.agents.withoutInitiator(async () => {
				while (state.requested && !state.stopping) {
					state.requested = false;
					try {
						await drive(state);
					} catch (error) {
						ctx.logger.warn(`goal-round-driver: driver failed for agent "${state.agent.id}": ${renderThrown(error)}`);
						disarm(state);
					}
				}
			});
		} catch (error) {
			ctx.logger.warn(`goal-round-driver: could not start driver for agent "${state.agent.id}": ${renderThrown(error)}`);
			disarm(state);
			return;
		}
		state.run = run;
		const retire = () => {
			state.run = void 0;
			if (state.requested && !state.stopping) requestDrive(state);
		};
		run.then(retire, (error) => {
			ctx.logger.warn(`goal-round-driver: driver task rejected for agent "${state.agent.id}": ${renderThrown(error)}`);
			disarm(state);
			retire();
		});
	}
	ctx.effect(function* () {
		ctx.on("agent/error", ({ agent }) => {
			disarm(stateFor(agent));
		});
		ctx.on("agent/created", ({ agent }) => {
			stateFor(agent);
		});
		ctx.on("agent/disposed", ({ agent }) => {
			states.delete(agent);
		});
		ctx.on("agent/session-start", ({ agent }) => {
			const state = stateFor(agent);
			state.attempt = void 0;
			state.competingQueued = false;
			state.needsCheckpoint = false;
		});
		ctx.on("agent/status", ({ agent, status }) => {
			const state = stateFor(agent);
			if (status === "idle") {
				state.competingQueued = false;
				const attempt = state.attempt;
				const goal = currentGoal(state);
				if (attempt !== void 0 && (attempt.phase === "queued" || attempt.phase === "claimed" || attempt.cancelled) && goal !== void 0 && goal.phase === "active" && goal.activation === "armed" && attempt.goalId === goal.id && attempt.revision === goal.revision) {
					state.attempt = void 0;
					try {
						ctx.goals.pause(agent, goalRef(goal));
					} catch (error) {
						ctx.logger.warn(`goal-round-driver: could not pause cancelled goal for agent "${agent.id}": ${renderThrown(error)}`);
						disarm(state);
					}
				}
				requestDrive(state);
			}
		});
		ctx.on("goal/changed", ({ agent, change }) => {
			const state = stateFor(agent);
			state.needsCheckpoint = true;
			if (change.operation === "pause" && agent.status === "running" && ctx.agents.currentInitiator() !== agent) agent.cancel({ kind: "user" }, { keepInbox: true });
			requestDrive(state);
		});
		ctx.on("agent/inbox/inserted", ({ agent, message }) => {
			if (!agent.inbox.nextTurn.some((candidate) => candidate.id === message.id)) return;
			const state = stateFor(agent);
			const attempt = state.attempt;
			if (attempt !== void 0 && sameQueued(message.content, message.source, attempt)) return;
			state.competingQueued = true;
			if (attempt?.phase === "queued") attempt.stale = true;
		});
		ctx.on("agent/inbox/claimed", ({ agent, message }) => {
			const attempt = stateFor(agent).attempt;
			if (attempt !== void 0 && sameQueued(message.content, message.source, attempt)) attempt.phase = "claimed";
		});
		ctx.on("agent/inbox/discarded", ({ agent, message }) => {
			const attempt = stateFor(agent).attempt;
			if (attempt !== void 0 && sameQueued(message.content, message.source, attempt)) attempt.cancelled = true;
		});
		ctx.on("session/event", (session, event) => {
			const agent = ctx.agents.get(session.id);
			if (agent === void 0 || agent.session !== session) return;
			const state = stateFor(agent);
			switch (event.type) {
				case "user/message":
					if (state.attempt !== void 0 && event.data.id === state.attempt.messageId) state.attempt.phase = "admitted";
					return;
				case "turn/end":
					if (event.data.reason.kind === "max-tokens") {
						disarm(state);
						return;
					}
					if (event.data.reason.kind !== "aborted") return;
					if (state.attempt?.phase === "claimed" || state.attempt?.phase === "admitted") state.attempt.cancelled = true;
					else disarm(state);
					return;
				default: return;
			}
		});
		/** Fail closed unless the queued prompt still owns the exact live revision. */
		function validReservation(state, content, source) {
			const attempt = state.attempt;
			const goal = currentGoal(state);
			return ctx.fiber.state === 2 && !state.stopping && attempt !== void 0 && attempt.phase === "claimed" && !attempt.stale && sameQueued(content, source, attempt) && goal !== void 0 && goal.id === source.goalId && goal.revision === source.revision && goal.phase === "active" && goal.activation === "armed" && source.round === goal.roundsStarted + 1;
		}
		ctx.on("agent/pre-step", async ({ agent, messages, signal }, next) => {
			const submitted = messages.find((message) => isGoalRoundSource(message.source));
			if (submitted === void 0) return next();
			const { content, source } = submitted;
			const state = stateFor(agent);
			let valid = false;
			try {
				valid = validReservation(state, content, source);
			} catch (error) {
				ctx.logger.warn(`goal-round-driver: pre-step check failed for agent "${agent.id}": ${renderThrown(error)}`);
				disarm(state);
			}
			if (!valid) {
				const attempt = state.attempt;
				if (attempt !== void 0 && sameRound(source, attempt)) {
					attempt.stale = true;
					state.attempt = void 0;
				}
				restoreOtherClaimed(agent, messages, submitted.id);
				requestDrive(state);
				return { kind: "reject" };
			}
			let decision;
			try {
				decision = await next();
			} catch (error) {
				if (signal.aborted) throw error;
				state.attempt = void 0;
				requestDrive(state);
				throw error;
			}
			if (signal.aborted) {
				if (decision.kind === "enter") restoreOtherClaimed(agent, decision.messages, submitted.id);
				return decision;
			}
			if (decision.kind === "reject") {
				state.attempt = void 0;
				const goal = currentGoal(state);
				if (goal !== void 0 && goal.id === source.goalId && goal.revision === source.revision && goal.phase === "active" && goal.activation === "armed") ctx.goals.block(agent, goalRef(goal), {
					code: "prompt-rejected",
					message: "Goal round was rejected before entering its step."
				});
				return decision;
			}
			try {
				valid = validReservation(state, content, source);
			} catch (error) {
				ctx.logger.warn(`goal-round-driver: post-decision check failed for agent "${agent.id}": ${renderThrown(error)}`);
				disarm(state);
				valid = false;
			}
			if (!valid) {
				state.attempt = void 0;
				restoreOtherClaimed(agent, decision.messages, submitted.id);
				requestDrive(state);
				return { kind: "reject" };
			}
			return {
				...decision,
				startsRequestSeries: true
			};
		});
		for (const agent of ctx.agents.list()) disarm(stateFor(agent));
		yield async () => {
			const waits = [];
			for (const state of states.values()) {
				state.stopping = true;
				disarm(state);
				const attempt = state.attempt;
				if (attempt !== void 0) {
					attempt.stale = true;
					/* v8 ignore next -- followup reserves the live agent before publishing a queued attempt */
					if (state.agent.status === "running") {
						state.agent.cancel({ kind: "parent" });
						waits.push(state.agent.whenIdle());
					}
				}
				if (state.run !== void 0) waits.push(state.run);
			}
			await Promise.allSettled(waits);
			states.clear();
		};
	}, "goal-round-driver lifecycle");
}
//#endregion
export { apply, inject, name, renderGoalRoundPrompt };
