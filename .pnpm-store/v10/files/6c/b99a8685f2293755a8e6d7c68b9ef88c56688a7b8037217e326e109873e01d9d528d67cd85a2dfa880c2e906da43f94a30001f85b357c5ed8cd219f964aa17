#!/usr/bin/env node
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import * as acp from "../acp.js";
import { createNodeHttpHandler, createNodeWebSocketUpgradeHandler, } from "../node-adapter.js";
import { AcpServer } from "../server.js";
// Illustrative durable state outside per-connection agent instances. For
// production multi-node deployments, replace this with Redis, Postgres, shared
// storage, or rely on sticky sessions with clear restart/drain semantics.
const durableSessions = new Map();
class HttpExampleAgent {
    async initialize(_params) {
        return {
            protocolVersion: acp.PROTOCOL_VERSION,
            agentCapabilities: {
                loadSession: true,
            },
        };
    }
    async newSession(params) {
        const sessionId = crypto.randomUUID();
        durableSessions.set(sessionId, {
            cwd: params.cwd,
            history: [],
        });
        return { sessionId };
    }
    async loadSession(params, client) {
        const session = durableSessions.get(params.sessionId);
        if (!session) {
            throw new Error(`Session ${params.sessionId} not found`);
        }
        // Production agents must authorize session/load against the authenticated
        // principal before replaying durable state. This example's auth check lives
        // in HTTP middleware and is intentionally minimal.
        for (const update of session.history) {
            await client.notify(acp.methods.client.session.update, update);
        }
        return {};
    }
    async authenticate(_params) {
        return {};
    }
    async prompt(params, client) {
        const session = durableSessions.get(params.sessionId);
        if (!session) {
            throw new Error(`Session ${params.sessionId} not found`);
        }
        const update = {
            sessionId: params.sessionId,
            update: {
                sessionUpdate: "agent_message_chunk",
                content: {
                    type: "text",
                    text: `Hello from the ACP HTTP/WebSocket example server at ${session.cwd}.`,
                },
            },
        };
        session.history.push(update);
        await client.notify(acp.methods.client.session.update, update);
        return { stopReason: "end_turn" };
    }
    async cancel(_params) { }
}
const implementation = new HttpExampleAgent();
const agent = acp
    .agent({ name: "http-example-agent" })
    .onRequest(acp.methods.agent.initialize, (ctx) => implementation.initialize(ctx.params))
    .onRequest(acp.methods.agent.session.new, (ctx) => implementation.newSession(ctx.params))
    .onRequest(acp.methods.agent.session.load, (ctx) => implementation.loadSession(ctx.params, ctx.client))
    .onRequest(acp.methods.agent.authenticate, (ctx) => implementation.authenticate(ctx.params))
    .onRequest(acp.methods.agent.session.prompt, (ctx) => implementation.prompt(ctx.params, ctx.client))
    .onNotification(acp.methods.agent.session.cancel, (ctx) => implementation.cancel(ctx.params));
const acpServer = new AcpServer({ agent });
const acpHttpHandler = createNodeHttpHandler(acpServer);
const webSocketServer = new WebSocketServer({ noServer: true });
// Use the ACP upgrade helper so the 101 response includes Acp-Connection-Id.
const acpWebSocketUpgradeHandler = createNodeWebSocketUpgradeHandler(acpServer, webSocketServer);
const port = Number.parseInt(process.env.PORT ?? "7331", 10);
const httpServer = createServer((req, res) => {
    if (!isAcpPath(req.url)) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
        return;
    }
    // Put authentication or tenant-selection middleware here before routing to AcpServer.
    // For example, validate `req.headers.authorization` and reject unauthorized requests.
    if (!isAuthorized(req.headers.authorization)) {
        res.writeHead(401, { "Content-Type": "text/plain" });
        res.end("Unauthorized");
        return;
    }
    acpHttpHandler(req, res);
});
httpServer.on("upgrade", (req, socket, head) => {
    if (!isAcpPath(req.url) || !isAuthorized(req.headers.authorization)) {
        socket.destroy();
        return;
    }
    acpWebSocketUpgradeHandler(req, socket, head);
});
httpServer.listen(port, () => {
    console.log(`ACP HTTP endpoint listening at http://127.0.0.1:${port}/acp`);
    console.log(`ACP WebSocket endpoint listening at ws://127.0.0.1:${port}/acp`);
});
function isAcpPath(url) {
    return new URL(url ?? "/", "http://127.0.0.1").pathname === "/acp";
}
function isAuthorized(authorization) {
    return (authorization === undefined || authorization === "Bearer example-token");
}
//# sourceMappingURL=http-server.js.map