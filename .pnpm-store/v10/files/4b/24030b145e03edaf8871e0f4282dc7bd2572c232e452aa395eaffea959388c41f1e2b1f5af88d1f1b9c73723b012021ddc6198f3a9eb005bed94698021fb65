/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { ExportResultCode } from '@opentelemetry/core';
/**
 * This class can be used for testing purposes. It stores the exported LogRecords
 * in a list in memory that can be retrieved using the `getFinishedLogRecords()`
 * method.
 */
export class InMemoryLogRecordExporter {
    _finishedLogRecords = [];
    /**
     * Indicates if the exporter has been "shutdown."
     * When false, exported log records will not be stored in-memory.
     */
    _stopped = false;
    export(logs, resultCallback) {
        if (this._stopped) {
            return resultCallback({
                code: ExportResultCode.FAILED,
                error: new Error('Exporter has been stopped'),
            });
        }
        this._finishedLogRecords.push(...logs);
        resultCallback({ code: ExportResultCode.SUCCESS });
    }
    async shutdown() {
        this._stopped = true;
        this.reset();
    }
    async forceFlush() {
        // nothing to flush
    }
    getFinishedLogRecords() {
        return this._finishedLogRecords;
    }
    reset() {
        this._finishedLogRecords = [];
    }
}
//# sourceMappingURL=InMemoryLogRecordExporter.js.map