"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncEventEmitter = void 0;
const builder_util_1 = require("builder-util");
const builder_util_runtime_1 = require("builder-util-runtime");
class AsyncEventEmitter {
    constructor() {
        this.listeners = new Map();
        this.cancellationToken = new builder_util_runtime_1.CancellationToken();
    }
    on(event, listener, type = "system") {
        var _a;
        if (!listener) {
            return this;
        }
        const listeners = (_a = this.listeners.get(event)) !== null && _a !== void 0 ? _a : [];
        listeners.push({ handler: listener, type });
        this.listeners.set(event, listeners);
        return this;
    }
    off(event, listener) {
        var _a;
        const listeners = (_a = this.listeners.get(event)) === null || _a === void 0 ? void 0 : _a.filter(l => l.handler !== listener);
        if (!(listeners === null || listeners === void 0 ? void 0 : listeners.length)) {
            this.listeners.delete(event);
            return this;
        }
        this.listeners.set(event, listeners);
        return this;
    }
    async emit(event, ...args) {
        const result = { emittedSystem: false, emittedUser: false };
        const eventListeners = this.listeners.get(event) || [];
        if (!eventListeners.length) {
            builder_util_1.log.debug({ event }, "no event listeners found");
            return result;
        }
        const emitInternal = async (listeners) => {
            for (const listener of listeners) {
                if (this.cancellationToken.cancelled) {
                    return false;
                }
                const handler = await Promise.resolve(listener.handler);
                await Promise.resolve(handler === null || handler === void 0 ? void 0 : handler(...args));
            }
            return true;
        };
        result.emittedSystem = await emitInternal(eventListeners.filter(l => l.type === "system"));
        // user handlers are always last
        result.emittedUser = await emitInternal(eventListeners.filter(l => l.type === "user"));
        return result;
    }
    filterListeners(event, type) {
        var _a;
        const listeners = (_a = this.listeners.get(event)) !== null && _a !== void 0 ? _a : [];
        return type ? listeners.filter(l => l.type === type) : listeners;
    }
    clear() {
        this.listeners.clear();
    }
}
exports.AsyncEventEmitter = AsyncEventEmitter;
//# sourceMappingURL=asyncEventEmitter.js.map