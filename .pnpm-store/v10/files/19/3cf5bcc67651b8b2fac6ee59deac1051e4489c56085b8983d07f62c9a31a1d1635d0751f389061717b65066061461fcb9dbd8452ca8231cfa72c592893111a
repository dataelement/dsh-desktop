import type * as core from "../core/index.js";
import type * as JSONSchema from "./json-schema.js";
import { type $ZodRegistry } from "./registries.js";
import type * as schemas from "./schemas.js";
import type { StandardJSONSchemaV1, StandardSchemaWithJSONProps } from "./standard-schema.js";
export type Processor<T extends schemas.$ZodType = schemas.$ZodType> = (schema: T, ctx: ToJSONSchemaContext, json: JSONSchema.BaseSchema, params: ProcessParams) => void;
/**
 * Called for each schema that has no JSON Schema equivalent. Return a JSON Schema to use in its
 * place, `"any"` to fall back to the `unrepresentable: "any"` behavior, or `"throw"`/`undefined` to
 * throw the default error. Throwing from the handler propagates, so custom errors work too.
 */
export type UnrepresentableHandler<T extends schemas.$ZodType = schemas.$ZodType> = (ctx: {
    zodSchema: T;
    path: (string | number)[];
    /** The error Zod would throw. Distinguishes sites that share a `zodSchema`, e.g. an `undefined`
     *  vs a `bigint` member of the same literal. */
    message: string;
}) => JSONSchema.BaseSchema | "throw" | "any" | undefined;
export interface JSONSchemaGeneratorParams {
    processors: Record<string, Processor>;
    /** A registry used to look up metadata for each schema. Any schema with an `id` property will be extracted as a $def.
     *  @default globalRegistry */
    metadata?: $ZodRegistry<Record<string, any>>;
    /** The JSON Schema version to target.
     * - `"draft-2020-12"` — Default. JSON Schema Draft 2020-12
     * - `"draft-07"` — JSON Schema Draft 7
     * - `"draft-04"` — JSON Schema Draft 4
     * - `"openapi-3.0"` — OpenAPI 3.0 Schema Object */
    target?: "draft-04" | "draft-07" | "draft-2020-12" | "openapi-3.0" | ({} & string) | undefined;
    /** How to handle unrepresentable types.
     * - `"throw"` — Default. Unrepresentable types throw an error
     * - `"any"` — Unrepresentable types become `{}`
     * - A function — called once per unrepresentable schema; see {@link UnrepresentableHandler}. */
    unrepresentable?: "throw" | "any" | UnrepresentableHandler<schemas.$ZodTypes>;
    /** Arbitrary custom logic that can be used to modify the generated JSON Schema. */
    override?: (ctx: {
        zodSchema: schemas.$ZodTypes;
        jsonSchema: JSONSchema.BaseSchema;
        path: (string | number)[];
    }) => void;
    /** Whether to extract the `"input"` or `"output"` type. Relevant to transforms, defaults, coerced primitives, etc.
     * - `"output"` — Default. Convert the output schema.
     * - `"input"` — Convert the input schema. */
    io?: "input" | "output";
    cycles?: "ref" | "throw";
    reused?: "ref" | "inline";
    external?: {
        registry: $ZodRegistry<{
            id?: string | undefined;
        }>;
        uri?: ((id: string) => string) | undefined;
        defs: Record<string, JSONSchema.BaseSchema>;
    } | undefined;
}
/**
 * Parameters for the toJSONSchema function.
 */
export type ToJSONSchemaParams = Omit<JSONSchemaGeneratorParams, "processors" | "external">;
/**
 * Parameters for the toJSONSchema function when passing a registry.
 */
