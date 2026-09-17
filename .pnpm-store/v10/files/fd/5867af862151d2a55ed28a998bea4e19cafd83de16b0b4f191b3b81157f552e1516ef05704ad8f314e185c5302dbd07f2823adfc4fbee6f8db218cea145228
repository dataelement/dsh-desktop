import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { Connection, RequestError, batchNotification, batchRequest, isJsonRpcBatchMessage, isJsonRpcMessage, isJsonRpcWireMessage, } from "./jsonrpc.js";
describe("JSON-RPC envelope validation", () => {
    it.each([
        { jsonrpc: "2.0", method: "initialized" },
        { jsonrpc: "2.0", id: 1, method: "initialize" },
        { jsonrpc: "2.0", id: "request-1", result: null },
        {
            jsonrpc: "2.0",
            id: null,
            error: {
                code: -32603,
                message: "Internal error",
                data: { retry: false },
            },
        },
    ])("accepts valid JSON-RPC messages: %o", (message) => {
        expect(isJsonRpcMessage(message)).toBe(true);
    });
    it.each([
        { jsonrpc: "2.0", id: 1 },
        { jsonrpc: "2.0", id: {}, result: true },
        { jsonrpc: "2.0", id: Number.NaN, result: true },
        { jsonrpc: "2.0", id: Number.POSITIVE_INFINITY, result: true },
        {
            jsonrpc: "2.0",
            id: 1,
            result: true,
            error: { code: -32603, message: "Internal error" },
        },
        { jsonrpc: "2.0", id: 1, error: { code: "-32603", message: "Error" } },
        { jsonrpc: "2.0", id: 1, error: { code: -32603 } },
        { jsonrpc: "2.0", method: "initialize", id: {} },
    ])("rejects malformed JSON-RPC messages: %o", (message) => {
        expect(isJsonRpcMessage(message)).toBe(false);
    });
    it("accepts non-empty batches as wire messages", () => {
        const batch = [
            { jsonrpc: "2.0", id: 1, method: "example/one" },
            { jsonrpc: "2.0", method: "example/notify" },
        ];
        expect(isJsonRpcMessage(batch)).toBe(false);
        expect(isJsonRpcBatchMessage(batch)).toBe(true);
        expect(isJsonRpcWireMessage(batch)).toBe(true);
        expect(isJsonRpcBatchMessage([])).toBe(false);
        expect(isJsonRpcBatchMessage([
            { jsonrpc: "2.0", id: 1, method: "example/one" },
            { jsonrpc: "2.0", id: 1, result: true },
        ])).toBe(false);
    });
});
describe("JSON-RPC batches", () => {
    it("preserves fourth-argument request options when the mapper is omitted", () => {
        const cancellationSignal = new AbortController().signal;
        const request = batchRequest("example/slow", {}, undefined, { cancellationSignal });
        expect(request.mapResponse).toBeUndefined();
        expect(request.options).toEqual({ cancellationSignal });
    });
    it("sends calls together and demultiplexes the response batch", async () => {
        const [clientStream, serverStream] = memoryStreamPair();
        const notifications = [];
        const server = Connection.builder()
            .onReceiveRequest("example/add", (params) => params, (params, responder) => responder.respond(params.left + params.right))
            .onReceiveNotification("example/note", (params) => params, (params) => {
            notifications.push(params);
        })
            .connect(serverStream);
        const client = Connection.builder().connect(clientStream);
        try {
            const outputs = await client.sendBatch([
                batchRequest("example/add", {
                    left: 2,
                    right: 3,
                }),
                batchNotification("example/note", { value: 8 }),
                batchRequest("example/add", { left: 5, right: 7 }, (value) => `sum:${value}`),
            ]);
            expectTypeOf(outputs).toEqualTypeOf();
            expect(outputs).toEqual([5, undefined, "sum:12"]);
            expect(notifications).toEqual([{ value: 8 }]);
        }
        finally {
            client.close();
            server.close();
            await Promise.all([client.closed, server.closed]);
        }
    });
    it("rejects pending batch requests for malformed matching responses", async () => {
        const [clientStream, peerStream] = memoryStreamPair();
        const client = Connection.builder().connect(clientStream);
        const peerReader = peerStream.readable.getReader();
        const peerWriter = peerStream.writable.getWriter();
        try {
            const response = client.sendBatch([
                batchRequest("example/first", {}),
                batchRequest("example/second", {}),
                batchRequest("example/third", {}),
            ]);
            const { value: requestBatch } = await peerReader.read();
            const [first, second, third] = requestBatch;
            await peerWriter.write([
                { jsonrpc: "2.0", id: first.id, error: null },
                {
                    jsonrpc: "2.0",
                    id: second.id,
                    result: { ok: true },
                    error: { code: -32000, message: "conflicting response" },
                },
                { jsonrpc: "2.0", id: third.id },
            ]);
            await expect(response).rejects.toMatchObject({ code: -32600 });
            expect(client.pendingResponses.size).toBe(0);
        }
        finally {
            peerReader.releaseLock();
            peerWriter.releaseLock();
            client.close();
            await client.closed;
        }
    });
    it("returns Invalid Request for malformed members of a call batch", async () => {
        const [connectionStream, peerStream] = memoryStreamPair();
        const connection = Connection.builder()
            .onReceiveRequest("example/echo", (params) => params, (params, responder) => responder.respond(params))
            .connect(connectionStream);
        const peerReader = peerStream.readable.getReader();
        const peerWriter = peerStream.writable.getWriter();
        try {
            await peerWriter.write([
                {
                    jsonrpc: "2.0",
                    id: 1,
                    method: "example/echo",
                    params: { ok: true },
                },
                { jsonrpc: "2.0", id: 2 },
            ]);
            const { value: response } = await peerReader.read();
            expect(response).toEqual(expect.arrayContaining([
                { jsonrpc: "2.0", id: 1, result: { ok: true } },
                {
                    jsonrpc: "2.0",
                    id: null,
                    error: expect.objectContaining({ code: -32600 }),
                },
            ]));
            expect(response).toHaveLength(2);
        }
        finally {
            peerReader.releaseLock();
            peerWriter.releaseLock();
            connection.close();
            await connection.closed;
        }
    });
    it("rejects response members of a call batch without resolving pending requests", async () => {
        const [connectionStream, peerStream] = memoryStreamPair();
        const connection = Connection.builder()
            .onReceiveRequest("example/echo", (params) => params, (params, responder) => responder.respond(params))
            .connect(connectionStream);
        const peerReader = peerStream.readable.getReader();
        const peerWriter = peerStream.writable.getWriter();
        const closeError = new Error("test complete");
        const pending = connection.sendRequest("example/outgoing", {});
        try {
            const { value: outgoing } = await peerReader.read();
            if (!outgoing || Array.isArray(outgoing) || !("id" in outgoing)) {
                throw new Error("Expected an outgoing request");
            }
            await peerWriter.write([
                {
                    jsonrpc: "2.0",
                    id: 77,
                    method: "example/echo",
                    params: { ok: true },
                },
                { jsonrpc: "2.0", id: outgoing.id, result: "hijacked" },
            ]);
            const { value: response } = await peerReader.read();
            expect(response).toEqual(expect.arrayContaining([
                { jsonrpc: "2.0", id: 77, result: { ok: true } },
                {
                    jsonrpc: "2.0",
                    id: null,
                    error: expect.objectContaining({ code: -32600 }),
                },
            ]));
            expect(response).toHaveLength(2);
            expect(connection.pendingResponses.has(outgoing.id)).toBe(true);
        }
        finally {
            peerReader.releaseLock();
            peerWriter.releaseLock();
            connection.close(closeError);
            await connection.closed;
        }
        await expect(pending).rejects.toBe(closeError);
    });
    it("does not reply to malformed members of a response batch", async () => {
        const consoleError = vi
            .spyOn(console, "error")
            .mockImplementation(() => { });
        let incoming;
        const writes = [];
        const connection = Connection.builder().connect({
            readable: new ReadableStream({
                start(controller) {
                    incoming = controller;
                },
            }),
            writable: new WritableStream({
                write(message) {
                    writes.push(message);
                },
            }),
        });
        try {
            const response = connection.sendBatch([
                batchRequest("example/test", {}),
            ]);
            await vi.waitFor(() => expect(writes).toHaveLength(1));
            const [{ id }] = writes[0];
            incoming.enqueue([
                { jsonrpc: "2.0", id, result: true },
                { jsonrpc: "2.0", method: null },
                { jsonrpc: "2.0", result: true },
                { jsonrpc: "2.0", error: null },
                17,
            ]);
            await expect(response).resolves.toEqual([true]);
            await connection.sendNotification("example/after-response", {});
            expect(writes).toHaveLength(2);
            expect(writes[1]).toMatchObject({ method: "example/after-response" });
        }
        finally {
            consoleError.mockRestore();
            connection.close();
            await connection.closed;
        }
    });
    it("waits for notifications before sending collected request responses", async () => {
        const [connectionStream, peerStream] = memoryStreamPair();
        const notificationStarted = Promise.withResolvers();
        const releaseNotification = Promise.withResolvers();
        const notificationHandled = Promise.withResolvers();
        const requestsHandled = Promise.withResolvers();
        let handledRequests = 0;
        const connection = Connection.builder()
            .onReceiveRequest("example/echo", (params) => params, async (params, responder) => {
            await responder.respond(params);
            handledRequests += 1;
            if (handledRequests === 2) {
                requestsHandled.resolve();
            }
        })
            .onReceiveNotification("example/note", (params) => params, async () => {
            notificationStarted.resolve();
            await releaseNotification.promise;
            notificationHandled.resolve();
        })
            .connect(connectionStream);
        const writer = peerStream.writable.getWriter();
        const reader = peerStream.readable.getReader();
        try {
            await writer.write([
                {
                    jsonrpc: "2.0",
                    id: "first",
                    method: "example/echo",
                    params: { value: 1 },
                },
                {
                    jsonrpc: "2.0",
                    method: "example/note",
                    params: { value: 2 },
                },
                {
                    jsonrpc: "2.0",
                    id: "second",
                    method: "example/echo",
                    params: { value: 3 },
                },
            ]);
            let responseSettled = false;
            const response = reader.read().then((result) => {
                responseSettled = true;
                return result;
            });
            await notificationStarted.promise;
            await requestsHandled.promise;
            expect(responseSettled).toBe(false);
            releaseNotification.resolve();
            const { value } = await response;
            expect(value).toEqual([
                { jsonrpc: "2.0", id: "first", result: { value: 1 } },
                { jsonrpc: "2.0", id: "second", result: { value: 3 } },
            ]);
            await notificationHandled.promise;
        }
        finally {
            writer.releaseLock();
            reader.releaseLock();
            connection.close();
            await connection.closed;
        }
    });
    it("processes batch requests concurrently and responds in completion order", async () => {
        const [connectionStream, peerStream] = memoryStreamPair();
        const releaseSlow = Promise.withResolvers();
        const fastHandled = Promise.withResolvers();
        const connection = Connection.builder()
            .onReceiveRequest("example/slow", (params) => params, async (_params, responder) => {
            await releaseSlow.promise;
            await responder.respond("slow");
        })
            .onReceiveRequest("example/fast", (params) => params, async (_params, responder) => {
            await responder.respond("fast");
            fastHandled.resolve();
        })
            .connect(connectionStream);
        const writer = peerStream.writable.getWriter();
        const reader = peerStream.readable.getReader();
        try {
            await writer.write([
                { jsonrpc: "2.0", id: "slow", method: "example/slow" },
                { jsonrpc: "2.0", id: "fast", method: "example/fast" },
            ]);
            await fastHandled.promise;
            releaseSlow.resolve();
            await expect(reader.read()).resolves.toEqual({
                done: false,
                value: [
                    { jsonrpc: "2.0", id: "fast", result: "fast" },
                    { jsonrpc: "2.0", id: "slow", result: "slow" },
                ],
            });
        }
        finally {
            writer.releaseLock();
            reader.releaseLock();
            connection.close();
            await connection.closed;
        }
    });
    it("emits nothing for a notification-only batch", async () => {
        const handled = Promise.withResolvers();
        const writes = [];
        const stream = {
            readable: new ReadableStream({
                start(controller) {
                    controller.enqueue([
                        { jsonrpc: "2.0", method: "example/note", params: { value: 1 } },
                        { jsonrpc: "2.0", method: "example/note", params: { value: 2 } },
                    ]);
                },
            }),
            writable: new WritableStream({
                write(message) {
                    writes.push(message);
                },
            }),
        };
        let notifications = 0;
        const connection = Connection.builder()
            .onReceiveNotification("example/note", (params) => params, () => {
            notifications += 1;
            if (notifications === 2)
                handled.resolve();
        })
            .connect(stream);
        try {
            await handled.promise;
            await Promise.resolve();
            expect(writes).toEqual([]);
        }
        finally {
            connection.close();
            await connection.closed;
        }
    });
    it("waits for a notification-only batch write to finish", async () => {
        const writeStarted = Promise.withResolvers();
        const releaseWrite = Promise.withResolvers();
        const connection = Connection.builder().connect({
            readable: new ReadableStream(),
            writable: new WritableStream({
                async write() {
                    writeStarted.resolve();
                    await releaseWrite.promise;
                },
            }),
        });
        try {
            const sent = connection.sendBatch([
                batchNotification("example/note", { value: 1 }),
            ]);
            let settled = false;
            void sent.then(() => {
                settled = true;
            });
            await writeStarted.promise;
            await Promise.resolve();
            expect(settled).toBe(false);
            releaseWrite.resolve();
            await expect(sent).resolves.toEqual([undefined]);
        }
        finally {
            connection.close();
            await connection.closed;
        }
    });
    it("handles ignored batch rejections without changing awaited rejections", async () => {
        const unhandledRejections = [];
        const onUnhandledRejection = (reason) => {
            unhandledRejections.push(reason);
        };
        process.on("unhandledRejection", onUnhandledRejection);
        const connection = Connection.builder().connect({
            readable: new ReadableStream(),
            writable: new WritableStream(),
        });
        const closeError = new Error("test complete");
        try {
            const awaited = connection.sendBatch([
                batchRequest("example/awaited", {}),
            ]);
            const awaitedRejection = expect(awaited).rejects.toBe(closeError);
            void connection.sendBatch([
                batchRequest("example/ignored", {}),
            ]);
            connection.close(closeError);
            await awaitedRejection;
            await connection.closed;
            await new Promise((resolve) => setTimeout(resolve, 0));
            expect(unhandledRejections).toEqual([]);
        }
        finally {
            process.off("unhandledRejection", onUnhandledRejection);
            connection.close();
            await connection.closed;
        }
    });
    it("cancels one batch request after queueing the batch", async () => {
        const writes = [];
        const cancellationWritten = Promise.withResolvers();
        const connection = Connection.builder().connect({
            readable: new ReadableStream(),
            writable: new WritableStream({
                write(message) {
                    writes.push(message);
                    if (writes.length === 2)
                        cancellationWritten.resolve();
                },
            }),
        });
        const closeError = new Error("test complete");
        const result = connection.sendBatch([
            batchRequest("example/slow", {}, {
                cancellationSignal: AbortSignal.abort("already cancelled"),
            }),
        ]);
        try {
            await cancellationWritten.promise;
            expect(writes[0]).toEqual([
                expect.objectContaining({
                    jsonrpc: "2.0",
                    id: 0,
                    method: "example/slow",
                }),
            ]);
            expect(writes[1]).toEqual({
                jsonrpc: "2.0",
                method: "$/cancel_request",
                params: { requestId: 0 },
            });
        }
        finally {
            connection.close(closeError);
            await connection.closed;
        }
        await expect(result).rejects.toBe(closeError);
    });
    it("returns per-entry errors and a single error for an empty batch", async () => {
        const [connectionStream, peerStream] = memoryStreamPair();
        const connection = Connection.builder().connect(connectionStream);
        const writer = peerStream.writable.getWriter();
        const reader = peerStream.readable.getReader();
        try {
            await writer.write([
                42,
                { jsonrpc: "2.0", id: 1, method: "missing" },
            ]);
            const invalidEntries = (await reader.read()).value;
            expect(invalidEntries).toEqual([
                {
                    jsonrpc: "2.0",
                    id: null,
                    error: expect.objectContaining({ code: -32600 }),
                },
                {
                    jsonrpc: "2.0",
                    id: 1,
                    error: expect.objectContaining({ code: -32601 }),
                },
            ]);
            await writer.write([]);
            expect((await reader.read()).value).toEqual({
                jsonrpc: "2.0",
                id: null,
                error: expect.objectContaining({ code: -32600 }),
            });
        }
        finally {
            writer.releaseLock();
            reader.releaseLock();
            connection.close();
            await connection.closed;
        }
    });
});
describe("JSON-RPC request cancellation", () => {
    it("keeps an aborted outgoing request pending for the peer response", async () => {
        const [clientStream, serverStream] = memoryStreamPair();
        const slowResponder = Promise.withResolvers();
        const cancelReceived = Promise.withResolvers();
        const consoleError = vi
            .spyOn(console, "error")
            .mockImplementation(() => { });
        const server = Connection.builder()
            .onReceiveRequest("example/slow", (params) => params, (_request, responder) => {
            slowResponder.resolve(responder);
            return new Promise(() => { });
        })
            .onReceiveRequest("example/barrier", (params) => params, (_, responder) => responder.respond({ ok: true }))
            .onReceiveNotification("$/cancel_request", (params) => params, (params) => {
            cancelReceived.resolve(params);
        })
            .connect(serverStream);
        const client = Connection.builder().connect(clientStream);
        try {
            const abortController = new AbortController();
            const response = client.sendRequest("example/slow", {}, undefined, {
                cancellationSignal: abortController.signal,
            });
            let settled = false;
            response.then(() => {
                settled = true;
            }, () => {
                settled = true;
            });
            const responder = await slowResponder.promise;
            const clientInternals = client;
            abortController.abort("user cancelled");
            await expect(cancelReceived.promise).resolves.toEqual({
                requestId: responder.id,
            });
            await Promise.resolve();
            expect(settled).toBe(false);
            expect(clientInternals.pendingResponses.has(responder.id)).toBe(true);
            await responder.respond({ ok: true });
            await expect(response).resolves.toEqual({ ok: true });
            expect(clientInternals.pendingResponses.has(responder.id)).toBe(false);
            await expect(client.sendRequest("example/barrier", {})).resolves.toEqual({
                ok: true,
            });
            expect(consoleError).not.toHaveBeenCalled();
        }
        finally {
            consoleError.mockRestore();
            client.close();
            server.close();
            await Promise.all([client.closed, server.closed]);
        }
    });
    it("sends an already-aborted cancellation signal after the request", async () => {
        const [clientStream, serverStream] = memoryStreamPair();
        const slowResponder = Promise.withResolvers();
        const cancelReceived = Promise.withResolvers();
        const server = Connection.builder()
            .onReceiveRequest("example/slow", (params) => params, (_request, responder) => {
            slowResponder.resolve(responder);
            return new Promise(() => { });
        })
            .onReceiveNotification("$/cancel_request", (params) => params, (params) => {
            cancelReceived.resolve(params);
        })
            .connect(serverStream);
        const client = Connection.builder().connect(clientStream);
        try {
            const response = client.sendRequest("example/slow", {}, undefined, {
                cancellationSignal: AbortSignal.abort("already cancelled"),
            });
            const responder = await slowResponder.promise;
            await expect(cancelReceived.promise).resolves.toEqual({
                requestId: responder.id,
            });
            await responder.respond({ ok: true });
            await expect(response).resolves.toEqual({ ok: true });
        }
        finally {
            client.close();
            server.close();
            await Promise.all([client.closed, server.closed]);
        }
    });
    it("queues already-aborted cancellation before later writes", async () => {
        const messages = [];
        const firstWriteStarted = Promise.withResolvers();
        const unblockFirstWrite = Promise.withResolvers();
        const thirdWriteCompleted = Promise.withResolvers();
        let writes = 0;
        const client = Connection.builder().connect({
            readable: new ReadableStream(),
            writable: new WritableStream({
                async write(message) {
                    writes += 1;
                    messages.push(message);
                    if (writes === 1) {
                        firstWriteStarted.resolve();
                        await unblockFirstWrite.promise;
                    }
                    if (writes === 3) {
                        thirdWriteCompleted.resolve();
                    }
                },
            }),
        });
        try {
            const response = client.sendRequest("example/slow", {}, undefined, {
                cancellationSignal: AbortSignal.abort("already cancelled"),
            });
            response.catch(() => { });
            await firstWriteStarted.promise;
            const laterNotification = client.sendNotification("example/later", {});
            unblockFirstWrite.resolve();
            await thirdWriteCompleted.promise;
            await laterNotification;
            expect(messages[0]).toMatchObject({
                method: "example/slow",
            });
            expect(messages[1]).toMatchObject({
                method: "$/cancel_request",
                params: { requestId: "id" in messages[0] ? messages[0].id : undefined },
            });
            expect(messages[2]).toMatchObject({
                method: "example/later",
            });
        }
        finally {
            client.close();
            await client.closed;
        }
    });
    it("keeps manually cancelled requests pending for the peer response", async () => {
        const [clientStream, serverStream] = memoryStreamPair();
        const slowResponder = Promise.withResolvers();
        const cancelReceived = Promise.withResolvers();
        const server = Connection.builder()
            .onReceiveRequest("example/slow", (params) => params, (_request, responder) => {
            slowResponder.resolve(responder);
            return new Promise(() => { });
        })
            .onReceiveNotification("$/cancel_request", (params) => params, (params) => {
            cancelReceived.resolve(params);
        })
            .connect(serverStream);
        const client = Connection.builder().connect(clientStream);
        try {
            const response = client.sendRequest("example/slow", {});
            const responder = await slowResponder.promise;
            const clientInternals = client;
            await client.sendCancelRequest(responder.id);
            await expect(cancelReceived.promise).resolves.toEqual({
                requestId: responder.id,
            });
            expect(clientInternals.pendingResponses.has(responder.id)).toBe(true);
            await responder.respond({ ok: true });
            await expect(response).resolves.toEqual({ ok: true });
            expect(clientInternals.pendingResponses.has(responder.id)).toBe(false);
        }
        finally {
            client.close();
            server.close();
            await Promise.all([client.closed, server.closed]);
        }
    });
    it("aborts the incoming request signal when $/cancel_request is received", async () => {
        const [clientStream, serverStream] = memoryStreamPair();
        const requestReceived = Promise.withResolvers();
        const server = Connection.builder()
            .onReceiveRequest("example/slow", (params) => params, async (_request, responder) => {
            requestReceived.resolve({
                id: responder.id,
                signal: responder.signal,
            });
            await new Promise((resolve) => {
                responder.signal.addEventListener("abort", () => resolve(), {
                    once: true,
                });
            });
            await responder.respondWithError(RequestError.requestCancelled());
        })
            .connect(serverStream);
        const client = Connection.builder().connect(clientStream);
        try {
            const response = client.sendRequest("example/slow", {});
            const { id, signal } = await requestReceived.promise;
            expect(signal.aborted).toBe(false);
            await client.sendCancelRequest(id);
            await expect(response).rejects.toMatchObject({
                code: -32800,
                message: "Request cancelled",
            });
            expect(signal.aborted).toBe(true);
            expect(signal.reason).toBeInstanceOf(RequestError);
            expect(signal.reason.code).toBe(-32800);
        }
        finally {
            client.close();
            server.close();
            await Promise.all([client.closed, server.closed]);
        }
    });
    it("maps raw request abort errors to request cancellation", async () => {
        const [clientStream, serverStream] = memoryStreamPair();
        const requestReceived = Promise.withResolvers();
        const server = Connection.builder()
            .onReceiveRequest("example/slow", (params) => params, async (_request, responder) => {
            requestReceived.resolve({
                id: responder.id,
                signal: responder.signal,
            });
            await new Promise((_, reject) => {
                responder.signal.addEventListener("abort", () => {
                    const error = new Error("aborted");
                    error.name = "AbortError";
                    reject(error);
                }, { once: true });
            });
        })
            .connect(serverStream);
        const client = Connection.builder().connect(clientStream);
        try {
            const response = client.sendRequest("example/slow", {});
            const { id, signal } = await requestReceived.promise;
            expect(signal.aborted).toBe(false);
            await client.sendCancelRequest(id);
            await expect(response).rejects.toMatchObject({
                code: -32800,
                message: "Request cancelled",
            });
        }
        finally {
            client.close();
            server.close();
            await Promise.all([client.closed, server.closed]);
        }
    });
    it("rejects requests started from request abort listeners during close", async () => {
        const [clientStream, serverStream] = memoryStreamPair();
        const requestStarted = Promise.withResolvers();
        const closeTimeRequestStarted = Promise.withResolvers();
        const closeError = new Error("closing");
        let closeTimeRequest;
        const server = Connection.builder()
            .onReceiveRequest("example/slow", (params) => params, (_request, responder, cx) => {
            responder.signal.addEventListener("abort", () => {
                closeTimeRequest = cx.sendRequest("example/after-close", {});
                closeTimeRequest.catch(() => { });
                closeTimeRequestStarted.resolve();
            }, { once: true });
            requestStarted.resolve();
            return new Promise(() => { });
        })
            .connect(serverStream);
        const client = Connection.builder().connect(clientStream);
        try {
            const response = client.sendRequest("example/slow", {});
            response.catch(() => { });
            await requestStarted.promise;
            server.close(closeError);
            await closeTimeRequestStarted.promise;
            expect(server.pendingResponses.size).toBe(0);
            expect(closeTimeRequest).toBeDefined();
            await expect(closeTimeRequest).rejects.toBe(closeError);
        }
        finally {
            client.close();
            server.close();
            await Promise.all([client.closed, server.closed]);
        }
    });
});
describe("JSON-RPC malformed peer messages", () => {
    it("rejects a matching malformed response without replying to it", async () => {
        const [clientStream, serverStream] = memoryStreamPair();
        const client = Connection.builder().connect(clientStream);
        const serverReader = serverStream.readable.getReader();
        const serverWriter = serverStream.writable.getWriter();
        const response = client.sendRequest("example/test", {});
        const { value: request } = await serverReader.read();
        expect(request).toMatchObject({ method: "example/test" });
        await serverWriter.write({
            jsonrpc: "2.0",
            id: request.id,
            error: null,
        });
        await expect(response).rejects.toMatchObject({ code: -32600 });
        const notification = client.sendNotification("example/after-response", {});
        await expect(serverReader.read()).resolves.toMatchObject({
            value: {
                jsonrpc: "2.0",
                method: "example/after-response",
            },
        });
        await notification;
        serverReader.releaseLock();
        serverWriter.releaseLock();
        client.close();
        await client.closed;
    });
    it("does not reply to unknown malformed response-shaped messages", async () => {
        const consoleError = vi
            .spyOn(console, "error")
            .mockImplementation(() => { });
        const [clientStream, serverStream] = memoryStreamPair();
        const processed = Promise.withResolvers();
        const client = Connection.builder()
            .onReceiveNotification("example/barrier", (params) => params, () => {
            processed.resolve();
        })
            .connect(clientStream);
        const serverReader = serverStream.readable.getReader();
        const serverWriter = serverStream.writable.getWriter();
        await serverWriter.write({
            jsonrpc: "2.0",
            id: 999,
            error: null,
        });
        await serverWriter.write({
            jsonrpc: "2.0",
            result: true,
        });
        await serverWriter.write({
            jsonrpc: "2.0",
            error: null,
        });
        await serverWriter.write({
            jsonrpc: "2.0",
            method: "example/barrier",
        });
        await processed.promise;
        const notification = client.sendNotification("example/after-responses", {});
        await expect(serverReader.read()).resolves.toMatchObject({
            value: {
                jsonrpc: "2.0",
                method: "example/after-responses",
            },
        });
        await notification;
        serverReader.releaseLock();
        serverWriter.releaseLock();
        consoleError.mockRestore();
        client.close();
        await client.closed;
    });
    it("returns Invalid Request for malformed call-shaped values and stays open", async () => {
        const [clientStream, serverStream] = memoryStreamPair();
        const client = Connection.builder().connect(clientStream);
        const serverReader = serverStream.readable.getReader();
        const serverWriter = serverStream.writable.getWriter();
        for (const malformed of [
            null,
            42,
            {},
            { jsonrpc: "1.0", id: 1, method: "example/test" },
            { jsonrpc: "2.0", id: 1, method: 42 },
            { jsonrpc: "2.0", id: {}, method: "example/test" },
        ]) {
            await serverWriter.write(malformed);
            await expect(serverReader.read()).resolves.toMatchObject({
                value: {
                    jsonrpc: "2.0",
                    id: null,
                    error: { code: -32600 },
                },
            });
        }
        const response = client.sendRequest("example/test", {});
        const { value: request } = await serverReader.read();
        await serverWriter.write({
            jsonrpc: "2.0",
            id: request.id,
            result: { ok: true },
        });
        await expect(response).resolves.toEqual({ ok: true });
        serverReader.releaseLock();
        serverWriter.releaseLock();
        client.close();
        await client.closed;
    });
});
function memoryStreamPair() {
    const leftToRight = new TransformStream();
    const rightToLeft = new TransformStream();
    return [
        {
            readable: rightToLeft.readable,
            writable: leftToRight.writable,
        },
        {
            readable: leftToRight.readable,
            writable: rightToLeft.writable,
        },
    ];
}
//# sourceMappingURL=jsonrpc.test.js.map