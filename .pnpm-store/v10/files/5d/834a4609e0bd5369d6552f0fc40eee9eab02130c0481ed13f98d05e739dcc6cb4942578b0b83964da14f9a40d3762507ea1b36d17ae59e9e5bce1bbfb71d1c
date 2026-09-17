/**
 * Owner-scoped persistent PTY registry. Backends own terminal mechanics while
 * this service owns ids, publication, authorization, and awaited cleanup.
 * @module @deepseek-ai/dsh-terminal
 */
import { Context, Service } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { TerminalBackend, TerminalReadRequest, TerminalReadResult, TerminalSendOperation, TerminalSendRequest, TerminalSessionIdValue, TerminalSessionSnapshot, TerminalSignal, TerminalSignalResult, TerminalSpawnRequest, TerminalSpawnResult } from './types.ts';
export type { TerminalBackend, TerminalBackendSession, TerminalBackendSpawnSpec, TerminalReadRequest, TerminalReadResult, TerminalSendOperation, TerminalSendRead, TerminalSendRequest, TerminalSendResult, TerminalSessionSnapshot, TerminalSessionStatus, TerminalSignal, TerminalSignalResult, TerminalSpawnRequest, TerminalSpawnResult, TerminalWaitReason, } from './types.ts';
export { TerminalBackendCleanupError } from './types.ts';
/** Opaque identity minted by {@link TerminalSessionService} for one live PTY session. */
export type TerminalSessionId = TerminalSessionIdValue;
declare module '@deepseek-ai/cordis' {
    interface Context {
        terminals: TerminalSessionService;
    }
}
/** Machine-routable PTY service failures. */
export type TerminalErrorCode = 'DUPLICATE_BACKEND' | 'DUPLICATE_NAME' | 'FOREIGN_SESSION' | 'NO_BACKEND' | 'NO_SESSION' | 'OWNER_NOT_LIVE' | 'SEND_ACTIVE' | 'SERVICE_DISPOSING';
/** Error carrying a stable {@link TerminalErrorCode}. */
export declare class TerminalError extends Error {
    readonly code: TerminalErrorCode;
    constructor(message: string, code: TerminalErrorCode);
}
/**
 * Brand one registry-minted string as a {@link TerminalSessionId}.
 * @param value - raw registry-issued id.
 * @returns Same string with the PTY session brand.
 */
export declare function TerminalSessionId(value: string): TerminalSessionId;
/** In-process registry for replaceable PTY backends and exact-Agent sessions. */
export declare class TerminalSessionService extends Service {
    private readonly backends;
    private readonly sessions;
    private readonly reservedNames;
    private readonly pendingSpawns;
    private readonly ownerCleanups;
    private readonly disposedOwners;
    private nextId;
    private disposing;
    constructor(ctx: Context);
    /**
     * Register one backend type for this effect scope.
     * @param backend - provider with a non-empty unique type.
     * @returns disposer that removes exactly this contribution.
     */
    registerBackend(backend: TerminalBackend): () => void;
    /**
     * List registered backend types in registration order.
     * @returns fresh backend type names.
     */
    listBackends(): string[];
    /**
     * Create and publish one owner-scoped session after backend setup succeeds.
     * @param owner - exact registered Agent that owns access and cleanup.
     * @param request - backend type plus optional owner-local name and cwd.
     * @param signal - cancellation of unpublished setup.
     * @returns published identity, metadata, status, and MOTD.
     */
    spawn(owner: Agent, request: TerminalSpawnRequest, signal?: AbortSignal): Promise<TerminalSpawnResult>;
    /**
     * Test whether an exact owner has a published session or unpublished spawn.
     * @param owner - exact live owner to inspect.
     * @returns true across the entire spawn-to-close interval, with no publication gap.
     */
    hasOwnerActivity(owner: Agent): boolean;
    /**
     * Start one exclusive interactive send.
     * @param owner - exact session owner.
     * @param id - target PTY identity.
     * @param request - explicit text, submit behavior, and cancellation.
     * @returns live operation handle for foreground await or task registration.
     */
    startSend(owner: Agent, id: TerminalSessionId, request: TerminalSendRequest): TerminalSendOperation;
    /**
     * Read one bounded scrollback page from an owned session.
     * @param owner - exact session owner.
     * @param id - target PTY identity.
     * @param request - optional newest-relative offset and line count.
     * @returns bounded retained text and pagination metadata.
     */
    read(owner: Agent, id: TerminalSessionId, request?: TerminalReadRequest): TerminalReadResult;
    /**
     * Deliver an allowed signal through an owned backend session.
     * @param owner - exact session owner.
     * @param id - target PTY identity.
     * @param signal - allowed POSIX signal name.
     * @returns delivered foreground process-group identity.
     */
    signal(owner: Agent, id: TerminalSessionId, signal: TerminalSignal): Promise<TerminalSignalResult>;
    /**
     * Close one owned session and remove it only after quiescent backend cleanup.
     * @param owner - exact session owner.
     * @param id - target PTY identity.
     * @param reason - diagnostic cleanup reason.
     * @returns true for a newly closed session, false when the same close is already in flight.
     */
    kill(owner: Agent, id: TerminalSessionId, reason?: string): Promise<boolean>;
    /**
     * List fresh snapshots for exactly one owner.
     * @param owner - exact owner whose sessions are visible.
     * @returns owner-visible snapshots in publication order.
     */
    list(owner: Agent): TerminalSessionSnapshot[];
    private assertActive;
    private isLiveOwner;
    private ensureOwnerCleanup;
    private reserveName;
    private reserveSpawn;
    private removePendingSpawn;
    private abortPendingSpawns;
    private expectOwned;
    private snapshot;
    private abortAndClose;
    private disposeOwned;
    private disposeAll;
    private closeRecords;
}
export default TerminalSessionService;
//# sourceMappingURL=index.d.ts.map