export interface RegistryToJSONSchemaParams extends ToJSONSchemaParams {
    uri?: (id: string) => string;
}
export interface ProcessParams {
    schemaPath: schemas.$ZodType[];
    path: (string | number)[];
}
export interface Seen {
    /** JSON Schema result for this Zod schema */
    schema: JSONSchema.BaseSchema;
    /** A cached version of the schema that doesn't get overwritten during ref resolution */
    def?: JSONSchema.BaseSchema;
    defId?: string | undefined;
    /** Number of times this schema was encountered during traversal */
    count: number;
    /** Cycle path */
    cycle?: (string | number)[] | undefined;
    isParent?: boolean | undefined;
    /** Schema to inherit JSON Schema properties from (set by processor for wrappers) */
    ref?: schemas.$ZodType | null;
    /** JSON Schema property path for this schema */
    path?: (string | number)[] | undefined;
}
export interface ToJSONSchemaContext {
    processors: Record<string, Processor>;
    metadataRegistry: $ZodRegistry<Record<string, any>>;
    target: "draft-04" | "draft-07" | "draft-2020-12" | "openapi-3.0" | ({} & string);
    unrepresentable: "throw" | "any" | UnrepresentableHandler;
    override: (ctx: {
        zodSchema: schemas.$ZodType;
        jsonSchema: JSONSchema.BaseSchema;
        path: (string | number)[];
    }) => void;
    io: "input" | "output";
    counter: number;
    seen: Map<schemas.$ZodType, Seen>;
    /** Registry conversions share one `seen` map across every emitted schema. These hold the
     * `external` the whole-map passes below last ran for, so the passes are not repeated once per
     * schema — and still re-run if the map grows or `external` is swapped. `sharedEmitDoneFor`
     * covers both passes in `finalize`: the ref flattening and the `$defs` build.
     *
     * The passes are valid only while nothing they read has changed, so both are cleared in
     * `processSchema()` when the map grows, and in `JSONSchemaGenerator.emit()`, which can also change
     * the `cycles` and `reused` they branch on.
     *
     * One case is deliberately not covered: an `override` callback that writes to
     * `metadataRegistry` mid-conversion. It runs inside `finalize`, so a registry conversion has
     * nowhere left to clear the guards, and later schemas keep the ids the first pass saw. That
     * output was never coherent — before this, whether a shared subschema was inlined or extracted
     * depended on which registry entry happened to be emitted when the callback fired. */
    sharedDefsExtractedFor?: ToJSONSchemaContext["external"];
    sharedEmitDoneFor?: ToJSONSchemaContext["external"];
    cycles: "ref" | "throw";
    reused: "ref" | "inline";
    /** The `allOf` array of each intersection encountered during traversal, innermost first. `finalize` folds every emitted object holding one; see `foldIntersection`. */
    intersections: JSONSchema.BaseSchema[][];
    /** Rewrites a processor deferred to `finalize`, where the flatten has resolved every ref and the union branches are in place. */
    deferred: (() => void)[];
    external?: {
        registry: $ZodRegistry<{
            id?: string | undefined;
        }>;
        uri?: ((id: string) => string) | undefined;
        defs: Record<string, JSONSchema.BaseSchema>;
    } | undefined;
}
export declare function initializeContext(params: JSONSchemaGeneratorParams): ToJSONSchemaContext;
/**
 * Applies the `unrepresentable` setting at a site that has no JSON Schema equivalent. Throws
 * `message` unless the setting (or the handler's return value) says otherwise. Returns `true` if a
 * custom JSON Schema was written into `json`, in which case the caller must not write its own.
 */
export declare function handleUnrepresentable(schema: schemas.$ZodType, ctx: ToJSONSchemaContext, json: JSONSchema.BaseSchema, params: ProcessParams, message: string): boolean;
export declare function processSchema<T extends schemas.$ZodType>(schema: T, ctx: ToJSONSchemaContext, _params?: ProcessParams): JSONSchema.BaseSchema;
/** @deprecated Renamed to `processSchema`. An export alias declares no binding, so it is safe to keep. */
export { processSchema as process };
export declare function extractDefs<T extends schemas.$ZodType>(ctx: ToJSONSchemaContext, schema: T): void;
export declare function finalize<T extends schemas.$ZodType>(ctx: ToJSONSchemaContext, schema: T): ZodStandardJSONSchemaPayload<T>;
export type ZodStandardSchemaWithJSON<T> = StandardSchemaWithJSONProps<core.input<T>, core.output<T>>;
export interface ZodStandardJSONSchemaPayload<T> extends JSONSchema.BaseSchema {
    "~standard": ZodStandardSchemaWithJSON<T>;
}
/**
 * Creates a toJSONSchema method for a schema instance.
 * This encapsulates the logic of initializing context, processing, extracting defs, and finalizing.
 */
export declare const createToJSONSchemaMethod: <T extends schemas.$ZodType>(schema: T, processors?: Record<string, Processor>) => (params?: ToJSONSchemaParams) => ZodStandardJSONSchemaPayload<T>;
/**
 * Creates a toJSONSchema method for a schema instance.
 * This encapsulates the logic of initializing context, processing, extracting defs, and finalizing.
 */
type StandardJSONSchemaMethodParams = Parameters<StandardJSONSchemaV1["~standard"]["jsonSchema"]["input"]>[0];
export declare const createStandardJSONSchemaMethod: <T extends schemas.$ZodType>(schema: T, io: "input" | "output", processors?: Record<string, Processor>) => (params?: StandardJSONSchemaMethodParams) => JSONSchema.BaseSchema;
