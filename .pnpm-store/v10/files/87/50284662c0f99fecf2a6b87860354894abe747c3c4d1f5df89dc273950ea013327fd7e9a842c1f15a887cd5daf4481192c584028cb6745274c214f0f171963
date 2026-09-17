import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import z from "@deepseek-ai/schemastery";
//#region lib/types/index.js
/**
* Typert Loader integration: automatic registration for mounted plugin packages.
*
* When a loader entry mounts, this plugin resolves the entry's package.json; a
* package exporting `./typert` has its host face imported and its
* `TYPERT` manifest registered into `ctx.typert`, and the registration is
* withdrawn when the entry unmounts. Explicit `packages` cover plugins nested
* behind another Loader entry, whose Cordis fibers carry no resolvable package
* specifier. Packages without the export are skipped silently when discovered
* from Loader entries; an explicit package or declared artifact that is broken
* fails loud — aggregated into this plugin's activation throw for existing
* entries, contained to a logged error per package in steady state.
*
* Scanning is incremental per entry name. Every cordis `internal/plugin`
* emission marks the fiber's entry name dirty, and a microtask flush
* reconciles each dirty name against the live
* loader entries; the activation pass seeds the same dirty set with all
* current entries. Package verdicts and imported manifests are cached per
* package name and never expire — plugin-set changes take effect on restart.
*
* Manual `ctx.typert.register()` remains available for contributions
* that do not use a `./typert` artifact (hand-written wire schemas,
* tests, non-loader compositions).
*
* @module @deepseek-ai/dsh-typert-loader
*/
var __rewriteRelativeImportExtension = function(path, preserveJsx) {
	if (typeof path === "string" && /^\.\.?\//.test(path)) return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function(m, tsx, d, ext, cm) {
		return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : d + ext + "." + cm.toLowerCase() + "js";
	});
	return path;
};
/** The package.json exports key naming a package's host-face typert artifact. */
const TYPERT_HOST_EXPORT = "./typert";
/** Cordis plugin name. */
const name = "typert-loader";
/** Services required before registration: the registry this plugin feeds and the Loader it observes. */
const inject = ["typert", "loader"];
/** Validate explicit package names and default to Loader-entry discovery only. */
const Config = z.object({ packages: z.array(z.string().min(1)).default([]) });
const MEMBER_KINDS = new Set([
	"property",
	"method",
	"getter",
	"setter",
	"call",
	"construct",
	"index"
]);
/** Resolve the `./typert` export to a relative path, accepting the string and one-level conditional forms. */
function typertExportOf(pkgName, exportsField) {
	if (typeof exportsField !== "object" || exportsField === null) return void 0;
	const target = exportsField[TYPERT_HOST_EXPORT];
	if (target === void 0) return void 0;
	if (typeof target === "string") return target;
	if (typeof target === "object" && target !== null) {
		const fallback = target.default;
		if (typeof fallback === "string") return fallback;
	}
	throw new Error(`typert-loader: ${pkgName} exports["${TYPERT_HOST_EXPORT}"] must be a string or an object with a string default`);
}
/**
* Narrow a dynamically imported typert module's `TYPERT` export to a
* contribution owned by `pkgName`. This is the module/file boundary: the
* manifest crosses from a build artifact into the typed registry, so every
* field is checked and every failure names the package and the defect.
* @param pkgName - the package whose typert face was imported.
* @param exported - the module's `TYPERT` export.
* @returns the validated contribution.
*/
function validateTypertManifest(pkgName, exported) {
	if (typeof exported !== "object" || exported === null) throw new Error(`typert-loader: ${pkgName} exports "${TYPERT_HOST_EXPORT}" but its module has no TYPERT manifest object`);
	const manifest = exported;
	if (manifest.package !== pkgName) throw new Error(`typert-loader: ${pkgName} TYPERT manifest names package ${JSON.stringify(manifest.package)} — the manifest must be owned by the package that exports it`);
	if (manifest.face !== "host") throw new Error(`typert-loader: ${pkgName} exports "${TYPERT_HOST_EXPORT}" but TYPERT.face is not "host"`);
	if (!Array.isArray(manifest.schemas)) throw new Error(`typert-loader: ${pkgName} TYPERT.schemas must be an array`);
	for (const value of manifest.schemas) {
		if (typeof value !== "object" || value === null) throw new Error(`typert-loader: ${pkgName} TYPERT.schemas contains a non-object schema`);
		const schema = value;
		requireString(pkgName, schema, "name", "schema");
		if (typeof schema.schema !== "object" || schema.schema === null || !("_zod" in schema.schema)) throw new Error(`typert-loader: ${pkgName} TYPERT schema "${schema.name}" is not a zod v4 schema instance`);
	}
	const model = requireObject(pkgName, manifest.model, "TYPERT.model");
	const services = requireArray(pkgName, model.services, "TYPERT.model.services");
	const events = requireArray(pkgName, model.events, "TYPERT.model.events");
	const objects = requireArray(pkgName, model.objects, "TYPERT.model.objects");
	for (const value of services) {
		const service = requireObject(pkgName, value, "service");
		requireDocumentation(pkgName, service, "service");
		requireString(pkgName, service, "key", "service");
		requireString(pkgName, service, "exportName", "service");
		requireMembers(pkgName, service.members, `service "${service.key}"`);
		requireTypes(pkgName, service.types, `service "${service.key}"`);
	}
	for (const value of events) {
		const event = requireObject(pkgName, value, "event");
		requireDocumentation(pkgName, event, "event");
		requireString(pkgName, event, "name", "event");
		requireString(pkgName, event, "signature", `event "${event.name}"`);
		if (event.mode !== void 0 && typeof event.mode !== "string") throw new Error(`typert-loader: ${pkgName} event "${event.name}" mode must be a string`);
	}
	for (const value of objects) {
		const object = requireObject(pkgName, value, "object");
		requireDocumentation(pkgName, object, "object");
		requireString(pkgName, object, "name", "object");
		requireString(pkgName, object, "exportName", "object");
		requireMembers(pkgName, object.members, `object "${object.name}"`);
		requireTypes(pkgName, object.types, `object "${object.name}"`);
	}
	for (const value of requireArray(pkgName, manifest.invocations, "TYPERT.invocations")) requireInvocation(pkgName, value);
	return manifest;
}
function requireObject(pkgName, value, subject) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`typert-loader: ${pkgName} ${subject} must be an object`);
	return value;
}
function requireArray(pkgName, value, subject) {
	if (!Array.isArray(value)) throw new Error(`typert-loader: ${pkgName} ${subject} must be an array`);
	return value;
}
function requireString(pkgName, value, key, subject) {
	if (typeof value[key] !== "string" || value[key].length === 0) throw new Error(`typert-loader: ${pkgName} ${subject} has a missing or empty ${key}`);
}
function requireDocumentation(pkgName, value, subject) {
	requireArray(pkgName, value.tags, `${subject}.tags`);
	for (const key of [
		"description",
		"summary",
		"jsDoc"
	]) if (value[key] !== void 0 && typeof value[key] !== "string") throw new Error(`typert-loader: ${pkgName} ${subject}.${key} must be a string`);
}
function requireMembers(pkgName, value, subject) {
	for (const item of requireArray(pkgName, value, `${subject}.members`)) {
		const member = requireObject(pkgName, item, `${subject} member`);
		requireString(pkgName, member, "name", `${subject} member`);
		requireString(pkgName, member, "signature", `${subject} member`);
		if (typeof member.kind !== "string" || !MEMBER_KINDS.has(member.kind)) throw new Error(`typert-loader: ${pkgName} ${subject} member "${member.name}" has invalid kind`);
	}
}
function requireTypes(pkgName, value, subject) {
	for (const item of requireArray(pkgName, value, `${subject}.types`)) {
		const type = requireObject(pkgName, item, `${subject} type`);
		requireString(pkgName, type, "name", `${subject} type`);
		requireString(pkgName, type, "declaration", `${subject} type`);
	}
}
function requireInvocation(pkgName, value) {
	const invocation = requireObject(pkgName, value, "invocation");
	for (const key of [
		"id",
		"service",
		"namespace",
		"method"
	]) requireString(pkgName, invocation, key, "invocation");
	const id = invocation.id;
	const receiver = requireObject(pkgName, invocation.invocation, `invocation "${id}" receiver`);
	if (receiver.kind === "context") {
		requireString(pkgName, receiver, "context", `invocation "${id}" Context receiver`);
		requireString(pkgName, receiver, "wire", `invocation "${id}" Context receiver`);
		requireStrictCodec(pkgName, receiver.codec, `invocation "${id}" Context codec`);
	} else if (receiver.kind !== "direct") throw new Error(`typert-loader: ${pkgName} invocation "${id}" receiver kind must be "direct" or "context"`);
	const wires = /* @__PURE__ */ new Set();
	const parameters = /* @__PURE__ */ new Map();
	let lookupCount = 0;
	for (const valueParameter of requireArray(pkgName, invocation.parameters, `invocation "${id}" parameters`)) {
		const parameter = requireObject(pkgName, valueParameter, `invocation "${id}" parameter`);
		requireString(pkgName, parameter, "name", `invocation "${id}" parameter`);
		requireString(pkgName, parameter, "wire", `invocation "${id}" parameter`);
		const wire = parameter.wire;
		if (wires.has(wire)) throw new Error(`typert-loader: ${pkgName} invocation "${id}" repeats wire field "${wire}"`);
		wires.add(wire);
		if (parameter.source === "lookup") {
			lookupCount += 1;
			requireString(pkgName, parameter, "lookup", `invocation "${id}" lookup parameter`);
		} else if (parameter.source === "json") {
			if (parameter.lookup !== void 0) throw new Error(`typert-loader: ${pkgName} invocation "${id}" JSON parameter declares a lookup`);
		} else throw new Error(`typert-loader: ${pkgName} invocation "${id}" parameter source must be "json" or "lookup"`);
		parameters.set(wire, parameter);
		requireStrictCodec(pkgName, parameter.codec, `invocation "${id}" parameter codec`);
	}
	if (invocation.cancellation !== void 0) {
		if (requireObject(pkgName, invocation.cancellation, `invocation "${id}" cancellation`).parameter !== "signal") throw new Error(`typert-loader: ${pkgName} invocation "${id}" cancellation parameter must be "signal"`);
	}
	if (invocation.scope !== void 0) {
		if (receiver.kind !== "direct") throw new Error(`typert-loader: ${pkgName} invocation "${id}" Context receiver cannot declare a direct scope projection`);
		const scope = requireObject(pkgName, invocation.scope, `invocation "${id}" scope`);
		requireString(pkgName, scope, "context", `invocation "${id}" scope`);
		requireString(pkgName, scope, "wire", `invocation "${id}" scope`);
		const parameter = parameters.get(scope.wire);
		if (lookupCount !== 1 || parameter?.source !== "lookup" || parameter.lookup !== scope.context) throw new Error(`typert-loader: ${pkgName} invocation "${id}" scope wire "${scope.wire}" must select its only lookup parameter`);
	}
	if (receiver.kind === "context" && wires.has(receiver.wire)) throw new Error(`typert-loader: ${pkgName} invocation "${id}" repeats Context wire field "${receiver.wire}"`);
	requireStrictCodec(pkgName, invocation.result, `invocation "${id}" result codec`);
	if (invocation.sourceLocation !== void 0) {
		const location = requireObject(pkgName, invocation.sourceLocation, `invocation "${id}" sourceLocation`);
		requireString(pkgName, location, "file", `invocation "${id}" sourceLocation`);
		for (const key of ["line", "column"]) if (!Number.isInteger(location[key]) || location[key] < 1) throw new Error(`typert-loader: ${pkgName} invocation "${id}" sourceLocation.${key} must be a positive integer`);
	}
}
function requireStrictCodec(pkgName, value, subject) {
	const codec = requireObject(pkgName, value, subject);
	if (codec.mode !== "strict") throw new Error(`typert-loader: ${pkgName} ${subject} must use a strict codec`);
	requireString(pkgName, codec, "typeSymbol", subject);
	if (typeof codec.schema !== "object" || codec.schema === null || !("_zod" in codec.schema) || typeof codec.schema.parse !== "function") throw new Error(`typert-loader: ${pkgName} ${subject} is not backed by a zod v4 schema`);
}
/**
* Scan current Loader entries during activation, then follow entry mounts and
* unmounts for this plugin's lifetime.
* @param ctx - plugin context carrying `typert` and `loader`.
* @param config - explicit package artifacts in addition to Loader entries.
*/
async function apply(ctx, config) {
	if (ctx.baseUrl === void 0) throw new Error("typert-loader: ctx.baseUrl is unset — the loader needs the config-tree anchor to resolve plugin packages");
	const require = createRequire(ctx.baseUrl);
	const configured = new Set(config.packages);
	const registered = /* @__PURE__ */ new Map();
	const pending = /* @__PURE__ */ new Map();
	const artifactPath = /* @__PURE__ */ new Map();
	const manifests = /* @__PURE__ */ new Map();
	const dirty = /* @__PURE__ */ new Set();
	let flushQueued = false;
	let active = true;
	ctx.effect(function* () {
		yield () => {
			active = false;
			dirty.clear();
		};
	}, "typert loader lifetime");
	const resolveArtifact = (pkgName) => {
		const cached = artifactPath.get(pkgName);
		if (cached !== void 0) return cached;
		let pkgPath;
		try {
			pkgPath = require.resolve(`${pkgName}/package.json`);
		} catch (cause) {
			if (configured.has(pkgName)) throw new Error(`typert-loader: configured package "${pkgName}" cannot be resolved from the config tree — add it to the composition package dependencies or remove it from packages`, { cause });
			artifactPath.set(pkgName, null);
			return null;
		}
		const rel = typertExportOf(pkgName, JSON.parse(readFileSync(pkgPath, "utf8")).exports);
		if (rel === void 0 && configured.has(pkgName)) throw new Error(`typert-loader: configured package "${pkgName}" does not export "${TYPERT_HOST_EXPORT}"`);
		const resolved = rel === void 0 ? null : join(dirname(pkgPath), rel);
		artifactPath.set(pkgName, resolved);
		return resolved;
	};
	const loadManifest = (pkgName, path) => {
		let loading = manifests.get(pkgName);
		if (loading === void 0) {
			loading = import(__rewriteRelativeImportExtension(pathToFileURL(path).href)).then((mod) => validateTypertManifest(pkgName, mod.TYPERT), (cause) => {
				throw new Error(`typert-loader: ${pkgName} exports "${TYPERT_HOST_EXPORT}" but importing ${path} failed: ${String(cause)}`);
			});
			manifests.set(pkgName, loading);
		}
		return loading;
	};
	const qualifies = (entryName) => {
		if (configured.has(entryName)) return true;
		for (const entry of ctx.loader.entries()) if (entry.options.name === entryName && entry.fiber !== void 0 && !entry.disabled) return true;
		return false;
	};
	/** Reconcile one entry name against the live loader entries; a mount returns its async task. */
	const processOne = (entryName) => {
		if (!qualifies(entryName)) {
			const dispose = registered.get(entryName);
			if (dispose !== void 0) {
				registered.delete(entryName);
				return dispose();
			}
			return;
		}
		if (registered.has(entryName) || pending.has(entryName)) return void 0;
		const path = resolveArtifact(entryName);
		if (path === null) return void 0;
		const task = loadManifest(entryName, path).then((manifest) => {
			if (!active || !qualifies(entryName) || registered.has(entryName)) return;
			registered.set(entryName, ctx.typert.register(manifest));
		});
		pending.set(entryName, task);
		const settle = () => {
			pending.delete(entryName);
		};
		task.then(settle, settle);
		return task;
	};
	const flush = (onError) => {
		const tasks = [];
		for (const entryName of [...dirty]) {
			dirty.delete(entryName);
			try {
				const task = processOne(entryName);
				if (task !== void 0) tasks.push(task.catch((error) => {
					onError(toError(error));
				}));
			} catch (error) {
				onError(toError(error));
			}
		}
		return tasks;
	};
	ctx.on("internal/plugin", (fiber) => {
		const entryName = fiber.entry?.options.name;
		if (entryName === void 0) return;
		dirty.add(entryName);
		if (flushQueued) return;
		flushQueued = true;
		queueMicrotask(() => {
			flushQueued = false;
			if (!active) return;
			for (const task of flush((err) => {
				ctx.logger.error(err);
			}));
		});
	});
	for (const packageName of configured) dirty.add(packageName);
	for (const entry of ctx.loader.entries()) dirty.add(entry.options.name);
	const failures = [];
	await Promise.all(flush((err) => {
		failures.push(err);
	}));
	if (failures.length > 0) throw new AggregateError(failures, `typert-loader: ${String(failures.length)} typert contributor(s) failed to register:\n${failures.map((e) => `  - ${e.message}`).join("\n")}`);
}
/** Normalize an arbitrary import or manifest failure to an Error. */
function toError(error) {
	return error instanceof Error ? error : new Error(String(error));
}
//#endregion
export { Config, TYPERT_HOST_EXPORT, apply, inject, name, validateTypertManifest };
