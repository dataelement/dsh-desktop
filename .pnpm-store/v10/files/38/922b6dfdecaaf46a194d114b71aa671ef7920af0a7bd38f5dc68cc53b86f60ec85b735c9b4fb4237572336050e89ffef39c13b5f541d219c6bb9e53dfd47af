import type { LoggerProvider } from '../types/LoggerProvider';
import type { Logger } from '../types/Logger';
import type { LoggerOptions } from '../types/LoggerOptions';
export declare class LogsAPI {
    private static _instance?;
    private _proxyLoggerProvider;
    private constructor();
    static getInstance(): LogsAPI;
    setGlobalLoggerProvider(provider: LoggerProvider): LoggerProvider;
    /**
     * Returns the global logger provider.
     *
     * @returns LoggerProvider
     */
    getLoggerProvider(): LoggerProvider;
    /**
     * Returns a Logger, creating one if one with the given name, version,
     * schemaUrl, and attributes is not already created.
     *
     * Getting a Logger may be expensive, especially when `attributes` are
     * provided. Reuse Logger instances where possible instead of calling
     * `getLogger()` on hot paths.
     *
     * @param name The name of the logger or instrumentation library.
     * @param version The version of the logger or instrumentation library.
     * @param options The options of the logger or instrumentation library.
     * @returns {@link Logger}
     */
    getLogger(name: string, version?: string, options?: LoggerOptions): Logger;
    /** Remove the global logger provider */
    disable(): void;
}
//# sourceMappingURL=logs.d.ts.map