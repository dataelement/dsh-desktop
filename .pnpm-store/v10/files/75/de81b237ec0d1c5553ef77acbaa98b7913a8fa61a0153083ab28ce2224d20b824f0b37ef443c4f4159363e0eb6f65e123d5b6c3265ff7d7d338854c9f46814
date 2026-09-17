import { describe, expect, it } from "vitest";
import { onWebSocket, webSocketMessageToString } from "./ws-utils.js";
describe("webSocketMessageToString", () => {
    it("accepts only WebSocket text message payloads", () => {
        expect(webSocketMessageToString(["text"])).toBe("text");
        expect(webSocketMessageToString([{ data: "event text" }])).toBe("event text");
        expect(webSocketMessageToString([new TextEncoder().encode("binary text")])).toBe(undefined);
        expect(webSocketMessageToString([
            new TextEncoder().encode("binary text").buffer,
        ])).toBe(undefined);
        expect(webSocketMessageToString([[new TextEncoder().encode("binary text")]])).toBe(undefined);
    });
});
describe("onWebSocket", () => {
    it("normalizes Node ws text frames before shared message parsing", () => {
        const socket = new EventEmitterWebSocket();
        const messages = [];
        onWebSocket(socket, "message", (...args) => {
            messages.push(webSocketMessageToString(args));
        });
        socket.emit("message", new TextEncoder().encode("text frame"), false);
        socket.emit("message", new TextEncoder().encode("binary frame"), true);
        expect(messages).toEqual(["text frame", undefined]);
    });
});
class EventEmitterWebSocket {
    listeners = new Map();
    send() { }
    close() { }
    on(type, listener) {
        this.listeners.set(type, (this.listeners.get(type) ?? new Set()).add(listener));
    }
    off(type, listener) {
        this.listeners.get(type)?.delete(listener);
    }
    emit(type, ...args) {
        this.listeners.get(type)?.forEach((listener) => {
            listener(...args);
        });
    }
}
//# sourceMappingURL=ws-utils.test.js.map