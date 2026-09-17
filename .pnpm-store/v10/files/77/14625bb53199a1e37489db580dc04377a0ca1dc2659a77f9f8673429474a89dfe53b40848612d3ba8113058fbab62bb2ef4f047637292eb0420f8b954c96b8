import http from "node:http";
import { EventEmitter } from "node:events";
import { PassThrough, Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { AcpServer } from "./server.js";
import { createNodeHttpHandler, createNodeWebSocketUpgradeHandler, } from "./node-adapter.js";
import { createTestAgentApp } from "./test-support/test-agent.js";
describe("createNodeHttpHandler", () => {
    it("forwards method, URL, headers, and body to AcpServer.handleRequest", async () => {
        const acpServer = new AcpServer({
            createAgent: () => createTestAgentApp(),
        });
        const seenRequests = [];
        const seenBodies = [];
        acpServer.handleRequest = async (req) => {
            seenRequests.push(req);
            seenBodies.push(await req.text());
            return new Response("created", {
                status: 201,
                headers: {
                    "X-Adapter-Test": "ok",
                },
            });
        };
        const server = await startNodeServer(acpServer);
        try {
            const response = await fetch(`${server.url}/acp?hello=world`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Client-Test": "forwarded",
                },
                body: JSON.stringify({ ok: true }),
            });
            expect(response.status).toBe(201);
            expect(response.headers.get("X-Adapter-Test")).toBe("ok");
            expect(await response.text()).toBe("created");
            expect(seenRequests).toHaveLength(1);
            expect(seenRequests[0]?.method).toBe("POST");
            expect(seenRequests[0]?.url).toBe(`${server.url}/acp?hello=world`);
            expect(seenRequests[0]?.headers.get("Content-Type")).toBe("application/json");
            expect(seenRequests[0]?.headers.get("X-Client-Test")).toBe("forwarded");
            expect(seenBodies).toEqual([JSON.stringify({ ok: true })]);
        }
        finally {
            await server.close();
        }
    });
    it("aborts forwarded requests when the Node response closes before finishing", async () => {
        const acpServer = new AcpServer({
            createAgent: () => createTestAgentApp(),
        });
        const seenRequest = createDeferred();
        const pendingResponse = createDeferred();
        const response = new CapturingServerResponse();
        acpServer.handleRequest = (req) => {
            seenRequest.resolve(req);
            return pendingResponse.promise;
        };
        createNodeHttpHandler(acpServer)(fakeRequest(), response);
        const request = await seenRequest.promise;
        expect(request.signal.aborted).toBe(false);
        response.emit("close");
        expect(request.signal.aborted).toBe(true);
        pendingResponse.resolve(new Response("closed", { status: 499 }));
        await response.finished;
        expect(response.statusCode).toBe(499);
    });
    it("streams response bodies to ServerResponse", async () => {
        const acpServer = new AcpServer({
            createAgent: () => createTestAgentApp(),
        });
        acpServer.handleRequest = () => Promise.resolve(new Response(new ReadableStream({
            start(controller) {
                const encoder = new TextEncoder();
                controller.enqueue(encoder.encode("data: one\n\n"));
                controller.enqueue(encoder.encode("data: two\n\n"));
                controller.close();
            },
        }), {
            status: 200,
            headers: {
                "Content-Type": "text/event-stream",
            },
        }));
        const server = await startNodeServer(acpServer);
        try {
            const response = await fetch(server.url, { method: "POST" });
            expect(response.status).toBe(200);
            expect(response.headers.get("Content-Type")).toContain("text/event-stream");
            expect(await response.text()).toBe("data: one\n\ndata: two\n\n");
        }
        finally {
            await server.close();
        }
    });
    it("handles empty response bodies", async () => {
        const acpServer = new AcpServer({
            createAgent: () => createTestAgentApp(),
        });
        acpServer.handleRequest = () => Promise.resolve(new Response(null, {
            status: 202,
            headers: {
                "X-Empty-Body": "yes",
            },
        }));
        const server = await startNodeServer(acpServer);
        try {
            const response = await fetch(server.url, { method: "POST" });
            expect(response.status).toBe(202);
            expect(response.headers.get("X-Empty-Body")).toBe("yes");
            expect(await response.text()).toBe("");
        }
        finally {
            await server.close();
        }
    });
    it("preserves multiple Set-Cookie response headers", async () => {
        const acpServer = new AcpServer({
            createAgent: () => createTestAgentApp(),
        });
        acpServer.handleRequest = () => {
            const headers = new Headers({
                "X-Adapter-Test": "cookies",
            });
            headers.append("Set-Cookie", "transport=alpha; Path=/");
            headers.append("Set-Cookie", "route=bravo; Path=/");
            return Promise.resolve(new Response("cookies", {
                status: 200,
                headers,
            }));
        };
        const server = await startNodeServer(acpServer);
        try {
            const response = await rawHttpRequest(server.url);
            expect(response.statusCode).toBe(200);
            expect(response.headers["x-adapter-test"]).toBe("cookies");
            expect(response.headers["set-cookie"]).toEqual([
                "transport=alpha; Path=/",
                "route=bravo; Path=/",
            ]);
            expect(response.body).toBe("cookies");
        }
        finally {
            await server.close();
        }
    });
    it("decodes request bodies across split UTF-8 chunks", async () => {
        const acpServer = new AcpServer({
            createAgent: () => createTestAgentApp(),
        });
        const seenBodies = [];
        const response = new CapturingServerResponse();
        const body = JSON.stringify({ prompt: "split 🚀 path" });
        const bodyBytes = new TextEncoder().encode(body);
        const splitIndex = new TextEncoder().encode(body.slice(0, body.indexOf("🚀"))).length;
        acpServer.handleRequest = async (req) => {
            seenBodies.push(await req.text());
            return new Response("ok");
        };
        createNodeHttpHandler(acpServer)(fakeRequest({
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            bodyChunks: [
                bodyBytes.slice(0, splitIndex + 1),
                "",
                bodyBytes.slice(splitIndex + 1),
            ],
        }), response);
        await response.finished;
        expect(response.statusCode).toBe(200);
        expect(seenBodies).toEqual([body]);
    });
    it("flushes pending UTF-8 bytes before non-empty string chunks", async () => {
        const acpServer = new AcpServer({
            createAgent: () => createTestAgentApp(),
        });
        const seenBodies = [];
        const response = new CapturingServerResponse();
        acpServer.handleRequest = async (req) => {
            seenBodies.push(await req.text());
            return new Response("ok");
        };
        createNodeHttpHandler(acpServer)(fakeRequest({
            method: "POST",
            headers: {
                "content-type": "text/plain",
            },
            bodyChunks: [
                new Uint8Array([0xf0]),
                "x",
                new Uint8Array([0x9f, 0x9a, 0x80]),
            ],
        }), response);
        await response.finished;
        expect(response.statusCode).toBe(200);
        expect(seenBodies).toEqual(["\uFFFDx\uFFFD\uFFFD\uFFFD"]);
    });
    it("falls back to localhost for invalid request host headers", async () => {
        const acpServer = new AcpServer({
            createAgent: () => createTestAgentApp(),
        });
        const seenUrls = [];
        const response = new CapturingServerResponse();
        acpServer.handleRequest = (req) => {
            seenUrls.push(req.url);
            return Promise.resolve(new Response("ok"));
        };
        createNodeHttpHandler(acpServer)(fakeRequest({
            headers: {
                host: "example.com/@internal",
            },
        }), response);
        await response.finished;
        expect(response.statusCode).toBe(200);
        expect(seenUrls).toEqual(["http://localhost/acp"]);
    });
    it("preserves valid request host headers that URL parsing canonicalizes", async () => {
        const acpServer = new AcpServer({
            createAgent: () => createTestAgentApp(),
        });
        const seenUrls = [];
        acpServer.handleRequest = (req) => {
            seenUrls.push(req.url);
            return Promise.resolve(new Response("ok"));
        };
        for (const host of ["EXAMPLE.com", "example.com:80", "[::1]:80"]) {
            const response = new CapturingServerResponse();
            createNodeHttpHandler(acpServer)(fakeRequest({
                headers: { host },
            }), response);
            await response.finished;
            expect(response.statusCode).toBe(200);
        }
        expect(seenUrls).toEqual([
            "http://example.com/acp",
            "http://example.com/acp",
            "http://[::1]/acp",
        ]);
    });
    it("rejects request bodies when Content-Length exceeds the configured limit", async () => {
        const acpServer = new AcpServer({
            createAgent: () => createTestAgentApp(),
        });
        let forwarded = false;
        const response = new CapturingServerResponse();
        acpServer.handleRequest = () => {
            forwarded = true;
            return Promise.resolve(new Response("unexpected"));
        };
        const request = fakeOpenRequest({
            method: "POST",
            headers: {
                "content-length": "5",
            },
        });
        createNodeHttpHandler(acpServer, { maxRequestBodyBytes: 4 })(request, response);
        await response.finished;
        expect(response.statusCode).toBe(413);
        expect(response.chunks.join("")).toBe("Request body exceeds 4 bytes");
        expect(forwarded).toBe(false);
        expect(() => {
            request.emit("error", new Error("client reset"));
        }).not.toThrow();
        expect(request.listenerCount("error")).toBe(0);
    });
    it("rejects chunked request bodies when they exceed the configured limit", async () => {
        const acpServer = new AcpServer({
            createAgent: () => createTestAgentApp(),
        });
        let forwarded = false;
        const response = new CapturingServerResponse();
        acpServer.handleRequest = () => {
            forwarded = true;
            return Promise.resolve(new Response("unexpected"));
        };
        const request = fakeRequest({
            method: "POST",
            bodyChunks: [
                new TextEncoder().encode("123"),
                new TextEncoder().encode("45"),
            ],
        });
        let requestClosedBeforeResponse = false;
        request.once("close", () => {
            requestClosedBeforeResponse = !response.writableEnded;
        });
        createNodeHttpHandler(acpServer, { maxRequestBodyBytes: 4 })(request, response);
        await response.finished;
        expect(response.statusCode).toBe(413);
        expect(response.chunks.join("")).toBe("Request body exceeds 4 bytes");
        expect(forwarded).toBe(false);
        expect(requestClosedBeforeResponse).toBe(false);
    });
    it("cancels streaming response bodies when the Node response closes while backpressured", async () => {
        const acpServer = new AcpServer({
            createAgent: () => createTestAgentApp(),
        });
        const responseCancelled = createDeferred();
        const response = new BackpressuredServerResponse();
        acpServer.handleRequest = () => Promise.resolve(new Response(new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode("data: one\n\n"));
            },
            cancel() {
                responseCancelled.resolve();
            },
        }), {
            status: 200,
            headers: {
                "Content-Type": "text/event-stream",
            },
        }));
        createNodeHttpHandler(acpServer)(fakeRequest(), response);
        await response.wroteChunk;
        response.close();
        await responseCancelled.promise;
        await flushMicrotasks();
        expect(response.ended).toBe(false);
    });
});
describe("createNodeWebSocketUpgradeHandler", () => {
    it("destroys the upgrade socket when WebSocket preparation throws", async () => {
        const error = new Error("factory failed");
        const acpServer = new AcpServer({
            createAgent: () => {
                throw error;
            },
        });
        const webSocketServer = new FakeNodeWebSocketUpgradeServer();
        const socket = new FakeUpgradeSocket();
        const handler = createNodeWebSocketUpgradeHandler(acpServer, webSocketServer);
        try {
            expect(() => handler(fakeRequest(), socket, Buffer.alloc(0))).not.toThrow();
            expect(webSocketServer.handleUpgradeCalls).toBe(0);
            expect(socket.destroyed).toBe(true);
            expect(socket.destroyError).toBe(error);
        }
        finally {
            await acpServer.close();
        }
    });
});
class FakeNodeWebSocketUpgradeServer {
    handleUpgradeCalls = 0;
    on(_event, _listener) { }
    off(_event, _listener) { }
    handleUpgrade(_req, _socket, _head, _callback) {
        this.handleUpgradeCalls += 1;
    }
}
class FakeUpgradeSocket extends EventEmitter {
    destroyed = false;
    destroyError;
    destroy(error) {
        this.destroyed = true;
        this.destroyError = error;
        this.emit("close");
        return this;
    }
}
class CapturingServerResponse extends EventEmitter {
    statusCode = 200;
    headersSent = false;
    destroyed = false;
    writableEnded = false;
    chunks = [];
    finishDeferred = createDeferred();
    finished = this.finishDeferred.promise;
    setHeader() { }
    flushHeaders() {
        this.headersSent = true;
    }
    write(chunk) {
        this.chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
        return true;
    }
    end(chunk) {
        if (chunk !== undefined) {
            this.write(chunk);
        }
        this.writableEnded = true;
        this.finishDeferred.resolve();
    }
}
class BackpressuredServerResponse extends EventEmitter {
    statusCode = 200;
    headersSent = false;
    destroyed = false;
    writableEnded = false;
    ended = false;
    writeDeferred = createDeferred();
    wroteChunk = this.writeDeferred.promise;
    setHeader() { }
    flushHeaders() {
        this.headersSent = true;
    }
    write() {
        this.writeDeferred.resolve();
        return false;
    }
    end() {
        this.ended = true;
        this.writableEnded = true;
    }
    close() {
        this.destroyed = true;
        this.emit("close");
    }
}
function fakeRequest(options = {}) {
    const request = Object.assign(Readable.from(options.bodyChunks ?? []), {
        method: options.method ?? "GET",
        url: "/acp",
        headers: {
            host: "127.0.0.1",
            ...options.headers,
        },
    });
    return request;
}
function fakeOpenRequest(options = {}) {
    const request = Object.assign(new PassThrough(), {
        method: options.method ?? "GET",
        url: "/acp",
        headers: {
            host: "127.0.0.1",
            ...options.headers,
        },
    });
    return request;
}
function createDeferred() {
    let resolve = () => { };
    let reject = () => { };
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}
async function flushMicrotasks() {
    await Promise.resolve();
    await Promise.resolve();
}
async function startNodeServer(acpServer) {
    const server = http.createServer(createNodeHttpHandler(acpServer));
    await new Promise((resolve, reject) => {
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
        server.listen(0, "127.0.0.1");
    });
    const address = server.address();
    if (typeof address !== "object" || address === null) {
        throw new Error("Node test server did not bind to a TCP port");
    }
    return {
        url: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        }),
    };
}
async function rawHttpRequest(url) {
    return new Promise((resolve, reject) => {
        const req = http.get(url, (response) => {
            let body = "";
            response.setEncoding("utf8");
            response.on("data", (chunk) => {
                body += chunk;
            });
            response.on("end", () => {
                resolve({
                    statusCode: response.statusCode,
                    headers: response.headers,
                    body,
                });
            });
        });
        req.on("error", reject);
    });
}
//# sourceMappingURL=node-adapter.test.js.map