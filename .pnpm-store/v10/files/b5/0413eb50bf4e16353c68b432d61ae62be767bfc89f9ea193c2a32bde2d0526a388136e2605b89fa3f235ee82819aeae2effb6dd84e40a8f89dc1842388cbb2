import http from "node:http";
import { WebSocketServer } from "ws";
import { AcpServer } from "../server.js";
import { createNodeHttpHandler, createNodeWebSocketUpgradeHandler, } from "../node-adapter.js";
import { createTestAgentApp } from "./test-agent.js";
export async function startTestServer(createAgent = () => createTestAgentApp(), options = {}) {
    const acpServer = new AcpServer({ createAgent });
    const httpServer = http.createServer(createNodeHttpHandler(acpServer));
    const webSocketServer = new WebSocketServer({ noServer: true });
    httpServer.on("upgrade", createNodeWebSocketUpgradeHandler(acpServer, webSocketServer));
    await listen(httpServer, options.port ?? 0);
    const address = httpServer.address();
    if (!isAddressInfo(address)) {
        throw new Error("Test HTTP server did not bind to a TCP port");
    }
    return {
        url: `http://127.0.0.1:${address.port}`,
        wsUrl: `ws://127.0.0.1:${address.port}`,
        close: async () => {
            terminateWebSockets(webSocketServer);
            await Promise.all([
                acpServer.close(),
                closeWebSocketServer(webSocketServer),
                closeHttpServer(httpServer),
            ]);
        },
    };
}
function listen(server, port) {
    return new Promise((resolve, reject) => {
        const onError = (error) => {
            server.off("listening", onListening);
            reject(error);
        };
        const onListening = () => {
            server.off("error", onError);
            resolve();
        };
        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(port, "127.0.0.1");
    });
}
function terminateWebSockets(server) {
    for (const client of server.clients) {
        client.terminate();
    }
}
function closeWebSocketServer(server) {
    return new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}
function closeHttpServer(server) {
    return new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}
function isAddressInfo(address) {
    return typeof address === "object" && address !== null;
}
//# sourceMappingURL=test-http-server.js.map