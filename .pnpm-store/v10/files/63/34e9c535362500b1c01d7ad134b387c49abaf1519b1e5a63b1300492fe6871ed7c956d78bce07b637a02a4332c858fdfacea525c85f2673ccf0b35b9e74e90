import type { AssistantMessage, AssistantMessageEvent } from "../types.ts";
export declare class EventStream<T, R = T> implements AsyncIterable<T> {
    private queue;
    private waiting;
    private done;
    private finalResultPromise;
    private resolveFinalResult;
    private isComplete;
    private extractResult;
    constructor(isComplete: (event: T) => boolean, extractResult: (event: T) => R);
    push(event: T): void;
    end(result?: R): void;
    [Symbol.asyncIterator](): AsyncIterator<T>;
    result(): Promise<R>;
}
export declare class AssistantMessageEventStream extends EventStream<AssistantMessageEvent, AssistantMessage> {
    constructor();
}
/** Factory function for AssistantMessageEventStream (for use in extensions) */
export declare function createAssistantMessageEventStream(): AssistantMessageEventStream;
//# sourceMappingURL=event-stream.d.ts.map