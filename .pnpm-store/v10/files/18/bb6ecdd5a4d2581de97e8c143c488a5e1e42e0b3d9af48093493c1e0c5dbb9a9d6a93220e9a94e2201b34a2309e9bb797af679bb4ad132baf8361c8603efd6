import { describe, expect, it } from "vitest";
import { AGENT_METHODS } from "./schema/index.js";
import { methodRequiresSessionHeader, sessionIdFromParams, isInitializeRequest, messageIdKey, HEADER_CONNECTION_ID, HEADER_SESSION_ID, EVENT_STREAM_MIME_TYPE, JSON_MIME_TYPE, } from "./protocol.js";
describe("protocol transport helpers", () => {
    it("exports HTTP transport constants", () => {
        expect(HEADER_CONNECTION_ID).toBe("Acp-Connection-Id");
        expect(HEADER_SESSION_ID).toBe("Acp-Session-Id");
        expect(EVENT_STREAM_MIME_TYPE).toBe("text/event-stream");
        expect(JSON_MIME_TYPE).toBe("application/json");
    });
    it("requires a session header for existing-session methods", () => {
        expect(methodRequiresSessionHeader(AGENT_METHODS.session_cancel)).toBe(true);
        expect(methodRequiresSessionHeader(AGENT_METHODS.session_close)).toBe(true);
        expect(methodRequiresSessionHeader(AGENT_METHODS.session_delete)).toBe(true);
        expect(methodRequiresSessionHeader(AGENT_METHODS.session_fork)).toBe(true);
        expect(methodRequiresSessionHeader(AGENT_METHODS.session_load)).toBe(true);
        expect(methodRequiresSessionHeader(AGENT_METHODS.session_prompt)).toBe(true);
        expect(methodRequiresSessionHeader(AGENT_METHODS.session_resume)).toBe(true);
        expect(methodRequiresSessionHeader(AGENT_METHODS.session_set_config_option)).toBe(true);
        expect(methodRequiresSessionHeader(AGENT_METHODS.session_set_mode)).toBe(true);
        expect(methodRequiresSessionHeader("session/set_model")).toBe(true);
        expect(methodRequiresSessionHeader(AGENT_METHODS.nes_suggest)).toBe(true);
        expect(methodRequiresSessionHeader(AGENT_METHODS.nes_accept)).toBe(true);
        expect(methodRequiresSessionHeader(AGENT_METHODS.nes_reject)).toBe(true);
        expect(methodRequiresSessionHeader(AGENT_METHODS.nes_close)).toBe(true);
        expect(methodRequiresSessionHeader(AGENT_METHODS.document_did_open)).toBe(true);
        expect(methodRequiresSessionHeader(AGENT_METHODS.document_did_change)).toBe(true);
        expect(methodRequiresSessionHeader(AGENT_METHODS.document_did_close)).toBe(true);
        expect(methodRequiresSessionHeader(AGENT_METHODS.document_did_save)).toBe(true);
        expect(methodRequiresSessionHeader(AGENT_METHODS.document_did_focus)).toBe(true);
    });
    it("does not require a session header for connection-level methods", () => {
        expect(methodRequiresSessionHeader(AGENT_METHODS.initialize)).toBe(false);
        expect(methodRequiresSessionHeader(AGENT_METHODS.session_new)).toBe(false);
        expect(methodRequiresSessionHeader(AGENT_METHODS.session_list)).toBe(false);
        expect(methodRequiresSessionHeader(AGENT_METHODS.nes_start)).toBe(false);
    });
    it("extracts a top-level string session ID from params", () => {
        expect(sessionIdFromParams({ sessionId: "session-1" })).toBe("session-1");
    });
    it("returns undefined when params do not contain a top-level string session ID", () => {
        expect(sessionIdFromParams(undefined)).toBeUndefined();
        expect(sessionIdFromParams(null)).toBeUndefined();
        expect(sessionIdFromParams("session-1")).toBeUndefined();
        expect(sessionIdFromParams({})).toBeUndefined();
        expect(sessionIdFromParams({ sessionId: 1 })).toBeUndefined();
        expect(sessionIdFromParams({ nested: { sessionId: "session-1" } })).toBeUndefined();
    });
    it("detects initialize requests", () => {
        const request = {
            jsonrpc: "2.0",
            id: 1,
            method: AGENT_METHODS.initialize,
            params: { protocolVersion: 1, clientCapabilities: {} },
        };
        expect(isInitializeRequest(request)).toBe(true);
    });
    it("rejects non-initialize messages", () => {
        const notification = {
            jsonrpc: "2.0",
            method: AGENT_METHODS.initialize,
            params: { protocolVersion: 1, clientCapabilities: {} },
        };
        const response = { jsonrpc: "2.0", id: 1, result: {} };
        const otherRequest = {
            jsonrpc: "2.0",
            id: 1,
            method: AGENT_METHODS.session_new,
            params: { cwd: "/tmp", mcpServers: [] },
        };
        expect(isInitializeRequest(notification)).toBe(false);
        expect(isInitializeRequest(response)).toBe(false);
        expect(isInitializeRequest(otherRequest)).toBe(false);
    });
    it("normalizes JSON-RPC request IDs for map keys", () => {
        expect(messageIdKey("foo")).toBe("string:foo");
        expect(messageIdKey(1)).toBe("number:1");
        expect(messageIdKey(null)).toBe("null");
        expect(messageIdKey(undefined)).toBeUndefined();
    });
});
//# sourceMappingURL=protocol.test.js.map