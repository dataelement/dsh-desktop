import z from "@deepseek-ai/schemastery";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { Context, Service } from "@deepseek-ai/cordis";
import { scopeOf } from "@deepseek-ai/dsh-scope";
import { assertSupportedJsonSchema, defineTool, validateJsonSchemaValue } from "@deepseek-ai/dsh-tools";
import { snapshotJsonValue } from "@deepseek-ai/dsh-util-values";
import { Script, createContext, runInContext } from "node:vm";
//#region lib/types/guard.js
/**
* The registration boundary between a sandboxed host half and the real runtime: ParameterSchemaSpec
* normalization + validation with teaching errors, the marker-guarded `harness.defineTool` /
* `harness.registerTool` pair, the `harness.handle` invoke-handler normalizer, the SANDBOX CONTEXT
* FAÇADE a running plugin's `apply` receives in place of the real `ctx`, and the plugin-shape
* helpers the run lifecycle narrows sandbox return values with. The façade is a whitelist of
* lifecycle-safe verbs and declared services; framework internals and context-valued service
* returns are denied.
*
* VM-realm schemas and canonical values are rebuilt as host objects, while rendered content and
* presentation metadata are shape-checked before entering the registry. Common JSON-Schema spellings are normalized when they
* have one meaning; invalid vocabulary fails during registration with a teaching error.
* @module @deepseek-ai/dsh-cordis-host-runner/guard
*/
const DYNAMIC_TOOL = Symbol("cordis-host-runner.dynamic-tool");
const SCHEMA_TYPES = new Set([
	"string",
	"number",
	"integer",
	"boolean",
	"null",
	"object",
	"array",
	"json"
]);
const VALID_TYPES = "'string' | 'number' | 'integer' | 'boolean' | 'null' | 'object' | 'array' | 'json'";
const ANNOTATION_KEYS = [
	"description",
	"title",
	"default",
	"examples"
];
function isPlainRecord(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === null || typeof prototype === "object" && Object.getPrototypeOf(prototype) === null && hasIntrinsicConstructor(prototype, "Object");
}
/** Whether a realm-owned intrinsic prototype is backed by its native constructor. */
function hasIntrinsicConstructor(prototype, name) {
	const constructor = Object.getOwnPropertyDescriptor(prototype, "constructor")?.value;
	if (typeof constructor !== "function") return false;
	try {
		return constructor.name === name && constructor.prototype === prototype && Function.prototype.toString.call(constructor) === `function ${name}() { [native code] }`;
	} catch {
		return false;
	}
}
/** Whether an array uses one realm's intrinsic Array prototype rather than a subclass. */
function hasPlainArrayPrototype(value) {
	const prototype = Object.getPrototypeOf(value);
	if (!Array.isArray(prototype) || !hasIntrinsicConstructor(prototype, "Array")) return false;
	const objectPrototype = Object.getPrototypeOf(prototype);
	return typeof objectPrototype === "object" && objectPrototype !== null && Object.getPrototypeOf(objectPrototype) === null && hasIntrinsicConstructor(objectPrototype, "Object");
}
/** Whether a schema list is a dense intrinsic array with no JSON-invisible decorations. */
function isDensePlainArray(value) {
	if (!Array.isArray(value) || !hasPlainArrayPrototype(value) || Reflect.ownKeys(value).length !== value.length + 1) return false;
	for (let index = 0; index < value.length; index++) if (!Object.hasOwn(value, index)) return false;
	return true;
}
/** Reject schema records whose declarations would disappear from object enumeration. */
function assertSchemaContainerKeys(value, path) {
	if (Reflect.ownKeys(value).some((key) => typeof key !== "string" || !Object.prototype.propertyIsEnumerable.call(value, key))) throw new Error(`harness.defineTool ${path} must contain only own enumerable string keys`);
}
/** Materialize realm-foreign lossless JSON without allowing JSON.stringify coercions; `path` carries the caller's own error prefix. */
function cloneJson(value, path) {
	const ancestors = /* @__PURE__ */ new Set();
	let root;
	const assign = (destination, item) => {
		if (destination.kind === "root") {
			root = item;
			return;
		}
		if (destination.kind === "array") {
			destination.target[destination.index] = item;
			return;
		}
		Object.defineProperty(destination.target, destination.key, {
			value: item,
			enumerable: true,
			configurable: true,
			writable: true
		});
	};
	const reject = (at) => {
		throw new Error(`${at} must be lossless JSON data (objects, arrays, strings, numbers, booleans, null) — not a class instance, function, Map/Set, Date, or undefined. Return a plain object built from the values you need, or \`return null\` when the caller needs no value back.`);
	};
	const tasks = [{
		kind: "visit",
		value,
		path,
		destination: { kind: "root" }
	}];
	for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
		if (task.kind === "leave") {
			ancestors.delete(task.source);
			continue;
		}
		if (task.kind === "array-item") {
			if (!Object.hasOwn(task.source, task.index)) reject(task.path);
			tasks.push({
				kind: "visit",
				value: task.source[task.index],
				path: `${task.path}[${task.index}]`,
				destination: {
					kind: "array",
					target: task.target,
					index: task.index
				}
			});
			continue;
		}
		const current = task.value;
		if (current === null || typeof current === "string" || typeof current === "boolean") {
			assign(task.destination, current);
			continue;
		}
		if (typeof current === "number") {
			if (!Number.isFinite(current) || Object.is(current, -0)) reject(task.path);
			assign(task.destination, current);
			continue;
		}
		if (typeof current !== "object" || ancestors.has(current)) reject(task.path);
		if (Array.isArray(current)) {
			if (!hasPlainArrayPrototype(current) || Reflect.ownKeys(current).length !== current.length + 1) reject(task.path);
			const output = [];
			assign(task.destination, output);
			ancestors.add(current);
			tasks.push({
				kind: "leave",
				source: current
			});
			for (let index = current.length - 1; index >= 0; index--) tasks.push({
				kind: "array-item",
				source: current,
				index,
				path: task.path,
				target: output
			});
			continue;
		}
		if (!isPlainRecord(current)) reject(task.path);
		const record = current;
		if (Reflect.ownKeys(record).some((key) => typeof key !== "string" || !Object.prototype.propertyIsEnumerable.call(record, key))) reject(task.path);
		const output = {};
		assign(task.destination, output);
		ancestors.add(record);
		tasks.push({
			kind: "leave",
			source: record
		});
		const entries = Object.entries(record);
		for (let index = entries.length - 1; index >= 0; index--) {
			const entry = entries[index];
			/* v8 ignore next -- the loop is bounded by the captured entry count. */
			if (entry === void 0) continue;
			tasks.push({
				kind: "visit",
				value: entry[1],
				path: `${task.path}.${entry[0]}`,
				destination: {
					kind: "object",
					target: output,
					key: entry[0]
				}
			});
		}
	}
	return root;
}
/** Copy and realm-materialize the shared annotation vocabulary. */
function copyAnnotations(value, output, path) {
	if (Object.hasOwn(value, "description")) output.description = value.description;
	if (Object.hasOwn(value, "title")) output.title = value.title;
	if (Object.hasOwn(value, "default")) output.default = cloneJson(value.default, `harness.defineTool ${path}.default`);
	if (Object.hasOwn(value, "examples")) output.examples = cloneJson(value.examples, `harness.defineTool ${path}.examples`);
}
/** Reject sandbox schema keys that the unified DSL would otherwise ignore. */
function assertSchemaKeys(value, path, allowed) {
	assertSchemaContainerKeys(value, path);
	for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`harness.defineTool ${path}.${key} is not supported by the unified schema DSL`);
}
/**
* Normalize a sandbox-provided `parameters` value into a fresh host-realm
* ParameterSchemaSpec. A raw JSON-Schema object wrapper retains its open root
* default, while the direct DSL is already an implicit open property map.
*/
function normalizeParameterSchemaSpec(value, path = "parameters") {
	if (!isPlainRecord(value)) throw new Error(`harness.defineTool ${path} must be a ParameterSchemaSpec object`);
	if (value.type === "object") {
		assertSchemaKeys(value, path, [
			"type",
			"properties",
			"required",
			"additionalProperties",
			...ANNOTATION_KEYS
		]);
		if (!isPlainRecord(value.properties)) throw new Error(`harness.defineTool ${path}.properties must be an object of schemas`);
		if (Object.hasOwn(value, "additionalProperties") && value.additionalProperties !== true) throw new Error(`harness.defineTool ${path}.additionalProperties must be true or omitted because the implicit parameter root is open`);
		if (Object.hasOwn(value, "required") && value.required === void 0) throw new Error(`harness.defineTool ${path}.required must be an array of declared property names`);
		const required = normalizeRequiredNames(value.required, value.properties, `${path}.required`);
		const rootAnnotations = {};
		copyAnnotations(value, rootAnnotations, path);
		return {
			spec: normalizePropertyMap(value.properties, path, required, true),
			...Object.keys(rootAnnotations).length === 0 ? {} : { rootAnnotations }
		};
	}
	return { spec: normalizePropertyMap(value, path, /* @__PURE__ */ new Set(), false) };
}
/** Validate raw required names and return their lookup set. */
function normalizeRequiredNames(value, properties, path) {
	if (value === void 0) return /* @__PURE__ */ new Set();
	if (!isDensePlainArray(value)) throw new Error(`harness.defineTool ${path} must be an array of declared property names`);
	const names = /* @__PURE__ */ new Set();
	for (let index = 0; index < value.length; index++) {
		const name = value[index];
		if (typeof name !== "string") throw new Error(`harness.defineTool ${path} must be an array of declared property names`);
		names.add(name);
		if (!Object.hasOwn(properties, name)) throw new Error(`harness.defineTool ${path} names undeclared property ${JSON.stringify(name)}`);
	}
	return names;
}
/** Install one normalized node without `__proto__` assignment semantics. */
function assignNormalizedValue(destination, value) {
	if (destination.kind === "property") Object.defineProperty(destination.target, destination.key, {
		value,
		enumerable: true,
		configurable: true,
		writable: true
	});
	else if (destination.kind === "item") destination.target.items = value;
	else destination.target[destination.index] = value;
}
/** Install one normalized property map at its root or containing object. */
function assignNormalizedMap(destination, value) {
	if (destination.kind === "root") destination.holder.value = value;
	else destination.target.properties = value;
}
/** Normalize one implicit property map and all descendants with explicit work frames. */
function normalizePropertyMap(entries, path, requiredNames, raw) {
	const holder = {};
	const ancestors = /* @__PURE__ */ new Set();
	const tasks = [{
		kind: "map",
		entries,
		path,
		requiredNames,
		raw,
		destination: {
			kind: "root",
			holder
		}
	}];
	for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
		if (task.kind === "leave") {
			ancestors.delete(task.value);
			continue;
		}
		if (task.kind === "map") {
			if (ancestors.has(task.entries)) throw new Error(`harness.defineTool ${task.path} is circular`);
			assertSchemaContainerKeys(task.entries, task.path);
			ancestors.add(task.entries);
			const spec = {};
			assignNormalizedMap(task.destination, spec);
			tasks.push({
				kind: "leave",
				value: task.entries
			});
			const mapEntries = Object.entries(task.entries);
			for (let index = mapEntries.length - 1; index >= 0; index--) {
				const entry = mapEntries[index];
				/* v8 ignore next -- the loop is bounded by the captured entry count. */
				if (entry === void 0) continue;
				tasks.push({
					kind: "value",
					value: entry[1],
					path: `${task.path}.${entry[0]}`,
					forceRequired: task.requiredNames.has(entry[0]),
					raw: task.raw,
					parameterProperty: true,
					destination: {
						kind: "property",
						target: spec,
						key: entry[0]
					}
				});
			}
			continue;
		}
		const { value, path } = task;
		if (!isPlainRecord(value)) throw new Error(`harness.defineTool ${path} must be a ParameterSchemaSpec property object`);
		assertSchemaContainerKeys(value, path);
		if (ancestors.has(value)) throw new Error(`harness.defineTool ${path} is circular`);
		ancestors.add(value);
		const requiredKey = task.parameterProperty && !task.raw ? ["required"] : [];
		if (task.parameterProperty && task.raw && Object.hasOwn(value, "required") && value.type !== "object") throw new Error(`harness.defineTool ${path}.required belongs to the containing raw object schema`);
		if (task.parameterProperty && !task.raw && Object.hasOwn(value, "required") && value.required !== true) throw new Error(`harness.defineTool ${path}.required must be true when present`);
		const prop = {};
		assignNormalizedValue(task.destination, prop);
		tasks.push({
			kind: "leave",
			value
		});
		if (task.forceRequired || value.required === true) prop.required = true;
		copyAnnotations(value, prop, path);
		if (Object.hasOwn(value, "oneOf")) {
			assertSchemaKeys(value, path, [
				"oneOf",
				...requiredKey,
				...ANNOTATION_KEYS
			]);
			if (!isDensePlainArray(value.oneOf) || value.oneOf.length < 2) throw new Error(`harness.defineTool ${path}.oneOf must contain at least two schemas`);
			const oneOf = [];
			prop.oneOf = oneOf;
			for (let index = value.oneOf.length - 1; index >= 0; index--) tasks.push({
				kind: "value",
				value: value.oneOf[index],
				path: `${path}.oneOf[${index}]`,
				forceRequired: false,
				raw: task.raw,
				parameterProperty: false,
				destination: {
					kind: "one-of",
					target: oneOf,
					index
				}
			});
			continue;
		}
		if (task.raw && !Object.hasOwn(value, "type")) {
			assertSchemaKeys(value, path, ANNOTATION_KEYS);
			prop.type = "json";
			continue;
		}
		if (!SCHEMA_TYPES.has(value.type) || task.raw && value.type === "json") throw new Error(`harness.defineTool ${path} must declare a valid type: ${VALID_TYPES} (got ${JSON.stringify(value.type)})`);
		const type = value.type;
		prop.type = type;
		switch (type) {
			case "object":
				assertSchemaKeys(value, path, [
					"type",
					"properties",
					"additionalProperties",
					...requiredKey,
					...task.raw ? ["required"] : [],
					...ANNOTATION_KEYS
				]);
				if (!task.raw && (!Object.hasOwn(value, "additionalProperties") || typeof value.additionalProperties !== "boolean")) throw new Error(`harness.defineTool ${path}.additionalProperties must be explicitly true or false`);
				if (task.raw && Object.hasOwn(value, "additionalProperties") && typeof value.additionalProperties !== "boolean") throw new Error(`harness.defineTool ${path}.additionalProperties must be a boolean`);
				if (task.raw && Object.hasOwn(value, "required") && value.required === void 0) throw new Error(`harness.defineTool ${path}.required must be an array of declared property names`);
				prop.additionalProperties = task.raw ? value.additionalProperties ?? true : value.additionalProperties;
				if (Object.hasOwn(value, "properties")) {
					const properties = value.properties;
					if (!isPlainRecord(properties)) throw new Error(`harness.defineTool ${path}.properties must be an object of schemas`);
					const nestedRequired = task.raw ? normalizeRequiredNames(value.required, properties, `${path}.required`) : /* @__PURE__ */ new Set();
					tasks.push({
						kind: "map",
						entries: properties,
						path: `${path}.properties`,
						requiredNames: nestedRequired,
						raw: task.raw,
						destination: {
							kind: "properties",
							target: prop
						}
					});
				} else if (task.raw && value.required !== void 0) normalizeRequiredNames(value.required, {}, `${path}.required`);
				break;
			case "array":
				assertSchemaKeys(value, path, [
					"type",
					"items",
					...requiredKey,
					...ANNOTATION_KEYS
				]);
				if (Object.hasOwn(value, "items")) tasks.push({
					kind: "value",
					value: value.items,
					path: `${path}.items`,
					forceRequired: false,
					raw: task.raw,
					parameterProperty: false,
					destination: {
						kind: "item",
						target: prop
					}
				});
				break;
			case "string":
			case "number":
			case "integer":
			case "boolean":
			case "null":
				assertSchemaKeys(value, path, [
					"type",
					"enum",
					"const",
					...requiredKey,
					...ANNOTATION_KEYS
				]);
				if (Object.hasOwn(value, "enum")) {
					if (!isDensePlainArray(value.enum) || value.enum.length === 0) throw new Error(`harness.defineTool ${path}.enum must be a non-empty array`);
					prop.enum = cloneJson(value.enum, `harness.defineTool ${path}.enum`);
				}
				if (Object.hasOwn(value, "const")) prop.const = cloneJson(value.const, `harness.defineTool ${path}.const`);
				break;
			case "json":
				assertSchemaKeys(value, path, [
					"type",
					...requiredKey,
					...ANNOTATION_KEYS
				]);
				break;
			/* v8 ignore next 2 -- SCHEMA_TYPES narrows this closed switch before dispatch. */
			default: throw new Error(`harness.defineTool ${path} must declare a valid type: ${VALID_TYPES}`);
		}
	}
	/* v8 ignore next -- the root map task assigns before scheduling descendants. */
	return holder.value ?? {};
}
function markDynamicTool(tool) {
	Object.defineProperty(tool, DYNAMIC_TOOL, { value: true });
	return tool;
}
function assertDynamicTool(tool) {
	if (!isPlainRecord(tool) || tool[DYNAMIC_TOOL] !== true) throw new Error("dynamic tool registration must use a tool returned by harness.defineTool(...)");
}
/**
* Structurally a content block, checked AFTER the JSON round-trip: a plain
* object carrying a string `type` tag. Deliberately nothing deeper — the
* ContentBlock union is merge-extensible (an unknown tag must pass), and every
* downstream consumer dispatches on `type` and falls through unknowns.
*/
function isContentBlockShape(value) {
	return isPlainRecord(value) && typeof value.type === "string";
}
/**
* How much of an invalid execute return the teaching error echoes back — a
* huge blob would burn the model turn the error is trying to save.
*/
const RETURN_PREVIEW_LIMIT = 120;
/**
* Compact JSON preview of an invalid execute return for the teaching error
* (`String(…)` for the un-stringifiable undefined case), truncated to
* {@link RETURN_PREVIEW_LIMIT}.
*/
function describeReturn(value) {
	const json = JSON.stringify(value);
	return json.length > RETURN_PREVIEW_LIMIT ? `${json.slice(0, RETURN_PREVIEW_LIMIT)}…` : json;
}
/**
* Validate and host-materialize a sandbox renderer's content blocks.
*/
function assertRenderedContent(value) {
	if (Array.isArray(value) && value.every(isContentBlockShape)) return value;
	throw new Error(`output.render returned ${describeReturn(value)} — it must return an ARRAY of content blocks:\n  ✓ return [{ type: 'text', text: String(value) }]`);
}
/**
* The `harness.defineTool` handed into the sandbox: the real DSL, with `parameters` normalized
* into a fresh host-realm ParameterSchemaSpec (raw object wrappers unwrapped,
* required arrays mapped, and explicit DSL object openness enforced) and the tool's `execute` return normalized into the host realm
* via a JSON round-trip. Non-JSON or wrong-shape output fails that call instead of poisoning
* the session log.
* @param options - the standard `defineTool` options; `parameters` may be the ParameterSchemaSpec DSL or a JSON-Schema-style wrapper.
* @returns the marker-tagged definition `harness.registerTool` (and the guarded `ctx.tools.register`) accepts.
*/
function sandboxDefineTool(options) {
	if (!isPlainRecord(options)) throw new Error("harness.defineTool options must be an object");
	const normalized = normalizeParameterSchemaSpec(options.parameters);
	if (!isPlainRecord(options.output)) throw new Error("harness.defineTool output must declare { schema, render, presentationMeta? }");
	const output = options.output;
	if (typeof output.render !== "function") throw new Error("harness.defineTool output.render must be a function");
	if (output.presentationMeta !== void 0 && typeof output.presentationMeta !== "function") throw new Error("harness.defineTool output.presentationMeta must be a function when present");
	if (typeof options.execute !== "function") throw new Error("harness.defineTool execute must be a function");
	const schema = cloneJson(output.schema, "harness.defineTool output.schema");
	const rawExecute = options.execute;
	const rawRender = output.render;
	const rawPresentationMeta = output.presentationMeta;
	const tool = defineTool({
		...options,
		parameters: normalized.spec,
		output: {
			schema,
			render(args, value) {
				return assertRenderedContent(cloneJson(rawRender(args, value), "harness.defineTool output.render result"));
			},
			...rawPresentationMeta !== void 0 ? { presentationMeta(args, value) {
				return cloneJson(rawPresentationMeta(args, value), "harness.defineTool output.presentationMeta result");
			} } : {}
		},
		async execute(args, exec) {
			return cloneJson(await rawExecute(args, exec), "harness.defineTool execute result");
		}
	});
	const parameters = {
		...tool.parameters,
		...normalized.rootAnnotations
	};
	assertSupportedJsonSchema(parameters);
	return markDynamicTool({
		...tool,
		parameters
	});
}
/**
* Normalize one `harness.handle` registration at the sandbox boundary: the
* method name must be a non-empty string and the handler a function whose
* result is host-materialized through the same cross-realm JSON clone as tool
* `execute` returns (a VM-realm object would otherwise escape the wire's
* plain-object contract).
* @param method - handler name the package's browser half calls through `host.call`.
* @param fn - sandbox handler receiving the wire-decoded JSON arguments.
* @returns the validated name and the clone-wrapped handler.
*/
function normalizeHandler(method, fn) {
	if (typeof method !== "string" || method.length === 0) throw new Error("harness.handle(method, fn) needs a non-empty string method name");
	if (typeof fn !== "function") throw new Error(`harness.handle("${method}") needs a handler function as its second argument`);
	const rawHandler = fn;
	return {
		method,
		handler: async (args) => cloneJson(await rawHandler(args), `harness.handle("${method}") result`)
	};
}
/**
* The `harness.registerTool` handed into the sandbox: registers a
* marker-verified dynamic tool on the given context's registry.
* @param ctx - the (guarded) context whose `tools` service receives the tool.
* @param tool - a definition produced by {@link sandboxDefineTool}; anything else is rejected.
* @returns the registry disposer for the registration.
*/
function sandboxRegisterTool(ctx, tool) {
	assertDynamicTool(tool);
	return ctx.tools.register(tool);
}
/**
* The verbs a running host half may reach through the sandbox `ctx` façade, beyond its injected
* services. `on`/`once` observe events, `provide` exposes a service to other packages, and the
* timer helpers schedule work — each a fiber effect that unwinds when the package stops.
*/
const CTX_VERBS = new Set([
	"effect",
	"on",
	"once",
	"provide",
	"timeout",
	"interval",
	"setTimeout",
	"setInterval",
	"throttle",
	"debounce"
]);
const TIMER_VERBS = new Set([
	"timeout",
	"interval",
	"setTimeout",
	"setInterval",
	"throttle",
	"debounce"
]);
/**
* The tool-registry façade: `register` (marker-guarded) plus READ-ONLY
* metadata (`schemas`, and `get` returning a schema view, never the live
* `ToolDefinition`). Exposing the raw definition would hand package code the
* tool's `execute` function, letting it call another tool directly and bypass
* `ToolRuntime.execute` — identity protection, pre-policy, monotonic guards,
* around dispatch, post-policy, final observation, and result normalization. So `get` returns the same
* name/description/parameters view as `schemas()`, and nothing invocable.
*/
function sandboxTools(ctx) {
	return {
		register: (tool) => sandboxRegisterTool(ctx, tool),
		schemas: () => ctx.tools.schemas(scopeOf(ctx)),
		get: (name) => ctx.tools.schemas(scopeOf(ctx)).find((schema) => schema.name === name)
	};
}
/**
* Reject any injected-service return that is a cordis `Context`. Harness
* services return data, never a context; a value that is one would be a
* fresh, unguarded handle back into the runtime — the exact escape the façade
* exists to close — so it fails loud instead of reaching sandbox code.
*/
function denyContext(value, service, reportFailure) {
	if (value instanceof Context) return rejectGuard(reportFailure, `service "${service}" returned a cordis Context, which the sandbox does not expose. Operate through your own plugin ctx (ctx.on / ctx.provide / ctx.tools.register) and the services you inject — never another context.`);
	return value;
}
/**
* Wrap an injected service so its methods forward to the real instance but
* their return values pass through {@link denyContext}. Non-function members
* (plain data) pass through as-is; a returned Promise is guarded on resolve.
*/
function guardedService(service, name, reportFailure) {
	return new Proxy(service, { get(target, prop) {
		const value = Reflect.get(target, prop, target);
		if (typeof value !== "function") return denyContext(value, name, reportFailure);
		return (...args) => {
			const result = Reflect.apply(value, target, args);
			if (result instanceof Promise) return result.then((v) => denyContext(v, name, reportFailure));
			return denyContext(result, name, reportFailure);
		};
	} });
}
/**
* The service names a plugin declared in `inject`, as a lookup set. Whatever
* declaration style the plugin used — an `inject: ['bash', 'tools']` array or
* the `{ required, optional }` object form — cordis resolves it into a single
* name-keyed map on the fiber before `apply` runs (`{ bash: null, tools: null }`),
* so the gate just reads that map's keys. A host half may reach only the services
* it declared — that is what lets cordis park it when a declared provider
* goes away.
*/
function declaredInjects(ctx) {
	return new Set(Object.keys(ctx.fiber.inject));
}
/**
* Whitelist context for running host halves: lifecycle-safe verbs, guarded
* tools, optional `ctx.get()` lookup, and declared-service property access.
* Framework plumbing is denied, and service methods cannot return a Context.
*/
function sandboxContext(ctx, reportFailure) {
	const tools = sandboxTools(ctx);
	const declared = declaredInjects(ctx);
	const denyRead = (prop) => {
		if (ctx.get(prop) !== void 0) return rejectGuard(reportFailure, `service "${prop}" is not injected. Declare it: inject: ['${prop}', …] on your plugin, so cordis parks this dynamic package if the provider later goes away.`);
		return rejectGuard(reportFailure, `sandbox ctx does not expose "${prop}". Available: ctx.tools.register / ctx.on / ctx.provide / the timer helpers after injecting timer, and any service you declared in inject. Framework internals (root, fiber, registry, extend, plugin, …) are withheld by design.`);
	};
	const readService = (name, requireDeclaration) => {
		if (name === "tools") return tools;
		if (requireDeclaration && !declared.has(name)) return denyRead(name);
		const service = denyContext(ctx.get(name), name, reportFailure);
		if (service === null || typeof service !== "object" && typeof service !== "function") return service;
		return guardedService(service, name, reportFailure);
	};
	const get = (name) => readService(name, false);
	return new Proxy({}, {
		get(_target, prop) {
			if (prop === "tools") return tools;
			if (prop === "get") return get;
			if (typeof prop !== "string") return void 0;
			if (CTX_VERBS.has(prop)) return (...args) => {
				if (TIMER_VERBS.has(prop) && !declared.has("timer")) return denyRead("timer");
				const method = ctx[prop];
				return Reflect.apply(method, ctx, args);
			};
			return readService(prop, true);
		},
		set(_target, prop) {
			return rejectGuard(reportFailure, `sandbox ctx is read-only; cannot assign "${String(prop)}"`);
		},
		has: (_target, prop) => prop === "tools" || prop === "get" || typeof prop === "string" && (CTX_VERBS.has(prop) && (!TIMER_VERBS.has(prop) || declared.has("timer")) || declared.has(prop))
	});
}
/**
* Narrow an arbitrary sandbox return value to a runnable cordis plugin: a
* function, or an object with an `apply` function. (A bare function passes the
* first arm, so the object arm never sees `Function.prototype.apply`.)
* @param value - whatever the host half returned.
* @returns whether the value can be started via `ctx.plugin`.
*/
function isPlugin(value) {
	if (typeof value === "function") return true;
	return typeof value === "object" && value !== null && typeof value.apply === "function";
}
/**
* Wrap a plugin so `apply` receives the sandbox context while preserving injection metadata.
* @param plugin - the plugin the host half returned.
* @param reportFailure - reports a guard rejection to the owning Agent.
* @returns an equivalent plugin whose `apply` sees the sandbox context façade.
*/
function guardedPlugin(plugin, reportFailure) {
	if (typeof plugin === "function") {
		const functionPlugin = plugin;
		return {
			name: pluginName(plugin),
			apply(ctx, config) {
				return functionPlugin(sandboxContext(ctx, reportFailure), config);
			}
		};
	}
	const objectPlugin = plugin;
	return {
		...plugin,
		apply(ctx, config) {
			return objectPlugin.apply(sandboxContext(ctx, reportFailure), config);
		}
	};
}
function rejectGuard(reportFailure, message) {
	const error = new Error(message);
	reportFailure(error);
	throw error;
}
/**
* Display name for a running plugin: its `name` property, else anonymous.
* @param plugin - the plugin the host half returned.
* @returns the human-readable name used in run results and inspect output.
*/
function pluginName(plugin) {
	const named = plugin.name;
	if (typeof named === "string" && named.length > 0) return named;
	return "<anonymous>";
}
//#endregion
//#region lib/types/inspect-registry.js
/** Host registry for model-visible, read-only Cordis capability queries. */
/** Registry and cross-page router behind the two model-facing inspect tools. */
var CordisInspectRegistryService = class extends Service {
	providers = /* @__PURE__ */ new Map();
	pending = /* @__PURE__ */ new Map();
	clientManifest;
	nextRequest = 1;
	/** Register the process-global Host registry. */
	constructor(ctx) {
		super(ctx, "cordisInspect");
	}
	/**
	* Register one Host provider.
	* @param registration - manifest and local query handler.
	* @returns idempotent disposer.
	*/
	register(registration) {
		const manifest = validateManifest(registration.manifest);
		if (this.providers.has(manifest.id)) throw new Error(`Host Cordis inspect provider "${manifest.id}" is already registered`);
		const stored = {
			...registration,
			manifest
		};
		this.providers.set(manifest.id, stored);
		return () => {
			if (this.providers.get(manifest.id) === stored) this.providers.delete(manifest.id);
		};
	}
	/**
	* Replace the mirrored Client provider directory.
	* @param providers - complete Client manifest snapshot.
	*/
	syncClientManifest(providers) {
		const ids = /* @__PURE__ */ new Set();
		const validated = providers.map((provider) => {
			const manifest = validateManifest(provider);
			if (ids.has(manifest.id)) throw new Error(`Client Cordis inspect manifest repeats provider "${manifest.id}"`);
			ids.add(manifest.id);
			return manifest;
		});
		this.clientManifest = Object.freeze(validated);
	}
	/**
	* Return the complete known Host and Client provider directory.
	* @returns Host providers followed by the Client providers.
	*/
	list() {
		return [...[...this.providers.values()].map((provider) => view("host", provider.manifest)), ...(this.clientManifest ?? []).map((provider) => view("client", provider))];
	}
	/**
	* Execute one provider query on its owning platform.
	* @param platform - Host or Client runtime.
	* @param providerId - provider selected from {@link list}.
	* @param methodName - declared method name.
	* @param input - optional lossless JSON input.
	* @param agent - requesting Agent and scope.
	* @param signal - tool-call cancellation.
	* @returns provider JSON data.
	*/
	async query(platform, providerId, methodName, input, agent, signal) {
		if (platform === "host") {
			const registration = this.providers.get(providerId);
			if (registration === void 0) throw new Error(`Host Cordis inspect provider "${providerId}" is not registered`);
			const method = findMethod(registration.manifest, methodName);
			validateInput("Host", providerId, method, input);
			signal.throwIfAborted();
			const data = await registration.query(methodName, input, {
				agent,
				signal
			});
			signal.throwIfAborted();
			return validateOutput("Host", providerId, method, data);
		}
		return await this.queryClient(providerId, methodName, input, agent, signal);
	}
	/**
	* Accept the first valid Client response for a pending query.
	* @param agent - Agent whose Session owns the query.
	* @param requestId - Pending Client query identity.
	* @param resolution - Client provider result or failure.
	* @returns whether this response settled the still-pending query.
	*/
	resolveClientQuery(agent, requestId, resolution) {
		const pending = this.pending.get(requestId);
		if (pending === void 0 || pending.request.agentId !== agent.id) return { accepted: false };
		if (!resolution.ok) return { accepted: false };
		try {
			resolution = {
				ok: true,
				data: validateOutput("Client", pending.request.provider, pending.method, resolution.data)
			};
		} catch {
			return { accepted: false };
		}
		this.pending.delete(requestId);
		pending.settle(resolution);
		this.ctx.emit("cordis/inspect-query-resolved", { requestId });
		return { accepted: true };
	}
	async queryClient(providerId, methodName, input, agent, signal) {
		const provider = this.clientManifest?.find((candidate) => candidate.id === providerId);
		if (provider === void 0) throw new Error(`Client Cordis inspect provider "${providerId}" is not registered`);
		const method = findMethod(provider, methodName);
		validateInput("Client", providerId, method, input);
		signal.throwIfAborted();
		const requestId = `inspect-${this.nextRequest++}`;
		const request = {
			requestId,
			agentId: agent.id,
			provider: providerId,
			method: methodName,
			...input === void 0 ? {} : { input }
		};
		const result = new Promise((resolve) => {
			this.pending.set(requestId, {
				request,
				method,
				settle: resolve
			});
		});
		const onAbort = () => {
			const pending = this.pending.get(requestId);
			if (pending === void 0) return;
			this.pending.delete(requestId);
			pending.settle({
				ok: false,
				reason: "cancelled",
				message: `Client inspect query ${providerId}.${methodName} was cancelled`
			});
			this.ctx.emit("cordis/inspect-query-resolved", { requestId });
		};
		signal.addEventListener("abort", onAbort, { once: true });
		if (signal.aborted) onAbort();
		else this.ctx.emit("cordis/inspect-query", request);
		try {
			const resolution = await result;
			if (!resolution.ok) throw new Error(`${providerId}.${methodName}: ${resolution.message}`);
			return resolution.data;
		} finally {
			signal.removeEventListener("abort", onAbort);
		}
	}
};
function view(platform, manifest) {
	return {
		platform,
		...manifest,
		methods: [...manifest.methods]
	};
}
function validateManifest(manifest) {
	if (manifest.id.trim() === "") throw new Error("Cordis inspect provider id must not be empty");
	if (manifest.description.trim() === "") throw new Error(`Cordis inspect provider "${manifest.id}" needs a description`);
	const names = /* @__PURE__ */ new Set();
	const methods = manifest.methods.map((method) => {
		if (method.name.trim() === "") throw new Error(`Cordis inspect provider "${manifest.id}" has an empty method name`);
		if (names.has(method.name)) throw new Error(`Cordis inspect provider "${manifest.id}" repeats method "${method.name}"`);
		if (method.description.trim() === "") throw new Error(`Cordis inspect method ${manifest.id}.${method.name} needs a description`);
		assertSupportedJsonSchema(method.inputSchema);
		assertSupportedJsonSchema(method.outputSchema);
		names.add(method.name);
		return Object.freeze({ ...method });
	});
	return Object.freeze({
		...manifest,
		methods: Object.freeze(methods)
	});
}
function findMethod(manifest, name) {
	const method = manifest.methods.find((candidate) => candidate.name === name);
	if (method === void 0) throw new Error(`Cordis inspect provider "${manifest.id}" has no method "${name}"`);
	return method;
}
function validateInput(platform, provider, method, input) {
	const violations = validateJsonSchemaValue(method.inputSchema, input ?? {}, "input");
	if (violations.length > 0) throw new Error(`${platform} Cordis inspect ${provider}.${method.name} rejected input: ${violations.join("; ")}`);
}
function validateOutput(platform, provider, method, data) {
	const snapshot = snapshotJsonValue(data);
	if (snapshot === void 0) throw new Error(`${platform} Cordis inspect ${provider}.${method.name} returned a non-JSON value`);
	const violations = validateJsonSchemaValue(method.outputSchema, snapshot, "output");
	if (violations.length > 0) throw new Error(`${platform} Cordis inspect ${provider}.${method.name} returned invalid output: ${violations.join("; ")}`);
	return snapshot;
}
//#endregion
//#region lib/types/lifecycle.js
/**
* Host-half fiber lifecycle over the `cordis-dynamic` group: settle a
* sandbox-produced plugin as a child fiber (never leaving a failed fiber
* mounted), and report the services a settled-but-pending fiber still waits
* for. Stopping needs no helper — a host half unwinds through an ordinary
* awaited `fiber.dispose()`, because everything the plugin registered is an
* effect on its fiber.
* @module @deepseek-ai/dsh-cordis-host-runner/lifecycle
*/
/**
* Await the group, start and settle one guarded child, and dispose it before rethrowing any
* startup failure so a failed run never lingers. A valid unresolved inject may remain pending.
* @param group - the `cordis-dynamic` group fiber every host half hangs under.
* @param plugin - the plugin the sandbox returned; wrapped with the registration guard before starting.
* @param reportGuardFailure - reports post-activation Host guard rejections to the owning Agent.
* @returns the settled child fiber (possibly pending on unsatisfied `inject`).
*/
async function startHostHalf(group, plugin, reportGuardFailure) {
	await group.await();
	const fiber = group.ctx.plugin(guardedPlugin(plugin, reportGuardFailure));
	try {
		await fiber.await();
	} catch (error) {
		await fiber.dispose();
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes("already registered")) throw new Error(`${message} — to REPLACE something an earlier dynamic package registered, first cordis_stop that package's id (find it with cordis_runtime_inspect what:"temporary"), then run the new version.`);
		throw error instanceof Error ? error : new Error(message);
	}
	return fiber;
}
/**
* The services a fiber declared in `inject` that do not exist yet — a settled
* fiber that is not active is waiting on exactly these (legal cordis
* semantics: it activates when the service appears).
* @param ctx - the context to resolve service existence against.
* @param fiber - the host-half fiber whose `inject` declarations are checked.
* @returns the missing service names, in declaration order.
*/
function missingServices(ctx, fiber) {
	return Object.keys(fiber.inject).filter((service) => ctx.get(service) === void 0);
}
//#endregion
//#region lib/types/registry.js
/**
* Process-local dynamic Plugin registry and its opaque identity mints.
* @module @deepseek-ai/dsh-cordis-host-runner/registry
*/
/** Registry, identity mints, and pending approval index. */
var DynamicCordisRegistry = class {
	plugins = /* @__PURE__ */ new Map();
	pendingRequests = /* @__PURE__ */ new Map();
	nextPlugin = 1;
	nextPackage = 1;
	nextRun = 1;
	nextApproval = 1;
	/**
	* Mint a semantic plugin ID without reusing a prior suffix.
	* @param prefix - validated lowercase semantic prefix proposed by the model.
	* @returns a process-unique Plugin ID.
	*/
	mintPluginId(prefix) {
		let id;
		do
			id = `${prefix}-${this.nextPlugin++}`;
		while (this.plugins.has(id));
		return id;
	}
	/**
	* Mint an immutable package ID.
	* @returns a process-unique Package ID.
	*/
	mintPackageId() {
		return `pkg-${this.nextPackage++}`;
	}
	/**
	* Mint an activation ID.
	* @returns a process-unique Plugin Run ID.
	*/
	mintPluginRunId() {
		return `run-${this.nextRun++}`;
	}
	/**
	* Mint an approval ID.
	* @returns a process-unique approval request ID.
	*/
	mintApprovalRequestId() {
		return `approval-${this.nextApproval++}`;
	}
	/**
	* Add one stable plugin.
	* @param plugin - Plugin record to retain under its stable ID.
	*/
	add(plugin) {
		this.plugins.set(plugin.pluginId, plugin);
	}
	/**
	* Read one plugin.
	* @param id - stable Plugin ID.
	* @returns the Plugin record, or `undefined` when absent.
	*/
	get(id) {
		return this.plugins.get(id);
	}
	/**
	* Delete one plugin and all package versions.
	* @param id - stable Plugin ID to remove.
	* @returns whether a Plugin record was removed.
	*/
	delete(id) {
		return this.plugins.delete(id);
	}
	/**
	* Read all plugins in creation order.
	* @returns a snapshot of every Plugin record.
	*/
	all() {
		return [...this.plugins.values()];
	}
	/**
	* Read one session's plugins in creation order.
	* @param sessionId - owning session to filter by.
	* @returns a snapshot of matching Plugin records.
	*/
	ofSession(sessionId) {
		return this.all().filter((plugin) => plugin.sessionId === sessionId);
	}
	/**
	* Publish one pending approval.
	* @param id - approval request ID.
	* @param pending - resolver and Plugin metadata retained until settlement.
	*/
	armRequest(id, pending) {
		this.pendingRequests.set(id, pending);
	}
	/**
	* Read one pending approval without claiming it.
	* @param id - approval request ID.
	* @returns the pending request, or `undefined` when absent.
	*/
	peekRequest(id) {
		return this.pendingRequests.get(id);
	}
	/**
	* Claim one pending approval; first answer wins.
	* @param id - approval request ID.
	* @returns the claimed request, or `undefined` when already settled.
	*/
	claimRequest(id) {
		const pending = this.pendingRequests.get(id);
		if (pending !== void 0) this.pendingRequests.delete(id);
		return pending;
	}
	/**
	* Cancel one pending approval.
	* @param id - approval request ID to remove.
	*/
	disarmRequest(id) {
		this.pendingRequests.delete(id);
	}
	/**
	* Find a pending approval for one Plugin.
	* @param pluginId - stable Plugin ID.
	* @returns its approval request ID, or `undefined` when none is pending.
	*/
	pendingRequestFor(pluginId) {
		for (const [requestId, request] of this.pendingRequests) if (request.pluginId === pluginId) return requestId;
	}
};
//#endregion
//#region lib/types/sandbox.js
/**
* The `node:vm` sandbox a dynamic package's HOST half evaluates in: a fresh realm whose globals
* are a tagged write-through console, the `harness` registration helpers, the encoding primitives
* a bare vm context lacks, and callable traps over the Node APIs the sandbox deliberately
* withholds. Traps steer filesystem, network, process, and timer work to `ctx.fs`, `ctx.web`,
* `ctx.bash`, and Cordis timers. This keeps cooperative packages inspectable and disposable but
* is not containment: host-realm helper functions remain an escape route.
*
* The browser half never reaches this module — it is evaluated by the client-side runner in a
* closure, with its own facade.
* @module @deepseek-ai/dsh-cordis-host-runner/sandbox
*/
/** Exact Host closure symbols exposed by the sandbox and guarded Context. */
const HOST_BUILTIN_INSPECTION = [
	{
		name: "ctx",
		description: "Restricted Cordis Context. Prefer ctx.get(name) with an undefined check; use inject for hard dependencies.",
		signatures: [
			"ctx.get(name: string): unknown | undefined",
			"ctx.on(name: string, listener: Function): () => void",
			"ctx.provide(name: string, value: unknown): () => void",
			"ctx.effect(callback: Function, label?: string): () => void"
		]
	},
	{
		name: "harness",
		description: "Host helpers for Package-private Client RPC and model-visible dynamic Tools.",
		signatures: [
			"harness.handle(method: string, handler: (args: JsonValue) => JsonValue | Promise<JsonValue>): () => void",
			"harness.defineTool(definition: ToolDefinition): ToolDefinition",
			"harness.registerTool(ctx: Context, tool: ToolDefinition): () => void"
		]
	},
	{
		name: "console",
		description: "Package-tagged Host logging.",
		signatures: ["console.log(...values): void", "console.error(...values): void"]
	},
	{
		name: "btoa",
		description: "Encode UTF-8 text as base64.",
		signatures: ["btoa(value: string): string"]
	},
	{
		name: "atob",
		description: "Decode base64 as UTF-8 text.",
		signatures: ["atob(value: string): string"]
	},
	{
		name: "TextEncoder",
		description: "Standard UTF-8 encoder constructor.",
		signatures: ["new TextEncoder()"]
	},
	{
		name: "TextDecoder",
		description: "Standard text decoder constructor.",
		signatures: ["new TextDecoder(label?: string)"]
	}
];
/**
* A write-through console for one package, tagging every line with the package
* id. Write-through (host stdout/stderr), NOT buffered into the tool result:
* a registered listener fires long after the run call returned, and its output
* must land somewhere the user can see — for a terminal entry point, the host terminal.
*/
function taggedConsole(id) {
	const tag = `[cordis:${id}]`;
	const log = (...args) => {
		console.log(tag, ...args);
	};
	const error = (...args) => {
		console.error(tag, ...args);
	};
	return {
		log,
		info: log,
		warn: log,
		debug: log,
		error
	};
}
/**
* Patch only VM constructors so `instanceof` accepts both VM values and host values passed as
* arguments, events, or service results; host intrinsics remain untouched.
*/
const DUAL_REALM_INSTANCEOF_PRELUDE = `
(hostIntrinsics) => {
  'use strict'
  const ordinary = Function.prototype[Symbol.hasInstance]
  for (const name of Object.keys(hostIntrinsics)) {
    const VmCtor = globalThis[name]
    const HostCtor = hostIntrinsics[name]
    if (typeof VmCtor !== 'function' || typeof HostCtor !== 'function') continue
    Object.defineProperty(VmCtor, Symbol.hasInstance, {
      value: (instance) => ordinary.call(VmCtor, instance) || ordinary.call(HostCtor, instance),
      configurable: true,
    })
  }
}
`;
/** Run {@link DUAL_REALM_INSTANCEOF_PRELUDE} in a freshly created sandbox, handing it the host intrinsics to pair up. */
function patchDualRealmInstanceof(sandbox) {
	runInContext(DUAL_REALM_INSTANCEOF_PRELUDE, sandbox)({
		Object,
		Array,
		Function,
		Error,
		TypeError,
		RangeError,
		SyntaxError,
		Promise,
		RegExp,
		Date,
		Map,
		Set
	});
}
const TIMER_REDIRECT = "Node timers are unavailable. Use the cordis timer service instead: declare inject: ['timer'] on your plugin and call ctx.timeout / ctx.interval after querying Host Service.listService for the exact overloads. Those calls are fiber effects, cleaned up automatically when stopped.";
/**
* The callable Node APIs the sandbox deliberately disables, each mapped to the
* cordis alternative its trap error names. Only function-valued globals are
* trapped; a data-valued global such as `process` stays `undefined`, because a
* throwing accessor would detonate the common `typeof process` feature probe
* at resolution time.
*/
const NODE_API_REDIRECTS = {
	require: "Node modules are unavailable. Use the cordis services on ctx instead — e.g. inject: ['fs'] for files, ['web'] for HTTP, ['bash'] for processes; query Service.listService with cordis_inspect_query first.",
	setTimeout: TIMER_REDIRECT,
	setInterval: TIMER_REDIRECT,
	setImmediate: TIMER_REDIRECT,
	clearTimeout: TIMER_REDIRECT,
	clearInterval: TIMER_REDIRECT,
	fetch: "Network access goes through the cordis web service: declare inject: ['web'] and call ctx.web (query Host Service.listService with cordis_inspect_query for its methods)."
};
/** Build the trap functions for {@link NODE_API_REDIRECTS}: calling one throws the redirect. */
function nodeApiTraps() {
	const traps = {};
	for (const [name, redirect] of Object.entries(NODE_API_REDIRECTS)) traps[name] = () => {
		throw new Error(`${name} is not available in the dynamic package sandbox — ${redirect}`);
	};
	return traps;
}
/**
* Build the vm context one host half evaluates in: the tagged console, the
* `harness` registration helpers, the encoding primitives, the Node-API traps,
* and the dual-realm `instanceof` patch, already `createContext`-ed.
* @param id - the package id (`dyn-<n>`), used as the console tag and filename stem.
* @param harnessExtras - per-package `harness` verbs beyond the registration pair (`handle`).
* @returns the contextified sandbox object to pass to {@link evaluateHostCode}.
*/
function createSandbox(id, harnessExtras = {}) {
	const sandbox = {
		...nodeApiTraps(),
		console: taggedConsole(id),
		harness: {
			defineTool: sandboxDefineTool,
			registerTool: sandboxRegisterTool,
			...harnessExtras
		},
		btoa: (s) => Buffer.from(s, "utf-8").toString("base64"),
		atob: (s) => Buffer.from(s, "base64").toString("utf-8"),
		TextEncoder,
		TextDecoder
	};
	createContext(sandbox);
	patchDualRealmInstanceof(sandbox);
	return sandbox;
}
/**
* Cross-realm SyntaxError detection: a compile failure inside `runInContext`
* constructs its error in the SANDBOX realm, so a host `instanceof
* SyntaxError` is silently false — the `name` property is the realm-safe tag.
*/
function isSyntaxError(error) {
	return typeof error === "object" && error !== null && error.name === "SyntaxError";
}
/**
* The parse-failure context a vm `SyntaxError` carries: the vm prints the
* offending source line and a caret before the message, which is exactly what
* a model needs to self-correct — surface it instead of the bare message.
* Falls back to `String(error)` when the stack carries no such prelude.
* @param error - the `SyntaxError` (host- or sandbox-realm) thrown while compiling package code.
* @returns the stack prefix up to and including the `SyntaxError: …` line.
*/
function syntaxErrorContext(error) {
	const lines = (error.stack ?? "").split("\n");
	const messageIndex = lines.findIndex((line) => line.startsWith("SyntaxError"));
	if (messageIndex === -1) return String(error);
	return lines.slice(0, messageIndex + 1).join("\n");
}
/**
* The teaching text one parse failure produces, shared by the define-time
* precheck and the run-time evaluation so a model reads the same diagnosis
* whichever verb caught it.
* @param half - which half failed to parse, named as the define argument that carried it.
* @param context - the {@link syntaxErrorContext} of the failure.
* @returns the model-facing error message.
*/
function parseErrorMessage(half, context) {
	const offendingLine = context.split("\n")[1] ?? "";
	if (/\bas\b/.test(offendingLine)) return `dynamic package \`${half}\` failed to parse:\n${context}\nThe sandbox runs plain JavaScript, not TypeScript. Remove type annotations:
  ✗ { type: 'text' as const, text: x }
  ✓ { type: 'text', text: x }`;
	return `dynamic package \`${half}\` failed to parse:\n${context}\nNote: it runs as the BODY of an async function (line numbers are offset by the 1-line wrapper). Check bracket balance — ending the returned plugin object with \`});\` closes a call that was never opened; a plain \`return { … }\` ends with \`}\` (an optional \`;\`), never \`)\`.`;
}
/**
* Parse one half's source without running it: the define-time precheck that
* keeps unparseable code out of the registry, so a model fixes it and defines
* again instead of discovering the failure at run time. `new Function` is the
* gate — hosts without a real `node:vm` (the browser worker) still refuse
* unparseable code — and `vm.Script` is only the best-effort prettifier: on a
* Node host its failure carries the source-line-and-caret prelude the
* teaching text builds on, and where the vm is a stub the message stays bare.
* The two parsers' syntax faces differ at the margin (`new.target` parses in
* a function body but not at the vm wrapper's top level), an accepted cost of
* a vm-free gate; and under a page CSP without `'unsafe-eval'`, `new Function`
* throws `EvalError`, which propagates unwrapped.
* @param code - the model-written function body.
* @param half - which define argument carried it, for the error text.
* @throws when the body does not parse, with the offending line and a teaching hint.
*/
function precheckCode(code, half) {
	const wrapped = `(async () => {\n${code}\n})()`;
	try {
		new Function(wrapped);
	} catch (error) {
		if (!isSyntaxError(error)) throw error;
		throw new Error(parseErrorMessage(half, prettyParseContext(wrapped, half, error)));
	}
}
/**
* Best-effort vm recompile of a body `new Function` already refused, for the
* source-line-and-caret prelude only.
* @param wrapped - the wrapped source that failed to parse.
* @param half - which define argument carried it, for the vm filename.
* @param refusal - the gate's own `SyntaxError`, the fallback context source.
* @returns the vm prelude when a real vm produced one, else the bare refusal.
*/
function prettyParseContext(wrapped, half, refusal) {
	try {
		new Script(wrapped, { filename: `cordis-dyn-${half}.js` });
	} catch (vmError) {
		if (isSyntaxError(vmError)) return syntaxErrorContext(vmError);
	}
	return String(refusal);
}
/**
* Evaluate a host half as the body of an async function inside the sandbox. `vmTimeoutMs` only
* bounds the SYNCHRONOUS portion; an async body escapes it — acceptable under the module's
* trust stance. Parse errors include the offending line and a TypeScript-removal or bracket-
* balance hint.
* @param sandbox - the contextified object from {@link createSandbox}.
* @param code - the model-written function body; must `return` a plugin.
* @param id - the package id, used as the vm filename (`cordis-dyn-<id>.js`).
* @param vmTimeoutMs - the synchronous evaluation bound in milliseconds.
* @returns whatever the code returned, still un-narrowed (the run lifecycle checks plugin shape).
*/
async function evaluateHostCode(sandbox, code, id, vmTimeoutMs) {
	try {
		return await runInContext(`(async () => {\n${code}\n})()`, sandbox, {
			filename: `cordis-dyn-${id}.js`,
			timeout: vmTimeoutMs
		});
	} catch (error) {
		if (!isSyntaxError(error)) throw error;
		throw new Error(parseErrorMessage("code.host", syntaxErrorContext(error)));
	}
}
//#endregion
//#region lib/types/index.js
/**
* Dynamic Cordis Plugin service: immutable package definitions, one active run
* per Plugin, human-approved Client activation, and Host/Client invocation.
* @module @deepseek-ai/dsh-cordis-host-runner
*/
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
		else descriptor[key] = _;
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
/**
* Brand a Host-minted Plugin ID.
* @param id - opaque identifier minted by the Host registry.
* @returns the branded Plugin identifier.
*/
function CordisDynamicPluginId(id) {
	return id;
}
/**
* Brand a Host-minted Package ID.
* @param id - opaque identifier minted by the Host registry.
* @returns the branded Package identifier.
*/
function CordisDynamicPackageId(id) {
	return id;
}
/**
* Brand a Host-minted Plugin Run ID.
* @param id - opaque identifier minted by the Host registry.
* @returns the branded Plugin Run identifier.
*/
function CordisDynamicPluginRunId(id) {
	return id;
}
/**
* Brand a Host-minted approval request ID.
* @param id - opaque identifier minted by the Host registry.
* @returns the branded approval request identifier.
*/
function ApprovalRequestId(id) {
	return id;
}
/** Dynamic Plugin registry and Host-half lifecycle. */
let DynamicCordisRunnerService = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _undefineFromPanel_decorators;
	let _runHostHalf_decorators;
	let _getClientCode_decorators;
	let _resolveRequestRun_decorators;
	let _settleUserRun_decorators;
	let _stopFromPanel_decorators;
	let _syncInspectManifest_decorators;
	let _resolveInspectQuery_decorators;
	let _inventory_decorators;
	let _reportRenderFailure_decorators;
	let _reportClientGuardFailure_decorators;
	let _invoke_decorators;
	return class DynamicCordisRunnerService extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_undefineFromPanel_decorators = [Remote("undefineFromPanel")];
			_runHostHalf_decorators = [Remote("runHostHalf")];
			_getClientCode_decorators = [Remote("getClientCode")];
			_resolveRequestRun_decorators = [Remote("resolveRequestRun")];
			_settleUserRun_decorators = [Remote("settleUserRun")];
			_stopFromPanel_decorators = [Remote("stopFromPanel")];
			_syncInspectManifest_decorators = [Remote("syncInspectManifest")];
			_resolveInspectQuery_decorators = [Remote("resolveInspectQuery")];
			_inventory_decorators = [Remote("inventory")];
			_reportRenderFailure_decorators = [Remote("reportRenderFailure")];
			_reportClientGuardFailure_decorators = [Remote("reportClientGuardFailure")];
			_invoke_decorators = [Remote("invoke")];
			__esDecorate(this, null, _undefineFromPanel_decorators, {
				kind: "method",
				name: "undefineFromPanel",
				static: false,
				private: false,
				access: {
					has: (obj) => "undefineFromPanel" in obj,
					get: (obj) => obj.undefineFromPanel
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _runHostHalf_decorators, {
				kind: "method",
				name: "runHostHalf",
				static: false,
				private: false,
				access: {
					has: (obj) => "runHostHalf" in obj,
					get: (obj) => obj.runHostHalf
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _getClientCode_decorators, {
				kind: "method",
				name: "getClientCode",
				static: false,
				private: false,
				access: {
					has: (obj) => "getClientCode" in obj,
					get: (obj) => obj.getClientCode
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _resolveRequestRun_decorators, {
				kind: "method",
				name: "resolveRequestRun",
				static: false,
				private: false,
				access: {
					has: (obj) => "resolveRequestRun" in obj,
					get: (obj) => obj.resolveRequestRun
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _settleUserRun_decorators, {
				kind: "method",
				name: "settleUserRun",
				static: false,
				private: false,
				access: {
					has: (obj) => "settleUserRun" in obj,
					get: (obj) => obj.settleUserRun
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _stopFromPanel_decorators, {
				kind: "method",
				name: "stopFromPanel",
				static: false,
				private: false,
				access: {
					has: (obj) => "stopFromPanel" in obj,
					get: (obj) => obj.stopFromPanel
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _syncInspectManifest_decorators, {
				kind: "method",
				name: "syncInspectManifest",
				static: false,
				private: false,
				access: {
					has: (obj) => "syncInspectManifest" in obj,
					get: (obj) => obj.syncInspectManifest
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _resolveInspectQuery_decorators, {
				kind: "method",
				name: "resolveInspectQuery",
				static: false,
				private: false,
				access: {
					has: (obj) => "resolveInspectQuery" in obj,
					get: (obj) => obj.resolveInspectQuery
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _inventory_decorators, {
				kind: "method",
				name: "inventory",
				static: false,
				private: false,
				access: {
					has: (obj) => "inventory" in obj,
					get: (obj) => obj.inventory
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _reportRenderFailure_decorators, {
				kind: "method",
				name: "reportRenderFailure",
				static: false,
				private: false,
				access: {
					has: (obj) => "reportRenderFailure" in obj,
					get: (obj) => obj.reportRenderFailure
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _reportClientGuardFailure_decorators, {
				kind: "method",
				name: "reportClientGuardFailure",
				static: false,
				private: false,
				access: {
					has: (obj) => "reportClientGuardFailure" in obj,
					get: (obj) => obj.reportClientGuardFailure
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _invoke_decorators, {
				kind: "method",
				name: "invoke",
				static: false,
				private: false,
				access: {
					has: (obj) => "invoke" in obj,
					get: (obj) => obj.invoke
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		static inject = ["tools"];
		static Config = z.object({ vmTimeoutMs: z.number().min(1).default(5e3) });
		rootCtx = __runInitializers(this, _instanceExtraInitializers);
		registry = new DynamicCordisRegistry();
		inspectRegistry;
		starting = /* @__PURE__ */ new Map();
		resolved;
		group;
		/** Create the service under the Host composition. */
		constructor(ctx, config) {
			super(ctx, "dynamicCordisRunner");
			this.rootCtx = ctx;
			this.resolved = config;
			this.inspectRegistry = new CordisInspectRegistryService(ctx);
		}
		/**
		* Define a new Plugin's first Package or append a Package to an existing Plugin.
		* @param request - Session ownership, Plugin selection, metadata, and source code.
		* @returns Host-minted Plugin and Package identities with declared-half metadata.
		*/
		define(request) {
			const name = request.name.trim();
			const purpose = request.purpose.trim();
			if (name.length === 0) throw new Error("cordis_define needs a non-empty `name`");
			if (purpose.length === 0) throw new Error("cordis_define needs a non-empty `purpose`");
			if (request.code.host === void 0 && request.code.client === void 0) throw new Error("cordis_define needs `code.host`, `code.client`, or both");
			if (request.code.host !== void 0) precheckCode(request.code.host, "code.host");
			if (request.code.client !== void 0) precheckCode(request.code.client, "code.client");
			let plugin;
			if (request.plugin.kind === "new") {
				const prefix = request.plugin.idPrefix.trim();
				if (!/^[a-z]{3,6}$/.test(prefix)) throw new Error("cordis_define `plugin.idPrefix` must contain 3–6 lowercase English letters");
				plugin = {
					pluginId: CordisDynamicPluginId(this.registry.mintPluginId(prefix)),
					sessionId: request.sessionId,
					packages: /* @__PURE__ */ new Map(),
					approvedClientPackages: /* @__PURE__ */ new Set(),
					clientVersionUpdatesApproved: false
				};
				this.registry.add(plugin);
			} else {
				const found = this.registry.get(request.plugin.pluginId);
				if (found === void 0 || found.sessionId !== request.sessionId) throw new Error(missingPluginMessage(request.plugin.pluginId));
				plugin = found;
			}
			const packageId = CordisDynamicPackageId(this.registry.mintPackageId());
			const definition = {
				packageId,
				name,
				purpose,
				...request.code.host === void 0 ? {} : { hostCode: request.code.host },
				...request.code.client === void 0 ? {} : { clientCode: request.code.client }
			};
			plugin.packages.set(packageId, definition);
			return {
				pluginId: plugin.pluginId,
				packageId,
				name,
				purpose,
				hasHostHalf: definition.hostCode !== void 0,
				hasClientHalf: definition.clientCode !== void 0
			};
		}
		/**
		* Remove a Plugin, its active run, and all immutable Packages.
		* @param agent - Agent whose Session must own the Plugin.
		* @param pluginId - Stable Plugin identity to remove.
		* @returns Whether removal succeeded and whether it stopped an active run.
		*/
		async undefine(agent, pluginId) {
			const plugin = this.owned(agent, pluginId);
			if (plugin === void 0) return {
				ok: false,
				reason: "plugin-missing",
				message: missingPluginMessage(pluginId)
			};
			const wasRunning = plugin.run !== void 0;
			this.cancelPending(pluginId, `dynamic plugin "${pluginId}" was removed before approval`);
			if (plugin.run !== void 0) await this.retract(plugin);
			this.registry.delete(pluginId);
			return {
				ok: true,
				wasRunning
			};
		}
		/**
		* Remove a Plugin from the user panel and queue the resulting state change for the model's next step.
		* @param agent - Agent whose Session owns the Plugin and receives the context.
		* @param pluginId - Stable Plugin identity to remove.
		* @returns Whether removal succeeded and whether it stopped an active run.
		*/
		async undefineFromPanel(agent, pluginId) {
			const result = await this.undefine(agent, pluginId);
			if (result.ok) this.injectUserContext(agent, `The user removed Cordis Plugin ${pluginId} and all of its Packages. The Plugin no longer exists.`);
			return result;
		}
		/**
		* Start or update one Package for a model tool call. An unauthorized Client
		* Package waits for approval; Plugin-wide authorization covers later versions.
		* @param agent - Agent whose Session must own the Plugin.
		* @param pluginId - Stable Plugin identity to activate.
		* @param packageId - Immutable Package version to activate.
		* @param mode - Whether to run the current version or switch versions.
		* @param signal - Tool-call cancellation signal while the activation request is being created.
		* @returns The successful activation identity or an actionable refusal.
		*/
		async run(agent, pluginId, packageId, mode, signal) {
			const plan = this.resolvePlan(agent, pluginId, packageId, mode);
			if (!plan.ok) return plan.response;
			if (signal?.aborted === true) return {
				ok: false,
				reason: "cancelled",
				message: `the run request for dynamic plugin "${pluginId}" was cancelled before activation`
			};
			if (this.registry.pendingRequestFor(pluginId) !== void 0) return {
				ok: false,
				reason: "transition-in-flight",
				message: `dynamic plugin "${pluginId}" already has a pending run request`
			};
			const attempt = this.createAttempt(plan);
			plan.plugin.nextPackageId = packageId;
			plan.plugin.latestRun = attempt;
			if (plan.definition.clientCode === void 0) {
				const started = await this.activate(plan, void 0, false, attempt);
				if (started.ok) return this.runResponse(plan.plugin, started);
				this.failAttempt(plan.plugin, attempt, "host-load", started);
				return {
					...started,
					reason: "host-half-failed"
				};
			}
			const requestId = ApprovalRequestId(this.registry.mintApprovalRequestId());
			const requiresApproval = !plan.plugin.clientVersionUpdatesApproved && !plan.plugin.approvedClientPackages.has(packageId);
			attempt.approvalRequestId = requestId;
			attempt.requiresApproval = requiresApproval;
			attempt.status = requiresApproval ? "awaiting-approval" : "starting-host";
			this.registry.armRequest(requestId, {
				agentId: agent.id,
				pluginId,
				packageId,
				pluginRunId: attempt.pluginRunId,
				mode,
				requiresApproval
			});
			this.ctx.emit("cordis/request-run", {
				requestId,
				agentId: agent.id,
				pluginId,
				packageId,
				mode,
				name: plan.definition.name,
				purpose: plan.definition.purpose,
				requiresApproval
			});
			return {
				ok: true,
				status: requiresApproval ? "awaiting-approval" : "starting",
				pluginId,
				packageId,
				pluginRunId: attempt.pluginRunId,
				mode,
				waitingFor: [],
				...plan.plugin.currentPackageId === void 0 ? {} : { currentPackageId: plan.plugin.currentPackageId },
				nextPackageId: packageId
			};
		}
		/**
		* Start Host code for an approved request or a direct panel gesture.
		* @param agent - Agent whose Session must own the Plugin.
		* @param pluginId - Stable Plugin identity to activate.
		* @param packageId - Immutable Package version to activate.
		* @param mode - Whether to run the current version or switch versions.
		* @param requestId - Model-driven request identity, or null for a direct user gesture.
		* @param approveFutureVersions - Whether this approval covers later Packages of the same Plugin.
		* @returns The exact Host activation or a failure message.
		*/
		async runHostHalf(agent, pluginId, packageId, mode, requestId, approveFutureVersions) {
			const plan = this.resolvePlan(agent, pluginId, packageId, mode, requestId === null);
			if (!plan.ok) return {
				ok: false,
				message: plan.response.message
			};
			let attempt;
			if (requestId !== null) {
				const pending = this.registry.peekRequest(requestId);
				if (pending === void 0 || pending.pluginId !== pluginId || pending.packageId !== packageId || pending.mode !== mode) return {
					ok: false,
					message: `run request "${requestId}" does not authorize ${pluginId}/${packageId}`
				};
				const latest = plan.plugin.latestRun;
				const expectedStatus = pending.requiresApproval ? "awaiting-approval" : "starting-host";
				if (latest === void 0 || latest.pluginRunId !== pending.pluginRunId || latest.status !== expectedStatus && !pending.requiresApproval && latest.status !== "client-pending") return {
					ok: false,
					message: `run request "${requestId}" no longer identifies the latest run of ${pluginId}`
				};
				attempt = latest;
				if (pending.requiresApproval) {
					plan.plugin.approvedClientPackages.add(packageId);
					if (approveFutureVersions) plan.plugin.clientVersionUpdatesApproved = true;
				}
			} else {
				const pending = this.registry.pendingRequestFor(pluginId);
				if (pending !== void 0) return {
					ok: false,
					message: `dynamic plugin "${pluginId}" has pending run request ${pending}`
				};
				const attached = plan.plugin.run?.packageId === packageId && plan.plugin.latestRun?.pluginRunId === plan.plugin.run.pluginRunId ? plan.plugin.latestRun : void 0;
				attempt = attached ?? this.createAttempt(plan);
				if (attached === void 0) {
					plan.plugin.nextPackageId = packageId;
					plan.plugin.latestRun = attempt;
				}
				if (plan.definition.clientCode !== void 0) plan.plugin.approvedClientPackages.add(packageId);
			}
			const attaching = attempt.pluginRunId === plan.plugin.run?.pluginRunId;
			if (!attaching) {
				attempt.status = "starting-host";
				if (attempt.host.status !== "absent") attempt.host = {
					status: "pending",
					waitingFor: []
				};
			}
			const started = await this.activate(plan, requestId ?? void 0, attaching, attempt);
			if (!started.ok) this.failAttempt(plan.plugin, attempt, "host-load", started);
			return started;
		}
		/**
		* Fetch Client code for the exact active run.
		* @param agent - Agent whose Session must own the Plugin.
		* @param pluginId - Stable Plugin identity to read.
		* @param pluginRunId - Exact active run authorized to receive source.
		* @returns Client source and its Plugin, Package, and run identities.
		*/
		getClientCode(agent, pluginId, pluginRunId) {
			const plugin = this.owned(agent, pluginId);
			if (plugin === void 0) throw new Error(missingPluginMessage(pluginId));
			const run = plugin.run;
			if (run === void 0 || run.pluginRunId !== pluginRunId) throw new Error(`dynamic plugin "${pluginId}" is not running activation "${pluginRunId}"`);
			const definition = plugin.packages.get(run.packageId);
			if (definition?.clientCode === void 0) throw new Error(`package "${run.packageId}" has no Client half`);
			return {
				code: definition.clientCode,
				name: definition.name,
				pluginId,
				packageId: run.packageId,
				pluginRunId
			};
		}
		/**
		* Resolve one model-driven Client activation request.
		* @param requestId - Request identity to settle once.
		* @param resolution - Browser refusal or exact Client activation result.
		* @returns Whether the still-pending request accepted this resolution.
		*/
		async resolveRequestRun(requestId, resolution) {
			const pending = this.registry.peekRequest(requestId);
			if (pending === void 0) return { accepted: false };
			const plugin = this.registry.get(pending.pluginId);
			if (resolution.ok && plugin?.run?.pluginRunId !== resolution.pluginRunId) return { accepted: false };
			if (!resolution.ok && resolution.pluginRunId !== void 0 && plugin?.run?.pluginRunId !== resolution.pluginRunId) return { accepted: false };
			this.registry.claimRequest(requestId);
			const settled = await this.settleActivation(plugin, resolution, requestId);
			this.announceResolved(requestId, resolution, pending.requiresApproval ? void 0 : "completed");
			this.steerRunOutcome(pending, settled);
			return { accepted: true };
		}
		/**
		* Settle a direct panel run after this page loaded or failed its Client half.
		* @param agent - Agent whose Session must own the Plugin.
		* @param pluginId - Stable Plugin identity being settled.
		* @param resolution - Exact Client activation result from the acting page.
		* @returns The committed activation or its failure.
		*/
		async settleUserRun(agent, pluginId, resolution) {
			const plugin = this.owned(agent, pluginId);
			if (plugin === void 0) return {
				ok: false,
				reason: "plugin-missing",
				message: missingPluginMessage(pluginId)
			};
			const settled = await this.settleActivation(plugin, resolution);
			this.injectUserRunOutcome(agent, pluginId, settled);
			return settled;
		}
		/**
		* Stop the active run while retaining every Package version.
		* @param agent - Agent whose Session must own the Plugin.
		* @param pluginId - Stable Plugin identity to stop.
		* @returns Success or the reason no run was stopped.
		*/
		async stop(agent, pluginId) {
			const plugin = this.owned(agent, pluginId);
			if (plugin === void 0) return {
				ok: false,
				reason: "plugin-missing",
				message: missingPluginMessage(pluginId)
			};
			const pending = this.registry.pendingRequestFor(pluginId);
			if (plugin.run === void 0 && pending === void 0) return {
				ok: false,
				reason: "not-running",
				message: `dynamic plugin "${pluginId}" is not running`
			};
			if (pending !== void 0) this.cancelPending(pluginId, `dynamic plugin "${pluginId}" was stopped before approval`);
			if (plugin.run !== void 0) await this.retract(plugin);
			if (plugin.latestRun !== void 0) {
				plugin.latestRun.status = "stopped";
				if (plugin.latestRun.host.status !== "absent") plugin.latestRun.host = {
					status: "stopped",
					waitingFor: []
				};
				if (plugin.latestRun.client.status !== "absent") plugin.latestRun.client = {
					status: "stopped",
					waitingFor: []
				};
			}
			return { ok: true };
		}
		/**
		* Stop a Plugin from the user panel and queue the resulting state change for the model's next step.
		* @param agent - Agent whose Session owns the Plugin and receives the context.
		* @param pluginId - Stable Plugin identity to stop.
		* @returns Success or the reason no run was stopped.
		*/
		async stopFromPanel(agent, pluginId) {
			const result = await this.stop(agent, pluginId);
			if (!result.ok) return result;
			const plugin = this.owned(agent, pluginId);
			this.injectUserContext(agent, `The user stopped Cordis Plugin ${pluginId}. Its Packages remain defined; currentPackageId is ${plugin?.currentPackageId ?? "none"}.`);
			return result;
		}
		/**
		* Replace the Host mirror of the Client inspect provider directory.
		* @param providers - complete Client provider manifest.
		* @returns null after accepting the manifest.
		*/
		syncInspectManifest(providers) {
			this.inspectRegistry.syncClientManifest(providers);
			return null;
		}
		/**
		* Claim one pending Client inspect query with its live result.
		* @param agent - Session that owns the query.
		* @param requestId - exact pending query identity.
		* @param resolution - provider result or structured refusal.
		* @returns whether this answer won the query.
		*/
		resolveInspectQuery(agent, requestId, resolution) {
			return this.inspectRegistry.resolveClientQuery(agent, requestId, resolution);
		}
		/**
		* Frame-wide inventory, grouped as one row per stable Plugin.
		* @returns Source-free metadata for every process-local Plugin.
		*/
		inventory() {
			return this.registry.all().map((plugin) => ({
				pluginId: plugin.pluginId,
				agentId: plugin.sessionId,
				packages: [...plugin.packages.values()].map((definition) => ({
					packageId: definition.packageId,
					name: definition.name,
					purpose: definition.purpose,
					hasHostHalf: definition.hostCode !== void 0,
					hasClientHalf: definition.clientCode !== void 0
				})),
				...plugin.currentPackageId === void 0 ? {} : { currentPackageId: plugin.currentPackageId },
				...plugin.nextPackageId === void 0 ? {} : { nextPackageId: plugin.nextPackageId },
				...plugin.run === void 0 ? {} : { activeRun: {
					pluginRunId: plugin.run.pluginRunId,
					packageId: plugin.run.packageId
				} },
				...plugin.latestRun === void 0 ? {} : { latestRun: cloneAttempt(plugin.latestRun) }
			}));
		}
		/**
		* Read one Session's Host-rich state for inspection and result rendering.
		* @param agent - Agent whose Session selects visible Plugins.
		* @returns Plugin versions, active runs, Host fibers, and render failures.
		*/
		snapshot(agent) {
			return this.registry.ofSession(agent.id).map((plugin) => ({
				pluginId: plugin.pluginId,
				...plugin.currentPackageId === void 0 ? {} : { currentPackageId: plugin.currentPackageId },
				...plugin.nextPackageId === void 0 ? {} : { nextPackageId: plugin.nextPackageId },
				packages: [...plugin.packages.values()].map((definition) => ({
					packageId: definition.packageId,
					name: definition.name,
					purpose: definition.purpose,
					hasHostHalf: definition.hostCode !== void 0,
					hasClientHalf: definition.clientCode !== void 0
				})),
				...plugin.run === void 0 ? {} : { activeRun: {
					pluginRunId: plugin.run.pluginRunId,
					packageId: plugin.run.packageId,
					...plugin.run.fiber === void 0 ? {} : { fiber: plugin.run.fiber },
					handlers: [...plugin.run.handlers.keys()],
					...plugin.run.renderFailure === void 0 ? {} : { renderFailure: plugin.run.renderFailure }
				} },
				...plugin.latestRun === void 0 ? {} : { latestRun: cloneAttempt(plugin.latestRun) }
			}));
		}
		/**
		* Read source-free context for an explicit `@pluginId` user gesture.
		* @param agent - Agent whose Session must own the Plugin.
		* @param pluginId - Stable Plugin identity referenced by the user.
		* @returns The preferred modification base, or undefined when unavailable.
		*/
		reference(agent, pluginId) {
			const plugin = this.owned(agent, pluginId);
			if (plugin === void 0) return void 0;
			const packageId = plugin.nextPackageId ?? plugin.currentPackageId ?? [...plugin.packages.keys()].at(-1);
			if (packageId === void 0) return void 0;
			const definition = plugin.packages.get(packageId);
			if (definition === void 0) return void 0;
			return {
				pluginId,
				packageId,
				name: definition.name,
				purpose: definition.purpose,
				...plugin.currentPackageId === void 0 ? {} : { currentPackageId: plugin.currentPackageId },
				...plugin.nextPackageId === void 0 ? {} : { nextPackageId: plugin.nextPackageId },
				...plugin.run === void 0 ? {} : { activeRun: {
					pluginRunId: plugin.run.pluginRunId,
					packageId: plugin.run.packageId
				} },
				...plugin.latestRun === void 0 ? {} : { latestRun: cloneAttempt(plugin.latestRun) }
			};
		}
		/**
		* List source-free Plugin summaries owned by one Session.
		* @param agent - Agent whose Session selects visible Plugins.
		* @returns one summary per Plugin in creation order.
		*/
		listPlugins(agent) {
			return this.registry.ofSession(agent.id).map((plugin) => this.inspectPlugin(agent, plugin.pluginId));
		}
		/**
		* Inspect one Plugin without returning Package source.
		* @param agent - Agent whose Session must own the Plugin.
		* @param pluginId - stable Plugin identity.
		* @returns version pointers, latest run, and all Package summaries.
		*/
		inspectPlugin(agent, pluginId) {
			const plugin = this.owned(agent, pluginId);
			if (plugin === void 0) throw new Error(missingPluginMessage(pluginId));
			const reference = this.reference(agent, pluginId);
			if (reference === void 0) throw new Error(`dynamic plugin "${pluginId}" has no package`);
			return {
				...reference,
				packages: [...plugin.packages.values()].map((definition) => ({
					packageId: definition.packageId,
					name: definition.name,
					purpose: definition.purpose,
					hasHostHalf: definition.hostCode !== void 0,
					hasClientHalf: definition.clientCode !== void 0
				}))
			};
		}
		/**
		* Read one exact immutable Package and its Host and Client source.
		* @param agent - Agent whose Session must own the Plugin.
		* @param pluginId - Stable Plugin identity that owns the Package.
		* @param packageId - Exact immutable Package identity to inspect.
		* @returns Package metadata, source, and the Plugin's lifecycle pointers.
		*/
		inspectPackage(agent, pluginId, packageId) {
			const plugin = this.owned(agent, pluginId);
			if (plugin === void 0) throw new Error(missingPluginMessage(pluginId));
			const definition = plugin.packages.get(packageId);
			if (definition === void 0) throw new Error(`dynamic package "${packageId}" does not exist on plugin "${pluginId}"`);
			return {
				pluginId,
				packageId,
				name: definition.name,
				purpose: definition.purpose,
				code: {
					...definition.hostCode === void 0 ? {} : { host: definition.hostCode },
					...definition.clientCode === void 0 ? {} : { client: definition.clientCode }
				},
				...plugin.currentPackageId === void 0 ? {} : { currentPackageId: plugin.currentPackageId },
				...plugin.nextPackageId === void 0 ? {} : { nextPackageId: plugin.nextPackageId },
				...plugin.run === void 0 ? {} : { activeRun: {
					pluginRunId: plugin.run.pluginRunId,
					packageId: plugin.run.packageId
				} },
				...plugin.latestRun === void 0 ? {} : { latestRun: cloneAttempt(plugin.latestRun) }
			};
		}
		/**
		* Record a post-load render failure for the exact active run.
		* @param agent - Agent whose Session must own the Plugin.
		* @param pluginId - Stable Plugin identity that rendered.
		* @param pluginRunId - Exact active run that produced the failure.
		* @param failure - Slot, message, and entry-retirement result.
		* @returns Null after recording or ignoring a stale report.
		*/
		async reportRenderFailure(agent, pluginId, pluginRunId, failure) {
			const plugin = this.owned(agent, pluginId);
			if (plugin?.run?.pluginRunId === pluginRunId) {
				const run = plugin.run;
				const definition = plugin.packages.get(plugin.run.packageId);
				const shouldSteer = run.renderFailure === void 0;
				run.renderFailure = failure;
				const attempt = plugin.latestRun;
				if (attempt?.pluginRunId === pluginRunId) {
					attempt.error = this.diagnostic(plugin, attempt, "client-render", failure);
					attempt.client = {
						status: "failed",
						waitingFor: attempt.client.waitingFor,
						error: failure.message
					};
					attempt.status = "failed";
				}
				if (definition !== void 0 && shouldSteer) this.steerRenderFailure(agent, plugin, definition, pluginRunId, failure);
			}
			return await Promise.resolve(null);
		}
		/**
		* Report a Client guard rejection that happened after the Package completed activation.
		* @param agent - Agent whose Session must own the Plugin.
		* @param pluginId - Stable Plugin identity whose Client code was rejected.
		* @param pluginRunId - Exact active run that produced the rejection.
		* @param failure - Original guard message and stack.
		* @returns Null after reporting or ignoring a stale/startup failure.
		*/
		async reportClientGuardFailure(agent, pluginId, pluginRunId, failure) {
			const plugin = this.owned(agent, pluginId);
			const run = plugin?.run;
			if (plugin !== void 0 && run?.pluginRunId === pluginRunId) this.steerGuardFailure(plugin, run, "Client", failure);
			return await Promise.resolve(null);
		}
		/**
		* Invoke an active Host method while rejecting stale Client runs.
		* @param pluginId - Stable Plugin identity that owns the method.
		* @param pluginRunId - Exact active run authorizing the call.
		* @param method - Registered Host handler name.
		* @param args - JSON argument delivered to the handler.
		* @returns The JSON result or a typed invocation failure.
		*/
		async invoke(pluginId, pluginRunId, method, args) {
			const plugin = this.registry.get(pluginId);
			if (plugin === void 0 || plugin.run === void 0) return {
				ok: false,
				code: "plugin-not-running",
				message: `dynamic plugin "${pluginId}" is not running`
			};
			const run = plugin.run;
			if (run.pluginRunId !== pluginRunId) return {
				ok: false,
				code: "stale-run",
				message: `activation "${pluginRunId}" is no longer active`
			};
			const handler = run.handlers.get(method);
			if (handler === void 0) return {
				ok: false,
				code: "method-not-found",
				message: `dynamic plugin "${pluginId}" registered no Host method "${method}"`
			};
			try {
				return {
					ok: true,
					value: await handler(args)
				};
			} catch (error) {
				const failure = errorDetails(error);
				this.steerHostHandlerFailure(plugin, run, method, failure);
				return {
					ok: false,
					code: "handler-error",
					...failure
				};
			}
		}
		resolvePlan(agent, pluginId, packageId, mode, allowActiveAttach = false) {
			const plugin = this.owned(agent, pluginId);
			if (plugin === void 0) return {
				ok: false,
				response: {
					ok: false,
					reason: "plugin-missing",
					message: missingPluginMessage(pluginId)
				}
			};
			const definition = plugin.packages.get(packageId);
			if (definition === void 0) return {
				ok: false,
				response: {
					ok: false,
					reason: "package-missing",
					message: `plugin "${pluginId}" has no package "${packageId}"`
				}
			};
			const current = plugin.currentPackageId;
			if (mode === "update" && (current === void 0 || current === packageId)) return {
				ok: false,
				response: {
					ok: false,
					reason: "invalid-mode",
					message: current === void 0 ? `plugin "${pluginId}" has no successful version yet; start "${packageId}" with mode "run"` : `package "${packageId}" is already current; use mode "run"`
				}
			};
			if (mode === "run" && current !== void 0 && current !== packageId) return {
				ok: false,
				response: {
					ok: false,
					reason: "invalid-mode",
					message: `package "${packageId}" differs from current "${current}"; use mode "update"`
				}
			};
			if (!allowActiveAttach && this.starting.has(pluginId)) return {
				ok: false,
				response: {
					ok: false,
					reason: "transition-in-flight",
					message: `plugin "${pluginId}" is already starting`
				}
			};
			return {
				ok: true,
				plugin,
				definition,
				mode
			};
		}
		activate(plan, requestId, allowActiveAttach, attempt) {
			const inFlight = this.starting.get(plan.plugin.pluginId);
			if (inFlight !== void 0) return inFlight;
			const starting = this.startFresh(plan, requestId, allowActiveAttach, attempt);
			this.starting.set(plan.plugin.pluginId, starting);
			return starting.finally(() => {
				this.starting.delete(plan.plugin.pluginId);
			});
		}
		async startFresh(plan, requestId, allowActiveAttach, attempt) {
			const { plugin, definition, mode } = plan;
			if (allowActiveAttach && plugin.run?.packageId === definition.packageId && plugin.run.pluginRunId === attempt.pluginRunId) return {
				ok: true,
				pluginId: plugin.pluginId,
				packageId: definition.packageId,
				pluginRunId: plugin.run.pluginRunId,
				waitingFor: missingFor(this.ctx, plugin.run),
				startedHere: false
			};
			if (plugin.run !== void 0) await this.retract(plugin);
			if (mode === "update" || plugin.currentPackageId === void 0) plugin.nextPackageId = definition.packageId;
			const run = {
				pluginRunId: attempt.pluginRunId,
				packageId: definition.packageId,
				handlers: /* @__PURE__ */ new Map(),
				handlerDisposers: [],
				reportedRuntimeErrors: /* @__PURE__ */ new Set(),
				...requestId === void 0 ? {} : { startedForRequest: requestId }
			};
			if (definition.hostCode !== void 0) {
				const failure = await this.startHost(plugin, definition.hostCode, run);
				if (failure !== void 0) return {
					ok: false,
					...failure
				};
			}
			plugin.run = run;
			this.ctx.emit("cordis/dynamic-package", {
				pluginId: plugin.pluginId,
				packageId: definition.packageId,
				pluginRunId: run.pluginRunId,
				name: definition.name
			});
			attempt.host = {
				status: run.fiber === void 0 ? "absent" : missingFor(this.ctx, run).length === 0 ? "running" : "waiting",
				waitingFor: missingFor(this.ctx, run)
			};
			if (definition.clientCode === void 0) this.commitActivation(plugin, run);
			else {
				attempt.status = "client-pending";
				attempt.client = {
					status: "pending",
					waitingFor: []
				};
			}
			return {
				ok: true,
				pluginId: plugin.pluginId,
				packageId: definition.packageId,
				pluginRunId: run.pluginRunId,
				waitingFor: missingFor(this.ctx, run),
				startedHere: true
			};
		}
		async startHost(plugin, hostCode, run) {
			const handle = (method, fn) => {
				const normalized = normalizeHandler(method, fn);
				run.handlers.set(normalized.method, normalized.handler);
				const dispose = () => {
					if (run.handlers.get(normalized.method) === normalized.handler) run.handlers.delete(normalized.method);
				};
				run.handlerDisposers.push(dispose);
				return dispose;
			};
			try {
				const evaluated = await evaluateHostCode(createSandbox(plugin.pluginId, { handle }), hostCode, plugin.pluginId, this.resolved.vmTimeoutMs);
				if (!isPlugin(evaluated)) throw new Error(evaluated === void 0 ? "the Host half returned `undefined` — did you forget `return`?" : "the Host half must return a Plugin function or an object with apply(ctx)");
				run.fiber = await startHostHalf(this.requireGroup(), evaluated, (error) => {
					this.steerGuardFailure(plugin, run, "Host", errorDetails(error));
				});
				return;
			} catch (error) {
				for (const dispose of run.handlerDisposers.splice(0)) dispose();
				return errorDetails(error);
			}
		}
		async settleActivation(plugin, resolution, requestId) {
			if (plugin === void 0) return {
				ok: false,
				reason: "plugin-missing",
				message: "the dynamic plugin was removed during activation"
			};
			const attempt = plugin.latestRun;
			if (!resolution.ok) {
				if (resolution.reason === "rejected") {
					if (attempt !== void 0) {
						attempt.status = "rejected";
						attempt.error = this.diagnostic(plugin, attempt, "approval", resolution.message ?? "the run request was declined");
						attempt.client = {
							status: "stopped",
							waitingFor: []
						};
					}
					return {
						ok: false,
						reason: "rejected",
						message: resolution.message ?? "the run request was declined"
					};
				}
				const run = plugin.run;
				if (run !== void 0 && resolution.pluginRunId === run.pluginRunId && (requestId === void 0 || run.startedForRequest === requestId) && resolution.startedHere !== false) await this.retract(plugin);
				if (attempt !== void 0 && (resolution.pluginRunId === void 0 || attempt.pluginRunId === resolution.pluginRunId)) this.failAttempt(plugin, attempt, resolution.reason === "host-half-failed" ? "host-apply" : "client-apply", {
					message: resolution.message ?? resolution.reason,
					...resolution.stack === void 0 ? {} : { stack: resolution.stack }
				});
				return {
					ok: false,
					reason: resolution.reason,
					message: resolution.message ?? resolution.reason,
					...resolution.stack === void 0 ? {} : { stack: resolution.stack }
				};
			}
			const run = plugin.run;
			if (run === void 0 || run.pluginRunId !== resolution.pluginRunId) return {
				ok: false,
				reason: "client-half-failed",
				message: `activation "${resolution.pluginRunId}" is no longer active`
			};
			if (attempt !== void 0 && attempt.pluginRunId === run.pluginRunId) attempt.client = {
				status: resolution.waitingFor === void 0 || resolution.waitingFor.length === 0 ? "running" : "waiting",
				waitingFor: resolution.waitingFor ?? []
			};
			this.commitActivation(plugin, run);
			return {
				...this.runResponse(plugin, {
					ok: true,
					pluginId: plugin.pluginId,
					packageId: run.packageId,
					pluginRunId: run.pluginRunId,
					waitingFor: missingFor(this.ctx, run),
					startedHere: false
				}),
				...resolution.waitingFor === void 0 ? {} : { clientWaitingFor: resolution.waitingFor }
			};
		}
		commitActivation(plugin, run) {
			plugin.currentPackageId = run.packageId;
			delete plugin.nextPackageId;
			delete run.startedForRequest;
			const attempt = plugin.latestRun;
			if (attempt?.pluginRunId === run.pluginRunId) {
				attempt.status = attempt.host.status === "waiting" || attempt.client.status === "waiting" ? "waiting" : "running";
				delete attempt.approvalRequestId;
				delete attempt.requiresApproval;
				delete attempt.error;
			}
		}
		runResponse(plugin, started) {
			return {
				ok: true,
				status: "running",
				pluginId: plugin.pluginId,
				packageId: started.packageId,
				pluginRunId: started.pluginRunId,
				waitingFor: started.waitingFor,
				currentPackageId: started.packageId,
				mode: plugin.latestRun?.pluginRunId === started.pluginRunId ? plugin.latestRun.mode : "run"
			};
		}
		announceResolved(requestId, resolution, override) {
			const outcome = override ?? (resolution.ok ? "approved" : resolution.reason === "rejected" ? "rejected" : "failed");
			this.ctx.emit("cordis/request-run-resolved", {
				requestId,
				outcome
			});
		}
		steerRunOutcome(pending, settled) {
			const agent = this.rootCtx.get("agents")?.get(pending.agentId);
			if (agent === void 0) return;
			const plugin = this.registry.get(pending.pluginId);
			const identity = `${pending.pluginId}/${pending.packageId} (${pending.pluginRunId})`;
			let text;
			if (settled.ok) text = `Cordis ${pending.mode} ${identity} completed successfully. currentPackageId is ${settled.currentPackageId ?? pending.packageId}. Continue using the running Plugin.`;
			else if (settled.reason === "rejected") text = `The user rejected Cordis ${pending.mode} ${identity}. Do not request the same activation again unless the user asks.`;
			else {
				const returnedStatus = pending.requiresApproval ? "awaiting-approval" : "starting";
				text = `Cordis ${pending.mode} ${identity} failed after cordis_run returned ${returnedStatus}: ${settled.reason}\n${formatErrorDetails(settled)}\ncurrentPackageId: ${plugin?.currentPackageId ?? "none"}\nnextPackageId: ${plugin?.nextPackageId ?? pending.packageId}\nInspect the failed Package, correct it on the same Plugin when needed, and retry the activation autonomously.`;
			}
			agent.steer(createUserMessage({
				content: [{
					type: "text",
					text
				}],
				source: {
					kind: "plugin",
					plugin: "cordis-host-runner"
				}
			}));
		}
		steerRenderFailure(agent, plugin, definition, pluginRunId, failure) {
			agent.steer(createUserMessage({
				content: [{
					type: "text",
					text: `Cordis Client UI ${plugin.pluginId}/${definition.packageId} (${pluginRunId}) failed while rendering Slot "${failure.slot}" after activation.\n${formatErrorDetails(failure)}\nentryAbdicated: ${failure.abdicated}\nInspect the failed Package, fix the Client code by defining a new Package on the same Plugin, and activate that Package autonomously with cordis_run mode:"update".`
				}],
				source: {
					kind: "plugin",
					plugin: "cordis-host-runner"
				}
			}));
		}
		steerHostHandlerFailure(plugin, run, method, failure) {
			const reportKey = `Host\u0000handler\u0000${method}\u0000${failure.message}`;
			if (!this.claimRuntimeFailure(plugin, run, reportKey)) return;
			const agent = this.rootCtx.get("agents")?.get(plugin.sessionId);
			if (agent === void 0) return;
			agent.steer(createUserMessage({
				content: [{
					type: "text",
					text: `Cordis Host handler ${plugin.pluginId}/${run.packageId} (${run.pluginRunId}) failed when the Client called host.call(${JSON.stringify(method)}).\n${formatErrorDetails(failure)}\nThe Plugin remains running. Inspect this Package, correct the Host code on the same Plugin, and activate the new Package autonomously with cordis_run mode:"update". If the handler needs a Service, either declare that Service in the returned Plugin inject list or read it with ctx.get(name) and handle undefined.`
				}],
				source: {
					kind: "plugin",
					plugin: "cordis-host-runner"
				}
			}));
		}
		steerGuardFailure(plugin, run, platform, failure) {
			const reportKey = `${platform}\u0000guard\u0000${failure.message}`;
			if (!this.claimRuntimeFailure(plugin, run, reportKey)) return;
			const agent = this.rootCtx.get("agents")?.get(plugin.sessionId);
			if (agent === void 0) return;
			agent.steer(createUserMessage({
				content: [{
					type: "text",
					text: `Cordis ${platform} guard rejected runtime code in ${plugin.pluginId}/${run.packageId} (${run.pluginRunId}) after activation.\n${formatErrorDetails(failure)}\nThe Plugin remains running. Inspect this Package, define a corrected Package on the same Plugin, and activate it autonomously with cordis_run mode:"update".`
				}],
				source: {
					kind: "plugin",
					plugin: "cordis-host-runner"
				}
			}));
		}
		claimRuntimeFailure(plugin, run, key) {
			const attempt = plugin.latestRun;
			if (plugin.run !== run || attempt?.pluginRunId !== run.pluginRunId || attempt.status !== "running" && attempt.status !== "waiting") return false;
			if (run.reportedRuntimeErrors.has(key)) return false;
			run.reportedRuntimeErrors.add(key);
			return true;
		}
		injectUserRunOutcome(agent, pluginId, settled) {
			const plugin = this.owned(agent, pluginId);
			let text;
			if (settled.ok) text = `The user manually ran Cordis Plugin ${pluginId}, Package ${settled.packageId}, as ${settled.pluginRunId}. The activation succeeded; currentPackageId is ${settled.currentPackageId}.`;
			else {
				const attempt = plugin?.latestRun;
				text = `The user manually ran Cordis Plugin ${pluginId}${attempt === void 0 ? "" : `, Package ${attempt.packageId}, as ${attempt.pluginRunId}`}, but it failed: ${settled.reason}\n${formatErrorDetails(settled)}\ncurrentPackageId: ${plugin?.currentPackageId ?? "none"}\nnextPackageId: ${plugin?.nextPackageId ?? "none"}`;
			}
			this.injectUserContext(agent, text);
		}
		injectUserContext(agent, text) {
			if (this.rootCtx.get("agents")?.get(agent.id) !== agent) return;
			agent.inject(createUserMessage({
				content: [{
					type: "text",
					text
				}],
				source: {
					kind: "plugin",
					plugin: "cordis-host-runner"
				}
			}));
		}
		cancelPending(pluginId, message) {
			const requestId = this.registry.pendingRequestFor(pluginId);
			if (requestId === void 0) return;
			const pending = this.registry.claimRequest(requestId);
			if (pending === void 0) return;
			const plugin = this.registry.get(pluginId);
			if (plugin?.latestRun?.pluginRunId === pending.pluginRunId) {
				plugin.latestRun.status = "cancelled";
				plugin.latestRun.error = this.diagnostic(plugin, plugin.latestRun, "approval", message);
				delete plugin.latestRun.approvalRequestId;
				delete plugin.latestRun.requiresApproval;
			}
			this.announceResolved(requestId, {
				ok: false,
				reason: "rejected"
			}, "cancelled");
		}
		createAttempt(plan) {
			return {
				pluginRunId: CordisDynamicPluginRunId(this.registry.mintPluginRunId()),
				packageId: plan.definition.packageId,
				mode: plan.mode,
				status: "starting-host",
				host: {
					status: plan.definition.hostCode === void 0 ? "absent" : "pending",
					waitingFor: []
				},
				client: {
					status: plan.definition.clientCode === void 0 ? "absent" : "pending",
					waitingFor: []
				}
			};
		}
		failAttempt(plugin, attempt, phase, failure) {
			attempt.status = "failed";
			attempt.error = this.diagnostic(plugin, attempt, phase, failure);
			if (phase.startsWith("host")) attempt.host = {
				status: "failed",
				waitingFor: [],
				error: failure.message
			};
			else attempt.client = {
				status: "failed",
				waitingFor: [],
				error: failure.message
			};
		}
		diagnostic(plugin, attempt, phase, failure) {
			return {
				phase,
				...typeof failure === "string" ? { message: failure } : failure,
				pluginId: plugin.pluginId,
				packageId: attempt.packageId,
				pluginRunId: attempt.pluginRunId
			};
		}
		async retract(plugin) {
			const run = plugin.run;
			if (run === void 0) return;
			delete plugin.run;
			for (const dispose of run.handlerDisposers.splice(0)) dispose();
			if (run.fiber !== void 0) await run.fiber.dispose();
			this.ctx.emit("cordis/dynamic-retract", {
				pluginId: plugin.pluginId,
				packageId: run.packageId,
				pluginRunId: run.pluginRunId
			});
		}
		owned(agent, pluginId) {
			const plugin = this.registry.get(pluginId);
			return plugin?.sessionId === agent.id ? plugin : void 0;
		}
		requireGroup() {
			this.group ??= this.rootCtx.plugin({
				name: "cordis-dynamic",
				apply: () => {}
			});
			return this.group;
		}
	};
})();
function missingFor(ctx, run) {
	return run.fiber === void 0 ? [] : missingServices(ctx, run.fiber);
}
function missingPluginMessage(id) {
	return `no dynamic plugin "${id}" in this process — it may have been removed or lost on DSH restart`;
}
function errorDetails(error) {
	if (typeof error !== "object" || error === null) return { message: String(error) };
	const message = "message" in error && typeof error.message === "string" ? error.message : Object.prototype.toString.call(error);
	const stack = "stack" in error && typeof error.stack === "string" ? error.stack : void 0;
	return {
		message,
		...stack === void 0 ? {} : { stack }
	};
}
function formatErrorDetails(failure) {
	return `message: ${failure.message}` + (failure.stack === void 0 ? "" : `\nstack:\n${failure.stack}`);
}
function cloneAttempt(attempt) {
	return {
		...attempt,
		host: {
			...attempt.host,
			waitingFor: [...attempt.host.waitingFor]
		},
		client: {
			...attempt.client,
			waitingFor: [...attempt.client.waitingFor]
		},
		...attempt.error === void 0 ? {} : { error: { ...attempt.error } }
	};
}
//#endregion
export { ApprovalRequestId, CordisDynamicPackageId, CordisDynamicPluginId, CordisDynamicPluginRunId, CordisInspectRegistryService, DynamicCordisRunnerService, DynamicCordisRunnerService as default, HOST_BUILTIN_INSPECTION };
