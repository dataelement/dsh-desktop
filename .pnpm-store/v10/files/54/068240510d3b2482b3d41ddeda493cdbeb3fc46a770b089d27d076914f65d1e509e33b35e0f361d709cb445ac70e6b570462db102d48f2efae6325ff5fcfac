//#region lib/types/matcher.js
/**
* Matcher shared by both hook dialects. Claude treats alphanumeric/underscore/
* pipe patterns as literal alternatives and other patterns as regex; Codex
* treats every non-empty pattern as an unanchored regex. Missing, empty, and
* `*` match all. Runtime matching contains invalid regexes as non-matches;
* config parsers use {@link matcherDiagnostic} to reject them with a diagnostic.
* @module @deepseek-ai/dsh-hook-protocol/matcher
*/
/** True for an absent / empty / `'*'` pattern — the match-all sentinels. */
function isMatchAll(matcher) {
	return matcher === void 0 || matcher === "" || matcher === "*";
}
/** A Claude-literal pattern is purely word chars + `|` (the regex-vs-literal discriminator). */
const CLAUDE_LITERAL = /^[A-Za-z0-9_|]+$/;
/** Compile an unanchored matcher regex; invalid patterns return `undefined`. */
function compileRegex(pattern) {
	try {
		return new RegExp(pattern);
	} catch (_syntaxError) {
		return;
	}
}
/**
* Validate one matcher before a bridge accepts its config group.
* @param matcher - configured pattern; match-all sentinels are valid.
* @param mode - dialect deciding whether a word-and-pipe pattern is literal.
* @returns `undefined` for a valid matcher, otherwise a stable diagnostic.
*/
function matcherDiagnostic(matcher, mode) {
	if (isMatchAll(matcher)) return void 0;
	const pattern = matcher;
	if (mode === "claude-code" && CLAUDE_LITERAL.test(pattern)) return void 0;
	return compileRegex(pattern) === void 0 ? `invalid ${mode} regex matcher ${JSON.stringify(pattern)}` : void 0;
}
/**
* Whether `matcher` selects `query` under the given dialect. Claude literal
* patterns exact-match pipe-separated alternatives; all other patterns are
* unanchored regexes. Invalid regexes return `false` rather than throwing;
* bridge config parsers surface them through {@link matcherDiagnostic} before use.
* @param matcher - the configured pattern; absent/empty/`'*'` are the match-all sentinels.
* @param query - the candidate value (a tool name, a session source, …).
* @param mode - the dialect deciding literal-vs-regex interpretation of the pattern.
* @returns `true` when the pattern selects the query; `false` on a non-match or an invalid
*   regex.
*/
function matchesMatcher(matcher, query, mode) {
	if (isMatchAll(matcher)) return true;
	const pattern = matcher;
	if (mode === "claude-code" && CLAUDE_LITERAL.test(pattern)) return pattern.split("|").includes(query);
	return compileRegex(pattern)?.test(query) ?? false;
}
//#endregion
//#region lib/types/codec.js
/**
* Decode hook process outcomes for both dialects. Exit 0 may carry structured
* JSON or plain stdout; exit 2 blocks with stderr as the reason; every other
* exit is a non-blocking error. Bridges decide which recognized fields apply.
* @module @deepseek-ai/dsh-hook-protocol/codec
*/
/** The exit code a hook uses to signal a blocking error (stderr → model). */
const BLOCKING_EXIT_CODE = 2;
/** Read a string field from a parsed object, or `undefined` if absent/wrong type. */
function str(obj, key) {
	const v = obj[key];
	return typeof v === "string" ? v : void 0;
}
/** Read a boolean field, or `undefined` if absent/wrong type. */
function bool(obj, key) {
	const v = obj[key];
	return typeof v === "boolean" ? v : void 0;
}
/** A plain (non-null, non-array) object, or `undefined`. */
function obj(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
/**
* The legacy TOP-LEVEL `decision` is only `approve`/`block` in both reference
* schemas — `allow`/`deny`/`ask` are reserved for `hookSpecificOutput.
* permissionDecision`. So an out-of-band `{"decision":"deny"}` is invalid and
* ignored here (it must not become a real blocking decision).
*/
function topLevelDecisionOf(value) {
	return value === "approve" || value === "block" ? value : void 0;
}
/** A `hookSpecificOutput.permissionDecision` is `allow`/`deny`/`ask` only. */
function permissionDecisionOf(value) {
	return value === "allow" || value === "deny" || value === "ask" ? value : void 0;
}
/**
* Decode process output into a dialect-neutral hook outcome. This function is
* total: malformed JSON remains plain stdout. When `expectedEventName` is set,
* a missing or different `hookSpecificOutput.hookEventName` discards only its
* event-scoped fields; top-level fields and the claimed discriminator remain.
* Omitting the guard applies the block as-is.
* @param exitCode - process exit, or `undefined` when spawn failed.
* @param stdout - output parsed as structured JSON only on exit 0.
* @param stderr - the captured stderr stream; becomes the blocking `reason` on exit 2.
* @param expectedEventName - firing event used to guard hook-specific fields; omit to disable the guard.
* @returns the dialect-neutral decoded outcome.
*/
function parseHookOutput(exitCode, stdout, stderr, expectedEventName) {
	const trimmedErr = stderr.trim();
	const trimmedOut = stdout.trim();
	const output = {
		exitCode,
		stderr: trimmedErr,
		stdout: trimmedOut
	};
	if (exitCode === BLOCKING_EXIT_CODE) {
		output.decision = "block";
		if (trimmedErr.length > 0) output.reason = trimmedErr;
	}
	if (exitCode === 0) {
		if (trimmedOut.startsWith("{")) {
			let parsed;
			try {
				parsed = obj(JSON.parse(trimmedOut));
			} catch {
				parsed = void 0;
			}
			if (parsed) applyStructured(output, parsed, expectedEventName);
		}
	}
	return output;
}
/**
* Fold a parsed structured-stdout object into `output` (mutates in place).
* `expectedEventName` (the firing event) gates the per-event `hookSpecificOutput`
* block: a block whose `hookEventName` names a different event — OR omits it — has
* its event-scoped fields discarded (any present `hookEventName` is still recorded).
*/
function applyStructured(output, parsed, expectedEventName) {
	const cont = bool(parsed, "continue");
	if (cont !== void 0) output.continue = cont;
	const stopReason = str(parsed, "stopReason");
	if (stopReason !== void 0) output.stopReason = stopReason;
	const sysMsg = str(parsed, "systemMessage");
	if (sysMsg !== void 0) output.systemMessage = sysMsg;
	const topDecision = topLevelDecisionOf(str(parsed, "decision"));
	if (topDecision !== void 0) output.decision = topDecision;
	const topReason = str(parsed, "reason");
	if (topReason !== void 0) output.reason = topReason;
	const hso = obj(parsed.hookSpecificOutput);
	if (hso) {
		const eventName = str(hso, "hookEventName");
		if (eventName !== void 0) output.hookEventName = eventName;
		if (expectedEventName !== void 0 && eventName !== expectedEventName) return;
		const permission = permissionDecisionOf(str(hso, "permissionDecision"));
		if (permission !== void 0) output.decision = permission;
		const permissionReason = str(hso, "permissionDecisionReason");
		if (permissionReason !== void 0) output.reason = permissionReason;
		const addCtx = str(hso, "additionalContext");
		if (addCtx !== void 0) output.additionalContext = addCtx;
		const updated = obj(hso.updatedInput);
		if (updated !== void 0) output.updatedInput = updated;
	}
}
//#endregion
//#region lib/types/runner.js
/**
* Execute command hooks through `ctx.shell`, using its credential scrub,
* process-group cancellation, and timeout machinery. The bridge supplies the
* trusted stdin payload and dialect environment, then this module decodes the
* captured outcome.
* @module @deepseek-ai/dsh-hook-protocol/runner
*/
/**
* The reference default per-hook timeout, in ms (10 minutes) — the value both
* Claude Code and Codex apply to a hook whose config sets no `timeout`. It
* lives here, once, as the protocol's default; the bridges' `defaultTimeoutMs`
* config defaults to it, and a per-hook {@link CommandHook.timeoutSec} is the
* override API.
*/
const DEFAULT_HOOK_TIMEOUT_MS = 6e5;
/**
* Run `hook` with serialized stdin and decode its outcome. A hook-specific
* timeout in seconds overrides the default; trusted environment entries merge
* after the executor scrub. Infrastructure rejection becomes an outcome with
* no exit code, so this function never throws or crashes the calling turn.
* @param bash - The executor service the command runs through.
* @param hook - the configured command; its `timeoutSec` (wire unit: seconds) overrides the default timeout.
* @param options - the invocation's payload, env, cwd, signal, stdin framing, and default timeout.
* @param now - millisecond clock used for the reported duration.
* @returns the decoded output plus the run's wall-clock duration.
*/
async function runHook(bash, hook, options, now) {
	const started = now();
	const timeoutMs = hook.timeoutSec !== void 0 ? hook.timeoutSec * 1e3 : options.defaultTimeoutMs;
	const stdin = JSON.stringify(options.payload) + (options.trailingNewline ? "\n" : "");
	const request = {
		command: hook.command,
		timeoutMs,
		stdin,
		signal: options.signal,
		...options.cwd !== void 0 ? { workdir: options.cwd } : {},
		...options.env !== void 0 ? { env: options.env } : {}
	};
	try {
		const result = await bash.run(bash.resolve(request));
		return {
			output: parseHookOutput(result.exitCode ?? void 0, result.stdout.text, result.stderr.text, options.expectedEventName),
			durationMs: now() - started
		};
	} catch (error) {
		return {
			output: parseHookOutput(void 0, "", error instanceof Error ? error.message : String(error)),
			durationMs: now() - started
		};
	}
}
//#endregion
//#region lib/types/merge.js
/**
* Merge matched hooks into one most-restrictive outcome. Permission precedence
* is `deny > ask > allow`; the first `continue:false` stop is sticky; reasons
* for the winning rank are joined; and context and system messages accumulate
* in hook order.
* @module @deepseek-ai/dsh-hook-protocol/merge
*/
/** Rank a single hook's decision for the deny>ask>allow precedence (higher = stricter). */
function rank(decision) {
	switch (decision) {
		case "deny":
		case "block": return 3;
		case "ask": return 2;
		case "approve":
		case "allow": return 1;
		default: return 0;
	}
}
/** Collapse a ranked decision back to the merged enum. */
function decisionForRank(maxRank) {
	switch (maxRank) {
		case 3: return "deny";
		case 2: return "ask";
		case 1: return "allow";
		default: return "none";
	}
}
/**
* Fold `outputs` (the results of every hook that matched a point, in hook order)
* into one {@link MergedHookOutcome} by the precedence rules above. An empty list
* yields a neutral outcome (`decision: 'none'`, no stop, empty context) — the
* caller treats that as "no hook had anything to say".
* @param outputs - every matched hook's decoded output, in hook order.
* @returns the single folded outcome the bridge maps onto its extension point.
*/
function mergeHookOutputs(outputs) {
	let maxRank = 0;
	const reasonsByRank = /* @__PURE__ */ new Map();
	let stop = false;
	let stopReason;
	const additionalContext = [];
	const systemMessages = [];
	for (const out of outputs) {
		const r = rank(out.decision);
		if (r > maxRank) maxRank = r;
		if ((r === 3 || r === 2) && out.reason !== void 0 && out.reason.length > 0) {
			const list = reasonsByRank.get(r) ?? [];
			list.push(out.reason);
			reasonsByRank.set(r, list);
		}
		if (out.continue === false && !stop) {
			stop = true;
			if (out.stopReason !== void 0) stopReason = out.stopReason;
		}
		if (out.additionalContext !== void 0 && out.additionalContext.length > 0) additionalContext.push(out.additionalContext);
		if (out.systemMessage !== void 0 && out.systemMessage.length > 0) systemMessages.push(out.systemMessage);
	}
	const reasons = reasonsByRank.get(maxRank) ?? [];
	return {
		decision: decisionForRank(maxRank),
		...reasons.length > 0 ? { reason: reasons.join("\n\n") } : {},
		stop,
		...stopReason !== void 0 ? { stopReason } : {},
		additionalContext,
		systemMessages
	};
}
//#endregion
//#region lib/types/events.js
/**
* Append helpers for durable, log-only hook events. They carry no surface
* intent and must remain turn-enclosed and invoked/result paired. Mid-turn hook
* points satisfy that boundary; SessionStart records injected context instead
* and does not append `hook/*` outside a turn.
* @module @deepseek-ai/dsh-hook-protocol/events
*/
/**
* The reference default for {@link HookResultRecord.stderrSummaryMaxChars}
* (both bridges' config default). It lives here, once, next to the truncation
* rule it bounds, so the bridges cannot drift apart on the shared event's
* default cap.
*/
const DEFAULT_STDERR_SUMMARY_MAX_CHARS = 500;
/**
* Truncate a hook's stderr for {@link HookResultRecord.stderrSummary}: trimmed,
* `undefined` when empty, cut at `maxChars` with an ellipsis when over. The
* bound is a parameter — like `runHook`'s `defaultTimeoutMs`, each bridge owns
* the config default and passes it in.
* @param stderr - the hook's raw captured stderr.
* @param maxChars - the character cap for the summary (the bridge's config value).
* @returns the trimmed, capped summary, or `undefined` when stderr is blank.
*/
function summarizeStderr(stderr, maxChars) {
	const t = stderr.trim();
	if (t.length === 0) return void 0;
	return t.length > maxChars ? t.slice(0, maxChars) + "…" : t;
}
/**
* Append a `hook/invoked` event naming the handler and hook point to `session`.
* @param session - the session whose open turn records the event.
* @param invocation - the invocation identity; an absent `matcher` is omitted from the payload.
*/
function appendHookInvoked(session, invocation) {
	session.append("hook/invoked", {
		turn: invocation.turn,
		point: invocation.point,
		dialect: invocation.dialect,
		handlerId: invocation.handlerId,
		...invocation.matcher !== void 0 ? { matcher: invocation.matcher } : {}
	});
}
/**
* Append the durable result paired with `hook/invoked`. The recorded decision
* is the parsed decision, then `stop` for `continue:false`, else `pass`; stderr
* is trimmed and capped, and an absent process exit stays omitted.
* @param session - the session whose open turn records the event.
* @param record - the outcome to record: the decoded output plus the summary cap and duration.
*/
function appendHookResult(session, record) {
	const { output } = record;
	const stderrSummary = summarizeStderr(output.stderr, record.stderrSummaryMaxChars);
	session.append("hook/result", {
		turn: record.turn,
		point: record.point,
		handlerId: record.handlerId,
		decision: output.decision ?? (output.continue === false ? "stop" : "pass"),
		...output.exitCode !== void 0 ? { exitCode: output.exitCode } : {},
		...stderrSummary !== void 0 ? { stderrSummary } : {},
		durationMs: record.durationMs
	});
}
//#endregion
//#region lib/types/detached.js
/**
* Quiescence tracking for emit-shaped hook runs that no extension point awaits. Bridges
* track the run plus its continuation, pass the tracker signal into execution,
* and drain on disposal so no process or late callback outlives the fiber.
* @module @deepseek-ai/dsh-hook-protocol/detached
*/
/**
* Create a {@link DetachedRuns} tracker (one per bridge `apply()`); settled
* runs are pruned so a long-lived session does not accumulate them.
* @returns the tracker.
*/
function createDetachedRuns() {
	const inflight = /* @__PURE__ */ new Set();
	const controller = new AbortController();
	return {
		signal: controller.signal,
		track(run) {
			inflight.add(run);
			const settled = () => {
				inflight.delete(run);
			};
			run.then(settled, settled);
		},
		async drain() {
			controller.abort(/* @__PURE__ */ new Error("hook bridge disposed"));
			while (inflight.size > 0) await Promise.allSettled([...inflight]);
		}
	};
}
//#endregion
export { DEFAULT_HOOK_TIMEOUT_MS, DEFAULT_STDERR_SUMMARY_MAX_CHARS, appendHookInvoked, appendHookResult, createDetachedRuns, matcherDiagnostic, matchesMatcher, mergeHookOutputs, parseHookOutput, runHook, summarizeStderr };
