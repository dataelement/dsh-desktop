import type { LogRecordProcessor } from '../LogRecordProcessor';
import type { SdkLogRecord } from './SdkLogRecord';
import type { Context } from '@opentelemetry/api';
import type { SimpleLogRecordProcessorOptions } from '../types';
/**
 * An implementation of the {@link LogRecordProcessor} interface that exports
 * each {@link LogRecord} as it is emitted.
 *
 * NOTE: This {@link LogRecordProcessor} exports every {@link LogRecord}
 * individually instead of batching them together, which can cause significant
 * performance overhead with most exporters. For production use, please consider
 * using the {@link BatchLogRecordProcessor} instead.
 */
export declare class SimpleLogRecordProcessor implements LogRecordProcessor {
    private readonly _exporter;
    private _shutdownOnce;
    private _unresolvedExports;
    constructor(options: SimpleLogRecordProcessorOptions);
    onEmit(logRecord: SdkLogRecord, _context?: Context): void;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
    private _shutdown;
}
//# sourceMappingURL=SimpleLogRecordProcessor.d.ts.map