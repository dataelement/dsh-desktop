/**
 * Stable, versioned contract for plugin-owned update surfaces.
 *
 * The market UI has richer internal response shapes that evolve with its UI.
 * Third-party plugins must not depend on those shapes, so this module owns the
 * small JSON envelope exposed under `/dsh-market/api/v1`.
 */
export const UPDATE_API_V1_SCHEMA = 'dsh-market/update-api/v1';
export const MAX_UPDATE_OPERATIONS_V1 = 50;
function record(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value
        : null;
}
function text(value) {
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}
function bool(value) {
    return value === true;
}
function failureCode(status, body) {
    const explicit = text(body.failureCode);
    if (explicit === 'DOWNGRADE_DETECTED' || explicit === 'RESOLVED_VERSION_MISMATCH')
        return explicit;
    if (body.agentsBusy === true)
        return 'AGENTS_RUNNING';
    if (body.busy === true || status === 409)
        return 'OPERATION_BUSY';
    if (body.stale === true && body.staleReason === 'release-age')
        return 'RELEASE_TOO_FRESH';
    if (body.stale === true)
        return 'VERSION_UNCHANGED';
    if (body.timedOut === true)
        return 'UPDATE_TIMEOUT';
    if (status === 403)
        return 'UPDATE_FORBIDDEN';
    if (status === 400)
        return 'UPDATE_REJECTED';
    return 'UPDATE_FAILED';
}
function failureOf(status, body) {
    const code = failureCode(status, body);
    const message = text(body.error)
        ?? text(body.stderr)
        ?? text(body.stdout)
        ?? `update failed with HTTP ${String(status)}`;
    return {
        code,
        message: message.slice(-1200),
        retryable: code === 'AGENTS_RUNNING'
            || code === 'OPERATION_BUSY'
            || code === 'RELEASE_TOO_FRESH'
            || code === 'VERSION_UNCHANGED'
            || code === 'RESOLVED_VERSION_MISMATCH'
            || code === 'UPDATE_TIMEOUT',
    };
}
function activationState(body, packageName) {
    const activations = record(body.activation);
    const activation = activations === null ? null : record(activations[packageName]);
    return activation === null ? null : text(activation.state);
}
function rollbackIdOf(body) {
    const compatibility = record(body.compatibility);
    return compatibility === null ? null : text(compatibility.rollbackId);
}
function progressView(progress) {
    if (progress === undefined) {
        return {
            phase: null,
            done: 0,
            total: null,
            percent: null,
            currentPackage: null,
            detail: null,
            downloaded: null,
            size: null,
        };
    }
    const percent = progress.total !== null && progress.total > 0
        ? Math.min(100, Math.round(progress.done / progress.total * 100))
        : null;
    return {
        phase: progress.phase,
        done: progress.done,
        total: progress.total,
        percent,
        currentPackage: progress.currentPackage,
        detail: text(progress.lastLine) ?? text(progress.error),
        downloaded: progress.downloaded,
        size: progress.size,
    };
}
/** Process-local operation registry. A boot id scopes ids across restarts. */
export class UpdateOperationStoreV1 {
    bootId;
    now;
    maxOperations;
    sequence = 0;
    operations = new Map();
    activeId = null;
    constructor(bootId, now = Date.now, maxOperations = MAX_UPDATE_OPERATIONS_V1) {
        this.bootId = bootId;
        this.now = now;
        this.maxOperations = maxOperations;
    }
    hasActive() {
        return this.activeId !== null;
    }
    create(packageName, beforeVersion) {
        const operationId = `${this.bootId}-update-${String(++this.sequence)}`;
        const createdAt = this.now();
        const operation = {
            schema: UPDATE_API_V1_SCHEMA,
            operationId,
            kind: 'update',
            packageName,
            state: 'queued',
            createdAt,
            startedAt: null,
            finishedAt: null,
            beforeVersion,
            installedVersion: beforeVersion,
            progress: progressView(),
            outcome: {
                refreshRequired: false,
                restartRequired: false,
                rollback: { available: false, state: 'unavailable', detail: null },
            },
            failure: null,
            legacyRollbackId: null,
        };
        this.operations.set(operationId, operation);
        this.activeId = operationId;
        while (this.operations.size > this.maxOperations) {
            const oldestId = this.operations.keys().next().value;
            if (oldestId === undefined || oldestId === this.activeId)
                break;
            this.operations.delete(oldestId);
        }
        return this.snapshot(operation);
    }
    start(operationId) {
        const operation = this.operations.get(operationId);
        if (operation === undefined)
            return;
        operation.state = 'running';
        operation.startedAt = this.now();
        this.activeId = operationId;
    }
    finish(operationId, status, payload, installedVersion) {
        const operation = this.operations.get(operationId);
        if (operation === undefined)
            return null;
        const body = record(payload) ?? {};
        const cancelled = bool(body.cancelled);
        const ok = status >= 200 && status < 300 && bool(body.ok) && !cancelled;
        operation.state = cancelled ? 'cancelled' : ok ? 'succeeded' : 'failed';
        operation.finishedAt = this.now();
        operation.installedVersion = installedVersion;
        operation.failure = ok || cancelled ? null : failureOf(status, body);
        const activation = activationState(body, operation.packageName);
        operation.outcome.restartRequired = activation === 'restart';
        operation.outcome.refreshRequired = bool(body.needsRefresh)
            || (activation === 'live' && body.hot === true);
        operation.legacyRollbackId = rollbackIdOf(body);
        if (operation.legacyRollbackId !== null) {
            operation.outcome.rollback.available = true;
            operation.outcome.rollback.state = 'available';
        }
        if (this.activeId === operationId)
            this.activeId = null;
        return this.snapshot(operation);
    }
    beginRollback(operationId) {
        const operation = this.operations.get(operationId);
        if (operation?.legacyRollbackId === null || operation?.legacyRollbackId === undefined)
            return null;
        operation.outcome.rollback.state = 'running';
        operation.outcome.rollback.detail = null;
        return operation.legacyRollbackId;
    }
    finishRollback(operationId, status, payload, installedVersion) {
        const operation = this.operations.get(operationId);
        if (operation === undefined)
            return null;
        const body = record(payload) ?? {};
        const ok = status >= 200 && status < 300 && body.rolledBack === true;
        // The rollback endpoint supplies a fresh disk read. Keep the argument
        // optional so existing store consumers retain source compatibility.
        if (installedVersion !== undefined)
            operation.installedVersion = installedVersion;
        operation.outcome.rollback.available = !ok && status !== 400;
        operation.outcome.rollback.state = ok ? 'succeeded' : 'failed';
        operation.outcome.rollback.detail = ok ? null : text(body.error) ?? `rollback failed with HTTP ${String(status)}`;
        if (ok) {
            operation.state = 'rolled-back';
            operation.outcome.restartRequired = true;
        }
        return this.snapshot(operation);
    }
    get(operationId, progress) {
        const operation = this.operations.get(operationId);
        if (operation === undefined)
            return null;
        const view = this.snapshot(operation);
        if (this.activeId === operationId && operation.state === 'running')
            view.progress = progressView(progress);
        return view;
    }
    snapshot(operation) {
        const { legacyRollbackId: _legacyRollbackId, ...view } = operation;
        return structuredClone(view);
    }
}
