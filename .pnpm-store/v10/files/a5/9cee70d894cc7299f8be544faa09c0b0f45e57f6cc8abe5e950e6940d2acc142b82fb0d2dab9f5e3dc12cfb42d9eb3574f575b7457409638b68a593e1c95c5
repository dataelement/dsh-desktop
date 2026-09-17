import { globalRegistry } from "./registries.js";
import { assignProp } from "./util.js";
function assignProps(target, ...sources) {
    for (const source of sources) {
        for (const key of Reflect.ownKeys(source)) {
            if (Object.prototype.propertyIsEnumerable.call(source, key)) {
                assignProp(target, key, source[key]);
            }
        }
    }
    return target;
}
// function initializeContext<T extends schemas.$ZodType>(inputs: JSONSchemaGeneratorParams<T>): ToJSONSchemaContext<T> {
//   return {
//     processor: inputs.processor,
//     metadataRegistry: inputs.metadata ?? globalRegistry,
//     target: inputs.target ?? "draft-2020-12",
//     unrepresentable: inputs.unrepresentable ?? "throw",
//   };
// }
export function initializeContext(params) {
    // Normalize target: convert old non-hyphenated versions to hyphenated versions
    let target = params?.target ?? "draft-2020-12";
    if (target === "draft-4")
        target = "draft-04";
    if (target === "draft-7")
        target = "draft-07";
    return {
        processors: params.processors ?? {},
        metadataRegistry: params?.metadata ?? globalRegistry,
        target,
        unrepresentable: params?.unrepresentable ?? "throw",
        override: params?.override ?? (() => { }),
        io: params?.io ?? "output",
        counter: 0,
        seen: new Map(),
        sharedDefsExtractedFor: undefined,
        sharedEmitDoneFor: undefined,
        cycles: params?.cycles ?? "ref",
        reused: params?.reused ?? "inline",
        intersections: [],
        deferred: [],
        external: params?.external ?? undefined,
    };
}
/**
 * Applies the `unrepresentable` setting at a site that has no JSON Schema equivalent. Throws
 * `message` unless the setting (or the handler's return value) says otherwise. Returns `true` if a
 * custom JSON Schema was written into `json`, in which case the caller must not write its own.
 */
export function handleUnrepresentable(schema, ctx, json, params, message) {
    const result = typeof ctx.unrepresentable === "function"
        ? ctx.unrepresentable({ zodSchema: schema, path: params.path, message })
        : ctx.unrepresentable;
    if (result === "any")
        return false;
    if (result === undefined || result === "throw")
        throw new Error(message);
    Object.assign(json, result);
    return true;
}
// never rename this back to `process`: bundler polyfills inject a top-level `const process` that a lexical declaration of the same name collides with (#6397)
export function processSchema(schema, ctx, _params = { path: [], schemaPath: [] }) {
    var _a;
    const def = schema._zod.def;
    // check for schema in seens
    const seen = ctx.seen.get(schema);
    if (seen) {
        seen.count++;
        // check if cycle
        const isCycle = _params.schemaPath.includes(schema);
        if (isCycle) {
            seen.cycle = _params.path;
        }
        return seen.schema;
    }
    // initialize
    const result = { schema: {}, count: 1, cycle: undefined, path: _params.path };
    ctx.seen.set(schema, result);
    ctx.sharedDefsExtractedFor = undefined;
    ctx.sharedEmitDoneFor = undefined;
    // custom method overrides default behavior
    const overrideSchema = schema._zod.toJSONSchema?.();
    if (overrideSchema) {
        result.schema = overrideSchema;
    }
    else {
        const params = {
            ..._params,
            schemaPath: [..._params.schemaPath, schema],
            path: _params.path,
        };
        if (schema._zod.processJSONSchema) {
            schema._zod.processJSONSchema(ctx, result.schema, params);
        }
        else {
            const _json = result.schema;
            const processor = ctx.processors[def.type];
            if (!processor) {
                throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
            }
            processor(schema, ctx, _json, params);
        }
        const parent = schema._zod.parent;
        if (parent) {
            // Also set ref if processor didn't (for inheritance)
            if (!result.ref)
                result.ref = parent;
            processSchema(parent, ctx, params);
            ctx.seen.get(parent).isParent = true;
        }
    }
    // metadata
    const meta = ctx.metadataRegistry.get(schema);
    if (meta)
        assignProps(result.schema, meta);
    if (ctx.io === "input" && isTransforming(schema)) {
        // examples/defaults only apply to output type of pipe
        delete result.schema.examples;
        delete result.schema.default;
    }
    // set prefault as default
    if (ctx.io === "input" && "_prefault" in result.schema)
        (_a = result.schema).default ?? (_a.default = result.schema._prefault);
    delete result.schema._prefault;
    // pulling fresh from ctx.seen in case it was overwritten
    const _result = ctx.seen.get(schema);
    return _result.schema;
}
/** @deprecated Renamed to `processSchema`. An export alias declares no binding, so it is safe to keep. */
export { processSchema as process };
// Escape a reference token for use in a JSON Pointer fragment (RFC 6901): `~` becomes `~0` and `/` becomes `~1`. The `~` replacement must run first.
function encodeJSONPointerSegment(segment) {
    return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}
