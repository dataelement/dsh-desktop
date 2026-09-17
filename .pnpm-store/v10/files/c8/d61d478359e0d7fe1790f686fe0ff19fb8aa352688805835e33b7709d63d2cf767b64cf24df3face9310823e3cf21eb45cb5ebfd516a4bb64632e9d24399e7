/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { diag } from '@opentelemetry/api';
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
export function isLogAttributeValue(val) {
    return isLogAttributeValueInternal(val, new WeakSet());
}
function isLogAttributeValueInternal(val, visited) {
    // null and undefined are explicitly allowed
    if (val == null) {
        return true;
    }
    // Scalar values
    if (typeof val === 'string' ||
        typeof val === 'number' ||
        typeof val === 'boolean') {
        return true;
    }
    // Byte arrays
    if (val instanceof Uint8Array) {
        return true;
    }
    // For objects and arrays, check for circular references
    if (typeof val === 'object') {
        if (visited.has(val)) {
            // Circular reference detected - reject it
            return false;
        }
        visited.add(val);
        // Arrays (can contain any AnyValue, including heterogeneous)
        if (Array.isArray(val)) {
            for (const item of val) {
                if (!isLogAttributeValueInternal(item, visited)) {
                    return false;
                }
            }
            return true;
        }
        // Only accept plain objects (not built-in objects like Date, RegExp, Error, etc.)
        // Check if it's a plain object by verifying its constructor is Object or it has no constructor
        const obj = val;
        if (obj.constructor !== Object && obj.constructor !== undefined) {
            return false;
        }
        // Objects/Maps (including empty objects)
        // All object properties must be valid AnyValues
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key) &&
                !isLogAttributeValueInternal(obj[key], visited)) {
                return false;
            }
        }
        return true;
    }
    return false;
}
export var AddAttributeDecision;
(function (AddAttributeDecision) {
    AddAttributeDecision[AddAttributeDecision["DROP_INVALID"] = 0] = "DROP_INVALID";
    AddAttributeDecision[AddAttributeDecision["DROP_LIMIT_REACHED"] = 1] = "DROP_LIMIT_REACHED";
    AddAttributeDecision[AddAttributeDecision["ADD_NEW"] = 2] = "ADD_NEW";
    AddAttributeDecision[AddAttributeDecision["ADD_OVERWRITE_EXISTING"] = 3] = "ADD_OVERWRITE_EXISTING";
})(AddAttributeDecision || (AddAttributeDecision = {}));
export function addAttribute(attributes, limits, currentAttributesCount, key, value) {
    if (key.length === 0) {
        diag.warn(`Invalid attribute key: ${key}`);
        return AddAttributeDecision.DROP_INVALID;
    }
    if (!isLogAttributeValue(value)) {
        diag.warn(`Invalid attribute value set for key: ${key}`);
        return AddAttributeDecision.DROP_INVALID;
    }
    const isNewKey = !Object.prototype.hasOwnProperty.call(attributes, key);
    if (isNewKey && currentAttributesCount >= limits.attributeCountLimit) {
        return AddAttributeDecision.DROP_LIMIT_REACHED;
    }
    attributes[key] = truncateToSize(value, limits.attributeValueLengthLimit);
    if (isNewKey) {
        return AddAttributeDecision.ADD_NEW;
    }
    return AddAttributeDecision.ADD_OVERWRITE_EXISTING;
}
function truncateToSize(value, limit) {
    // Check limit
    if (limit <= 0) {
        // Negative values are invalid, so do not truncate
        diag.warn(`Attribute value limit must be positive, got ${limit}`);
        return value;
    }
    // null/undefined - no truncation needed
    if (value == null) {
        return value;
    }
    // String
    if (typeof value === 'string') {
        if (value.length <= limit) {
            return value;
        }
        return value.substring(0, limit);
    }
    // Byte arrays - no truncation needed
    if (value instanceof Uint8Array) {
        return value;
    }
    // Arrays (can contain any AnyValue types)
    if (Array.isArray(value)) {
        return value.map(val => truncateToSize(val, limit));
    }
    // Objects/Maps - recursively truncate nested values
    if (typeof value === 'object') {
        const truncatedObj = {};
        for (const [k, v] of Object.entries(value)) {
            truncatedObj[k] = truncateToSize(v, limit);
        }
        return truncatedObj;
    }
    // Other types (number, boolean), no need to apply value length limit
    return value;
}
/**
 * Normalize attributes for use on the instrumentation scope. Drops invalid attributes and keeps track of
 * how many were dropped.
 *
 * @param limits
 * @param attributes
 */
export function normalizeScopeAttributes(limits, attributes) {
    if (attributes == null) {
        return {};
    }
    const normalizedAttributes = {};
    let currentAttributesCount = 0;
    let droppedAttributesCount = 0;
    for (const [key, value] of Object.entries(attributes)) {
        const decision = addAttribute(normalizedAttributes, limits, currentAttributesCount, key, value);
        if (decision === AddAttributeDecision.ADD_NEW) {
            currentAttributesCount += 1;
        }
        else if (decision === AddAttributeDecision.DROP_INVALID) {
            droppedAttributesCount += 1;
        }
        else if (decision === AddAttributeDecision.DROP_LIMIT_REACHED) {
            droppedAttributesCount += 1;
        }
        else {
            // do nothing
        }
    }
    return {
        attributes: currentAttributesCount > 0 ? normalizedAttributes : undefined,
        droppedAttributesCount,
    };
}
//# sourceMappingURL=validation.js.map