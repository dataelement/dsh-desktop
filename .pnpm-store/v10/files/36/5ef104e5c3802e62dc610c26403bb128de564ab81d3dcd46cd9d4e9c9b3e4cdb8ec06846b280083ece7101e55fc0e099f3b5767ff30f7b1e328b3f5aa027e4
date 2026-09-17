/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { diag } from '@opentelemetry/api';
import { createNoopLogger } from '@opentelemetry/api-logs';
import { defaultResource } from '@opentelemetry/resources';
import { BindOnceFuture } from '@opentelemetry/core';
import { Logger } from './Logger';
import { DEFAULT_LOGGER_CONFIGURATOR, LoggerProviderSharedState, } from './internal/LoggerProviderSharedState';
import { getInstrumentationScopeKey, } from './internal/utils';
import { normalizeScopeAttributes } from './utils/validation';
export const DEFAULT_LOGGER_NAME = 'unknown';
export class LoggerProvider {
    _shutdownOnce;
    _sharedState;
    constructor(config = {}) {
        const mergedConfig = {
            resource: config.resource ?? defaultResource(),
            forceFlushTimeoutMillis: config.forceFlushTimeoutMillis ?? 30000,
            logRecordLimits: {
                attributeCountLimit: config.logRecordLimits?.attributeCountLimit ?? 128,
                attributeValueLengthLimit: config.logRecordLimits?.attributeValueLengthLimit ?? Infinity,
            },
            loggerConfigurator: config.loggerConfigurator ?? DEFAULT_LOGGER_CONFIGURATOR,
            processors: config.processors ?? [],
            meterProvider: config.meterProvider,
        };
        this._sharedState = new LoggerProviderSharedState(mergedConfig.resource, mergedConfig.forceFlushTimeoutMillis, mergedConfig.logRecordLimits, mergedConfig.processors, mergedConfig.loggerConfigurator, mergedConfig.meterProvider);
        this._shutdownOnce = new BindOnceFuture(this._shutdown, this);
    }
    /**
     * Get a logger with the configuration of the LoggerProvider.
     */
    getLogger(name, version, options) {
        if (this._shutdownOnce.isCalled) {
            diag.warn('A shutdown LoggerProvider cannot provide a Logger');
            return createNoopLogger();
        }
        if (!name) {
            diag.warn('Logger requested without instrumentation scope name.');
        }
        const loggerName = name || DEFAULT_LOGGER_NAME;
        const instrumentationScope = {
            name: loggerName,
            version,
            schemaUrl: options?.schemaUrl,
            ...normalizeScopeAttributes(this._sharedState.logRecordLimits, options?.attributes),
        };
        const key = getInstrumentationScopeKey(instrumentationScope);
        if (!this._sharedState.loggers.has(key)) {
            this._sharedState.loggers.set(key, new Logger(instrumentationScope, this._sharedState));
        }
        return this._sharedState.loggers.get(key);
    }
    /**
     * Notifies all registered LogRecordProcessor to flush any buffered data.
     *
     * Returns a promise which is resolved when all flushes are complete.
     */
    forceFlush() {
        // do not flush after shutdown
        if (this._shutdownOnce.isCalled) {
            diag.warn('invalid attempt to force flush after LoggerProvider shutdown');
            return this._shutdownOnce.promise;
        }
        return this._sharedState.activeProcessor.forceFlush();
    }
    /**
     * Flush all buffered data and shut down the LoggerProvider and all registered
     * LogRecordProcessor.
     *
     * Returns a promise which is resolved when all flushes are complete.
     */
    shutdown() {
        if (this._shutdownOnce.isCalled) {
            diag.warn('shutdown may only be called once per LoggerProvider');
            return this._shutdownOnce.promise;
        }
        return this._shutdownOnce.call();
    }
    _shutdown() {
        this._sharedState.hasShutdown = true;
        return this._sharedState.activeProcessor.shutdown();
    }
}
//# sourceMappingURL=LoggerProvider.js.map