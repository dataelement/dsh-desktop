import { AssistantMessageEventStream } from "../utils/event-stream.js";
function createSetupErrorMessage(model, error) {
    return {
        role: "assistant",
        content: [],
        api: model.api,
        provider: model.provider,
        model: model.id,
        usage: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 0,
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        },
        stopReason: "error",
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
    };
}
function hasResult(source) {
    return typeof source.result === "function";
}
async function forwardStream(target, source) {
    for await (const event of source) {
        target.push(event);
    }
    target.end(hasResult(source) ? await source.result() : undefined);
}
/**
 * Returns a stream synchronously while running async setup (auth resolution,
 * lazy module loading) behind it. Setup failures terminate the stream with an
 * error event.
 */
export function lazyStream(model, setup) {
    const outer = new AssistantMessageEventStream();
    setup()
        .then((inner) => forwardStream(outer, inner))
        .catch((error) => {
        const message = createSetupErrorMessage(model, error);
        outer.push({ type: "error", reason: "error", error: message });
        outer.end(message);
    });
    return outer;
}
export function lazyApi(load, capabilities) {
    const api = {
        stream: (model, context, options) => lazyStream(model, async () => (await load()).stream(model, context, options)),
        streamSimple: (model, context, options) => lazyStream(model, async () => (await load()).streamSimple(model, context, options)),
    };
    if (capabilities?.fetchDeferred) {
        api.fetchDeferred = (model, handle, options) => lazyStream(model, async () => {
            const implementation = await load();
            if (!implementation.fetchDeferred)
                throw new Error("API does not support deferred responses");
            return implementation.fetchDeferred(model, handle, options);
        });
    }
    if (capabilities?.cancelDeferred) {
        api.cancelDeferred = async (model, handle, options) => {
            const implementation = await load();
            if (!implementation.cancelDeferred)
                throw new Error("API cannot cancel deferred responses");
            await implementation.cancelDeferred(model, handle, options);
        };
    }
    return api;
}
//# sourceMappingURL=lazy.js.map