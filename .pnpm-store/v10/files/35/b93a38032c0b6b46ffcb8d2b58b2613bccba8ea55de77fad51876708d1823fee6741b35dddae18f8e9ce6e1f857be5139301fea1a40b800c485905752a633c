"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogRecordImpl = void 0;
const api = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const validation_1 = require("./utils/validation");
class LogRecordImpl {
    hrTime;
    hrTimeObserved;
    spanContext;
    resource;
    instrumentationScope;
    attributes = {};
    _severityText;
    _severityNumber;
    _body;
    _eventName;
    _attributesCount = 0;
    _droppedAttributesCount = 0;
    _isReadonly = false;
    _logRecordLimits;
    set severityText(severityText) {
        if (this._isLogRecordReadonly()) {
            return;
        }
        this._severityText = severityText;
    }
    get severityText() {
        return this._severityText;
    }
    set severityNumber(severityNumber) {
        if (this._isLogRecordReadonly()) {
            return;
        }
        this._severityNumber = severityNumber;
    }
    get severityNumber() {
        return this._severityNumber;
    }
    set body(body) {
        if (this._isLogRecordReadonly()) {
            return;
        }
        this._body = body;
    }
    get body() {
        return this._body;
    }
    get eventName() {
        return this._eventName;
    }
    set eventName(eventName) {
        if (this._isLogRecordReadonly()) {
            return;
        }
        this._eventName = eventName;
    }
    get droppedAttributesCount() {
        return this._droppedAttributesCount;
    }
    constructor(_sharedState, instrumentationScope, logRecord) {
        const { timestamp, observedTimestamp, eventName, severityNumber, severityText, body, attributes = {}, exception, context, } = logRecord;
        const now = Date.now();
        this.hrTime = (0, core_1.timeInputToHrTime)(timestamp ?? now);
        this.hrTimeObserved = (0, core_1.timeInputToHrTime)(observedTimestamp ?? now);
        if (context) {
            const spanContext = api.trace.getSpanContext(context);
            if (spanContext && api.isSpanContextValid(spanContext)) {
                this.spanContext = spanContext;
            }
        }
        this.severityNumber = severityNumber;
        this.severityText = severityText;
        this.body = body;
        this.resource = _sharedState.resource;
        this.instrumentationScope = instrumentationScope;
        this._logRecordLimits = _sharedState.logRecordLimits;
        this._eventName = eventName;
        this.setAttributes(attributes);
        if (exception != null) {
            this._setException(exception);
        }
    }
    setAttribute(key, value) {
        if (this._isLogRecordReadonly()) {
            return this;
        }
        const decision = (0, validation_1.addAttribute)(this.attributes, this._logRecordLimits, this._attributesCount, key, value);
        if (decision === validation_1.AddAttributeDecision.DROP_LIMIT_REACHED) {
            this._droppedAttributesCount++;
            if (this._droppedAttributesCount === 1) {
                // Only warn once per LogRecord to avoid log spam
                api.diag.warn('Dropping extra attributes.');
            }
        }
        else if (decision === validation_1.AddAttributeDecision.ADD_NEW) {
            this._attributesCount++;
        }
        return this;
    }
    setAttributes(attributes) {
        for (const [k, v] of Object.entries(attributes)) {
            this.setAttribute(k, v);
        }
        return this;
    }
    setBody(body) {
        this.body = body;
        return this;
    }
    setEventName(eventName) {
        this.eventName = eventName;
        return this;
    }
    setSeverityNumber(severityNumber) {
        this.severityNumber = severityNumber;
        return this;
    }
    setSeverityText(severityText) {
        this.severityText = severityText;
        return this;
    }
    /**
     * @internal
     * A LogRecordProcessor may freely modify logRecord for the duration of the OnEmit call.
     * If logRecord is needed after OnEmit returns (i.e. for asynchronous processing) only reads are permitted.
     */
    _makeReadonly() {
        this._isReadonly = true;
    }
    _setException(exception) {
        let hasMinimumAttributes = false;
        if (typeof exception === 'string' || typeof exception === 'number') {
            if (!Object.hasOwn(this.attributes, semantic_conventions_1.ATTR_EXCEPTION_MESSAGE)) {
                this.setAttribute(semantic_conventions_1.ATTR_EXCEPTION_MESSAGE, String(exception));
            }
            hasMinimumAttributes = true;
        }
        else if (exception && typeof exception === 'object') {
            const exceptionObj = exception;
            if (exceptionObj.code) {
                if (!Object.hasOwn(this.attributes, semantic_conventions_1.ATTR_EXCEPTION_TYPE)) {
                    this.setAttribute(semantic_conventions_1.ATTR_EXCEPTION_TYPE, exceptionObj.code.toString());
                }
                hasMinimumAttributes = true;
            }
            else if (exceptionObj.name) {
                if (!Object.hasOwn(this.attributes, semantic_conventions_1.ATTR_EXCEPTION_TYPE)) {
                    this.setAttribute(semantic_conventions_1.ATTR_EXCEPTION_TYPE, exceptionObj.name);
                }
                hasMinimumAttributes = true;
            }
            if (exceptionObj.message) {
                if (!Object.hasOwn(this.attributes, semantic_conventions_1.ATTR_EXCEPTION_MESSAGE)) {
                    this.setAttribute(semantic_conventions_1.ATTR_EXCEPTION_MESSAGE, exceptionObj.message);
                }
                hasMinimumAttributes = true;
            }
            if (exceptionObj.stack) {
                if (!Object.hasOwn(this.attributes, semantic_conventions_1.ATTR_EXCEPTION_STACKTRACE)) {
                    this.setAttribute(semantic_conventions_1.ATTR_EXCEPTION_STACKTRACE, exceptionObj.stack);
                }
                hasMinimumAttributes = true;
            }
        }
        if (!hasMinimumAttributes) {
            api.diag.warn(`Failed to record an exception ${exception}`);
        }
    }
    _isLogRecordReadonly() {
        if (this._isReadonly) {
            api.diag.warn('Can not execute the operation on emitted log record');
        }
        return this._isReadonly;
    }
}
exports.LogRecordImpl = LogRecordImpl;
//# sourceMappingURL=LogRecordImpl.js.map