"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstrumentationScopeKey = void 0;
/**
 * Normalizes an AnyValue to a JSON-serializable [typeTag, payload] tuple.
 *
 * Using a type tag as the first element guarantees that two values can only
 * produce the same tuple when they have the same type AND the same data,
 * avoiding cross-type collisions such as:
 *   - null vs NaN vs Infinity (all become JSON `null` via JSON.stringify)
 *   - -0 vs 0 (both become JSON `0` via JSON.stringify)
 *   - string "null" vs the value null
 *
 * Object keys are sorted so that attribute maps with the same entries but
 * different insertion orders produce the same key.
 */
function normalizeAnyValue(value) {
    if (value === undefined) {
        return ['u', null];
    }
    if (value === null) {
        return ['n', null];
    }
    const valueType = typeof value;
    if (valueType === 'string') {
        return ['s', value];
    }
    if (valueType === 'boolean') {
        return ['b', value];
    }
    if (valueType === 'number') {
        if (Number.isNaN(value))
            return ['nan', null];
        if (value === Infinity)
            return ['inf', null];
        if (value === -Infinity)
            return ['-inf', null];
        if (Object.is(value, -0))
            return ['n0', null];
        return ['d', value];
    }
    if (value instanceof Uint8Array) {
        return ['bytes', Array.from(value)];
    }
    if (Array.isArray(value)) {
        return ['arr', value.map(normalizeAnyValue)];
    }
    // AnyValueMap — sort keys for insertion-order independence
    return [
        'map',
        Object.entries(value)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => [k, normalizeAnyValue(v)]),
    ];
}
/**
 * Converting the instrumentation scope object to a unique identifier string.
 * @param scope - The instrumentation scope to convert
 * @returns A unique string identifier for the scope
 */
function getInstrumentationScopeKey(scope) {
    return JSON.stringify([
        scope.name,
        scope.version || '',
        scope.schemaUrl || '',
        normalizeAnyValue(scope.attributes),
        // we include the dropped attributes count to avoid collisions between scopes with the same identifying
        // characteristics, but different dropped counts. While there still can be collisions this is the best we can do if
        // we want to resolve the same logger without relying on object identity.
        scope.droppedAttributesCount ?? 0,
    ]);
}
exports.getInstrumentationScopeKey = getInstrumentationScopeKey;
//# sourceMappingURL=utils.js.map