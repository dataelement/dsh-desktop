import { readFileSync } from "node:fs";
import z from "@deepseek-ai/schemastery";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import { DEFAULT_HOOK_TIMEOUT_MS, DEFAULT_STDERR_SUMMARY_MAX_CHARS, appendHookInvoked, appendHookResult, createDetachedRuns, matcherDiagnostic, matchesMatcher, mergeHookOutputs, runHook } from "@deepseek-ai/dsh-hook-protocol";
//#region lib/types/config.js
/**
* Parse Codex's five-event hook subset into shared {@link MatcherGroup}s. Only synchronous command
* hooks run; other types and `async: true` commands are recorded as skipped. Codex performs no
* command substitution.
* @module @deepseek-ai/dsh-hooks-codex/config
*/
/** The five Codex hook points this bridge supports. */
const CODEX_EVENTS = [
	"PreToolUse",
	"PostToolUse",
	"SessionStart",
	"UserPromptSubmit",
	"Stop"
];
function asObject(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
/**
* Parse a wrapped or bare Codex event map. Unknown events and malformed entries are ignored rather
* than failing boot; unsupported or asynchronous hooks are returned in `skipped`. Matcher fields on
* UserPromptSubmit and Stop are discarded because those events have no matcher subject. A
* matcher-bearing runnable group with an invalid regex throws a `SyntaxError`, allowing the bridge
* to reject the complete config before listener registration.
* @param raw - the parsed JSON config: a `{ hooks: … }` wrapper or the bare event map.
* @returns the runnable per-event groups plus the skipped hooks with their reasons.
*/
function parseCodexConfig(raw) {
	const config = {};
	const skipped = [];
	const root = asObject(raw);
	const hooksMap = root ? asObject(root.hooks) ?? root : void 0;
	if (!hooksMap) return {
		config,
		skipped
	};
	for (const event of CODEX_EVENTS) {
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
						reason: `unsupported "${type}" hook`
					});
					continue;
				}
				if (hook.async === true) {
					skipped.push({
						event,
						reason: "async hook"
					});
					continue;
				}
				if (typeof hook.command !== "string") continue;
				const timeout = typeof hook.timeout === "number" ? hook.timeout : typeof hook.timeoutSec === "number" ? hook.timeoutSec : void 0;
				commands.push({
					command: hook.command,
					...timeout !== void 0 ? { timeoutSec: timeout } : {}
				});
			}
			if (commands.length === 0) continue;
			const matcher = event === "UserPromptSubmit" || event === "Stop" ? void 0 : typeof group.matcher === "string" ? group.matcher : void 0;
			const diagnostic = matcherDiagnostic(matcher, "codex");
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
* Bridge for unmodified Codex command hooks on harness interception points. It
* supports five points (SessionStart, prompt/tool pre/post, Stop), regex-only
* matchers, snake_case payloads without a trailing newline, no hook environment
* or command substitution, and no pre-tool approval or rewrite path; only
* blocking decisions are honored. Shared execution and parsing live in
* `dsh-hook-protocol`.
* @module @deepseek-ai/dsh-hooks-codex
*/
const name = "hooks-codex";
const inject = ["shell", "sessionProjections"];
const Config = z.object({
	configPath: z.string().required(),
	model: z.string().default(""),
	defaultTimeoutMs: z.number().default(DEFAULT_HOOK_TIMEOUT_MS),
	stderrSummaryMaxChars: z.number().default(DEFAULT_STDERR_SUMMARY_MAX_CHARS)
});
let handlerCounter = 0;
function nextHandlerId(point) {
	return `codex:${point}:${++handlerCounter}`;
}
const PLUGIN_SOURCE = {
	kind: "plugin",
	plugin: "hooks-codex"
};
/** The summary cap bounds a persisted event field — a positive integer or the slice misbehaves silently. */
function assertPositiveInteger(name, value) {
	if (!Number.isInteger(value) || value < 1) throw new Error(`hooks-codex: ${name} must be a positive integer`);
}
function apply(ctx, config) {
	const stderrSummaryMaxChars = config.stderrSummaryMaxChars ?? DEFAULT_STDERR_SUMMARY_MAX_CHARS;
	assertPositiveInteger("stderrSummaryMaxChars", stderrSummaryMaxChars);
	const defaultTimeoutMs = config.defaultTimeoutMs ?? DEFAULT_HOOK_TIMEOUT_MS;
	let parsed = {};
	try {
		const result = parseCodexConfig(JSON.parse(readFileSync(config.configPath, "utf8")));
		parsed = result.config;
		for (const s of result.skipped) ctx.logger.warn(`hooks-codex: skipping ${s.reason} on ${s.event} (only sync command hooks run)`);
	} catch (error) {
		ctx.logger.warn(`hooks-codex: could not load hook config "${config.configPath}": ${String(error)} — no hooks registered`);
		return;
	}
	const model = config.model ?? "";
	const detached = createDetachedRuns();
	ctx.effect(() => () => detached.drain(), "hooks-codex: drain detached hook runs");
	/**
	* Run and fold one configured Codex hook point.
	*
	* A supplied turn records the hook invocation/result pair inside that open turn.
	* Detached lifecycle points omit it.
	*/
	async function runPoint(point, matchQuery, payload, opts) {
		const groups = parsed[point] ?? [];
		const outputs = [];
		const workdir = opts.agent?.session.header.cwd;
		for (const group of groups) {
			if (!matchesMatcher(group.matcher, matchQuery, "codex")) continue;
			for (const hook of group.hooks) {
				const handlerId = nextHandlerId(point);
				const session = opts.agent?.session;
				if (session && opts.turn !== void 0) appendHookInvoked(session, {
					turn: opts.turn,
					point,
					dialect: "codex",
					handlerId,
					...group.matcher !== void 0 ? { matcher: group.matcher } : {}
				});
				const { output, durationMs } = await runHook(ctx.shell, hook, {
					payload,
					defaultTimeoutMs,
					...workdir !== void 0 ? { cwd: workdir } : {},
					signal: opts.signal,
					trailingNewline: false,
					expectedEventName: point
				}, () => performance.now());
				if (opts.plainStdoutAsContext === true && output.exitCode === 0 && output.additionalContext === void 0 && output.stdout.length > 0 && !output.stdout.startsWith("{")) output.additionalContext = output.stdout;
				outputs.push(output);
				if (output.systemMessage !== void 0) ctx.logger.warn(`hooks-codex: ${point} hook emitted a systemMessage, which is not yet surfaced (ignored)`);
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
		detached.track(runPoint("SessionStart", source, {
			...base(agent, "SessionStart", model),
			source
		}, {
			agent,
			plainStdoutAsContext: true,
			signal: detached.signal
		}).then((merged) => {
			const context = contextFrom(merged);
			if (context) agent.inject(context);
		}).catch((error) => {
			ctx.logger.warn(`hooks-codex: SessionStart hook failed: ${String(error)}`);
		}));
	});
	ctx.on("agent/pre-step", async ({ agent, messages, turn, signal }, next) => {
		if (messages.length === 0) return next();
		const merged = await runPoint("UserPromptSubmit", "", {
			...base(agent, "UserPromptSubmit", model),
			turn_id: String(turn),
			prompt: blocksToText(messages.flatMap((message) => message.content))
		}, {
			agent,
			turn,
			plainStdoutAsContext: true,
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
		const merged = await runPoint("PreToolUse", exec.name, preToolPayload(ctx, exec, model), {
			...exec.agent ? { agent: exec.agent } : {},
			turn,
			signal: exec.signal
		});
		if (merged.decision === "deny") return {
			kind: "deny",
			reason: merged.reason ?? "blocked by PreToolUse hook"
		};
		return next();
	});
	ctx.on("tools/post-execute", async (exec, result, next) => {
		const turn = lastTurn(ctx, exec.agent);
		const merged = await runPoint("PostToolUse", exec.name, postToolPayload(ctx, exec, result, model), {
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
		const merged = await runPoint("Stop", "", {
			...turnBase(ctx, agent, "Stop", model),
			stop_hook_active: false,
			last_assistant_message: null
		}, {
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
}
function lastTurn(ctx, agent) {
	if (!agent) return 0;
	/* v8 ignore next -- agent-present hook points run inside AgentLoop, which owns this projection. */
	return ctx.sessionProjections.stateOf(agent.session, "turnBoundary")?.lastTurn ?? 0;
}
function blocksToText(content) {
	return content.filter((b) => b.type === "text").map((b) => b.text).join("");
}
/** Base fields on every Codex payload (no turn_id). */
function base(agent, event, model) {
	return {
		session_id: agent?.session.header.id ?? "",
		transcript_path: null,
		cwd: agent?.session.header.cwd ?? process.cwd(),
		hook_event_name: event,
		model,
		permission_mode: "default"
	};
}
/** Base + turn_id, for the turn-scoped events (PreToolUse/PostToolUse/UserPromptSubmit/Stop). */
function turnBase(ctx, agent, event, model) {
	return {
		...base(agent, event, model),
		turn_id: String(lastTurn(ctx, agent))
	};
}
/** Extract a `command` string from a tool call's parsed arguments, else ''. */
function commandOf(args) {
	if (typeof args === "object" && args !== null && "command" in args) {
		const command = args.command;
		if (typeof command === "string") return command;
	}
	return "";
}
function preToolPayload(ctx, exec, model) {
	return {
		...turnBase(ctx, exec.agent, "PreToolUse", model),
		tool_name: exec.name,
		tool_input: { command: commandOf(exec.arguments) },
		tool_use_id: exec.callId
	};
}
function postToolPayload(ctx, exec, result, model) {
	return {
		...turnBase(ctx, exec.agent, "PostToolUse", model),
		tool_name: exec.name,
		tool_input: { command: commandOf(exec.arguments) },
		tool_use_id: exec.callId,
		tool_response: blocksToText(result.content)
	};
}
//#endregion
export { Config, apply, inject, name };
