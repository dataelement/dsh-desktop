window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-modules",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
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
		/**
		* Parse `window.__DSH_BOOT__` into the two consumer views. Wire boundary:
		* a missing or malformed graph throws (the shell shows the loud failure —
		* a page without a valid manifest cannot boot anything).
		* @param wire - the raw `window.__DSH_BOOT__` value.
		* @returns the manifest with optional plugin-view fields normalized.
		*/
		function parseBootManifest(wire) {
			if (typeof wire !== "object" || wire === null) throw new Error("client-modules: window.__DSH_BOOT__ is missing or not an object");
			const graph = wire;
			if (typeof graph.rev !== "string") throw new Error("client-modules: boot manifest rev must be a string");
			if (!Array.isArray(graph.entries)) throw new Error("client-modules: boot manifest entries must be an array");
			if (!Array.isArray(graph.batches)) throw new Error("client-modules: boot manifest batches must be an array");
			const moduleFields = [];
			const plugins = [];
			const seenEntryIds = /* @__PURE__ */ new Set();
			for (const value of graph.entries) {
				if (typeof value !== "object" || value === null) throw new Error("client-modules: boot manifest entry is not an object");
				const row = value;
				const where = typeof row.id === "string" ? `"${row.id}"` : JSON.stringify(row);
				if (typeof row.id !== "string" || typeof row.url !== "string" || typeof row.rev !== "string") throw new Error(`client-modules: boot manifest entry ${where} must carry string id/url/rev`);
				if (seenEntryIds.has(row.id)) throw new Error(`client-modules: duplicate graph entry "${row.id}"`);
				seenEntryIds.add(row.id);
				const subject = `boot manifest entry ${where}`;
				const inject = optionalStringArray(subject, "inject", row.inject);
				const external = optionalStringArray(subject, "external", row.external);
				if (row.immediately !== void 0 && typeof row.immediately !== "boolean") throw new Error(`client-modules: boot manifest entry ${where} immediately must be a boolean`);
				moduleFields.push({
					id: row.id,
					url: row.url,
					rev: row.rev,
					inject: inject === void 0 ? [] : [...inject],
					external: external === void 0 ? [] : [...external]
				});
				plugins.push({
					id: row.id,
					inject: inject === void 0 ? [] : [...inject],
					immediately: row.immediately === true
				});
			}
			const entryIds = new Set(moduleFields.map((row) => row.id));
			const initialUrls = /* @__PURE__ */ new Map();
			const batchUrls = /* @__PURE__ */ new Set();
			for (const value of graph.batches) {
				if (typeof value !== "object" || value === null) throw new Error("client-modules: boot manifest batch is not an object");
				const batch = value;
				const phase = batch.phase;
				if (phase !== "bootstrap" && phase !== "application") throw new Error(`client-modules: boot manifest batch phase must be "bootstrap" or "application", received ${JSON.stringify(phase)}`);
				if (typeof batch.url !== "string" || typeof batch.rev !== "string") throw new Error(`client-modules: boot manifest ${phase} batch must carry string url/rev`);
				if (batchUrls.has(batch.url)) throw new Error(`client-modules: boot manifest carries duplicate batch URL ${JSON.stringify(batch.url)}`);
				batchUrls.add(batch.url);
				const entries = optionalStringArray(`boot manifest ${phase} batch`, "entries", batch.entries);
				if (entries === void 0 || entries.length === 0) throw new Error(`client-modules: boot manifest ${phase} batch entries must be a non-empty string array`);
				for (const id of entries) {
					if (!entryIds.has(id)) throw new Error(`client-modules: boot manifest ${phase} batch names unknown entry "${id}"`);
					if (initialUrls.has(id)) throw new Error(`client-modules: boot manifest entry "${id}" belongs to more than one batch`);
					initialUrls.set(id, batch.url);
				}
			}
			const modules = moduleFields.map((row) => {
				const initialUrl = initialUrls.get(row.id);
				if (initialUrl === void 0) throw new Error(`client-modules: boot manifest entry "${row.id}" belongs to no initial-load batch`);
				return {
					...row,
					initialUrl
				};
			});
			return {
				rev: graph.rev,
				modules,
				plugins
			};
		}
		//#endregion
		//#region lib/types/client/system.js
		/**
		* ClientModuleSystem — the implementation behind the {@link ClientModuleLoader}
		* contract. The conceptual contract (lazy CJS model, resolution branch order) is
		* documented on the public interfaces in `./manifest.ts`; this file owns the
		* state tables and the load/materialize machinery.
		*/
		/** Default bundle-load hook: same-origin external classic script. */
		const defaultLoadBundle = (url) => new Promise((resolve, reject) => {
			const el = document.createElement("script");
			el.async = true;
			el.src = url;
			el.addEventListener("load", () => {
				el.remove();
				resolve();
			}, { once: true });
			el.addEventListener("error", () => {
				el.remove();
				reject(/* @__PURE__ */ new Error(`client-modules: bundle script ${url} failed to load`));
			}, { once: true });
			document.head.append(el);
		});
		/** Replace the rev query while preserving absolute, protocol-relative, or path-relative form. */
		function atRevision(url, rev) {
			if (!/[?&]rev=[^&#]*/.test(url)) throw new Error(`client-modules: bundle URL ${url} has no revision`);
			return url.replace(/([?&]rev=)[^&#]*/, `$1${encodeURIComponent(rev)}`);
		}
		/**
		* Claim and inventory the <style> tags a factory injected during
		* materialization: preset-emitted tags arrive pre-tagged with data-plugin;
		* any untagged tag is claimed for the materializing plugin (HMR bookkeeping).
		*/
		const claimStyles = (id) => {
			if (typeof document === "undefined") return [];
			for (const el of document.querySelectorAll("style:not([data-plugin])")) el.setAttribute("data-plugin", id);
			const owned = [];
			for (const el of document.querySelectorAll(`style[data-plugin=${JSON.stringify(id)}]`)) owned.push(el.getAttribute("data-plugin-css") ?? id);
			return owned;
		};
		/**
		* The client module system: state tables plus the arrival/materialization
		* machinery implementing {@link ClientModuleLoader} (whose members carry the
		* contract documentation). Construction indexes the boot rows, retains the
		* already-materialized bootstrap module, and switches the HTML-installed
		* loader facade from its pending queue to live registration.
		*/
		var ClientModuleSystem = class {
			version = "client";
			manifest;
			loadCache = /* @__PURE__ */ new Map();
			seed;
			factories = /* @__PURE__ */ new Map();
			bootstrapIds = /* @__PURE__ */ new Set();
			/** In-flight script transport per URL; every row in one batch shares it. */
			pendingArrival = /* @__PURE__ */ new Map();
			/** Single-resource combo URL selected by HMR after invalidating one row. */
			reloadUrls = /* @__PURE__ */ new Map();
			/** Materialization re-entrancy guard: factory-form CJS cannot deliver partial exports, so a cycle is fatal. */
			materializing = /* @__PURE__ */ new Set();
			graphRows = /* @__PURE__ */ new Map();
			loadBundle;
			/**
			* Build the module system over the parsed boot rows.
			* @param options - Parsed graph, platform seed, bootstrap module, registration facade, and transport.
			*/
			constructor(options) {
				this.manifest = options.manifest;
				this.seed = new Map(Object.entries(options.staticModules));
				this.loadBundle = options.loadBundle ?? defaultLoadBundle;
				for (const row of options.manifest.modules) {
					if (this.graphRows.has(row.id)) throw new Error(`client-modules: duplicate graph entry "${row.id}"`);
					this.graphRows.set(row.id, row);
				}
				const bootstrapId = stripClientSuffix(options.bootstrapModule.id);
				this.bootstrapIds.add(bootstrapId);
				this.loadCache.set(bootstrapId, {
					id: bootstrapId,
					exports: options.bootstrapModule.exports,
					styles: [],
					edges: /* @__PURE__ */ new Set()
				});
				const target = options.registrationTarget;
				if (target.mode !== "queue") throw new Error("client-modules: window.__ModuleLoader__.create called after module-system boot");
				const pending = target.pendingQueue.splice(0);
				target.mode = "live";
				target.load = (registration) => {
					this.register(registration);
				};
				for (const registration of pending) target.load(registration);
			}
			/** Register one bundle factory, rejecting a script that executes twice without invalidation. */
			register(registration) {
				const id = stripClientSuffix(registration.id);
				if (this.bootstrapIds.has(id) || this.factories.has(id)) throw new Error(`client-modules: duplicate factory registration for "${registration.id}" (bundle executed twice without invalidate?)`);
				this.factories.set(id, registration.factory);
			}
			/** Load one graph row so its factory is registered (idempotent per in-flight arrival). */
			arrive(row) {
				const { id } = row;
				if (this.loadCache.has(id) || this.factories.has(id)) return Promise.resolve();
				const reloadUrl = this.reloadUrls.get(id);
				const url = reloadUrl ?? row.initialUrl;
				let transport = this.pendingArrival.get(url);
				if (transport === void 0) {
					transport = this.loadBundle(url).finally(() => {
						this.pendingArrival.delete(url);
					});
					this.pendingArrival.set(url, transport);
				}
				return transport.then(() => {
					if (!this.factories.has(id)) throw new Error(`client-modules: bundle ${url} loaded without registering "${id}" via __ModuleLoader__.load`);
					if (reloadUrl !== void 0 && this.reloadUrls.get(id) === reloadUrl) this.reloadUrls.delete(id);
				});
			}
			/** Register each injected package and unresolved dynamic request before its consumer. */
			async arriveGraphRow(row, open = [], visited = /* @__PURE__ */ new Set()) {
				const cycleStart = open.indexOf(row.id);
				if (cycleStart !== -1) throw new Error(`client-modules: module arrival cycle ${[...open.slice(cycleStart), row.id].join(" -> ")} (the host must reject this graph before serving it)`);
				if (visited.has(row.id)) return;
				visited.add(row.id);
				const next = [...open, row.id];
				for (const request of row.external) {
					const id = stripClientSuffix(request);
					if (this.seed.has(request) || this.loadCache.has(id)) continue;
					const dependency = this.graphRows.get(id);
					if (dependency !== void 0) await this.arriveGraphRow(dependency, next, visited);
				}
				for (const packageName of row.inject) {
					const dependency = this.graphRows.get(packageName);
					if (dependency !== void 0) await this.arriveGraphRow(dependency, [], visited);
				}
				await this.arrive(row);
			}
			/** Materialize a registered factory (synchronous; memoized in loadCache). */
			materialize(id) {
				const existing = this.loadCache.get(id);
				if (existing !== void 0) return existing;
				const registered = this.factories.get(id);
				/* v8 ignore next -- callers check the factory branch before dispatching here. */
				if (registered === void 0) throw new Error(`client-modules: no registered factory for "${id}"`);
				if (this.materializing.has(id)) throw new Error(`client-modules: require cycle through "${id}" (factory-form CJS cannot deliver partial exports)`);
				this.materializing.add(id);
				try {
					const edges = /* @__PURE__ */ new Set();
					const record = {
						id,
						exports: registered(this.makeRequire(edges)),
						styles: claimStyles(id),
						edges
					};
					this.loadCache.set(id, record);
					return record;
				} finally {
					this.materializing.delete(id);
				}
			}
			/**
			* The synchronous require answered to factories: seed → memoized record →
			* registered factory. Fetching is async and therefore unreachable
			* from here; an external dynamic package must have arrived before its
			* consumer materializes.
			*/
			makeRequire(edges) {
				return (spec) => {
					edges.add(spec);
					if (this.seed.has(spec)) return this.seed.get(spec);
					const id = stripClientSuffix(spec);
					const record = this.loadCache.get(id);
					if (record !== void 0) return record.exports;
					if (this.factories.has(id)) return this.materialize(id).exports;
					throw new Error(`client-modules: require("${spec}") missed the module table — not a platform seed word, not a materialized module, and no registered package factory (a build-time externals drift, or a dynamic dependency that did not arrive)`);
				};
			}
			async import(specifier) {
				if (this.seed.has(specifier)) return this.seed.get(specifier);
				const id = stripClientSuffix(specifier);
				const existing = this.loadCache.get(id);
				if (existing !== void 0) return existing.exports;
				const row = this.graphRows.get(id);
				if (row !== void 0) await this.arriveGraphRow(row);
				else if (!this.factories.has(id)) throw new Error(`client-modules: cannot resolve "${specifier}" — not a seed word, not a materialized module, and not a row in the boot graph (the runtime mirror of the bundle purity gate)`);
				return this.materialize(id).exports;
			}
			async prefetch(id) {
				const normalized = stripClientSuffix(id);
				if (this.loadCache.has(normalized)) return;
				const row = this.graphRows.get(normalized);
				if (row === void 0) throw new Error(`client-modules: prefetch("${id}") — not a graph entry`);
				await this.arriveGraphRow(row);
			}
			invalidate(id, rev) {
				const normalized = stripClientSuffix(id);
				if (this.bootstrapIds.has(normalized)) return;
				const row = this.graphRows.get(normalized);
				if (row !== void 0) this.reloadUrls.set(normalized, atRevision(row.url, rev ?? row.rev));
				else this.reloadUrls.delete(normalized);
				this.factories.delete(normalized);
				this.loadCache.delete(normalized);
			}
		};
		//#endregion
		//#region lib/types/client/index.js
		let moduleSystem;
		/**
		* Build the live module system from the HTML facade's materialized modules bundle.
		* @param target - Stable registration facade whose pending queue becomes the live sink.
		* @param bootstrapModule - This bundle's id and already-materialized exports.
		* @param options - Raw boot graph, platform seed, and optional bundle transport.
		* @returns The created module system, also published for this package's Cordis plugin face.
		*/
		function createClientModuleSystem(target, bootstrapModule, options) {
			moduleSystem = new ClientModuleSystem({
				manifest: parseBootManifest(options.boot),
				staticModules: options.staticModules,
				registrationTarget: target,
				bootstrapModule,
				...options.loadBundle === void 0 ? {} : { loadBundle: options.loadBundle }
			});
			return moduleSystem;
		}
		/**
		* Enroll the kernel-built module system as `ctx.modules`.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			if (moduleSystem === void 0) throw new Error("client-modules: createClientModuleSystem must run before plugin boot");
			ctx.reflect.provide("modules", moduleSystem);
		}
		//#endregion
		exports.ClientModuleSystem = ClientModuleSystem;
		exports.apply = apply;
		exports.createClientModuleSystem = createClientModuleSystem;
		exports.parseBootManifest = parseBootManifest;
		exports.stripClientSuffix = stripClientSuffix;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map