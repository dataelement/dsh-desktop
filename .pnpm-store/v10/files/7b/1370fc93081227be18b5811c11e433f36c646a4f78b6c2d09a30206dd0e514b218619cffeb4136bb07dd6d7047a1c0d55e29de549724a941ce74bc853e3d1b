"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerProvider = exports.DEFAULT_LOGGER_NAME = void 0;
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
const api_1 = require("@opentelemetry/api");
const api_logs_1 = require("@opentelemetry/api-logs");
const resources_1 = require("@opentelemetry/resources");
const core_1 = require("@opentelemetry/core");
const Logger_1 = require("./Logger");
const LoggerProviderSharedState_1 = require("./internal/LoggerProviderSharedState");
const utils_1 = require("./internal/utils");
const validation_1 = require("./utils/validation");
exports.DEFAULT_LOGGER_NAME = 'unknown';
class LoggerProvider {
    _shutdownOnce;
    _sharedState;
    constructor(config = {}) {
        const mergedConfig = {
            resource: config.resource ?? (0, resources_1.defaultResource)(),
            forceFlushTimeoutMillis: config.forceFlushTimeoutMillis ?? 30000,
            logRecordLimits: {
                attributeCountLimit: config.logRecordLimits?.attributeCountLimit ?? 128,
                attributeValueLengthLimit: config.logRecordLimits?.attributeValueLengthLimit ?? Infinity,
            },
            loggerConfigurator: config.loggerConfigurator ?? LoggerProviderSharedState_1.DEFAULT_LOGGER_CONFIGURATOR,
            processors: config.processors ?? [],
            meterProvider: config.meterProvider,
        };
        this._sharedState = new LoggerProviderSharedState_1.LoggerProviderSharedState(mergedConfig.resource, mergedConfig.forceFlushTimeoutMillis, mergedConfig.logRecordLimits, mergedConfig.processors, mergedConfig.loggerConfigurator, mergedConfig.meterProvider);
        this._shutdownOnce = new core_1.BindOnceFuture(this._shutdown, this);
    }
    /**
     * Get a logger with the configuration of the LoggerProvider.
     */
    getLogger(name, version, options) {
        if (this._shutdownOnce.isCalled) {
            api_1.diag.warn('A shutdown LoggerProvider cannot provide a Logger');
            return (0, api_logs_1.createNoopLogger)();
        }
        if (!name) {
            api_1.diag.warn('Logger requested without instrumentation scope name.');
        }
        const loggerName = name || exports.DEFAULT_LOGGER_NAME;
        const instrumentationScope = {
            name: loggerName,
            version,
            schemaUrl: options?.schemaUrl,
            ...(0, validation_1.normalizeScopeAttributes)(this._sharedState.logRecordLimits, options?.attributes),
        };
        const key = (0, utils_1.getInstrumentationScopeKey)(instrumentationScope);
        if (!this._sharedState.loggers.has(key)) {
            this._sharedState.loggers.set(key, new Logger_1.Logger(instrumentationScope, this._sharedState));
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
            api_1.diag.warn('invalid attempt to force flush after LoggerProvider shutdown');
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
            api_1.diag.warn('shutdown may only be called once per LoggerProvider');
            return this._shutdownOnce.promise;
        }
        return this._shutdownOnce.call();
    }
    _shutdown() {
        this._sharedState.hasShutdown = true;
        return this._sharedState.activeProcessor.shutdown();
    }
}
exports.LoggerProvider = LoggerProvider;
//# sourceMappingURL=LoggerProvider.js.map