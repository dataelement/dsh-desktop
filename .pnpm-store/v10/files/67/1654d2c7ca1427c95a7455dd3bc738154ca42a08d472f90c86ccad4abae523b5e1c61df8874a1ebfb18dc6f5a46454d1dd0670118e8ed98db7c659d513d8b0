import type { SessionId } from '@deepseek-ai/dsh-session/types';
import { type PresentedAction, type PresentedHost } from '../presented.ts';
/** State of the latest explicit open gesture for one saved file. */
export type PresentedOpenPhase = 'opening' | 'opened' | 'revealing' | 'revealed' | 'error' | 'revealError' | 'nativeUnavailable';
/** One browser plugin's file-open requests, cancelled when that plugin is disposed. */
export declare class PresentedOpenController {
    /** File action URLs key the state across Sessions, turns, and both clickable surfaces. */
    readonly state: import("@deepseek-ai/dsh-client-store").SnapshotStore<Record<string, PresentedOpenPhase | undefined>>;
    /** Native destination metadata, or a retryable read failure. */
    readonly host: import("@deepseek-ai/dsh-client-store").SnapshotStore<PresentedHost | "error" | null>;
    private loading;
    private metadata;
    private readonly lifetime;
    private readonly pending;
    /**
     * Open a declared file once while a request for the same coordinates is pending.
     * Failures remain visible on the card and a later gesture retries them.
     * @param sessionId - viewed Session, including a fork's own identity.
     * @param seq - durable delivery event sequence.
     * @param index - original file index within that event.
     * @param action - default application open or file-manager reveal.
     * @returns after the Host acknowledges opening or the error state is published.
     */
    open(sessionId: SessionId, seq: number, index: number, action?: PresentedAction): Promise<void>;
    /**
     * Read the serving desktop metadata, coalescing concurrent reads; a later call retries failure.
     * @returns after metadata or a retryable error is published.
     */
    loadHost(): Promise<void>;
    /** Invalidate desktop metadata on connection replacement; mounted cards request the new Host. */
    resetHost(): void;
    private readHost;
    /** Cancel outstanding requests and wait until no request can publish state. */
    dispose(): Promise<void>;
    private request;
}
//# sourceMappingURL=present-open.d.ts.map