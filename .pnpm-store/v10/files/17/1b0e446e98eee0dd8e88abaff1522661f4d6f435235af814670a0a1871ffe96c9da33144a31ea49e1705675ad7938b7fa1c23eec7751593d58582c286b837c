import { Service } from "@deepseek-ai/cordis";
import { z } from "zod";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { UserQuestionError } from "@deepseek-ai/dsh-user-questions";
//#region lib/types/index.js
/**
* Plan mode is logged per-agent collaboration state: while active, a
* deployment-owned guidance section is included in each model request, and
* `exit_plan_mode` presents the completed plan for user review, while the
* `/plan off` command lets a user leave directly. Sandbox mode and approval
* policy enforce restrictions independently and do not read or write plan
* state.
*
* The `plan` projection folds the session log, so resume and fork restore the
* state. User selections remain pending until the next accepted in-turn
* pre-step. The service includes the selected state in the proposed step
* assembly, then appends `plan/mode` from `agent/pre-step` only when the step
* is accepted. Same-step request retries reuse their assembly.
*
* The exit tool remains registered while plan mode is inactive, so entering
* or leaving plan mode changes only the prompt section, not the request tool
* catalog.
*
* Agent Note:
* - .agents/notes/implemented/simplification/2026-07-22-plan-specific-collaboration-state.md
*
* @module @deepseek-ai/dsh-plan-mode
*/
/**
* The model-facing exit tool's name. It stays registered while plan mode is
* inactive so the request tool catalog is stable across transitions.
*/
const EXIT_PLAN_MODE = "exit_plan_mode";
/** The review question's id, echoed in the answer this tool reads. */
const REVIEW_ID = "plan-review";
/** The review question's approve option label. */
const APPROVE_LABEL = "Approve";
/** The review question's keep-planning option label. */
const KEEP_PLANNING_LABEL = "Keep planning";
const EXIT_DESCRIPTION = "Use only in plan mode. Present your plan for the user's review and, on approval, leave plan mode. Send the COMPLETE plan as markdown, starting with a # heading that names it. The user may approve (carry out the plan from your next step) or keep planning — their feedback comes back in the tool result; revise and present again.";
/** The plan's first markdown heading (any level), or `undefined` when it has none. */
function firstHeading(plan) {
	for (const line of plan.split("\n")) {
		const match = /^#{1,6}\s+(.+?)\s*$/.exec(line);
		if (match) return match[1];
	}
}
/**
* Validate deployment-owned plan guidance. Missing, blank, non-string, or
* unknown fields fail at plugin load rather than being ignored.
*
* @param config Raw plugin config.
* @returns A detached validated config.
*/
function resolveConfig(config) {
	const section = config.section;
	if (typeof section !== "string") throw new Error("PlanModeConfig needs a string `section`");
	if (section.trim() === "") throw new Error("PlanModeConfig needs a non-empty `section`");
	const unknown = Object.keys(config).filter((key) => key !== "section");
	if (unknown.length > 0) throw new Error(`PlanModeConfig has unknown key(s) ${unknown.join(", ")} — config is { section }`);
	return { section };
}
/** Projection of logged plan selections and committed mode. */
const planProjectionDefinition = {
	key: "plan",
	stateVersion: 3,
	stateSchema: z.object({
		active: z.boolean(),
		wanted: z.boolean().nullable(),
		running: z.object({
			commandId: z.string(),
			wanted: z.boolean()
		}).strict().nullable(),
		activeAtLastHeader: z.boolean().nullable()
	}).strict(),
	init: () => ({
		active: false,
		wanted: null,
		running: null,
		activeAtLastHeader: null
	}),
	apply: (state, event) => {
		if (event.type === "command/run" && event.data.name === "plan") {
			if (event.data.args === void 0) return state;
			const wanted = event.data.args.trim() !== "off";
			return {
				...state,
				running: {
					commandId: event.data.commandId,
					wanted
				}
			};
		}
		if (event.type === "command/done" && event.data.commandId === state.running?.commandId) {
			const wanted = event.data.kind === "success" && state.running.wanted !== state.active ? state.running.wanted : null;
			return {
				...state,
				wanted,
				running: null
			};
		}
		if (event.type === "plan/mode") return {
			...state,
			active: event.data.active,
			wanted: null
		};
		if (event.type === "request/header") return {
			...state,
			activeAtLastHeader: state.active
		};
		return state;
	},
	wire: {
		viewSchema: z.object({
			active: z.boolean(),
			pending: z.boolean()
		}),
		view: (state) => {
			const wanted = state.running?.wanted ?? state.wanted;
			return {
				active: state.active,
				pending: wanted !== null && wanted !== state.active
			};
		}
	}
};
/**
* `ctx.planMode`: owns logged plan state, applies and narrates selected state at step start,
* the `plan:policy` section, the `/plan` command, and the stable exit tool.
* Client carriers expose the projection's cropped `{ active, pending }` view.
*/
var PlanModeController = class extends Service {
	static inject = [
		"tools",
		"systemPrompt",
		"sessionProjections"
	];
	/** Validated deployment-owned guidance. */
	section;
	/**
	* Latest selection per session awaiting the next accepted in-turn pre-step.
	* `narrate` is true for user selections and false for the exit tool, whose
	* result already narrates the transition.
	*/
	pendingIntents = /* @__PURE__ */ new WeakMap();
	constructor(ctx, config = { section: "" }) {
		super(ctx, "planMode");
		this.section = resolveConfig(config).section;
		let disposed = false;
		ctx.on("agent/pre-step", async ({ agent, signal }, next) => {
			const decision = await next();
			const pending = this.pendingIntents.get(agent.session);
			if (decision.kind === "reject" || signal.aborted || pending === void 0) return decision;
			const narration = this.narration(agent.session, pending.active);
			try {
				this.onBoundary(agent.session);
			} catch (error) {
				ctx.logger.warn("dsh-plan-mode: failed to append selected plan mode at step start: %o", error);
				return decision;
			}
			return !pending.narrate || narration === void 0 ? decision : {
				...decision,
				messages: [...decision.messages, narration]
			};
		});
		ctx.effect(() => () => {
			disposed = true;
		}, "dsh-plan-mode: close service lifetime");
		ctx.systemPrompt.section({
			name: "plan:policy",
			order: ctx.systemPrompt.getSectionOrder("PLAN_POLICY"),
			text: (context) => {
				if (context.agent === void 0) return "";
				return this.pendingIntents.get(context.agent.session)?.active ?? this.loggedActive(context.agent.session) ? this.section : "";
			}
		});
		ctx.sessionProjections.register(planProjectionDefinition);
		ctx.inject(["commands"], (commandCtx) => {
			commandCtx.commands.register({
				name: "plan",
				description: "Enter or leave plan mode",
				input: {
					hint: "[off|message]",
					attachments: true
				},
				handler: ({ agent, rawInput, attachments }) => {
					const message = rawInput.trim();
					if (message === "off" && attachments.length > 0) return {
						kind: "error",
						text: "Attachments cannot accompany /plan off."
					};
					if (message === "off") switch (this.set(agent, false)) {
						case "committed": return {
							kind: "success",
							text: "Plan mode off."
						};
						case "queued": return {
							kind: "success",
							text: "Leaving plan mode (applies from the next step)."
						};
						case "cancelled": return {
							kind: "success",
							text: "Plan mode entry cancelled."
						};
						case "noop": return this.loggedActive(agent.session) ? {
							kind: "success",
							text: "Leaving plan mode (applies from the next step)."
						} : {
							kind: "success",
							text: "Plan mode is already inactive."
						};
					}
					const outcome = this.set(agent, true);
					if (message !== "" || attachments.length > 0) agent.steer(createUserMessage({
						content: [...attachments, ...message === "" ? [] : [{
							type: "text",
							text: message
						}]],
						source: { kind: "user" }
					}));
					return {
						kind: "success",
						text: outcome === "committed" ? "Plan mode on. Use /plan off to leave." : "Entering plan mode (applies from the next step). Use /plan off to leave."
					};
				}
			});
		});
		ctx.tools.register(defineTool({
			name: EXIT_PLAN_MODE,
			description: EXIT_DESCRIPTION,
			parameters: { plan: {
				type: "string",
				required: true,
				description: "The complete plan, as markdown, starting with a # heading that names it."
			} },
			output: {
				schema: {
					type: "object",
					additionalProperties: false,
					properties: { approved: {
						type: "boolean",
						const: true,
						required: true
					} }
				},
				render: () => [{
					type: "text",
					text: "Plan approved — plan mode exited; carry out the plan starting with your next step."
				}]
			},
			execute: async (args, exec) => {
				const agent = exec.agent;
				if (agent === void 0) throw new Error(`${EXIT_PLAN_MODE} requires a calling agent (no session to switch)`);
				if (!this.loggedActive(agent.session)) throw new Error(`${EXIT_PLAN_MODE} is only available in plan mode`);
				if (!/^#\s+\S/.test(args.plan.trim())) throw new Error(`${EXIT_PLAN_MODE} requires a non-empty markdown plan starting with a # heading`);
				const interaction = ctx.get("userQuestions");
				if (interaction === void 0) throw new Error("no user-questions channel is available to review the plan; ask the user to switch the session mode instead");
				const answer = await interaction.ask({
					questions: [{
						id: REVIEW_ID,
						header: "Plan review",
						question: "Approve this plan and leave plan mode?",
						detail: args.plan,
						options: [{
							label: APPROVE_LABEL,
							description: "Leave plan mode; the plan is carried out from the next step."
						}, {
							label: KEEP_PLANNING_LABEL,
							description: "Stay in plan mode; feedback goes back to the model."
						}],
						intent: {
							kind: "plan-review",
							approve: APPROVE_LABEL
						}
					}],
					agent,
					signal: exec.signal
				}).catch((cause) => {
					if (cause instanceof UserQuestionError && cause.code === "ASK_CANCELLED") throw new Error("The user dismissed the plan review to speak instead; stay in plan mode, stop here, and wait for their message.");
					throw cause;
				});
				if (disposed) throw new Error("the plan-mode service was reloaded while the plan was under review; present the plan again");
				const reviewItems = answer.answers.filter((entry) => entry.id === REVIEW_ID);
				const item = reviewItems.length === 1 ? reviewItems[0] : void 0;
				if (item?.selected.length !== 1 || item.selected[0] !== APPROVE_LABEL || item.custom !== void 0) {
					const feedback = item?.custom ?? "";
					throw new Error(feedback === "" ? "The user chose to keep planning; revise the plan and present it again." : `The user chose to keep planning; their feedback: ${feedback}`);
				}
				this.pendingIntents.set(agent.session, {
					active: false,
					narrate: false
				});
				return { approved: true };
			},
			presentCall: (args) => ({
				card: "generic",
				title: firstHeading(args.plan) ?? "Plan",
				kind: "other",
				content: [{
					type: "text",
					text: args.plan
				}]
			}),
			presentResult: (_args, result) => ({
				card: "generic",
				title: "Plan review",
				content: result.content
			})
		}));
	}
	loggedActive(session) {
		return this.planState(session).active;
	}
	hasOpenTurn(session) {
		const state = this.ctx.sessionProjections.stateOf(session, "turnBoundary");
		if (state === void 0) throw new Error("plan-mode requires the turnBoundary session projection");
		return state.openTurnStartSeq !== null;
	}
	loggedActiveAtLastHeader(session) {
		return this.planState(session).activeAtLastHeader ?? void 0;
	}
	/** Read the required plan projection state or fail at the first service access. */
	planState(session) {
		const state = this.ctx.sessionProjections.stateOf(session, "plan");
		if (state === void 0) throw new Error("plan-mode requires the plan session projection");
		return state;
	}
	/**
	* Read the logged plan state and any selected state awaiting the next
	* accepted in-turn pre-step.
	*
	* @param agent The agent to read.
	* @returns Current logged state plus a pending selection, when present.
	*/
	get(agent) {
		const active = this.loggedActive(agent.session);
		const pending = this.pendingIntents.get(agent.session);
		return pending === void 0 ? { active } : {
			active,
			pending: pending.active
		};
	}
	/**
	* Select whether plan mode should be active. Between turns the method
	* appends the change immediately because no in-turn pre-step will run until
	* another prompt starts a turn. The open-turn fold is the idle signal:
	* agent status stays `running` through post-turn checkpointing, when no
	* further in-turn pre-step runs. During an open turn the selection remains
	* pending until the next accepted in-turn pre-step. Repeated selection of
	* the current or already-pending state is a no-op.
	*
	* @param agent The agent to switch.
	* @param active Whether plan mode should be active.
	* @returns what happened: `committed` (logged now), `queued` (awaiting the
	* next accepted in-turn pre-step), `cancelled` (an opposite pending selection
	* was cleared; the logged state already matches), or `noop` (already in that
	* state).
	*/
	set(agent, active) {
		const session = agent.session;
		if (active === (this.pendingIntents.get(session)?.active ?? this.loggedActive(session))) return "noop";
		if (this.hasOpenTurn(session)) {
			this.pendingIntents.set(session, {
				active,
				narrate: true
			});
			return this.loggedActive(session) === active ? "cancelled" : "queued";
		}
		if (active === this.loggedActive(session)) {
			this.pendingIntents.delete(session);
			return "cancelled";
		}
		session.append("plan/mode", { active });
		this.pendingIntents.delete(session);
		const narration = this.narration(session, active);
		if (narration !== void 0) agent.inject(narration);
		return "committed";
	}
	/** Append one pending selection before the next request assembly. */
	onBoundary(session) {
		const pending = this.pendingIntents.get(session);
		if (pending === void 0) return;
		const target = pending.active;
		if (target === this.loggedActive(session)) {
			this.pendingIntents.delete(session);
			return;
		}
		session.append("plan/mode", { active: target });
		this.pendingIntents.delete(session);
	}
	/** Build a user-switch notice when the last logged header described the other mode. */
	narration(session, target) {
		const told = this.loggedActiveAtLastHeader(session);
		if (told === void 0 || told === target) return;
		const text = target ? "The user switched this session to plan mode." : "The user switched this session back to the default mode.";
		return createUserMessage({
			content: [{
				type: "text",
				text
			}],
			source: {
				kind: "plugin",
				plugin: "plan-mode",
				form: "notice",
				summary: text
			}
		});
	}
};
//#endregion
export { EXIT_PLAN_MODE, PlanModeController, PlanModeController as default, planProjectionDefinition, resolveConfig };
