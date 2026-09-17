export function onWebSocket(socket, type, listener) {
    if (socket.on) {
        const eventListener = (...args) => {
            listener(...normalizeEventEmitterMessageArgs(type, args));
        };
        socket.on(type, eventListener);
        return () => {
            if (socket.off) {
                socket.off(type, eventListener);
                return;
            }
            socket.removeListener?.(type, eventListener);
        };
    }
    if (socket.addEventListener) {
        const eventListener = (event) => listener(event);
        socket.addEventListener(type, eventListener);
        return () => {
            socket.removeEventListener?.(type, eventListener);
        };
    }
    throw new Error("WebSocket object does not support event listeners");
}
export function webSocketMessageToString(args) {
    const data = extractMessageData(args);
    if (typeof data === "string") {
        return data;
    }
    return undefined;
}
function normalizeEventEmitterMessageArgs(type, args) {
    if (type !== "message" || typeof args[1] !== "boolean") {
        return args;
    }
    if (args[1]) {
        return [undefined];
    }
    return [decodeWebSocketTextData(args[0])];
}
function decodeWebSocketTextData(data) {
    if (typeof data === "string") {
        return data;
    }
    if (data instanceof ArrayBuffer) {
        return new TextDecoder().decode(data);
    }
    if (ArrayBuffer.isView(data)) {
        return new TextDecoder().decode(data);
    }
    if (isArrayBufferViewArray(data)) {
        return decodeArrayBufferViews(data);
    }
    return undefined;
}
function extractMessageData(args) {
    const [first] = args;
    if (isMessageEventLike(first)) {
        return first.data;
    }
    return first;
}
function isMessageEventLike(value) {
    return typeof value === "object" && value !== null && "data" in value;
}
function isArrayBufferViewArray(value) {
    return Array.isArray(value) && value.every(ArrayBuffer.isView);
}
function decodeArrayBufferViews(views) {
    const totalLength = views.reduce((sum, view) => sum + view.byteLength, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const view of views) {
        combined.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength), offset);
        offset += view.byteLength;
    }
    return new TextDecoder().decode(combined);
}
//# sourceMappingURL=ws-utils.js.map