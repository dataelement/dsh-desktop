import { Compile } from "typebox/compile";
import { Value } from "typebox/value";
const validatorCache = new WeakMap();
const TYPEBOX_KIND = Symbol.for("TypeBox.Kind");
function getSchemaTypes(schema) {
    if (typeof schema.type === "string") {
        return [schema.type];
    }
    if (Array.isArray(schema.type)) {
        return schema.type.filter((type) => typeof type === "string");
    }
    return [];
}
function matchesJsonType(value, type) {
    switch (type) {
        case "number":
            return typeof value === "number";
        case "integer":
            return typeof value === "number" && Number.isInteger(value);
        case "boolean":
            return typeof value === "boolean";
        case "string":
            return typeof value === "string";
        case "null":
            return value === null;
        case "array":
            return Array.isArray(value);
        case "object":
            return typeof value === "object" && value !== null && !Array.isArray(value);
        default:
            return false;
    }
}
function getSubSchemaValidator(schema) {
    try {
        return getValidator(schema);
    }
    catch {
        return undefined;
    }
}
function coercePrimitiveByType(value, type) {
    switch (type) {
        case "number": {
            if (value === null) {
                return 0;
            }
            if (typeof value === "string" && value.trim() !== "") {
                const parsed = Number(value);
                if (Number.isFinite(parsed)) {
                    return parsed;
                }
            }
            if (typeof value === "boolean") {
                return value ? 1 : 0;
            }
            return value;
        }
        case "integer": {
            if (value === null) {
                return 0;
            }
            if (typeof value === "string" && value.trim() !== "") {
                const parsed = Number(value);
                if (Number.isInteger(parsed)) {
                    return parsed;
                }
            }
            if (typeof value === "boolean") {
                return value ? 1 : 0;
            }
            return value;
        }
        case "boolean": {
            if (value === null) {
                return false;
            }
            if (typeof value === "string") {
                if (value === "true") {
                    return true;
                }
                if (value === "false") {
                    return false;
                }
            }
            if (typeof value === "number") {
                if (value === 1) {
                    return true;
                }
                if (value === 0) {
                    return false;
                }
            }
            return value;
        }
        case "string": {
            if (value === null) {
                return "";
            }
            if (typeof value === "number" || typeof value === "boolean") {
                return String(value);
            }
            return value;
        }
        case "null": {
            if (value === "" || value === 0 || value === false) {
                return null;
            }
            return value;
        }
        default:
            return value;
    }
}
function applySchemaObjectCoercion(value, schema) {
    const properties = schema.properties;
    const definedKeys = new Set(properties ? Object.keys(properties) : []);
    if (properties) {
        for (const [key, propertySchema] of Object.entries(properties)) {
            if (!(key in value)) {
                continue;
            }
            value[key] = coerceWithJsonSchema(value[key], propertySchema);
        }
    }
    if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
        for (const [key, propertyValue] of Object.entries(value)) {
            if (definedKeys.has(key)) {
                continue;
            }
            value[key] = coerceWithJsonSchema(propertyValue, schema.additionalProperties);
        }
    }
}
function applySchemaArrayCoercion(value, schema) {
    if (Array.isArray(schema.items)) {
        for (let index = 0; index < value.length; index++) {
            const itemSchema = schema.items[index];
            if (!itemSchema) {
                continue;
            }
            value[index] = coerceWithJsonSchema(value[index], itemSchema);
        }
        return;
    }
    if (schema.items && typeof schema.items === "object") {
        for (let index = 0; index < value.length; index++) {
            value[index] = coerceWithJsonSchema(value[index], schema.items);
        }
    }
}
function coerceWithUnionSchema(value, schemas) {
    for (const schema of schemas) {
        const validator = getSubSchemaValidator(schema);
        if (validator?.Check(value)) {
            return value;
        }
    }
    for (const schema of schemas) {
        const candidate = structuredClone(value);
        const coerced = coerceWithJsonSchema(candidate, schema);
        const validator = getSubSchemaValidator(schema);
        if (validator?.Check(coerced)) {
            return coerced;
        }
    }
    return value;
}
function coerceWithJsonSchema(value, schema) {
    let nextValue = value;
    if (Array.isArray(schema.allOf)) {
        for (const nested of schema.allOf) {
            nextValue = coerceWithJsonSchema(nextValue, nested);
        }
    }
    if (Array.isArray(schema.anyOf)) {
        nextValue = coerceWithUnionSchema(nextValue, schema.anyOf);
    }
    if (Array.isArray(schema.oneOf)) {
        nextValue = coerceWithUnionSchema(nextValue, schema.oneOf);
    }
    const schemaTypes = getSchemaTypes(schema);
    const matchesUnionMember = schemaTypes.length > 1 && schemaTypes.some((schemaType) => matchesJsonType(nextValue, schemaType));
    if (schemaTypes.length > 0 && !matchesUnionMember) {
        for (const schemaType of schemaTypes) {
            const candidate = coercePrimitiveByType(nextValue, schemaType);
            if (candidate !== nextValue) {
                nextValue = candidate;
                break;
            }
        }
    }
    if (schemaTypes.includes("object") &&
        typeof nextValue === "object" &&
        nextValue !== null &&
        !Array.isArray(nextValue)) {
        applySchemaObjectCoercion(nextValue, schema);
    }
    if (schemaTypes.includes("array") && Array.isArray(nextValue)) {
        applySchemaArrayCoercion(nextValue, schema);
    }
    return nextValue;
}
function normalizeOptionalNulls(value, schema) {
    if (Array.isArray(value)) {
        if (Array.isArray(schema.items)) {
            for (let index = 0; index < value.length; index++) {
                const itemSchema = schema.items[index];
                if (itemSchema)
                    normalizeOptionalNulls(value[index], itemSchema);
            }
        }
        else if (schema.items) {
            for (const item of value)
                normalizeOptionalNulls(item, schema.items);
        }
        return;
    }
    if (typeof value !== "object" || value === null || !schema.properties)
        return;
    const object = value;
    const required = new Set(schema.required ?? []);
    for (const [key, propertySchema] of Object.entries(schema.properties)) {
        if (!(key in object))
            continue;
        if (object[key] === null &&
            !required.has(key) &&
            typeof propertySchema.$ref !== "string" &&
            getSubSchemaValidator(propertySchema)?.Check(null) === false) {
            delete object[key];
        }
        else {
            normalizeOptionalNulls(object[key], propertySchema);
        }
    }
}
function getValidator(schema) {
    const key = schema;
    const cached = validatorCache.get(key);
    if (cached) {
        return cached;
    }
    const validator = Compile(schema);
    validatorCache.set(key, validator);
    return validator;
}
function formatValidationPath(error) {
    if (error.keyword === "required") {
        const requiredProperties = error.params.requiredProperties;
        const requiredProperty = requiredProperties?.[0];
        if (requiredProperty) {
            const basePath = error.instancePath.replace(/^\//, "").replace(/\//g, ".");
            return basePath ? `${basePath}.${requiredProperty}` : requiredProperty;
        }
    }
    const path = error.instancePath.replace(/^\//, "").replace(/\//g, ".");
    return path || "root";
}
/**
 * Finds a tool by name and validates the tool call arguments against its TypeBox schema
 * @param tools Array of tool definitions
 * @param toolCall The tool call from the LLM
 * @returns The validated arguments
 * @throws Error if tool is not found or validation fails
 */
export function validateToolCall(tools, toolCall) {
    const tool = tools.find((t) => t.name === toolCall.name);
    if (!tool) {
        throw new Error(`Tool "${toolCall.name}" not found`);
    }
    return validateToolArguments(tool, toolCall);
}
/**
 * Validates tool call arguments against the tool's TypeBox schema
 * @param tool The tool definition with TypeBox schema
 * @param toolCall The tool call from the LLM
 * @returns The validated (and potentially coerced) arguments
 * @throws Error with formatted message if validation fails
 */
export function validateToolArguments(tool, toolCall) {
    const args = structuredClone(toolCall.arguments);
    normalizeOptionalNulls(args, tool.parameters);
    Value.Convert(tool.parameters, args);
    const validator = getValidator(tool.parameters);
    if (!Object.getOwnPropertySymbols(tool.parameters).includes(TYPEBOX_KIND)) {
        const coerced = coerceWithJsonSchema(args, tool.parameters);
        if (coerced !== args) {
            if (typeof args === "object" && args !== null && typeof coerced === "object" && coerced !== null) {
                for (const key of Object.keys(args)) {
                    delete args[key];
                }
                Object.assign(args, coerced);
            }
            else {
                return validator.Check(coerced) ? coerced : args;
            }
        }
    }
    if (validator.Check(args)) {
        return args;
    }
    const errors = validator
        .Errors(args)
        .map((error) => `  - ${formatValidationPath(error)}: ${error.message}`)
        .join("\n") || "Unknown validation error";
    const errorMessage = `Validation failed for tool "${toolCall.name}":\n${errors}\n\nReceived arguments:\n${JSON.stringify(toolCall.arguments, null, 2)}`;
    throw new Error(errorMessage);
}
//# sourceMappingURL=validation.js.map