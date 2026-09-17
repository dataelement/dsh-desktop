"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSchema = validateSchema;
const ajv_1 = require("ajv");
const ajv = new ajv_1.default({
    allErrors: true,
    verbose: true,
    coerceTypes: true,
    strict: false,
});
// Cache the compiled validator for the canonical scheme.json so it is only
// compiled once per process lifetime.
let _cachedValidate;
function validateSchema(schema, data, config = {}) {
    var _a, _b;
    if (_cachedValidate == null || _cachedValidate.schema !== schema) {
        _cachedValidate = ajv.compile(schema);
    }
    const validate = _cachedValidate;
    if (validate(data)) {
        return;
    }
    const errors = (_a = validate.errors) !== null && _a !== void 0 ? _a : [];
    const baseDataPath = "configuration";
    const name = (_b = config.name) !== null && _b !== void 0 ? _b : "Object";
    const relevant = filterRelevantErrors(errors);
    const formatted = relevant.map(error => {
        let msg = formatError(error, baseDataPath);
        if (config.postFormatter != null) {
            msg = config.postFormatter(msg, error);
        }
        return ` - ${indentNewlines(msg, "   ")}`;
    });
    const header = `Invalid configuration object. ${name} has been initialized using a configuration object that does not match the API schema.`;
    throw new Error(`${header}\n${formatted.join("\n")}`);
}
/**
 * Filters the flat list of ajv errors to the most actionable subset.
 * Composite keywords (anyOf/oneOf/if) are suppressed when more specific
 * errors exist at the same or deeper paths.  When all errors share the
 * same instancePath and a composite parent for that path exists, the
 * parent is kept instead so the user sees a single "should be one of"
 * message rather than every failed branch listed separately.
 */
function filterRelevantErrors(errors) {
    const compositeKeywords = new Set(["anyOf", "oneOf", "if"]);
    const specific = errors.filter(e => !compositeKeywords.has(e.keyword));
    if (specific.length === 0) {
        return errors.filter(e => compositeKeywords.has(e.keyword));
    }
    // Group specific errors by instancePath
    const byPath = new Map();
    for (const e of specific) {
        const list = byPath.get(e.instancePath);
        if (list != null) {
            list.push(e);
        }
        else {
            byPath.set(e.instancePath, [e]);
        }
    }
    const result = [];
    for (const [path, group] of byPath) {
        // When multiple branch-failures share the same path, prefer the anyOf
        // parent error (one concise "should be one of these" message).
        if (group.length > 1) {
            const parent = errors.find(e => e.instancePath === path && compositeKeywords.has(e.keyword));
            if (parent != null) {
                result.push(parent);
                continue;
            }
        }
        result.push(...group);
    }
    return result;
}
/** Decodes a single RFC 6901 JSON Pointer segment (`~1` → `/`, `~0` → `~`). */
function decodePointerSegment(segment) {
    return segment.replace(/~1/g, "/").replace(/~0/g, "~");
}
function instancePathToLabel(instancePath, baseDataPath) {
    if (!instancePath) {
        return baseDataPath;
    }
    const segments = instancePath.split("/").filter(Boolean).map(decodePointerSegment);
    return [baseDataPath, ...segments].join(".");
}
function formatError(error, baseDataPath) {
    var _a;
    const label = instancePathToLabel(error.instancePath, baseDataPath);
    const params = error.params;
    const parentSchema = error.parentSchema;
    switch (error.keyword) {
        case "additionalProperties":
            return `${label} has an unknown property '${params.additionalProperty}'`;
        case "required": {
            const missingProp = String(params.missingProperty).replace(/^\./, "");
            return `${label} misses the property '${missingProp}'`;
        }
        case "type": {
            const type = params.type;
            if (Array.isArray(type)) {
                const typeList = type.join(" | ");
                const desc = descriptionSuffix(parentSchema);
                return `${label} should be:\n${typeList}${desc}`;
            }
            return `${label} should be a ${type}`;
        }
        case "enum": {
            const enumVals = (_a = parentSchema === null || parentSchema === void 0 ? void 0 : parentSchema.enum) !== null && _a !== void 0 ? _a : [];
            if (enumVals.length === 1) {
                return `${label} should be ${JSON.stringify(enumVals[0])}`;
            }
            return `${label} should be one of these:\n${enumVals.map(v => JSON.stringify(v)).join(" | ")}`;
        }
        case "anyOf":
        case "oneOf": {
            const schemaText = formatSchemaType(parentSchema);
            return `${label} should be one of these:\n${schemaText}`;
        }
        default:
            return `${label} ${error.message}`;
    }
}
function descriptionSuffix(schema) {
    return typeof (schema === null || schema === void 0 ? void 0 : schema.description) === "string" ? `\n-> ${schema.description}` : "";
}
function formatSchemaType(schema) {
    if (schema == null) {
        return "";
    }
    if (Array.isArray(schema.type)) {
        return schema.type.join(" | ");
    }
    if (typeof schema.type === "string") {
        return schema.type;
    }
    if (Array.isArray(schema.anyOf)) {
        return schema.anyOf
            .map(s => {
            if (Array.isArray(s.type)) {
                return s.type.join(" | ");
            }
            return typeof s.type === "string" ? s.type : "";
        })
            .filter(Boolean)
            .join(" | ");
    }
    return JSON.stringify(schema);
}
function indentNewlines(str, prefix) {
    return str.replace(/\n(?!$)/g, `\n${prefix}`);
}
//# sourceMappingURL=schemaValidator.js.map