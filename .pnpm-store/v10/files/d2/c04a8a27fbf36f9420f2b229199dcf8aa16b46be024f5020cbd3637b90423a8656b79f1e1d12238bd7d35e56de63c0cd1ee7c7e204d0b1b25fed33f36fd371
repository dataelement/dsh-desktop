import type { LoggerProvider as ILoggerProvider, LoggerOptions as ILoggerOptions, Logger as ILogger } from '@opentelemetry/api-logs';
import type { LoggerProviderOptions } from './types';
export declare const DEFAULT_LOGGER_NAME = "unknown";
export declare class LoggerProvider implements ILoggerProvider {
    private _shutdownOnce;
    private readonly _sharedState;
    constructor(config?: LoggerProviderOptions);
    /**
     * Get a logger with the configuration of the LoggerProvider.
     */
    getLogger(name: string, version?: string, options?: ILoggerOptions): ILogger;
    /**
     * Notifies all registered LogRecordProcessor to flush any buffered data.
     *
     * Returns a promise which is resolved when all flushes are complete.
     */
    forceFlush(): Promise<void>;
    /**
     * Flush all buffered data and shut down the LoggerProvider and all registered
     * LogRecordProcessor.
     *
     * Returns a promise which is resolved when all flushes are complete.
     */
    shutdown(): Promise<void>;
    private _shutdown;
}
//# sourceMappingURL=LoggerProvider.d.ts.map