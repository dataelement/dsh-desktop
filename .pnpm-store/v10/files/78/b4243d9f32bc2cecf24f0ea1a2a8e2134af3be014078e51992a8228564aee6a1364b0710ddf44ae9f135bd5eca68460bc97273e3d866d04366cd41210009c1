import { Service } from "@deepseek-ai/cordis";
//#region lib/types/index.js
/**
* DeepSeek LLM API extension registry: plugins own independent top-level request
* fields while the official adapter performs one preparation and acceptance transaction.
* @module @deepseek-ai/dsh-deepseek-llm-api-extensions
*/
/** Recursively freeze a fresh structured clone. */
function freezeJson(value) {
	if (value !== null && typeof value === "object") {
		for (const child of Array.isArray(value) ? value : Object.values(value)) freezeJson(child);
		Object.freeze(value);
	}
	return value;
}
/** Settle every acceptance callback before reporting failures. */
async function acceptAll(callbacks) {
	const failures = (await Promise.allSettled(callbacks.map((callback) => Promise.resolve().then(callback)))).filter((outcome) => outcome.status === "rejected").map((outcome) => outcome.reason);
	if (failures.length === 1) throw failures[0];
	if (failures.length > 1) throw new AggregateError(failures, "DeepSeek LLM API extension acceptance failed");
}
/** Stop awaiting provider work when the containing model request is cancelled. */
async function abortable(work, signal) {
	signal.throwIfAborted();
	const aborted = Promise.withResolvers();
	const onAbort = () => {
		aborted.reject(signal.reason);
	};
	signal.addEventListener("abort", onAbort, { once: true });
	try {
		const result = await Promise.race([work, aborted.promise]);
		signal.throwIfAborted();
		return result;
	} finally {
		signal.removeEventListener("abort", onAbort);
	}
}
/** Registry of independently owned top-level fields for official DeepSeek requests. */
var DeepSeekLlmApiExtensionRegistry = class extends Service {
	providers = /* @__PURE__ */ new Map();
	constructor(ctx) {
		super(ctx, "deepseekLlmApiExtensions");
	}
	/**
	* Register the sole provider of one top-level request field. Registration is effect-scoped.
	* @param field - declaration-merged field owned by the provider.
	* @param provider - request-time field preparation and optional acceptance behavior.
	* @returns disposer that releases the field.
	*/
	register(field, provider) {
		const fieldName = field;
		if (fieldName.length === 0 || fieldName.trim() !== fieldName) throw new Error("deepseek-llm-api-extensions: field must be a non-blank trimmed string");
		const providers = this.providers;
		const erased = provider;
		return this.ctx.effect(() => {
			if (providers.has(fieldName)) throw new Error(`deepseek-llm-api-extensions: field ${JSON.stringify(fieldName)} is already registered`);
			providers.set(fieldName, erased);
			return () => {
				providers.delete(fieldName);
			};
		}, `deepseekLlmApiExtensions.register(${JSON.stringify(fieldName)})`);
	}
	/**
	* Prepare every currently registered field from one immutable base request.
	* Preparation failures reject before HTTP dispatch. Field values are cloned and frozen;
	* providers retain no mutable alias to the outgoing request.
	* @param request - exact serialized request facts before extension fields.
	* @returns detached fields and their idempotent joint acceptance transaction.
	*/
	async prepare(request) {
		request.signal.throwIfAborted();
		const entries = [...this.providers.entries()];
		const prepared = await abortable(Promise.all(entries.map(async ([field, provider]) => ({
			field,
			result: await provider.prepare(request)
		}))), request.signal);
		const fields = Object.create(null);
		const callbacks = [];
		for (const { field, result } of prepared) {
			if (result === void 0) continue;
			fields[field] = freezeJson(structuredClone(result.value));
			const accept = result.accept;
			if (accept !== void 0) callbacks.push(accept.bind(result));
		}
		Object.freeze(fields);
		let acceptance;
		return {
			fields,
			accept: () => acceptance ??= acceptAll(callbacks)
		};
	}
};
//#endregion
export { DeepSeekLlmApiExtensionRegistry, DeepSeekLlmApiExtensionRegistry as default };
