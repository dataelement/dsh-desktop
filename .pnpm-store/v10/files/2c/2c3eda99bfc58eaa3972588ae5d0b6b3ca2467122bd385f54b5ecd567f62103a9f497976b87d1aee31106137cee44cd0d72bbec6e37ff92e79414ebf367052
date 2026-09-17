/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { createNoopMeter } from '@opentelemetry/api';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { NoopLogRecordProcessor } from '../export/NoopLogRecordProcessor';
import { MultiLogRecordProcessor } from '../MultiLogRecordProcessor';
import { getInstrumentationScopeKey } from './utils';
import { LoggerMetrics } from '../LoggerMetrics';
import { VERSION } from '../version';
const DEFAULT_LOGGER_CONFIG = {
    disabled: false,
    minimumSeverity: SeverityNumber.UNSPECIFIED,
    traceBased: false,
};
/**
 * Default LoggerConfigurator that returns the default config for all loggers
 */
export const DEFAULT_LOGGER_CONFIGURATOR = () => ({
    ...DEFAULT_LOGGER_CONFIG,
});
export class LoggerProviderSharedState {
    loggers = new Map();
    activeProcessor;
    registeredLogRecordProcessors = [];
    resource;
    forceFlushTimeoutMillis;
    logRecordLimits;
    processors;
    loggerMetrics;
    hasShutdown = false;
    _loggerConfigurator;
    _loggerConfigs = new Map();
    constructor(resource, forceFlushTimeoutMillis, logRecordLimits, processors, loggerConfigurator, meterProvider) {
        this.resource = resource;
        this.forceFlushTimeoutMillis = forceFlushTimeoutMillis;
        this.logRecordLimits = logRecordLimits;
        this.processors = processors;
        if (processors.length > 0) {
            this.registeredLogRecordProcessors = processors;
            this.activeProcessor = new MultiLogRecordProcessor(this.registeredLogRecordProcessors, this.forceFlushTimeoutMillis);
        }
        else {
            this.activeProcessor = new NoopLogRecordProcessor();
        }
        this._loggerConfigurator =
            loggerConfigurator ?? DEFAULT_LOGGER_CONFIGURATOR;
        const meter = meterProvider
            ? meterProvider.getMeter('@opentelemetry/sdk-logs', VERSION)
            : createNoopMeter();
        this.loggerMetrics = new LoggerMetrics(meter);
    }
    /**
     * Get the LoggerConfig for a given instrumentation scope.
     * Uses the LoggerConfigurator function to compute the config on first access
     * and caches the result.
     *
     * @experimental This feature is in development as per the OpenTelemetry specification.
     */
    getLoggerConfig(instrumentationScope) {
        const key = getInstrumentationScopeKey(instrumentationScope);
        // Return cached config if available
        let config = this._loggerConfigs.get(key);
        if (config) {
            return config;
        }
        // Compute config using the configurator
        // The configurator always returns a complete config
        config = this._loggerConfigurator(instrumentationScope);
        // Cache the result
        this._loggerConfigs.set(key, config);
        return config;
    }
}
//# sourceMappingURL=LoggerProviderSharedState.js.map