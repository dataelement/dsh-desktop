import { AGENT_METHODS } from "./schema/index.js";
import { isRecord, isResponseMessage } from "./jsonrpc.js";
export const HEADER_CONNECTION_ID = "Acp-Connection-Id";
export const HEADER_SESSION_ID = "Acp-Session-Id";
export const EVENT_STREAM_MIME_TYPE = "text/event-stream";
export const JSON_MIME_TYPE = "application/json";
const SESSION_SCOPED_METHODS = new Set([
    AGENT_METHODS.session_cancel,
    AGENT_METHODS.session_close,
    AGENT_METHODS.session_delete,
    AGENT_METHODS.session_fork,
    AGENT_METHODS.session_load,
    AGENT_METHODS.session_prompt,
    AGENT_METHODS.session_resume,
    AGENT_METHODS.session_set_config_option,
    AGENT_METHODS.session_set_mode,
    "session/set_model",
    AGENT_METHODS.nes_suggest,
    AGENT_METHODS.nes_accept,
    AGENT_METHODS.nes_reject,
    AGENT_METHODS.nes_close,
    AGENT_METHODS.document_did_open,
    AGENT_METHODS.document_did_change,
    AGENT_METHODS.document_did_close,
    AGENT_METHODS.document_did_save,
    AGENT_METHODS.document_did_focus,
]);
export function methodRequiresSessionHeader(method) {
    return SESSION_SCOPED_METHODS.has(method);
}
export function sessionIdFromParams(params) {
    if (!isRecord(params)) {
        return undefined;
    }
    const sessionId = params["sessionId"];
    return typeof sessionId === "string" ? sessionId : undefined;
}
export function sessionIdFromMessageParams(message) {
    return "method" in message ? sessionIdFromParams(message.params) : undefined;
}
export function sessionIdFromResponseResult(message) {
    if (!isResponseMessage(message) || !("result" in message)) {
        return undefined;
    }
    if (!isRecord(message.result)) {
        return undefined;
    }
    const sessionId = message.result["sessionId"];
    return typeof sessionId === "string" ? sessionId : undefined;
}
export function isInitializeRequest(msg) {
    return (msg.jsonrpc === "2.0" &&
        "id" in msg &&
        "method" in msg &&
        msg.method === AGENT_METHODS.initialize);
}
export function messageIdKey(id) {
    if (typeof id === "string") {
        return `string:${id}`;
    }
    if (typeof id === "number") {
        return `number:${id}`;
    }
    if (id === null) {
        return "null";
    }
    return undefined;
}
//# sourceMappingURL=protocol.js.map