import type { Logger } from './Logger';
import type { LoggerOptions } from './LoggerOptions';
/**
 * A registry for creating named {@link Logger}s.
 */
export interface LoggerProvider {
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
}
//# sourceMappingURL=LoggerProvider.d.ts.map