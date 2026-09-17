/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { SeverityNumber } from '@opentelemetry/api-logs';
import { context, trace, TraceFlags, isSpanContextValid, } from '@opentelemetry/api';
import { LogRecordImpl } from './LogRecordImpl';
export class Logger {
    _instrumentationScope;
    _sharedState;
    _loggerConfig;
    constructor(instrumentationScope, sharedState) {
        this._instrumentationScope = instrumentationScope;
        this._sharedState = sharedState;
        // Cache the logger configuration at construction time
        // Since we don't support re-configuration, this avoids map lookups
        // and string allocations on each emit() call
        this._loggerConfig = this._sharedState.getLoggerConfig(this._instrumentationScope);
    }
    emit(logRecord) {
        const currentContext = logRecord.context || context.active();
        if (!this.enabled(logRecord)) {
            return;
        }
        /**
         * If a Logger was obtained with include_trace_context=true,
         * the LogRecords it emits MUST automatically include the Trace Context from the active Context,
         * if Context has not been explicitly set.
         */
        const logRecordInstance = new LogRecordImpl(this._sharedState, this._instrumentationScope, {
            context: currentContext,
            ...logRecord,
        });
        this._sharedState.loggerMetrics.emitLog();
        /**
         * the explicitly passed Context,
         * the current Context, or an empty Context if the Logger was obtained with include_trace_context=false
         */
        this._sharedState.activeProcessor.onEmit(logRecordInstance, currentContext);
        /**
         * A LogRecordProcessor may freely modify logRecord for the duration of the OnEmit call.
         * If logRecord is needed after OnEmit returns (i.e. for asynchronous processing) only reads are permitted.
         */
        logRecordInstance._makeReadonly();
    }
    enabled(options) {
        if (this._sharedState.hasShutdown) {
            return false;
        }
        const loggerConfig = this._loggerConfig;
        if (loggerConfig.disabled) {
            return false;
        }
        // Severity number given and lower than the min configured
        const severityNumber = options?.severityNumber;
        if (typeof severityNumber === 'number' &&
            severityNumber !== SeverityNumber.UNSPECIFIED &&
            severityNumber < loggerConfig.minimumSeverity) {
            return false;
        }
        const currentContext = options?.context || context.active();
        // Trace based: the context (given or the active) has a unsampled Span
        if (loggerConfig.traceBased) {
            const spanContext = trace.getSpanContext(currentContext);
            if (spanContext && isSpanContextValid(spanContext)) {
                const isSampled = (spanContext.traceFlags & TraceFlags.SAMPLED) === TraceFlags.SAMPLED;
                if (!isSampled) {
                    return false;
                }
            }
        }
        // Lastly check if there is any enabled processor
        const enabledOpts = {
            context: currentContext,
            instrumentationScope: this._instrumentationScope,
            severityNumber: options?.severityNumber,
            eventName: options?.eventName,
        };
        for (const processor of this._sharedState.processors) {
            if (!processor.enabled || processor.enabled(enabledOpts)) {
                return true;
            }
        }
        return false;
    }
}
//# sourceMappingURL=Logger.js.map