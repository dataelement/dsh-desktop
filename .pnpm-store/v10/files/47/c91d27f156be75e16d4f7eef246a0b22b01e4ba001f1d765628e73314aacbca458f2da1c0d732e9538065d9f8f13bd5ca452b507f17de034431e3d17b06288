import type { Resource } from '@opentelemetry/resources';
import type { HrTime, SpanContext } from '@opentelemetry/api';
import type { InstrumentationScope } from '@opentelemetry/core';
import type { LogBody, LogAttributes, SeverityNumber } from '@opentelemetry/api-logs';
export interface ReadableLogRecord {
    readonly hrTime: HrTime;
    readonly hrTimeObserved: HrTime;
    readonly spanContext?: SpanContext;
    readonly severityText?: string;
    readonly severityNumber?: SeverityNumber;
    readonly body?: LogBody;
    readonly eventName?: string;
    readonly resource: Resource;
    /**
     * The instrumentation scope associated with this log record. Identity of this object
     * MUST be stable across identical scopes, as it is intended be used for efficient scope-based
     * filtering and grouping.
     */
    readonly instrumentationScope: InstrumentationScope & {
        attributes?: LogAttributes;
        droppedAttributesCount?: number;
    };
    readonly attributes: LogAttributes;
    readonly droppedAttributesCount: number;
}
//# sourceMappingURL=ReadableLogRecord.d.ts.map