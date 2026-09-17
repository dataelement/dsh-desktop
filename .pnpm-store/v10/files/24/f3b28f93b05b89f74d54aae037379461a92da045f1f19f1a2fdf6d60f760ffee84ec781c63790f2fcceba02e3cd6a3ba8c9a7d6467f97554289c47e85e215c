"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerMetrics = void 0;
const semconv_1 = require("./semconv");
/**
 * Generates `otel.sdk.log.*` metrics.
 * https://opentelemetry.io/docs/specs/semconv/otel/sdk-metrics/#log-metrics
 */
class LoggerMetrics {
    createdLogs;
    constructor(meter) {
        this.createdLogs = meter.createCounter(semconv_1.METRIC_OTEL_SDK_LOG_CREATED, {
            unit: '{log_record}',
            description: 'The number of logs submitted to enabled SDK Loggers.',
        });
    }
    emitLog() {
        this.createdLogs.add(1);
    }
}
exports.LoggerMetrics = LoggerMetrics;
//# sourceMappingURL=LoggerMetrics.js.map