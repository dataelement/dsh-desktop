import { createRequire } from "node:module";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Service } from "@deepseek-ai/cordis";
//#region lib/types/client/manifest.js
/**
* Client module system: the browser peer of Node's internal ESM loader, built
* as a lazy CJS table. The vendored cordis Loader consumes this object
* through its `internal` contract (the only call site is `EntryTree.import` →
* `internal.import`), which keeps entry governance (fiber lifecycle, inject
* waiting, update/refresh) entirely on the vendored side while this package
* owns code arrival.
*
* Lazy CJS model: executing a plugin bundle only REGISTERS its
* factory (`window.__ModuleLoader__.load({id, factory})`); every module body
* side effect — including CSS injection — lives inside the factory closure
* and runs at materialization, not at script execution. Materialization
* (factory(require) → exports) happens on first import/require and is
* memoized in {@link ClientModuleLoader.loadCache}; a factory that requires
* another registered-but-unmaterialized module materializes it recursively,
* so load order needs no external sequencing.
*
* Resolution branch order (import): seed word → shell instance; memoized
* record → exports; graph row → register its dependency factories and own
* factory; registered factory → materialize; anything else → throw (loud —
* the runtime mirror of the build-time bundle purity gate).
* The synchronous `require` handed to factories walks the same order minus
* the load branch. Loading is async, so a requested dynamic package must have
* registered its factory before a consumer materializes.
*
* This file is the browser-safe contract face (zero node imports): the
* `__DSH_BOOT__` wire types, the boot-manifest parser, and the boundaries around
* {@link ClientModuleSystem}. The package root is the host-side service that
* composes the wire.
*/
/**
* Validate an optional string-array field read from a `dsh.client` declaration
* or from the boot wire.
* @param subject - diagnostic prefix naming the package or the wire row.
* @param field - field name as it appears in the diagnostic.
* @param value - the raw field value.
* @returns the validated array, or undefined when the field is absent.
* @throws {Error} when the value is present but is not an array of strings.
*/
function optionalStringArray(subject, field, value) {
	if (value === void 0) return void 0;
	if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw new Error(`client-modules: ${subject} ${field} must be a string array`);
	return value;
}
/**
* Normalize a module specifier onto the graph row that owns it: a plugin bundle
* IS its package's client half, so `<id>/client` (the exports subpath external
* bundles emit) and the bare package name resolve to the same exports. Both the
* require path and graph composition normalize here, which is what lets each
* importing package request the subpath its own code imports.
* @param spec - module specifier as a bundle requires it or a declaration spells it.
* @returns the specifier with a trailing `/client` removed.
*/
function stripClientSuffix(spec) {
	return spec.endsWith("/client") ? spec.slice(0, -7) : spec;
}
//#endregion
//#region lib/types/index.js
/**
* Node half of the client module system (`dsh.client` dual-face package): scans
* the host Loader's entries for packages declaring `dsh.client`, composes the
* `window.__DSH_BOOT__` entry graph (wire single source: {@link WebBootEntry}
* in `./client/manifest.ts`) in module-graph order, serves one-or-more-plugin
* combo scripts plus their source maps,
* contributes the registration facade, application preloads, bootstrap scripts,
* and graph to the webserver's index injection table, and provides the
* `clientModuleHost` service (the HMR node half's registration/notification
* face).
*
* Scanning is incremental per package — there is no full-rescan code path.
* Every cordis `internal/plugin` emission (fiber construction/disposal) marks
* the fiber's entry name dirty; a microtask flush reconciles each dirty name
* against the live loader entries. The activation pass seeds the same dirty
* set with all current entries and flushes synchronously, so first scan and
* steady state share one implementation. Package metadata (including the
* negative "not a client package" verdict) is cached per Loader specifier and
* owning-tree base URL until restart. The manifest package name identifies
* the browser module; distinct active Loader sources for that package are a
* composition error. Bundle content changes reach the graph only through
* {@link ClientModuleRegistry.rebuilt}.
* @module @deepseek-ai/dsh-client-modules
*/
/** Recovery instruction shared by grouped startup and steady-state bundle diagnostics. */
const CLIENT_BUNDLE_BUILD_INSTRUCTION = "run `pnpm run build` before launch";
/** Missing built client export, retained as structured data for activation-error grouping. */
var MissingClientBundleError = class extends Error {
	packageName;
	clientPath;
	constructor(packageName, clientPath, cause) {
		super([
			`client-modules: client bundle not found; ${CLIENT_BUNDLE_BUILD_INSTRUCTION}:`,
			`  package: ${packageName}`,
			`  path: ${clientPath}`
		].join("\n"), { cause });
		this.packageName = packageName;
		this.clientPath = clientPath;
	}
};
/** Activation failures grouped by actionable package-build errors and unrelated failures. */
var ClientPackageCompositionError = class extends AggregateError {
	constructor(failures) {
		const missingBundles = failures.filter((error) => error instanceof MissingClientBundleError);
		const otherFailures = failures.filter((error) => !(error instanceof MissingClientBundleError));
		const packageNoun = failures.length === 1 ? "package" : "packages";
		const lines = [`client-modules: ${String(failures.length)} client ${packageNoun} failed to compose:`];
		if (missingBundles.length > 0) {
			lines.push(`  client bundles not found; ${CLIENT_BUNDLE_BUILD_INSTRUCTION}:`);
			for (const error of missingBundles) lines.push(`    - package: ${error.packageName}`, `      path: ${error.clientPath}`);
		}
		if (otherFailures.length > 0) lines.push("  other failures:", ...otherFailures.map((error) => `    - ${error.message}`));
		super(failures, lines.join("\n"));
	}
};
/** Versioned code is immutable; mismatched revisions are rejected instead of serving newer bytes. */
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
/** Generated request URLs stay below conservative browser and intermediary request-target limits. */
const MAX_COMBO_URL_BYTES = 3 * 1024;
const HASH_REVISION_LENGTH = 12;
const COMBO_REVISION_PLACEHOLDER = "0".repeat(HASH_REVISION_LENGTH);
/** Source-map trailer emitted by tsdown at the end of every client bundle. */
const SOURCE_MAP_TRAILER = /(?:\r?\n)?\/\/# sourceMappingURL=[^\r\n]*(?:\r?\n)?$/;
/** Debugger source name appended to page bundles in the WebWorker image. */
const SOURCE_URL_TRAILER = /(?:\r?\n)?\/\/# sourceURL=([^\r\n]+)(?:\r?\n)?$/;
/** Return a bare package-root specifier, excluding package subpaths and path-like entries. */
function exactPackageSpecifier(specifier) {
	if (specifier.startsWith("@")) {
		const parts = specifier.split("/");
		return parts.length === 2 && parts.every(Boolean) ? specifier : void 0;
	}
	return specifier.length > 0 && !specifier.includes("/") ? specifier : void 0;
}
/** Narrow an unknown parsed JSON value to the `dsh.client` declaration, throwing on malformed fields. */
function parseDshClient(pkgName, value) {
	if (value === void 0) return void 0;
	if (typeof value !== "object" || value === null) throw new Error(`client-modules: ${pkgName} has a non-object dsh.client declaration`);
	const decl = value;
	if (typeof decl.platform !== "string") throw new Error(`client-modules: ${pkgName} dsh.client.platform must be a string`);
	const inject = optionalStringArray(pkgName, "dsh.client.inject", decl.inject);
	const external = optionalStringArray(pkgName, "dsh.client.external", decl.external);
	if (decl.immediately !== void 0 && typeof decl.immediately !== "boolean") throw new Error(`client-modules: ${pkgName} dsh.client.immediately must be a boolean`);
	return {
		platform: decl.platform,
		...inject !== void 0 ? { inject } : {},
		...external !== void 0 ? { external } : {},
		...decl.immediately !== void 0 ? { immediately: decl.immediately } : {}
	};
}
/** Resolve `exports["./client"]` to a relative path, accepting the string and one-level conditional forms. */
function clientExportOf(pkgName, exportsField) {
	if (typeof exportsField !== "object" || exportsField === null) return void 0;
	const client = exportsField["./client"];
	if (client === void 0) return void 0;
	if (typeof client === "string") return client;
	if (typeof client === "object" && client !== null) {
		const fallback = client.default;
		if (typeof fallback === "string") return fallback;
	}
	throw new Error(`client-modules: ${pkgName} exports["./client"] must be a string or an object with a string default`);
}
/** sha1 content hash shortened to 12 hex chars (combo / graph / rebuilt-artifact rev). */
function shortHash(input) {
	return createHash("sha1").update(input).digest("hex").slice(0, HASH_REVISION_LENGTH);
}
/** Hash several response fields without allowing bytes to move across field boundaries. */
function framedHash(domain, parts) {
	const hash = createHash("sha1").update(domain).update("\0");
	for (const part of parts) hash.update(`${String(part.byteLength)}:`).update(part);
	return hash.digest("hex").slice(0, HASH_REVISION_LENGTH);
}
/** Hash every artifact input served after HMR observes one plugin change. */
function artifactRevision(bundle, sourceMap) {
	return framedHash("plugin-artifact", sourceMap === void 0 ? [bundle] : [bundle, sourceMap.body]);
}
/** Address one ordered plugin-file list through the shared combo route. */
function comboUrl(ids, rev, sourceMap = false) {
	return `/plugins/??${ids.map((id) => `${id}/client.js${sourceMap ? ".map" : ""}`).join(",")}&rev=${rev}`;
}
/** Measure the longer map-form URL used to partition a startup resource list. */
function projectedComboUrlBytes(records) {
	return Buffer.byteLength(comboUrl(records.map((record) => record.entry.id), COMBO_REVISION_PLACEHOLDER, true));
}
/** Partition one phase in graph order without allowing a generated URL above the protocol limit. */
function partitionComboRecords(records) {
	const chunks = [];
	let current = [];
	for (const record of records) {
		const candidate = [...current, record];
		if (projectedComboUrlBytes(candidate) <= MAX_COMBO_URL_BYTES) {
			current = candidate;
			continue;
		}
		if (current.length === 0) throw new Error(`client-modules: ${record.entry.id} exceeds the ${String(MAX_COMBO_URL_BYTES)}-byte combo URL limit`);
		chunks.push(current);
		current = [record];
		if (projectedComboUrlBytes(current) > MAX_COMBO_URL_BYTES) throw new Error(`client-modules: ${record.entry.id} exceeds the ${String(MAX_COMBO_URL_BYTES)}-byte combo URL limit`);
	}
	if (current.length > 0) chunks.push(current);
	return chunks;
}
/** Remove bundle-local debug directives and retain their stable generated-file name. */
function comboSource(record) {
	let source = record.bundle.toString("utf8");
	const sourceUrl = SOURCE_URL_TRAILER.exec(source)?.[1];
	source = source.replace(SOURCE_URL_TRAILER, "").replace(SOURCE_MAP_TRAILER, "");
	if (!source.endsWith("\n")) source += "\n";
	const fallbackSource = sourceUrl === void 0 ? `/plugins/${record.entry.id}/client.js` : /^(?:[A-Za-z][A-Za-z\d+.-]*:|\/)/.test(sourceUrl) ? sourceUrl : `/${sourceUrl}`;
	return {
		source,
		fallbackSource
	};
}
/** Stamp a combo script's absolute indexed-map URL onto its executable bytes. */
function comboScript(input, sourceMapUrl) {
	return Buffer.from(sourceMapUrl === void 0 ? input : `${input}//# sourceMappingURL=${sourceMapUrl}\n`);
}
/** Parse an optional source-map artifact; missing maps do not prevent plugin execution. */
function sourceMapSnapshot(clientPath) {
	let body;
	try {
		body = readFileSync(`${clientPath}.map`);
	} catch (error) {
		if (error.code === "ENOENT") return void 0;
		throw error;
	}
	const value = JSON.parse(body.toString("utf8"));
	const parsed = typeof value === "object" && value !== null ? value : void 0;
	if (parsed === void 0 || parsed.version !== 3 || !Array.isArray(parsed.sources) || parsed.sources.some((source) => typeof source !== "string") || !Array.isArray(parsed.names) || parsed.names.some((name) => typeof name !== "string") || typeof parsed.mappings !== "string") throw new Error(`client-modules: ${clientPath}.map is not a regular Source Map v3 object`);
	return {
		body,
		parsed
	};
}
/** Count generated lines while assembling indexed-map section offsets. */
function newlineCount(value) {
	let count = 0;
	for (const char of value) if (char === "\n") count += 1;
	return count;
}
/** Resolve section sources against their original per-plugin map URL before combo relocation. */
function comboSectionMap(record) {
	const original = record.sourceMap?.parsed;
	/* v8 ignore next -- callers add sections only for records with a source map. */
	if (original === void 0) throw new Error(`client-modules: source map missing for ${record.entry.id}`);
	const sourcePaths = original.sources;
	const sourceRoot = typeof original.sourceRoot === "string" ? original.sourceRoot : "";
	const base = new URL(`/plugins/${record.entry.id}/client.js.map`, "http://dsh.invalid");
	const relocated = sourcePaths.map((source) => {
		const separator = sourceRoot !== "" && !sourceRoot.endsWith("/") && !source.startsWith("/") ? "/" : "";
		const resolved = new URL(`${sourceRoot}${separator}${source}`, base);
		return resolved.origin === base.origin ? `${resolved.pathname}${resolved.search}${resolved.hash}` : resolved.href;
	});
	const section = {
		...original,
		sources: relocated
	};
	delete section.sourceRoot;
	return section;
}
/** Map each generated line to the same line in a bundled JavaScript source. */
function identitySectionMap(source, sourceUrl) {
	const mappings = Array.from({ length: newlineCount(source) }, (_, index) => index === 0 ? "AAAA" : "AACA").join(";");
	return {
		version: 3,
		names: [],
		sources: [sourceUrl],
		sourcesContent: [source],
		mappings
	};
}
/** Concatenate one or more factory registrations and compose their maps as indexed sections. */
function buildCombo(records, revision) {
	let source = "";
	const sections = [];
	let line = 0;
	for (const record of records) {
		const prepared = comboSource(record);
		const section = record.sourceMap === void 0 ? identitySectionMap(prepared.source, prepared.fallbackSource) : comboSectionMap(record);
		sections.push({
			offset: {
				line,
				column: 0
			},
			map: section
		});
		const bundle = `${prepared.source};\n`;
		source += bundle;
		line += newlineCount(bundle);
	}
	const sourceMap = Buffer.from(`${JSON.stringify({
		version: 3,
		file: "client.js",
		sections
	})}\n`);
	const sourceBytes = Buffer.from(source);
	const rev = revision ?? framedHash("combo", [sourceBytes, sourceMap]);
	const entries = records.map((record) => record.entry.id);
	const url = comboUrl(entries, rev);
	const sourceMapUrl = comboUrl(entries, rev, true);
	return {
		url,
		rev,
		entries,
		script: comboScript(source, sourceMapUrl),
		sourceMap,
		sourceMapUrl
	};
}
/** Add initial-load scheduling metadata to a combo artifact. */
function buildBatch(phase, records) {
	const artifact = buildCombo(records);
	return {
		...artifact,
		descriptor: {
			phase,
			url: artifact.url,
			rev: artifact.rev,
			entries: artifact.entries
		}
	};
}
/** Graph row for one bundle rev (url carries the rev as its cache-busting query). */
function graphRow(id, rev, fields) {
	return {
		id,
		url: comboUrl([id], rev),
		rev,
		...fields.inject !== void 0 ? { inject: fields.inject } : {},
		...fields.immediately ? { immediately: true } : {},
		...fields.external.length > 0 ? { external: fields.external } : {}
	};
}
/**
* Order composed rows so every requested dynamic package precedes its
* consumers. An `external` specifier is either the package row it names
* (`<pkg>/client` aliases the bare package) or a static-table name that adds no
* graph edge.
* @param entries - composed rows in scan order.
* @returns the same rows reordered; scan order breaks every tie.
* @throws {Error} when a row requests itself or when the module graph has a
* cycle; the message lists the packages on it.
*/
function orderByModuleGraph(entries) {
	const rowsById = /* @__PURE__ */ new Map();
	for (const entry of entries) rowsById.set(entry.id, entry);
	const ordered = [];
	const placed = /* @__PURE__ */ new Set();
	const open = [];
	const visit = (entry) => {
		if (placed.has(entry.id)) return;
		const cycleStart = open.indexOf(entry.id);
		if (cycleStart !== -1) throw new Error(`client-modules: module graph cycle ${[...open.slice(cycleStart), entry.id].join(" -> ")} — a requested package row must precede its consumers, and factory-form CJS cannot deliver partial exports`);
		open.push(entry.id);
		for (const name of entry.external ?? []) {
			const dependency = rowsById.get(name) ?? rowsById.get(stripClientSuffix(name));
			if (dependency === entry) throw new Error(`client-modules: "${entry.id}" requests module "${name}" that it answers itself — a row must not declare its own package in dsh.client.external`);
			if (dependency !== void 0) visit(dependency);
		}
		open.pop();
		placed.add(entry.id);
		ordered.push(entry);
	};
	for (const entry of entries) visit(entry);
	return ordered;
}
/** Bootstrap package whose ordinary client bundle supplies the module-system implementation. */
const CLIENT_MODULES_ID = "@deepseek-ai/dsh-client-modules";
/** Dynamic bundles grouped into the parser bootstrap batch before the Vite shell. */
const PARSER_PRELOAD_IDS = [CLIENT_MODULES_ID];
/**
* The boot protocol as index injection rows. The inline registration queue
* precedes the application-batch preload and the blocking bootstrap batch. Its
* `create()` method materializes the modules
* bundle, delegates construction to that bundle, and leaves the same facade
* in live-registration mode. The graph global follows before the shell reads
* it.
* @param graph - the composed entry graph.
* @returns head rows in execution order: queue script, application preloads,
* blocking bootstrap scripts, graph global.
*/
function bootInjections(graph) {
	const queue = `(()=>{
const pendingQueue=[]
window.__ModuleLoader__={
  mode:"queue",
  pendingQueue,
  load(registration){pendingQueue.push(registration)},
  create(options){
    if(this.mode!=="queue")throw new Error("client-modules: window.__ModuleLoader__.create called after module-system boot")
    const index=pendingQueue.findIndex(registration=>registration.id===${JSON.stringify(CLIENT_MODULES_ID)})
    const registration=pendingQueue[index]
    if(registration===undefined)throw new Error("client-modules: HTML did not preload ${CLIENT_MODULES_ID}/client.js")
    pendingQueue.splice(index,1)
    const exports=registration.factory(specifier=>{
      throw new Error('client-modules: ${CLIENT_MODULES_ID}/client.js requested external "'+specifier+'" before the module system existed')
    })
    if(typeof exports!=="object"||exports===null||typeof exports.createClientModuleSystem!=="function"||typeof exports.apply!=="function"){
      throw new Error("client-modules: ${CLIENT_MODULES_ID}/client.js did not export the bootstrap module face")
    }
    return exports.createClientModuleSystem(this,{id:registration.id,exports},options)
  }
}
})()`;
	const bootstrap = graph.batches.filter((batch) => batch.phase === "bootstrap");
	const application = graph.batches.filter((batch) => batch.phase === "application");
	const rows = [{
		kind: "script",
		placement: "head",
		text: queue
	}];
	for (const batch of application) rows.push({
		kind: "script-preload",
		src: batch.url
	});
	for (const batch of bootstrap) rows.push({
		kind: "script-src",
		placement: "head",
		src: batch.url
	});
	rows.push({
		kind: "global",
		name: "__DSH_BOOT__",
		value: graph
	});
	return rows;
}
/**
* The web plugin table service: incremental `dsh.client` scan + wire composition
* + bundle route + index injection rows. Construction runs the activation scan
* synchronously — a malformed declaration or missing bundle among the
* already-loaded entries aggregates into one loud throw (FAILED fiber; the
* boot activation audit reports it).
*/
var ClientModuleRegistry = class extends Service {
	static inject = ["loader"];
	table = /* @__PURE__ */ new Map();
	sources = /* @__PURE__ */ new Map();
	pkgMeta = /* @__PURE__ */ new Map();
	rebuildListeners = /* @__PURE__ */ new Set();
	graphListeners = /* @__PURE__ */ new Set();
	dirty = /* @__PURE__ */ new Set();
	initialRevisionNonce = randomBytes(8).toString("hex");
	nextInitialRevision = 0;
	responses = /* @__PURE__ */ new Map();
	batchResponses = /* @__PURE__ */ new Map();
	/** One prior graph generation covers a request racing the HMR recomposition that replaced its URL. */
	previousBatchResponses = /* @__PURE__ */ new Map();
	flushQueued = false;
	composed;
	/**
	* Build the service: subscribe, seed, and run the activation flush.
	* @param ctx - plugin context carrying Loader and an optional Web carrier.
	*/
	constructor(ctx) {
		super(ctx, "clientModules");
		ctx.on("internal/plugin", (fiber) => {
			const entryName = fiber.entry?.options.name;
			if (entryName === void 0) return;
			this.dirty.add(entryName);
			if (this.flushQueued) return;
			this.flushQueued = true;
			queueMicrotask(() => {
				this.flushQueued = false;
				this.flush((err) => {
					ctx.logger.warn(err);
				});
			});
		});
		for (const entry of ctx.loader.entries()) this.dirty.add(entry.options.name);
		this.composed = this.compose();
		const failures = [];
		this.flush((err) => failures.push(err));
		if (failures.length > 0) throw new ClientPackageCompositionError(failures);
		const registerWebCarrier = (webCtx) => {
			webCtx.effect(() => webCtx.webServer.register({
				kind: "prefix",
				path: "/plugins",
				handler: this.serveBundle
			}), "client-modules: bundle route");
		};
		if (ctx.get("webServer") === void 0) ctx.inject(["webServer"], registerWebCarrier);
		else registerWebCarrier(ctx);
		ctx.on("webserver/index-inject", (table) => {
			table.push(...bootInjections(this.composed));
		});
	}
	/**
	* Current composed entry graph (stable object between changes).
	* @returns the graph served as `window.__DSH_BOOT__`.
	*/
	graph() {
		return this.composed;
	}
	/**
	* Absolute path of an entry's client bundle.
	* @param id - entry id (package name).
	* @returns the path, or undefined for an unknown id.
	*/
	clientPath(id) {
		return this.table.get(id)?.meta.clientPath;
	}
	/**
	* Serve an advertised revisioned bundle or source map without a Web server.
	* Unknown URLs return 404, unsupported methods return 405, and `HEAD`
	* returns the same immutable headers without a body.
	* @param request - shell-carrier request for a `/plugins` resource.
	* @returns the exact response also exposed by the optional Web route.
	*/
	fetchBundle(request) {
		const resource = this.bundleResource(request.method, request.url);
		const body = resource.body === void 0 ? null : Uint8Array.from(resource.body);
		return new Response(body, {
			status: resource.status,
			...resource.headers === void 0 ? {} : { headers: resource.headers }
		});
	}
	/**
	* Filesystem baseline captured before an entry's current bytes were read.
	* HMR compares it with the live files when installing a watch, so a write
	* between startup composition and watch installation cannot disappear into
	* the watcher's initial state.
	* @param id - entry id (package name).
	* @returns the path and baseline, or undefined for an unknown id.
	*/
	artifactBaseline(id) {
		const baseline = this.table.get(id)?.baseline;
		return baseline === void 0 ? void 0 : { ...baseline };
	}
	/**
	* Re-hash one bundle (the HMR watch's registration hook — the only entry
	* point through which bundle content changes reach the graph).
	* @param id - entry id (package name).
	* @returns the new rev, or undefined for an unknown id.
	*/
	rebuilt(id) {
		const record = this.table.get(id);
		if (record === void 0) return void 0;
		const baseline = this.captureArtifactBaseline(record.meta.clientPath);
		const bundle = readFileSync(record.meta.clientPath);
		const sourceMap = this.readSourceMapSnapshot(record.meta.clientPath);
		const rev = artifactRevision(bundle, sourceMap);
		record.baseline = baseline;
		if (rev === record.entry.rev) return rev;
		record.entry = graphRow(id, rev, record.meta);
		record.bundle = bundle;
		if (sourceMap === void 0) delete record.sourceMap;
		else record.sourceMap = sourceMap;
		this.composed = this.compose();
		for (const notify of this.rebuildListeners) try {
			notify(id, rev);
		} catch (error) {
			this.ctx.logger.error(error);
		}
		this.notifyGraphChanged();
		return rev;
	}
	/**
	* Subscribe to bundle rebuilds; fires only when the re-hash changed the rev.
	* @param listener - receives the entry id and its new bundle rev.
	* @returns the unsubscriber.
	*/
	onRebuilt(listener) {
		this.rebuildListeners.add(listener);
		return () => {
			this.rebuildListeners.delete(listener);
		};
	}
	/**
	* Fires after any flush that recomposed the graph (row added/removed, or a
	* rebuilt rev change). Pull model: listeners re-read {@link graph}.
	* @param listener - notified with no payload.
	* @returns the unsubscriber.
	*/
	onGraphChanged(listener) {
		this.graphListeners.add(listener);
		return () => {
			this.graphListeners.delete(listener);
		};
	}
	compose() {
		const entries = orderByModuleGraph([...this.table.values()].map((record) => record.entry));
		const bootstrap = PARSER_PRELOAD_IDS.map((id) => this.table.get(id)).filter((record) => record !== void 0);
		const bootstrapIds = new Set(bootstrap.map((record) => record.entry.id));
		const application = entries.filter((entry) => !bootstrapIds.has(entry.id)).map((entry) => this.table.get(entry.id)).filter((record) => record !== void 0);
		const artifacts = [];
		for (const records of partitionComboRecords(bootstrap)) artifacts.push(buildBatch("bootstrap", records));
		for (const records of partitionComboRecords(application)) artifacts.push(buildBatch("application", records));
		const batchResponses = /* @__PURE__ */ new Map();
		for (const artifact of artifacts) {
			batchResponses.set(artifact.descriptor.url, {
				body: artifact.script,
				contentType: "text/javascript; charset=utf-8"
			});
			batchResponses.set(artifact.sourceMapUrl, {
				body: artifact.sourceMap,
				contentType: "application/json; charset=utf-8"
			});
		}
		const responses = new Map(batchResponses);
		for (const record of this.table.values()) {
			const artifact = buildCombo([record], record.entry.rev);
			responses.set(artifact.url, {
				body: artifact.script,
				contentType: "text/javascript; charset=utf-8"
			});
			responses.set(artifact.sourceMapUrl, {
				body: artifact.sourceMap,
				contentType: "application/json; charset=utf-8"
			});
		}
		this.previousBatchResponses = this.batchResponses;
		this.batchResponses = batchResponses;
		this.responses = responses;
		const batches = artifacts.map((artifact) => artifact.descriptor);
		return {
			rev: shortHash(JSON.stringify({
				entries,
				batches
			})),
			entries,
			batches
		};
	}
	notifyGraphChanged() {
		for (const listener of this.graphListeners) try {
			listener();
		} catch (error) {
			this.ctx.logger.error(error);
		}
	}
	resolveMeta(loaderName, baseUrl) {
		const sourceKey = this.sourceKey(loaderName, baseUrl);
		const cached = this.pkgMeta.get(sourceKey);
		if (cached !== void 0) return cached;
		const located = this.locatePkgJson(loaderName, baseUrl);
		if (located === void 0) {
			this.pkgMeta.set(sourceKey, null);
			return null;
		}
		const { packageName, path: pkgPath } = located;
		const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
		const dsh = pkg.dsh;
		const decl = parseDshClient(packageName, dsh !== null && typeof dsh === "object" ? dsh.client : void 0);
		if (decl === void 0 || decl.platform !== "web") {
			this.pkgMeta.set(sourceKey, null);
			return null;
		}
		const clientRel = clientExportOf(packageName, pkg.exports);
		if (clientRel === void 0) throw new Error(`client-modules: ${packageName} declares dsh.client but exports no "./client" bundle`);
		const resolved = {
			packageName,
			meta: {
				clientPath: join(dirname(pkgPath), clientRel),
				...decl.inject !== void 0 ? { inject: decl.inject } : {},
				external: decl.external ?? [],
				immediately: decl.immediately === true
			}
		};
		this.pkgMeta.set(sourceKey, resolved);
		return resolved;
	}
	/**
	* Locate the manifest of the package the Loader mounts for a row. The row's
	* module location is authoritative: the specifier resolves through the same
	* Loader resolution that imported the row's host half — including any
	* active ESM hooks — and the nearest ancestor manifest declaring the name
	* owns the module. Tree-anchored `require` resolution remains only for
	* runtimes without Node internals.
	* @param loaderName - module specifier of the loader row.
	* @param baseUrl - resolution base of the tree that owns the row.
	* @returns the manifest path, or `undefined` when the name resolves to no package root.
	*/
	locatePkgJson(loaderName, baseUrl) {
		if (loaderName.startsWith("cordis:")) return void 0;
		const pathLike = loaderName.startsWith(".") || loaderName.startsWith("file:") || isAbsolute(loaderName);
		const expectedPackageName = pathLike ? void 0 : exactPackageSpecifier(loaderName);
		if (!pathLike && expectedPackageName === void 0) return void 0;
		const internal = this.ctx.loader.internal;
		if (internal === void 0 || typeof Reflect.get(internal, "resolveSync") !== "function") {
			if (expectedPackageName === void 0) {
				const moduleUrl = loaderName.startsWith("file:") ? loaderName : isAbsolute(loaderName) ? pathToFileURL(loaderName).href : new URL(loaderName, baseUrl).href;
				return this.nearestPackage(moduleUrl);
			}
			try {
				return {
					path: createRequire(baseUrl).resolve(`${expectedPackageName}/package.json`),
					packageName: expectedPackageName
				};
			} catch {
				return;
			}
		}
		let moduleUrl;
		try {
			moduleUrl = internal.version === "v2" ? internal.resolveSync(baseUrl, {
				specifier: loaderName,
				attributes: {}
			}).url : internal.resolveSync(loaderName, baseUrl, {}).url;
		} catch {
			return;
		}
		return this.nearestPackage(moduleUrl, expectedPackageName);
	}
	nearestPackage(moduleUrl, expectedPackageName) {
		if (!moduleUrl.startsWith("file:")) return void 0;
		let dir = dirname(fileURLToPath(moduleUrl));
		while (true) {
			const candidate = join(dir, "package.json");
			if (existsSync(candidate)) try {
				const name = JSON.parse(readFileSync(candidate, "utf8")).name;
				if (typeof name === "string" && (expectedPackageName === void 0 || name === expectedPackageName)) return {
					path: candidate,
					packageName: name
				};
			} catch {}
			const parent = dirname(dir);
			if (parent === dir) break;
			dir = parent;
		}
	}
	sourceKey(loaderName, baseUrl) {
		return `${baseUrl}\0${loaderName}`;
	}
	/** Capture the bundle stats before reading its bytes. */
	captureArtifactBaseline(clientPath) {
		const bundle = statSync(clientPath);
		return {
			path: clientPath,
			mtimeMs: bundle.mtimeMs,
			size: bundle.size
		};
	}
	/** Allocate an opaque initial row revision without inspecting artifact bytes. */
	allocateInitialRevision() {
		return `${this.initialRevisionNonce}-${String(this.nextInitialRevision++)}`;
	}
	/**
	* Read the activation-time bundle and optional source-map snapshots.
	* @param pkgName - package that declares the client bundle.
	* @param clientPath - absolute path of the built client artifact.
	* @returns the immutable bytes plus the pre-read filesystem baseline.
	* @throws {MissingClientBundleError} when the read fails with `ENOENT`; other filesystem errors are rethrown unchanged.
	*/
	initialBundleSnapshot(pkgName, clientPath) {
		try {
			const baseline = this.captureArtifactBaseline(clientPath);
			const bundle = readFileSync(clientPath);
			const sourceMap = this.readSourceMapSnapshot(clientPath);
			return {
				bundle,
				baseline,
				...sourceMap === void 0 ? {} : { sourceMap }
			};
		} catch (error) {
			if (error.code !== "ENOENT") throw error;
			throw new MissingClientBundleError(pkgName, clientPath, error);
		}
	}
	/** Treat a missing, torn, or malformed development map as an identity-mapped artifact revision. */
	readSourceMapSnapshot(clientPath) {
		try {
			return sourceMapSnapshot(clientPath);
		} catch (error) {
			this.ctx.logger.warn(error);
			return;
		}
	}
	/** Reconcile one entry name against the live Loader sources. @returns whether the table changed. */
	processOne(entryName, onError) {
		const nextSources = /* @__PURE__ */ new Map();
		for (const entry of this.ctx.loader.entries()) {
			if (entry.options.name !== entryName || entry.fiber === void 0 || entry.disabled) continue;
			const source = this.resolveSource(entry);
			if (source !== void 0) nextSources.set(source.sourceKey, source);
		}
		const affectedPackages = /* @__PURE__ */ new Set();
		for (const [sourceKey, source] of this.sources) {
			if (source.loaderName !== entryName) continue;
			affectedPackages.add(source.packageName);
			if (!nextSources.has(sourceKey)) this.sources.delete(sourceKey);
		}
		for (const [sourceKey, source] of nextSources) {
			affectedPackages.add(source.packageName);
			this.sources.set(sourceKey, source);
		}
		let changed = false;
		for (const packageName of affectedPackages) try {
			if (this.reconcilePackage(packageName)) changed = true;
		} catch (error) {
			onError(error instanceof Error ? error : new Error(String(error)));
		}
		return changed;
	}
	resolveSource(entry) {
		const loaderName = entry.options.name;
		const baseUrl = entry.parent.tree.ctx.baseUrl;
		if (baseUrl === void 0) throw new Error(`client-modules: loader entry ${loaderName} has no resolution base URL`);
		const resolved = this.resolveMeta(loaderName, baseUrl);
		if (resolved === null) return void 0;
		return {
			...resolved,
			loaderName,
			baseUrl,
			sourceKey: this.sourceKey(loaderName, baseUrl)
		};
	}
	reconcilePackage(packageName) {
		const sources = [];
		for (const source of this.sources.values()) if (source.packageName === packageName) sources.push(source);
		if (sources.length > 1) {
			const locations = sources.map((source) => `${JSON.stringify(source.loaderName)} from ${source.baseUrl}`).join(", ");
			throw new Error(`client-modules: package ${packageName} resolves from multiple active Loader sources: ${locations}; remove one entry`);
		}
		const source = sources[0];
		if (source === void 0) return this.table.delete(packageName);
		if (this.table.get(packageName)?.sourceKey === source.sourceKey) return false;
		const snapshot = this.initialBundleSnapshot(packageName, source.meta.clientPath);
		const rev = this.allocateInitialRevision();
		this.table.set(packageName, {
			entry: graphRow(packageName, rev, source.meta),
			loaderName: source.loaderName,
			sourceKey: source.sourceKey,
			meta: source.meta,
			bundle: snapshot.bundle,
			baseline: snapshot.baseline,
			...snapshot.sourceMap === void 0 ? {} : { sourceMap: snapshot.sourceMap }
		});
		return true;
	}
	flush(onError) {
		let changed = false;
		for (const entryName of [...this.dirty]) {
			this.dirty.delete(entryName);
			try {
				if (this.processOne(entryName, onError)) changed = true;
			} catch (error) {
				onError(error instanceof Error ? error : new Error(String(error)));
			}
		}
		if (!changed) return;
		let composed;
		try {
			composed = this.compose();
		} catch (error) {
			onError(error);
			return;
		}
		this.composed = composed;
		this.notifyGraphChanged();
	}
	bundleResource(method, url) {
		if (method !== "GET" && method !== "HEAD") return { status: 405 };
		const requestUrl = new URL(url, "http://x");
		const resourceUrl = `${requestUrl.pathname}${requestUrl.search}`;
		const response = this.responses.get(resourceUrl) ?? this.previousBatchResponses.get(resourceUrl);
		if (response !== void 0) return {
			status: 200,
			headers: {
				"content-type": response.contentType,
				"cache-control": IMMUTABLE_CACHE
			},
			...method === "HEAD" ? {} : { body: response.body }
		};
		return { status: 404 };
	}
	serveBundle = (req, res) => {
		/* v8 ignore next -- `?? '/'` arm: node:http always sets url on server requests. */
		const response = this.bundleResource(req.method, req.url ?? "/");
		res.writeHead(response.status, response.headers);
		res.end(response.body);
	};
};
//#endregion
export { ClientModuleRegistry, ClientModuleRegistry as default, bootInjections, orderByModuleGraph, stripClientSuffix };
