import type { AssistantMessage, AssistantMessageEvent, TextContent, ThinkingContent, ToolCall } from "../types.ts";
/**
 * Compact, replayable assistant-message progress. Terminal settlement is
 * intentionally excluded and must be persisted separately.
 */
export type AssistantMessageFrame = {
    type: "start";
    partial: AssistantMessage;
} | {
    type: "text_start";
    contentIndex: number;
    content: TextContent;
} | {
    type: "text_delta";
    contentIndex: number;
    delta: string;
} | {
    type: "text_end";
    contentIndex: number;
    content: string;
    textSignature?: string;
} | {
    type: "thinking_start";
    contentIndex: number;
    content: ThinkingContent;
} | {
    type: "thinking_delta";
    contentIndex: number;
    delta: string;
} | {
    type: "thinking_end";
    contentIndex: number;
    content: string;
    thinkingSignature?: string;
    redacted?: boolean;
} | {
    type: "toolcall_start";
    contentIndex: number;
    toolCall: ToolCall;
} | {
    type: "toolcall_checkpoint";
    contentIndex: number;
    json: string;
} | {
    type: "toolcall_delta";
    contentIndex: number;
    delta: string;
} | {
    type: "toolcall_end";
    contentIndex: number;
    id: string;
    name: string;
    arguments: ToolCall["arguments"];
    thoughtSignature?: string;
    namespace?: string;
};
/**
 * Encodes one assistant stream. `partial` remains a shared live accumulator;
 * the encoder uses per-block offsets to avoid replaying deltas already visible
 * when an older queued event is consumed.
 */
export declare class AssistantMessageFrameEncoder {
    private started;
    private terminal;
    private readonly blocks;
    encode(event: AssistantMessageEvent): AssistantMessageFrame | undefined;
    private startBlock;
    private block;
    private endBlock;
    private encodeTextDelta;
}
/**
 * Replay compact frames without mutating them. Returns `undefined` when the
 * iterable contains no start frame.
 */
export declare function reduceAssistantMessageFrames(frames: Iterable<AssistantMessageFrame>): AssistantMessage | undefined;
//# sourceMappingURL=assistant-message-frame.d.ts.map