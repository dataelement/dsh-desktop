import { readFileSync } from "node:fs";
import z from "@deepseek-ai/schemastery";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import { DEFAULT_HOOK_TIMEOUT_MS, DEFAULT_STDERR_SUMMARY_MAX_CHARS, appendHookInvoked, appendHookResult, createDetachedRuns, matcherDiagnostic, matchesMatcher, mergeHookOutputs, runHook } from "@deepseek-ai/dsh-hook-protocol";
//#region lib/types/config.js
/**
* Parse Claude Code's event-to-matcher-group hook format into shared {@link MatcherGroup}s.
* Only command hooks run; other hook types are returned as skipped so the
* bridge can warn. Plugin-root and project-directory substitutions are applied
* to commands at parse time.
* @module @deepseek-ai/dsh-hooks-claude-code/config
*/
const CLAUDE_EVENTS = [
	"SessionStart",
	"UserPromptSubmit",
	"PreToolUse",
	"PostToolUse",
	"Stop",
	"SubagentStart",
	"SubagentStop"
];
/** A plain (non-null, non-array) object, else undefined. */
function asObject(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
/**
* Apply `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PROJECT_DIR}` substitution to a command string.
* @param command - the raw command from config.
* @param vars - the substitution values; a token whose variable is unset stays verbatim.
* @returns the command with every occurrence of each set token replaced.
*/
function substituteCommand(command, vars) {
	let out = command;
	if (vars.pluginRoot !== void 0) out = out.split("${CLAUDE_PLUGIN_ROOT}").join(vars.pluginRoot);
	if (vars.projectDir !== void 0) out = out.split("${CLAUDE_PROJECT_DIR}").join(vars.projectDir);
	return out;
}
/**
* Parse either a settings `hooks` value or a bare `hooks.json` event map. Malformed entries are
* ignored rather than failing boot; unsupported events are ignored before their groups are parsed,
* non-command hooks are returned in `skipped`, and substitutions are applied to every surviving
* command. Matcher fields on UserPromptSubmit and Stop are discarded because those events have no
* matcher subject. A matcher-bearing supported runnable group with an invalid regex throws a
* `SyntaxError`, allowing the bridge to reject the complete config before listener registration.
*
* @param raw - the parsed JSON config: a settings object with a `hooks` key, or the bare
*   event map.
* @param vars - substitution values applied to every surviving `command` (defaults to
*   none).
* @returns the runnable per-event groups plus the skipped non-command hooks.
*/
function parseClaudeCodeConfig(raw, vars = {}) {
	const config = {};
	const skipped = [];
	const root = asObject(raw);
	const hooksMap = root ? asObject(root.hooks) ?? root : void 0;
	if (!hooksMap) return {
		config,
		skipped
	};
	for (const event of CLAUDE_EVENTS) {
		const rawGroups = hooksMap[event];
		if (!Array.isArray(rawGroups)) continue;
		const groups = [];
		for (const rawGroup of rawGroups) {
			const group = asObject(rawGroup);
			if (!group || !Array.isArray(group.hooks)) continue;
			const commands = [];
			for (const rawHook of group.hooks) {
				const hook = asObject(rawHook);
				if (!hook) continue;
				const type = typeof hook.type === "string" ? hook.type : "command";
				if (type !== "command") {
					skipped.push({
						event,
						type
					});
					continue;
				}
				if (typeof hook.command !== "string") continue;
				commands.push({
					command: substituteCommand(hook.command, vars),
					...typeof hook.timeout === "number" ? { timeoutSec: hook.timeout } : {}
				});
			}
			if (commands.length === 0) continue;
			const matcher = event === "UserPromptSubmit" || event === "Stop" ? void 0 : typeof group.matcher === "string" ? group.matcher : void 0;
			const diagnostic = matcherDiagnostic(matcher, "claude-code");
			if (diagnostic !== void 0) throw new SyntaxError(`${diagnostic} on event ${JSON.stringify(event)}`);
			groups.push({
				...matcher !== void 0 ? { matcher } : {},
				hooks: commands
			});
		}
		if (groups.length > 0) config[event] = groups;
	}
	return {
		config,
		skipped
	};
}
//#endregion
//#region lib/types/index.js
/**
* Bridge for unmodified Claude Code command hooks on harness interception
* extension points. It supports SessionStart, prompt/tool pre/post, Stop, and subagent
* start/stop. It owns Claude payloads, environment, substitution, and decision
* mapping; shared execution and parsing live in `dsh-hook-protocol`.
* `updatedInput` is logged and warned but not honored. Bespoke behavior should
* use typed native plugins on the same extension points.
* @module @deepseek-ai/dsh-hooks-claude-code
*/
const name = "hooks-claude-code";
const inject = ["shell", "sessionProjections"];
const Config = z.object({
	configPath: z.string().required(),
	pluginRoot: z.string(),
	projectDir: z.string(),
	defaultTimeoutMs: z.number().default(DEFAULT_HOOK_TIMEOUT_MS),
	stderrSummaryMaxChars: z.number().default(DEFAULT_STDERR_SUMMARY_MAX_CHARS)
});
/** A stable per-handler id so an invoked/result pair correlates in the log. */
let handlerCounter = 0;
function nextHandlerId(point) {
	return `claude-code:${point}:${++handlerCounter}`;
}
/** The `{kind:'plugin'}` source stamped on every context this bridge injects. */
const PLUGIN_SOURCE = {
	kind: "plugin",
	plugin: "hooks-claude-code"
};
/** The summary cap bounds a persisted event field — a positive integer or the slice misbehaves silently. */
function assertPositiveInteger(name, value) {
	if (!Number.isInteger(value) || value < 1) throw new Error(`hooks-claude-code: ${name} must be a positive integer`);
}
function apply(ctx, config) {
	const stderrSummaryMaxChars = config.stderrSummaryMaxChars ?? DEFAULT_STDERR_SUMMARY_MAX_CHARS;
	assertPositiveInteger("stderrSummaryMaxChars", stderrSummaryMaxChars);
	const defaultTimeoutMs = config.defaultTimeoutMs ?? DEFAULT_HOOK_TIMEOUT_MS;
	let parsed = {};
	try {
		const result = parseClaudeCodeConfig(JSON.parse(readFileSync(config.configPath, "utf8")), {
			...config.pluginRoot !== void 0 ? { pluginRoot: config.pluginRoot } : {},
			...config.projectDir !== void 0 ? { projectDir: config.projectDir } : {}
		});
		parsed = result.config;
		for (const s of result.skipped) ctx.logger.warn(`hooks-claude-code: skipping unsupported "${s.type}" hook on ${s.event} (only command hooks run)`);
	} catch (error) {
		ctx.logger.warn(`hooks-claude-code: could not load hook config "${config.configPath}": ${String(error)} — no hooks registered`);
		return;
	}
	const detached = createDetachedRuns();
	const subagentChildren = /* @__PURE__ */ new Map();
	ctx.effect(() => () => detached.drain(), "hooks-claude-code: drain detached hook runs");
	/**
	* Run every command hook configured for `point` whose matcher selects
	* `matchQuery`, with the per-event `payload` on stdin, and fold the results.
	* Writes a `hook/invoked`/`hook/result` pair per hook when `opts.turn` names
	* an open turn. Detached lifecycle points omit the pair. Returns the merged outcome (a neutral,
	* already-most-restrictive view) for the caller to map onto its extension point
	* decision. `matchQuery` is the event's matcher subject (tool name, session
	* source, …); `''` for events that ignore matchers.
	*/
	async function runPoint(point, matchQuery, payload, opts) {
		const groups = parsed[point] ?? [];
		const outputs = [];
		const workdir = opts.agent?.session.header.cwd;
		const projectDir = config.projectDir ?? workdir;
		const hookEnv = projectDir !== void 0 ? { CLAUDE_PROJECT_DIR: projectDir } : void 0;
		for (const group of groups) {
			if (!matchesMatcher(group.matcher, matchQuery, "claude-code")) continue;
			for (const hook of group.hooks) {
				const handlerId = nextHandlerId(point);
				const session = opts.agent?.session;
				if (session && opts.turn !== void 0) appendHookInvoked(session, {
					turn: opts.turn,
					point,
					dialect: "claude-code",
					handlerId,
					...group.matcher !== void 0 ? { matcher: group.matcher } : {}
				});
				const { output, durationMs } = await runHook(ctx.shell, hook, {
					payload,
					defaultTimeoutMs,
					...hookEnv ? { env: hookEnv } : {},
					...workdir !== void 0 ? { cwd: workdir } : {},
					signal: opts.signal,
					trailingNewline: true,
					expectedEventName: point
				}, () => performance.now());
				outputs.push(output);
				if (output.updatedInput !== void 0) ctx.logger.warn(`hooks-claude-code: ${point} hook requested updatedInput, which is not yet honored (ignored)`);
				if (output.systemMessage !== void 0) ctx.logger.warn(`hooks-claude-code: ${point} hook emitted a systemMessage, which is not yet surfaced (ignored)`);
				if (session && opts.turn !== void 0) appendHookResult(session, {
					turn: opts.turn,
					point,
					handlerId,
					output,
					stderrSummaryMaxChars,
					durationMs
				});
			}
		}
		return mergeHookOutputs(outputs);
	}
	/** Build additional model context from hook output, or return undefined when empty. */
	function contextFrom(merged) {
		if (merged.additionalContext.length === 0) return void 0;
		return createUserMessage({
			content: merged.additionalContext.map((text) => ({
				type: "text",
				text
			})),
			source: PLUGIN_SOURCE
		});
	}
	/** Prepend one context without flattening source fields or other downstream metadata. */
	function prependContext(ours, theirs) {
		return [ours, ...theirs ?? []];
	}
	ctx.on("agent/session-start", ({ agent, source }) => {
		detached.track(runPoint("SessionStart", source, sessionStartPayload(agent, source), {
			agent,
			signal: detached.signal
		}).then((merged) => {
			const context = contextFrom(merged);
			if (context) agent.inject(context);
		}).catch((error) => {
			ctx.logger.warn(`hooks-claude-code: SessionStart hook failed: ${String(error)}`);
		}));
	});
	ctx.on("agent/pre-step", async ({ agent, messages, turn, signal }, next) => {
		if (messages.length === 0) return next();
		const merged = await runPoint("UserPromptSubmit", "", promptPayload(agent, messages.flatMap((message) => message.content)), {
			agent,
			turn,
			signal
		});
		if (merged.decision === "deny") return { kind: "reject" };
		const downstream = await next();
		const ours = contextFrom(merged);
		if (!ours || downstream.kind !== "enter") return downstream;
		return {
			...downstream,
			messages: [...downstream.messages, ours]
		};
	});
	ctx.on("tools/pre-execute", async (exec, next) => {
		const turn = lastTurn(ctx, exec.agent);
		const merged = await runPoint("PreToolUse", exec.name, preToolPayload(exec), {
			...exec.agent ? { agent: exec.agent } : {},
			turn,
			signal: exec.signal
		});
		if (merged.decision === "deny") return {
			kind: "deny",
			reason: merged.reason ?? "blocked by PreToolUse hook"
		};
		if (merged.decision === "ask") return {
			kind: "ask",
			...merged.reason !== void 0 ? { reason: merged.reason } : {}
		};
		return next();
	});
	ctx.on("tools/post-execute", async (exec, result, next) => {
		const turn = lastTurn(ctx, exec.agent);
		const merged = await runPoint("PostToolUse", exec.name, postToolPayload(exec, result), {
			...exec.agent ? { agent: exec.agent } : {},
			turn,
			signal: exec.signal
		});
		const context = contextFrom(merged);
		if (merged.decision === "deny") return {
			kind: "block",
			feedback: [{
				type: "text",
				text: merged.reason ?? "blocked by PostToolUse hook"
			}],
			...context ? { additionalContexts: [context] } : {}
		};
		const downstream = await next();
		if (!context) return downstream;
		if (downstream.kind === "block") return {
			...downstream,
			additionalContexts: prependContext(context, downstream.additionalContexts)
		};
		return {
			...downstream,
			additionalContexts: prependContext(context, downstream.additionalContexts)
		};
	});
	ctx.on("agent/turn-stopping", async ({ agent, turn, signal }) => {
		const merged = await runPoint("Stop", "", stopPayload(agent), {
			agent,
			turn,
			signal
		});
		if (merged.decision === "deny") {
			const text = merged.reason ?? "continue: blocked by Stop hook";
			agent.steer(createUserMessage({
				content: [{
					type: "text",
					text
				}],
				source: PLUGIN_SOURCE
			}));
		}
	});
	ctx.on("subagent/start", (info) => {
		const child = ctx.get("agents")?.get(info.id);
		if (child !== void 0) subagentChildren.set(info.runId, child);
		detached.track(runPoint("SubagentStart", SUBAGENT_TYPE, subagentPayload("SubagentStart", info, child), {
			...child ? { agent: child } : {},
			signal: detached.signal
		}).then((merged) => {
			const context = contextFrom(merged);
			if (context && child) child.inject(context);
		}).catch((error) => {
			ctx.logger.warn(`hooks-claude-code: SubagentStart hook failed: ${String(error)}`);
		}));
	});
	ctx.on("subagent/end", (info) => {
		const child = subagentChildren.get(info.runId) ?? ctx.get("agents")?.get(info.id);
		subagentChildren.delete(info.runId);
		detached.track(runPoint("SubagentStop", SUBAGENT_TYPE, subagentPayload("SubagentStop", info, child), {
			...child ? { agent: child } : {},
			signal: detached.signal
		}));
	});
}
/**
* The `agent_type` value the bridge reports for SubagentStart/Stop. The harness
* subagent seam carries no per-kind label, so the bridge uses Claude Code's own
* Task-tool default — a hooks.json with a default/`*`/empty `agent_type` matcher
* fires; a config matching a specific kind (e.g. `code-reviewer`) does not.
*/
const SUBAGENT_TYPE = "general-purpose";
/** The last open turn number in the agent's log, or 0 without an agent. */
function lastTurn(ctx, agent) {
	if (!agent) return 0;
	return ctx.sessionProjections.stateOf(agent.session, "turnBoundary").lastTurn;
}
/** Flatten content blocks to the text a hook payload carries (the common case). */
function blocksToText(content) {
	return content.filter((b) => b.type === "text").map((b) => b.text).join("");
}
function base(agent, event) {
	return {
		session_id: agent?.session.header.id ?? "",
		transcript_path: "",
		cwd: agent?.session.header.cwd ?? process.cwd(),
		hook_event_name: event
	};
}
function sessionStartPayload(agent, source) {
	return {
		...base(agent, "SessionStart"),
		source
	};
}
function promptPayload(agent, content) {
	return {
		...base(agent, "UserPromptSubmit"),
		prompt: blocksToText(content)
	};
}
function preToolPayload(exec) {
	return {
		...base(exec.agent, "PreToolUse"),
		tool_name: exec.name,
		tool_input: exec.arguments,
		tool_use_id: exec.callId
	};
}
function postToolPayload(exec, result) {
	return {
		...base(exec.agent, "PostToolUse"),
		tool_name: exec.name,
		tool_input: exec.arguments,
		tool_use_id: exec.callId,
		tool_response: blocksToText(result.content)
	};
}
function stopPayload(agent) {
	return {
		...base(agent, "Stop"),
		stop_hook_active: false
	};
}
/**
* Build a SubagentStart/SubagentStop payload from the CC base (the child's
* `session_id`/`cwd` when the child agent is available) plus the subagent-hook
* fields. `agent_type` is the CC-default {@link SUBAGENT_TYPE}; `stop_hook_active`
* is present on SubagentStop only (the loop-guard flag, always false).
*/
function subagentPayload(event, info, child) {
	return {
		...base(child, event),
		agent_id: info.id,
		agent_type: SUBAGENT_TYPE,
		...event === "SubagentStop" ? { stop_hook_active: false } : {}
	};
}
//#endregion
export { Config, apply, inject, name };
