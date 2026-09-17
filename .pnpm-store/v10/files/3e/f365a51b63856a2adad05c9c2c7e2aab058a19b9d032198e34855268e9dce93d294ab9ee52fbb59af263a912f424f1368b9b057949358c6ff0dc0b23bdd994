import { serializeSseEvent, serializeSseKeepAlive } from "./sse.js";
export function createSseBody(lease) {
    return new ReadableStream(createSseBodySource(lease));
}
/** @internal */
export function createSseBodySource(lease) {
    const encoder = new TextEncoder();
    let keepAliveTimer;
    let isReceiving = false;
    let isClosed = false;
    const clearKeepAlive = () => {
        if (keepAliveTimer) {
            clearInterval(keepAliveTimer);
            keepAliveTimer = undefined;
        }
    };
    const enqueueText = (controller, text) => {
        try {
            controller.enqueue(encoder.encode(text));
            return true;
        }
        catch {
            return false;
        }
    };
    const hasDemand = (controller) => controller.desiredSize !== null && controller.desiredSize > 0;
    const closeBody = (controller) => {
        if (isClosed) {
            return;
        }
        isClosed = true;
        clearKeepAlive();
        lease.release();
        try {
            controller.close();
        }
        catch {
            // Stream may already be cancelled by the consumer.
        }
    };
    return {
        start(controller) {
            keepAliveTimer = setInterval(() => {
                if (isClosed || !hasDemand(controller)) {
                    return;
                }
                if (!enqueueText(controller, serializeSseKeepAlive())) {
                    closeBody(controller);
                }
            }, 15_000);
        },
        async pull(controller) {
            if (isClosed || isReceiving || !hasDemand(controller)) {
                return;
            }
            isReceiving = true;
            try {
                const result = await lease.receive();
                if (isClosed) {
                    return;
                }
                if (result.done) {
                    closeBody(controller);
                    return;
                }
                if (!enqueueText(controller, serializeSseEvent(result.value))) {
                    closeBody(controller);
                }
            }
            catch (error) {
                if (!isClosed) {
                    isClosed = true;
                    clearKeepAlive();
                    controller.error(error);
                }
            }
            finally {
                isReceiving = false;
            }
        },
        cancel() {
            isClosed = true;
            clearKeepAlive();
            lease.release();
        },
    };
}
//# sourceMappingURL=server-sse.js.map