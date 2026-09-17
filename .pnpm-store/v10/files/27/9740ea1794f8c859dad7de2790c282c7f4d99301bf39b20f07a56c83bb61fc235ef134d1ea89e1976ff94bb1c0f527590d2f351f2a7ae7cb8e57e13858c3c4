import z from "@deepseek-ai/schemastery";
import { GoalId } from "@deepseek-ai/dsh-goal";
import { HarnessError, boundContextSummary, createUserMessage } from "@deepseek-ai/dsh-llm";
import { defineTool } from "@deepseek-ai/dsh-tools";
//#region lib/types/authority.js
/** Execution-time authority checks for the model-facing goal tools. */
/** Throw one structured tool-policy failure. */
function reject(message, code = "GOAL_TOOL_AUTHORITY_REQUIRED") {
	throw new HarnessError(message, code);
}
/** Resolve the immutable event cut and open-turn boundary without copying the turn suffix. */
function openTurnEvents(ctx, agent) {
	const events = agent.session.snapshotEvents();
	const boundary = ctx.sessionProjections.stateOf(agent.session, "turnBoundary");
	if (boundary === void 0 || boundary.openTurnStartSeq === null) reject("goal tools require an open model turn", "GOAL_TOOL_DRIVER_REQUIRED");
	return {
		events,
		openTurnStartSeq: boundary.openTurnStartSeq
	};
}
/**
* Resolve and authenticate the calling agent and its driver boundary.
* @param ctx - Context carrying the live agent registry.
* @param exec - Tool execution metadata supplied by the registry.
* @returns The authenticated agent, immutable event cut, and open-turn boundary.
*/
function goalToolExecution(ctx, exec) {
	const agent = exec.agent;
	if (agent === void 0) return reject("goal tools require a calling agent", "GOAL_TOOL_AGENT_REQUIRED");
	if (ctx.agents.get(agent.id) !== agent || agent.status !== "running" || ctx.agents.currentInitiator() !== agent) return reject("goal tools require the exact live calling agent inside its active driver", "GOAL_TOOL_DRIVER_REQUIRED");
	return {
		agent,
		...openTurnEvents(ctx, agent)
	};
}
/** Whether the captured open turn contains an event accepted by `predicate`. */
function someOpenTurnEvent(execution, predicate) {
	for (let seq = execution.openTurnStartSeq + 1; seq < execution.events.length; seq += 1) {
		const event = execution.events[seq];
		if (event !== void 0 && predicate(event)) return true;
	}
	return false;
}
/**
* Whether host-attested human input appears in the current root-agent turn.
* An omitted `Agent.followup()` / `steer()` source resolves to `user`, so non-human
* producers must supply their own source rather than inheriting this authority.
*/
function hasDirectHumanInput(ctx, execution) {
	if (!ctx.agents.roots().includes(execution.agent)) return false;
	return someOpenTurnEvent(execution, (event) => event.type === "user/message" && event.data.source.kind === "user");
}
/** Whether this turn is the current goal's exact admitted round. */
function isMatchingGoalRound(execution, goal) {
	return someOpenTurnEvent(execution, (event) => event.type === "user/message" && event.data.source.kind === "goal" && event.data.source.goalId === goal.id && event.data.source.revision === goal.revision && event.data.source.round === goal.roundsStarted);
}
/**
* Require authority originating in a human message accepted by a runtime root.
* @param ctx - Context carrying the live agent graph.
* @param execution - Authenticated current tool execution.
*/
function requireDirectHuman(ctx, execution) {
	if (hasDirectHumanInput(ctx, execution)) return;
	reject("this goal operation requires a direct human turn on a top-level agent");
}
/**
* Resolve completion authority from either direct human input or the exact goal round.
* @param ctx - Context carrying live agents and goal state.
* @param execution - Authenticated current tool execution.
* @returns The direct-human or exact-goal-round authority grant.
*/
function completionAuthority(ctx, execution) {
	if (hasDirectHumanInput(ctx, execution)) return { kind: "direct-human" };
	const goal = ctx.goals.get(execution.agent);
	if (goal !== void 0 && isMatchingGoalRound(execution, goal)) return {
		kind: "goal-round",
		goal
	};
	return reject("complete and blocked require a direct human turn or the current goal round");
}
//#endregion
//#region lib/types/wrapup.js
/**
* Render the closing-message instruction injected after an autonomous goal
* round reports `complete` or `blocked`, replacing the former hard turn stop
* so the model still addresses the user once before the turn ends.
* @param objective - the terminal goal's objective, echoed for grounding.
* @param blockedReason - the validated report for `blocked`; omitted for `complete`.
* @returns a fresh one-block context for `ToolRunContext.deferContext()`.
*/
function renderWrapupContext(objective, blockedReason) {
	const heading = `Objective: ${JSON.stringify(objective)}\n`;
	return [{
		type: "text",
		text: blockedReason === void 0 ? "<goal_complete>\n" + heading + "The goal is marked complete and this autonomous run is ending. Write the closing message to the user now: state the outcome, summarize what was done and how it was verified, and point to the concrete results (files, commits, or other artifacts). Report only what earlier rounds and tool results in this session actually establish; when a detail is not in the session, say so instead of inventing it. Note anything the user should review or do next. Address the user directly. Do not call any more tools in this run; further work waits for the user's next instruction.\n</goal_complete>" : "<goal_blocked>\n" + heading + `Blocked: ${JSON.stringify(blockedReason)}\nThe goal is marked blocked and this autonomous run is ending. Write the closing message to the user now: state what has been completed so far, describe the concrete blocking condition and what you tried, and say exactly what you need from the user to continue. Report only what earlier rounds and tool results in this session actually establish; when a detail is not in the session, say so instead of inventing it. Address the user directly. Do not call any more tools in this run; further work waits for the user's next instruction.
</goal_blocked>`
	}];
}
//#endregion
//#region lib/types/index.js
/**
* Model-facing `get_goal`, `create_goal`, and `update_goal` tools over the
* persisted same-session goal domain.
* @module @deepseek-ai/dsh-tool-goal
*/
const name = "tool-goal";
const inject = [
	"agents",
	"goals",
	"tools",
	"systemPrompt",
	"sessionProjections"
];
/** Schemastery config for the goal-tool policy. */
const Config = z.object({ blockedAfterConsecutiveRounds: z.number().step(1).min(1).default(3) });
const UPDATE_ACTIONS = [
	"edit",
	"pause",
	"resume",
	"complete",
	"blocked"
];
const CREATE_DESCRIPTION = "Create one persisted same-session completion goal when the current direct human request is a long-running objective that should continue across autonomous goal rounds. You may infer that intent without requiring the user to say \"create a goal\". Do not use this for trivial single-turn work. Execution rejects non-human and subagent authority.";
const GET_DESCRIPTION = "Read the current same-session goal, including its exact id/revision, objective, phase, completed continuation rounds, round limit, blocker reason when present, and whether another continuation is armed. Call this before updating a goal.";
const GOAL_VALUE_SCHEMA = { oneOf: [{
	type: "object",
	additionalProperties: false,
	properties: { goal: {
		type: "null",
		required: true
	} }
}, {
	type: "object",
	additionalProperties: false,
	properties: {
		goal: {
			type: "object",
			additionalProperties: false,
			required: true,
			properties: {
				id: {
					type: "string",
					required: true
				},
				revision: {
					type: "integer",
					required: true
				},
				objective: {
					type: "string",
					required: true
				},
				phase: {
					type: "string",
					required: true,
					enum: [
						"active",
						"paused",
						"blocked",
						"complete"
					]
				},
				roundsStarted: {
					type: "integer",
					required: true
				},
				maxGoalRounds: {
					type: "integer",
					required: true
				},
				blockedReason: {
					type: "object",
					additionalProperties: false,
					properties: {
						code: {
							type: "string",
							required: true
						},
						message: {
							type: "string",
							required: true
						}
					}
				}
			}
		},
		activation: {
			type: "string",
			required: true,
			enum: ["armed", "disarmed"]
		}
	}
}] };
/** Render policy guidance with its deployment-selected blocked threshold. */
function guidance(blockedAfter) {
	return `Use goal tools for one long-running completion objective in the current session. create_goal may infer goal intent from a direct human request in any language; do not create a goal for routine single-turn work. Call get_goal before update_goal and copy its exact goal_id and revision. After session resume or fork, an active goal is disarmed: when a human asks to continue or resume in any wording or language, use update_goal action resume to rearm it. Mark complete only when the objective is actually achieved. Mark blocked only after the same blocking condition persists for at least ${blockedAfter} consecutive goal rounds, and report that concrete condition in blocked_reason; difficulty, uncertainty, or useful remaining work is not blocked.`;
}
/** Validate config even when apply is called directly outside Loader normalization. */
function resolveConfig(config) {
	const blockedAfter = config.blockedAfterConsecutiveRounds ?? 3;
	if (!Number.isSafeInteger(blockedAfter) || blockedAfter < 1) throw new TypeError("blockedAfterConsecutiveRounds must be a positive safe integer");
	return { blockedAfterConsecutiveRounds: blockedAfter };
}
/** Whether optional text is meaningful rather than a strict-schema empty filler. */
function hasText(value) {
	return value !== void 0 && value !== "";
}
/** Whether an optional round cap is meaningful rather than a strict-schema zero filler. */
function hasRoundCap(value) {
	return value !== void 0 && value !== 0;
}
/** Build the exact compare-and-set ref from model arguments. */
function goalRef(goalId, revision) {
	if (goalId.length === 0 || goalId !== goalId.trim() || !Number.isSafeInteger(revision) || revision < 1) throw new HarnessError("goal_id must be non-empty and revision must be a positive safe integer", "GOAL_TOOL_INVALID_UPDATE");
	return {
		id: GoalId(goalId),
		revision
	};
}
/** Stable compact model result; activation is an observation, not replay state. */
function goalValue(goal) {
	if (goal === void 0) return { goal: null };
	return {
		goal: {
			id: goal.id,
			revision: goal.revision,
			objective: goal.objective,
			phase: goal.phase,
			roundsStarted: goal.roundsStarted,
			maxGoalRounds: goal.maxGoalRounds,
			...goal.blockedReason === void 0 ? {} : { blockedReason: {
				code: goal.blockedReason.code,
				message: goal.blockedReason.message
			} }
		},
		activation: goal.activation
	};
}
/** Reusable canonical output declaration for all three goal controls. */
const GOAL_OUTPUT = {
	schema: GOAL_VALUE_SCHEMA,
	render: (_args, value) => [{
		type: "text",
		text: JSON.stringify(value)
	}]
};
/** Generic, args-only pending presentation shared by the goal tools. */
function present(title, kind, rawInput) {
	return {
		card: "generic",
		title,
		kind,
		...rawInput === void 0 ? {} : { rawInput }
	};
}
/** Register the three Codex-shaped goal tools and their shared policy section. */
function apply(ctx, config) {
	const resolved = resolveConfig(config);
	ctx.systemPrompt.section({
		name: "tool:goal",
		order: ctx.systemPrompt.getSectionOrder("TOOL_GOAL"),
		text: guidance(resolved.blockedAfterConsecutiveRounds)
	});
	ctx.tools.register(defineTool({
		name: "get_goal",
		description: GET_DESCRIPTION,
		parameters: {},
		output: GOAL_OUTPUT,
		execute(_args, exec) {
			const execution = goalToolExecution(ctx, exec);
			return Promise.resolve(goalValue(ctx.goals.get(execution.agent)));
		},
		presentCall: () => present("Read current goal", "read")
	}));
	ctx.tools.register(defineTool({
		name: "create_goal",
		description: CREATE_DESCRIPTION,
		parameters: {
			objective: {
				type: "string",
				required: true,
				description: "The concrete completion objective inferred from the direct human request."
			},
			max_goal_rounds: {
				type: "number",
				description: "Optional positive safe-integer limit on automatic continuation rounds."
			}
		},
		output: GOAL_OUTPUT,
		execute(args, exec) {
			const execution = goalToolExecution(ctx, exec);
			requireDirectHuman(ctx, execution);
			const goal = ctx.goals.create(execution.agent, {
				objective: args.objective,
				...args.max_goal_rounds === void 0 ? {} : { maxGoalRounds: args.max_goal_rounds }
			});
			return Promise.resolve(goalValue(goal));
		},
		presentCall: (args) => present("Create goal", "other", args.objective)
	}));
	ctx.tools.register(defineTool({
		name: "update_goal",
		description: "Update the exact current goal revision. edit, pause, and resume require a direct top-level human request. During an automatic continuation of the current goal, complete and blocked are also allowed. blocked is rejected before the configured minimum round count; the model remains responsible for judging that the same condition persisted across those rounds and must explain it in blocked_reason.",
		parameters: {
			goal_id: {
				type: "string",
				required: true,
				description: "Exact id returned by get_goal."
			},
			revision: {
				type: "number",
				required: true,
				description: "Exact positive revision returned by get_goal."
			},
			action: {
				type: "string",
				required: true,
				enum: UPDATE_ACTIONS,
				description: "edit | pause | resume | complete | blocked"
			},
			objective: {
				type: "string",
				description: "Replacement objective; valid only with action edit."
			},
			max_goal_rounds: {
				type: "number",
				description: "Replacement cap; valid only with action edit."
			},
			blocked_reason: {
				type: "string",
				description: "Concrete blocking condition; required only with action blocked."
			}
		},
		output: GOAL_OUTPUT,
		execute(args, exec) {
			const execution = goalToolExecution(ctx, exec);
			const ref = goalRef(args.goal_id, args.revision);
			const replacements = {
				...hasText(args.objective) ? { objective: args.objective } : {},
				...hasRoundCap(args.max_goal_rounds) ? { maxGoalRounds: args.max_goal_rounds } : {}
			};
			if (args.action === "edit") {
				requireDirectHuman(ctx, execution);
				if (hasText(args.blocked_reason)) throw new HarnessError("blocked_reason is valid only with action blocked", "GOAL_TOOL_INVALID_UPDATE");
				const goal = ctx.goals.edit(execution.agent, ref, replacements);
				return Promise.resolve(goalValue(goal));
			}
			if (args.action === "pause" || args.action === "resume") {
				requireDirectHuman(ctx, execution);
				if (hasText(args.objective) || hasRoundCap(args.max_goal_rounds) || hasText(args.blocked_reason)) throw new HarnessError("objective and max_goal_rounds are valid only with action edit; blocked_reason is valid only with action blocked", "GOAL_TOOL_INVALID_UPDATE");
				const current = ctx.goals.get(execution.agent);
				if (args.action === "resume" && current?.id === ref.id && current.revision === ref.revision && current.phase === "paused") throw new HarnessError("the model cannot resume a paused goal; the user must resume it", "GOAL_TOOL_RESUME_PAUSED");
				const goal = args.action === "pause" ? ctx.goals.pause(execution.agent, ref) : ctx.goals.resume(execution.agent, ref);
				return Promise.resolve(goalValue(goal));
			}
			const authority = completionAuthority(ctx, execution);
			if (hasText(args.objective) || hasRoundCap(args.max_goal_rounds)) throw new HarnessError("objective and max_goal_rounds are valid only with action edit", "GOAL_TOOL_INVALID_UPDATE");
			if (args.action === "complete" && hasText(args.blocked_reason)) throw new HarnessError("blocked_reason is valid only with action blocked", "GOAL_TOOL_INVALID_UPDATE");
			if (args.action === "blocked" && (args.blocked_reason === void 0 || args.blocked_reason.trim().length === 0)) throw new HarnessError("blocked_reason is required with action blocked", "GOAL_TOOL_INVALID_UPDATE");
			if (args.action === "blocked" && authority.kind === "goal-round" && authority.goal.roundsStarted < resolved.blockedAfterConsecutiveRounds) throw new HarnessError(`blocked requires at least ${resolved.blockedAfterConsecutiveRounds} consecutive goal rounds; current round is ${authority.goal.roundsStarted}`, "GOAL_TOOL_BLOCK_THRESHOLD");
			const goal = args.action === "complete" ? ctx.goals.complete(execution.agent, ref) : ctx.goals.block(execution.agent, ref, {
				code: "model-reported",
				message: args.blocked_reason
			});
			if (authority.kind === "goal-round") exec.deferContext(createUserMessage({
				content: args.action === "complete" ? renderWrapupContext(goal.objective) : renderWrapupContext(goal.objective, args.blocked_reason),
				source: {
					kind: "plugin",
					plugin: "tool-goal",
					form: "notice",
					summary: boundContextSummary(`${args.action}: ${goal.objective}`)
				}
			}));
			return Promise.resolve(goalValue(goal));
		},
		presentCall: (args) => present(`${args.action === "blocked" ? "Mark" : args.action.charAt(0).toUpperCase() + args.action.slice(1)} goal`, "other", hasText(args.blocked_reason) ? args.blocked_reason : hasText(args.objective) ? args.objective : hasRoundCap(args.max_goal_rounds) ? args.max_goal_rounds : args.goal_id)
	}));
}
//#endregion
export { Config, apply, inject, name };
