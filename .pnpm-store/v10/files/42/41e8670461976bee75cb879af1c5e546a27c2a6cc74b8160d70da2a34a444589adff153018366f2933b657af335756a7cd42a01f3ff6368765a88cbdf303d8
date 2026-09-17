"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchLogRecordProcessorBase = void 0;
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
/**
 * Waits for all pending async resources in the log records to be resolved.
 */
async function waitForResources(logRecords) {
    const pendingResources = [];
    for (let i = 0, len = logRecords.length; i < len; i++) {
        const logRecord = logRecords[i];
        if (logRecord.resource.asyncAttributesPending &&
            logRecord.resource.waitForAsyncAttributes) {
            pendingResources.push(logRecord.resource.waitForAsyncAttributes());
        }
    }
    if (pendingResources != null && pendingResources.length > 0) {
        await Promise.all(pendingResources);
    }
}
/**
 * Represents an export operation that handles the entire export workflow.
 */
class ExportOperation {
    _exportCompleted;
    _exportScheduledPromise;
    _exportScheduledResolve;
    constructor(exporter, logRecords, exportTimeoutMillis) {
        this._exportScheduledPromise = new Promise(resolve => {
            this._exportScheduledResolve = resolve;
        });
        this._exportCompleted = this._executeExport(exporter, logRecords, exportTimeoutMillis);
    }
    /** Get the promise that resolves when the export completes */
    get exportCompleted() {
        return this._exportCompleted;
    }
    /** Get the promise that resolves when exporter.export() has been called */
    get exportScheduled() {
        return this._exportScheduledPromise;
    }
    async _executeExport(exporter, logRecords, exportTimeoutMillis) {
        try {
            // Wait for all pending resources before exporting
            await waitForResources(logRecords);
            // Export with timeout, wrapped in suppressTracing context
            await api_1.context.with((0, core_1.suppressTracing)(api_1.context.active()), async () => {
                return this._exportWithTimeout(exporter, logRecords, exportTimeoutMillis);
            });
        }
        catch (e) {
            // ensure we never reject here, as we may call await after it has already resolved.
            (0, core_1.globalErrorHandler)(e);
            // resolve, as the error may have occurred before export was scheduled
            this._exportScheduledResolve();
        }
    }
    async _exportWithTimeout(exporter, logRecords, exportTimeoutMillis) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Timeout'));
            }, exportTimeoutMillis);
            // Call exporter.export() and immediately resolve exportScheduled
            exporter.export(logRecords, result => {
                clearTimeout(timer);
                if (result.code === core_1.ExportResultCode.SUCCESS) {
                    resolve();
                }
                else {
                    reject(result.error ??
                        new Error('BatchLogRecordProcessor: log record export failed'));
                }
            });
            // Resolve exportScheduled immediately after calling exporter.export()
            this._exportScheduledResolve();
        });
    }
}
class BatchLogRecordProcessorBase {
    _maxExportBatchSize;
    _maxQueueSize;
    _scheduledDelayMillis;
    _exportTimeoutMillis;
    _exporter;
    _currentExport = null;
    _finishedLogRecords = [];
    _timer;
    _shutdownOnce;
    _flushing = false;
    constructor(options) {
        this._exporter = options.exporter;
        this._maxExportBatchSize = options.maxExportBatchSize ?? 512;
        this._maxQueueSize = options.maxQueueSize ?? 2048;
        this._scheduledDelayMillis = options.scheduledDelayMillis ?? 1000;
        this._exportTimeoutMillis = options.exportTimeoutMillis ?? 30000;
        this._shutdownOnce = new core_1.BindOnceFuture(this._shutdown, this);
        if (this._maxExportBatchSize > this._maxQueueSize) {
            api_1.diag.warn('BatchLogRecordProcessor: maxExportBatchSize must be smaller or equal to maxQueueSize, setting maxExportBatchSize to match maxQueueSize');
            this._maxExportBatchSize = this._maxQueueSize;
        }
    }
    onEmit(logRecord) {
        if (this._shutdownOnce.isCalled) {
            return;
        }
        this._addToBuffer(logRecord);
    }
    forceFlush() {
        if (this._shutdownOnce.isCalled) {
            return this._shutdownOnce.promise;
        }
        return this._flushAll();
    }
    /** Add a LogRecord in the buffer. */
    _addToBuffer(logRecord) {
        if (this._finishedLogRecords.length >= this._maxQueueSize) {
            return;
        }
        this._finishedLogRecords.push(logRecord);
        this._maybeStartTimer();
    }
    shutdown() {
        return this._shutdownOnce.call();
    }
    async _shutdown() {
        this.onShutdown();
        await this._flushAll();
        await this._exporter.shutdown();
    }
    /**
     * Send all LogRecords to the exporter respecting the batch size limit
     * This function is used only on forceFlush or shutdown,
     * for all other cases _exportOneBatch should be used
     * */
    async _flushAll() {
        // Guard against concurrent flushes. Concurrent .forceFlush() calls will
        // return without waiting for the in-progress flush to finish.
        if (this._flushing) {
            return;
        }
        this._flushing = true;
        // Grab the current set of finished log records, because the spec says:
        // > ... for which the LogRecordProcessor had already received events prior to the call to ForceFlush ...
        let toFlush = this._finishedLogRecords;
        this._finishedLogRecords = [];
        // Clear timer to prevent concurrent exports
        this._clearTimer();
        // Wait for any in-progress export to complete. Capture the reference
        // into a local because `_exportOneBatch` may null out `this._currentExport`
        // from its completion handler while we are awaiting below.
        const inFlight = this._currentExport;
        if (inFlight !== null) {
            // speed up execution for current export
            await this._exporter.forceFlush();
            await inFlight.exportCompleted;
            this._currentExport = null;
        }
        // Now flush all batches sequentially to avoid race conditions
        while (toFlush.length > 0) {
            let batch;
            if (toFlush.length <= this._maxExportBatchSize) {
                batch = toFlush;
                toFlush = [];
            }
            else {
                batch = toFlush.splice(0, this._maxExportBatchSize);
            }
            const exportOp = new ExportOperation(this._exporter, batch, this._exportTimeoutMillis);
            this._currentExport = exportOp;
            // await export scheduled, then force flush exporter to speed up export
            try {
                await exportOp.exportScheduled;
                await this._exporter.forceFlush();
                await exportOp.exportCompleted;
            }
            catch (e) {
                (0, core_1.globalErrorHandler)(e);
            }
            finally {
                this._currentExport = null;
            }
        }
        this._flushing = false;
        this._maybeStartTimer();
    }
    /**
     * Extracts one batch from the buffer.
     * Returns null if buffer is empty.
     */
    _extractBatch() {
        if (this._finishedLogRecords.length === 0) {
            return null;
        }
        if (this._finishedLogRecords.length <= this._maxExportBatchSize) {
            const batch = this._finishedLogRecords;
            this._finishedLogRecords = [];
            return batch;
        }
        else {
            return this._finishedLogRecords.splice(0, this._maxExportBatchSize);
        }
    }
    _exportOneBatch() {
        this._clearTimer();
        const logRecords = this._extractBatch();
        if (logRecords === null) {
            return;
        }
        const exportOp = new ExportOperation(this._exporter, logRecords, this._exportTimeoutMillis);
        this._currentExport = exportOp;
        // Handle completion asynchronously
        exportOp.exportCompleted
            .then(() => {
            this._currentExport = null;
            this._maybeStartTimer();
        })
            .catch(error => {
            this._currentExport = null;
            (0, core_1.globalErrorHandler)(error);
            this._maybeStartTimer();
        });
    }
    _maybeStartTimer() {
        if (this._shutdownOnce.isCalled) {
            return;
        }
        if (this._flushing) {
            return;
        }
        if (this._finishedLogRecords.length === 0) {
            return;
        }
        if (this._currentExport !== null) {
            return;
        }
        // If batch is full, export immediately
        if (this._finishedLogRecords.length >= this._maxExportBatchSize) {
            this._exportOneBatch();
            return;
        }
        // If timer is already set, don't set another one
        if (this._timer !== undefined) {
            return;
        }
        // Set timer for scheduled export
        this._timer = setTimeout(() => {
            this._timer = undefined;
            this._exportOneBatch();
        }, this._scheduledDelayMillis);
        // Unref timer so it doesn't keep process alive
        if (typeof this._timer !== 'number') {
            this._timer.unref();
        }
    }
    _clearTimer() {
        if (this._timer !== undefined) {
            clearTimeout(this._timer);
            this._timer = undefined;
        }
    }
}
exports.BatchLogRecordProcessorBase = BatchLogRecordProcessorBase;
//# sourceMappingURL=BatchLogRecordProcessorBase.js.map