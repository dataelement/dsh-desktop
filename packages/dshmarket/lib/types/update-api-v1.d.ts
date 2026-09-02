/**
 * Stable, versioned contract for plugin-owned update surfaces.
 *
 * The market UI has richer internal response shapes that evolve with its UI.
 * Third-party plugins must not depend on those shapes, so this module owns the
 * small JSON envelope exposed under `/dsh-market/api/v1`.
 */
import type { InstallProgress } from './dsh-cli.ts';
export declare const UPDATE_API_V1_SCHEMA: "dsh-market/update-api/v1";
export declare const MAX_UPDATE_OPERATIONS_V1 = 50;
export type UpdateOperationState = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'rolled-back';
export interface UpdateFailureV1 {
    code: string;
    message: string;
    retryable: boolean;
}
export interface UpdateOperationV1 {
    schema: typeof UPDATE_API_V1_SCHEMA;
    operationId: string;
    kind: 'update';
    packageName: string;
    state: UpdateOperationState;
    createdAt: number;
    startedAt: number | null;
    finishedAt: number | null;
    beforeVersion: string | null;
    installedVersion: string | null;
    progress: {
        phase: string | null;
        done: number;
        total: number | null;
        percent: number | null;
        currentPackage: string | null;
        detail: string | null;
        downloaded: number | null;
        size: number | null;
    };
    outcome: {
        refreshRequired: boolean;
        restartRequired: boolean;
        rollback: {
            available: boolean;
            state: 'unavailable' | 'available' | 'running' | 'succeeded' | 'failed';
            detail: string | null;
        };
    };
    failure: UpdateFailureV1 | null;
}
/** Process-local operation registry. A boot id scopes ids across restarts. */
export declare class UpdateOperationStoreV1 {
    private readonly bootId;
    private readonly now;
    private readonly maxOperations;
    private sequence;
    private readonly operations;
    private activeId;
    constructor(bootId: string, now?: () => number, maxOperations?: number);
    hasActive(): boolean;
    create(packageName: string, beforeVersion: string | null): UpdateOperationV1;
    start(operationId: string): void;
    finish(operationId: string, status: number, payload: unknown, installedVersion: string | null): UpdateOperationV1 | null;
    beginRollback(operationId: string): string | null;
    finishRollback(operationId: string, status: number, payload: unknown, installedVersion?: string | null): UpdateOperationV1 | null;
    get(operationId: string, progress?: InstallProgress): UpdateOperationV1 | null;
    private snapshot;
}
