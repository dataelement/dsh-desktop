window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-cordis-client-runner",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let _deepseek_ai_cordis = require("@deepseek-ai/cordis");
		//#region lib/types/client/evaluator.js
		/**
		* Browser-half closure evaluation: the package source runs as the body of an
		* async function whose parameters ARE the symbol surface. Shadowing parameters
		* (setTimeout/fetch/require/…) turn the ambient browser globals into teaching
		* redirects without touching the page. The host syntax-prechecked the source at
		* define time; SyntaxError handling here is the engine-divergence fallback and
		* reaches the model through the load report.
		*/
		const TIMER_REDIRECT = "browser timer globals are unavailable in dynamic packages. Declare inject: ['timer'] on the returned plugin, query Client Service.listService for the exact API, and close over that plugin ctx. In React, create timers from an event handler or React.useEffect and return callback-form disposers from the effect cleanup.";
		/**
		* Where each withheld browser global sends the author instead. One home for two
		* consumers: the closure traps below throw these, and a render crash whose
		* message names one of them gets the same redirect appended — a package that
		* reached the global some other way (`window.setInterval`) crashes with the
		* engine's own bare text, and the author needs the redirect either way.
		*/
		const DYNAMIC_CLIENT_REDIRECTS = {
			setTimeout: TIMER_REDIRECT,
			setInterval: TIMER_REDIRECT,
			clearTimeout: TIMER_REDIRECT,
			clearInterval: TIMER_REDIRECT,
			fetch: "network belongs to the HOST half: register a handler there with harness.handle(method, fn) and call it here via host.call(method, args).",
			require: "modules cannot be imported here. React arrives as the `React` closure symbol; everything else goes through ctx services or host.call."
		};
		/** Callable teaching traps shadowing the ambient globals the closure must not reach. */
		function closureTraps() {
			const traps = {};
			for (const [name, redirect] of Object.entries(DYNAMIC_CLIENT_REDIRECTS)) traps[name] = () => {
				throw new Error(`${name} is not available in a dynamic client half — ${redirect}`);
			};
			return traps;
		}
		/** The `harness` seat exists only host-side; any touch teaches the split. */
		function harnessTrap() {
			return new Proxy({}, { get(_target, prop) {
				throw new Error(`harness.${String(prop)} belongs to the HOST half (\`code\`): register handlers there with harness.handle(method, fn); the browser half calls them via host.call(method, args).`);
			} });
		}
		/** Per-package style-tag bookkeeping behind the `styles.insert` symbol. */
		var DynamicCordisStyles = class {
			pluginId;
			tags = /* @__PURE__ */ new Set();
			/** @param pluginId - owning Plugin ID, stamped as `data-dyn` on every tag. */
			constructor(pluginId) {
				this.pluginId = pluginId;
			}
			/**
			* Inject one stylesheet, removed automatically on package unload.
			* @param css - raw CSS text.
			* @returns disposer removing this one tag early.
			*/
			insert(css) {
				if (typeof css !== "string") throw new Error("styles.insert(css) needs a CSS string");
				const tag = document.createElement("style");
				tag.dataset.dyn = this.pluginId;
				tag.textContent = css;
				document.head.append(tag);
				this.tags.add(tag);
				return () => {
					this.tags.delete(tag);
					tag.remove();
				};
			}
			/** Live tag count (load-report contribution summary). */
			get count() {
				return this.tags.size;
			}
			/** Remove every tag this package still owns (unload path). */
			dispose() {
				for (const tag of this.tags) tag.remove();
				this.tags.clear();
			}
		};
		/** Stringify one console argument for the error mirror. */
		function errorText(arg) {
			if (arg instanceof Error) return arg.message;
			if (typeof arg === "string") return arg;
			if (arg === void 0) return "undefined";
			try {
				return JSON.stringify(arg);
			} catch {
				return "[unserializable console argument]";
			}
		}
		/** Tagged write-through console; error lines additionally copy into the load report. */
		function taggedConsole(pluginId, noteError) {
			const tag = `[cordis:${pluginId}]`;
			const forward = (level) => (...args) => {
				console[level](tag, ...args);
				if (level !== "error") return;
				noteError(args.map(errorText).join(" ").slice(0, 500));
			};
			return {
				...console,
				log: forward("log"),
				info: forward("info"),
				warn: forward("warn"),
				error: forward("error"),
				debug: forward("debug")
			};
		}
		/**
		* Narrow a closure return value to a mountable plugin (host guard mirror).
		* @param value - whatever the closure returned.
		* @returns whether the value is mountable.
		*/
		function isDynamicCordisPlugin(value) {
			if (typeof value === "function") return true;
			return typeof value === "object" && value !== null && typeof value.apply === "function";
		}
		/**
		* Evaluate one package's browser half and return the (un-guarded) plugin.
		* @param pluginId - stable Plugin ID (console tag and style ownership).
		* @param clientCode - the browser half's source: an async function body returning a plugin.
		* @param env - runner wiring for `host.call` and error mirroring.
		* @param styles - the package's style bookkeeping (owned by the caller so unload can dispose it).
		* @returns the plugin the closure returned.
		* @throws teaching errors for syntax failures and non-plugin returns.
		*/
		async function evaluateClientHalf(pluginId, clientCode, env, styles) {
			const traps = closureTraps();
			const parameters = [
				"React",
				"console",
				"styles",
				"host",
				"harness",
				...Object.keys(traps),
				"process",
				"Buffer"
			];
			let closure;
			try {
				closure = new Function(...parameters, `return (async () => {\n${clientCode}\n})()`);
			} catch (error) {
				if (!(error instanceof SyntaxError)) throw error;
				throw new Error(`client half failed to parse in this browser: ${error.message}\nThe browser half is plain JavaScript (no JSX, no TypeScript); build elements with React.createElement.`);
			}
			const returned = await closure(react, taggedConsole(pluginId, (message) => {
				env.noteError(message);
			}), styles, { 
			/**
			* Call a host-half handler of THIS package (harness.handle pairing). A call
			* with nothing to pass omits the argument: it arrives at the handler as
			* `null`, because the wire carries JSON and `undefined` is not JSON —
			* requiring `host.call('m', {})` would be a ritual, and defaulting to `{}`
			* would invent an empty argument the caller never wrote.
			*/
call: (method, args = null) => env.invoke(method, args) }, harnessTrap(), ...Object.values(traps), void 0, void 0);
			if (!isDynamicCordisPlugin(returned)) {
				if (returned === void 0) throw new Error("client half returned `undefined` — did you forget `return`?\n  ✓ return (ctx) => { … }\n  ✓ return { name: '…', inject: ['slots'], apply(ctx) { … } }");
				throw new Error("client half must `return` a plugin: a function, or an object with an `apply(ctx)` method");
			}
			return returned;
		}
		//#endregion
		//#region lib/types/client/guard.js
		/**
		* The browser twin of the tool-cordis context facade: a whitelist of
		* lifecycle-safe verbs plus optional `ctx.get()` lookup and declared-service
		* property access, with
		* framework internals withheld and Context-valued returns denied. Two seats
		* carry extra machinery: `slots`, where the register proxy assigns the
		* shadowing priority and ledgers the registration — invoking the service with
		* the traced receiver so the effect lands on the CALLING plugin's fiber
		* (SlotRegistry.register must stay a prototype method for exactly that
		* reason) — and `theme`, whose override source is pinned to the package id.
		*
		* This is API discipline, not a security boundary: a dynamic package's code is
		* as trusted as the host process that accepted its definition.
		*/
		/** Facade verbs beyond declared services (host CTX_VERBS twin). */
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
		/** Reject any service return that is a cordis Context (host guard twin). */
		function denyContext(value, service, env) {
			if (value instanceof _deepseek_ai_cordis.Context) return rejectGuard(env, `service "${service}" returned a cordis Context, which the dynamic facade does not expose. Operate through your own plugin ctx and the services you declared — never another context.`);
			return value;
		}
		/**
		* Forward service methods with the traced service as receiver — `this.ctx`
		* inside prototype methods (slots.register) must stay the CALLER's ctx so
		* effects land on the calling plugin's fiber — while denying Context returns.
		*/
		function guardedService(service, name, env) {
			return new Proxy(service, { get(target, prop) {
				const value = Reflect.get(target, prop, target);
				if (typeof value !== "function") return denyContext(value, name, env);
				return (...args) => {
					const result = Reflect.apply(value, target, args);
					if (result instanceof Promise) return result.then((resolved) => denyContext(resolved, name, env));
					return denyContext(result, name, env);
				};
			} });
		}
		/**
		* The slots seat: automatic shadowing priority and ledger recording around the
		* traced service's own register.
		*/
		function guardedSlots(slots, env) {
			return new Proxy(slots, { get(target, prop) {
				const value = Reflect.get(target, prop, target);
				if (prop !== "register") {
					if (typeof value !== "function") return denyContext(value, "slots", env);
					return (...args) => denyContext(Reflect.apply(value, target, args), "slots", env);
				}
				return (rawOptions, component) => {
					if (typeof rawOptions !== "object" || rawOptions === null) return rejectGuard(env, "slots.register(options, component) needs an options object with a `name`");
					const options = { ...rawOptions };
					const slot = options.name;
					if (typeof slot !== "string" || slot.length === 0) return rejectGuard(env, "slots.register options need a string `name` (the target slot key)");
					if (slot === "tool.view.cordis") {
						if (options.key !== "self") return rejectGuard(env, "tool.view.cordis only accepts key \"self\"; the runtime binds it to this Package");
						options.key = `${env.pkg.pluginId}.${env.pkg.packageId}`;
					}
					const spec = slots.spec(slot);
					let priority = options.priority;
					if (spec === void 0 || spec.kind !== "chain") {
						priority = env.allocatePriority();
						options.priority = priority;
					}
					const dispose = Reflect.get(target, "register", target).call(target, options, component);
					env.ledger.push({
						slot,
						priority
					});
					env.claim(component);
					return dispose;
				};
			} });
		}
		/**
		* The theme seat: `overrideTokens`' source is FORCED to the package id — a
		* dynamic package can never impersonate (or evict) another source's layer, and
		* its own layers converge under one identity unload can reason about. The
		* layer's disposer is additionally hung on the calling fiber, because the
		* documented contract is "unload restores" and model code cannot be trusted to
		* keep the returned handle (slots parity — register hangs its own cleanup).
		* Everything else forwards through the generic guard.
		*/
		function guardedTheme(theme, env, ctx) {
			return new Proxy(theme, { get(target, prop) {
				if (prop !== "overrideTokens") {
					const value = Reflect.get(target, prop, target);
					if (typeof value !== "function") return denyContext(value, "theme", env);
					return (...args) => {
						const result = Reflect.apply(value, target, args);
						if (result instanceof Promise) return result.then((resolved) => denyContext(resolved, "theme", env));
						return denyContext(result, "theme", env);
					};
				}
				return (source, tokens) => {
					if (tokens === void 0 && typeof source === "object" && source !== null) return rejectGuard(env, "theme.overrideTokens(source, tokens) takes two arguments; source is replaced with your package id, so pass any string first and the token map second: overrideTokens('mine', { '--dsw-alias-…': { light: '…', dark: '…' } })");
					const method = Reflect.get(target, "overrideTokens", target);
					const dispose = Reflect.apply(method, target, [`${env.pkg.pluginId}.${env.pkg.packageId}`, tokens]);
					ctx.effect(() => dispose, "cordis-client-runner: dynamic theme override layer");
					return dispose;
				};
			} });
		}
		/**
		* Build the facade one dynamic plugin's `apply` receives (host sandboxContext
		* twin, browser seats). `ctx.get(name)` performs optional lookup; direct
		* `ctx.serviceName` access is gated by the fiber's `inject` declaration.
		* @param ctx - the plugin's real fiber ctx (loader-created).
		* @param env - package row + ledger sink.
		* @returns the whitelisting proxy standing in for ctx.
		*/
		function dynamicCordisContext(ctx, env) {
			const declared = new Set(Object.keys(ctx.fiber.inject));
			const denyRead = (prop) => {
				if (ctx.get(prop) !== void 0) return rejectGuard(env, `service "${prop}" is not declared by your plugin. Declare it on the plugin you return: { inject: ['${prop}', …], apply(ctx) { … } } — a plain \`function\` has no declaration site, so use the object form. The runtime then parks the package if the provider unloads.`);
				return rejectGuard(env, `dynamic ctx does not expose "${prop}". Available: ctx.on / ctx.provide / timer helpers after injecting timer, and any service your returned plugin declared in inject (slots and theme are the usual UI seats). Framework internals are withheld by design.`);
			};
			const readService = (name, requireDeclaration) => {
				if (requireDeclaration && !declared.has(name)) return denyRead(name);
				const service = denyContext(ctx.get(name), name, env);
				if (service === null || typeof service !== "object" && typeof service !== "function") return service;
				if (name === "slots") return guardedSlots(service, env);
				if (name === "theme") return guardedTheme(service, env, ctx);
				return guardedService(service, name, env);
			};
			return new Proxy({}, {
				get(_target, prop) {
					if (prop === "get") return (name) => readService(name, false);
					if (typeof prop !== "string") return void 0;
					if (CTX_VERBS.has(prop)) return (...args) => {
						if (TIMER_VERBS.has(prop) && !declared.has("timer")) return denyRead("timer");
						const method = ctx[prop];
						return Reflect.apply(method, ctx, args);
					};
					return readService(prop, true);
				},
				set(_target, prop) {
					return rejectGuard(env, `dynamic ctx is read-only; cannot assign "${String(prop)}"`);
				},
				has: (_target, prop) => prop === "get" || typeof prop === "string" && (CTX_VERBS.has(prop) && (!TIMER_VERBS.has(prop) || declared.has("timer")) || declared.has(prop))
			});
		}
		function rejectGuard(env, message) {
			const error = new Error(message);
			env.reportFailure(error);
			throw error;
		}
		//#endregion
		//#region lib/types/client/runtime.js
		/**
		* Per-package browser lifecycle: evaluate the closure, wrap `apply` in the guard
		* facade, seat a ready-made factory in the module table, and create a loader
		* entry — so dynamic packages ride the exact machinery static plugins do
		* (activation gating on inject, fiber-effect cleanup, status projection). Unload
		* = loader entry removal (fiber disposal cascades slot entries and facade
		* effects) + factory invalidation + style removal.
		*
		* The engine answers its caller: `load` resolves with what this page ended up
		* with, which is what the run orchestration reports back to the host. Loads
		* converge by Plugin Run ID against live state, not history: loading the exact
		* activation this page already runs is a no-op that still answers, another run
		* replaces it, and the same Package after a retract loads afresh. Per-Plugin
		* serialization keeps a second request from interleaving with one in flight.
		*/
		/** Module-table id of one package (also its loader entry name and fiber name). */
		function moduleIdOf(id) {
			return `dyn/${id}`;
		}
		/** The browser-side load engine for dynamic packages. */
		var DynamicCordisPackageRunner = class {
			env;
			live = /* @__PURE__ */ new Map();
			/** Serializes load/unload per package id (a second request can outrun a slow load). */
			queues = /* @__PURE__ */ new Map();
			changeListeners = /* @__PURE__ */ new Set();
			/** Page-local shadowing rank. A later registration receives a lower priority. */
			nextPriority = 0;
			/**
			* Which package seated which component, and for whom. Component identity is the
			* only attribution key that holds:
			* - the registry stores the component verbatim, so a crashed entry carries its
			*   own way back — no parallel entry ledger to keep in step;
			* - `entry.registrant` is `options.registrant ?? fiber.name` and the facade does
			*   not strip a package-supplied one, so a package could name itself something
			*   else — attributing by it would let a package impersonate another;
			* - the assigned shadowing priority is unique but absent on chain entries (their
			*   election is deliberately left alone), so it would miss chain crashes;
			* - a package torn down between the crash and the report is still attributable,
			*   because this index does not depend on the live record.
			*
			* Two packages cannot collide here: each browser half is evaluated in its own
			* closure, so no component object reaches two of them. A collision is only
			* possible inside ONE package (the same component seated twice), where both
			* entries map to the same id and the value is identical.
			*/
			owners = /* @__PURE__ */ new WeakMap();
			/** This page's last render crash per package: what a run surface shows on the row. */
			failures = /* @__PURE__ */ new Map();
			unwatch;
			snapshotCache;
			failureCache;
			/** @param env - loader/module/slot wiring plus the two host verbs this engine uses. */
			constructor(env) {
				this.env = env;
				this.unwatch = env.slots.onEntryError((slot, entry, error, info) => {
					const component = entry.component;
					const owner = indexable(component) ? this.owners.get(component) : void 0;
					if (owner === void 0) return;
					const details = errorDetails(error);
					const failure = {
						slot,
						message: renderFailureMessage(slot, details.message),
						...details.stack === void 0 ? {} : { stack: details.stack },
						abdicated: info.abdicated
					};
					env.reportRenderFailure(owner.agentId, owner.pluginId, owner.pluginRunId, failure);
					this.failures.set(owner.pluginId, failure);
					this.notify();
				});
			}
			/**
			* Observe live-set changes (the run-state surface's re-render seam).
			* @param fn - notified after every converged mutation.
			* @returns unsubscribe.
			*/
			subscribe(fn) {
				this.changeListeners.add(fn);
				return () => {
					this.changeListeners.delete(fn);
				};
			}
			/**
			* This page's last render crash per package, on the same notification channel as
			* the live set — a surface that already subscribed learns about a crash without
			* a second mechanism to wire.
			*/
			renderFailures = {
				getSnapshot: () => this.failureCache ??= new Map(this.failures),
				subscribe: (fn) => this.subscribe(fn)
			};
			/**
			* What this page currently has loaded (stable reference between mutations, so
			* it can back a snapshot selector).
			* @returns one row per live package.
			*/
			getSnapshot() {
				return this.snapshotCache ??= [...this.live.values()].map(({ pkg, ledger, styles }) => ({
					pluginId: pkg.pluginId,
					packageId: pkg.packageId,
					pluginRunId: pkg.pluginRunId,
					name: pkg.name,
					slots: [...new Set(ledger.map((row) => row.slot))],
					styleCount: styles.count
				}));
			}
			/**
			* Whether this page has the browser half loaded — page-local truth, never the
			* host's "it is running".
			* @param pluginId - stable Plugin identity.
			* @returns true while one activation of the Plugin is live here.
			*/
			isLoaded(pluginId) {
				return this.live.has(pluginId);
			}
			/**
			* Load one browser half into this page and answer what happened.
			* @param half - source for one exact Host activation.
			* @returns the outcome the run orchestration reports to the host.
			*/
			load(half) {
				return this.enqueue(half.pluginId, async () => {
					const current = this.live.get(half.pluginId);
					if (current !== void 0) {
						if (current.pkg.pluginRunId === half.pluginRunId) return settled(current);
						await this.teardown(current.pkg.pluginId, current.entryId, current.styles);
					}
					const result = await this.mount(half);
					this.notify();
					return result;
				});
			}
			/**
			* Unload one package (`cordis/dynamic-retract`: a stop, or an undefine
			* that stops first).
			* @param pluginId - stable Plugin identity.
			* @param pluginRunId - exact activation being retracted; a newer run survives.
			*/
			retract(pluginId, pluginRunId) {
				this.enqueue(pluginId, async () => {
					const current = this.live.get(pluginId);
					if (current === void 0 || current.pkg.pluginRunId !== pluginRunId) return;
					await this.teardown(pluginId, current.entryId, current.styles);
					this.notify();
				});
			}
			/** Unload everything (plugin disposal path). */
			async dispose() {
				this.unwatch();
				for (const current of [...this.live.values()]) await this.teardown(current.pkg.pluginId, current.entryId, current.styles);
				this.notify();
			}
			notify() {
				this.snapshotCache = void 0;
				this.failureCache = void 0;
				for (const fn of [...this.changeListeners]) fn();
			}
			/** Queue one package operation behind that package's previous ones. */
			enqueue(id, op) {
				const next = (this.queues.get(id) ?? Promise.resolve()).then(op);
				this.queues.set(id, next.then(() => {}, () => {}));
				return next;
			}
			async mount(half) {
				const styles = new DynamicCordisStyles(half.pluginId);
				const ledger = [];
				let plugin;
				try {
					plugin = await evaluateClientHalf(half.pluginId, half.code, {
						invoke: (method, args) => this.env.invoke(half.pluginId, half.pluginRunId, method, args),
						noteError: (message) => {
							console.error(`[cordis-client-runner] ${half.pluginId} logged an error:`, message);
						}
					}, styles);
				} catch (error) {
					styles.dispose();
					return {
						ok: false,
						cause: "evaluate",
						...errorDetails(error),
						error
					};
				}
				const pkg = {
					pluginId: half.pluginId,
					packageId: half.packageId,
					pluginRunId: half.pluginRunId,
					name: half.name
				};
				const surface = this.guardedSurface(pkg, half.agentId, plugin, ledger);
				const moduleId = moduleIdOf(half.pluginId);
				this.env.modules.invalidate(moduleId);
				const sink = globalThis.__ModuleLoader__;
				if (sink === void 0) throw new Error("cordis-client-runner: window.__ModuleLoader__ is missing (booted outside the web shell?)");
				sink.load({
					id: moduleId,
					factory: () => surface
				});
				const entryId = await this.env.loader.create({ name: moduleId });
				const fiber = this.env.loader.resolve(entryId).fiber;
				if (fiber === void 0) {
					await this.teardown(half.pluginId, entryId, styles);
					return {
						ok: false,
						cause: "module-import",
						message: "module import failed (see the browser console)"
					};
				}
				try {
					await fiber.await();
				} catch (error) {
					await this.teardown(half.pluginId, entryId, styles);
					return {
						ok: false,
						cause: "activate",
						...errorDetails(error),
						error
					};
				}
				const record = {
					pkg,
					entryId,
					styles,
					ledger,
					waitingFor: Object.keys(fiber.inject).filter((name) => this.env.ctx.get(name) === void 0)
				};
				this.live.set(half.pluginId, record);
				this.failures.delete(half.pluginId);
				return settled(record);
			}
			/**
			* Wrap the evaluated plugin so `apply` sees the guard facade; the surface
			* doubles as the module-table module. The plugin's OWN `inject` survives (the
			* object form's declaration is the facade's service gate, mirroring the host
			* sandbox reading `ctx.fiber.inject`); the function form has no declaration
			* site and therefore reaches no service.
			*/
			guardedSurface(pkg, agentId, plugin, ledger) {
				const claim = (component) => {
					if (indexable(component)) this.owners.set(component, {
						pluginId: pkg.pluginId,
						pluginRunId: pkg.pluginRunId,
						agentId
					});
				};
				const guarded = (ctx) => dynamicCordisContext(ctx, {
					pkg,
					ledger,
					claim,
					allocatePriority: () => --this.nextPriority,
					reportFailure: (error) => {
						this.env.reportGuardFailure(agentId, pkg.pluginId, pkg.pluginRunId, errorDetails(error));
					}
				});
				if (typeof plugin === "function") return {
					name: moduleIdOf(pkg.pluginId),
					apply: (ctx) => plugin(guarded(ctx))
				};
				return {
					...plugin,
					name: moduleIdOf(pkg.pluginId),
					apply: (ctx, config) => plugin.apply(guarded(ctx), config)
				};
			}
			/**
			* Unload one package's contributions. Takes the pieces rather than the record
			* because a load can fail before any record is seated.
			*/
			async teardown(id, entryId, styles) {
				this.live.delete(id);
				this.failures.delete(id);
				await this.env.loader.remove(entryId);
				this.env.modules.invalidate(moduleIdOf(id));
				styles.dispose();
			}
		};
		/** The success answer for a package that is live here, parked or active. */
		function settled(record) {
			return {
				ok: true,
				pluginRunId: record.pkg.pluginRunId,
				...record.waitingFor.length > 0 ? { waitingFor: record.waitingFor } : {}
			};
		}
		/**
		* Whether a component can key the ownership index. Identity is the key, so only
		* objects and functions qualify — a package may register anything, and what it
		* registered is what a crash report carries back.
		* @param component - whatever a package passed as its component.
		* @returns true when the value can be indexed by identity.
		*/
		function indexable(component) {
			return typeof component === "object" && component !== null || typeof component === "function";
		}
		/**
		* Preserve error fields for a load result without fabricating a stack.
		* @param error - original thrown value.
		* @returns its message and original string stack, when present.
		*/
		function errorDetails(error) {
			if (typeof error !== "object" || error === null) return { message: String(error) };
			const message = "message" in error && typeof error.message === "string" ? error.message : Object.prototype.toString.call(error);
			const stack = "stack" in error && typeof error.stack === "string" ? error.stack : void 0;
			return {
				message,
				...stack === void 0 ? {} : { stack }
			};
		}
		/**
		* What the authoring session reads about one render crash. The slot says where it
		* happened, the crash message says what broke, and a withheld global named in that
		* text pulls in its redirect — a package that reached `window.setInterval` around
		* the closure trap crashes with the engine's bare message, which teaches nothing.
		*/
		function renderFailureMessage(slot, message) {
			const redirect = Object.entries(DYNAMIC_CLIENT_REDIRECTS).find(([name, text]) => message.includes(name) && !message.includes(text))?.[1];
			return `your entry in slot "${slot}" crashed while React rendered it: ${message}` + (redirect === void 0 ? "" : `\n${redirect}`);
		}
		//#endregion
		//#region lib/types/client/orchestrator.js
		/**
		* Page-side run orchestration for model approvals and direct panel gestures.
		* Host activation always precedes Client loading. The same Plugin-keyed state
		* drives every surface, so remounting a panel never loses an open approval or
		* an in-flight transition.
		*/
		/** Drives Host → Client activation and publishes Plugin-keyed activity. */
		var CordisRunOrchestrator = class {
			env;
			requests = /* @__PURE__ */ new Map();
			activity = /* @__PURE__ */ new Map();
			failures = /* @__PURE__ */ new Map();
			inFlight = /* @__PURE__ */ new Map();
			listeners = /* @__PURE__ */ new Set();
			activityCache;
			failureCache;
			/** @param env - Client loader and folded Host operations. */
			constructor(env) {
				this.env = env;
			}
			/** Open approvals and current activation attempts, keyed by stable Plugin ID. */
			activeRuns = {
				getSnapshot: () => this.activityCache ??= new Map(this.activity),
				subscribe: (fn) => this.observe(fn)
			};
			/** Latest page-side activation failure for each Plugin. */
			lastRunError = {
				getSnapshot: () => this.failureCache ??= new Map(this.failures),
				subscribe: (fn) => this.observe(fn)
			};
			/**
			* Register a Client activation request, starting it immediately when the Plugin is already authorized.
			* @param request - forwarded approval and activation metadata.
			*/
			open(request) {
				this.requests.set(request.requestId, request);
				if (!request.requiresApproval) {
					this.orchestrate({
						agentId: request.agentId,
						pluginId: request.pluginId,
						packageId: request.packageId,
						mode: request.mode,
						requestId: request.requestId,
						hasClientHalf: true
					}).catch((error) => {
						console.error(`[cordis-client-runner] automatic activation ${request.requestId} failed:`, error);
					});
					return;
				}
				if (this.activity.get(request.pluginId)?.phase !== "orchestrating") this.activity.set(request.pluginId, {
					phase: "awaiting-approval",
					requestId: request.requestId,
					agentId: request.agentId,
					packageId: request.packageId,
					mode: request.mode,
					name: request.name,
					purpose: request.purpose
				});
				this.commit();
			}
			/**
			* Rebuild pending approvals and automatic Client activations from an authoritative Host inventory read.
			* @param rows - complete process-wide Plugin inventory.
			*/
			reconcileApprovals(rows) {
				const expected = /* @__PURE__ */ new Map();
				for (const row of rows) {
					const attempt = row.latestRun;
					if (attempt?.approvalRequestId === void 0 || attempt.status !== "awaiting-approval" && attempt.status !== "starting-host" && attempt.status !== "client-pending") continue;
					const pkg = row.packages.find((candidate) => candidate.packageId === attempt.packageId);
					if (pkg === void 0) continue;
					expected.set(attempt.approvalRequestId, {
						requestId: attempt.approvalRequestId,
						agentId: row.agentId,
						pluginId: row.pluginId,
						packageId: attempt.packageId,
						mode: attempt.mode,
						name: pkg.name,
						purpose: pkg.purpose,
						requiresApproval: attempt.requiresApproval ?? attempt.status === "awaiting-approval"
					});
				}
				let changed = false;
				for (const [requestId, request] of [...this.requests]) {
					if (expected.has(requestId)) continue;
					this.requests.delete(requestId);
					const current = this.activity.get(request.pluginId);
					if (current?.phase === "awaiting-approval" && current.requestId === requestId) this.activity.delete(request.pluginId);
					changed = true;
				}
				for (const [requestId, request] of expected) {
					const previous = this.requests.get(requestId);
					const current = this.activity.get(request.pluginId);
					if (!request.requiresApproval && current?.phase === "orchestrating") continue;
					if (request.requiresApproval && sameRequest(previous, request) && current?.phase === "awaiting-approval" && current.requestId === requestId) continue;
					if (!request.requiresApproval) {
						this.open(request);
						changed = true;
						continue;
					}
					this.requests.set(requestId, request);
					if (current?.phase !== "orchestrating") this.activity.set(request.pluginId, {
						phase: "awaiting-approval",
						requestId,
						agentId: request.agentId,
						packageId: request.packageId,
						mode: request.mode,
						name: request.name,
						purpose: request.purpose
					});
					changed = true;
				}
				if (changed) this.commit();
			}
			/**
			* Close an approval settled by another page or by cancellation.
			* @param requestId - approval request that can no longer be answered here.
			*/
			close(requestId) {
				const request = this.requests.get(requestId);
				if (request === void 0) return;
				this.requests.delete(requestId);
				const current = this.activity.get(request.pluginId);
				if (current?.phase === "awaiting-approval" && current.requestId === requestId) this.activity.delete(request.pluginId);
				this.commit();
			}
			/**
			* Approve and execute one still-open model request.
			* @param requestId - approval request to execute.
			* @param approveFutureVersions - whether this approval covers later Packages for the same Plugin.
			*/
			approve(requestId, approveFutureVersions) {
				const request = this.requests.get(requestId);
				if (request === void 0 || !request.requiresApproval) return Promise.resolve();
				return this.orchestrate({
					agentId: request.agentId,
					pluginId: request.pluginId,
					packageId: request.packageId,
					mode: request.mode,
					requestId,
					approveFutureVersions,
					hasClientHalf: true
				});
			}
			/**
			* Reject one still-open model request without executing either half.
			* @param requestId - approval request to reject.
			*/
			async decline(requestId) {
				const request = this.requests.get(requestId);
				if (request === void 0 || !request.requiresApproval) return;
				const current = this.activity.get(request.pluginId);
				if (current?.phase !== "awaiting-approval" || current.requestId !== requestId) return;
				this.requests.delete(requestId);
				this.activity.delete(request.pluginId);
				this.commit();
				await this.answer(requestId, {
					ok: false,
					reason: "rejected"
				});
			}
			/**
			* Execute a direct panel run; the user gesture itself authorizes it.
			* @param request - exact Package activation selected by the user.
			*/
			startUserRun(request) {
				return this.orchestrate(request);
			}
			observe(fn) {
				this.listeners.add(fn);
				return () => {
					this.listeners.delete(fn);
				};
			}
			commit() {
				this.activityCache = void 0;
				this.failureCache = void 0;
				for (const fn of [...this.listeners]) fn();
			}
			orchestrate(plan) {
				const running = this.inFlight.get(plan.pluginId);
				if (running !== void 0) return running;
				this.activity.set(plan.pluginId, {
					phase: "orchestrating",
					agentId: plan.agentId,
					packageId: plan.packageId,
					mode: plan.mode
				});
				this.failures.delete(plan.pluginId);
				if (plan.requestId !== void 0) this.requests.delete(plan.requestId);
				this.commit();
				const attempt = this.drive(plan).finally(() => {
					this.inFlight.delete(plan.pluginId);
					this.activity.delete(plan.pluginId);
					this.commit();
				});
				this.inFlight.set(plan.pluginId, attempt);
				return attempt;
			}
			async drive(plan) {
				const started = await this.startHost(plan);
				if (!started.ok) {
					this.fail(plan, "host-half-failed", started);
					if (plan.requestId !== void 0) await this.answer(plan.requestId, {
						...started,
						reason: "host-half-failed"
					});
					return;
				}
				if (!plan.hasClientHalf) return;
				let source;
				try {
					source = await this.env.host.getClientCode(plan.agentId, plan.pluginId, started.pluginRunId);
				} catch (error) {
					await this.finishClientFailure(plan, started.pluginRunId, started.startedHere, errorDetails(error), error);
					return;
				}
				const loaded = await this.env.runner.load({
					pluginId: source.pluginId,
					packageId: source.packageId,
					pluginRunId: source.pluginRunId,
					agentId: plan.agentId,
					name: source.name,
					code: source.code
				}).catch((error) => ({
					ok: false,
					cause: "evaluate",
					...errorDetails(error),
					error
				}));
				if (!loaded.ok) {
					await this.finishClientFailure(plan, started.pluginRunId, started.startedHere, {
						message: `${loaded.cause}: ${loaded.message}`,
						...loaded.stack === void 0 ? {} : { stack: loaded.stack }
					}, loaded.error);
					return;
				}
				const resolution = {
					ok: true,
					pluginRunId: loaded.pluginRunId,
					...loaded.waitingFor === void 0 ? {} : { waitingFor: loaded.waitingFor }
				};
				if (plan.requestId !== void 0) {
					await this.answer(plan.requestId, resolution);
					return;
				}
				await this.settleDirect(plan, resolution);
			}
			async startHost(plan) {
				try {
					return await this.env.host.runHostHalf(plan.agentId, plan.pluginId, plan.packageId, plan.mode, plan.requestId ?? null, plan.approveFutureVersions ?? false);
				} catch (error) {
					return {
						ok: false,
						...errorDetails(error)
					};
				}
			}
			async finishClientFailure(plan, pluginRunId, startedHere, failure, originalError) {
				console.error(`[cordis-client-runner] Client activation ${plan.pluginId}/${plan.packageId} (${pluginRunId}) failed:`, originalError ?? failure);
				this.fail(plan, "client-half-failed", failure);
				const resolution = {
					ok: false,
					reason: "client-half-failed",
					pluginRunId,
					startedHere,
					...failure
				};
				if (plan.requestId !== void 0) await this.answer(plan.requestId, resolution);
				else await this.settleDirect(plan, resolution);
			}
			async settleDirect(plan, resolution) {
				try {
					const response = await this.env.host.settleUserRun(plan.agentId, plan.pluginId, resolution);
					if (!response.ok) this.fail(plan, "client-half-failed", response);
				} catch (error) {
					this.fail(plan, "client-half-failed", errorDetails(error));
				}
			}
			async answer(requestId, resolution) {
				try {
					await this.env.host.resolveRequestRun(requestId, resolution);
				} catch (error) {
					console.error(`[cordis-client-runner] answering run request ${requestId} failed:`, error);
				}
			}
			fail(plan, reason, failure) {
				this.failures.set(plan.pluginId, {
					packageId: plan.packageId,
					reason,
					...failure
				});
				this.commit();
			}
		};
		function sameRequest(left, right) {
			return left?.requestId === right.requestId && left.agentId === right.agentId && left.pluginId === right.pluginId && left.packageId === right.packageId && left.mode === right.mode && left.name === right.name && left.purpose === right.purpose && left.requiresApproval === right.requiresApproval;
		}
		//#endregion
		//#region lib/types/client/inspect-registry.js
		/** Browser registry for read-only Cordis capability providers. */
		/** Client provider registry, manifest publisher, and live query dispatcher. */
		var ClientCordisInspectRegistry = class {
			host;
			providers = /* @__PURE__ */ new Map();
			active = /* @__PURE__ */ new Map();
			publishQueued = false;
			syncChain = Promise.resolve();
			/** @param host - folded manifest and query result transport. */
			constructor(host) {
				this.host = host;
			}
			/**
			* Register one Client provider and publish a new complete manifest.
			* @param registration - provider manifest and local handler.
			* @returns idempotent disposer.
			*/
			register(registration) {
				const { manifest } = registration;
				if (manifest.id.trim() === "") throw new Error("Client Cordis inspect provider id must not be empty");
				if (this.providers.has(manifest.id)) throw new Error(`Client Cordis inspect provider "${manifest.id}" is already registered`);
				const names = /* @__PURE__ */ new Set();
				for (const method of manifest.methods) {
					if (names.has(method.name)) throw new Error(`Client Cordis inspect provider "${manifest.id}" repeats method "${method.name}"`);
					names.add(method.name);
				}
				this.providers.set(manifest.id, registration);
				this.publish();
				let disposed = false;
				return () => {
					if (disposed) return;
					disposed = true;
					if (this.providers.get(manifest.id) === registration) {
						this.providers.delete(manifest.id);
						this.publish();
					}
				};
			}
			/** Publish the current complete manifest, including after reconnect. */
			publish() {
				if (this.publishQueued) return;
				this.publishQueued = true;
				queueMicrotask(() => {
					this.publishQueued = false;
					const manifests = [...this.providers.values()].map((provider) => provider.manifest);
					this.syncChain = this.syncChain.then(async () => {
						await this.host.sync(manifests);
					}).catch((error) => {
						console.error("[cordis-client-runner] syncing inspect providers failed:", error);
					});
				});
			}
			/**
			* Execute and answer one Host-broadcast query.
			* @param request - exact provider query and Session correlation received from Host.
			* @returns after the first local result has been sent back to Host.
			*/
			async query(request) {
				if (this.active.has(request.requestId)) return;
				const controller = new AbortController();
				this.active.set(request.requestId, controller);
				let resolution;
				try {
					const provider = this.providers.get(request.provider);
					if (provider === void 0) resolution = {
						ok: false,
						reason: "provider-missing",
						message: `Client inspect provider "${request.provider}" is unavailable`
					};
					else if (!provider.manifest.methods.some((method) => method.name === request.method)) resolution = {
						ok: false,
						reason: "method-missing",
						message: `Client inspect provider "${request.provider}" has no method "${request.method}"`
					};
					else {
						const data = await provider.query(request.method, request.input, {
							signal: controller.signal,
							sessionId: request.agentId
						});
						resolution = controller.signal.aborted ? {
							ok: false,
							reason: "cancelled",
							message: "Client inspect query was cancelled"
						} : {
							ok: true,
							data
						};
					}
				} catch (error) {
					resolution = controller.signal.aborted ? {
						ok: false,
						reason: "cancelled",
						message: "Client inspect query was cancelled"
					} : {
						ok: false,
						reason: "provider-error",
						message: error instanceof Error ? error.message : String(error)
					};
				} finally {
					this.active.delete(request.requestId);
				}
				if (controller.signal.aborted) return;
				await this.host.resolve(request.agentId, request.requestId, resolution);
			}
			/**
			* Cancel local work after another page answered or the Tool call ended.
			* @param requestId - query correlation that is no longer answerable.
			*/
			close(requestId) {
				this.active.get(requestId)?.abort();
				this.active.delete(requestId);
			}
		};
		/**
		* Provide the registry as a normal Client service.
		* @param ctx - Client Cordis context receiving the service.
		* @param registry - page-local inspect registry to publish.
		*/
		function provideClientCordisInspect(ctx, registry) {
			ctx.provide("cordisInspect", registry);
		}
		//#endregion
		//#region lib/types/client/api-catalog.js
		/**
		* Generated by scripts/gen-cordis-inspect-catalog.ts — do not edit by hand; run
		* `pnpm run gen-cordis-inspect-catalog` to regenerate (freshness-gated by
		* `pnpm run verify-cordis-inspect-catalog` in doc-sync).
		*
		* The machine-readable cordis API catalog `cordis_inspect` serves to the
		* model: harness services (summary + structured public method contracts),
		* harness events (mode + structured listener contracts), and the inherited `ctx` API. Produced by
		* the same AST walk as docs/cordis-catalog, so this data and the rendered
		* docs cannot diverge.
		*
		* @module @deepseek-ai/dsh-cordis-client-runner/client/api-catalog
		*/
		/** Every harness `ctx.<key>` service, sorted by key. */
		const SERVICE_API = [
			{
				key: "layout",
				summary: "Panel navigation and geometry actions exposed through ctx.layout.",
				description: "Panel navigation and geometry actions exposed through ctx.layout.",
				methods: [
					{
						signature: "selectPanel(panelId: MainPanelId | null): void",
						description: "Select a global central panel without changing the current Session.",
						parameters: [{
							name: "panelId",
							description: "registered main key, or null to show the Conversation."
						}],
						throws: ["if the selected main key is not registered; preserves the current selection."]
					},
					{
						signature: "beginNavigation(): AbortSignal",
						description: "Start an asynchronous navigation, superseding any earlier pending navigation.",
						parameters: [],
						returns: "a signal aborted by the next navigation or layout disposal; check it before committing UI state."
					},
					{
						signature: "toggleSidebar(): void",
						description: "Toggle the sidebar panel (closed ⟷ contract default width).",
						parameters: []
					},
					{
						signature: "openRightbar(track: boolean, fullscreen: boolean): void",
						description: "Report the right panel's presentation without changing its expanded state.",
						parameters: [{
							name: "track",
							description: "whether the normal panel width reserves a grid track, including beneath a fullscreen overlay."
						}, {
							name: "fullscreen",
							description: "whether the panel covers the frame and hides its outer resize handle; independent of the underlying grid track."
						}]
					},
					{
						signature: "closeRightbar(): void",
						description: "Report the right panel as hidden: no track, no handle.",
						parameters: []
					}
				]
			},
			{
				key: "locale",
				summary: "Dictionary registry plus locale preference.",
				description: "Dictionary registry plus locale preference. Lookup walks the active language's declared fallback chain in the entry namespace, then repeats it in the shared common namespace before showing the key itself. Reads go through getLocale; preferences change only through setLocale, while language packs extend the catalog through addLanguage. Continuous sync uses the `locale/change` event or the LocaleFace getSnapshot/subscribe pair installed through `ctx.slots.installLocale`.",
				methods: [
					{
						signature: "getLocale(): LocaleSnapshot",
						description: "Read the current immutable locale snapshot.",
						parameters: [],
						returns: "the current snapshot (stable reference until the next change)."
					},
					{
						signature: "getSnapshot(): LocaleSnapshot",
						description: "LocaleFace getSnapshot: the current snapshot (carries `revision`; stable reference between changes, uSES-safe).",
						parameters: [],
						returns: "the current snapshot."
					},
					{
						signature: "subscribe(fn: () => void): () => void",
						description: "LocaleFace subscribe: notified on every snapshot change (locale switch or dictionary registration — registrations bump the revision so already rendered outlets pick up late-arriving dictionaries and locale definitions).",
						parameters: [{
							name: "fn",
							description: "change callback."
						}],
						returns: "unsubscribe."
					},
					{
						signature: "setLocale(id: string): void",
						description: "Switch the active locale — the only user preference write entry.\n\nThe durable write happens even when the id already matches the active locale, because the active value may be a provisional browser-derived or fallback resolution that nothing has stored yet. Picking the language already on screen is still an explicit choice, and it must survive a different browser sharing the same DSH home. Only the render notification is conditional: republishing an unchanged locale would churn every subscriber for nothing.",
						parameters: [{
							name: "id",
							description: "a registered locale id; unknown ids throw."
						}]
					},
					{
						signature: "addLanguage(input: LanguageRegistration): () => void",
						description: "Add one selectable language to the shared catalog. Its fallback must already be registered, and following fallback definitions must terminate at English. Dictionaries may register before or after this definition. Registration rechecks an unresolved Host preference and the browser's ordered language list. The caller owns the returned disposer; removing an active language falls back without clearing the stored id.",
						parameters: [{
							name: "input",
							description: "stable id, self-described label, and fallback language id."
						}],
						returns: "idempotent disposer removing this exact definition.",
						throws: ["when fields are malformed, the id is occupied, or the fallback target is unknown or creates a cycle."]
					},
					{
						signature: "register<N extends Extract<keyof LocaleNamespaceMap, string>>(ns: N, dicts: Record<BuiltInLocaleId, LocaleDictOf<N>>): () => void",
						description: "Register a declared namespace's dictionaries, all locales in one call — the typed form: each dictionary is checked against the namespace's LocaleNamespaceMap key union (a missing or extra key is a compile error), and every shipped locale is required (bilingual balance enforced at registration). Duplicate (ns, locale) throws (single occupant; a namespace's texts have one owner). Registration bumps the revision so mounted outlets pick up late-arriving dictionaries.",
						parameters: [{
							name: "ns",
							description: "a namespace merged into LocaleNamespaceMap."
						}, {
							name: "dicts",
							description: "complete dictionaries keyed by built-in locale id."
						}],
						returns: "disposer removing every locale registered by this call (idempotent)."
					},
					{
						signature: "register(ns: string, locale: string, dict: LocaleDict): () => void",
						description: "Single-locale untyped form for language-pack contributions and namespaces outside the merge table.",
						parameters: [
							{
								name: "ns",
								description: "namespace."
							},
							{
								name: "locale",
								description: "locale tag."
							},
							{
								name: "dict",
								description: "dictionary."
							}
						],
						returns: "disposer (idempotent).",
						throws: ["when locale is not a BCP 47-style tag."]
					},
					{
						signature: "bind<N extends Extract<keyof LocaleNamespaceMap, string>>(ns: N): TranslateNS<N>",
						description: "Bind a declared namespace to a translate function typed to its dictionary key union (plus the shared common vocabulary) — the same key domain the framework-injected `t` seat carries. The returned reference is stable per namespace (repeat binds return the same function), so it can ride inject surfaces without breaking memoization.",
						parameters: [{
							name: "ns",
							description: "a namespace merged into LocaleNamespaceMap."
						}],
						returns: "the typed translate function (reads the active locale at call time)."
					},
					{
						signature: "bind(ns: string): Translate",
						description: "Untyped form for namespaces outside the merge table (dynamic composition, tests).",
						parameters: [{
							name: "ns",
							description: "namespace."
						}],
						returns: "the translate function."
					}
				]
			},
			{
				key: "sessions",
				summary: "The sessions-service face injected as `ctx.sessions`.",
				description: "The sessions-service face injected as `ctx.sessions`.",
				methods: [
					{
						signature: "open(id: SessionId): void",
						description: "Select a session as current.",
						parameters: [{
							name: "id",
							description: "session id (must exist in the list; unknown ids fail loud)."
						}]
					},
					{
						signature: "openSubagent(address: SubagentAddress): void",
						description: "Open a healthy catalog child through its exact direct-parent address.",
						parameters: [{
							name: "address",
							description: "catalog-derived parent and child ids."
						}]
					},
					{
						signature: "setSubagentCatalogOpen(parentSessionId: SessionId, open: boolean): void",
						description: "Mark whether a catalog menu is consuming live membership updates.",
						parameters: [{
							name: "parentSessionId",
							description: "catalog owner."
						}, {
							name: "open",
							description: "current menu state."
						}]
					},
					{
						signature: "refreshSubagents(parentSessionId: SessionId): Promise<void>",
						description: "Refresh one direct-child catalog.",
						parameters: [{
							name: "parentSessionId",
							description: "catalog owner."
						}],
						returns: "completion of the current or newly started refresh."
					},
					{
						signature: "search( query: string, signal: AbortSignal, ): Promise<RemoteResult<{ items: SessionSearchResultItem[]; hasMore: boolean }>>",
						description: "Search the Host's visible message-content index. Results stay request-local; the list snapshot remains the metadata authority.",
						parameters: [{
							name: "query",
							description: "non-blank literal phrase."
						}, {
							name: "signal",
							description: "cancellation for a superseded search."
						}],
						returns: "bounded results, or a business/transport error."
					},
					{
						signature: "fork(opts: { sessionId: SessionId; atSeq?: number; increaseTitle?: boolean }): Promise<SessionId>",
						description: "Fork a session from a completed-turn prefix of the source; on resolution the child is in the list store and `open()` can target it.",
						parameters: [{
							name: "opts",
							description: "source session id, the optional event seq anchoring the cut (the boundary is the first turn/end at or after it; an in-log anchor in an open turn is unavailable rather than clipped backward), and whether to increment an inherited durable title before resolving."
						}],
						returns: "the child session id.",
						throws: ["when the fork fails, or when a requested child-title rename fails after creation."]
					},
					{
						signature: "scope(id: SessionId): AgentContext | undefined",
						description: "Resolve an Agent-scoped context view (use-and-discard).",
						parameters: [{
							name: "id",
							description: "session id."
						}],
						returns: "scoped ctx, or undefined for a session neither listed nor already scoped."
					},
					{
						signature: "binding(id: SessionId): SessionBinding | undefined",
						description: "Resolve the stable session binding (scope-addressed assembly feed).",
						parameters: [{
							name: "id",
							description: "session id."
						}],
						returns: "binding, or undefined for a session neither listed nor already scoped."
					}
				]
			},
			{
				key: "slots",
				summary: "cordis Service layer of the slot system; see the module doc for the split with SlotCore.",
				description: "cordis Service layer of the slot system; see the module doc for the split with SlotCore.",
				methods: [{
					signature: "declare readonly register: SlotCore['register']",
					description: "The single registration API. The typed face IS the core's register (both overloads reused verbatim — one authority, no structural copy; see SlotCore.register for children declaration, store seat, inject face, load-time validation, and the unload cascade). This layer adds: disposal through the caller's ctx.effect (fiber unload = cascade), exclusive-factory minting (`store: createXxxStore` becomes a per-entry handle), the registrant diagnostics stamp, and store-instance lifecycle on the entry axis.\n\nDeclared here, implemented by prototype assignment below the class: it MUST stay a prototype method (never an instance arrow) — the cordis service proxy binds `this.ctx` to the CALLER's context at call time, which is what routes the effect (and the unload cascade) into the caller's fiber. An arrow property would freeze `this` to the service's own root ctx and silently break per-plugin disposal.",
					parameters: []
				}, {
					signature: "inject(key: keyof SlotMap & string, callback: () => SlotInjectionEffect): () => void",
					description: "Install an effect for each declaration lifetime of a slot. The callback runs synchronously when the declaration already exists; otherwise it runs inside the declaring `register()` call after the declaration is committed. Collapse disposes the effect and a later declaration runs it again. Callback effects are synchronous disposers; iterable effects install transactionally and dispose in reverse order. The controller belongs to the caller's fiber, so plugin unload cancels a pending wait and removes any active contribution.",
					parameters: [{
						name: "key",
						description: "declared SlotMap key to depend on."
					}, {
						name: "callback",
						description: "creates one disposer or an iterable of disposers."
					}],
					returns: "idempotent disposer for the wait and active effect.",
					throws: ["callback setup failures synchronously when the slot is already declared."]
				}]
			},
			{
				key: "theme",
				summary: "Theme registry and preference owner.",
				description: "Theme registry and preference owner. `light`/`dark` are built in (the base stylesheets carry both palettes); third-party themes register alias-layer overrides. Reads go through getTheme; preference writes only through setTheme; continuous sync only through the `theme/change` event. overrideTokens stacks partial token layers over the active theme without touching the registry. The service holds the `prefers-color-scheme` media query (environment sensing, not presentation) and re-emits when the OS scheme flips while the preference is `system`.",
				methods: [
					{
						signature: "getTheme(): ThemeSnapshot",
						description: "Read the current immutable theme snapshot.",
						parameters: [],
						returns: "the current snapshot (stable reference until the next change)."
					},
					{
						signature: "setTheme(id: string): void",
						description: "Switch the theme preference — the only user preference write entry. Built-in preferences are written through the settings scope and every accepted value emits `theme/change`.",
						parameters: [{
							name: "id",
							description: "a registered theme id or `system`; unknown ids throw."
						}]
					},
					{
						signature: "setFontSize(px: number): void",
						description: "Change the conversation content font size — the only font-size write entry. Accepted values are written through the settings scope and emit `theme/change`.",
						parameters: [{
							name: "px",
							description: "integer px within FONT_SIZE_MIN..FONT_SIZE_MAX; out-of-range or fractional values throw."
						}]
					},
					{
						signature: "register(definition: ThemeDefinition): () => void",
						description: "Register a theme. Duplicate id throws (single occupant per id; the built-in pair counts; `system` is a preference, not a registrable id).",
						parameters: [{
							name: "definition",
							description: "theme id, colorScheme, and alias-token overrides."
						}],
						returns: "disposer. Disposing the theme backing the active preference resets the preference to the default so the UI never keeps tokens of an unregistered theme."
					},
					{
						signature: "overrideTokens(source: string, tokens: ThemeTokenOverrides): () => void",
						description: "Stack a token override layer on top of the active theme — the token-level analogue of slot shading: the base theme stays untouched, layers compose in seq order with later layers winning per-token, and removing a layer restores whatever it covered. Calling again with the same source replaces that source's whole layer and restacks it on top (effect re-registration semantics). Emits `theme/change` with the recomposed snapshot.",
						parameters: [{
							name: "source",
							description: "layer identity; one layer per source (dynamic packages pass their package id — the façade pins it, so it also names the layer's origin for inspection)."
						}, {
							name: "tokens",
							description: "token-name → `{ light, dark }` value pairs. Validated at runtime (model-authored callers reach this boundary with untyped JS); a bare string value throws a teaching error."
						}],
						returns: "disposer removing exactly the layer this call created; a no-op once the source has re-overridden (the newer layer is not torn down)."
					}
				]
			},
			{
				key: "timer",
				summary: "Disposable timer helpers mixed into Cordis contexts.",
				description: "Disposable timer helpers mixed into Cordis contexts.",
				methods: [
					{
						signature: "timeout(callback: () => void, delay: number): () => void",
						description: "Run a callback once and return its disposer.",
						parameters: []
					},
					{
						signature: "timeout(delay: number): Promise<void>",
						description: "Resolve after a delay; disposal rejects the pending promise.",
						parameters: []
					},
					{
						signature: "interval(callback: () => void, delay: number): () => void",
						description: "Run a callback repeatedly and return its disposer.",
						parameters: []
					},
					{
						signature: "interval<R = any>(delay: number): AsyncIterableIterator<void, R, void>",
						description: "Return an async iterator of timer ticks.",
						parameters: []
					},
					{
						signature: "throttle<F extends (...args: any[]) => void>(callback: F, delay: number, noTrailing?: boolean): F & { dispose: () => void }",
						description: "Return a throttled function whose timer is disposed with the current fiber.",
						parameters: []
					},
					{
						signature: "debounce<F extends (...args: any[]) => void>(callback: F, delay: number): F & { dispose: () => void }",
						description: "Return a debounced function whose timer is disposed with the current fiber.",
						parameters: []
					}
				]
			},
			{
				key: "uiWorkspace",
				summary: "Workspace archive and directory operations consumed by Client UI domains.",
				description: "Workspace archive and directory operations consumed by Client UI domains.",
				methods: [
					{
						signature: "openSession(sessionId: SessionId): void",
						description: "Select a Session and show its Conversation as one UI navigation action.",
						parameters: [{
							name: "sessionId",
							description: "listed or retained Session to display."
						}]
					},
					{
						signature: "openWorkspace(workspaceId: WorkspaceId, beforeOpen?: (sessionId: SessionId) => void): Promise<void>",
						description: "Connect a Workspace and open its Session unless a later navigation supersedes it.",
						parameters: [{
							name: "workspaceId",
							description: "target Workspace."
						}, {
							name: "beforeOpen",
							description: "optional synchronous preparation for the selected Session, skipped after supersession."
						}],
						returns: "completion; a superseded request may create a Session but does not open it."
					},
					{
						signature: "forkSession(sessionId: SessionId): Promise<void>",
						description: "Fork a Session and open the child unless a later navigation supersedes it.",
						parameters: [{
							name: "sessionId",
							description: "source Session."
						}],
						returns: "completion; a superseded request leaves its child available without selecting it."
					},
					{
						signature: "connectWorkspace(workspaceId: WorkspaceId): Promise<SessionId>",
						description: "Resolve the reusable or newly created blank Session for a Workspace.",
						parameters: [{
							name: "workspaceId",
							description: "target Workspace."
						}],
						returns: "a Session already addressable through the Session Controller."
					},
					{
						signature: "startSession(workspaceId?: WorkspaceId): void",
						description: "Start a New Session flow and navigate to its Session.",
						parameters: [{
							name: "workspaceId",
							description: "explicit target; absent inherits the current or most recent Workspace."
						}]
					},
					{
						signature: "archiveSession(sessionId: SessionId): Promise<void>",
						description: "Archive a Session and clear it when it is the current selection.",
						parameters: [{
							name: "sessionId",
							description: "Session to archive."
						}]
					},
					{
						signature: "pickDirectory(): Promise<string | null>",
						description: "Open the Host-native directory picker.",
						parameters: [],
						returns: "the selected directory, or null when cancelled."
					},
					{
						signature: "listDirectory(path?: string, signal?: AbortSignal): Promise<DirectoryListing>",
						description: "List one Host directory level.",
						parameters: [{
							name: "path",
							description: "directory path; absent selects the Host home."
						}, {
							name: "signal",
							description: "cancellation for a superseded scan."
						}],
						returns: "directory entries and breadcrumb ancestry."
					},
					{
						signature: "createDirectory(path: string, name: string): Promise<string>",
						description: "Create a child directory.",
						parameters: [{
							name: "path",
							description: "existing parent directory."
						}, {
							name: "name",
							description: "child directory name."
						}],
						returns: "created absolute path."
					}
				]
			},
			{
				key: "workspaces",
				summary: "Workspace Controller's Client service face.",
				description: "Workspace Controller's Client service face.",
				methods: [
					{
						signature: "create(input: { path: string }): Promise<WorkspaceView>",
						description: "Register an existing path as a Workspace.",
						parameters: [{
							name: "input",
							description: "Host create payload."
						}],
						returns: "the created or idempotently resolved Workspace."
					},
					{
						signature: "rename(workspaceId: WorkspaceId, title: string): Promise<WorkspaceView>",
						description: "Rename a Workspace.",
						parameters: [{
							name: "workspaceId",
							description: "target Workspace."
						}, {
							name: "title",
							description: "new display title."
						}],
						returns: "the renamed Workspace."
					},
					{
						signature: "delete(workspaceId: WorkspaceId): Promise<void>",
						description: "Delete a Workspace registration without deleting Sessions or files.",
						parameters: [{
							name: "workspaceId",
							description: "target Workspace."
						}]
					},
					{
						signature: "archiveSession(sessionId: SessionId): Promise<void>",
						description: "Archive a Session from Workspace grouping surfaces.",
						parameters: [{
							name: "sessionId",
							description: "Session to archive."
						}]
					},
					{
						signature: "insertSessionBefore( workspaceId: WorkspaceId, sessionId: SessionId, beforeSessionId?: SessionId, ): Promise<WorkspaceView>",
						description: "Move a Session within one Workspace account.",
						parameters: [
							{
								name: "workspaceId",
								description: "owning Workspace."
							},
							{
								name: "sessionId",
								description: "Session to move."
							},
							{
								name: "beforeSessionId",
								description: "anchor Session; omitted appends."
							}
						],
						returns: "the changed Workspace."
					}
				]
			}
		];
		/** Every harness event, sorted by name. */
		const EVENT_API = [
			{
				name: "connection/reset",
				mode: "emit",
				signature: "'connection/reset'(): void",
				summary: "A connection generation was established.",
				description: "A connection generation was established. Wire-derived caches must repull; long-lived streams own their own resume and baseline lifecycle.",
				parameters: []
			},
			{
				name: "locale/change",
				mode: "emit",
				signature: "'locale/change'(snapshot: LocaleSnapshot): void",
				summary: "The active locale switched.",
				description: "The active locale switched. Dictionary registrations do NOT emit this event (listeners may re-register slots in response, and boot registers one namespace per package); continuous render refresh rides the LocaleFace revision instead.",
				parameters: [{
					name: "snapshot",
					description: "Current immutable locale snapshot."
				}]
			},
			{
				name: "slots/changed",
				mode: "emit",
				signature: "'slots/changed'(key: string): void",
				summary: "A slot declaration or registration set changed.",
				description: "A slot declaration or registration set changed.",
				parameters: [{
					name: "key",
					description: "mutated SlotMap key."
				}]
			},
			{
				name: "theme/change",
				mode: "emit",
				signature: "'theme/change'(snapshot: ThemeSnapshot): void",
				summary: "Theme state changed (preference switched, registry updated, or the OS color scheme changed while the preference is `system`).",
				description: "Theme state changed (preference switched, registry updated, or the OS color scheme changed while the preference is `system`).",
				parameters: [{
					name: "snapshot",
					description: "Current immutable theme snapshot."
				}]
			}
		];
		/** Shapes of every exported type the Service and Event signatures reference (transitively), sorted by name. */
		const TYPE_API = [
			{
				name: "ActionsDecl",
				declaration: "export type ActionsDecl<T> = Record<string, (draft: T, ...params: any[]) => void>;"
			},
			{
				name: "AgentContext",
				declaration: "export type AgentContext = Omit<Context, 'remote'> & {\n    readonly remote: ClientRemote & TypertRemoteScopeApi<'agent'>;\n};"
			},
			{
				name: "AssistantLiveChunkEvent",
				declaration: "export interface AssistantLiveChunkEvent {\n    readonly type: 'assistant/live-chunk';\n    readonly seq: number;\n    readonly time: number;\n    readonly data: {\n        readonly attemptId: LlmAttemptId;\n        readonly turn: number;\n        readonly step: number;\n        readonly chunk: StreamChunk;\n    };\n}"
			},
			{
				name: "BakedActions",
				declaration: "export type BakedActions<T, A extends ActionsDecl<T>> = {\n    [K in keyof A]: A[K] extends (draft: T, ...params: infer P) => void ? (...params: P) => void : never;\n};"
			},
			{
				name: "BeginSubmissionInput",
				declaration: "export interface BeginSubmissionInput {\n    readonly mode: 'queue' | 'steer';\n    readonly text: string;\n    readonly attachments: readonly PendingSubmissionAttachment[];\n    readonly onRetire?: (retirement: PendingSubmissionRetirement) => void;\n}"
			},
			{
				name: "BoundActions",
				declaration: "export type BoundActions<H> = H extends StoreHandle<infer T, infer A> ? BakedActions<T, A> : never;"
			},
			{
				name: "BuiltInLocaleId",
				declaration: "export type BuiltInLocaleId = typeof LOCALE_IDS[number];"
			},
			{
				name: "ChainKeysOf",
				declaration: "export type ChainKeysOf<S extends keyof SlotMap & string> = S extends unknown ? (SlotMap[S]['kind'] extends 'chain' ? S : never) : never;"
			},
			{
				name: "ChainRenderOpts",
				declaration: "export interface ChainRenderOpts {\n    fallback?: ReactNode;\n    fallbackOnly?: boolean;\n    overlay?: boolean;\n}"
			},
			{
				name: "ChildrenDecl",
				declaration: "export type ChildrenDecl = {\n    [P in keyof SlotMap & string]?: SlotSpec<SlotMap[P]>;\n};"
			},
			{
				name: "ClientConnectionRpc",
				declaration: "export interface ClientConnectionRpc {\n    call(channel: string, endpoint: string, payload: unknown, signal?: AbortSignal): Promise<ConnectionRpcResult<unknown>>;\n    readonly open?: (channel: string, endpoint: string, payload: unknown, signal: AbortSignal) => AsyncIterable<unknown>;\n}"
			},
			{
				name: "ClientRemote",
				declaration: "export interface ClientRemote extends TypertClientRemote {\n    $stream<Item>(options: RemoteStreamOptions<Item>): RemoteStream<Item>;\n    readonly $host: RemoteHostFacts;\n}"
			},
			{
				name: "CommonKeyOf",
				declaration: "export type CommonKeyOf = LocaleNamespaceMap extends {\n    common: infer C;\n} ? C & string : never;"
			},
			{
				name: "ComposedProps",
				declaration: "export type ComposedProps<K extends keyof SlotMap & string, EntryKey extends EntryKeyOf<K>, S extends keyof SlotMap & string, H, I extends object, M = never, N = undefined> = PropsRuntime<K, EntryKey> & PropsRenderSlots<S> & PropsStore<H> & InjectFace<I> & MatchedShare<SlotMap[K], M> & PropsLocale<N>;"
			},
			{
				name: "ConnectionGeneration",
				declaration: "export interface ConnectionGeneration {\n    readonly id: number;\n    readonly host: ConnectionHostInfo;\n}"
			},
			{
				name: "ConnectionGenerationSource",
				declaration: "export type ConnectionGenerationSource = (signal: AbortSignal, ready: (host: ConnectionHostInfo) => void) => Promise<void>;"
			},
			{
				name: "ConnectionGenerationState",
				declaration: "export interface ConnectionGenerationState {\n    getSnapshot(): ConnectionGeneration | undefined;\n    subscribe(listener: () => void): () => void;\n}"
			},
			{
				name: "ConnectionHandle",
				declaration: "export interface ConnectionHandle {\n    readonly isLoopback: boolean;\n    readonly generation: ConnectionGenerationState;\n    readonly state: ConnectionStateSource;\n    readonly rpc: ClientConnectionRpc;\n    reconnect(): void;\n    registerGenerationSource(source: ConnectionGenerationSource): () => void;\n    start(sinks: ConnectionSinks, config?: ConnectionRecoveryConfig): ConnectionLoop;\n}"
			},
			{
				name: "ConnectionHostInfo",
				declaration: "export interface ConnectionHostInfo {\n    readonly home: string;\n}"
			},
			{
				name: "ConnectionLoop",
				declaration: "export interface ConnectionLoop {\n    stop(): void;\n}"
			},
			{
				name: "ConnectionRecoveryConfig",
				declaration: "export interface ConnectionRecoveryConfig {\n    backoffBaseMs?: number;\n    backoffFactor?: number;\n    backoffMaxMs?: number;\n    generationReadyWarnMs?: number;\n    generationReadyTimeoutMs?: number;\n}"
			},
			{
				name: "ConnectionRpcFailure",
				declaration: "export interface ConnectionRpcFailure {\n    readonly code: string;\n    readonly message: string;\n    readonly details: object;\n}"
			},
			{
				name: "ConnectionRpcResult",
				declaration: "export type ConnectionRpcResult<T> = {\n    readonly ok: true;\n    readonly value: T;\n} | {\n    readonly ok: false;\n    readonly error: ConnectionRpcFailure;\n};"
			},
			{
				name: "ConnectionSinks",
				declaration: "export interface ConnectionSinks {\n    onConnected?: (host: ConnectionHostInfo) => void;\n    onStateChange?: (state: ConnectionState) => void;\n    onReconnectRequested?: () => void;\n}"
			},
			{
				name: "ConnectionState",
				declaration: "export type ConnectionState = 'connected' | 'disconnected' | 'connecting';"
			},
			{
				name: "ConnectionStateSource",
				declaration: "export interface ConnectionStateSource {\n    getSnapshot(): ConnectionState | undefined;\n    subscribe(listener: () => void): () => void;\n}"
			},
			{
				name: "EntryKeyOf",
				declaration: "export type EntryKeyOf<K extends keyof SlotMap & string> = SlotMap[K] extends {\n    kind: 'keyed';\n    keyProps: infer P extends object;\n} ? keyof P & string : string;"
			},
			{
				name: "GlobalStandardProps",
				declaration: "export interface GlobalStandardProps {\n}"
			},
			{
				name: "HandleOf",
				declaration: "export type HandleOf<H> = H extends () => infer R ? R : H;"
			},
			{
				name: "HooksSources",
				declaration: "export type HooksSources = Record<string, HostObservable<unknown>>;"
			},
			{
				name: "HostObservable",
				declaration: "export type HostObservable<T> = ObservableSnapshot<T>;"
			},
			{
				name: "InjectFace",
				declaration: "export type InjectFace<I extends object> = I extends {\n    hooks: infer HS extends HooksSources;\n} ? I extends {\n    keyedHooks: infer KS extends KeyedHooksSources;\n} ? Omit<I, 'hooks' | 'keyedHooks'> & PropsHooks<HS> & PropsKeyedHooks<KS> : Omit<I, 'hooks'> & PropsHooks<HS> : I extends {\n    keyedHooks: infer KS extends KeyedHooksSources;\n} ? Omit<I, 'keyedHooks'> & PropsKeyedHooks<KS> : I;"
			},
			{
				name: "InjectParams",
				declaration: "export type InjectParams<K extends keyof SlotMap & string, H> = ScopeOf<K> extends 'session' ? ([\n    H\n] extends [\n    StoreDecl\n] ? [\n    sessionId: SessionIdOf,\n    actions: BoundActions<HandleOf<H>>\n] : [\n    sessionId: SessionIdOf\n]) : ScopeOf<K> extends 'session-maybe' ? ([\n    H\n] extends [\n    StoreDecl\n] ? [\n    sessionId: SessionIdOf | undefined,\n    actions: BoundActions<HandleOf<H>> | undefined\n] : [\n    sessionId: SessionIdOf | undefined\n]) : ([\n    H\n] extends [\n    StoreDecl\n] ? [\n    actions: BoundActions<HandleOf<H>>\n] : [\n]);"
			},
			{
				name: "ISession",
				declaration: "export interface ISession {\n    readonly sessionId: SessionId;\n    readonly projections: ProjectionsFace;\n    beginSubmission(input: BeginSubmissionInput): SubmissionHandle;\n    prompt(content: PromptContentPart[], mode: 'queue' | 'steer', signal?: AbortSignal, requestId?: SessionRequestId): Promise<RemoteResult<{\n        accepted: true;\n    }>>;\n    readAttachment(attachmentId: AttachmentIdType): Promise<RemoteResult<{\n        attachment: ImageAttachmentRef;\n        data: Uint8Array;\n    }>>;\n    updateQueue(itemId: MessageId, action: QueueAction): Promise<RemoteResult<{\n        accepted: true;\n    }>>;\n    cancel(): Promise<RemoteResult<{\n        accepted: true;\n    }>>;\n    rename(title: string): Promise<RemoteResult<{\n        title: string;\n        seq: SessionSeq;\n    }>>;\n    loadOlder(): Promise<void>;\n    loadThrough(seq: SessionSeq): Promise<void>;\n    command(line: string): Promise<RemoteResult<{\n        matched: boolean;\n    }>>;\n}"
			},
			{
				name: "KeyedHooksSources",
				declaration: "export type KeyedHooksSources = Record<string, KeyedStandardSource>;"
			},
			{
				name: "KeyedSnapshotSelectorHook",
				declaration: "export type KeyedSnapshotSelectorHook<Snapshot> = {\n    (key: string): Snapshot | undefined;\n    <Selected>(key: string, selector: (value: Snapshot | undefined) => Selected, equal?: (left: Selected, right: Selected) => boolean): Selected;\n};"
			},
			{
				name: "KeyedStandardSource",
				declaration: "export type KeyedStandardSource = (key: string) => HostObservable<unknown> | undefined;"
			},
			{
				name: "KeyPropsOf",
				declaration: "export type KeyPropsOf<K extends keyof SlotMap & string, EntryKey extends EntryKeyOf<K>> = SlotMap[K] extends {\n    kind: 'keyed';\n    keyProps: infer P extends object;\n} ? EntryKey extends keyof P ? P[EntryKey] extends object ? P[EntryKey] : never : never : object;"
			},
			{
				name: "LanguageRegistration",
				declaration: "export interface LanguageRegistration {\n    id: LocaleId;\n    label: string;\n    fallback: LocaleId;\n}"
			},
			{
				name: "LocaleDefinition",
				declaration: "export interface LocaleDefinition {\n    readonly id: LocaleId;\n    readonly label: string;\n    readonly fallback?: LocaleId;\n}"
			},
			{
				name: "LocaleDict",
				declaration: "export type LocaleDict = Record<string, string>;"
			},
			{
				name: "LocaleDictOf",
				declaration: "export type LocaleDictOf<N extends keyof LocaleNamespaceMap & string> = Record<LocaleNamespaceMap[N] & string, string>;"
			},
			{
				name: "LocaleId",
				declaration: "export type LocaleId = string;"
			},
			{
				name: "LocaleKeysOf",
				declaration: "export type LocaleKeysOf<N extends keyof LocaleNamespaceMap & string> = (LocaleNamespaceMap[N] & string) | CommonKeyOf;"
			},
			{
				name: "LocaleNamespaceMap",
				declaration: "export interface LocaleNamespaceMap {\n}"
			},
			{
				name: "LocaleSnapshot",
				declaration: "export interface LocaleSnapshot {\n    active: LocaleId;\n    locales: readonly LocaleDefinition[];\n    revision: number;\n}"
			},
			{
				name: "MainPanelId",
				declaration: "export type MainPanelId = Branded<'MainPanelId'>;"
			},
			{
				name: "MatchedShare",
				declaration: "export type MatchedShare<E extends SlotEntryDef, M> = E['kind'] extends 'chain' ? {\n    matched: M;\n} : object;"
			},
			{
				name: "ObservableSnapshot",
				declaration: "export interface ObservableSnapshot<T> {\n    getSnapshot(): T;\n    subscribe(fn: () => void): () => void;\n}"
			},
			{
				name: "OpenState",
				declaration: "export type OpenState = 'cold' | 'loading' | 'open' | 'error';"
			},
			{
				name: "OwnerOf",
				declaration: "export type OwnerOf<K extends keyof SlotMap & string> = SlotMap[K] extends {\n    owner: infer O extends object;\n} ? O : object;"
			},
			{
				name: "PendingSubmission",
				declaration: "export interface PendingSubmission {\n    readonly requestId: SessionRequestId;\n    readonly placement: PendingSubmissionPlacement;\n    readonly time: number;\n    readonly text: string;\n    readonly attachments: readonly PendingSubmissionAttachment[];\n}"
			},
			{
				name: "PendingSubmissionAttachment",
				declaration: "export type PendingSubmissionAttachment = PendingSubmissionImageAttachment | PendingSubmissionFileAttachment;"
			},
			{
				name: "PendingSubmissionFileAttachment",
				declaration: "export interface PendingSubmissionFileAttachment {\n    readonly type: 'file';\n    readonly value: FileAttachmentRef;\n}"
			},
			{
				name: "PendingSubmissionImage",
				declaration: "export interface PendingSubmissionImage {\n    readonly previewUrl: string;\n    readonly name?: string;\n    readonly width?: number;\n    readonly height?: number;\n}"
			},
			{
				name: "PendingSubmissionImageAttachment",
				declaration: "export interface PendingSubmissionImageAttachment {\n    readonly type: 'image';\n    readonly value: PendingSubmissionImage;\n}"
			},
			{
				name: "PendingSubmissionPlacement",
				declaration: "export type PendingSubmissionPlacement = 'transcript' | 'queued' | 'steering';"
			},
			{
				name: "PendingSubmissionRetirement",
				declaration: "export type PendingSubmissionRetirement = {\n    readonly reason: 'observed';\n    readonly attachments: readonly (ImageAttachmentRef | FileAttachmentRef)[];\n} | {\n    readonly reason: 'failed';\n};"
			},
			{
				name: "ProjectionsFace",
				declaration: "export interface ProjectionsFace {\n    faceOf(key: string): ObservableSnapshot<unknown>;\n}"
			},
			{
				name: "PromptContentPart",
				declaration: "export type PromptContentPart = {\n    readonly type: 'text';\n    readonly text: string;\n} | {\n    readonly type: 'image';\n    readonly mediaType: ImageMediaType;\n    readonly data: string;\n    readonly name?: string;\n} | {\n    readonly type: 'file';\n    readonly receiptId: Branded<'file-upload-receipt-id'>;\n};"
			},
			{
				name: "PromptError",
				declaration: "export interface PromptError {\n    readonly op: 'send' | 'stop';\n    readonly error: RemoteFailure;\n}"
			},
			{
				name: "PropsHooks",
				declaration: "export type PropsHooks<HS extends HooksSources> = {\n    [N in keyof HS & string as `use${Capitalize<N>}`]: SnapshotSelectorHook<HS[N] extends HostObservable<infer T> ? T : never>;\n};"
			},
			{
				name: "PropsKeyedHooks",
				declaration: "export type PropsKeyedHooks<HS extends KeyedHooksSources> = {\n    [N in keyof HS & string as `use${Capitalize<N>}`]: KeyedSnapshotSelectorHook<HS[N] extends (key: string) => HostObservable<infer T> | undefined ? T : never>;\n};"
			},
			{
				name: "PropsLocale",
				declaration: "export type PropsLocale<N> = N extends keyof LocaleNamespaceMap & string ? {\n    t: TranslateNS<N>;\n} : object;"
			},
			{
				name: "PropsRenderSlots",
				declaration: "export type PropsRenderSlots<S extends keyof SlotMap & string> = {\n    renderSlot: RenderSlotFn<Exclude<S, ChainKeysOf<S>>>;\n    readonly __renders?: ((key: S) => void) | undefined;\n} & ([\n    ChainKeysOf<S>\n] extends [\n    never\n] ? object : {\n    renderSlotChain: <K extends ChainKeysOf<S>>(key: K, owner: OwnerOf<K>, opts?: ChainRenderOpts) => ReactNode;\n}) & ('session' extends ScopeOf<S> ? {\n    SessionProvider: SessionProviderComponent;\n} : object);"
			},
			{
				name: "PropsRuntime",
				declaration: "export type PropsRuntime<K extends keyof SlotMap & string, EntryKey extends EntryKeyOf<K> = EntryKeyOf<K>> = OwnerOf<K> & KeyPropsOf<K, EntryKey> & SlotInjectFace<SlotInjectOf<K>> & (ScopeOf<K> extends 'session' ? SessionStandardProps : ScopeOf<K> extends 'session-maybe' ? SessionMaybeStandardProps : object) & GlobalStandardProps;"
			},
			{
				name: "PropsSlotHooks",
				declaration: "export type PropsSlotHooks<HS extends object> = {\n    [N in keyof HS & string as `use${Capitalize<N>}`]: BoundHookOf<HS[N]>;\n};"
			},
			{
				name: "PropsStore",
				declaration: "export type PropsStore<H> = H extends StoreHandle<infer T, infer A> ? {\n    useStore: SnapshotSelectorHook<T>;\n    actions: BakedActions<T, A>;\n} : object;"
			},
			{
				name: "RemoteHostFacts",
				declaration: "export interface RemoteHostFacts {\n    readonly home: string | undefined;\n    readonly isLoopback: boolean;\n}"
			},
			{
				name: "RemoteStream",
				declaration: "export class RemoteStream<Item> implements AsyncIterable<RemoteStreamItem<Item>> {\n    constructor(private readonly connection: Pick<ConnectionHandle, 'generation'>, private readonly options: RemoteStreamOptions<Item>);\n    get signal(): AbortSignal;\n    restart(): void;\n    dispose(): Promise<void>;\n    [Symbol.asyncIterator](): AsyncIterator<RemoteStreamItem<Item>>;\n}"
			},
			{
				name: "RemoteStreamCarrierError",
				declaration: "export class RemoteStreamCarrierError extends Error {\n    constructor(message: string, options?: ErrorOptions);\n}"
			},
			{
				name: "RemoteStreamItem",
				declaration: "export interface RemoteStreamItem<Item> {\n    readonly generation: number;\n    readonly value: Item;\n    readonly signal: AbortSignal;\n    accept(): void;\n}"
			},
			{
				name: "RemoteStreamOptions",
				declaration: "export interface RemoteStreamOptions<Item> {\n    readonly name: string;\n    readonly open: (signal: AbortSignal) => AsyncIterable<Item>;\n    readonly ended: (accepted: boolean) => Error;\n    readonly carrierFailed?: (error: RemoteStreamCarrierError) => void;\n}"
			},
			{
				name: "ScopeOf",
				declaration: "export type ScopeOf<K extends keyof SlotMap & string> = SlotMap[K]['scope'];"
			},
			{
				name: "SessionAreaProps",
				declaration: "export interface SessionAreaProps {\n    empty?: (() => ReactNode) | undefined;\n    children: ReactNode;\n}"
			},
			{
				name: "SessionAssistantSettlementEntry",
				declaration: "export interface SessionAssistantSettlementEntry {\n    readonly type: 'event';\n    readonly event: SessionEvent<'assistant/message'> | SessionEvent<'assistant/attempt'>;\n}"
			},
			{
				name: "SessionBinding",
				declaration: "export interface SessionBinding {\n    readonly sessionId: SessionId;\n    readonly session: SessionFace;\n    readonly eventSource: SessionEventSource;\n    readonly ctx: AgentContext;\n}"
			},
			{
				name: "SessionEventChange",
				declaration: "export type SessionEventChange = {\n    readonly kind: 'replace';\n    readonly entries: readonly SessionEventLikeEntry[];\n} | {\n    readonly kind: 'prepend';\n    readonly entries: readonly SessionEventLikeEntry[];\n} | {\n    readonly kind: 'append';\n    readonly entries: readonly SessionEventLikeEntry[];\n} | {\n    readonly kind: 'settle-assistant';\n    readonly attemptId: LlmAttemptId;\n    readonly entry?: SessionAssistantSettlementEntry;\n};"
			},
			{
				name: "SessionEventLikeEntry",
				declaration: "export type SessionEventLikeEntry = {\n    readonly type: 'event';\n    readonly event: SessionEvent;\n} | {\n    readonly type: 'transient';\n    readonly event: AssistantLiveChunkEvent;\n};"
			},
			{
				name: "SessionEventSource",
				declaration: "export type SessionEventSource = ObservableSnapshot<SessionEventWindow>;"
			},
			{
				name: "SessionEventWindow",
				declaration: "export interface SessionEventWindow {\n    readonly entries: readonly SessionEventLikeEntry[];\n    readonly hasMore: boolean;\n    readonly revision: number;\n    readonly change: SessionEventChange;\n}"
			},
			{
				name: "SessionFace",
				declaration: "export type SessionFace = ISession & ObservableSnapshot<SessionSnapshot>;"
			},
			{
				name: "SessionIdOf",
				declaration: "export type SessionIdOf = SessionStandardProps extends {\n    sessionId: infer S;\n} ? S : string;"
			},
			{
				name: "SessionMaybeStandardProps",
				declaration: "export interface SessionMaybeStandardProps {\n}"
			},
			{
				name: "SessionProviderComponent",
				declaration: "export type SessionProviderComponent = (props: SessionAreaProps) => ReactNode;"
			},
			{
				name: "SessionRequestId",
				declaration: "export type SessionRequestId = Branded<'session-request-id'>;"
			},
			{
				name: "SessionSearchResultItem",
				declaration: "export interface SessionSearchResultItem {\n    sessionId: SessionId;\n    snippet: string;\n}"
			},
			{
				name: "SessionSnapshot",
				declaration: "export interface SessionSnapshot {\n    readonly sessionId: SessionId;\n    readonly queue: readonly QueuedMessage[];\n    readonly pendingSubmissions: readonly PendingSubmission[];\n    readonly running: boolean;\n    readonly subagent: {\n        readonly address: SubagentAddress;\n        readonly parentAvailable?: boolean;\n    } | null;\n    readonly removed: boolean;\n    readonly openState: OpenState;\n    readonly openError: RemoteFailure | null;\n    readonly hasMore: boolean;\n    readonly loadingOlder: boolean;\n    readonly promptError: PromptError | null;\n    readonly blank: boolean;\n    readonly lastAgentError: string | null;\n    readonly promptAttempted: boolean;\n    readonly awaitingFirstTurn: boolean;\n}"
			},
			{
				name: "SessionStandardProps",
				declaration: "export interface SessionStandardProps {\n}"
			},
			{
				name: "SlotComponent",
				declaration: "export type SlotComponent<P> = (props: P) => ReactNode;"
			},
			{
				name: "SlotCore",
				declaration: "export class SlotCore {\n    constructor();\n    register<K extends keyof SlotMap & string, const EntryKey extends EntryKeyOf<K> = EntryKeyOf<K>, const D extends ChildrenDecl = Record<never, never>, H extends StoreDecl | undefined = undefined, M = never, N extends (keyof LocaleNamespaceMap & string) | undefined = undefined, C extends SlotComponent<never> = SlotComponent<never>>(options: BaseOptions<K, EntryKey, D, H, M, N> & {\n        inject?: undefined;\n    }, component: C & SlotComponent<ComposedProps<K, NoInfer<EntryKey>, keyof NoInfer<D> & keyof SlotMap & string, HandleOf<NoInfer<H>>, object, NoInfer<M>, NoInfer<N>>> & RendersCheck<C, D>): () => void;\n    register<K extends keyof SlotMap & string, I extends object, const EntryKey extends EntryKeyOf<K> = EntryKeyOf<K>, const D extends ChildrenDecl = Record<never, never>, H extends StoreDecl | undefined = undefined, M = never, N extends (keyof LocaleNamespaceMap & string) | undefined = undefined, C extends SlotComponent<never> = SlotComponent<never>>(options: BaseOptions<K, EntryKey, D, H, M, N> & {\n        inject: (...args: InjectParams<K, H>) => I;\n    }, component: C & SlotComponent<ComposedProps<K, NoInfer<EntryKey>, keyof NoInfer<D> & keyof SlotMap & string, HandleOf<NoInfer<H>>, I, NoInfer<M>, NoInfer<N>>> & RendersCheck<C, D>): () => void;\n    register(options: ErasedOptions, component: unknown): () => void;\n    isLive(entry: StoredEntry): boolean;\n    entries(key: string): readonly StoredEntry[];\n    entriesOfSlot(key /* …truncated — full shape in source */"
			},
			{
				name: "SlotEntryDef",
				declaration: "export interface SlotEntryDef {\n    kind: SlotKind;\n    scope: SlotScope;\n    owner?: object;\n    keyProps?: Record<string, object>;\n    hookContext?: unknown;\n    inject?: object;\n}"
			},
			{
				name: "SlotInjectFace",
				declaration: "export type SlotInjectFace<I extends object> = I extends {\n    hooks: infer HS extends object;\n} ? Omit<I, 'hooks'> & PropsSlotHooks<HS> : I;"
			},
			{
				name: "SlotInjectOf",
				declaration: "export type SlotInjectOf<K extends keyof SlotMap & string> = SlotMap[K] extends {\n    inject: infer Injected extends object;\n} ? Injected : object;"
			},
			{
				name: "SlotKind",
				declaration: "export type SlotKind = 'single' | 'list' | 'keyed' | 'chain';"
			},
			{
				name: "SlotLabel",
				declaration: "export type SlotLabel = string | (() => string);"
			},
			{
				name: "SlotMap",
				declaration: "export interface SlotMap {\n}"
			},
			{
				name: "SlotScope",
				declaration: "export type SlotScope = 'root' | 'session-maybe' | 'session';"
			},
			{
				name: "SlotSpec",
				declaration: "export type SlotSpec<E extends SlotEntryDef> = {\n    kind: E['kind'];\n    scope: E['scope'];\n} & ('inject' extends keyof E ? E extends {\n    inject: infer Injected extends object;\n} ? {\n    inject: Injected;\n} : {\n    inject?: object;\n} : {\n    inject?: never;\n});"
			},
			{
				name: "SnapshotSelectorHook",
				declaration: "export type SnapshotSelectorHook<T> = <S>(sel: (s: T) => S, eq?: (a: S, b: S) => boolean) => S;"
			},
			{
				name: "StoreDecl",
				declaration: "export type StoreDecl = StoreHandle<any, any> | StoreFactory;"
			},
			{
				name: "StoredEntry",
				declaration: "export interface StoredEntry {\n    component: unknown;\n    options: {\n        key?: string;\n        id?: string;\n        order?: number;\n        label?: SlotLabel;\n        priority?: number;\n    };\n    select?: ((owner: never) => unknown) | undefined;\n    inject?: ((...args: never[]) => Record<string, unknown>) | undefined;\n    children?: Readonly<Record<string, SlotSpec<SlotEntryDef>>> | undefined;\n    store?: StoreDecl | undefined;\n    locale?: string | undefined;\n    registrant?: string | undefined;\n}"
			},
			{
				name: "StoreFactory",
				declaration: "export type StoreFactory = () => StoreHandle<any, any>;"
			},
			{
				name: "StoreHandle",
				declaration: "export interface StoreHandle<T, A extends ActionsDecl<T>> {\n    readonly spec: StoreSpec<T, A>;\n    create(scopeKey?: string): StoreInstance<T, A>;\n}"
			},
			{
				name: "StoreInstance",
				declaration: "export interface StoreInstance<T, A extends ActionsDecl<T>> {\n    readonly actions: BakedActions<T, A>;\n    getSnapshot(): T;\n    subscribe(fn: () => void): () => void;\n    clearPersisted(): void;\n}"
			},
			{
				name: "StoreSpec",
				declaration: "export interface StoreSpec<T, A extends ActionsDecl<T>> {\n    init: () => T;\n    persist?: string;\n    actions: A;\n}"
			},
			{
				name: "SubmissionHandle",
				declaration: "export interface SubmissionHandle {\n    readonly requestId: SessionRequestId;\n    abandon(): void;\n}"
			},
			{
				name: "ThemeDefinition",
				declaration: "export interface ThemeDefinition {\n    id: string;\n    colorScheme: 'light' | 'dark';\n    tokens: ThemeTokens;\n}"
			},
			{
				name: "ThemePreference",
				declaration: "export type ThemePreference = typeof THEME_PREFERENCES[number];"
			},
			{
				name: "ThemeSnapshot",
				declaration: "export interface ThemeSnapshot {\n    preference: ThemePreference;\n    fontSize: number;\n    active: ThemeDefinition;\n    themes: readonly ThemeDefinition[];\n    revision: number;\n}"
			},
			{
				name: "ThemeTokenModes",
				declaration: "export interface ThemeTokenModes {\n    light: string;\n    dark: string;\n}"
			},
			{
				name: "ThemeTokenOverrides",
				declaration: "export type ThemeTokenOverrides = Record<string, ThemeTokenModes>;"
			},
			{
				name: "ThemeTokens",
				declaration: "export type ThemeTokens = Record<string, string>;"
			},
			{
				name: "Translate",
				declaration: "export type Translate<K extends string = string> = (key: K, params?: Record<string, unknown>) => string;"
			},
			{
				name: "TranslateNS",
				declaration: "export type TranslateNS<N extends keyof LocaleNamespaceMap & string> = Translate<LocaleKeysOf<N>>;"
			},
			{
				name: "WorkspaceView",
				declaration: "export interface WorkspaceView {\n    readonly workspaceId: WorkspaceId;\n    readonly path: string;\n    readonly title: string;\n    readonly sessionIds: readonly SessionId[];\n    readonly createdAt: string;\n    readonly updatedAt: string;\n}"
			}
		];
		function referencedTypeClosure(seeds) {
			const included = /* @__PURE__ */ new Set();
			let frontier = [...seeds];
			while (frontier.length > 0) {
				const next = [];
				for (const entry of TYPE_API) {
					if (included.has(entry.name)) continue;
					const pattern = new RegExp(`\\b${entry.name}\\b`);
					if (!frontier.some((text) => pattern.test(text))) continue;
					included.add(entry.name);
					next.push(entry.declaration);
				}
				frontier = next;
			}
			return TYPE_API.filter((entry) => included.has(entry.name));
		}
		function contextProperty(key) {
			return /^[A-Za-z_$][\w$]*$/.test(key) ? `ctx.${key}` : `ctx[${JSON.stringify(key)}]`;
		}
		/**
		* Project the Service Catalog as a compact directory or one exact coding contract.
		* @param key - exact Service key; omit it to list all Services and method signatures.
		* @param services - platform-specific visible Service entries.
		* @returns compact navigation data or one detailed Service with its referenced type closure.
		*/
		function queryServiceApi(key, services = SERVICE_API) {
			if (key === void 0) return {
				mode: "catalog",
				services: services.map((service) => ({
					key: service.key,
					description: service.summary,
					methods: service.methods.map((method) => ({ signature: method.signature }))
				}))
			};
			const service = services.find((candidate) => candidate.key === key);
			if (service === void 0) throw new Error(`no catalogued Service named "${key}"`);
			return {
				mode: "service",
				service: {
					key: service.key,
					description: service.description,
					access: {
						optional: {
							expression: `ctx.get(${JSON.stringify(service.key)})`,
							requiresUndefinedCheck: true
						},
						hardDependency: {
							inject: [service.key],
							expression: contextProperty(service.key)
						}
					},
					methods: service.methods
				},
				referencedTypes: referencedTypeClosure(service.methods.map((method) => method.signature))
			};
		}
		/**
		* Project the Event Catalog as a compact directory or one exact listener contract.
		* @param name - exact Event name; omit it to list all Events and listener signatures.
		* @param events - platform-specific visible Event entries.
		* @returns compact navigation data or one detailed Event with its referenced type closure.
		*/
		function queryEventApi(name, events = EVENT_API) {
			if (name === void 0) return {
				mode: "catalog",
				events: events.map((event) => ({
					name: event.name,
					description: event.summary,
					mode: event.mode,
					signature: event.signature
				}))
			};
			const event = events.find((candidate) => candidate.name === name);
			if (event === void 0) throw new Error(`no catalogued Event named "${name}"`);
			return {
				mode: "event",
				event: {
					name: event.name,
					description: event.description,
					mode: event.mode,
					signature: event.signature,
					parameters: event.parameters
				},
				referencedTypes: referencedTypeClosure([event.signature])
			};
		}
		//#endregion
		//#region lib/types/client/slot-catalog.js
		/** Every slot the shipped web bundle declares, sorted by key. */
		const CLIENT_SLOT_API = [
			{
				key: "conversation.approval.detail",
				kind: "single",
				scope: "session",
				summary: "Optional detail for the Tool call correlated with an approval request.",
				doc: "Optional detail for the Tool call correlated with an approval request.",
				registerOptions: [],
				ownerProps: ["/** Stable identity handed to an optional approval-detail renderer. */\nexport interface ApprovalDetailOwnerProps {\n  /** Tool call correlated with the request. */\n  callId: ToolCallId\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'conversation.composer' (client-ui-approval), so it exists while that entry is mounted",
				occupants: ["client-ui-chat ApprovalCommand"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.approval.detail', () => ctx.slots.register(\n      { name: 'conversation.approval.detail' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-approval/src/client/contract/slots.ts:37"
			},
			{
				key: "conversation.chat.assistant-actions",
				kind: "list",
				scope: "session",
				summary: "Ordered actions for one finalized assistant message.",
				doc: "Ordered actions for one finalized assistant message. Each entry receives\nthe durable message id; a fresh `id` adds an action and reusing one replaces\nthat entry. With no entries, the standard action row remains unchanged.",
				registerOptions: [
					{
						name: "id",
						requirement: "required",
						type: "string",
						doc: "Your cell key. Use an id of your own: a fresh id is added beside the shipped entries, while reusing a shipped id puts you in THAT cell and replaces it. Owners that filter by id address you by it."
					},
					{
						name: "order",
						requirement: "optional",
						type: "number",
						doc: "Position among the entries, ascending (default 0)."
					},
					{
						name: "label",
						requirement: "optional",
						type: "string | (() => string)",
						doc: "Display text where the owner projects one (nav rows, tabs). A thunk is re-read on every projection, so localized text follows the active locale without re-registering."
					}
				],
				ownerProps: ["/** Owner currency of finalized-assistant actions. */\nexport interface AssistantActionOwnerProps {\n  messageId: MessageId\n}"],
				ownerPropsReferences: ["MessageId"],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'conversation.chat.node' (client-ui-chat), so it exists while that entry is mounted",
				occupants: ["client-ui-message-feedback MessageFeedbackActions id 'feedback'"],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.chat.assistant-actions', () => ctx.slots.register(\n      { name: 'conversation.chat.assistant-actions', id: 'my-entry', order: 100, label: 'My entry' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-chat/src/client/contract/slots.ts:213"
			},
			{
				key: "conversation.chat.commandview",
				kind: "keyed",
				scope: "session",
				summary: "Command row keyed by the command name.",
				doc: "Command row keyed by the command name. The component receives the folded\ncommand lifecycle and linked compaction when present. Reusing a key\nreplaces that command renderer; an unoccupied key uses the generic card.",
				registerOptions: [{
					name: "key",
					requirement: "required",
					type: "string",
					doc: "Your cell key: the entry renders where the owner dispatches this exact key. Registering an already-occupied key replaces that occupant."
				}],
				ownerProps: ["/** Command-row owner share. */\nexport interface CommandRowOwnerProps {\n  node: CommandNode\n  compaction?: CompactionSummaryNode\n}"],
				ownerPropsReferences: [
					"Command",
					"CommandNode",
					"CompactionSummaryNode"
				],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "open: any string the owner dispatches (no compile-time key set), none are taken yet",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'conversation.chat.node' (client-ui-chat), so it exists while that entry is mounted",
				occupants: [],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.chat.commandview', () => ctx.slots.register(\n      { name: 'conversation.chat.commandview', key: '<one key the owner dispatches>' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-chat/src/client/contract/slots.ts:201"
			},
			{
				key: "conversation.chat.node",
				kind: "keyed",
				scope: "session",
				summary: "Final Chat node renderer, keyed by `ChatNodeKind`.",
				doc: "Final Chat node renderer, keyed by `ChatNodeKind`. The component receives\nthe typed node, shared Chat actions, and Turn-data hook. Reusing a key\nreplaces that node renderer; a kind with no occupant renders no row.",
				registerOptions: [{
					name: "key",
					requirement: "required",
					type: "string",
					doc: "Your cell key: the entry renders where the owner dispatches this exact key. Registering an already-occupied key replaces that occupant."
				}],
				ownerProps: ["/** Stable owner currency delivered to a keyed Chat renderer. */\nexport interface ChatNodeOwnerProps {\n  cwd?: string | undefined\n  openFile: (path: string, options?: OpenFileOptions) => void\n  inspectCall: (callId: ToolCallId) => void\n  forkAt: (seq: number) => void\n  /**\n   * Session-authorized image loader, down-threaded from the Chat view so a\n   * chat-node renderer can render the attachment presentation slot directly\n   * with only the durable references plus this loader, instead of receiving a\n   * rendering closure.\n   */\n  loadImage: MessageImageLoader\n  renderMessageImages: RenderMessageImages\n  fileMentions: (owner: TurnTailOwnerProps) => MarkdownFileMentions | undefined\n  /** Turn-process state when this Node belongs to a projected Turn. */\n  turnProcess?: TurnProcessOwnerProps | undefined\n}"],
				ownerPropsReferences: [
					"MarkdownFileMentions",
					"MessageImageLoader",
					"OpenFileOptions",
					"RenderMessageImages",
					"TurnProcessOwnerProps",
					"TurnTailOwnerProps"
				],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "fixed by the owner's key table { [Kind in ChatNodeKind]: { node: ChatNode<Kind> } }, already taken: assistant-step, command, command-input, compaction, context, manual-compaction, model-retry, steering, system-prompt, tool-call, turn-error, turn-max-tokens, turn-process, turn-tail, unknown, user, workflow-run",
				hookContext: "ConversationLocationDataStore<ConversationTurnDataMap> | undefined",
				slotInject: "ChatNodeTurnDataInjected",
				declaredBy: "an entry in 'conversation.view' (client-ui-chat), so it exists while that entry is mounted",
				occupants: [
					"client-ui-chat UserMessageNodeView key 'user'",
					"client-ui-chat UserMessageNodeView key 'steering'",
					"client-ui-chat ContextMessageNodeView key 'context'",
					"client-ui-chat SystemPromptNodeView key 'system-prompt'",
					"client-ui-chat AssistantNodeView key 'assistant-step'",
					"client-ui-chat CommandNodeView key 'command'",
					"client-ui-chat ManualCompactionNodeView key 'manual-compaction'",
					"client-ui-chat CompactionNodeView key 'compaction'",
					"client-ui-chat RetryNodeView key 'model-retry'",
					"client-ui-chat TurnErrorNodeView key 'turn-error'",
					"client-ui-chat TurnMaxTokensNodeView key 'turn-max-tokens'",
					"client-ui-chat TurnProcessNodeView key 'turn-process'",
					"client-ui-chat TurnTailNodeView key 'turn-tail'",
					"client-ui-chat UnknownNodeView key 'unknown'",
					"client-ui-goal GoalCommandInputView key 'command-input'",
					"client-ui-tool ToolCallTree key 'tool-call'",
					"client-ui-workflow-run WorkflowRunPanel key 'workflow-run'"
				],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.chat.node', () => ctx.slots.register(\n      { name: 'conversation.chat.node', key: '<one key the owner dispatches>' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-chat/src/client/contract/slots.ts:182"
			},
			{
				key: "conversation.chat.turnTail",
				kind: "chain",
				scope: "session",
				summary: "Selector-routed extension before a completed Turn's action row.",
				doc: "Selector-routed extension before a completed Turn's action row. The\ncomponent receives the Turn, closing sequence, and file opener. The first\nselector that accepts the owner renders; an all-declined chain is empty.",
				registerOptions: [{
					name: "select",
					requirement: "required",
					type: "(owner) => unknown | null",
					doc: "Pure routing selector. Entries are tried in ascending order; the first non-null result wins and arrives as the component's `matched` prop. All-null falls through to the owner's fallback."
				}],
				ownerProps: ["/** Owner currency of the completed-Turn extension chain. */\nexport interface TurnTailOwnerProps {\n  turn: TurnLocation\n  seq: number\n  openFile: (path: string) => void\n}"],
				ownerPropsReferences: ["TurnLocation"],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'conversation.chat.node' (client-ui-chat), so it exists while that entry is mounted",
				occupants: ["client-ui-deliverables Deliverables"],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register(\n      { name: 'conversation.chat.turnTail', select: owner => null },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-chat/src/client/contract/slots.ts:207"
			},
			{
				key: "conversation.composer",
				kind: "chain",
				scope: "session",
				summary: "Selector-routed replacements for the current Session's resident composer.",
				doc: "Selector-routed replacements for the current Session's resident composer.",
				registerOptions: [{
					name: "select",
					requirement: "required",
					type: "(owner) => unknown | null",
					doc: "Pure routing selector. Entries are tried in ascending order; the first non-null result wins and arrives as the component's `matched` prop. All-null falls through to the owner's fallback."
				}],
				ownerProps: ["/** Owner values used to elect a composer takeover. */\nexport interface ComposerChainProps {\n  /** Current Session identity used by temporary business-owned entries. */\n  sessionId: SessionId | undefined\n  /** Current Session lifecycle state, absent without a selected Session. */\n  session: SessionSnapshot | undefined\n  /** Effective business-owned interaction awaiting the user in this Session. */\n  pendingInteraction: SessionPendingInteraction | undefined\n}"],
				ownerPropsReferences: [
					"SessionId",
					"SessionPendingInteraction",
					"SessionSnapshot"
				],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'main.conversation' (client-ui-conversation), so it exists while that entry is mounted",
				occupants: [
					"client-ui-approval ApprovalPanel",
					"client-ui-subagent SubagentReadOnlyComposer",
					"client-ui-user-questions QuestionComposer"
				],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.composer', () => ctx.slots.register(\n      { name: 'conversation.composer', select: owner => null },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-conversation/src/client/contract/slots.ts:158"
			},
			{
				key: "conversation.composer.bar",
				kind: "single",
				scope: "session-maybe",
				summary: "Resident composer body, including the no-Session inert state.",
				doc: "Resident composer body, including the no-Session inert state.",
				registerOptions: [],
				ownerProps: ["/** Owner share of the resident composer bar. */\nexport interface ComposerBarOwnerProps {\n  /** Hero uses centered placement; composer uses the active bottom placement. */\n  variant: 'hero' | 'composer'\n  /** A feature-owned reason that makes message input inert while leaving model selection live. */\n  blocked?: { readonly reason: string }\n  /** Lock all message actions while preserving the resident composer surface. */\n  disabled?: boolean\n  /** Whether the shared Workspace picker is expanded. */\n  workspacePickerOpen?: boolean\n  /** Open the Workspace picker from the inert composer surface. */\n  onRequestWorkspace?: () => void\n  placeholder?: string\n  /** Optional content rendered above the composer surface. */\n  accessory?: ReactNode\n}"],
				ownerPropsReferences: ["Workspace"],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useConversation: MaybeSnapshotSelectorHook<ConversationSnapshot>",
					"useInput: MaybeSnapshotSelectorHook<InputState>",
					"inputActions: InputActions | undefined",
					"useSession: MaybeSnapshotSelectorHook<SessionSnapshot>",
					"sessionId: SessionId | undefined",
					"useProjection: UseProjection"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'main.conversation' (client-ui-conversation), so it exists while that entry is mounted",
				occupants: ["client-ui-conversation InputBar"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.composer.bar', () => ctx.slots.register(\n      { name: 'conversation.composer.bar' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-conversation/src/client/contract/slots.ts:176"
			},
			{
				key: "conversation.composer.dock",
				kind: "list",
				scope: "session",
				summary: "Ambient entries below the composer card.",
				doc: "Ambient entries below the composer card.",
				registerOptions: [
					{
						name: "id",
						requirement: "required",
						type: "string",
						doc: "Your cell key. Use an id of your own: a fresh id is added beside the shipped entries, while reusing a shipped id puts you in THAT cell and replaces it. Owners that filter by id address you by it."
					},
					{
						name: "order",
						requirement: "optional",
						type: "number",
						doc: "Position among the entries, ascending (default 0)."
					},
					{
						name: "label",
						requirement: "optional",
						type: "string | (() => string)",
						doc: "Display text where the owner projects one (nav rows, tabs). A thunk is re-read on every projection, so localized text follows the active locale without re-registering."
					}
				],
				ownerProps: [],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'conversation.composer.bar' (client-ui-conversation), so it exists while that entry is mounted",
				occupants: ["client-ui-chat StatsPills id 'stats'"],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register(\n      { name: 'conversation.composer.dock', id: 'my-entry', order: 100, label: 'My entry' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-conversation/src/client/contract/slots.ts:170"
			},
			{
				key: "conversation.hero.agentPreset",
				kind: "single",
				scope: "root",
				summary: "Agent-preset control staged for a New Session.",
				doc: "Agent-preset control staged for a New Session.",
				registerOptions: [],
				ownerProps: ["/** Owner share of the Hero agent-preset control. */\nexport interface HeroAgentPresetOwnerProps {\n  /** Marker field: the occupant owns its roster and staged selection. */\n  children?: never\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'main.conversation' (client-ui-conversation), so it exists while that entry is mounted",
				occupants: ["client-ui-agent-preset AgentPresetSeat"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.hero.agentPreset', () => ctx.slots.register(\n      { name: 'conversation.hero.agentPreset' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-conversation/src/client/contract/slots.ts:164"
			},
			{
				key: "conversation.hero.brand.mark",
				kind: "single",
				scope: "root",
				summary: "Brand mark shown before the blank-session headline.",
				doc: "Brand mark shown before the blank-session headline.",
				registerOptions: [],
				ownerProps: ["/** Presentation props supplied to the blank-session brand mark. */\nexport interface HeroBrandMarkOwnerProps {\n  /** Requested square edge in pixels. */\n  size: number\n  /** Host class preserving the surrounding mark geometry. */\n  className?: string | undefined\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'main.conversation' (client-ui-conversation), so it exists while that entry is mounted",
				occupants: [],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.hero.brand.mark', () => ctx.slots.register(\n      { name: 'conversation.hero.brand.mark' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-conversation/src/client/contract/slots.ts:162"
			},
			{
				key: "conversation.hero.workspace",
				kind: "single",
				scope: "root",
				summary: "Workspace picker shown by the blank-session Hero.",
				doc: "Workspace picker shown by the blank-session Hero.",
				registerOptions: [],
				ownerProps: ["/** Owner share common to blank-session Workspace pickers. */\nexport interface EmptyWorkspaceOwnerProps {\n  open: boolean\n  anchorRef?: RefObject<HTMLElement>\n  /** Currently selected Workspace, when available. */\n  selectedId?: WorkspaceId | undefined\n  onPick: (workspaceId: WorkspaceId) => void\n  onClose: () => void\n}"],
				ownerPropsReferences: ["Workspace"],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'main.conversation' (client-ui-conversation), so it exists while that entry is mounted",
				occupants: ["client-ui-workspace WorkspacePicker"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.hero.workspace', () => ctx.slots.register(\n      { name: 'conversation.hero.workspace' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-conversation/src/client/contract/slots.ts:160"
			},
			{
				key: "conversation.hero.workspace.directoryFlow",
				kind: "single",
				scope: "root",
				summary: "Directory-flow hole under the conversation empty-state picker (declared by the WorkspacePicker entry).",
				doc: "Directory-flow hole under the conversation empty-state picker (declared by the WorkspacePicker entry).",
				registerOptions: [],
				ownerProps: ["/**\n * Owner share of the directory-flow holes: the complete conversation between\n * the trigger surface and the picking interaction. The occupant reads `open`\n * to run/render its interaction and reports exactly one outcome per open.\n */\nexport interface DirectoryFlowOwnerProps {\n  /** True while a picking interaction is requested; flipping back to false withdraws the request. */\n  open: boolean\n  /** True while the owner adopts a picked path (`createWorkspace` in flight); occupants disable their commit affordances. */\n  busy: boolean\n  /** The operator picked a directory (absolute host path); the owner adopts it. */\n  onPicked: (path: string) => void\n  /** The operator dismissed the interaction; the owner just closes the flow. */\n  onCancel: () => void\n  /** The interaction itself failed (chooser missing, listing denied); the owner shows its error surface. */\n  onError: (message: string) => void\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'conversation.hero.workspace' (client-ui-workspace), so it exists while that entry is mounted",
				occupants: ["client-ui-directory-picker-browse BrowseDirectoryFlow", "client-ui-directory-picker-native NativeDirectoryFlow"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.hero.workspace.directoryFlow', () => ctx.slots.register(\n      { name: 'conversation.hero.workspace.directoryFlow' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-workspace/src/client/contract/slots.ts:57"
			},
			{
				key: "conversation.input.attachments",
				kind: "single",
				scope: "session-maybe",
				summary: "Optional draft-attachment rail and drop target.",
				doc: "Optional draft-attachment rail and drop target.",
				registerOptions: [],
				ownerProps: ["/** Input state handed to the optional attachment presentation plugin. */\nexport interface ComposerAttachmentsOwnerProps {\n  /** Browser-owned draft attachments in input order. */\n  attachments: readonly ComposerAttachment[]\n  /** Whether a document-level file drop may add attachments now. */\n  canAcceptDrop: boolean\n  /** Add one dropped batch through the composer's validation path. */\n  onAddFiles: (files: readonly File[]) => void\n  /** Remove one draft attachment through the Conversation service. */\n  onRemoveAttachment: (id: DraftAttachmentId) => void\n  /** Current per-draft upload states for file-kind attachments. */\n  uploads: DraftFileUploads\n  /** Restart one failed file upload. */\n  onRetryFile: (id: DraftAttachmentId) => void\n  /** Display-ready limits for the drop invitation. */\n  dropLimits?: { readonly count: number; readonly size: string } | undefined\n}"],
				ownerPropsReferences: [
					"ComposerAttachment",
					"DraftAttachmentId",
					"DraftFileUploads"
				],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useConversation: MaybeSnapshotSelectorHook<ConversationSnapshot>",
					"useInput: MaybeSnapshotSelectorHook<InputState>",
					"inputActions: InputActions | undefined",
					"useSession: MaybeSnapshotSelectorHook<SessionSnapshot>",
					"sessionId: SessionId | undefined",
					"useProjection: UseProjection"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'conversation.composer.bar' (client-ui-conversation), so it exists while that entry is mounted",
				occupants: ["client-ui-attachment ComposerAttachments"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.input.attachments', () => ctx.slots.register(\n      { name: 'conversation.input.attachments' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-conversation/src/client/contract/slots.ts:178"
			},
			{
				key: "conversation.input.dock",
				kind: "list",
				scope: "session",
				summary: "Full-width entries above the composer card.",
				doc: "Full-width entries above the composer card.",
				registerOptions: [
					{
						name: "id",
						requirement: "required",
						type: "string",
						doc: "Your cell key. Use an id of your own: a fresh id is added beside the shipped entries, while reusing a shipped id puts you in THAT cell and replaces it. Owners that filter by id address you by it."
					},
					{
						name: "order",
						requirement: "optional",
						type: "number",
						doc: "Position among the entries, ascending (default 0)."
					},
					{
						name: "label",
						requirement: "optional",
						type: "string | (() => string)",
						doc: "Display text where the owner projects one (nav rows, tabs). A thunk is re-read on every projection, so localized text follows the active locale without re-registering."
					}
				],
				ownerProps: ["/** Point-in-time owner values for composer extension entries. */\nexport interface InputZone {\n  readonly session: SessionSnapshot\n  readonly input: InputState\n}"],
				ownerPropsReferences: ["InputState", "SessionSnapshot"],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'main.conversation' (client-ui-conversation), so it exists while that entry is mounted",
				occupants: [
					"client-ui-conversation QueueDock id 'queue'",
					"client-ui-conversation TodoDock id 'todo'",
					"client-ui-goal GoalDock id 'goal'"
				],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.input.dock', () => ctx.slots.register(\n      { name: 'conversation.input.dock', id: 'my-entry', order: 100, label: 'My entry' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-conversation/src/client/contract/slots.ts:166"
			},
			{
				key: "conversation.input.left",
				kind: "list",
				scope: "session",
				summary: "Compact controls at the left of the composer tool row.",
				doc: "Compact controls at the left of the composer tool row.",
				registerOptions: [
					{
						name: "id",
						requirement: "required",
						type: "string",
						doc: "Your cell key. Use an id of your own: a fresh id is added beside the shipped entries, while reusing a shipped id puts you in THAT cell and replaces it. Owners that filter by id address you by it."
					},
					{
						name: "order",
						requirement: "optional",
						type: "number",
						doc: "Position among the entries, ascending (default 0)."
					},
					{
						name: "label",
						requirement: "optional",
						type: "string | (() => string)",
						doc: "Display text where the owner projects one (nav rows, tabs). A thunk is re-read on every projection, so localized text follows the active locale without re-registering."
					}
				],
				ownerProps: [],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'conversation.composer.bar' (client-ui-conversation), so it exists while that entry is mounted",
				occupants: [],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.input.left', () => ctx.slots.register(\n      { name: 'conversation.input.left', id: 'my-entry', order: 100, label: 'My entry' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-conversation/src/client/contract/slots.ts:172"
			},
			{
				key: "conversation.input.model",
				kind: "single",
				scope: "session",
				summary: "Model selector inside the composer tool row.",
				doc: "Model selector inside the composer tool row.",
				registerOptions: [],
				ownerProps: ["/** Owner share of the named plan and model controls. */\nexport interface InputControlOwnerProps {\n  /** Whether the composer currently refuses interaction. */\n  locked: boolean\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'conversation.composer.bar' (client-ui-conversation), so it exists while that entry is mounted",
				occupants: ["client-ui-model-selection ModelSelect"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.input.model', () => ctx.slots.register(\n      { name: 'conversation.input.model' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-conversation/src/client/contract/slots.ts:186"
			},
			{
				key: "conversation.input.overlay",
				kind: "list",
				scope: "session",
				summary: "Floating entries rendered inside the resident composer card.",
				doc: "Floating entries rendered inside the resident composer card.",
				registerOptions: [
					{
						name: "id",
						requirement: "required",
						type: "string",
						doc: "Your cell key. Use an id of your own: a fresh id is added beside the shipped entries, while reusing a shipped id puts you in THAT cell and replaces it. Owners that filter by id address you by it."
					},
					{
						name: "order",
						requirement: "optional",
						type: "number",
						doc: "Position among the entries, ascending (default 0)."
					},
					{
						name: "label",
						requirement: "optional",
						type: "string | (() => string)",
						doc: "Display text where the owner projects one (nav rows, tabs). A thunk is re-read on every projection, so localized text follows the active locale without re-registering."
					}
				],
				ownerProps: [],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'conversation.composer.bar' (client-ui-conversation), so it exists while that entry is mounted",
				occupants: [
					"client-ui-commands PopupSelectView id 'command-popup'",
					"client-ui-input-trigger MenuView id 'slash-menu'",
					"client-ui-message-feedback FeedbackDialog id 'feedback-dialog'"
				],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register(\n      { name: 'conversation.input.overlay', id: 'my-entry', order: 100, label: 'My entry' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-conversation/src/client/contract/slots.ts:168"
			},
			{
				key: "conversation.input.plan",
				kind: "single",
				scope: "session",
				summary: "Plan control inside the composer tool row.",
				doc: "Plan control inside the composer tool row.",
				registerOptions: [],
				ownerProps: ["/** Owner share of the named plan and model controls. */\nexport interface InputControlOwnerProps {\n  /** Whether the composer currently refuses interaction. */\n  locked: boolean\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'conversation.composer.bar' (client-ui-conversation), so it exists while that entry is mounted",
				occupants: ["client-ui-plan PlanChip"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.input.plan', () => ctx.slots.register(\n      { name: 'conversation.input.plan' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-conversation/src/client/contract/slots.ts:184"
			},
			{
				key: "conversation.input.right",
				kind: "list",
				scope: "session",
				summary: "Compact controls before the composer submit action.",
				doc: "Compact controls before the composer submit action.",
				registerOptions: [
					{
						name: "id",
						requirement: "required",
						type: "string",
						doc: "Your cell key. Use an id of your own: a fresh id is added beside the shipped entries, while reusing a shipped id puts you in THAT cell and replaces it. Owners that filter by id address you by it."
					},
					{
						name: "order",
						requirement: "optional",
						type: "number",
						doc: "Position among the entries, ascending (default 0)."
					},
					{
						name: "label",
						requirement: "optional",
						type: "string | (() => string)",
						doc: "Display text where the owner projects one (nav rows, tabs). A thunk is re-read on every projection, so localized text follows the active locale without re-registering."
					}
				],
				ownerProps: [],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'conversation.composer.bar' (client-ui-conversation), so it exists while that entry is mounted",
				occupants: [],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.input.right', () => ctx.slots.register(\n      { name: 'conversation.input.right', id: 'my-entry', order: 100, label: 'My entry' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-conversation/src/client/contract/slots.ts:174"
			},
			{
				key: "conversation.message.images",
				kind: "single",
				scope: "session",
				summary: "Renderer for one consecutive group of durable message images.",
				doc: "Renderer for one consecutive group of durable message images. The owner\nsupplies image references, an authorized loader, and alignment. A\nregistration replaces the shipped gallery; without one, images are omitted.",
				registerOptions: [],
				ownerProps: ["/** Message image group handed to the optional attachment presentation plugin. */\nexport interface MessageImagesOwnerProps {\n  /** Durable references or submission-echo previews in source order. */\n  images: readonly MessageImageSource[]\n  /** Session-authorized image URL loader for the durable arm. */\n  loadImage: MessageImageLoader\n  /** Horizontal placement inside the owning record. */\n  align: 'start' | 'end'\n  /** Force every image into the compact message-attachment tile size. */\n  compact?: boolean\n}"],
				ownerPropsReferences: [
					"Message",
					"MessageImageLoader",
					"MessageImageSource"
				],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'conversation.view' (client-ui-chat), so it exists while that entry is mounted",
				occupants: ["client-ui-attachment MessageImages"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.message.images', () => ctx.slots.register(\n      { name: 'conversation.message.images' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-chat/src/client/contract/slots.ts:195"
			},
			{
				key: "conversation.session",
				kind: "single",
				scope: "session",
				summary: "Strict per-Session Conversation body.",
				doc: "Strict per-Session Conversation body.",
				registerOptions: [],
				ownerProps: [],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'main.conversation' (client-ui-conversation), so it exists while that entry is mounted",
				occupants: ["client-ui-conversation ConversationSession"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.session', () => ctx.slots.register(\n      { name: 'conversation.session' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-conversation/src/client/contract/slots.ts:123"
			},
			{
				key: "conversation.session.header",
				kind: "single",
				scope: "session",
				summary: "Strict per-Session title, actions, and View navigation.",
				doc: "Strict per-Session title, actions, and View navigation.",
				registerOptions: [],
				ownerProps: [],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'main.conversation' (client-ui-conversation), so it exists while that entry is mounted",
				occupants: ["client-ui-conversation ConversationSessionHeader"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.session.header', () => ctx.slots.register(\n      { name: 'conversation.session.header' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-conversation/src/client/contract/slots.ts:125"
			},
			{
				key: "conversation.session.header.actions",
				kind: "list",
				scope: "session",
				summary: "Title-adjacent Session actions in ascending order.",
				doc: "Title-adjacent Session actions in ascending order.",
				registerOptions: [
					{
						name: "id",
						requirement: "required",
						type: "string",
						doc: "Your cell key. Use an id of your own: a fresh id is added beside the shipped entries, while reusing a shipped id puts you in THAT cell and replaces it. Owners that filter by id address you by it."
					},
					{
						name: "order",
						requirement: "optional",
						type: "number",
						doc: "Position among the entries, ascending (default 0)."
					},
					{
						name: "label",
						requirement: "optional",
						type: "string | (() => string)",
						doc: "Display text where the owner projects one (nav rows, tabs). A thunk is re-read on every projection, so localized text follows the active locale without re-registering."
					}
				],
				ownerProps: ["/** Header actions derive their state from standard Session props. */\nexport interface ConversationHeaderActionOwnerProps {\n  /** Marker field: entries receive no owner-specific values. */\n  children?: never\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'conversation.session.header' (client-ui-conversation), so it exists while that entry is mounted",
				occupants: [
					"client-ui-agent-preset AgentPresetLabel id 'agent-preset'",
					"client-ui-jobs JobListAction id 'job-list'",
					"client-ui-schedule ScheduleCatalogAction id 'schedule-catalog'",
					"experimental-client-ui-agent-team TeamAction id 'agent-team'"
				],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register(\n      { name: 'conversation.session.header.actions', id: 'my-entry', order: 100, label: 'My entry' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-conversation/src/client/contract/slots.ts:133"
			},
			{
				key: "conversation.session.header.corner",
				kind: "single",
				scope: "session",
				summary: "The header's far-right corner, past the utilities' edge and into the header's own padding, for one control.",
				doc: "The header's far-right corner, past the utilities' edge and into the\nheader's own padding, for one control. The corner is laid out only while\nits occupant renders something; an occupant with nothing to show renders\nnothing, and the utilities take the header's edge.",
				registerOptions: [],
				ownerProps: ["/** The header corner's occupant derives its state from standard Session props. */\nexport interface ConversationHeaderCornerOwnerProps {\n  /** Marker field: the occupant receives no owner-specific values. */\n  children?: never\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'conversation.session.header' (client-ui-conversation), so it exists while that entry is mounted",
				occupants: ["client-ui-sidebar-right ExpandButton"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.session.header.corner', () => ctx.slots.register(\n      { name: 'conversation.session.header.corner' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-conversation/src/client/contract/slots.ts:150"
			},
			{
				key: "conversation.session.header.lineage",
				kind: "single",
				scope: "session",
				summary: "Optional replacement for one Session breadcrumb title.",
				doc: "Optional replacement for one Session breadcrumb title.",
				registerOptions: [],
				ownerProps: ["/** Plain breadcrumb data handed to the optional lineage renderer. */\nexport interface ConversationHeaderLineageOwnerProps {\n  /** Session represented by this breadcrumb title. */\n  lineageSessionId: SessionId\n  /** Display title available to a combined title/control renderer. */\n  displayTitle: string\n  /** Navigate to an ancestor title when present. */\n  openTitle?: () => void\n}"],
				ownerPropsReferences: ["SessionId"],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'conversation.session.header' (client-ui-conversation), so it exists while that entry is mounted",
				occupants: ["client-ui-subagent SubagentHeaderLineage"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.session.header.lineage', () => ctx.slots.register(\n      { name: 'conversation.session.header.lineage' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-conversation/src/client/contract/slots.ts:127"
			},
			{
				key: "conversation.session.header.utilities",
				kind: "list",
				scope: "session",
				summary: "Right-aligned Session utilities in ascending order.",
				doc: "Right-aligned Session utilities in ascending order.",
				registerOptions: [
					{
						name: "id",
						requirement: "required",
						type: "string",
						doc: "Your cell key. Use an id of your own: a fresh id is added beside the shipped entries, while reusing a shipped id puts you in THAT cell and replaces it. Owners that filter by id address you by it."
					},
					{
						name: "order",
						requirement: "optional",
						type: "number",
						doc: "Position among the entries, ascending (default 0)."
					},
					{
						name: "label",
						requirement: "optional",
						type: "string | (() => string)",
						doc: "Display text where the owner projects one (nav rows, tabs). A thunk is re-read on every projection, so localized text follows the active locale without re-registering."
					}
				],
				ownerProps: ["/** Header actions derive their state from standard Session props. */\nexport interface ConversationHeaderActionOwnerProps {\n  /** Marker field: entries receive no owner-specific values. */\n  children?: never\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'conversation.session.header' (client-ui-conversation), so it exists while that entry is mounted",
				occupants: ["client-ui-open-in-app OpenInAppAction id 'open-in-app'", "session-log-export SessionLogDownloadHeaderAction id 'session-log-download'"],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register(\n      { name: 'conversation.session.header.utilities', id: 'my-entry', order: 100, label: 'My entry' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-conversation/src/client/contract/slots.ts:139"
			},
			{
				key: "conversation.trajectory.images",
				kind: "single",
				scope: "session",
				summary: "Renderer for one group of durable record images in the Trajectory ledger.",
				doc: "Renderer for one group of durable record images in the Trajectory\nledger. The owner supplies image references, an authorized loader, and\nalignment. A registration replaces the shipped gallery; without one,\nimages are omitted.",
				registerOptions: [],
				ownerProps: ["/** Message image group handed to the optional attachment presentation plugin. */\nexport interface MessageImagesOwnerProps {\n  /** Durable references or submission-echo previews in source order. */\n  images: readonly MessageImageSource[]\n  /** Session-authorized image URL loader for the durable arm. */\n  loadImage: MessageImageLoader\n  /** Horizontal placement inside the owning record. */\n  align: 'start' | 'end'\n  /** Force every image into the compact message-attachment tile size. */\n  compact?: boolean\n}"],
				ownerPropsReferences: [
					"Message",
					"MessageImageLoader",
					"MessageImageSource"
				],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'conversation.view' (client-ui-trajectory), so it exists while that entry is mounted",
				occupants: ["client-ui-attachment MessageImages"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.trajectory.images', () => ctx.slots.register(\n      { name: 'conversation.trajectory.images' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-trajectory/src/client/trajectory-contract.ts:98"
			},
			{
				key: "conversation.view",
				kind: "list",
				scope: "session",
				summary: "Registered Conversation target Views, rendered one at a time.",
				doc: "Registered Conversation target Views, rendered one at a time.",
				registerOptions: [
					{
						name: "id",
						requirement: "required",
						type: "string",
						doc: "Your cell key. Use an id of your own: a fresh id is added beside the shipped entries, while reusing a shipped id puts you in THAT cell and replaces it. Owners that filter by id address you by it."
					},
					{
						name: "order",
						requirement: "optional",
						type: "number",
						doc: "Position among the entries, ascending (default 0)."
					},
					{
						name: "label",
						requirement: "optional",
						type: "string | (() => string)",
						doc: "Display text where the owner projects one (nav rows, tabs). A thunk is re-read on every projection, so localized text follows the active locale without re-registering."
					}
				],
				ownerProps: ["/** Conversation View entries obtain their data from registered standard hooks. */\nexport interface ConvViewOwnerProps {\n  /** Focus request addressed to the selected View. */\n  viewRequest: import('./views.ts').ConversationViewRequest | null\n  /** Select a View and address one opaque focus identity to it. */\n  openView: (view: string, focus: string) => void\n  /** Acknowledge the current one-shot focus request. */\n  completeViewRequest: () => void\n}"],
				ownerPropsReferences: ["ConversationViewRequest"],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'conversation.session' (client-ui-conversation), so it exists while that entry is mounted",
				occupants: ["client-ui-chat ChatView id 'chat'", "client-ui-trajectory TrajectoryView id 'trajectory'"],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('conversation.view', () => ctx.slots.register(\n      { name: 'conversation.view', id: 'my-entry', order: 100, label: 'My entry' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-conversation/src/client/contract/slots.ts:156"
			},
			{
				key: "main",
				kind: "keyed",
				scope: "root",
				summary: "Central panel selected by sidebar entry id.",
				doc: "Central panel selected by sidebar entry id. The reserved `conversation`\nkey hosts the Conversation; other keys receive no Session binding.",
				registerOptions: [{
					name: "key",
					requirement: "required",
					type: "string",
					doc: "Your cell key: the entry renders where the owner dispatches this exact key. Registering an already-occupied key replaces that occupant."
				}],
				ownerProps: [],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "open: any string the owner dispatches (no compile-time key set), already taken: conversation",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'root' (client-ui-layout), so it exists while that entry is mounted",
				occupants: ["client-ui-conversation ConversationPanel key 'conversation'"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('main', () => ctx.slots.register(\n      { name: 'main', key: '<one key the owner dispatches>' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-layout/src/client/index.ts:66"
			},
			{
				key: "main.conversation",
				kind: "single",
				scope: "session-maybe",
				summary: "Conversation shell beneath its root-scoped main-panel entry.",
				doc: "Conversation shell beneath its root-scoped main-panel entry.",
				registerOptions: [],
				ownerProps: [],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useConversation: MaybeSnapshotSelectorHook<ConversationSnapshot>",
					"useInput: MaybeSnapshotSelectorHook<InputState>",
					"inputActions: InputActions | undefined",
					"useSession: MaybeSnapshotSelectorHook<SessionSnapshot>",
					"sessionId: SessionId | undefined",
					"useProjection: UseProjection"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'main' (client-ui-conversation), so it exists while that entry is mounted",
				occupants: ["client-ui-conversation ConversationRoot"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('main.conversation', () => ctx.slots.register(\n      { name: 'main.conversation' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-conversation/src/client/contract/slots.ts:121"
			},
			{
				key: "rightbar",
				kind: "single",
				scope: "root",
				summary: "The right column: a track the centre makes room for, or nothing.",
				doc: "The right column: a track the centre makes room for, or nothing. OCCUPIED\nby the right Sidebar, which uses the resolved column width in normal\nmode and covers the viewport in fullscreen, retaining the wide-screen\ncolumn reservation underneath.\n\nWhether the panel is shown, and whether it takes a track, is the\noccupant's own recorded business — it reports the composition of its\nexpanded and presentation state through `ctx.layout`, and the frame sizes\nthe track and places the resize handle from that. The expand control is\nnot this column's: it is a button in the conversation header. The root\noccupant decides when to render its Session-bound content.",
				registerOptions: [],
				ownerProps: ["/** Right column owner share: resolved normal geometry and opening eligibility. */\nexport interface RightbarOwnerProps {\n  /** Resolved normal panel width in px, not the saved preference; zero if it cannot fit. */\n  width: number\n  /** Current frame width in px. */\n  viewportWidth: number\n  /**\n   * Whether a normal right panel can retain 300px beside a 400px center.\n   * Before a narrow opening, includes the space from collapsing the left sidebar.\n   */\n  canShow: boolean\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'root' (client-ui-layout), so it exists while that entry is mounted",
				occupants: ["client-ui-sidebar-right RightbarRoot"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('rightbar', () => ctx.slots.register(\n      { name: 'rightbar' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-layout/src/client/index.ts:80"
			},
			{
				key: "rightbar.session",
				kind: "single",
				scope: "session",
				summary: "Session content selected by the root-scoped right Sidebar controller.",
				doc: "Session content selected by the root-scoped right Sidebar controller.",
				registerOptions: [],
				ownerProps: ["/** Right column owner share: resolved normal geometry and opening eligibility. */\nexport interface RightbarOwnerProps {\n  /** Resolved normal panel width in px, not the saved preference; zero if it cannot fit. */\n  width: number\n  /** Current frame width in px. */\n  viewportWidth: number\n  /**\n   * Whether a normal right panel can retain 300px beside a 400px center.\n   * Before a narrow opening, includes the space from collapsing the left sidebar.\n   */\n  canShow: boolean\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'rightbar' (client-ui-sidebar-right), so it exists while that entry is mounted",
				occupants: ["client-ui-sidebar-right RightbarSeat"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('rightbar.session', () => ctx.slots.register(\n      { name: 'rightbar.session' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-sidebar-right/src/client/contract/slots.ts:42"
			},
			{
				key: "root",
				kind: "single",
				scope: "root",
				summary: "The built-in render-tree root hole (seeded by SlotCore): the one slot the shell itself renders, and the ancestor of every other seat.",
				doc: "The built-in render-tree root hole (seeded by SlotCore): the one slot the\nshell itself renders, and the ancestor of every other seat. OCCUPIED by\nui-layout's AppFrame, which declares the sidebar, conversation, details,\nand shell.overlay seats inside it.\n\nDO NOT register here. This is a single slot, so a second entry does not\nsit beside the frame — it shadows it, and a dynamically registered entry\nis assigned a lower priority than the shipped one, which makes it the\nwinner: the page would render your component alone, with every seat the\nframe declares gone. For a surface of your own that floats over the whole\napp, register into `shell.overlay` instead (a list slot: additive, and\nclick-through until your entry opts into pointer events).",
				registerOptions: [],
				ownerProps: ["/** Root owner share: the shell supplies nothing — the frame is inject-assembled. */\nexport interface RootOwnerProps { children?: never }"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "the runtime itself (built in; always present)",
				occupants: ["client-ui-layout AppFrame"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('root', () => ctx.slots.register(\n      { name: 'root' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-renderer/src/client/registry.ts:43"
			},
			{
				key: "settings.action",
				kind: "list",
				scope: "root",
				summary: "Optional actions rendered in the content-column header before Close.",
				doc: "Optional actions rendered in the content-column header before Close.\nRegistrants own visibility, behavior, copy, and failure presentation;\nthe shell supplies only the ordered render site.",
				registerOptions: [
					{
						name: "id",
						requirement: "required",
						type: "string",
						doc: "Your cell key. Use an id of your own: a fresh id is added beside the shipped entries, while reusing a shipped id puts you in THAT cell and replaces it. Owners that filter by id address you by it."
					},
					{
						name: "order",
						requirement: "optional",
						type: "number",
						doc: "Position among the entries, ascending (default 0)."
					},
					{
						name: "label",
						requirement: "optional",
						type: "string | (() => string)",
						doc: "Display text where the owner projects one (nav rows, tabs). A thunk is re-read on every projection, so localized text follows the active locale without re-registering."
					}
				],
				ownerProps: ["/** Owner share of the header title seat (the shell supplies nothing). */\nexport interface SettingsHeaderOwnerProps {\n  /** Marker field: header owner props are intentionally empty. */\n  children?: never\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'sidebar.settings' (client-ui-settings-general), so it exists while that entry is mounted",
				occupants: ["client-ui-settings-general SettingsDocumentAction id 'open-document'"],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('settings.action', () => ctx.slots.register(\n      { name: 'settings.action', id: 'my-entry', order: 100, label: 'My entry' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-settings/src/client/contract/slots.ts:36"
			},
			{
				key: "settings.close",
				kind: "single",
				scope: "root",
				summary: "The close button's visually-hidden label text (the button itself — icon, geometry, focus — is shell chrome).",
				doc: "The close button's visually-hidden label text (the button itself —\nicon, geometry, focus — is shell chrome). Absent contribution leaves\nthe button without an accessible name (broken-composition state).",
				registerOptions: [],
				ownerProps: ["/** Owner share of the header title seat (the shell supplies nothing). */\nexport interface SettingsHeaderOwnerProps {\n  /** Marker field: header owner props are intentionally empty. */\n  children?: never\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'sidebar.settings' (client-ui-settings-general), so it exists while that entry is mounted",
				occupants: ["client-ui-settings-general CloseLabel"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('settings.close', () => ctx.slots.register(\n      { name: 'settings.close' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-settings/src/client/contract/slots.ts:42"
			},
			{
				key: "settings.general.item",
				kind: "list",
				scope: "root",
				summary: "One preference row inside the General section — the additive seat for a single setting that needs no page of its own (a whole page is `settings.section`), contributed by the feature plugin that owns the preference (locale → Language, ui-theme → Appearance, ui-conversation → Composer Enter).",
				doc: "One preference row inside the General section — the additive seat for a\nsingle setting that needs no page of its own (a whole page is\n`settings.section`), contributed by the feature plugin that owns the\npreference (locale → Language, ui-theme → Appearance, ui-conversation →\nComposer Enter). Options: `id` (row key), `order` (row position). The\nsection column only stacks rows, so a row draws its own internals,\nincluding its label: nothing projects a `label` here and the owner passes\nno props at all — copy, current value, and the write path are all yours,\nthrough your own inject face and `host.call`. Declared at runtime by\nui-settings-general's General entry; the type lives here with every other\nsettings slot type, because this package is the settings domain's base\nlayer and every registrant already depends on it for `ctx.settingsScope`.",
				registerOptions: [
					{
						name: "id",
						requirement: "required",
						type: "string",
						doc: "Your cell key. Use an id of your own: a fresh id is added beside the shipped entries, while reusing a shipped id puts you in THAT cell and replaces it. Owners that filter by id address you by it."
					},
					{
						name: "order",
						requirement: "optional",
						type: "number",
						doc: "Position among the entries, ascending (default 0)."
					},
					{
						name: "label",
						requirement: "optional",
						type: "string | (() => string)",
						doc: "Display text where the owner projects one (nav rows, tabs). A thunk is re-read on every projection, so localized text follows the active locale without re-registering."
					}
				],
				ownerProps: ["/** Owner share of a General preference row (the section supplies nothing). */\nexport interface SettingsGeneralItemOwnerProps {\n  /** Marker field: item owner props are intentionally empty. */\n  children?: never\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'settings.section' (client-ui-settings-general), so it exists while that entry is mounted",
				occupants: [
					"client-locale LanguageRow id 'language'",
					"client-ui-chat TranscriptViewRow id 'transcript-view'",
					"client-ui-conversation EnterBehaviorRow id 'composer-enter'",
					"client-ui-permission-presets PermissionRow id 'permission'",
					"client-ui-theme AppearanceRow id 'appearance'",
					"client-ui-theme FontSizeRow id 'font-size'"
				],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('settings.general.item', () => ctx.slots.register(\n      { name: 'settings.general.item', id: 'my-entry', order: 100, label: 'My entry' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-settings/src/client/contract/slots.ts:89"
			},
			{
				key: "settings.header",
				kind: "single",
				scope: "root",
				summary: "The panel title text seat.",
				doc: "The panel title text seat. Content renders inside the nav heading row;\nthe dialog's accessible name points at that node via aria-labelledby.\nAbsent contribution leaves the heading empty.",
				registerOptions: [],
				ownerProps: ["/** Owner share of the header title seat (the shell supplies nothing). */\nexport interface SettingsHeaderOwnerProps {\n  /** Marker field: header owner props are intentionally empty. */\n  children?: never\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'sidebar.settings' (client-ui-settings-general), so it exists while that entry is mounted",
				occupants: ["client-ui-settings-general HeaderContent"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('settings.header', () => ctx.slots.register(\n      { name: 'settings.header' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-settings/src/client/contract/slots.ts:30"
			},
			{
				key: "settings.models.footer",
				kind: "list",
				scope: "root",
				summary: "Ordered extension area after the provider rows and the add controls.",
				doc: "Ordered extension area after the provider rows and the add controls.\nWithout a registrant the area renders nothing.",
				registerOptions: [
					{
						name: "id",
						requirement: "required",
						type: "string",
						doc: "Your cell key. Use an id of your own: a fresh id is added beside the shipped entries, while reusing a shipped id puts you in THAT cell and replaces it. Owners that filter by id address you by it."
					},
					{
						name: "order",
						requirement: "optional",
						type: "number",
						doc: "Position among the entries, ascending (default 0)."
					},
					{
						name: "label",
						requirement: "optional",
						type: "string | (() => string)",
						doc: "Display text where the owner projects one (nav rows, tabs). A thunk is re-read on every projection, so localized text follows the active locale without re-registering."
					}
				],
				ownerProps: ["/** Owner share of the footer area (the section supplies nothing). */\nexport interface ModelsFooterOwnerProps {\n  /** Marker field: footer owner props are intentionally empty. */\n  children?: never\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'settings.section' (client-ui-settings-models), so it exists while that entry is mounted",
				occupants: [],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('settings.models.footer', () => ctx.slots.register(\n      { name: 'settings.models.footer', id: 'my-entry', order: 100, label: 'My entry' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-settings-models/src/client/slot-contract.ts:38"
			},
			{
				key: "settings.models.provider-card",
				kind: "keyed",
				scope: "root",
				summary: "One provider card's adapter extension area, dispatched with `entryKey = settingsNs` on every card that renders a directory row: a saved row's card (its first-run setup posture included) and the add-provider draft card.",
				doc: "One provider card's adapter extension area, dispatched with\n`entryKey = settingsNs` on every card that renders a directory row: a\nsaved row's card (its first-run setup posture included) and the\nadd-provider draft card. The hand-declared draft card has no directory\nrow yet, so it dispatches nothing until saved. Without a registrant the\narea renders nothing.",
				registerOptions: [{
					name: "key",
					requirement: "required",
					type: "string",
					doc: "Your cell key: the entry renders where the owner dispatches this exact key. Registering an already-occupied key replaces that occupant."
				}],
				ownerProps: ["/** Owner share of one provider-card extension occurrence. */\nexport interface ProviderCardExtrasOwnerProps {\n  /** The card's directory row (route id, display name, settings address, live state). */\n  provider: ProviderDirectoryEntry\n  /** Whether any layer configures this provider (its profile resolves); `false` while the add-provider draft edits a dormant row. */\n  configured: boolean\n  /** Whether the row's referenced api-key credential is confirmed configured (the page's credential join). */\n  keyConfigured: boolean\n}"],
				ownerPropsReferences: ["ProviderDirectoryEntry"],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "open: any string the owner dispatches (no compile-time key set), none are taken yet",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'settings.section' (client-ui-settings-models), so it exists while that entry is mounted",
				occupants: [],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('settings.models.provider-card', () => ctx.slots.register(\n      { name: 'settings.models.provider-card', key: '<one key the owner dispatches>' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-settings-models/src/client/slot-contract.ts:33"
			},
			{
				key: "settings.onboarding",
				kind: "list",
				scope: "root",
				summary: "Root-scoped onboarding steps contributed by settings features.",
				doc: "Root-scoped onboarding steps contributed by settings features. The\nshell mounts one ordered step at a time; the active registrant either\ncompletes itself or keeps ownership until the user completes its sole\npath. Registrants own readiness, copy, dialog behavior, AND visible\nchrome: a step wraps its visible content in its modal surface (including\n`#root` inert ownership) and renders null while private facts are still\nloading. The shell paints no chrome of its own, so a mounted-but-deciding\nstep shows and blocks nothing.",
				registerOptions: [
					{
						name: "id",
						requirement: "required",
						type: "string",
						doc: "Your cell key. Use an id of your own: a fresh id is added beside the shipped entries, while reusing a shipped id puts you in THAT cell and replaces it. Owners that filter by id address you by it."
					},
					{
						name: "order",
						requirement: "optional",
						type: "number",
						doc: "Position among the entries, ascending (default 0)."
					},
					{
						name: "label",
						requirement: "optional",
						type: "string | (() => string)",
						doc: "Display text where the owner projects one (nav rows, tabs). A thunk is re-read on every projection, so localized text follows the active locale without re-registering."
					}
				],
				ownerProps: ["/** Owner share of the currently active settings-backed onboarding step. */\nexport interface SettingsOnboardingOwnerProps {\n  /** Stable id of the step currently selected by the coordinator. */\n  stepId: string\n  /** Complete or skip this step and transfer ownership to the next entry. */\n  complete: () => void\n  /** Open the settings panel directly on one registered section. */\n  openSection: (id: string) => void\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'sidebar.settings' (client-ui-settings-general), so it exists while that entry is mounted",
				occupants: ["client-ui-settings-models WelcomeNotice id 'welcome-notice'", "client-ui-settings-models DeepSeekOnboardingDialog id 'deepseek-official'"],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('settings.onboarding', () => ctx.slots.register(\n      { name: 'settings.onboarding', id: 'my-entry', order: 100, label: 'My entry' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-settings/src/client/contract/slots.ts:74"
			},
			{
				key: "settings.plugin.item",
				kind: "keyed",
				scope: "root",
				summary: "One plugin's card inside the plugin configuration section (see module JSDoc).",
				doc: "One plugin's card inside the plugin configuration section (see module JSDoc).",
				registerOptions: [{
					name: "key",
					requirement: "required",
					type: "string",
					doc: "Your cell key: the entry renders where the owner dispatches this exact key. Registering an already-occupied key replaces that occupant."
				}],
				ownerProps: ["/** Owner share of a plugin card (the section supplies nothing). */\nexport interface SettingsPluginItemOwnerProps {\n  /** Marker field: card owner props are intentionally empty. */\n  children?: never\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "open: any string the owner dispatches (no compile-time key set), none are taken yet",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'settings.plugins.tab' (client-ui-settings-plugins), so it exists while that entry is mounted",
				occupants: [
					"client-ui-settings-plugins BashCard",
					"client-ui-settings-plugins AgentLoopCard",
					"client-ui-settings-plugins SubagentModelSelectionCard",
					"client-ui-settings-plugins WebSearchCard"
				],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('settings.plugin.item', () => ctx.slots.register(\n      { name: 'settings.plugin.item', key: '<one key the owner dispatches>' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-settings-plugins/src/client/slot-contract.ts:19"
			},
			{
				key: "settings.plugins.tab",
				kind: "list",
				scope: "root",
				summary: "One page inside the Plugins settings section.",
				doc: "One page inside the Plugins settings section. The section owner renders\nlocalized entry labels as tabs and mounts each contribution inside its\ncorresponding tab panel. Options: `id` (tab key), `order` (tab order),\nand `label` (registrant-localized tab text). Declared at runtime by the\nfeature that owns the Plugins section; the type lives here so inventory\nand configuration plugins collaborate without depending on one another.",
				registerOptions: [
					{
						name: "id",
						requirement: "required",
						type: "string",
						doc: "Your cell key. Use an id of your own: a fresh id is added beside the shipped entries, while reusing a shipped id puts you in THAT cell and replaces it. Owners that filter by id address you by it."
					},
					{
						name: "order",
						requirement: "optional",
						type: "number",
						doc: "Position among the entries, ascending (default 0)."
					},
					{
						name: "label",
						requirement: "optional",
						type: "string | (() => string)",
						doc: "Display text where the owner projects one (nav rows, tabs). A thunk is re-read on every projection, so localized text follows the active locale without re-registering."
					}
				],
				ownerProps: ["/** Owner share of a Plugins tab (the section supplies nothing). */\nexport interface SettingsPluginsTabOwnerProps {\n  /** Marker field: tab owner props are intentionally empty. */\n  children?: never\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'settings.section' (client-ui-settings-plugins), so it exists while that entry is mounted",
				occupants: ["client-ui-settings-plugin-inventory PluginInventorySettingsTab id 'all'", "client-ui-settings-plugins ConfigurablePluginsTab id 'configurable'"],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register(\n      { name: 'settings.plugins.tab', id: 'my-entry', order: 100, label: 'My entry' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-settings/src/client/contract/slots.ts:63"
			},
			{
				key: "settings.section",
				kind: "list",
				scope: "root",
				summary: "One settings page per list entry.",
				doc: "One settings page per list entry. Registrant options carry the nav\nidentity: `id` (section key, drives `only` filtering), `order` (nav\nposition), `label` (registrant-localized display text — the registrant\nre-registers with fresh text on locale change, so the shell never\nsubscribes locale state; the ledger bump doubles as the shell's\nre-render trigger). Sections render inside the panel content column.\n(`settings.general.item`, declared by ui-settings-general's General\nentry, is typed in the locale package — the common dependency of every\nitem registrant; the shell neither declares nor renders it.)",
				registerOptions: [
					{
						name: "id",
						requirement: "required",
						type: "string",
						doc: "Your cell key. Use an id of your own: a fresh id is added beside the shipped entries, while reusing a shipped id puts you in THAT cell and replaces it. Owners that filter by id address you by it."
					},
					{
						name: "order",
						requirement: "optional",
						type: "number",
						doc: "Position among the entries, ascending (default 0)."
					},
					{
						name: "label",
						requirement: "optional",
						type: "string | (() => string)",
						doc: "Display text where the owner projects one (nav rows, tabs). A thunk is re-read on every projection, so localized text follows the active locale without re-registering."
					}
				],
				ownerProps: ["/**\n * Owner share of a settings section entry. The shell owns modal visibility\n * and navigation; a section's data arrives through its own inject faces and\n * stores. `close` is the one shell affordance a section receives, for flows\n * that leave settings altogether (starting a session from a section) — the\n * onboarding coordinator's `openSection`/`complete` precedent, inverted.\n */\nexport interface SettingsSectionOwnerProps {\n  /** Close the settings panel (the shell owns the open state). */\n  close: () => void\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'sidebar.settings' (client-ui-settings-general), so it exists while that entry is mounted",
				occupants: [
					"client-ui-agent-preset AgentPresetSection id 'agent-presets'",
					"client-ui-settings-general GeneralSection id 'general'",
					"client-ui-settings-models ModelsSection id 'models'",
					"client-ui-settings-plugins PluginsSettingsSection id 'plugins'"
				],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('settings.section', () => ctx.slots.register(\n      { name: 'settings.section', id: 'my-entry', order: 100, label: 'My entry' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-settings/src/client/contract/slots.ts:54"
			},
			{
				key: "settings.trigger",
				kind: "single",
				scope: "root",
				summary: "The sidebar-foot trigger row content: icon + label, supplied as slot content (the accessible name comes from the content — rail state renders the label visually hidden).",
				doc: "The sidebar-foot trigger row content: icon + label, supplied as slot\ncontent (the accessible name comes from the content — rail state\nrenders the label visually hidden). The shell renders the button\nchrome and owns open state. Absent contribution degrades to an\nicon-only button without an accessible name (broken-composition state;\nthe shipped composition always registers the seat).",
				registerOptions: [],
				ownerProps: ["/** Owner share of the trigger content seat: the sidebar column state. */\nexport interface SettingsTriggerOwnerProps {\n  /** Whether the sidebar renders wide content (false = 56px rail, icon only). */\n  wide: boolean\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'sidebar.settings' (client-ui-settings-general), so it exists while that entry is mounted",
				occupants: ["client-ui-settings-general TriggerContent"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('settings.trigger', () => ctx.slots.register(\n      { name: 'settings.trigger' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-settings/src/client/contract/slots.ts:24"
			},
			{
				key: "shell.overlay",
				kind: "list",
				scope: "root",
				summary: "Frame-wide floating layer, above every column and outside their scroll containers.",
				doc: "Frame-wide floating layer, above every column and outside their scroll\ncontainers. Deliberately generic and unowned by any feature: a badge, a\ntoast stack or a status pill all belong here, and entries order among\nthemselves. The layer itself is click-through — entries opt back into\npointer events — so an occupant never blocks the app underneath.\n\nThis is the additive seat for a frame-wide surface of your own: a fresh\n`id` is added beside the shipped entries instead of replacing them.",
				registerOptions: [
					{
						name: "id",
						requirement: "required",
						type: "string",
						doc: "Your cell key. Use an id of your own: a fresh id is added beside the shipped entries, while reusing a shipped id puts you in THAT cell and replaces it. Owners that filter by id address you by it."
					},
					{
						name: "order",
						requirement: "optional",
						type: "number",
						doc: "Position among the entries, ascending (default 0)."
					},
					{
						name: "label",
						requirement: "optional",
						type: "string | (() => string)",
						doc: "Display text where the owner projects one (nav rows, tabs). A thunk is re-read on every projection, so localized text follows the active locale without re-registering."
					}
				],
				ownerProps: [],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'root' (client-ui-layout), so it exists while that entry is mounted",
				occupants: [],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('shell.overlay', () => ctx.slots.register(\n      { name: 'shell.overlay', id: 'my-entry', order: 100, label: 'My entry' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-layout/src/client/index.ts:91"
			},
			{
				key: "sidebar",
				kind: "single",
				scope: "root",
				summary: "The whole left column.",
				doc: "The whole left column. OCCUPIED by ui-sidebar's SidebarRoot, which\ndeclares the workspace and settings seats inside it — registering here\nreplaces the navigation column outright rather than adding to it, and\nthe seats it declares disappear with it. To add something to the\nsidebar, register into one of those inner seats instead.\n\nThe occupant receives the frame's live column state (collapsed, width)\nand is expected to render the compact control rail while collapsed.",
				registerOptions: [],
				ownerProps: ["/** Sidebar owner share: live column state from the frame's concession solve. */\nexport interface SidebarOwnerProps {\n  /** True when the sidebar is closed (the column renders the compact control rail). */\n  collapsed: boolean\n  /** Rendered column width in px (SIDEBAR_COLLAPSED when collapsed). */\n  width: number\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'root' (client-ui-layout), so it exists while that entry is mounted",
				occupants: ["client-ui-sidebar SidebarRoot"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('sidebar', () => ctx.slots.register(\n      { name: 'sidebar' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-layout/src/client/index.ts:61"
			},
			{
				key: "sidebar.brand.mark",
				kind: "single",
				scope: "root",
				summary: "Brand mark rendered in the expanded brand row and collapsed rail.",
				doc: "Brand mark rendered in the expanded brand row and collapsed rail.\nDeclared by this package's `sidebar` entry; deployments may replace\nthe shell's fish fallback without replacing the surrounding controls.",
				registerOptions: [],
				ownerProps: ["/** Geometry supplied to the sidebar brand-mark occupant. */\nexport interface SidebarBrandMarkOwnerProps {\n  /** Requested square edge in pixels. */\n  size: number\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'sidebar' (client-ui-sidebar), so it exists while that entry is mounted",
				occupants: ["client-ui-brand-official OfficialBrandMark"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('sidebar.brand.mark', () => ctx.slots.register(\n      { name: 'sidebar.brand.mark' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-sidebar/src/client/contract/slots.ts:22"
			},
			{
				key: "sidebar.brand.name",
				kind: "single",
				scope: "root",
				summary: "Brand name rendered beside the expanded mark.",
				doc: "Brand name rendered beside the expanded mark. Declared by this\npackage's `sidebar` entry; the shell supplies a generic text fallback.",
				registerOptions: [],
				ownerProps: ["/** Empty owner share for the sidebar brand-name occupant. */\nexport interface SidebarBrandNameOwnerProps {\n  /** Marker field: the occupant owns its own content and width. */\n  children?: never\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'sidebar' (client-ui-sidebar), so it exists while that entry is mounted",
				occupants: ["client-ui-brand-official OfficialBrandName"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('sidebar.brand.name', () => ctx.slots.register(\n      { name: 'sidebar.brand.name' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-sidebar/src/client/contract/slots.ts:27"
			},
			{
				key: "sidebar.footer.action",
				kind: "list",
				scope: "root",
				summary: "Optional actions beside Settings at the sidebar foot.",
				doc: "Optional actions beside Settings at the sidebar foot. Declared by this\npackage's 'sidebar' entry; each action receives only the column state.",
				registerOptions: [
					{
						name: "id",
						requirement: "required",
						type: "string",
						doc: "Your cell key. Use an id of your own: a fresh id is added beside the shipped entries, while reusing a shipped id puts you in THAT cell and replaces it. Owners that filter by id address you by it."
					},
					{
						name: "order",
						requirement: "optional",
						type: "number",
						doc: "Position among the entries, ascending (default 0)."
					},
					{
						name: "label",
						requirement: "optional",
						type: "string | (() => string)",
						doc: "Display text where the owner projects one (nav rows, tabs). A thunk is re-read on every projection, so localized text follows the active locale without re-registering."
					}
				],
				ownerProps: ["/** Owner share of an action rendered beside Settings at the sidebar foot. */\nexport interface SidebarFooterActionOwnerProps {\n  /** Whether the sidebar renders wide content (false = 56px rail). */\n  wide: boolean\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'sidebar' (client-ui-sidebar), so it exists while that entry is mounted",
				occupants: ["client-ui-cordis CordisPanel id 'cordis-panel'"],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register(\n      { name: 'sidebar.footer.action', id: 'my-entry', order: 100, label: 'My entry' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-sidebar/src/client/contract/slots.ts:50"
			},
			{
				key: "sidebar.panellist",
				kind: "list",
				scope: "root",
				summary: "Global panel icons.",
				doc: "Global panel icons. Each list id addresses the matching main panel;\nthe sidebar owns the button and resolves its label from list metadata.",
				registerOptions: [
					{
						name: "id",
						requirement: "required",
						type: "string",
						doc: "Your cell key. Use an id of your own: a fresh id is added beside the shipped entries, while reusing a shipped id puts you in THAT cell and replaces it. Owners that filter by id address you by it."
					},
					{
						name: "order",
						requirement: "optional",
						type: "number",
						doc: "Position among the entries, ascending (default 0)."
					},
					{
						name: "label",
						requirement: "optional",
						type: "string | (() => string)",
						doc: "Display text where the owner projects one (nav rows, tabs). A thunk is re-read on every projection, so localized text follows the active locale without re-registering."
					}
				],
				ownerProps: ["/** Icon presentation supplied by the global panel row. */\nexport interface SidebarPanelIconOwnerProps {\n  /** Requested square edge in pixels. */\n  size: number\n  /** Whether this panel is selected in the main column. */\n  active: boolean\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'sidebar' (client-ui-sidebar), so it exists while that entry is mounted",
				occupants: [],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(\n      { name: 'sidebar.panellist', id: 'my-entry', order: 100, label: 'My entry' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-sidebar/src/client/contract/slots.ts:32"
			},
			{
				key: "sidebar.right.pane.tab",
				kind: "keyed",
				scope: "session",
				summary: "One tab's body, dispatched with the `id` of the type in force for `tab.kind`.",
				doc: "One tab's body, dispatched with the `id` of the type in force for\n`tab.kind`. A tab type registers here under its definition's `id` and\nreceives every tab of that kind, in every pane, docked or floating. A kind\nwith no type in force renders the owner's \"nothing can view this\" notice\nrather than an empty pane.",
				registerOptions: [{
					name: "key",
					requirement: "required",
					type: "string",
					doc: "Your cell key: the entry renders where the owner dispatches this exact key. Registering an already-occupied key replaces that occupant."
				}],
				ownerProps: [],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "open: any string the owner dispatches (no compile-time key set), none are taken yet",
				hookContext: "TabHookContext",
				slotInject: "SidebarRightTabInjected",
				declaredBy: "an entry in 'rightbar.session' (client-ui-sidebar-right), so it exists while that entry is mounted",
				occupants: [
					"client-ui-sidebar-documentpreview TextPreview",
					"client-ui-sidebar-files FilesBody",
					"client-ui-sidebar-right GuideBody"
				],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(\n      { name: 'sidebar.right.pane.tab', key: '<one key the owner dispatches>' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-sidebar-right/src/client/contract/slots.ts:50"
			},
			{
				key: "sidebar.right.pane.tab.title",
				kind: "keyed",
				scope: "session",
				summary: "A tab's title as its chip (and a floating panel's header) shows it, dispatched with the same key and information hook as the body.",
				doc: "A tab's title as its chip (and a floating panel's header) shows it,\ndispatched with the same key and information hook as the body. A type with a\nlive title — a terminal named after its shell, a chat after its first\nline — registers here and reads its own store; one without registers\nnothing and the chip shows the registry's `title(address)` text captured\nat open time.",
				registerOptions: [{
					name: "key",
					requirement: "required",
					type: "string",
					doc: "Your cell key: the entry renders where the owner dispatches this exact key. Registering an already-occupied key replaces that occupant."
				}],
				ownerProps: [],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "open: any string the owner dispatches (no compile-time key set), none are taken yet",
				hookContext: "TabHookContext",
				slotInject: "SidebarRightTabInjected",
				declaredBy: "an entry in 'rightbar.session' (client-ui-sidebar-right), so it exists while that entry is mounted",
				occupants: [
					"client-ui-sidebar-documentpreview TextTitle",
					"client-ui-sidebar-files FilesTitle",
					"client-ui-sidebar-right GuideTitle"
				],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register(\n      { name: 'sidebar.right.pane.tab.title', key: '<one key the owner dispatches>' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-sidebar-right/src/client/contract/slots.ts:64"
			},
			{
				key: "sidebar.right.tab.document",
				kind: "keyed",
				scope: "session",
				summary: "Document body selected by a registered implementation id.",
				doc: "Document body selected by a registered implementation id.",
				registerOptions: [{
					name: "key",
					requirement: "required",
					type: "string",
					doc: "Your cell key: the entry renders where the owner dispatches this exact key. Registering an already-occupied key replaces that occupant."
				}],
				ownerProps: ["/**\n * Contents prepared by the preview owner using ordinary file reads.\n * Byte arrays are transient UI input, never persisted layout or Session data.\n */\nexport type DocumentContent =\n  | { readonly kind: 'text'; readonly text: string; readonly pages: readonly DocumentTextPage[]; readonly eof: boolean }\n  | { readonly kind: 'bytes'; readonly data: Uint8Array<ArrayBuffer> }"],
				ownerPropsReferences: ["DocumentTextPage"],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "open: any string the owner dispatches (no compile-time key set), none are taken yet",
				hookContext: "UseSidebarRightTabInfo",
				slotInject: "{ hooks: { tabInfo: SlotHookFactory<'sidebar.right.tab.document', UseSidebarRightTabInfo> } }",
				declaredBy: "an entry in 'sidebar.right.pane.tab' (client-ui-sidebar-documentpreview), so it exists while that entry is mounted",
				occupants: [
					"client-ui-sidebar-documentpreview CodeBody",
					"client-ui-sidebar-documentpreview HtmlBody",
					"client-ui-sidebar-documentpreview ImageBody",
					"client-ui-sidebar-documentpreview MarkdownBody",
					"client-ui-sidebar-documentpreview PdfBody",
					"client-ui-sidebar-documentpreview TextBody"
				],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('sidebar.right.tab.document', () => ctx.slots.register(\n      { name: 'sidebar.right.tab.document', key: '<one key the owner dispatches>' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-sidebar-documentpreview/src/client/document/contract.ts:24"
			},
			{
				key: "sidebar.right.tab.guide",
				kind: "chain",
				scope: "session",
				summary: "The guide tab's body.",
				doc: "The guide tab's body. Selectors run in chain order and the first\nnon-declining entry replaces the shipped guide entirely; with no entry, or\nwith every entry declining, the shipped guide renders.",
				registerOptions: [{
					name: "select",
					requirement: "required",
					type: "(owner) => unknown | null",
					doc: "Pure routing selector. Entries are tried in ascending order; the first non-null result wins and arrives as the component's `matched` prop. All-null falls through to the owner's fallback."
				}],
				ownerProps: [],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "",
				hookContext: "UseSidebarRightTabInfo",
				slotInject: "{ hooks: { tabInfo: SlotHookFactory<'sidebar.right.tab.guide', UseSidebarRightTabInfo> } }",
				declaredBy: "an entry in 'sidebar.right.pane.tab' (client-ui-sidebar-right), so it exists while that entry is mounted",
				occupants: [],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('sidebar.right.tab.guide', () => ctx.slots.register(\n      { name: 'sidebar.right.tab.guide', select: owner => null },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-sidebar-right/src/client/contract/slots.ts:75"
			},
			{
				key: "sidebar.right.tab.menu.item",
				kind: "list",
				scope: "session",
				summary: "Extra items at the end of one tab's actions menu, in registration order.",
				doc: "Extra items at the end of one tab's actions menu, in registration order.\nEntries decide their own visibility from the tab they are given. Without a\nregistrant the menu shows only the kit's own layout actions.",
				registerOptions: [
					{
						name: "id",
						requirement: "required",
						type: "string",
						doc: "Your cell key. Use an id of your own: a fresh id is added beside the shipped entries, while reusing a shipped id puts you in THAT cell and replaces it. Owners that filter by id address you by it."
					},
					{
						name: "order",
						requirement: "optional",
						type: "number",
						doc: "Position among the entries, ascending (default 0)."
					},
					{
						name: "label",
						requirement: "optional",
						type: "string | (() => string)",
						doc: "Display text where the owner projects one (nav rows, tabs). A thunk is re-read on every projection, so localized text follows the active locale without re-registering."
					}
				],
				ownerProps: ["/** Owner share of one tab-menu item occurrence. */\nexport interface SidebarRightTabMenuOwnerProps {\n  /** The tab whose menu is open. */\n  tab: TabRecord\n  /**\n   * Dismiss the menu.\n   *\n   * An item that acts MUST call this: the menu is the kit's, and it closes on\n   * its own actions only. An item that leaves it open leaves a menu floating\n   * over content the action may have just replaced.\n   */\n  dismiss: () => void\n}"],
				ownerPropsReferences: ["TabRecord"],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'rightbar.session' (client-ui-sidebar-right), so it exists while that entry is mounted",
				occupants: [],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('sidebar.right.tab.menu.item', () => ctx.slots.register(\n      { name: 'sidebar.right.tab.menu.item', id: 'my-entry', order: 100, label: 'My entry' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-sidebar-right/src/client/contract/slots.ts:86"
			},
			{
				key: "sidebar.settings",
				kind: "single",
				scope: "root",
				summary: "The settings seat at the sidebar foot.",
				doc: "The settings seat at the sidebar foot. Declared by this package's\n'sidebar' entry; ui-settings registers its trigger row + modal panel.\nThe sidebar passes only its column state — it holds no settings state.",
				registerOptions: [],
				ownerProps: ["/**\n * Owner share of the sidebar settings seat: the column display state the\n * occupant's trigger row must render against (wide row vs rail icon).\n */\nexport interface SidebarSettingsOwnerProps {\n  /** Whether the sidebar renders wide content (false = 56px rail). */\n  wide: boolean\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'sidebar' (client-ui-sidebar), so it exists while that entry is mounted",
				occupants: ["client-ui-settings-general SettingsRoot"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('sidebar.settings', () => ctx.slots.register(\n      { name: 'sidebar.settings' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-sidebar/src/client/contract/slots.ts:45"
			},
			{
				key: "sidebar.workspaces",
				kind: "single",
				scope: "root",
				summary: "The workspace/session browsing region: section header, search, the grouped/flat session list, and every workspace dialog.",
				doc: "The workspace/session browsing region: section header, search, the\ngrouped/flat session list, and every workspace dialog. Declared by this\npackage's 'sidebar' entry (declaring is claiming); ui-workspace\nregisters the browser.",
				registerOptions: [],
				ownerProps: ["/**\n * Owner share of the browser hole — the only facts crossing the shell/region\n * boundary. Business data and actions arrive through the region's own inject.\n */\nexport interface SidebarSectionOwnerProps {\n  /** Shell fold-state output: wide renders the full browser, rail the icon column. */\n  wide: boolean\n  /** Rail icons request expansion; the browser rides the wide flip for focus. */\n  expandSidebar: () => void\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'sidebar' (client-ui-sidebar), so it exists while that entry is mounted",
				occupants: ["client-ui-workspace WorkspaceBrowser"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('sidebar.workspaces', () => ctx.slots.register(\n      { name: 'sidebar.workspaces' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-sidebar/src/client/contract/slots.ts:39"
			},
			{
				key: "sidebar.workspaces.directoryFlow",
				kind: "single",
				scope: "root",
				summary: "Directory-flow hole under the sidebar browsing region (declared by the WorkspaceBrowser entry).",
				doc: "Directory-flow hole under the sidebar browsing region (declared by the WorkspaceBrowser entry).",
				registerOptions: [],
				ownerProps: ["/**\n * Owner share of the directory-flow holes: the complete conversation between\n * the trigger surface and the picking interaction. The occupant reads `open`\n * to run/render its interaction and reports exactly one outcome per open.\n */\nexport interface DirectoryFlowOwnerProps {\n  /** True while a picking interaction is requested; flipping back to false withdraws the request. */\n  open: boolean\n  /** True while the owner adopts a picked path (`createWorkspace` in flight); occupants disable their commit affordances. */\n  busy: boolean\n  /** The operator picked a directory (absolute host path); the owner adopts it. */\n  onPicked: (path: string) => void\n  /** The operator dismissed the interaction; the owner just closes the flow. */\n  onCancel: () => void\n  /** The interaction itself failed (chooser missing, listing denied); the owner shows its error surface. */\n  onError: (message: string) => void\n}"],
				ownerPropsReferences: [],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'sidebar.workspaces' (client-ui-workspace), so it exists while that entry is mounted",
				occupants: ["client-ui-directory-picker-browse BrowseDirectoryFlow", "client-ui-directory-picker-native NativeDirectoryFlow"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('sidebar.workspaces.directoryFlow', () => ctx.slots.register(\n      { name: 'sidebar.workspaces.directoryFlow' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-workspace/src/client/contract/slots.ts:59"
			},
			{
				key: "tool.call.images",
				kind: "single",
				scope: "session",
				summary: "Durable images of a settled image-bearing Tool call, rendered through the attachment presentation plugin.",
				doc: "Durable images of a settled image-bearing Tool call, rendered through\nthe attachment presentation plugin. The Tool layer never imports an\nattachment implementation: a toolview declares this slot as a child and\nrenders it with the image card's references plus the session-authorized\nloader it received in its owner, and the attachment plugin fills the\ngallery. Composing no attachment presentation plugin renders nothing,\nwhich is why the image card keeps its own envelope text beside the\ngallery. A child slot is declared by exactly one entry: registering a\nsecond toolview that declares the same child throws at load, so a\nfuture image-bearing tool must reuse this entry or own a distinct\nslot.",
				registerOptions: [],
				ownerProps: ["/** Owner currency of the Tool image gallery slot: references plus the loader. */\nexport interface ToolImagesOwnerProps {\n  /** Durable references or submission-echo previews in result order. */\n  images: readonly MessageImageSource[]\n  /** Session-authorized image URL loader for the durable arm. */\n  loadImage: MessageImageLoader\n  /** Horizontal placement inside the owning record. */\n  align: 'start' | 'end'\n}"],
				ownerPropsReferences: ["MessageImageLoader", "MessageImageSource"],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'tool.call.toolview' (client-ui-tool), so it exists while that entry is mounted",
				occupants: ["client-ui-attachment MessageImages"],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('tool.call.images', () => ctx.slots.register(\n      { name: 'tool.call.images' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-tool/src/client/contract/slots.ts:40"
			},
			{
				key: "tool.call.toolview",
				kind: "keyed",
				scope: "session",
				summary: "Keyed atomic Tool call view, dispatched by the wire Tool name.",
				doc: "Keyed atomic Tool call view, dispatched by the wire Tool name. Register\nwith `key: '<tool name>'` to own how one tool's calls render inside a\nturn — the key domain is open (any wire tool name, including a tool your\nown package registered), so there is no compile-time key set to pick\nfrom and a typo simply never renders.\n\nA key the shipped composition already covers is replaced, not shared;\nan unclaimed key falls back to the generic tool row, so registering is\nadditive for your own tool and a takeover for a shipped one. The owner\npasses the call's identity, its frozen running-or-settled node, and the\nexpansion state (see ToolCallOwnerProps), so the view stays a pure\nfunction of what the turn already knows.",
				registerOptions: [{
					name: "key",
					requirement: "required",
					type: "string",
					doc: "Your cell key: the entry renders where the owner dispatches this exact key. Registering an already-occupied key replaces that occupant."
				}],
				ownerProps: ["/** Standard owner currency supplied to every atomic Tool view. */\nexport interface ToolCallOwnerProps {\n  /** Tool call identity, stable across running and settled forms. */\n  callId: string\n  /** Wire Tool name and keyed dispatch value. */\n  toolName: string\n  /** Frozen running call or settled result node. */\n  block: ToolCallBlock\n  /** Session workspace root for relative summaries. */\n  cwd?: string | undefined\n  /** Host account home; POSIX home-rooted summaries display as `~`. */\n  home?: string | undefined\n  /**\n   * Open a Tool argument path. A view that knows which line the call was about\n   * passes it, and the opened surface lands there.\n   */\n  openFile: (path: string, options?: OpenFileOptions) => void\n  /**\n   * Session-authorized image loader for the `tool.call.images` slot, supplied\n   * by the chat node that owns this call. A composed chat node always\n   * supplies it (`ChatNodeOwnerProps.loadImage` is required), so the tool\n   * layer never imports an attachment implementation nor handles URL\n   * authorization.\n   */\n  loadImage: MessageImageLoader\n  /** Inspect this call in the trajectory view when available. */\n  inspect?: (() => void) | undefined\n}"],
				ownerPropsReferences: [
					"ChatNodeOwnerProps",
					"MessageImageLoader",
					"OpenFileOptions"
				],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "open: any string the owner dispatches (no compile-time key set), already taken: ask_user_question, bash, cordis_define, cordis_run, cordis_stop, cordis_undefine, edit, glob, grep, present, read, read_image, skill, todo_write, web_fetch, web_search, write",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'conversation.chat.node' (client-ui-tool), so it exists while that entry is mounted",
				occupants: [
					"client-ui-deliverables PresentRow key 'present'",
					"client-ui-skill SkillRow key 'skill'",
					"client-ui-tool AskQuestionRow key 'ask_user_question'",
					"client-ui-tool BashRow key 'bash'",
					"client-ui-tool FileMutationRow key 'edit'",
					"client-ui-tool FileMutationRow key 'write'",
					"client-ui-tool ReadImageRow key 'read_image'",
					"client-ui-tool ReadRow key 'read'",
					"client-ui-tool SearchRow key 'grep'",
					"client-ui-tool SearchRow key 'glob'",
					"client-ui-tool TodoRow key 'todo_write'",
					"client-ui-tool WebRow key 'web_search'",
					"client-ui-tool WebRow key 'web_fetch'",
					"client-ui-cordis CordisDefineRow key 'cordis_define'",
					"client-ui-cordis CordisRunRow key 'cordis_run'",
					"client-ui-cordis CordisActionRow key 'cordis_stop'",
					"client-ui-cordis CordisActionRow key 'cordis_undefine'"
				],
				replaceRisk: "shadows-shipped-ui",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('tool.call.toolview', () => ctx.slots.register(\n      { name: 'tool.call.toolview', key: '<one key the owner dispatches>' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/client/ui-tool/src/client/contract/slots.ts:26"
			},
			{
				key: "tool.view.cordis",
				kind: "keyed",
				scope: "session",
				summary: "Interactive Package-owned region rendered inside the latest eligible `cordis_run` card in the conversation flow.",
				doc: "Interactive Package-owned region rendered inside the latest eligible\n`cordis_run` card in the conversation flow. Use it for controls and other\nUI the user can interact with. Dynamic Client code registers with\n`key: 'self'`; the Guard binds that key to the current Plugin and Package.",
				registerOptions: [{
					name: "key",
					requirement: "required",
					type: "string",
					doc: "Your cell key: the entry renders where the owner dispatches this exact key. Registering an already-occupied key replaces that occupant."
				}],
				ownerProps: ["/** Owner currency delivered to a dynamic Package's business view. */\nexport interface CordisToolViewOwnerProps {\n  readonly pluginId: CordisDynamicPluginId\n  readonly packageId: CordisDynamicPackageId\n  readonly pluginRunId: CordisDynamicPluginRunId\n}"],
				ownerPropsReferences: [
					"CordisDynamicPackageId",
					"CordisDynamicPluginId",
					"CordisDynamicPluginRunId"
				],
				standardProps: [
					"useResource: UseResource",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"usePanelInfo: UsePanelInfo",
					"useSessions: UseSessions",
					"useSessionPendingInteraction: UseSessionPendingInteraction",
					"useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>",
					"useChat: UseChat",
					"useConversation: UseConversation",
					"useInput: SnapshotSelectorHook<InputState>",
					"inputActions: InputActions",
					"useSession: SessionSnapshotSelector",
					"sessionId: SessionId",
					"useProjection: UseProjection",
					"useTrajectory: UseTrajectory"
				],
				keyDomain: "open: any string the owner dispatches (no compile-time key set), none are taken yet",
				hookContext: "",
				slotInject: "",
				declaredBy: "an entry in 'tool.call.toolview' (client-ui-cordis), so it exists while that entry is mounted",
				occupants: [],
				replaceRisk: "none",
				example: "return {\n  inject: ['slots'],\n  apply(ctx) {\n    ctx.slots.inject('tool.view.cordis', () => ctx.slots.register(\n      { name: 'tool.view.cordis', key: '<one key the owner dispatches>' },\n      () => React.createElement('div', null, 'hello'),\n    ))\n  },\n}",
				source: "packages/extensions/ui-cordis/src/client/slots.ts:31"
			}
		];
		//#endregion
		//#region lib/types/client/providers.js
		/** Built-in Client inspect providers over live Client-owned services. */
		const EMPTY_INPUT = {
			type: "object",
			properties: {},
			additionalProperties: false
		};
		const ANY_OUTPUT = { description: "JSON data owned by this inspect provider." };
		const SERVICE_INPUT = exactInput("service", "Exact Service key. Omit it for the compact Service and method-signature directory.");
		const EVENT_INPUT = exactInput("event", "Exact Event name. Omit it for the compact Event and listener-signature directory.");
		const SERVICE_OUTPUT = { description: "Compact Service directory, or one exact Service contract with only its referenced type declarations." };
		const EVENT_OUTPUT = { description: "Compact Event directory, or one exact Event contract with only its referenced type declarations." };
		const SUBTREE_OUTPUT = { description: "Compact purpose/topology trees. With root, selected also contains that Slot's full contract and live occupants." };
		const SUBTREE_INPUT = {
			type: "object",
			properties: { root: {
				type: "string",
				description: "Exact live Slot key. When supplied, selected contains the full contract for this Slot."
			} },
			additionalProperties: false
		};
		/** Exact Client closure symbols exposed by the evaluator and guard. */
		const CLIENT_BUILTIN_INSPECTION = [
			{
				name: "ctx",
				description: "Restricted Cordis Context. Prefer ctx.get(name) with an undefined check; use inject only for hard dependencies.",
				signatures: [
					"ctx.get(name: string): unknown | undefined",
					"ctx.on(name: string, listener: Function): () => void",
					"ctx.provide(name: string, value: unknown): () => void",
					"ctx.effect(callback: Function, label?: string): () => void"
				]
			},
			{
				name: "React",
				description: "React runtime exposed without JSX transformation.",
				signatures: [
					"React.createElement(type, props, ...children): ReactElement",
					"React.useState(initial)",
					"React.useEffect(effect, deps)"
				]
			},
			{
				name: "host",
				description: "Package-private JSON RPC from Client to this Package's Host half.",
				signatures: ["host.call(method: string, args?: JsonValue): Promise<JsonValue>"]
			},
			{
				name: "styles",
				description: "Package-owned stylesheet insertion cleaned up with the Client run.",
				signatures: ["styles.insert(css: string): () => void"]
			},
			{
				name: "console",
				description: "Package-tagged browser logging.",
				signatures: ["console.log(...values): void", "console.error(...values): void"]
			}
		];
		/**
		* Construct the first-party Client provider registrations.
		* @param ctx - Client context used for live Service-backed queries.
		* @returns registrations for static catalogs and live Client capabilities.
		*/
		function clientInspectProviders(ctx) {
			return [
				registration("Service", "Progressive Client Service discovery: compact capability/signature directory, then one exact coding contract.", "listService", (input) => queryServiceApi(readExact(input, "service")), SERVICE_INPUT, SERVICE_OUTPUT),
				registration("Event", "Progressive Client Event discovery: compact listener directory, then one exact event contract.", "listEvents", (input) => queryEventApi(readExact(input, "event")), EVENT_INPUT, EVENT_OUTPUT),
				registration("Builtin", "Plain-JavaScript symbols available to a dynamic Client half.", "listBuiltins", () => ({
					builtins: [...CLIENT_BUILTIN_INSPECTION],
					referencedTypes: []
				})),
				{
					manifest: {
						id: "Slots",
						description: "Progressive live Slot inspection: compact purpose/topology trees plus one exact Slot contract.",
						methods: [{
							name: "listSubTree",
							description: "Return compact live Slot trees for navigation. With root, also return the selected Slot's full contract and occupants.",
							inputSchema: SUBTREE_INPUT,
							outputSchema: SUBTREE_OUTPUT
						}]
					},
					query(method, input) {
						if (method !== "listSubTree") throw new Error(`unknown Slots inspect method "${method}"`);
						const slots = ctx.get("slots");
						if (slots === void 0) throw new Error("Client Slots service is not running");
						const root = typeof input === "object" && input !== null && !Array.isArray(input) && typeof input.root === "string" ? input.root : void 0;
						const trees = slots.snapshot(root);
						const selected = trees[0];
						return Promise.resolve({
							...root === void 0 ? {} : { requestedRoot: {
								name: root,
								available: trees.length > 0
							} },
							trees: trees.map(compactSlotTree),
							...root === void 0 || selected === void 0 ? {} : { selected: inspectLiveSlot(selected) },
							referencedTypes: []
						});
					}
				},
				registration("Theme", "Current theme token names and light/dark override requirements.", "listTokens", () => {
					const theme = ctx.get("theme");
					if (theme === void 0) throw new Error("Client Theme service is not running");
					return {
						tokens: theme.exportInspectTokens(),
						referencedTypes: []
					};
				})
			];
		}
		function registration(id, description, method, query, inputSchema = EMPTY_INPUT, outputSchema = ANY_OUTPUT) {
			return {
				manifest: {
					id,
					description,
					methods: [{
						name: method,
						description,
						inputSchema,
						outputSchema
					}]
				},
				async query(requested, input) {
					if (requested !== method) throw new Error(`unknown ${id} inspect method "${requested}"`);
					return await query(input);
				}
			};
		}
		function exactInput(field, description) {
			return {
				type: "object",
				properties: { [field]: {
					type: "string",
					description
				} },
				additionalProperties: false
			};
		}
		function readExact(input, field) {
			if (input === void 0 || input === null || Array.isArray(input) || typeof input !== "object") return void 0;
			const value = input[field];
			return typeof value === "string" ? value : void 0;
		}
		const SLOT_CATALOG = new Map(CLIENT_SLOT_API.map((entry) => [entry.key, entry]));
		const GUARDED_SLOT_KEYS = new Map([["tool.view.cordis", {
			description: "fixed by the dynamic Client Guard",
			values: [{
				value: "self",
				description: "The only accepted key. The Guard binds it to this Package's pluginId and packageId."
			}]
		}]]);
		function compactSlotTree(node) {
			const catalog = SLOT_CATALOG.get(node.name);
			const guardedKeys = catalog === void 0 ? void 0 : GUARDED_SLOT_KEYS.get(catalog.key);
			return {
				name: node.name,
				kind: node.kind,
				scope: node.scope,
				...catalog === void 0 ? {} : {
					purpose: catalog.summary,
					replaceRisk: catalog.replaceRisk,
					...catalog.registerOptions.length === 0 ? {} : { registration: catalog.registerOptions.map((option) => ({
						name: option.name,
						type: option.type,
						required: option.requirement === "required"
					})) },
					...catalog.keyDomain === "" ? {} : {
						keyDomain: guardedKeys?.description ?? catalog.keyDomain,
						...guardedKeys === void 0 ? {} : { allowedKeys: guardedKeys.values.map((value) => ({ ...value })) }
					}
				},
				children: node.children.map(compactSlotTree)
			};
		}
		function inspectLiveSlot(node) {
			const catalog = SLOT_CATALOG.get(node.name);
			return {
				name: node.name,
				kind: node.kind,
				scope: node.scope,
				...node.declaredBy === void 0 ? {} : { declaredBy: node.declaredBy },
				occupants: node.occupants.map((occupant) => ({ ...occupant })),
				...catalog === void 0 ? {} : { catalog: inspectSlotCatalog(catalog) }
			};
		}
		function inspectSlotCatalog(entry) {
			const guardedKeys = GUARDED_SLOT_KEYS.get(entry.key);
			return {
				description: entry.doc,
				registration: entry.registerOptions.map((option) => ({
					name: option.name,
					type: option.type,
					required: option.requirement === "required",
					description: option.doc
				})),
				ownerProps: [...entry.ownerProps],
				ownerPropsReferences: [...entry.ownerPropsReferences],
				standardProps: [...entry.standardProps],
				keyDomain: guardedKeys?.description ?? entry.keyDomain,
				...guardedKeys === void 0 ? {} : { allowedKeys: guardedKeys.values.map((value) => ({ ...value })) },
				hookContext: entry.hookContext,
				slotInject: entry.slotInject,
				replaceRisk: entry.replaceRisk
			};
		}
		//#endregion
		//#region lib/types/client/timer.js
		/** Browser implementation of the Cordis timer Service. */
		/** Browser timer Service with the same public API as the Host Cordis TimerService. */
		var ClientTimerService = class extends _deepseek_ai_cordis.Service {
			/** Register the Service and mix its lifecycle-safe helpers onto Context. */
			constructor(ctx) {
				super(ctx, "timer");
				ctx.mixin("timer", [
					"timeout",
					"interval",
					"throttle",
					"debounce",
					"setTimeout",
					"setInterval"
				]);
			}
			/**
			* Run a callback once through {@link timeout}.
			* @param callback - Work to run after the delay.
			* @param delay - Delay in milliseconds.
			* @returns Disposer that cancels the pending callback early.
			* @deprecated Use `ctx.timeout()` instead.
			*/
			setTimeout(callback, delay) {
				return this.timeout(callback, delay);
			}
			/**
			* Run a callback repeatedly through {@link interval}.
			* @param callback - Work to run on each tick.
			* @param delay - Interval in milliseconds.
			* @returns Disposer that stops the interval early.
			* @deprecated Use `ctx.interval()` instead.
			*/
			setInterval(callback, delay) {
				return this.interval(callback, delay);
			}
			timeout(...args) {
				const callback = typeof args[0] === "function" ? args.shift() : void 0;
				const delay = args[0];
				if (callback !== void 0) {
					const dispose = this.ctx.effect(() => {
						const timer = globalThis.setTimeout(() => {
							dispose();
							callback();
						}, delay);
						return () => {
							globalThis.clearTimeout(timer);
						};
					}, "ctx.timeout()");
					return dispose;
				}
				const { promise, resolve, reject } = Promise.withResolvers();
				const dispose = this.ctx.effect(() => {
					const timer = globalThis.setTimeout(resolve, delay);
					return () => {
						globalThis.clearTimeout(timer);
						reject(/* @__PURE__ */ new Error("Context has been disposed"));
					};
				}, "ctx.timeout()");
				return promise.finally(() => {
					dispose();
				});
			}
			interval(...args) {
				const callback = typeof args[0] === "function" ? args.shift() : void 0;
				const delay = args[0];
				if (callback !== void 0) return this.ctx.effect(() => {
					const timer = globalThis.setInterval(callback, delay);
					return () => {
						globalThis.clearInterval(timer);
					};
				}, "ctx.interval()");
				let done;
				let nextTask;
				const dispose = this.ctx.effect(() => {
					const timer = globalThis.setInterval(() => {
						nextTask?.resolve({
							done: false,
							value: void 0
						});
					}, delay);
					return () => {
						globalThis.clearInterval(timer);
						if (done !== void 0) return;
						done = {
							kind: "throw",
							reason: /* @__PURE__ */ new Error("Context has been disposed")
						};
						nextTask?.reject(done.reason);
					};
				}, "ctx.interval()");
				return {
					next: () => {
						if (done === void 0) return (nextTask = Promise.withResolvers()).promise;
						if (done.kind === "return") return Promise.resolve({
							done: true,
							value: done.value
						});
						return Promise.reject(done.reason);
					},
					return: (value) => {
						if (done === void 0) done = {
							kind: "return",
							value
						};
						nextTask?.resolve({
							done: true,
							value
						});
						dispose();
						return Promise.resolve({
							done: true,
							value
						});
					},
					throw: (reason) => {
						if (done === void 0) done = {
							kind: "throw",
							reason
						};
						nextTask?.reject(reason);
						dispose();
						return Promise.resolve({
							done: true,
							value: void 0
						});
					},
					[Symbol.asyncIterator]() {
						return this;
					}
				};
			}
			/** Build a delayed wrapper whose pending callback belongs to the calling Fiber. */
			schedule(label, trigger, disposed = false) {
				let timer;
				const dispose = this.ctx.effect(() => () => {
					disposed = true;
					globalThis.clearTimeout(timer);
				}, label);
				const wrapper = (...args) => {
					globalThis.clearTimeout(timer);
					timer = trigger(args, disposed);
				};
				wrapper.dispose = dispose;
				return wrapper;
			}
			/**
			* Return a throttled function whose timer is disposed with the calling Fiber.
			* @param callback - Function to throttle.
			* @param delay - Minimum interval between calls in milliseconds.
			* @param noTrailing - Whether to suppress a delayed trailing call.
			* @returns Throttled function with an early disposer.
			*/
			throttle(callback, delay, noTrailing) {
				let lastCall = -Infinity;
				const execute = (...args) => {
					lastCall = Date.now();
					callback(...args);
				};
				return this.schedule("ctx.throttle()", (args, disposed) => {
					const remaining = delay - Date.now() + lastCall;
					if (remaining <= 0) execute(...args);
					else if (!disposed) return globalThis.setTimeout(execute, remaining, ...args);
				}, noTrailing);
			}
			/**
			* Return a debounced function whose timer is disposed with the calling Fiber.
			* @param callback - Function to debounce.
			* @param delay - Quiet period in milliseconds.
			* @returns Debounced function with an early disposer.
			*/
			debounce(callback, delay) {
				return this.schedule("ctx.debounce()", (args, disposed) => {
					if (disposed) return;
					return globalThis.setTimeout(callback, delay, ...args);
				});
			}
		};
		/**
		* Install the browser timer Service on one Client composition.
		* @param ctx - Client context that owns the Service and mixed-in helpers.
		* @returns Nothing after registering the Service.
		*/
		function provideClientTimer(ctx) {
			new ClientTimerService(ctx);
		}
		//#endregion
		//#region lib/types/client/index.js
		/**
		* Dynamic-package runner, browser half: the load engine that turns one browser
		* half's source into a live cordis plugin (closure → guard → module table →
		* loader entry, ./runtime.ts), plus the retract announcement that unloads it.
		*
		* Nothing loads on activation: this page holds no dynamic package until a
		* dispatch arrives, and a dispatch only follows a model `cordis_run` or a user
		* pressing a card's start control. A refresh therefore starts clean by design —
		* host process memory still holds the definition, the page simply does not run
		* it until asked again.
		*/
		/** Teaching text for a routing failure the infrastructure itself reports. */
		function invokeFailure(pluginId, method, result) {
			const where = `host.call("${method}") on ${pluginId}`;
			if (result.code === "plugin-not-running") return `${where} found no active Host half — the Plugin is stopped or was removed.`;
			if (result.code === "stale-run") return `${where} belongs to an activation that has already been replaced.`;
			if (result.code === "method-not-found") return `${where} is not registered: the host half must declare it with harness.handle("${method}", fn).`;
			return `${where} failed inside the host handler: ${result.message}`;
		}
		/** Preserve a Host handler's stack while adding the Client call site diagnosis. */
		function invokeError(pluginId, method, result) {
			const error = new Error(invokeFailure(pluginId, method, result));
			if (result.stack !== void 0) error.stack = `${error.stack ?? error.message}\nHost stack:\n${result.stack}`;
			return error;
		}
		/**
		* Teaching text for a `host.call` the wire itself refused: the generated codec
		* rejected the argument before sending, or the result on the way back, or the
		* transport broke. The infrastructure's message names the field it refused but
		* not the call it belonged to, and the model authored both halves — so this adds
		* the call and the contract it has to satisfy.
		*/
		function wireFailure(id, method, error) {
			return `host.call("${method}") on ${id} did not complete: ${error instanceof Error ? error.message : String(error)}\nBoth directions carry JSON only: pass plain JSON data as the argument — or omit it, and the handler receives null — and answer from harness.handle("${method}", fn) with JSON (\`return null\` when there is nothing to report).`;
		}
		/** Stable Cordis plugin name. */
		const name = "cordis-client-runner";
		/**
		* Required services: the loader/module chain for entries, the slot registry for
		* contributions, and the `dynamicCordisRunner` Remote namespace. Declaring the
		* namespace parks this plugin until the host side exists, so a page never loads
		* a browser half whose host half it could not reach.
		*/
		const inject = [
			"loader",
			"modules",
			"slots",
			"remote",
			"remote.dynamicCordisRunner"
		];
		/**
		* Client plugin body: build the runner and subscribe the dispatch family.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			provideClientTimer(ctx);
			const inspect = new ClientCordisInspectRegistry({
				sync: async (providers) => {
					const answered = await ctx.remote.dynamicCordisRunner.syncInspectManifest(providers);
					if (!answered.ok) throw new Error(`${answered.error.code}: ${answered.error.message}`);
				},
				resolve: async (agentId, requestId, resolution) => {
					const answered = await ctx.remote.dynamicCordisRunner.resolveInspectQuery(agentId, requestId, resolution);
					if (!answered.ok) throw new Error(`${answered.error.code}: ${answered.error.message}`);
				}
			});
			provideClientCordisInspect(ctx, inspect);
			for (const provider of clientInspectProviders(ctx)) ctx.effect(() => inspect.register(provider), `cordis-client-runner: inspect ${provider.manifest.id}`);
			ctx.on("connection/reset", () => {
				inspect.publish();
			});
			const runner = new DynamicCordisPackageRunner({
				ctx,
				loader: ctx.loader,
				modules: ctx.get("modules"),
				slots: ctx.get("slots"),
				invoke: async (pluginId, pluginRunId, method, args) => {
					const answered = await ctx.remote.dynamicCordisRunner.invoke(pluginId, pluginRunId, method, args).catch((error) => {
						throw new Error(wireFailure(pluginId, method, error));
					});
					if (!answered.ok) throw new Error(wireFailure(pluginId, method, `${answered.error.code}: ${answered.error.message}`));
					const result = answered.value;
					if (result.ok) return result.value;
					throw invokeError(pluginId, method, result);
				},
				reportRenderFailure: (agentId, pluginId, pluginRunId, failure) => {
					ctx.remote.dynamicCordisRunner.reportRenderFailure(agentId, pluginId, pluginRunId, failure).then((result) => {
						if (!result.ok) console.error(`[cordis-client-runner] reporting a render failure of ${pluginId} failed:`, result.error);
					}, (error) => {
						console.error(`[cordis-client-runner] reporting a render failure of ${pluginId} failed:`, error);
					});
				},
				reportGuardFailure: (agentId, pluginId, pluginRunId, failure) => {
					ctx.remote.dynamicCordisRunner.reportClientGuardFailure(agentId, pluginId, pluginRunId, failure).then((result) => {
						if (!result.ok) console.error(`[cordis-client-runner] reporting a guard failure of ${pluginId} failed:`, result.error);
					}, (error) => {
						console.error(`[cordis-client-runner] reporting a guard failure of ${pluginId} failed:`, error);
					});
				}
			});
			const orchestrator = new CordisRunOrchestrator({
				runner,
				host: {
					runHostHalf: async (agentId, pluginId, packageId, mode, requestId, approveFutureVersions) => {
						const answered = await ctx.remote.dynamicCordisRunner.runHostHalf(agentId, pluginId, packageId, mode, requestId, approveFutureVersions);
						return answered.ok ? answered.value : {
							ok: false,
							message: `${answered.error.code}: ${answered.error.message}`
						};
					},
					getClientCode: async (agentId, pluginId, pluginRunId) => {
						const answered = await ctx.remote.dynamicCordisRunner.getClientCode(agentId, pluginId, pluginRunId);
						if (!answered.ok) throw new Error(`${answered.error.code}: ${answered.error.message}`);
						return answered.value;
					},
					resolveRequestRun: async (requestId, resolution) => {
						const answered = await ctx.remote.dynamicCordisRunner.resolveRequestRun(requestId, resolution);
						if (!answered.ok) throw new Error(`${answered.error.code}: ${answered.error.message}`);
						return answered.value;
					},
					settleUserRun: async (agentId, pluginId, resolution) => {
						const answered = await ctx.remote.dynamicCordisRunner.settleUserRun(agentId, pluginId, resolution);
						if (!answered.ok) throw new Error(`${answered.error.code}: ${answered.error.message}`);
						return answered.value;
					}
				}
			});
			const face = {
				activeRuns: orchestrator.activeRuns,
				lastRunError: orchestrator.lastRunError,
				renderFailures: runner.renderFailures,
				reconcileApprovals: (rows) => {
					orchestrator.reconcileApprovals(rows);
				},
				approve: (requestId, approveFutureVersions) => orchestrator.approve(requestId, approveFutureVersions),
				decline: (requestId) => orchestrator.decline(requestId),
				startUserRun: (request) => orchestrator.startUserRun(request),
				subscribe: (fn) => runner.subscribe(fn),
				getSnapshot: () => runner.getSnapshot(),
				isLoaded: (id) => runner.isLoaded(id)
			};
			ctx.provide("dynamicCordisRunner", face);
			ctx.effect(() => () => {
				runner.dispose();
			}, "cordis-client-runner: dynamic package runner");
			ctx.remote.$on("cordis/request-run", (request) => {
				orchestrator.open(request);
			});
			ctx.remote.$on("cordis/request-run-resolved", (resolved) => {
				orchestrator.close(resolved.requestId);
			});
			ctx.remote.$on("cordis/dynamic-retract", (retracted) => {
				runner.retract(retracted.pluginId, retracted.pluginRunId);
			});
			ctx.remote.$on("cordis/inspect-query", (request) => {
				inspect.query(request).catch((error) => {
					console.error(`[cordis-client-runner] inspect query ${request.provider}.${request.method} failed:`, error);
				});
			});
			ctx.remote.$on("cordis/inspect-query-resolved", (resolved) => {
				inspect.close(resolved.requestId);
			});
		}
		//#endregion
		exports.ClientCordisInspectRegistry = ClientCordisInspectRegistry;
		exports.ClientTimerService = ClientTimerService;
		exports.CordisRunOrchestrator = CordisRunOrchestrator;
		exports.DynamicCordisPackageRunner = DynamicCordisPackageRunner;
		exports.DynamicCordisStyles = DynamicCordisStyles;
		exports.apply = apply;
		exports.dynamicCordisContext = dynamicCordisContext;
		exports.evaluateClientHalf = evaluateClientHalf;
		exports.inject = inject;
		exports.isDynamicCordisPlugin = isDynamicCordisPlugin;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map