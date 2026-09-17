#!/usr/bin/env node
import * as acp from "../acp.js";
import { Readable, Writable } from "node:stream";
class ExampleAgent {
    sessions;
    constructor() {
        this.sessions = new Map();
    }
    async initialize(_params) {
        return {
            protocolVersion: acp.PROTOCOL_VERSION,
            agentCapabilities: {
                loadSession: false,
            },
        };
    }
    async newSession(_params) {
        const sessionId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        this.sessions.set(sessionId, {
            pendingPrompt: null,
        });
        return {
            sessionId,
        };
    }
    async authenticate(_params) {
        // No auth needed - return empty response
        return {};
    }
    async setSessionMode(_params) {
        // Session mode changes not implemented in this example
        return {};
    }
    async prompt(params, cx) {
        const session = this.sessions.get(params.sessionId);
        if (!session) {
            throw new Error(`Session ${params.sessionId} not found`);
        }
        session.pendingPrompt?.abort();
        session.pendingPrompt = new AbortController();
        try {
            await this.simulateTurn(params.sessionId, session.pendingPrompt.signal, cx);
        }
        catch (err) {
            if (session.pendingPrompt.signal.aborted) {
                return { stopReason: "cancelled" };
            }
            throw err;
        }
        session.pendingPrompt = null;
        return {
            stopReason: "end_turn",
        };
    }
    async simulateTurn(sessionId, abortSignal, cx) {
        // Send initial text chunk
        await cx.notify(acp.methods.client.session.update, {
            sessionId,
            update: {
                sessionUpdate: "agent_message_chunk",
                content: {
                    type: "text",
                    text: "I'll help you with that. Let me start by reading some files to understand the current situation.",
                },
            },
        });
        await this.simulateModelInteraction(abortSignal);
        // Send a tool call that doesn't need permission
        await cx.notify(acp.methods.client.session.update, {
            sessionId,
            update: {
                sessionUpdate: "tool_call",
                toolCallId: "call_1",
                title: "Reading project files",
                kind: "read",
                status: "pending",
                locations: [{ path: "/project/README.md" }],
                rawInput: { path: "/project/README.md" },
            },
        });
        await this.simulateModelInteraction(abortSignal);
        // Update tool call to completed
        await cx.notify(acp.methods.client.session.update, {
            sessionId,
            update: {
                sessionUpdate: "tool_call_update",
                toolCallId: "call_1",
                status: "completed",
                content: [
                    {
                        type: "content",
                        content: {
                            type: "text",
                            text: "# My Project\n\nThis is a sample project...",
                        },
                    },
                ],
                rawOutput: { content: "# My Project\n\nThis is a sample project..." },
            },
        });
        await this.simulateModelInteraction(abortSignal);
        // Send more text
        await cx.notify(acp.methods.client.session.update, {
            sessionId,
            update: {
                sessionUpdate: "agent_message_chunk",
                content: {
                    type: "text",
                    text: " Now I understand the project structure. I need to make some changes to improve it.",
                },
            },
        });
        await this.simulateModelInteraction(abortSignal);
        // Send a tool call that DOES need permission
        await cx.notify(acp.methods.client.session.update, {
            sessionId,
            update: {
                sessionUpdate: "tool_call",
                toolCallId: "call_2",
                title: "Modifying critical configuration file",
                kind: "edit",
                status: "pending",
                locations: [{ path: "/project/config.json" }],
                rawInput: {
                    path: "/project/config.json",
                    content: '{"database": {"host": "new-host"}}',
                },
            },
        });
        // Request permission for the sensitive operation
        const permissionResponse = await cx.request(acp.methods.client.session.requestPermission, {
            sessionId,
            toolCall: {
                toolCallId: "call_2",
                title: "Modifying critical configuration file",
                kind: "edit",
                status: "pending",
                locations: [{ path: "/home/user/project/config.json" }],
                rawInput: {
                    path: "/home/user/project/config.json",
                    content: '{"database": {"host": "new-host"}}',
                },
            },
            options: [
                {
                    kind: "allow_once",
                    name: "Allow this change",
                    optionId: "allow",
                },
                {
                    kind: "reject_once",
                    name: "Skip this change",
                    optionId: "reject",
                },
            ],
        });
        if (permissionResponse.outcome.outcome === "cancelled") {
            return;
        }
        switch (permissionResponse.outcome.optionId) {
            case "allow": {
                await cx.notify(acp.methods.client.session.update, {
                    sessionId,
                    update: {
                        sessionUpdate: "tool_call_update",
                        toolCallId: "call_2",
                        status: "completed",
                        rawOutput: { success: true, message: "Configuration updated" },
                    },
                });
                await this.simulateModelInteraction(abortSignal);
                await cx.notify(acp.methods.client.session.update, {
                    sessionId,
                    update: {
                        sessionUpdate: "agent_message_chunk",
                        content: {
                            type: "text",
                            text: " Perfect! I've successfully updated the configuration. The changes have been applied.",
                        },
                    },
                });
                break;
            }
            case "reject": {
                await this.simulateModelInteraction(abortSignal);
                await cx.notify(acp.methods.client.session.update, {
                    sessionId,
                    update: {
                        sessionUpdate: "agent_message_chunk",
                        content: {
                            type: "text",
                            text: " I understand you prefer not to make that change. I'll skip the configuration update.",
                        },
                    },
                });
                break;
            }
            default:
                throw new Error(`Unexpected permission outcome ${permissionResponse.outcome}`);
        }
    }
    simulateModelInteraction(abortSignal) {
        return new Promise((resolve, reject) => setTimeout(() => {
            // In a real agent, you'd pass this abort signal to the LLM client
            if (abortSignal.aborted) {
                reject();
            }
            else {
                resolve();
            }
        }, 1000));
    }
    async cancel(params) {
        this.sessions.get(params.sessionId)?.pendingPrompt?.abort();
    }
}
const input = Writable.toWeb(process.stdout);
const output = Readable.toWeb(process.stdin);
const stream = acp.ndJsonStream(input, output);
const agent = new ExampleAgent();
acp
    .agent({ name: "example-agent" })
    .onRequest("initialize", (ctx) => agent.initialize(ctx.params))
    .onRequest("session/new", (ctx) => agent.newSession(ctx.params))
    .onRequest("authenticate", (ctx) => agent.authenticate(ctx.params))
    .onRequest("session/set_mode", (ctx) => agent.setSessionMode(ctx.params))
    .onRequest("session/prompt", (ctx) => agent.prompt(ctx.params, ctx.client))
    .onNotification("session/cancel", (ctx) => agent.cancel(ctx.params))
    .connect(stream);
//# sourceMappingURL=agent.js.map