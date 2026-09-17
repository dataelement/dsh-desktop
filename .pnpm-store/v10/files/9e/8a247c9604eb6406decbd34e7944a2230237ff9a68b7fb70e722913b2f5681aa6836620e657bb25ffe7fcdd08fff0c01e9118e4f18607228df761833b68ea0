import { z } from "zod/v4";
type Fallback<Output> = () => Output;
export declare function defaultOnError<Schema extends z.ZodType>(schema: Schema, fallback: Fallback<z.output<Schema>>): z.ZodCatch<Schema>;
export declare function requiredDefaultOnError<Schema extends z.ZodType>(schema: Schema, fallback: Fallback<z.output<Schema>>): z.ZodType<z.output<Schema>, z.input<Schema>>;
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
export declare function excludeKnownTags<Schema extends z.ZodType>(schema: Schema, key: string, knownTags: ReadonlyArray<string>): Schema;
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
export declare function preserveCustomPayload<Schema extends z.ZodType>(schema: Schema, key: string, knownTags: ReadonlyArray<string>): z.ZodType<z.output<Schema>, z.input<Schema>>;
export declare function vecSkipError<ItemSchema extends z.ZodType>(itemSchema: ItemSchema): z.ZodPipe<z.ZodArray<z.ZodCatch<ItemSchema>>, z.ZodTransform<z.core.output<ItemSchema>[], z.core.output<ItemSchema>[]>>;
export {};
