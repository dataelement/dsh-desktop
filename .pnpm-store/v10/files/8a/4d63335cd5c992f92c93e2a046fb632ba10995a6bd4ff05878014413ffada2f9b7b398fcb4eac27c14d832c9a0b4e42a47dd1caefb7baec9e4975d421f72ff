import z from "@deepseek-ai/schemastery";
import { BlockAssembler, createUserMessage } from "@deepseek-ai/dsh-llm";
import { MAX_TIMER_DELAY_MS, deadline } from "@deepseek-ai/dsh-timeout";
import { deepFreeze } from "@deepseek-ai/dsh-util-values";
import { SessionTitleProviderId, normalizeSessionTitle } from "@deepseek-ai/dsh-session-title";
//#region lib/types/index.js
/**
* Shared route, framing, timeout, assembly, and validation policy for
* model-backed session-title providers.
* @module @deepseek-ai/dsh-session-title-llm
*/
var __addDisposableResource = function(env, value, async) {
	if (value !== null && value !== void 0) {
		if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
		var dispose, inner;
		if (async) {
			if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
			dispose = value[Symbol.asyncDispose];
		}
		if (dispose === void 0) {
			if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
			dispose = value[Symbol.dispose];
			if (async) inner = dispose;
		}
		if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
		if (inner) dispose = function() {
			try {
				inner.call(this);
			} catch (e) {
				return Promise.reject(e);
			}
		};
		env.stack.push({
			value,
			dispose,
			async
		});
	} else if (async) env.stack.push({ async: true });
	return value;
};
var __disposeResources = (function(SuppressedError) {
	return function(env) {
		function fail(e) {
			env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
			env.hasError = true;
		}
		var r, s = 0;
		function next() {
			while (r = env.stack.pop()) try {
				if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
				if (r.dispose) {
					var result = r.dispose.call(r.value);
					if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
						fail(e);
						return next();
					});
				} else s |= 1;
			} catch (e) {
				fail(e);
			}
			if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
			if (env.hasError) throw env.error;
		}
		return next();
	};
})(typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
	var e = new Error(message);
	return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
/** Capability-owned timeout reason code for auxiliary title requests. */
const SESSION_TITLE_TIMEOUT_CODE = "SESSION_TITLE_TIMEOUT";
/** Shared Loader field schemas with no library defaults. */
const SessionTitleLlmConfigFields = {
	targetWords: z.number().step(1).min(1).required(),
	targetCjkCharacters: z.number().step(1).min(1).required(),
	maxInputBytes: z.number().step(1).min(1).required(),
	maxOutputTokens: z.number().step(1).min(1).required(),
	timeoutMs: z.number().step(1).min(1).max(MAX_TIMER_DELAY_MS).required(),
	provider: z.string(),
	model: z.string()
};
/** Shared Loader schema with no library defaults. */
const SessionTitleLlmConfigSchema = z.object(SessionTitleLlmConfigFields);
/** Complete configuration key set for direct construction validation. */
const CONFIG_KEYS = new Set([
	"targetWords",
	"targetCjkCharacters",
	"maxInputBytes",
	"maxOutputTokens",
	"timeoutMs",
	"provider",
	"model"
]);
/** Validate one positive integer limit. */
function assertPositiveInteger(name, value) {
	if (!Number.isInteger(value) || value <= 0) throw new Error(`session-title-llm: ${name} must be a positive integer`);
}
/**
* Validate and detach required model-provider configuration.
* @param config - untrusted plugin configuration.
* @returns immutable policy with optional route absence preserved.
*/
function resolveSessionTitleLlmConfig(config) {
	const candidate = config;
	if (candidate === null || typeof candidate !== "object") throw new Error("session-title-llm: configuration is required");
	const value = candidate;
	for (const key of Object.keys(value)) if (!CONFIG_KEYS.has(key)) throw new Error(`session-title-llm: unknown config key "${key}"`);
	assertPositiveInteger("targetWords", value.targetWords);
	assertPositiveInteger("targetCjkCharacters", value.targetCjkCharacters);
	assertPositiveInteger("maxInputBytes", value.maxInputBytes);
	assertPositiveInteger("maxOutputTokens", value.maxOutputTokens);
	assertPositiveInteger("timeoutMs", value.timeoutMs);
	if (value.timeoutMs > MAX_TIMER_DELAY_MS) throw new Error(`session-title-llm: timeoutMs must not exceed ${MAX_TIMER_DELAY_MS}`);
	const hasProvider = value.provider !== void 0;
	if (hasProvider !== (value.model !== void 0)) throw new Error("session-title-llm: provider and model must be supplied together");
	if (hasProvider && (typeof value.provider !== "string" || value.provider.length === 0 || typeof value.model !== "string" || value.model.length === 0)) throw new Error("session-title-llm: provider and model overrides must be non-empty strings");
	return deepFreeze({ ...value });
}
/**
* Register one model-backed provider through the shared configuration and call policy.
* @param ctx - context exposing the title and LLM services.
* @param config - untrusted required deployment policy.
* @param id - stable plugin id recorded with generated titles.
* @param automatic - provider-owned automatic generation cadence.
* @param selectMessages - exact source-message selection for one revision.
*/
function registerSessionTitleLlmProvider(ctx, config, id, automatic, selectMessages) {
	const resolved = resolveSessionTitleLlmConfig(config);
	const titleProvider = SessionTitleProviderId(id);
	ctx.sessionTitle.register({
		id: titleProvider,
		automatic,
		async generate(request) {
			return generateSessionTitleWithLlm(ctx, resolved, request, selectMessages(request.messages), titleProvider);
		}
	});
}
/** Resolve the explicit pair or the exact route captured from `request/header`. */
function resolveRoute(config, request) {
	if (config.provider !== void 0 && config.model !== void 0) return {
		provider: config.provider,
		model: config.model
	};
	if (request.route === void 0) throw new Error("session-title-llm: no logged request route is available; configure provider and model together");
	return request.route;
}
/** Stable language-aware system instruction shared by both provider plugins. */
function systemPrompt(config) {
	return [
		"Create a concise title for an AI coding-assistant session from the supplied human messages.",
		"Return only the title on one line, **in plain text of natural language**, with no quotes, prefix, explanation, Markdown, XML, or terminal control codes. No code is allowed.",
		"Use the language of the messages.",
		`Aim for about ${config.targetWords} words in non-CJK languages or ${config.targetCjkCharacters} CJK characters.`
	].join("\n");
}
/** Frame exact messages as JSON so user text cannot break structural delimiters. */
function frameMessages(messages) {
	return `Generate the session title from this JSON array of human messages:\n${JSON.stringify(messages)}`;
}
/** Translate terminal finish reasons into an auxiliary-call failure. */
function finishError(finish) {
	switch (finish.kind) {
		case "stop": return;
		case "error":
		case "aborted": {
			const error = new Error(finish.failure.message);
			error.code = finish.failure.code;
			return error;
		}
		case "max-tokens": return /* @__PURE__ */ new Error("session-title-llm: title output reached maxOutputTokens");
		case "tool-calls": return /* @__PURE__ */ new Error("session-title-llm: title model unexpectedly requested a tool");
		default: return /* @__PURE__ */ new Error(`session-title-llm: unsupported finish reason "${String(finish.kind)}"`);
	}
}
/**
* Generate one title through the shared auxiliary LLM call.
* @param ctx - context exposing the registered LLM service.
* @param config - validated model-provider policy.
* @param request - service-owned session, route, message snapshot, and cancellation.
* @param selectedMessages - exact provider-selected subset to frame and attribute.
* @param titleProvider - registered title-provider identity recorded with the request.
* @returns normalized non-empty title, exact source seqs, and used model route.
*/
async function generateSessionTitleWithLlm(ctx, config, request, selectedMessages, titleProvider) {
	const env_1 = {
		stack: [],
		error: void 0,
		hasError: false
	};
	try {
		request.signal.throwIfAborted();
		if (selectedMessages.length === 0) throw new Error("session-title-llm: at least one source message is required");
		const framedInput = frameMessages(selectedMessages);
		const inputBytes = Buffer.byteLength(framedInput, "utf8");
		if (inputBytes > config.maxInputBytes) throw new Error(`session-title-llm: input is ${inputBytes} bytes, exceeding maxInputBytes ${config.maxInputBytes}`);
		const route = resolveRoute(config, request);
		const messages = [createUserMessage({
			content: [{
				type: "text",
				text: framedInput
			}],
			source: {
				kind: "plugin",
				plugin: "dsh-session-title-llm"
			}
		})];
		const system = systemPrompt(config);
		const callDeadline = __addDisposableResource(env_1, deadline(request.signal, config.timeoutMs, SESSION_TITLE_TIMEOUT_CODE), false);
		const options = deepFreeze({
			provider: route.provider,
			model: route.model,
			messages,
			system,
			maxTokens: config.maxOutputTokens,
			sessionId: request.session.id,
			purpose: "session-title",
			signal: callDeadline.signal
		});
		request.session.append("session/title-llm-request", {
			titleProvider,
			messageSeqs: selectedMessages.map((message) => message.seq),
			route,
			system,
			messages,
			maxTokens: config.maxOutputTokens
		});
		callDeadline.signal.throwIfAborted();
		const assembler = new BlockAssembler();
		for await (const chunk of ctx.llm.stream(options)) {
			callDeadline.signal.throwIfAborted();
			assembler.push(chunk);
		}
		callDeadline.signal.throwIfAborted();
		const terminalError = finishError(assembler.finish);
		if (terminalError !== void 0) throw terminalError;
		const blocks = assembler.blocks();
		if (blocks.some((block) => block.type === "tool-call")) throw new Error("session-title-llm: title output must contain text only");
		const title = normalizeSessionTitle(blocks.filter((block) => block.type === "text").map((block) => block.text).join(" "), Number.MAX_SAFE_INTEGER);
		if (title.length === 0) throw new Error("session-title-llm: title model produced no text");
		return {
			title,
			messageSeqs: selectedMessages.map((message) => message.seq),
			model: route
		};
	} catch (e_1) {
		env_1.error = e_1;
		env_1.hasError = true;
	} finally {
		__disposeResources(env_1);
	}
}
//#endregion
export { SESSION_TITLE_TIMEOUT_CODE, SessionTitleLlmConfigFields, SessionTitleLlmConfigSchema, generateSessionTitleWithLlm, registerSessionTitleLlmProvider, resolveSessionTitleLlmConfig };
