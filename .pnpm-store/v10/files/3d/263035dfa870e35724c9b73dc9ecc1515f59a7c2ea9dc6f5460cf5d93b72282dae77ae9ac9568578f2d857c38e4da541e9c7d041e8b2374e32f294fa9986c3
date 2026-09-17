import type { BatchLogRecordProcessorOptions } from '../types';
import type { SdkLogRecord } from './SdkLogRecord';
import type { LogRecordProcessor } from '../LogRecordProcessor';
export declare abstract class BatchLogRecordProcessorBase<T extends BatchLogRecordProcessorOptions> implements LogRecordProcessor {
    private readonly _maxExportBatchSize;
    private readonly _maxQueueSize;
    private readonly _scheduledDelayMillis;
    private readonly _exportTimeoutMillis;
    private readonly _exporter;
    private _currentExport;
    private _finishedLogRecords;
    private _timer;
    private _shutdownOnce;
    private _flushing;
    constructor(options: T);
    onEmit(logRecord: SdkLogRecord): void;
    forceFlush(): Promise<void>;
    /** Add a LogRecord in the buffer. */
    private _addToBuffer;
    shutdown(): Promise<void>;
    private _shutdown;
    /**
     * Send all LogRecords to the exporter respecting the batch size limit
     * This function is used only on forceFlush or shutdown,
     * for all other cases _exportOneBatch should be used
     * */
    private _flushAll;
    /**
     * Extracts one batch from the buffer.
     * Returns null if buffer is empty.
     */
    private _extractBatch;
    private _exportOneBatch;
    private _maybeStartTimer;
    private _clearTimer;
    protected abstract onShutdown(): void;
}
//# sourceMappingURL=BatchLogRecordProcessorBase.d.ts.map