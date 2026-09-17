/**
 * Wire protocol of the `/plugins/events` dev SSE channel — single source for
 * both halves of this package. Frames still cross a wire boundary: the
 * browser half validates them at its JSON parse point; sharing the type keeps
 * the two ends from drifting, not from parsing.
 */
import type { WebBootGraph } from '@deepseek-ai/dsh-client-modules';
/** One SSE frame: the full graph on connect, or one rebuilt bundle notice. */
export type PluginsEventFrame = {
    type: 'graph';
    graph: WebBootGraph;
} | {
    type: 'rebuilt';
    id: string;
    rev: string;
};
/** Browser wire-parse result: known frame, forward-compatible unknown type, or malformed payload. */
export type PluginsEventParseResult = {
    kind: 'frame';
    frame: PluginsEventFrame;
} | {
    kind: 'unknown';
} | {
    kind: 'invalid';
};
/**
 * Validate one JSON-decoded SSE payload before it can mutate module state.
 * @param value - Parsed JSON value from the EventSource message.
 * @returns the known frame, an unknown-type marker, or an invalid marker.
 */
export declare function parsePluginsEventFrame(value: unknown): PluginsEventParseResult;
/** System SSE endpoint pushing graph/rebuilt frames (wire protocol constant). */
export declare const EVENTS_ENDPOINT = "/plugins/events";
//# sourceMappingURL=events.d.ts.map