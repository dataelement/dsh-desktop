window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-typert-registry",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_cordis = require("@deepseek-ai/cordis");
		//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/util.js
		function getEnumValues(entries) {
			const numericValues = Object.values(entries).filter((v) => typeof v === "number");
			return Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
		}
		"captureStackTrace" in Error && Error.captureStackTrace;
		Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, -Number.MAX_VALUE, Number.MAX_VALUE;
		//#endregion
		//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/registries.js
		var _a;
		var $ZodRegistry = class {
			constructor() {
				this._map = /* @__PURE__ */ new WeakMap();
				this._idmap = /* @__PURE__ */ new Map();
			}
			add(schema, ..._meta) {
				const meta = _meta[0];
				this._map.set(schema, meta);
				if (meta && typeof meta === "object" && "id" in meta) this._idmap.set(meta.id, schema);
				return this;
			}
			clear() {
				this._map = /* @__PURE__ */ new WeakMap();
				this._idmap = /* @__PURE__ */ new Map();
				return this;
			}
			remove(schema) {
				const meta = this._map.get(schema);
				if (meta && typeof meta === "object" && "id" in meta) this._idmap.delete(meta.id);
				this._map.delete(schema);
				return this;
			}
			get(schema) {
				const p = schema._zod.parent;
				if (p) {
					const pm = { ...this.get(p) ?? {} };
					delete pm.id;
					const f = {
						...pm,
						...this._map.get(schema)
					};
					return Object.keys(f).length ? f : void 0;
				}
				return this._map.get(schema);
			}
			has(schema) {
				return this._map.has(schema);
			}
		};
		function registry() {
			return new $ZodRegistry();
		}
		(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
		const globalRegistry = globalThis.__zod_globalRegistry;
		//#endregion
		//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js
		function initializeContext(params) {
			let target = params?.target ?? "draft-2020-12";
			if (target === "draft-4") target = "draft-04";
			if (target === "draft-7") target = "draft-07";
			return {
				processors: params.processors ?? {},
				metadataRegistry: params?.metadata ?? globalRegistry,
				target,
				unrepresentable: params?.unrepresentable ?? "throw",
				override: params?.override ?? (() => {}),
				io: params?.io ?? "output",
				counter: 0,
				seen: /* @__PURE__ */ new Map(),
				cycles: params?.cycles ?? "ref",
				reused: params?.reused ?? "inline",
				external: params?.external ?? void 0
			};
		}
		function process(schema, ctx, _params = {
			path: [],
			schemaPath: []
		}) {
			var _a;
			const def = schema._zod.def;
			const seen = ctx.seen.get(schema);
			if (seen) {
				seen.count++;
				if (_params.schemaPath.includes(schema)) seen.cycle = _params.path;
				return seen.schema;
			}
			const result = {
				schema: {},
				count: 1,
				cycle: void 0,
				path: _params.path
			};
			ctx.seen.set(schema, result);
			const overrideSchema = schema._zod.toJSONSchema?.();
			if (overrideSchema) result.schema = overrideSchema;
			else {
				const params = {
					..._params,
					schemaPath: [..._params.schemaPath, schema],
					path: _params.path
				};
				if (schema._zod.processJSONSchema) schema._zod.processJSONSchema(ctx, result.schema, params);
				else {
					const _json = result.schema;
					const processor = ctx.processors[def.type];
					if (!processor) throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
					processor(schema, ctx, _json, params);
				}
				const parent = schema._zod.parent;
				if (parent) {
					if (!result.ref) result.ref = parent;
					process(parent, ctx, params);
					ctx.seen.get(parent).isParent = true;
				}
			}
			const meta = ctx.metadataRegistry.get(schema);
			if (meta) Object.assign(result.schema, meta);
			if (ctx.io === "input" && isTransforming(schema)) {
				delete result.schema.examples;
				delete result.schema.default;
			}
			if (ctx.io === "input" && "_prefault" in result.schema) (_a = result.schema).default ?? (_a.default = result.schema._prefault);
			delete result.schema._prefault;
			return ctx.seen.get(schema).schema;
		}
		function extractDefs(ctx, schema) {
			const root = ctx.seen.get(schema);
			if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
			const idToSchema = /* @__PURE__ */ new Map();
			for (const entry of ctx.seen.entries()) {
				const id = ctx.metadataRegistry.get(entry[0])?.id;
				if (id) {
					const existing = idToSchema.get(id);
					if (existing && existing !== entry[0]) throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
					idToSchema.set(id, entry[0]);
				}
			}
			const makeURI = (entry) => {
				const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
				if (ctx.external) {
					const externalId = ctx.external.registry.get(entry[0])?.id;
					const uriGenerator = ctx.external.uri ?? ((id) => id);
					if (externalId) return { ref: uriGenerator(externalId) };
					const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
					entry[1].defId = id;
					return {
						defId: id,
						ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}`
					};
				}
				if (entry[1] === root) return { ref: "#" };
				const defUriPrefix = `#/${defsSegment}/`;
				const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
				return {
					defId,
					ref: defUriPrefix + defId
				};
			};
			const extractToDef = (entry) => {
				if (entry[1].schema.$ref) return;
				const seen = entry[1];
				const { ref, defId } = makeURI(entry);
				seen.def = { ...seen.schema };
				if (defId) seen.defId = defId;
				const schema = seen.schema;
				for (const key in schema) delete schema[key];
				schema.$ref = ref;
			};
			if (ctx.cycles === "throw") for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (seen.cycle) throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
			}
			for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (schema === entry[0]) {
					extractToDef(entry);
					continue;
				}
				if (ctx.external) {
					const ext = ctx.external.registry.get(entry[0])?.id;
					if (schema !== entry[0] && ext) {
						extractToDef(entry);
						continue;
					}
				}
				if (ctx.metadataRegistry.get(entry[0])?.id) {
					extractToDef(entry);
					continue;
				}
				if (seen.cycle) {
					extractToDef(entry);
					continue;
				}
				if (seen.count > 1) {
					if (ctx.reused === "ref") {
						extractToDef(entry);
						continue;
					}
				}
			}
		}
		function finalize(ctx, schema) {
			const root = ctx.seen.get(schema);
			if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
			const flattenRef = (zodSchema) => {
				const seen = ctx.seen.get(zodSchema);
				if (seen.ref === null) return;
				const schema = seen.def ?? seen.schema;
				const _cached = { ...schema };
				const ref = seen.ref;
				seen.ref = null;
				if (ref) {
					flattenRef(ref);
					const refSeen = ctx.seen.get(ref);
					const refSchema = refSeen.schema;
					if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
						schema.allOf = schema.allOf ?? [];
						schema.allOf.push(refSchema);
					} else Object.assign(schema, refSchema);
					Object.assign(schema, _cached);
					if (zodSchema._zod.parent === ref) for (const key in schema) {
						if (key === "$ref" || key === "allOf") continue;
						if (!(key in _cached)) delete schema[key];
					}
					if (refSchema.$ref && refSeen.def) for (const key in schema) {
						if (key === "$ref" || key === "allOf") continue;
						if (key in refSeen.def && JSON.stringify(schema[key]) === JSON.stringify(refSeen.def[key])) delete schema[key];
					}
				}
				const parent = zodSchema._zod.parent;
				if (parent && parent !== ref) {
					flattenRef(parent);
					const parentSeen = ctx.seen.get(parent);
					if (parentSeen?.schema.$ref) {
						schema.$ref = parentSeen.schema.$ref;
						if (parentSeen.def) for (const key in schema) {
							if (key === "$ref" || key === "allOf") continue;
							if (key in parentSeen.def && JSON.stringify(schema[key]) === JSON.stringify(parentSeen.def[key])) delete schema[key];
						}
					}
				}
				ctx.override({
					zodSchema,
					jsonSchema: schema,
					path: seen.path ?? []
				});
			};
			for (const entry of [...ctx.seen.entries()].reverse()) flattenRef(entry[0]);
			const result = {};
			if (ctx.target === "draft-2020-12") result.$schema = "https://json-schema.org/draft/2020-12/schema";
			else if (ctx.target === "draft-07") result.$schema = "http://json-schema.org/draft-07/schema#";
			else if (ctx.target === "draft-04") result.$schema = "http://json-schema.org/draft-04/schema#";
			else if (ctx.target === "openapi-3.0") {}
			if (ctx.external?.uri) {
				const id = ctx.external.registry.get(schema)?.id;
				if (!id) throw new Error("Schema is missing an `id` property");
				result.$id = ctx.external.uri(id);
			}
			Object.assign(result, root.def ?? root.schema);
			const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
			if (rootMetaId !== void 0 && result.id === rootMetaId) delete result.id;
			const defs = ctx.external?.defs ?? {};
			for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (seen.def && seen.defId) {
					if (seen.def.id === seen.defId) delete seen.def.id;
					defs[seen.defId] = seen.def;
				}
			}
			if (ctx.external) {} else if (Object.keys(defs).length > 0) if (ctx.target === "draft-2020-12") result.$defs = defs;
			else result.definitions = defs;
			try {
				const finalized = JSON.parse(JSON.stringify(result));
				Object.defineProperty(finalized, "~standard", {
					value: {
						...schema["~standard"],
						jsonSchema: {
							input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
							output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
						}
					},
					enumerable: false,
					writable: false
				});
				return finalized;
			} catch (_err) {
				throw new Error("Error converting schema to JSON.");
			}
		}
		function isTransforming(_schema, _ctx) {
			const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
			if (ctx.seen.has(_schema)) return false;
			ctx.seen.add(_schema);
			const def = _schema._zod.def;
			if (def.type === "transform") return true;
			if (def.type === "array") return isTransforming(def.element, ctx);
			if (def.type === "set") return isTransforming(def.valueType, ctx);
			if (def.type === "lazy") return isTransforming(def.getter(), ctx);
			if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") return isTransforming(def.innerType, ctx);
			if (def.type === "intersection") return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
			if (def.type === "record" || def.type === "map") return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
			if (def.type === "pipe") {
				if (_schema._zod.traits.has("$ZodCodec")) return true;
				return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
			}
			if (def.type === "object") {
				for (const key in def.shape) if (isTransforming(def.shape[key], ctx)) return true;
				return false;
			}
			if (def.type === "union") {
				for (const option of def.options) if (isTransforming(option, ctx)) return true;
				return false;
			}
			if (def.type === "tuple") {
				for (const item of def.items) if (isTransforming(item, ctx)) return true;
				if (def.rest && isTransforming(def.rest, ctx)) return true;
				return false;
			}
			return false;
		}
		const createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
			const { libraryOptions, target } = params ?? {};
			const ctx = initializeContext({
				...libraryOptions ?? {},
				target,
				io,
				processors
			});
			process(schema, ctx);
			extractDefs(ctx, schema);
			return finalize(ctx, schema);
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js
		const formatMap = {
			guid: "uuid",
			url: "uri",
			datetime: "date-time",
			json_string: "json-string",
			regex: ""
		};
		const stringProcessor = (schema, ctx, _json, _params) => {
			const json = _json;
			json.type = "string";
			const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
			if (typeof minimum === "number") json.minLength = minimum;
			if (typeof maximum === "number") json.maxLength = maximum;
			if (format) {
				json.format = formatMap[format] ?? format;
				if (json.format === "") delete json.format;
				if (format === "time") delete json.format;
			}
			if (contentEncoding) json.contentEncoding = contentEncoding;
			if (patterns && patterns.size > 0) {
				const regexes = [...patterns];
				if (regexes.length === 1) json.pattern = regexes[0].source;
				else if (regexes.length > 1) json.allOf = [...regexes.map((regex) => ({
					...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
					pattern: regex.source
				}))];
			}
		};
		const numberProcessor = (schema, ctx, _json, _params) => {
			const json = _json;
			const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
			if (typeof format === "string" && format.includes("int")) json.type = "integer";
			else json.type = "number";
			const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
			const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
			const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
			if (exMin) if (legacy) {
				json.minimum = exclusiveMinimum;
				json.exclusiveMinimum = true;
			} else json.exclusiveMinimum = exclusiveMinimum;
			else if (typeof minimum === "number") json.minimum = minimum;
			if (exMax) if (legacy) {
				json.maximum = exclusiveMaximum;
				json.exclusiveMaximum = true;
			} else json.exclusiveMaximum = exclusiveMaximum;
			else if (typeof maximum === "number") json.maximum = maximum;
			if (typeof multipleOf === "number") json.multipleOf = multipleOf;
		};
		const booleanProcessor = (_schema, _ctx, json, _params) => {
			json.type = "boolean";
		};
		const bigintProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("BigInt cannot be represented in JSON Schema");
		};
		const symbolProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Symbols cannot be represented in JSON Schema");
		};
		const nullProcessor = (_schema, ctx, json, _params) => {
			if (ctx.target === "openapi-3.0") {
				json.type = "string";
				json.nullable = true;
				json.enum = [null];
			} else json.type = "null";
		};
		const undefinedProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Undefined cannot be represented in JSON Schema");
		};
		const voidProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Void cannot be represented in JSON Schema");
		};
		const neverProcessor = (_schema, _ctx, json, _params) => {
			json.not = {};
		};
		const anyProcessor = (_schema, _ctx, _json, _params) => {};
		const unknownProcessor = (_schema, _ctx, _json, _params) => {};
		const dateProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Date cannot be represented in JSON Schema");
		};
		const enumProcessor = (schema, _ctx, json, _params) => {
			const def = schema._zod.def;
			const values = getEnumValues(def.entries);
			if (values.every((v) => typeof v === "number")) json.type = "number";
			if (values.every((v) => typeof v === "string")) json.type = "string";
			json.enum = values;
		};
		const literalProcessor = (schema, ctx, json, _params) => {
			const def = schema._zod.def;
			const vals = [];
			for (const val of def.values) if (val === void 0) {
				if (ctx.unrepresentable === "throw") throw new Error("Literal `undefined` cannot be represented in JSON Schema");
			} else if (typeof val === "bigint") if (ctx.unrepresentable === "throw") throw new Error("BigInt literals cannot be represented in JSON Schema");
			else vals.push(Number(val));
			else vals.push(val);
			if (vals.length === 0) {} else if (vals.length === 1) {
				const val = vals[0];
				json.type = val === null ? "null" : typeof val;
				if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") json.enum = [val];
				else json.const = val;
			} else {
				if (vals.every((v) => typeof v === "number")) json.type = "number";
				if (vals.every((v) => typeof v === "string")) json.type = "string";
				if (vals.every((v) => typeof v === "boolean")) json.type = "boolean";
				if (vals.every((v) => v === null)) json.type = "null";
				json.enum = vals;
			}
		};
		const nanProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("NaN cannot be represented in JSON Schema");
		};
		const templateLiteralProcessor = (schema, _ctx, json, _params) => {
			const _json = json;
			const pattern = schema._zod.pattern;
			if (!pattern) throw new Error("Pattern not found in template literal");
			_json.type = "string";
			_json.pattern = pattern.source;
		};
		const fileProcessor = (schema, _ctx, json, _params) => {
			const _json = json;
			const file = {
				type: "string",
				format: "binary",
				contentEncoding: "binary"
			};
			const { minimum, maximum, mime } = schema._zod.bag;
			if (minimum !== void 0) file.minLength = minimum;
			if (maximum !== void 0) file.maxLength = maximum;
			if (mime) if (mime.length === 1) {
				file.contentMediaType = mime[0];
				Object.assign(_json, file);
			} else {
				Object.assign(_json, file);
				_json.anyOf = mime.map((m) => ({ contentMediaType: m }));
			}
			else Object.assign(_json, file);
		};
		const successProcessor = (_schema, _ctx, json, _params) => {
			json.type = "boolean";
		};
		const customProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Custom types cannot be represented in JSON Schema");
		};
		const functionProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Function types cannot be represented in JSON Schema");
		};
		const transformProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Transforms cannot be represented in JSON Schema");
		};
		const mapProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Map cannot be represented in JSON Schema");
		};
		const setProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Set cannot be represented in JSON Schema");
		};
		const arrayProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			const { minimum, maximum } = schema._zod.bag;
			if (typeof minimum === "number") json.minItems = minimum;
			if (typeof maximum === "number") json.maxItems = maximum;
			json.type = "array";
			json.items = process(def.element, ctx, {
				...params,
				path: [...params.path, "items"]
			});
		};
		const objectProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			json.type = "object";
			json.properties = {};
			const shape = def.shape;
			for (const key in shape) json.properties[key] = process(shape[key], ctx, {
				...params,
				path: [
					...params.path,
					"properties",
					key
				]
			});
			const allKeys = new Set(Object.keys(shape));
			const requiredKeys = new Set([...allKeys].filter((key) => {
				const v = def.shape[key]._zod;
				if (ctx.io === "input") return v.optin === void 0;
				else return v.optout === void 0;
			}));
			if (requiredKeys.size > 0) json.required = Array.from(requiredKeys);
			if (def.catchall?._zod.def.type === "never") json.additionalProperties = false;
			else if (!def.catchall) {
				if (ctx.io === "output") json.additionalProperties = false;
			} else if (def.catchall) json.additionalProperties = process(def.catchall, ctx, {
				...params,
				path: [...params.path, "additionalProperties"]
			});
		};
		const unionProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const isExclusive = def.inclusive === false;
			const options = def.options.map((x, i) => process(x, ctx, {
				...params,
				path: [
					...params.path,
					isExclusive ? "oneOf" : "anyOf",
					i
				]
			}));
			if (isExclusive) json.oneOf = options;
			else json.anyOf = options;
		};
		const intersectionProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const a = process(def.left, ctx, {
				...params,
				path: [
					...params.path,
					"allOf",
					0
				]
			});
			const b = process(def.right, ctx, {
				...params,
				path: [
					...params.path,
					"allOf",
					1
				]
			});
			const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
			json.allOf = [...isSimpleIntersection(a) ? a.allOf : [a], ...isSimpleIntersection(b) ? b.allOf : [b]];
		};
		const tupleProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			json.type = "array";
			const prefixPath = ctx.target === "draft-2020-12" ? "prefixItems" : "items";
			const restPath = ctx.target === "draft-2020-12" ? "items" : ctx.target === "openapi-3.0" ? "items" : "additionalItems";
			const prefixItems = def.items.map((x, i) => process(x, ctx, {
				...params,
				path: [
					...params.path,
					prefixPath,
					i
				]
			}));
			const rest = def.rest ? process(def.rest, ctx, {
				...params,
				path: [
					...params.path,
					restPath,
					...ctx.target === "openapi-3.0" ? [def.items.length] : []
				]
			}) : null;
			if (ctx.target === "draft-2020-12") {
				json.prefixItems = prefixItems;
				if (rest) json.items = rest;
			} else if (ctx.target === "openapi-3.0") {
				json.items = { anyOf: prefixItems };
				if (rest) json.items.anyOf.push(rest);
				json.minItems = prefixItems.length;
				if (!rest) json.maxItems = prefixItems.length;
			} else {
				json.items = prefixItems;
				if (rest) json.additionalItems = rest;
			}
			const { minimum, maximum } = schema._zod.bag;
			if (typeof minimum === "number") json.minItems = minimum;
			if (typeof maximum === "number") json.maxItems = maximum;
		};
		const recordProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			json.type = "object";
			const keyType = def.keyType;
			const patterns = keyType._zod.bag?.patterns;
			if (def.mode === "loose" && patterns && patterns.size > 0) {
				const valueSchema = process(def.valueType, ctx, {
					...params,
					path: [
						...params.path,
						"patternProperties",
						"*"
					]
				});
				json.patternProperties = {};
				for (const pattern of patterns) json.patternProperties[pattern.source] = valueSchema;
			} else {
				if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") json.propertyNames = process(def.keyType, ctx, {
					...params,
					path: [...params.path, "propertyNames"]
				});
				json.additionalProperties = process(def.valueType, ctx, {
					...params,
					path: [...params.path, "additionalProperties"]
				});
			}
			const keyValues = keyType._zod.values;
			if (keyValues) {
				const validKeyValues = [...keyValues].filter((v) => typeof v === "string" || typeof v === "number");
				if (validKeyValues.length > 0) json.required = validKeyValues;
			}
		};
		const nullableProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const inner = process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			if (ctx.target === "openapi-3.0") {
				seen.ref = def.innerType;
				json.nullable = true;
			} else json.anyOf = [inner, { type: "null" }];
		};
		const nonoptionalProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
		};
		const defaultProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			json.default = JSON.parse(JSON.stringify(def.defaultValue));
		};
		const prefaultProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			if (ctx.io === "input") json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
		};
		const catchProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			let catchValue;
			try {
				catchValue = def.catchValue(void 0);
			} catch {
				throw new Error("Dynamic catch values are not supported in JSON Schema");
			}
			json.default = catchValue;
		};
		const pipeProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			const inIsTransform = def.in._zod.traits.has("$ZodTransform");
			const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
			process(innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = innerType;
		};
		const readonlyProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			json.readOnly = true;
		};
		const promiseProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
		};
		const optionalProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
		};
		const lazyProcessor = (schema, ctx, _json, params) => {
			const innerType = schema._zod.innerType;
			process(innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = innerType;
		};
		const allProcessors = {
			string: stringProcessor,
			number: numberProcessor,
			boolean: booleanProcessor,
			bigint: bigintProcessor,
			symbol: symbolProcessor,
			null: nullProcessor,
			undefined: undefinedProcessor,
			void: voidProcessor,
			never: neverProcessor,
			any: anyProcessor,
			unknown: unknownProcessor,
			date: dateProcessor,
			enum: enumProcessor,
			literal: literalProcessor,
			nan: nanProcessor,
			template_literal: templateLiteralProcessor,
			file: fileProcessor,
			success: successProcessor,
			custom: customProcessor,
			function: functionProcessor,
			transform: transformProcessor,
			map: mapProcessor,
			set: setProcessor,
			array: arrayProcessor,
			object: objectProcessor,
			union: unionProcessor,
			intersection: intersectionProcessor,
			tuple: tupleProcessor,
			record: recordProcessor,
			nullable: nullableProcessor,
			nonoptional: nonoptionalProcessor,
			default: defaultProcessor,
			prefault: prefaultProcessor,
			catch: catchProcessor,
			pipe: pipeProcessor,
			readonly: readonlyProcessor,
			promise: promiseProcessor,
			optional: optionalProcessor,
			lazy: lazyProcessor
		};
		function toJSONSchema(input, params) {
			if ("_idmap" in input) {
				const registry = input;
				const ctx = initializeContext({
					...params,
					processors: allProcessors
				});
				const defs = {};
				for (const entry of registry._idmap.entries()) {
					const [_, schema] = entry;
					process(schema, ctx);
				}
				const schemas = {};
				ctx.external = {
					registry,
					uri: params?.uri,
					defs
				};
				for (const entry of registry._idmap.entries()) {
					const [key, schema] = entry;
					extractDefs(ctx, schema);
					schemas[key] = finalize(ctx, schema);
				}
				if (Object.keys(defs).length > 0) schemas.__shared = { [ctx.target === "draft-2020-12" ? "$defs" : "definitions"]: defs };
				return { schemas };
			}
			const ctx = initializeContext({
				...params,
				processors: allProcessors
			});
			process(input, ctx);
			extractDefs(ctx, input);
			return finalize(ctx, input);
		}
		//#endregion
		//#region lib/types/service.js
		/**
		* Runtime registry for generated Typert reflection, Remote invocations, and
		* dependency-inverted lookup/Context providers. It performs no TypeScript
		* analysis or schema generation.
		* @module @deepseek-ai/dsh-typert-registry
		*/
		/**
		* Compose the global key of one generated schema.
		* @param packageName - contributing npm package.
		* @param name - schema export name.
		* @returns `<package>#<name>`.
		*/
		function typertKey(packageName, name) {
			return `${packageName}#${name}`;
		}
		/**
		* Compose the identity of one package-face model.
		* @param packageName - contributing npm package.
		* @param face - independently compiled face.
		* @returns `<package>#<face>`.
		*/
		function typertPackageKey(packageName, face) {
			return `${packageName}#${face}`;
		}
		/**
		* Compose the endpoint key used by local and Remote invocation registries.
		* @param descriptor - invocation whose namespace and method form the endpoint.
		* @returns `<namespace>/<method>`.
		*/
		function typertEndpoint(descriptor) {
			return `${descriptor.namespace}/${descriptor.method}`;
		}
		var ChangeSource = class {
			report;
			listeners = /* @__PURE__ */ new Set();
			constructor(report) {
				this.report = report;
			}
			subscribe(ctx, listener) {
				const { listeners } = this;
				return ctx.effect(function* () {
					listeners.add(listener);
					yield () => {
						listeners.delete(listener);
					};
				}, "typert registry subscription");
			}
			emit(change) {
				for (const listener of [...this.listeners]) try {
					listener(change);
				} catch (error) {
					this.report(change, error);
				}
			}
		};
		var DescriptorStore = class {
			kind;
			entries = /* @__PURE__ */ new Map();
			ids = /* @__PURE__ */ new Map();
			history = /* @__PURE__ */ new Set();
			changes;
			constructor(kind, report) {
				this.kind = kind;
				this.changes = new ChangeSource(report);
			}
			validate(descriptors) {
				const endpoints = /* @__PURE__ */ new Set();
				const ids = /* @__PURE__ */ new Set();
				for (const descriptor of descriptors) {
					validateInvocation(descriptor);
					const endpoint = typertEndpoint(descriptor);
					if (endpoints.has(endpoint) || this.entries.has(endpoint)) throw new Error(`typert: ${this.kind} endpoint "${endpoint}" is already registered`);
					if (ids.has(descriptor.id) || this.ids.has(descriptor.id)) throw new Error(`typert: ${this.kind} invocation id "${descriptor.id}" is already registered`);
					endpoints.add(endpoint);
					ids.add(descriptor.id);
				}
			}
			commit(owner, descriptors) {
				for (const descriptor of descriptors) {
					const entry = {
						descriptor,
						owner
					};
					const endpoint = typertEndpoint(descriptor);
					this.entries.set(endpoint, entry);
					this.ids.set(descriptor.id, entry);
					this.history.add(endpoint);
				}
				for (const descriptor of descriptors) this.changes.emit({
					kind: this.kind,
					key: typertEndpoint(descriptor)
				});
			}
			withdraw(owner, descriptors) {
				const removed = [];
				for (const descriptor of descriptors) {
					const endpoint = typertEndpoint(descriptor);
					const entry = this.entries.get(endpoint);
					/* v8 ignore next -- duplicate registration is rejected, so no later owner can replace this entry before its effect disposes. */
					if (entry?.owner !== owner) continue;
					this.entries.delete(endpoint);
					/* v8 ignore next -- ids and endpoints are committed and withdrawn together under the same unique owner. */
					if (this.ids.get(descriptor.id) === entry) this.ids.delete(descriptor.id);
					removed.push(endpoint);
				}
				for (const endpoint of removed) this.changes.emit({
					kind: this.kind,
					key: endpoint
				});
			}
			get(endpoint) {
				return this.entries.get(endpoint)?.descriptor;
			}
			hasSeen(endpoint) {
				return this.history.has(endpoint);
			}
			list() {
				return [...this.entries.values()].map((entry) => entry.descriptor);
			}
			subscribe(ctx, listener) {
				return this.changes.subscribe(ctx, listener);
			}
		};
		var RemoteStore = class {
			descriptors;
			packages = /* @__PURE__ */ new Map();
			constructor(descriptors) {
				this.descriptors = descriptors;
			}
			view(ctx) {
				return {
					register: (contribution) => this.register(ctx, contribution),
					get: (endpoint) => this.descriptors.get(endpoint),
					list: () => this.descriptors.list(),
					subscribe: (listener) => this.descriptors.subscribe(ctx, listener)
				};
			}
			register(ctx, contribution) {
				validateSegment("Remote package name", contribution.package);
				if (this.packages.has(contribution.package)) throw new Error(`typert: Remote package "${contribution.package}" is already registered`);
				this.descriptors.validate(contribution.descriptors);
				const owner = {};
				const { packages, descriptors } = this;
				return ctx.effect(function* () {
					packages.set(contribution.package, owner);
					descriptors.commit(owner, contribution.descriptors);
					yield () => {
						/* v8 ignore else -- duplicate package registration is rejected, so this effect remains the package's unique owner. */
						if (packages.get(contribution.package) === owner) packages.delete(contribution.package);
						descriptors.withdraw(owner, contribution.descriptors);
					};
				}, `typert.remotes.register(${JSON.stringify(contribution.package)})`);
			}
		};
		var LookupStore = class {
			providers = /* @__PURE__ */ new Map();
			resolvers = /* @__PURE__ */ new Map();
			definitions = /* @__PURE__ */ new Map();
			changes;
			constructor(report) {
				this.changes = new ChangeSource(report);
			}
			view(ctx) {
				return {
					register: (key, provider) => this.register(ctx, key, provider),
					configure: (key, resolver) => this.configure(ctx, key, resolver),
					get: (key) => this.get(key),
					definitions: () => [...this.definitions.values()],
					keys: () => [...this.providers.keys()],
					subscribe: (listener) => this.changes.subscribe(ctx, listener)
				};
			}
			get(key) {
				const provider = this.providers.get(key)?.provider;
				if (provider === void 0) return void 0;
				const resolver = this.resolvers.get(key)?.provider;
				if (resolver === void 0) return provider;
				return {
					parameter: provider.parameter,
					wire: provider.wire,
					hostTypeSymbol: provider.hostTypeSymbol,
					wireTypeSymbol: provider.wireTypeSymbol,
					resolve: (id) => resolver.resolve(id)
				};
			}
			configure(ctx, key, resolver) {
				validateSegment("lookup key", key);
				if (this.resolvers.has(key)) throw new Error(`typert: lookup "${key}" resolver is already configured`);
				const entry = {
					provider: { resolve: async (id) => resolver(id) },
					owner: {}
				};
				const { resolvers, changes } = this;
				return ctx.effect(function* () {
					resolvers.set(key, entry);
					changes.emit({
						kind: "lookup",
						key
					});
					yield () => {
						/* v8 ignore next -- duplicate configuration is rejected, so this effect remains the key's unique owner. */
						if (resolvers.get(key) !== entry) return;
						resolvers.delete(key);
						changes.emit({
							kind: "lookup",
							key
						});
					};
				}, `typert.lookups.configure(${JSON.stringify(key)})`);
			}
			register(ctx, key, provider) {
				validateSegment("lookup key", key);
				validateSegment("lookup parameter", provider.parameter);
				validateWireName("lookup wire field", provider.wire);
				validateNonempty("lookup Host type symbol", provider.hostTypeSymbol);
				validateNonempty("lookup wire type symbol", provider.wireTypeSymbol);
				if (this.providers.has(key)) throw new Error(`typert: lookup "${key}" is already registered`);
				const definition = {
					key,
					parameter: provider.parameter,
					wire: provider.wire,
					hostTypeSymbol: provider.hostTypeSymbol,
					wireTypeSymbol: provider.wireTypeSymbol
				};
				const known = this.definitions.get(key);
				if (known !== void 0 && !lookupDefinitionEquals(known, definition)) throw new Error(`typert: lookup "${key}" changed its wire declaration during this registry lifetime`);
				const entry = {
					provider,
					owner: {}
				};
				const { definitions, providers, changes } = this;
				return ctx.effect(function* () {
					definitions.set(key, definition);
					providers.set(key, entry);
					changes.emit({
						kind: "lookup",
						key
					});
					yield () => {
						/* v8 ignore next -- duplicate registration is rejected, so this effect remains the key's unique owner. */
						if (providers.get(key) !== entry) return;
						providers.delete(key);
						changes.emit({
							kind: "lookup",
							key
						});
					};
				}, `typert.lookups.register(${JSON.stringify(key)})`);
			}
		};
		function lookupDefinitionEquals(left, right) {
			return left.parameter === right.parameter && left.wire === right.wire && left.hostTypeSymbol === right.hostTypeSymbol && left.wireTypeSymbol === right.wireTypeSymbol;
		}
		var ContextStore = class {
			hosts = /* @__PURE__ */ new Map();
			hostResolvers = /* @__PURE__ */ new Map();
			clients = /* @__PURE__ */ new Map();
			changes;
			constructor(report) {
				this.changes = new ChangeSource(report);
			}
			view(ctx) {
				return {
					registerHost: (key, adapter) => this.registerHost(ctx, key, adapter),
					configureHost: (key, resolver) => this.configureHost(ctx, key, resolver),
					registerClient: (key, adapter) => this.registerClient(ctx, key, adapter),
					getHost: (key) => this.getHost(key),
					getClient: (key) => this.clients.get(key)?.provider,
					subscribe: (listener) => this.changes.subscribe(ctx, listener)
				};
			}
			getHost(key) {
				const adapter = this.hosts.get(key)?.provider;
				if (adapter === void 0) return void 0;
				const resolver = this.hostResolvers.get(key)?.provider;
				if (resolver === void 0) return adapter;
				return {
					wire: adapter.wire,
					wireTypeSymbol: adapter.wireTypeSymbol,
					resolve: (id) => resolver.resolve(id)
				};
			}
			configureHost(ctx, key, resolver) {
				validateSegment("Context key", key);
				if (this.hostResolvers.has(key)) throw new Error(`typert: host-context "${key}" resolver is already configured`);
				const entry = {
					provider: { resolve: async (id) => resolver(id) },
					owner: {}
				};
				const { hostResolvers, changes } = this;
				return ctx.effect(function* () {
					hostResolvers.set(key, entry);
					changes.emit({
						kind: "host-context",
						key
					});
					yield () => {
						/* v8 ignore next -- duplicate configuration is rejected, so this effect remains the key's unique owner. */
						if (hostResolvers.get(key) !== entry) return;
						hostResolvers.delete(key);
						changes.emit({
							kind: "host-context",
							key
						});
					};
				}, `typert.contexts.configureHost(${JSON.stringify(key)})`);
			}
			registerHost(ctx, key, adapter) {
				validateSegment("Context key", key);
				validateWireName("Context wire field", adapter.wire);
				validateNonempty("Context wire type symbol", adapter.wireTypeSymbol);
				return this.registerProvider(ctx, this.hosts, "host-context", key, adapter);
			}
			registerClient(ctx, key, adapter) {
				validateSegment("Context key", key);
				return this.registerProvider(ctx, this.clients, "client-context", key, adapter);
			}
			registerProvider(ctx, table, kind, key, provider) {
				if (table.has(key)) throw new Error(`typert: ${kind} provider "${key}" is already registered`);
				const entry = {
					provider,
					owner: {}
				};
				const { changes } = this;
				return ctx.effect(function* () {
					table.set(key, entry);
					changes.emit({
						kind,
						key
					});
					yield () => {
						/* v8 ignore next -- duplicate registration is rejected, so this effect remains the key's unique owner. */
						if (table.get(key) !== entry) return;
						table.delete(key);
						changes.emit({
							kind,
							key
						});
					};
				}, `typert.contexts.register(${JSON.stringify(key)})`);
			}
		};
		/**
		* Registry of generated schemas, package reflection, invocations, and Remote
		* dependency providers.
		* @typert service typert
		*/
		var TypertRegistry = class extends _deepseek_ai_cordis.Service {
			schemas = /* @__PURE__ */ new Map();
			packages = /* @__PURE__ */ new Map();
			localStore;
			remoteStore;
			lookupStore;
			contextStore;
			constructor(ctx) {
				super(ctx, "typert");
				const report = (change, error) => {
					ctx.logger.warn(`typert: ${change.kind} observer for "${change.key}" failed`);
					ctx.logger.warn(error);
				};
				this.localStore = new DescriptorStore("local", report);
				this.remoteStore = new RemoteStore(new DescriptorStore("remote", report));
				this.lookupStore = new LookupStore(report);
				this.contextStore = new ContextStore(report);
			}
			/** Current-environment invocation definitions. */
			get local() {
				const ctx = this.ctx;
				return {
					get: (endpoint) => this.localStore.get(endpoint),
					hasSeen: (endpoint) => this.localStore.hasSeen(endpoint),
					list: () => this.localStore.list(),
					subscribe: (listener) => this.localStore.subscribe(ctx, listener)
				};
			}
			/** Consumer-selected Remote definitions. */
			get remotes() {
				return this.remoteStore.view(this.ctx);
			}
			/** Host object lookup providers. */
			get lookups() {
				return this.lookupStore.view(this.ctx);
			}
			/** Host and Client Context adapters. */
			get contexts() {
				return this.contextStore.view(this.ctx);
			}
			/**
			* Register one generated contribution atomically for the calling fiber.
			* Duplicate package-face identities, schemas, invocation ids, or endpoints
			* reject the whole batch.
			* @param contribution - generated schemas, reflection, and Host invocations.
			* @returns the exact effect disposer that removes this contribution.
			*/
			register(contribution) {
				const packageRecord = this.validatePackage(contribution);
				const schemaRecords = this.validateSchemas(contribution);
				const invocations = contribution.invocations;
				this.localStore.validate(invocations);
				const owner = {};
				const { schemas, packages, localStore } = this;
				return this.ctx.effect(function* () {
					packages.set(packageRecord.key, packageRecord);
					for (const record of schemaRecords) schemas.set(record.key, record);
					localStore.commit(owner, invocations);
					yield () => {
						/* v8 ignore else -- duplicate package-face registration is rejected, so this effect remains its unique owner. */
						if (packages.get(packageRecord.key) === packageRecord) packages.delete(packageRecord.key);
						for (const record of schemaRecords)
 /* v8 ignore else -- duplicate schema registration is rejected, so this contribution remains each record's unique owner. */
						if (schemas.get(record.key) === record) schemas.delete(record.key);
						localStore.withdraw(owner, invocations);
					};
				}, "typert.register()");
			}
			/**
			* Look up one schema by `<package>#<name>`.
			* @param key - global schema key.
			* @returns the live schema record, or `undefined` when absent.
			*/
			get(key) {
				return this.schemas.get(key);
			}
			/**
			* Resolve one required schema.
			* @param key - global schema key.
			* @returns the live schema record.
			* @throws when the key is malformed, the package face is absent, or the schema is not contributed.
			*/
			resolve(key) {
				const record = this.schemas.get(key);
				if (record !== void 0) return record;
				const hash = key.indexOf("#");
				if (hash <= 0 || hash === key.length - 1) throw new Error(`typert: invalid schema key "${key}" — expected "<package>#<name>"`);
				const packageName = key.slice(0, hash);
				if ([...this.packages.values()].some((candidate) => candidate.package === packageName)) throw new Error(`typert: cannot resolve "${key}" — package "${packageName}" is registered but contributes no schema named "${key.slice(hash + 1)}"`);
				throw new Error(`typert: cannot resolve "${key}" — package "${packageName}" has no registered contribution`);
			}
			/**
			* Enumerate live schemas in registration order.
			* @param filter - optional package and face restriction.
			* @returns matching schema records.
			*/
			list(filter = {}) {
				return [...this.schemas.values()].filter((record) => matches(record, filter));
			}
			/**
			* Look up generated reflection for one package face.
			* @param packageName - exact npm package name.
			* @param face - face to query; defaults to the host runtime.
			* @returns the live package record, or `undefined` when absent.
			*/
			getPackage(packageName, face = "host") {
				return this.packages.get(typertPackageKey(packageName, face));
			}
			/**
			* Enumerate generated package reflection in registration order.
			* @param filter - optional package and face restriction.
			* @returns matching package records.
			*/
			listPackages(filter = {}) {
				return [...this.packages.values()].filter((record) => matches(record, filter));
			}
			/**
			* Project a live Zod schema to JSON Schema without caching the result.
			* @param key - global schema key.
			* @param params - Zod projection parameters.
			* @returns a fresh JSON Schema document.
			*/
			toJSONSchema(key, params) {
				return toJSONSchema(this.resolve(key).schema, params);
			}
			validatePackage(contribution) {
				validateSegment("package name", contribution.package);
				const face = contribution.face;
				if (face !== "host" && face !== "client") throw new Error(`typert: invalid face ${JSON.stringify(face)} — expected "host" or "client"`);
				const key = typertPackageKey(contribution.package, contribution.face);
				if (this.packages.has(key)) throw new Error(`typert: package face "${key}" is already registered`);
				return {
					package: contribution.package,
					face,
					key,
					model: contribution.model
				};
			}
			validateSchemas(contribution) {
				const records = [];
				const batch = /* @__PURE__ */ new Set();
				for (const schema of contribution.schemas) {
					validateSegment("schema name", schema.name);
					const key = typertKey(contribution.package, schema.name);
					if (batch.has(key) || this.schemas.has(key)) throw new Error(`typert: schema "${key}" is already registered`);
					batch.add(key);
					records.push({
						...schema,
						package: contribution.package,
						face: contribution.face,
						key
					});
				}
				return records;
			}
		};
		function matches(record, filter) {
			return (filter.package === void 0 || record.package === filter.package) && (filter.face === void 0 || record.face === filter.face);
		}
		function validateInvocation(descriptor) {
			validateNonempty("invocation id", descriptor.id);
			validateSegment("invocation service key", descriptor.service);
			validateWireName("invocation namespace", descriptor.namespace);
			validateWireName("invocation method", descriptor.method);
			if (descriptor.implementation !== void 0) validateWireName("invocation implementation method", descriptor.implementation);
			validateCodec(descriptor.result, `${descriptor.id} result`);
			const wires = /* @__PURE__ */ new Set();
			for (const parameter of descriptor.parameters) {
				validateWireName("parameter name", parameter.name);
				validateWireName("parameter wire field", parameter.wire);
				if (wires.has(parameter.wire)) throw new Error(`typert: invocation "${descriptor.id}" repeats wire field "${parameter.wire}"`);
				wires.add(parameter.wire);
				if (parameter.source === "lookup") {
					if (parameter.acceptsUndefined !== void 0) throw new Error(`typert: invocation "${descriptor.id}" lookup parameter "${parameter.name}" cannot accept undefined`);
					if (parameter.lookup === void 0) throw new Error(`typert: invocation "${descriptor.id}" lookup parameter "${parameter.name}" has no lookup key`);
					validateSegment("lookup key", parameter.lookup);
				} else if (parameter.lookup !== void 0) throw new Error(`typert: invocation "${descriptor.id}" JSON parameter "${parameter.name}" declares a lookup key`);
				validateCodec(parameter.codec, `${descriptor.id} parameter ${parameter.name}`);
			}
			const cancellation = descriptor.cancellation;
			if (cancellation !== void 0 && cancellation.parameter !== "signal") throw new Error(`typert: invocation "${descriptor.id}" cancellation parameter must be "signal"`);
			if (descriptor.scope !== void 0) {
				if (descriptor.invocation.kind !== "direct") throw new Error(`typert: invocation "${descriptor.id}" Context receiver cannot declare a direct scope projection`);
				validateSegment("scope Context key", descriptor.scope.context);
				validateWireName("scope wire field", descriptor.scope.wire);
				const lookups = descriptor.parameters.filter((candidate) => candidate.source === "lookup");
				const parameter = lookups.length === 1 ? lookups[0] : void 0;
				if (parameter === void 0 || parameter.wire !== descriptor.scope.wire || parameter.lookup !== descriptor.scope.context) throw new Error(`typert: invocation "${descriptor.id}" scope wire "${descriptor.scope.wire}" must select its only lookup parameter`);
			}
			if (descriptor.invocation.kind === "context") {
				validateSegment("Context key", descriptor.invocation.context);
				validateWireName("Context wire field", descriptor.invocation.wire);
				if (wires.has(descriptor.invocation.wire)) throw new Error(`typert: invocation "${descriptor.id}" repeats wire field "${descriptor.invocation.wire}"`);
				validateCodec(descriptor.invocation.codec, `${descriptor.id} Context`);
			}
		}
		function validateCodec(codec, subject) {
			if (codec.mode === "src-json") return;
			validateNonempty(`${subject} type symbol`, codec.typeSymbol);
			if (typeof codec.schema.parse !== "function") throw new Error(`typert: ${subject} strict codec has no parse() method`);
		}
		function validateWireName(subject, value) {
			if (value === "." || value === ".." || !/^[A-Za-z0-9_$.-]+$/.test(value)) throw new Error(`typert: invalid ${subject} "${value}" — must contain only RPC endpoint segment characters`);
		}
		function validateSegment(subject, value) {
			if (value.length === 0 || value.includes("#")) throw new Error(`typert: invalid ${subject} "${value}" — must be nonempty and must not contain "#"`);
		}
		function validateNonempty(subject, value) {
			if (value.length === 0) throw new Error(`typert: invalid ${subject} — must be nonempty`);
		}
		//#endregion
		//#region lib/types/client/index.js
		/** Browser face of the shared Typert runtime registry. */
		/** Required services: none; this is the Client reflection root. */
		const inject = [];
		/**
		* Install the same registry implementation used by the Host face.
		* @param ctx - Client Cordis root.
		*/
		function apply(ctx) {
			new TypertRegistry(ctx);
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map