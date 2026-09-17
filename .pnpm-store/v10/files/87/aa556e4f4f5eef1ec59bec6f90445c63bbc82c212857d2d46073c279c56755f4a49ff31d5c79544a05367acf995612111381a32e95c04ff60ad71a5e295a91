import z from "@deepseek-ai/schemastery";
import { TextRetainer, describeOmitted } from "@deepseek-ai/dsh-output-retention";
//#region lib/types/notice.js
/** Browser-safe formatting and recognition of persisted spill-policy notices. */
const OPEN = "(";
const CLOSE = ")";
const LOCATION = " Full formatted result stored at: ";
const GUIDANCE_SEPARATOR = ". ";
const EXACT_OMISSION = describeOmitted({
	kind: "exact",
	count: 0
}, "bytes");
const COUNT_OFFSET = EXACT_OMISSION.indexOf("0");
EXACT_OMISSION.slice(COUNT_OFFSET + 1);
/**
* Format the notice appended to a retained preview, preserving its persisted spelling.
* @param omitted - bytes omitted by the retention policy.
* @param ref - saved text locator and retrieval guidance.
* @returns the complete notice without a leading preview separator.
*/
function formatSpillNotice(omitted, ref) {
	return `${OPEN}${describeOmitted(omitted, "bytes")}${LOCATION}${ref.locator}${GUIDANCE_SEPARATOR}${ref.retrievalHint}${CLOSE}`;
}
//#endregion
//#region lib/types/index.js
/**
* The spill-policy PLUGIN: a `tools/post-execute` result transformer that keeps
* oversized plain-text tool results out of the model's context. When a final
* result's UTF-8 size exceeds `maxInlineBytes`, it saves the FULL text to a
* session-scoped spill artifact (`ctx.spillStore`) and replaces the
* model-facing result with a bounded head/tail preview plus the backend's
* locator and retrieval guidance.
*
* It registers NO service and owns NO storage or preview mechanics: preview is
* `@deepseek-ai/dsh-output-retention` (`TextRetainer`), storage is `ctx.spillStore`.
* The policy only decides WHEN to spill and composes the notice.
*
* A second arm applies the SAME cap to the durable log: the
* `tools/ptc-dispatch-log` waterfall bounds the `tool/ptc-dispatch` event's
* copy of an oversized `run_code` sub-call result (the program's value is
* untouched; UIs and replay read the full text through the spill artifact).
*
* ## Deliberately narrow
*
* - Omitted `maxInlineBytes` ⇒ the plugin registers nothing (a true no-op).
* - Plain-text results only: a result carrying any non-text block is left
*   untouched (the policy knows only the final formatted text, not tool
*   internals).
* - Nested composite calls skip the MODEL-facing arm; their durable log copy
*   is bounded by the dispatch-log arm instead.
* - Accepted value replacements pass through for registry revalidation and
*   rendering; this presentation policy cannot also replace content in the
*   same mutually exclusive decision.
* - `read` is skipped by the model-facing arm to avoid a
*   `read → spill → read again` loop; the dispatch-log arm bounds `read`
*   sub-calls too (a log copy is not model context, and `read` is precisely
*   the tool that produces huge logs).
* - Best-effort: no session owner, no `ctx.spillStore` backend, or a save
*   failure ⇒ log and return the original result. A spill failure must NEVER
*   turn a successful tool call into an `isError` or hide the inline result.
*
* It COMPOSES with other post-execute listeners: its prepended listener
* delegates via `next()` and bounds the resulting content projection, so
* tool-owned asynchronous projection runs before generic bounding, a hook that
* replaced content still has its replacement bounded, and value replacements
* and `block` decisions pass through unchanged.
*
* @module @deepseek-ai/dsh-spill-policy
*/
/** Cordis plugin name used by loader diagnostics. */
const name = "spill-policy";
/** Require the tool registry (its `tools/post-execute` waterfall is the extension point we transform). */
const inject = ["tools"];
const Config = z.object({ maxInlineBytes: z.number() });
/** All-text content flattened to one UTF-8 string, or `undefined` if any block is non-text. */
function flattenPlainText(content) {
	let text = "";
	for (const block of content) {
		if (block.type !== "text") return void 0;
		text += block.text;
	}
	return text;
}
/** The owning session id, or `undefined` for a call with no agent (a direct/test call). */
function ownerSessionId(exec) {
	return exec.agent?.session.header.id;
}
/** Build the bounded head/tail preview for `text`, splitting `budget` bytes across the two ends. */
function preview(text, budget) {
	const retainer = new TextRetainer({
		kind: "headTail",
		headBytes: Math.ceil(budget / 2),
		tailBytes: Math.floor(budget / 2)
	});
	retainer.push(text);
	const kept = retainer.finish();
	return {
		text: kept.text,
		omitted: kept.omittedBytes
	};
}
function apply(ctx, config) {
	const maxInlineBytes = config.maxInlineBytes;
	if (maxInlineBytes === void 0) return;
	if (!Number.isInteger(maxInlineBytes) || maxInlineBytes < 0) throw new Error(`spill-policy: maxInlineBytes must be a non-negative integer (got ${maxInlineBytes})`);
	const cap = maxInlineBytes;
	/**
	* Spill `text` and build the bounded replacement (preview + notice), or
	* return `undefined` when the policy must keep the original (no session
	* owner, no backend, storage failure, or no within-cap replacement).
	* Shared verbatim by the model-facing post-execute arm and the durable
	* dispatch-log arm so both produce byte-identical projections.
	*/
	async function spillReplacement(text, totalBytes, sessionId, toolName, callId, label) {
		if (sessionId === void 0) {
			ctx.logger.warn(`spill-policy: no session owner for ${toolName} ${label}; keeping the inline content`);
			return;
		}
		const spillStore = ctx.get("spillStore");
		if (!spillStore) {
			ctx.logger.warn("spill-policy: no ctx.spillStore backend loaded; keeping the inline content");
			return;
		}
		const save = {
			owner: { sessionId },
			source: {
				kind: "tool",
				toolName,
				callId,
				label
			},
			suggestedName: `${toolName}.txt`,
			content: text
		};
		let ref;
		try {
			ref = await spillStore.saveText(save);
		} catch (error) {
			ctx.logger.warn(`spill-policy: saveText failed for ${toolName}: ${String(error)}; keeping the inline content`);
			return;
		}
		const reserve = Buffer.byteLength(formatSpillNotice({
			kind: "exact",
			count: totalBytes
		}, ref), "utf8") + 2;
		const { text: previewText, omitted } = preview(text, Math.max(0, cap - reserve));
		const notice = formatSpillNotice(omitted, ref);
		const replacedText = previewText.length > 0 ? `${previewText}\n\n${notice}` : notice;
		if (Buffer.byteLength(replacedText, "utf8") > cap) {
			ctx.logger.warn(`spill-policy: spill notice for ${toolName} exceeds maxInlineBytes; keeping the inline content`);
			return;
		}
		return replacedText;
	}
	ctx.on("tools/post-execute", async (exec, result, next) => {
		const decision = await next();
		if (decision.kind !== "accept" || Object.hasOwn(decision, "value") || exec.parent !== void 0 || exec.name === "read") return decision;
		const text = flattenPlainText(decision.content ?? result.content);
		if (text === void 0) return decision;
		const totalBytes = Buffer.byteLength(text, "utf8");
		if (totalBytes <= maxInlineBytes) return decision;
		const replacedText = await spillReplacement(text, totalBytes, ownerSessionId(exec), exec.name, exec.callId, "result");
		if (replacedText === void 0) return decision;
		return {
			kind: "accept",
			content: [{
				type: "text",
				text: replacedText
			}],
			...decision.additionalContexts ? { additionalContexts: decision.additionalContexts } : {}
		};
	}, { prepend: true });
	ctx.on("tools/ptc-dispatch-log", async (dispatch, next) => {
		const content = await next();
		const text = flattenPlainText(content);
		if (text === void 0) return content;
		const totalBytes = Buffer.byteLength(text, "utf8");
		if (totalBytes <= maxInlineBytes) return content;
		const replacedText = await spillReplacement(text, totalBytes, ownerSessionId(dispatch.exec), dispatch.name, dispatch.subCallId, "dispatch");
		if (replacedText === void 0) return content;
		return [{
			type: "text",
			text: replacedText
		}];
	}, { prepend: true });
}
//#endregion
export { Config, apply, inject, name };
