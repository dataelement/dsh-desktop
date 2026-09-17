import { createRequire } from "node:module";
import { Context, Inject, Service, composeError } from "@deepseek-ai/cordis";
import { deepEqual, defineProperty, isNonNullable, isNullable, valueMap } from "@deepseek-ai/cosmokit";
//#region lib/types/internal.js
/** Helpers for locating the current Node internal module loader. */
var ModuleLoader;
(function(ModuleLoader) {
	let _cachedLoader;
	function requireInternal(id) {
		const require = createRequire(import.meta.url);
		if (process.execArgv.includes("--expose-internals")) try {
			return require(id);
		} catch {}
		try {
			return require("node-addon-require-builtin").requireBuiltin(id);
		} catch {}
	}
	/**
	* Locate and classify the running Node internal module loader.
	*
	* The shape is decided by which module-job API the loader owns, never by the
	* Node version: v2 landed in 24.12.0, so a major-version test mistags every
	* 24.0–24.11.1 loader as v2 and makes consumers call `resolveSync` with
	* reversed parameters. Arity is not usable either — `resolveSync` reports 2
	* under both shapes. A loader owning neither API is left unclassified rather
	* than guessed, so consumers take their documented no-internals path.
	* @returns the classified loader, or `undefined` when none is reachable or its shape is unknown.
	*/
	function fromInternal() {
		if (_cachedLoader) return _cachedLoader;
		const [major] = process.versions.node.split(".").map(Number);
		if (major < 22) return;
		const raw = requireInternal("internal/modules/esm/loader")?.getOrInitializeCascadedLoader();
		if (!raw) return;
		const version = typeof raw.getOrCreateModuleJob === "function" ? "v2" : typeof raw.getModuleJobForImport === "function" ? "v1" : void 0;
		if (!version) return;
		return _cachedLoader = Object.assign(raw, { version });
	}
	ModuleLoader.fromInternal = fromInternal;
})(ModuleLoader || (ModuleLoader = {}));
//#endregion
//#region lib/types/config/group.js
/** Runtime owner for a list of child loader entries. */
var EntryGroup = class {
	ctx;
	tree;
	static key = Symbol.for("cordis.group");
	data = [];
	constructor(ctx, tree) {
		this.ctx = ctx;
		this.tree = tree;
		const entry = ctx.fiber.entry;
		if (entry) entry.subgroup = this;
	}
	get context() {
		return this.ctx;
	}
	async create(options) {
		const id = this.tree.ensureId(options);
		const existing = this.tree.store[id];
		const entry = existing ?? (this.tree.store[id] = new Entry(this.ctx.loader));
		const previousParent = entry.parent;
		entry.parent = this;
		try {
			await entry.update(options, true, true);
		} catch (error) {
			if (existing) entry.parent = previousParent;
			else delete this.tree.store[id];
			throw error;
		}
		return entry.id;
	}
	unlink(options) {
		const config = this.data;
		const index = config.indexOf(options);
		if (index >= 0) config.splice(index, 1);
	}
	async remove(id, isDispose = false) {
		const entry = this.tree.store[id];
		if (!entry) return;
		await entry._dispose();
		if (!isDispose) this.unlink(entry.options);
		delete this.tree.store[id];
		this.context.emit("loader/partial-dispose", entry, entry.options, false);
	}
	async update(config) {
		const oldConfig = this.data;
		const seen = /* @__PURE__ */ new Set();
		for (const options of config) {
			const id = this.tree.ensureId(options);
			if (seen.has(id)) throw new TypeError(`duplicate loader entry id: ${id}`);
			seen.add(id);
		}
		const oldMap = Object.fromEntries(oldConfig.map((options) => [options.id, options]));
		const newMap = Object.fromEntries(config.map((options) => [options.id, options]));
		try {
			const outcomes = await Promise.allSettled(config.map((options) => this.create(options)));
			if (this.ctx.fiber.uid === null) return;
			const failures = outcomes.filter((outcome) => outcome.status === "rejected").map((outcome) => outcome.reason);
			if (failures.length === 1) throw failures[0];
			if (failures.length > 1) throw new AggregateError(failures, "loader entries failed to apply");
			for (const id of Object.keys(oldMap)) if (!newMap[id]) await this.remove(id, true);
			this.data = config;
		} catch (error) {
			const rollbackErrors = [];
			for (const id of Object.keys(newMap).reverse()) {
				if (oldMap[id]) continue;
				try {
					await this.remove(id, true);
				} catch (rollbackError) {
					rollbackErrors.push(rollbackError);
				}
			}
			for (const options of oldConfig) try {
				await this.create(options);
			} catch (rollbackError) {
				rollbackErrors.push(rollbackError);
			}
			this.data = oldConfig;
			if (rollbackErrors.length) throw new AggregateError([error, ...rollbackErrors], "loader entry rollback failed");
			throw error;
		}
	}
	async stop() {
		for (const options of this.data) await this.remove(options.id, true);
	}
};
/** Plugin that mounts a nested loader entry group. */
var Group = class extends EntryGroup {
	ctx;
	config;
	static initial = [];
	static [EntryGroup.key] = true;
	constructor(ctx, config) {
		super(ctx, ctx.fiber.entry.parent.tree);
		this.ctx = ctx;
		this.config = config;
		ctx.on("internal/update", (config) => this.update(config));
	}
	async *[Service.init]() {
		yield () => this.stop();
		await this.update(this.config);
	}
};
//#endregion
//#region lib/types/config/tree.js
var __rewriteRelativeImportExtension = function(path, preserveJsx) {
	if (typeof path === "string" && /^\.\.?\//.test(path)) return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function(m, tsx, d, ext, cm) {
		return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : d + ext + "." + cm.toLowerCase() + "js";
	});
	return path;
};
/** Mutable tree of loader entries. Persistence is supplied by subclasses. */
var EntryTree = class EntryTree {
	static sep = ":";
	ctx;
	enableLogs;
	root;
	store = Object.create(null);
	constructor(ctx) {
		this.ctx = ctx.extend({ baseUrl: ctx.baseUrl });
		this.root = new EntryGroup(this.ctx, this);
		const entry = this.ctx.fiber.entry;
		if (entry) entry.subtree = this;
	}
	get context() {
		return this.ctx;
	}
	/** Iterate entries in this tree and any nested subtrees. */
	*entries() {
		for (const entry of Object.values(this.store)) {
			yield entry;
			if (!entry.subtree) continue;
			yield* entry.subtree.entries();
		}
	}
	/** Return pending import and lifecycle tasks owned by this tree. */
	getTasks() {
		return [...this.entries()].map((entry) => entry._initTask || entry.fiber?.inertia).filter(isNonNullable);
	}
	/**
	* Wait until this tree has no active import or lifecycle tasks.
	* @throws a settled fiber failure, or an aggregate when several fibers failed.
	*/
	async await() {
		while (true) {
			const tasks = this.getTasks();
			if (tasks.length) {
				await Promise.allSettled(tasks);
				continue;
			}
			const failures = (await Promise.allSettled([...this.entries()].map((entry) => entry._await()))).filter((outcome) => outcome.status === "rejected").map((outcome) => outcome.reason);
			if (failures.length === 1) throw failures[0];
			if (failures.length > 1) throw new AggregateError(failures, "loader fibers failed");
			this.ctx.reflect.notify(["loader"]);
			if (!this.getTasks().length) return;
		}
	}
	ensureId(options) {
		if (!options.id) do
			options.id = Math.random().toString(16).slice(2, 10);
		while (this.store[options.id]);
		return options.id;
	}
	/** Resolve an entry by id, including nested ids separated by `EntryTree.sep`. */
	resolve(id) {
		const parts = id.split(EntryTree.sep);
		let tree = this;
		const final = parts.pop();
		for (const part of parts) {
			tree = tree.store[part]?.subtree;
			if (!tree) throw new Error(`cannot resolve entry ${id}`);
		}
		const entry = tree.store[final];
		if (!entry) throw new Error(`cannot resolve entry ${id}`);
		return entry;
	}
	resolveGroup(id) {
		if (!id) return this.root;
		const entry = this.resolve(id);
		if (!entry.subgroup) throw new Error(`entry ${id} is not a group`);
		return entry.subgroup;
	}
	/** Create an entry in the root group or a nested group. */
	async create(options, parent = null, position = Infinity) {
		const group = this.resolveGroup(parent);
		const id = await group.create(options);
		const entry = this.resolve(id);
		group.data.splice(position, 0, entry.options);
		group.tree.write();
		return id;
	}
	/** Stop and remove an entry from its parent group. */
	async remove(id) {
		const entry = this.resolve(id);
		await entry.parent.remove(id);
		entry.parent.tree.write();
	}
	/** Update an entry and optionally move it to another group. */
	async update(id, options, parent, position) {
		const entry = this.resolve(id);
		const source = entry.parent;
		const sourceIndex = source.data.indexOf(entry.options);
		let target = source;
		if (parent !== void 0) {
			target = this.resolveGroup(parent);
			source.unlink(entry.options);
			target.data.splice(position ?? Infinity, 0, entry.options);
			entry.parent = target;
		}
		try {
			await entry.update(options, false, true);
		} catch (error) {
			if (parent !== void 0) {
				target.unlink(entry.options);
				source.data.splice(sourceIndex < 0 ? source.data.length : sourceIndex, 0, entry.options);
				entry.parent = source;
				try {
					await entry.update({}, false, true);
				} catch (rollbackError) {
					throw new AggregateError([error, rollbackError], `failed to roll back loader entry move ${id}`);
				}
			}
			throw error;
		}
		source.tree.write();
		if (target !== source) target.tree.write();
	}
	/** Import a plugin module from a specifier or `cordis:` builtin. */
	import(name, getOuterStack) {
		if (name.startsWith("cordis:")) return this.ctx.loader.builtins[name.slice(7)];
		return composeError(async (info) => {
			info.offset += 3;
			if (this.ctx.loader.internal) return await this.ctx.loader.internal.import(name, this.ctx.baseUrl, {});
			else if (name.startsWith(".")) return await import(__rewriteRelativeImportExtension(
				/* @vite-ignore */
				new URL(name, this.ctx.baseUrl).href
			));
			else return await import(__rewriteRelativeImportExtension(
				/* @vite-ignore */
				name
			));
		}, getOuterStack);
	}
};
//#endregion
//#region lib/types/config/utils.js
/** Evaluate a JavaScript expression against a loader context scope. */
const evaluate = new Function("ctx", "expr", `
  with (ctx) {
    return eval(expr)
  }
`);
/** Recursively replace YAML `!js` expression nodes with evaluated values. */
function interpolate(ctx, value) {
	if (isJsExpr(value)) return evaluate(ctx, value.__jsExpr);
	else if (!value || typeof value !== "object") return value;
	else if (Array.isArray(value)) return value.map((item) => interpolate(ctx, item));
	else return valueMap(value, (item) => interpolate(ctx, item));
}
/** Return true when a value is a serialized loader JavaScript expression. */
function isJsExpr(value) {
	return value instanceof Object && "__jsExpr" in value;
}
//#endregion
//#region lib/types/config/entry.js
function updateError(stage, options, cause) {
	const detail = cause instanceof Error ? cause.message : String(cause);
	return new Error(`failed to ${stage} loader entry ${options.id} (${options.name}): ${detail}`, { cause });
}
function takeEntries(object, keys) {
	const result = [];
	for (const key of keys) {
		if (!(key in object)) continue;
		result.push([key, object[key]]);
		delete object[key];
	}
	return result;
}
function sortKeys(object, prepend = ["id", "name"], append = ["config"]) {
	const part1 = takeEntries(object, prepend);
	const part2 = takeEntries(object, append);
	const rest = takeEntries(object, Object.keys(object)).sort(([a], [b]) => a.localeCompare(b));
	return Object.assign(object, Object.fromEntries([
		...part1,
		...rest,
		...part2
	]));
}
function replaceKeys(target, source) {
	for (const key of Object.keys(target)) Reflect.deleteProperty(target, key);
	return Object.assign(target, source);
}
/** One configured plugin node inside an `EntryTree`. */
var Entry = class Entry {
	loader;
	static key = Symbol.for("cordis.entry");
	ctx;
	fiber;
	parent;
	options = {};
	subgroup;
	subtree;
	_initTask;
	_disposing = 0;
	constructor(loader) {
		this.loader = loader;
		this.ctx = loader.ctx.extend({ [Entry.key]: this });
		this.context.emit("loader/entry-init", this);
	}
	get context() {
		return this.ctx;
	}
	get id() {
		let id = this.options.id;
		if (this.parent.tree.ctx.fiber.entry) id = this.parent.tree.ctx.fiber.entry.id + EntryTree.sep + id;
		return id;
	}
	/** True when this entry or any owning parent entry is disabled. */
	get disabled() {
		return this._disabled(this.options);
	}
	_disabled(options) {
		if (options.group) return false;
		if (this.disabledOf(options)) return true;
		let entry = this.parent.ctx.fiber.entry;
		while (entry) {
			if (this.disabledOf(entry.options)) return true;
			entry = entry.parent.ctx.fiber.entry;
		}
		return false;
	}
	/**
	* Effective disabled state: a `!!js` expression evaluates against the loader
	* context. The raw node stays in the options, so write-back keeps the form.
	*/
	disabledOf(options) {
		return isJsExpr(options.disabled) ? Boolean(this.evaluate(options.disabled.__jsExpr)) : Boolean(options.disabled);
	}
	evaluate(expr) {
		return evaluate(this.ctx, expr);
	}
	async _patchContext(diff) {
		await this.context.waterfall("loader/patch-context", this, async () => {
			Object.setPrototypeOf(this.ctx, this.parent.ctx);
			if (this.fiber?.uid && (diff.includes("config") || this.options.group)) await this.fiber.update(this.options.config, true);
		});
	}
	async refresh() {
		if (this.fiber) return;
		if (this.disabled) return;
		await this.init();
	}
	async _dispose(fiber = this.fiber) {
		if (!fiber) return;
		if (this.fiber === fiber) this.fiber = void 0;
		this._disposing += 1;
		try {
			await fiber.dispose();
		} finally {
			this._disposing -= 1;
		}
	}
	/** Merge new options, restart as needed, and persist through the parent tree. */
	async update(options, create = false, force = false) {
		const previousOptions = this.options;
		const legacy = { ...previousOptions };
		const candidate = create ? options : { ...previousOptions };
		if (!create) for (const [key, value] of Object.entries(options)) if (isNullable(value)) delete candidate[key];
		else candidate[key] = value;
		sortKeys(candidate);
		const diff = Object.keys({
			...candidate,
			...legacy
		}).filter((key) => !deepEqual(candidate[key], legacy[key]));
		if (!diff.length && !force) return;
		const commit = () => {
			if (create) return;
			this.options = replaceKeys(previousOptions, candidate);
		};
		const previous = this.fiber;
		if (!previous?.uid) {
			this.fiber = void 0;
			this.options = candidate;
			try {
				if (!this._disabled(candidate)) await this.init();
			} catch (error) {
				this.options = previousOptions;
				throw error;
			}
			commit();
			return;
		}
		if (this._disabled(candidate)) {
			this.options = candidate;
			try {
				await this._dispose(previous);
			} catch (error) {
				this.options = previousOptions;
				throw updateError("dispose", candidate, error);
			}
			commit();
			this.context.emit("loader/partial-dispose", this, legacy, true);
			return;
		}
		if (!diff.some((key) => key === "name" || key === "inject" || key === "group")) {
			this.options = candidate;
			try {
				await this._patchContext(diff);
			} catch (error) {
				this.options = previousOptions;
				try {
					await this._patchContext(diff);
				} catch (rollbackError) {
					throw updateError("rollback", legacy, new AggregateError([error, rollbackError]));
				}
				this.context.emit("loader/partial-dispose", this, candidate, true);
				throw updateError("apply", candidate, error);
			}
			commit();
			this.context.emit("loader/partial-dispose", this, legacy, true);
			return;
		}
		let plugin;
		try {
			plugin = diff.includes("name") ? this.loader.unwrapExports(await this.parent.tree.import(candidate.name, this.getOuterStack)) : previous.runtime.callback;
		} catch (error) {
			throw updateError("import", candidate, error);
		}
		const previousPlugin = previous.runtime.callback;
		this.options = candidate;
		try {
			await this._dispose(previous);
		} catch (error) {
			this.options = previousOptions;
			throw updateError("dispose", candidate, error);
		}
		try {
			await this._start(plugin);
		} catch (error) {
			this.options = previousOptions;
			try {
				await this._start(previousPlugin);
			} catch (rollbackError) {
				throw updateError("rollback", legacy, new AggregateError([error, rollbackError]));
			}
			this.context.emit("loader/partial-dispose", this, candidate, true);
			throw updateError("apply", candidate, error);
		}
		commit();
		this.context.emit("loader/partial-dispose", this, legacy, true);
	}
	getOuterStack = () => {
		let entry = this;
		const result = [];
		do {
			result.push(`    at ${entry.parent.tree.ctx.baseUrl}#${entry.options.id}`);
			entry = entry.parent.ctx.fiber.entry;
		} while (entry);
		return result;
	};
	/** Import and start the configured plugin if it is not already running. */
	async init() {
		try {
			await (this._initTask ??= this._init());
		} finally {
			this._initTask = void 0;
			if (!this.loader.getTasks().length) this.ctx.reflect.notify(["loader"]);
		}
		await this._await();
	}
	async _await() {
		try {
			await this.fiber?.await();
		} catch (error) {
			throw updateError("apply", this.options, error);
		}
	}
	async _init() {
		let plugin;
		try {
			plugin = this.loader.unwrapExports(await this.parent.tree.import(this.options.name, this.getOuterStack));
		} catch (error) {
			throw updateError("import", this.options, error);
		}
		try {
			await this._start(plugin);
		} catch (error) {
			throw updateError("apply", this.options, error);
		}
	}
	async _start(plugin) {
		let fiber;
		try {
			await this._patchContext([]);
			this.loader.showLog(this, "apply");
			fiber = this.fiber = this.ctx.registry.plugin(plugin, this.options.config, this.getOuterStack);
			await fiber.await();
		} catch (error) {
			await this._dispose(fiber);
			throw error;
		}
	}
};
//#endregion
//#region lib/types/config/isolate.js
function swap(target, source) {
	for (const key of Reflect.ownKeys(target)) Reflect.deleteProperty(target, key);
	for (const key of Reflect.ownKeys(source || {})) Reflect.defineProperty(target, key, Reflect.getOwnPropertyDescriptor(source, key));
}
/** Symbol realm used to isolate service implementations by entry or label. */
var Realm = class {
	store = Object.create(null);
	access(key, create = false) {
		if (create) return this.store[key] ??= Symbol(`${key}${this.suffix}`);
		else return this.store[key] ?? Symbol(`${key}${this.suffix}`);
	}
	delete(key) {
		delete this.store[key];
	}
	get size() {
		return Object.keys(this.store).length;
	}
};
/** Entry-local isolation realm. */
var LocalRealm = class extends Realm {
	entry;
	constructor(entry) {
		super();
		this.entry = entry;
	}
	get suffix() {
		return "#" + this.entry.options.id;
	}
};
/** Named isolation realm shared by entries that use the same label. */
var GlobalRealm = class extends Realm {
	label;
	constructor(label) {
		super();
		this.label = label;
	}
	get suffix() {
		return "@" + this.label;
	}
};
/** Install loader hooks that apply `intercept` and `isolate` entry options. */
function isolate(ctx) {
	const realms = Object.create(null);
	const delims = Object.create(null);
	function access(entry, name, create = false) {
		let realm;
		const label = entry.options.isolate?.[name];
		if (!label) return;
		if (label === true) realm = entry.realm ??= new LocalRealm(entry);
		else if (create) realm = realms[label] ??= new GlobalRealm(label);
		else realm = realms[label];
		return realm?.access(name, create);
	}
	ctx.on("loader/entry-init", (entry) => {
		entry.ctx[Context.intercept] = Object.create(entry.ctx[Context.intercept]);
		entry.ctx[Context.isolate] = Object.create(entry.ctx[Context.isolate]);
	});
	ctx.on("loader/patch-context", async (entry, next) => {
		const newMap = Object.create(entry.parent.ctx[Context.isolate]);
		for (const name of Object.keys(entry.options.isolate ?? {})) newMap[name] = access(entry, name, true);
		const diff = Object.create(null);
		const oldMap = entry.ctx[Context.isolate];
		for (const name in {
			...newMap,
			...delims
		}) {
			if (newMap[name] === oldMap[name]) continue;
			const delim = delims[name] ??= Symbol(`delim:${name}`);
			entry.ctx[delim] = Symbol(`${name}#${entry.id}`);
			for (const symbol of [oldMap[name], newMap[name]]) {
				const impl = symbol && entry.ctx.reflect.store[symbol];
				if (!impl) continue;
				if (!impl.fiber) {
					entry.ctx.logger.warn(/* @__PURE__ */ new Error(`expected service ${name} to be implemented`));
					continue;
				}
				diff[name] = [
					oldMap[name],
					newMap[name],
					entry.ctx[delim],
					impl.fiber.ctx[delim]
				];
				if (entry.ctx[delim] !== impl.fiber.ctx[delim]) break;
			}
		}
		Object.setPrototypeOf(entry.ctx[Context.isolate], entry.parent.ctx[Context.isolate]);
		Object.setPrototypeOf(entry.ctx[Context.intercept], entry.parent.ctx[Context.intercept]);
		swap(entry.ctx[Context.isolate], newMap);
		swap(entry.ctx[Context.intercept], entry.options.intercept);
		await next();
		for (const [symbol1, symbol2, flag1, flag2] of Object.values(diff)) if (flag1 === flag2 && entry.ctx.reflect.store[symbol1] && !entry.ctx.reflect.store[symbol2]) {
			entry.ctx.reflect.store[symbol2] = entry.ctx.reflect.store[symbol1];
			delete entry.ctx.reflect.store[symbol1];
		}
		ctx.reflect.notify(Object.keys(diff), (ctx, name) => {
			const [symbol1, symbol2, flag1, flag2] = diff[name];
			const symbol3 = ctx[Context.isolate][name];
			const flag3 = ctx[delims[name]];
			return (symbol1 === symbol3 || symbol2 === symbol3) && flag1 === flag3 !== (flag1 === flag2);
		});
		for (const name in delims) if (!Reflect.ownKeys(newMap).includes(name)) delete entry.ctx[delims[name]];
	});
	ctx.on("loader/partial-dispose", (entry, legacy, active) => {
		for (const [name, label] of Object.entries(legacy.isolate ?? {})) {
			if (label === true) continue;
			if (active && entry.options.isolate?.[name] === label) continue;
			const realm = realms[label];
			if (!realm) continue;
			for (const entry of ctx.loader.entries()) if (entry.options.isolate?.[name] === realm.label) return;
			realm.delete(name);
			if (!realm.size) delete realms[realm.label];
		}
	});
}
//#endregion
//#region lib/types/index.js
/**
* Service that owns a loader entry tree and imports configured plugins.
*
* Subclasses provide persistence by implementing `write()` on `EntryTree`.
*/
var Loader = class extends EntryTree {
	config;
	envData = process.env.CORDIS_SHARED ? JSON.parse(process.env.CORDIS_SHARED) : { startTime: Date.now() };
	name = "loader";
	internal = ModuleLoader.fromInternal();
	builtins = Object.create(null);
	constructor(ctx, config = {}) {
		super(ctx);
		this.config = config;
		if (config.baseUrl) this.ctx.baseUrl = config.baseUrl;
		const self = this;
		defineProperty(this, Service.tracker, {
			associate: "loader",
			property: "ctx",
			noShadow: true
		});
		ctx.reflect.provide("loader", this, this[Service.check]);
		ctx.on("internal/config", function(_config, next) {
			const config = next();
			if (!this.entry || this.parent.fiber?.entry === this.entry) return config;
			if ((this.runtime?.callback)?.[EntryGroup.key]) return config;
			return interpolate(this.ctx, config);
		}, { global: true });
		ctx.on("internal/update", async function(config, noSave, next) {
			if (!this.entry || noSave || this.parent.fiber?.entry === this.entry) return next();
			await next();
			const unparse = this.runtime?.Config?.["simplify"];
			this.entry.options.config = unparse ? unparse(config) : config;
			this.entry.parent.tree.write();
		}, {
			global: true,
			prepend: true
		});
		ctx.on("internal/update", function(config, _, next) {
			if (!this.entry || this.parent.fiber?.entry === this.entry) return next();
			self.showLog(this.entry, "reload");
			return next();
		}, { global: true });
		ctx.on("internal/plugin", (fiber) => {
			if (fiber.parent[Entry.key] && !fiber.entry) {
				fiber.entry = fiber.parent[Entry.key];
				Inject.resolve(fiber.entry.options.inject, fiber.inject);
			}
			if (fiber.uid) return;
			if (!fiber.entry) return;
			if (fiber.parent.fiber?.entry === fiber.entry) return;
			if (!ctx.registry.has(fiber.runtime.callback)) return;
			const treeOwner = fiber.entry.parent.tree.ctx.fiber;
			if (!treeOwner.uid || treeOwner.state === 5) return;
			if (fiber.entry._disposing) return;
			this.showLog(fiber.entry, "unload");
			if (fiber.entry.disabled) return;
			fiber.entry.options.disabled = true;
			fiber.entry.parent.tree.write();
		});
		ctx.plugin(isolate);
	}
	write() {}
	[Service.check]() {
		if (Service.prototype[Service.resolveConfig].call(this).await && this.getTasks().length) return false;
		return true;
	}
	showLog(entry, type) {
		if (entry.options.group || !entry.parent.tree.enableLogs) return;
		this.ctx.root.logger?.("loader").info("%s plugin %C", type, entry.options.name);
	}
	/** Return the loader entry id that owns `fiber`, if any. */
	locate(fiber = this.ctx.fiber) {
		while (1) {
			if (fiber.entry) return fiber.entry.id;
			const next = fiber.parent.fiber;
			if (fiber === next) return;
			fiber = next;
		}
	}
	/** Hook for hosts that can restart the process on full-reload requests. */
	exit() {}
	/** Normalize ESM/CJS/default export shapes before applying a plugin. */
	unwrapExports(exports) {
		if (isNullable(exports)) return exports;
		exports = exports.default ?? exports;
		if (!exports.__esModule) return exports;
		return exports.default ?? exports;
	}
};
//#endregion
export { Entry, EntryGroup, EntryTree, GlobalRealm, Group, Loader, Loader as default, LocalRealm, ModuleLoader, Realm, evaluate, interpolate, isJsExpr };
