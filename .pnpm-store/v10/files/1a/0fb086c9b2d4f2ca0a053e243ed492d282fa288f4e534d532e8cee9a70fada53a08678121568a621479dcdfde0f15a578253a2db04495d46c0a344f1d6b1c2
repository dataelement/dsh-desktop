"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SSE_KEEP_ALIVE_MS = void 0;
exports.armSseKeepAlive = armSseKeepAlive;
/** Default interval between SSE keep-alive comment frames. */
exports.DEFAULT_SSE_KEEP_ALIVE_MS = 15000;
const MAX_TIMER_DELAY_MS = 2 ** 31 - 1;
/** Arms an unref'd timer, or disables keep-alive for invalid delays. */
function armSseKeepAlive(intervalMs, onTick) {
    if (!Number.isFinite(intervalMs) || intervalMs < 1) {
        return undefined;
    }
    const timer = setInterval(onTick, Math.min(intervalMs, MAX_TIMER_DELAY_MS));
    timer.unref?.();
    return timer;
}
//# sourceMappingURL=sseKeepAlive.js.map