export function extractDefs(ctx, schema
// params: EmitParams
) {
    // iterate over seen map;
    const root = ctx.seen.get(schema);
    if (!root)
        throw new Error("Unprocessed schema. This is a bug in Zod.");
    // With `external` set, every registered schema resolves through the external branch of `makeURI`, so the root branch below produces the same ref the external branch would — this pass is identical whichever schema it is called with, and only needs to run once.
    if (ctx.external && ctx.sharedDefsExtractedFor === ctx.external)
        return;
    // Track ids to detect duplicates across different schemas
    const idToSchema = new Map();
    for (const entry of ctx.seen.entries()) {
        const id = ctx.metadataRegistry.get(entry[0])?.id;
        if (id) {
            const existing = idToSchema.get(id);
            if (existing && existing !== entry[0]) {
                throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
            }
            idToSchema.set(id, entry[0]);
        }
    }
    // returns a ref to the schema defId will be empty if the ref points to an external schema (or #)
    const makeURI = (entry) => {
        // comparing the seen objects because sometimes multiple schemas map to the same seen object. e.g. lazy
        // external is configured
        const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
        if (ctx.external) {
            const externalId = ctx.external.registry.get(entry[0])?.id; // ?? "__shared";// `__schema${ctx.counter++}`;
            // check if schema is in the external registry
            const uriGenerator = ctx.external.uri ?? ((id) => id);
            if (externalId) {
                return { ref: uriGenerator(externalId) };
            }
            // otherwise, add to __shared
            const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
            entry[1].defId = id; // set defId so it will be reused if needed
            return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${encodeJSONPointerSegment(id)}` };
        }
        const uriPrefix = `#`;
        const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
        // an id-less root has nowhere to be extracted to, so it stays inline and self-references as `#`
        if (entry[1] === root && !entry[1].schema.id) {
            return { ref: uriPrefix };
        }
        // self-contained schema
        const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
        return { defId, ref: defUriPrefix + encodeJSONPointerSegment(defId) };
    };
    // stored cached version in `def` property remove all properties, set $ref
    const extractToDef = (entry) => {
        // if the schema is already a reference, do not extract it
        if (entry[1].schema.$ref) {
            return;
        }
        const seen = entry[1];
        const { ref, defId } = makeURI(entry);
        seen.def = { ...seen.schema };
        // defId won't be set if the schema is a reference to an external schema or if the schema is the root schema
        if (defId)
            seen.defId = defId;
        // wipe away all properties except $ref
        const schema = seen.schema;
        for (const key in schema) {
            delete schema[key];
        }
        schema.$ref = ref;
    };
    // throw on cycles
    // break cycles
    if (ctx.cycles === "throw") {
        for (const entry of ctx.seen.entries()) {
            const seen = entry[1];
            if (seen.cycle) {
                throw new Error("Cycle detected: " +
                    `#/${seen.cycle?.join("/")}/<root>` +
                    '\n\nSet the `cycles` parameter to `"ref"` to resolve cyclical schemas with defs.');
            }
        }
    }
    // extract schemas into $defs
    for (const entry of ctx.seen.entries()) {
        const seen = entry[1];
        // convert root schema to # $ref
        if (schema === entry[0]) {
            extractToDef(entry); // this has special handling for the root schema
            continue;
        }
        // extract schemas that are in the external registry
        if (ctx.external) {
            const ext = ctx.external.registry.get(entry[0])?.id;
            if (schema !== entry[0] && ext) {
                extractToDef(entry);
                continue;
            }
        }
        // extract schemas with `id` meta
        const id = ctx.metadataRegistry.get(entry[0])?.id;
        if (id) {
            extractToDef(entry);
            continue;
        }
        // break cycles
        if (seen.cycle) {
            // any
            extractToDef(entry);
            continue;
        }
        // extract reused schemas
        if (seen.count > 1) {
            if (ctx.reused === "ref") {
                extractToDef(entry);
            }
        }
    }
    if (ctx.external)
        ctx.sharedDefsExtractedFor = ctx.external;
}
/** Rewrites `anyOf: [{type: "a"}, {type: "b"}]` to `type: ["a", "b"]`, which every JSON Schema draft treats as equivalent and most consumers render far better for the nullable case. Only branches that are a bare type assertion qualify — anything carrying a constraint, `$ref`, `const` or metadata is left alone. Runs after `flattenRef`, so a branch an override decorated or `$defs` extraction turned into a `$ref` is no longer bare and correctly stays in `anyOf`. `oneOf` is excluded: `integer` and `number` overlap, so "exactly one" and "at least one" are not the same there. OpenAPI 3.0 is excluded: its `type` must be a single string. */
function compactTypeUnion(schema) {
    const options = schema.anyOf;
    if (!Array.isArray(options) || options.length === 0 || schema.type !== undefined)
        return;
    const types = [];
    for (const option of options) {
        if (!option || typeof option !== "object")
            return;
        // A branch that is itself a compactible union folds into this one — nested `anyOf` and a flat `type` array say the same thing. Compacting it first also makes the result independent of the order this pass walks the seen map in.
        compactTypeUnion(option);
        const keys = Object.keys(option);
        if (keys.length !== 1 || keys[0] !== "type")
            return;
        const type = option.type;
        for (const member of Array.isArray(type) ? type : [type]) {
            if (typeof member !== "string")
                return;
            if (!types.includes(member))
                types.push(member);
        }
    }
    delete schema.anyOf;
    // A `type` array must be non-empty and unique (metaschema); a single member is spelled as a bare string.
    schema.type = types.length === 1 ? types[0] : types;
}
/** Keywords `foldIntersection` knows how to combine. Anything else — `$ref`, `patternProperties`,
 * an annotation like `description` — makes a member unfoldable, so a constraint this does not
 * understand leaves the `allOf` alone instead of being silently dropped or misattributed. */
const FOLDABLE_KEYS = new Set(["type", "properties", "required", "additionalProperties"]);
const UNION_KEYS = ["oneOf", "anyOf"];
/** A member's constraint on a key it does not declare itself. A `catchall` states one; `false`, an absent `additionalProperties`, and the empty schema a loose object emits state nothing. */
function undeclaredConstraint(member) {
    const extra = member.additionalProperties;
    if (extra === undefined || extra === false || typeof extra !== "object" || extra === null)
        return null;
    return Object.keys(extra).length ? extra : null;
}
/** Combines object members into the single object they describe together, or returns `null` if any of them carries a keyword outside {@link FOLDABLE_KEYS}. */
function foldObjects(members) {
    const objects = [];
    for (const member of members) {
        // A boolean subschema is legal JSON Schema and carries no keywords to fold.
        if (typeof member !== "object" || member.type !== "object")
            return null;
        for (const key in member) {
            if (!FOLDABLE_KEYS.has(key))
                return null;
        }
        objects.push(member);
    }
    const properties = {};
    const required = new Set();
    for (const object of objects) {
        for (const key in object.properties) {
            // `in` would report a `__proto__` key as already present via the prototype chain and skip it.
            if (Object.prototype.hasOwnProperty.call(properties, key))
                continue;
            // Every member constrains this key: the ones that declare it say how, and a `catchall` member constrains it too even though it does not name it. The key has to satisfy all of them, which is the same intersection one level down.
            const parts = [];
            for (const other of objects) {
                const part = other.properties?.[key] ?? undeclaredConstraint(other);
                if (part === null || part === undefined)
                    continue;
                if (!parts.some((seen) => JSON.stringify(seen) === JSON.stringify(part)))
                    parts.push(part);
            }
            const merged = parts.length === 1
                ? parts[0]
                : (foldObjects(parts) ?? { allOf: parts });
            assignProp(properties, key, merged);
        }
        for (const key of object.required ?? [])
            required.add(key);
    }
    const folded = { type: "object", properties };
    if (required.size)
        folded.required = [...required];
    // A key no member declares is rejected only when every member rejects it, so the fold is closed only when every member is. Otherwise it carries whatever the `catchall` members demand of such a key.
    if (objects.every((object) => object.additionalProperties === false)) {
        folded.additionalProperties = false;
    }
    else {
        const constraints = [];
        for (const object of objects) {
            const constraint = undeclaredConstraint(object);
            if (constraint && !constraints.some((seen) => JSON.stringify(seen) === JSON.stringify(constraint)))
                constraints.push(constraint);
        }
        if (constraints.length === 1)
            folded.additionalProperties = constraints[0];
        else if (constraints.length > 1)
            folded.additionalProperties = { allOf: constraints };
    }
    return folded;
}
/** `additionalProperties` in an `allOf` member sees only that member's own `properties`, so two
 * closed object members reject each other's keys and the schema validates nothing. Zod's parser
 * pools the key sets instead — `handleIntersectionResults` reports a key as unrecognized only when
 * *every* side rejects it — so the emitted schema has to pool them too, and folding the members
 * into one object is the encoding that says so on every target.
 *
 * This runs from `finalize`, after `extractDefs`, which is what keeps it clear of the `$ref`
 * machinery: a member extracted into `$defs` is already a `$ref` by now and declines to fold, so it
 * keeps its reference and its own closedness rather than being inlined as a stale copy. */
function foldIntersection(json) {
    const allOf = json.allOf;
    if (!Array.isArray(allOf) || allOf.length < 2)
        return;
    // An `override` runs before this pass and may have written object keywords onto the intersection itself. Those are deliberate, so decline rather than overwrite them.
    for (const key of FOLDABLE_KEYS)
        if (key in json)
            return;
    // An intersection distributes over a union: `A & (X | Y)` is `(A & X) | (A & Y)`. Only the first union is distributed over; a second one stays among the members every branch folds against, where it fails the object check and declines the whole intersection rather than multiplying out.
    const unions = allOf.filter((m) => UNION_KEYS.some((k) => Array.isArray(m[k])));
    let folded = null;
    if (!unions.length) {
        folded = foldObjects(allOf);
    }
    else {
        const union = unions[0];
        const keyword = UNION_KEYS.find((k) => Array.isArray(union[k]));
        if (Object.keys(union).length !== 1)
            return;
        const rest = allOf.filter((m) => m !== union);
        const branches = union[keyword].map((branch) => foldObjects([...rest, branch]));
        if (branches.some((b) => !b))
            return;
        folded = { [keyword]: branches };
    }
    if (!folded)
        return;
    delete json.allOf;
    assignProps(json, folded);
}
export function finalize(ctx, schema) {
    const root = ctx.seen.get(schema);
    if (!root)
        throw new Error("Unprocessed schema. This is a bug in Zod.");
    // flatten refs - inherit properties from parent schemas
    const flattenRef = (zodSchema) => {
        const seen = ctx.seen.get(zodSchema);
        // already processed
        if (seen.ref === null)
            return;
        const schema = seen.def ?? seen.schema;
        const _cached = { ...schema };
        const ref = seen.ref;
        seen.ref = null; // prevent infinite recursion
        if (ref) {
            flattenRef(ref);
            const refSeen = ctx.seen.get(ref);
            const refSchema = refSeen.schema;
            // merge referenced schema into current
            if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
                // older drafts can't combine $ref with other properties
                schema.allOf = schema.allOf ?? [];
                schema.allOf.push(refSchema);
            }
            else {
                assignProps(schema, refSchema);
            }
            // restore child's own properties (child wins)
            assignProps(schema, _cached);
            const isParentRef = zodSchema._zod.parent === ref;
            // For parent chain, child is a refinement - remove parent-only properties
            if (isParentRef) {
                for (const key in schema) {
                    if (key === "$ref" || key === "allOf")
                        continue;
                    if (!(key in _cached)) {
                        delete schema[key];
                    }
                }
            }
            // When ref was extracted to $defs, remove properties that match the definition
            if (refSchema.$ref && refSeen.def) {
                for (const key in schema) {
                    if (key === "$ref" || key === "allOf")
                        continue;
                    if (key in refSeen.def && JSON.stringify(schema[key]) === JSON.stringify(refSeen.def[key])) {
                        delete schema[key];
                    }
                }
            }
        }
        // If parent was extracted (has $ref), propagate $ref to this schema. This handles cases like: readonly().meta({id}).describe() where processor sets ref to innerType but parent should be referenced
        const parent = zodSchema._zod.parent;
        if (parent && parent !== ref) {
            // Ensure parent is processed first so its def has inherited properties
            flattenRef(parent);
            const parentSeen = ctx.seen.get(parent);
            if (parentSeen?.schema.$ref) {
                schema.$ref = parentSeen.schema.$ref;
                // De-duplicate with parent's definition
                if (parentSeen.def) {
                    for (const key in schema) {
                        if (key === "$ref" || key === "allOf")
                            continue;
                        if (key in parentSeen.def && JSON.stringify(schema[key]) === JSON.stringify(parentSeen.def[key])) {
                            delete schema[key];
                        }
                    }
                }
            }
        }
        // execute overrides
        ctx.override({
            zodSchema: zodSchema,
            jsonSchema: schema,
            path: seen.path ?? [],
        });
    };
    // Flattening walks the whole map and clears each `ref` as it goes, so a second call over the same map is a no-op scan. Skip it outright once it has run for a registry conversion.
    if (!ctx.external || ctx.sharedEmitDoneFor !== ctx.external) {
        for (const entry of [...ctx.seen.entries()].reverse()) {
            flattenRef(entry[0]);
        }
        if (ctx.target !== "openapi-3.0") {
            for (const entry of ctx.seen.entries()) {
                compactTypeUnion(entry[1].def ?? entry[1].schema);
            }
        }
        for (const rewrite of ctx.deferred)
            rewrite();
        // After flattening, every member that was extracted is a `$ref`, so the fold sees the final shape. A schema that inherits an intersection — through `z.lazy`, or any `ref` chain — holds the same `allOf` array, so fold by array identity to catch every copy.
        if (ctx.intersections.length) {
            const carriers = new Map();
            for (const seen of ctx.seen.values()) {
                for (const json of [seen.schema, seen.def]) {
                    const allOf = json?.allOf;
                    if (!Array.isArray(allOf))
                        continue;
                    const existing = carriers.get(allOf);
                    if (existing)
                        existing.push(json);
                    else
                        carriers.set(allOf, [json]);
                }
            }
            for (const allOf of ctx.intersections) {
                for (const json of carriers.get(allOf) ?? [])
                    foldIntersection(json);
            }
        }
    }
    const result = {};
    if (ctx.target === "draft-2020-12") {
        result.$schema = "https://json-schema.org/draft/2020-12/schema";
    }
    else if (ctx.target === "draft-07") {
        result.$schema = "http://json-schema.org/draft-07/schema#";
    }
    else if (ctx.target === "draft-04") {
        result.$schema = "http://json-schema.org/draft-04/schema#";
    }
    else if (ctx.target === "openapi-3.0") {
        // OpenAPI 3.0 schema objects should not include a $schema property
    }
    else {
        // Arbitrary string values are allowed but won't have a $schema property set
    }
    if (ctx.external?.uri) {
        const id = ctx.external.registry.get(schema)?.id;
        if (!id)
            throw new Error("Schema is missing an `id` property");
        result.$id = ctx.external.uri(id);
    }
    // when the root was extracted into $defs, `root.schema` is the `$ref` wrapper and `root.def` is the body that now lives under $defs
    assignProps(result, root.defId ? root.schema : (root.def ?? root.schema));
    // The `id` in `.meta()` is a Zod-specific registration tag used to extract schemas into $defs — it is not user-facing JSON Schema metadata. Strip it from the output body where it would otherwise leak. The id is preserved implicitly via the $defs key (and via $ref paths).
    const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
    if (rootMetaId !== undefined && result.id === rootMetaId)
        delete result.id;
    // build defs object. With `external`, `defs` is the shared object every schema writes into, so the same entries are reassigned on every call. Without it, `defs` is fresh per call and must be rebuilt.
    const defs = ctx.external?.defs ?? {};
    if (!ctx.external || ctx.sharedEmitDoneFor !== ctx.external) {
        for (const entry of ctx.seen.entries()) {
            const seen = entry[1];
            if (seen.def && seen.defId) {
                if (seen.def.id === seen.defId)
                    delete seen.def.id;
                assignProp(defs, seen.defId, seen.def);
            }
        }
    }
    if (ctx.external)
        ctx.sharedEmitDoneFor = ctx.external;
    // set definitions in result
    if (ctx.external) {
    }
    else {
        if (Object.keys(defs).length > 0) {
            if (ctx.target === "draft-2020-12") {
                result.$defs = defs;
            }
            else {
                result.definitions = defs;
            }
        }
    }
    try {
        // this "finalizes" this schema and ensures all cycles are removed each call to finalize() is functionally independent though the seen map is shared
        const finalized = JSON.parse(JSON.stringify(result));
        Object.defineProperty(finalized, "~standard", {
            value: {
                ...schema["~standard"],
                jsonSchema: {
                    input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
                    output: createStandardJSONSchemaMethod(schema, "output", ctx.processors),
                },
            },
            enumerable: false,
            writable: false,
        });
        return finalized;
    }
    catch (_err) {
        throw new Error("Error converting schema to JSON.");
    }
}
function isTransforming(_schema, _ctx) {
    const ctx = _ctx ?? { seen: new Set() };
    if (ctx.seen.has(_schema))
        return false;
    ctx.seen.add(_schema);
    const def = _schema._zod.def;
    if (def.type === "transform")
        return true;
    if (def.type === "array")
        return isTransforming(def.element, ctx);
    if (def.type === "set")
        return isTransforming(def.valueType, ctx);
    if (def.type === "lazy")
        return isTransforming(def.getter(), ctx);
    if (def.type === "promise" ||
        def.type === "optional" ||
        def.type === "nonoptional" ||
        def.type === "nullable" ||
        def.type === "readonly" ||
        def.type === "default" ||
        def.type === "prefault" ||
        def.type === "catch") {
        return isTransforming(def.innerType, ctx);
    }
    if (def.type === "intersection") {
        return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
    }
    if (def.type === "record" || def.type === "map") {
        return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
    }
    if (def.type === "pipe") {
        if (_schema._zod.traits.has("$ZodCodec"))
            return true;
        return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
    }
    if (def.type === "object") {
        for (const key in def.shape) {
            if (isTransforming(def.shape[key], ctx))
                return true;
        }
        return false;
    }
    if (def.type === "union") {
        for (const option of def.options) {
            if (isTransforming(option, ctx))
                return true;
        }
        return false;
    }
    if (def.type === "tuple") {
        for (const item of def.items) {
            if (isTransforming(item, ctx))
                return true;
        }
        if (def.rest && isTransforming(def.rest, ctx))
            return true;
        return false;
    }
    return false;
}
/**
 * Creates a toJSONSchema method for a schema instance.
 * This encapsulates the logic of initializing context, processing, extracting defs, and finalizing.
 */
export const createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
    const ctx = initializeContext({ ...params, processors });
    processSchema(schema, ctx);
    extractDefs(ctx, schema);
    return finalize(ctx, schema);
};
export const createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
    const { libraryOptions, target } = params ?? {};
    const ctx = initializeContext({ ...(libraryOptions ?? {}), target, io, processors });
    processSchema(schema, ctx);
    extractDefs(ctx, schema);
    return finalize(ctx, schema);
};
