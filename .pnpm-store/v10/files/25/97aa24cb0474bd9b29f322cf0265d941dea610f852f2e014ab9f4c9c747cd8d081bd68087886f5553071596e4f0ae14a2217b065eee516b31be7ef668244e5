/**
 * One Host `changes` subscription per session, fanned out to the open files of
 * that session.
 *
 * The Host reports every agent write in a session on one stream; each open file
 * wants only its own. The feed opens the session stream when the first follower
 * arrives, hands each frame to the followers of its path, and disposes the
 * stream when the last follower leaves. A follower buffers session changes
 * until `stat` supplies its Host absolute path, then filters queued and live
 * frames by that path, with `\\` normalized to `/`.
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { WorkspaceFilesRemote } from './remote.ts';
import type { WorkspaceFileNotice } from './types.ts';
/** Notices of one follower, delivered in order and pulled by its consumer. */
declare class Follower implements AsyncIterable<WorkspaceFileNotice> {
    private readonly leave;
    private readonly pending;
    private readonly started;
    private wake;
    private ended;
    private hostKey;
    /**
     * Resolves true after the Host acknowledges its subscription, or false if
     * this follower ends before acknowledgement.
     */
    readonly ready: Promise<boolean>;
    /**
     * @param leave - unregisters this follower and its abort listener.
     */
    constructor(leave: () => void);
    /**
     * Select the Host path for queued and future changes.
     * @param absolutePath - the successful stat's absolute path.
     */
    bind(absolutePath: string): void;
    /** The Host acknowledged an active subscription and resolved workspace root. */
    start(): void;
    /**
     * Queue one notice.
     * @param notice - what the consumer receives next.
     * @param key - normalized Host path for the change.
     */
    push(notice: WorkspaceFileNotice, key: string): void;
    /** Deliver what is queued, then finish. */
    end(): void;
    /** Unregister even when the consumer has not started pulling notices. */
    dispose(): void;
    /** @inheritdoc */
    [Symbol.asyncIterator](): AsyncIterator<WorkspaceFileNotice>;
}
/**
 * Per-session fan-out of the Host's workspace file change stream.
 *
 * Owned by the provider; one instance serves every session of the Client.
 */
export declare class ChangeFeed {
    private readonly remote;
    /** Live feeds only: a feed removes itself when its stream closes. */
    private readonly sessions;
    /** Streams still closing, by session: the session's next feed opens after its predecessor has settled. */
    private readonly closing;
    /**
     * @param remote - the Remote face carrying `$stream` and `workspaceFiles.changes`.
     */
    constructor(remote: WorkspaceFilesRemote);
    /**
     * Follow one resource in one session before its Host path is known.
     *
     * The follower is registered on call, not on first pull. Changes delivered
     * to this Client are queued while stat is pending. The first follower starts
     * the session's local `changes` call. The iterable ends
     * when `signal` aborts or when the session stream is gone; ending it early
     * (`break`, `return`) unregisters the follower as well, and the last follower
     * of a session disposes its stream. Await a true `ready` result before stat
     * so the Host subscription is active, then bind each stat's absolute path. Until binding,
     * any session write can trigger a retry; after binding, only matching queued
     * and live changes pass.
     * @param sessionId - the session whose workspace holds the file.
     * @param signal - ends the follow.
     * @returns a single-consumer subscription with Host-path binding and explicit disposal.
     */
    follow(sessionId: SessionId, signal: AbortSignal): Follower;
    /**
     * Wait for every stream that is still closing, so an owner tearing down
     * leaves no Host stream behind.
     * @returns resolves once no stream of this feed is closing.
     */
    settle(): Promise<void>;
    private feedOf;
}
export {};
//# sourceMappingURL=change-feed.d.ts.map