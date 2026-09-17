import type { LogAttributes } from '@opentelemetry/api-logs';
import type { InstrumentationScope } from '@opentelemetry/core';
export type LogInstrumentationScope = InstrumentationScope & {
    readonly attributes?: LogAttributes;
    readonly droppedAttributesCount?: number;
};
/**
 * Converting the instrumentation scope object to a unique identifier string.
 * @param scope - The instrumentation scope to convert
 * @returns A unique string identifier for the scope
 */
export declare function getInstrumentationScopeKey(scope: LogInstrumentationScope): string;
//# sourceMappingURL=utils.d.ts.map