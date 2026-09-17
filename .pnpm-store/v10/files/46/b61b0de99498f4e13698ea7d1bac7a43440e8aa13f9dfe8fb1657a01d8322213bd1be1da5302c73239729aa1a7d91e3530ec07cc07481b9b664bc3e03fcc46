/** Validate declared workspace paths and address their native-open actions. */
import type { PresentedFile } from '@deepseek-ai/dsh-tool-present/types';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { ToolCallId } from '@deepseek-ai/dsh-llm/brand';
/** Authenticated POST route for opening a workspace file on the Host desktop. */
export declare const PRESENT_OPEN_PATH = "/api/present.open";
/** Authenticated desktop availability and destination metadata. */
export declare const PRESENT_HOST_PATH = "/api/present.host";
/** Native file action selected by an explicit user gesture. */
export type PresentedAction = 'open' | 'reveal';
/** Serving Host information; file-manager names never derive from the browser's OS. */
export interface PresentedHost {
    name: string;
    available: boolean;
    fileManager: 'finder' | 'explorer' | 'directory' | null;
}
/**
 * Validate desktop metadata received over HTTP.
 * @param value - decoded response.
 * @returns whether all displayed and actionable fields are supported.
 */
export declare function isPresentedHost(value: unknown): value is PresentedHost;
/**
 * Validate a file declaration read from a Session log.
 * @param value - decoded durable data.
 * @returns whether the declaration contains a path and optional description.
 */
export declare function isPresentedFile(value: unknown): value is PresentedFile;
/**
 * Build authenticated coordinates for a declared file.
 * @param sessionId - owning Session.
 * @param seq - deliverables/presented event sequence.
 * @param index - original index in the event's files array.
 * @returns same-origin file action URL.
 */
export declare function presentedFileUrl(sessionId: SessionId, seq: number, index: number): string;
/**
 * Validate a delivery event before reading its turn or file declarations.
 * @param value - decoded durable event data.
 * @returns whether the event identifies a turn, call, and file list.
 */
export declare function isPresentedData(value: unknown): value is {
    turn: number;
    callId: ToolCallId;
    files: unknown[];
};
/**
 * Trailing path segment, the part that identifies the file at a glance.
 * @param path - Slash- or backslash-separated path.
 * @returns The final segment, or the whole string when separator-free.
 */
export declare function basename(path: string): string;
//# sourceMappingURL=presented.d.ts.map