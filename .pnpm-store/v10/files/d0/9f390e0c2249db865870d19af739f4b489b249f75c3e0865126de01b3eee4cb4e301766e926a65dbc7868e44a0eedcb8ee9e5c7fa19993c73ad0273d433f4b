import type { AnyValue, LogAttributes } from '@opentelemetry/api-logs';
import type { LogRecordLimits } from '../types';
/**
 * Validates if a value is a valid AnyValue for Log Attributes according to OpenTelemetry spec.
 * Log Attributes support a superset of standard Attributes and must support:
 * - Scalar values: string, boolean, signed 64-bit integer, or double precision floating point
 * - Byte arrays (Uint8Array)
 * - Arrays of any values (heterogeneous arrays allowed)
 * - Maps from string to any value (nested objects)
 * - Empty values (null/undefined)
 *
 * @param val - The value to validate
 * @returns true if the value is a valid AnyValue, false otherwise
 */
export declare function isLogAttributeValue(val: unknown): val is AnyValue;
export declare const enum AddAttributeDecision {
    DROP_INVALID = 0,
    DROP_LIMIT_REACHED = 1,
    ADD_NEW = 2,
    ADD_OVERWRITE_EXISTING = 3
}
export declare function addAttribute(attributes: LogAttributes, limits: Readonly<Required<LogRecordLimits>>, currentAttributesCount: number, key: string, value?: AnyValue): AddAttributeDecision;
/**
 * Normalize attributes for use on the instrumentation scope. Drops invalid attributes and keeps track of
 * how many were dropped.
 *
 * @param limits
 * @param attributes
 */
export declare function normalizeScopeAttributes(limits: Readonly<Required<LogRecordLimits>>, attributes?: LogAttributes): {
    readonly attributes?: LogAttributes;
    readonly droppedAttributesCount?: number;
};
//# sourceMappingURL=validation.d.ts.map