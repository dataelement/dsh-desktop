#!/usr/bin/env node
import * as acp from "../acp.js";
import { MemoryAcpCookieStore, createHttpStream } from "../http-stream.js";
class HttpExampleClient {
    async requestPermission(params) {
        return {
            outcome: {
                outcome: "selected",
                optionId: params.options[0]?.optionId ?? "allow",
            },
        };
    }
    async sessionUpdate(params) {
        const update = params.update;
        if (update.sessionUpdate === "agent_message_chunk") {
            process.stdout.write(update.content.type === "text" ? update.content.text : "");
            return;
        }
        console.log(`[${update.sessionUpdate}]`);
    }
}
const serverUrl = process.env.ACP_HTTP_URL ?? "http://127.0.0.1:7331/acp";
const authHeaders = {
    Authorization: "Bearer example-token",
};
// Keep reconnect state outside individual stream instances. Reuse this store
// across fresh streams so an external affinity layer can route reconnects.
const cookieStore = new MemoryAcpCookieStore();
let savedSessionId;
function connect() {
    return {
        stream: createHttpStream(serverUrl, {
            headers: authHeaders,
            cookieStore,
            // Cookies are included by default. Use `cookies: "omit"` for stateless requests.
        }),
    };
}
const client = new HttpExampleClient();
const { stream } = connect();
try {
    const { initialized, result } = await acp
        .client({ name: "http-example-client" })
        .onRequest(acp.methods.client.session.requestPermission, (ctx) => client.requestPermission(ctx.params))
        .onNotification(acp.methods.client.session.update, (ctx) => client.sessionUpdate(ctx.params))
        .connectWith(stream, async (ctx) => {
        const initialized = await ctx.request(acp.methods.agent.initialize, {
            protocolVersion: acp.PROTOCOL_VERSION,
            clientCapabilities: {},
        });
        const session = await ctx.request(acp.methods.agent.session.new, {
            cwd: process.cwd(),
            mcpServers: [],
        });
        savedSessionId = session.sessionId;
        const result = await ctx.request(acp.methods.agent.session.prompt, {
            sessionId: session.sessionId,
            prompt: [
                {
                    type: "text",
                    text: "Hello over Streamable HTTP",
                },
            ],
        });
        return { initialized, result };
    });
    console.log(`\nDone: ${result.stopReason}`);
    console.log(`Saved session ${savedSessionId}; loadSession=${initialized.agentCapabilities?.loadSession === true}`);
    // Reconnect flow sketch:
    // 1. Save `sessionId`, auth headers, cwd, MCP servers, and `cookieStore`.
    // 2. Create a fresh stream with the same auth headers and cookie store.
    // 3. Call initialize and require `agentCapabilities.loadSession`.
    // 4. Call session/load for the saved session ID.
    // Production agents must authorize session/load for the authenticated user.
    // ACP v1 does not replay in-flight transport messages emitted while disconnected.
    // Example:
    // const next = connect();
    // await acp.client({ name: "http-example-client" }).connectWith(next.stream, async (ctx) => {
    //   await ctx.request(acp.methods.agent.initialize, { protocolVersion: acp.PROTOCOL_VERSION, clientCapabilities: {} });
    //   await ctx.request(acp.methods.agent.session.load, { sessionId: savedSessionId, cwd: process.cwd(), mcpServers: [] });
    // });
}
finally {
    await stream.writable.close();
}
//# sourceMappingURL=http-client.js.map