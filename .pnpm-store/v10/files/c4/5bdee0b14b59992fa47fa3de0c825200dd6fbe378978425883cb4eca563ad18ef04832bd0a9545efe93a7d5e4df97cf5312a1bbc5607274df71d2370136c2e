import z from "@deepseek-ai/schemastery";
//#region lib/types/chat-settings.js
/** Chat transcript preferences stored in the Host user-settings document. */
/** Settings namespace owned by the Chat target. */
const CHAT_SETTINGS_NAMESPACE = "ui-chat";
/** Field carrying the completed-Turn transcript presentation mode. */
const TRANSCRIPT_VIEW_FIELD = "transcriptView";
/** Transcript presentation modes accepted at settings boundaries. */
const TRANSCRIPT_VIEW_MODES = ["normal", "compact"];
/** Default preserves the compact process disclosure introduced by Chat. */
const DEFAULT_TRANSCRIPT_VIEW_MODE = "compact";
/** Durable Chat schema; also the wire envelope the browser scope validates against. */
const ChatSettingsSchema = z.object({ [TRANSCRIPT_VIEW_FIELD]: z.union([...TRANSCRIPT_VIEW_MODES]).default(DEFAULT_TRANSCRIPT_VIEW_MODE) });
//#endregion
//#region lib/types/index.js
/** Host registration for browser Chat preferences. */
/** Register the durable Chat settings section when a provider exists. */
function apply(ctx) {
	ctx.inject(["settings"], (settingsCtx) => {
		settingsCtx.settings.register(CHAT_SETTINGS_NAMESPACE, ChatSettingsSchema);
	});
}
//#endregion
export { CHAT_SETTINGS_NAMESPACE, DEFAULT_TRANSCRIPT_VIEW_MODE, TRANSCRIPT_VIEW_FIELD, TRANSCRIPT_VIEW_MODES, apply };
