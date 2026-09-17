import { z } from "zod/v4";
const skippedItem = Symbol("skippedItem");
export function defaultOnError(schema, fallback) {
    return schema.catch(fallback);
}
export function requiredDefaultOnError(schema, fallback) {
    const schemaWithCatch = schema.catch(fallback);
    return z.unknown().transform((value, context) => {
        if (value !== undefined)
            return schemaWithCatch.parse(value);
        context.addIssue({
            code: "custom",
            message: "Required value is missing",
        });
        return z.NEVER;
    });
}
/**
 * A wire value's discriminant tag, when present as a string. excludeKnownTags
 * and preserveCustomPayload are always applied as a pair, so what counts as
 * "the tag" is single-sourced here.
 */
function stringTag(value, key) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return undefined;
    }
    const tag = value[key];
    return typeof tag === "string" ? tag : undefined;
}
/**
 * Restores the JSON Schema `not` semantics of an extensible union's catch-all
 * variant, which the code generator drops: the catch-all formally excludes the
 * known variants' discriminant tags, so a malformed known variant (right tag,
 * wrong payload) must fail validation instead of parsing as a custom variant.
 *
 * When this fires inside a union, zod surfaces only this issue (the catch-all
 * is the closest match), so the message names the offending tag; the known
 * variant's own field-level issues are not available here.
 * TODO: re-run the matching known variant's schema and forward its issues so
 * consumers can see which field actually failed.
 */
export function excludeKnownTags(schema, key, knownTags) {
    return schema.superRefine((value, context) => {
        const tag = stringTag(value, key);
        if (tag !== undefined && knownTags.includes(tag)) {
            context.addIssue({
                code: "custom",
                path: [key],
                message: `${key} ${JSON.stringify(tag)} is reserved by a known variant, ` +
                    `but the value does not match that variant's schema`,
            });
        }
    });
}
/**
 * Restores the `unevaluatedProperties`/`additionalProperties: true` semantics
 * of an extensible union's custom catch-all variant, which the generated
 * object schemas drop: a custom variant's extra properties are its payload,
 * so after a normal (stripping) parse the raw keys the subschemas didn't
 * produce are re-attached. Keys the winning variant evaluated — including
 * invalid values salvaged to defaults — keep their parsed results; keys it
 * did NOT evaluate arrive raw, even ones a losing variant would have salvaged
 * (e.g. a malformed `_meta` on a custom multi-select item).
 */
export function preserveCustomPayload(schema, key, knownTags) {
    return z.unknown().transform((value, context) => {
        const result = schema.safeParse(value);
        if (!result.success) {
            for (const issue of result.error.issues) {
                // Finished issues carry everything a raw issue needs except `input`.
                context.addIssue({ ...issue, input: value });
            }
            return z.NEVER;
        }
        const output = result.data;
        const tag = stringTag(value, key);
        if (tag !== undefined && !knownTags.includes(tag)) {
            const raw = value;
            for (const [property, rawValue] of Object.entries(raw)) {
                // Own-key check: `in` would see inherited Object.prototype members
                // and silently drop payload keys named `constructor`, `toString`,
                // etc. `__proto__` must never be re-attached — the computed
                // assignment would rewrite the output object's prototype.
                if (property === "__proto__")
                    continue;
                if (!Object.hasOwn(output, property))
                    output[property] = rawValue;
            }
        }
        return output;
    });
}
export function vecSkipError(itemSchema) {
    return z
        .array(itemSchema.catch(skippedItem))
        .transform((items) => items.filter((item) => item !== skippedItem));
}
//# sourceMappingURL=schema-deserialize.js.map