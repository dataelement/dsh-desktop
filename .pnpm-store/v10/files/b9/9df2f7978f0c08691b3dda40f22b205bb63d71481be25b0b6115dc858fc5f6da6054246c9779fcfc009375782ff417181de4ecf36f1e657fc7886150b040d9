import z from "@deepseek-ai/schemastery";
import { UNIT_NAME_RE, storageBackendServiceKey } from "@deepseek-ai/dsh-storage";
//#region lib/types/error.js
/**
* Error vocabulary of the domain data form.
* @module @deepseek-ai/dsh-storage-domain/src/error
*/
/**
* Error thrown by the domain layer. The `code` is the stable contract
* consumers may switch on; `message` is diagnostic prose. Backend failures
* (`backend-not-found`, `version-mismatch`, …) pass through as
* `StorageError` — the domain layer does not rewrap them.
*/
var DomainError = class extends Error {
	code;
	name = "DomainError";
	/** Present exactly when `code` is `invalid-record`. */
	detail;
	/**
	* @param code - Stable discriminant for the failure class.
	* @param message - Human-readable diagnostic detail.
	* @param options - Standard error options plus the `invalid-record` location.
	*/
	constructor(code, message, options) {
		super(message, options);
		this.code = code;
		if (options?.detail) this.detail = options.detail;
	}
};
//#endregion
//#region lib/types/spec.js
/**
* Domain declaration vocabulary. A spec object is the single source of a
* domain's identity, layout, and record schemas: the owning package defines
* it once with {@link defineDomain} and both the type surface and the runtime
* (validation, descriptor projection) derive from it. Record schemas are zod
* (`z.infer` keeps types un-duplicated and the same schemas later project to
* RPC wire schemas); plugin `Config` stays schemastery.
* @module @deepseek-ai/dsh-storage-domain/src/spec
*/
/**
* Declare one table.
* @param schema - zod schema validating every stored record of this table.
* @returns the table declaration, key-typed by `K`.
*/
function domainTable(schema) {
	return { valueSchema: schema };
}
/**
* Identity helper that pins a spec's literal types and validates its fields.
* Misconfiguration fails loud at the owning package's module load, before any
* medium is touched: a domain or table name outside `UNIT_NAME_RE`, a version
* that is not a non-negative integer, or a global schema that accepts `null`
* all throw. The `null` rejection guards round-tripping: backends store the
* global as opaque JSON with `null` as the "never written" sentinel, so a
* nullable global would be indistinguishable from an absent one on reopen
* (a stored `null` silently reverts to `initial`).
* @param spec - The domain declaration.
* @returns the same spec, narrowed to its literal type.
*/
function defineDomain(spec) {
	if (!UNIT_NAME_RE.test(spec.name)) throw new Error(`domain name '${spec.name}' must match ${UNIT_NAME_RE}`);
	if (!Number.isInteger(spec.version) || spec.version < 0) throw new Error(`domain '${spec.name}' version must be a non-negative integer, got ${spec.version}`);
	for (const compat of spec.compatibleVersions ?? []) if (!Number.isInteger(compat) || compat < 0 || compat >= spec.version) throw new Error(`domain '${spec.name}' compatibleVersions entries must be non-negative integers below version ${spec.version}, got ${compat}`);
	if (spec.layout !== void 0) {
		const layout = spec.layout;
		if (layout !== "single" && layout !== "per-record") throw new Error(`domain '${spec.name}' layout must be 'single' or 'per-record', got ${layout}`);
	}
	if (spec.invalidRecords !== void 0) {
		const policy = spec.invalidRecords;
		if (policy !== "backup-and-skip") throw new Error(`domain '${spec.name}' invalidRecords must be 'backup-and-skip' when present, got ${policy}`);
	}
	for (const table of Object.keys(spec.tables)) if (!UNIT_NAME_RE.test(table)) throw new Error(`domain '${spec.name}' table name '${table}' must match ${UNIT_NAME_RE}`);
	if (spec.global !== void 0 && spec.global.schema.safeParse(null).success) throw new Error(`domain '${spec.name}' global schema must not accept null: null is the medium's "never written" sentinel, so a stored null could not round-trip`);
	return spec;
}
/**
* Project a spec onto the backend-facing unit descriptor.
* @param spec - The domain declaration.
* @returns the descriptor handed to `KvFacet.open`.
*/
function descriptorOf(spec) {
	return {
		name: spec.name,
		version: spec.version,
		tables: Object.keys(spec.tables),
		hasGlobal: spec.global !== void 0,
		...spec.layout === void 0 ? {} : { layout: spec.layout },
		...spec.compatibleVersions === void 0 ? {} : { compatibleVersions: spec.compatibleVersions }
	};
}
//#endregion
//#region lib/types/domain.js
/**
* Runtime of one open domain: authoritative in-memory state, the single
* per-domain write chain, and change-event emission. Reads are synchronous
* from memory; every write queues on the chain, awaits backend durability
* FIRST, then mutates memory, then emits `domain/changed` — a rejected
* backend write leaves memory untouched (no divergence between reads and the
* medium), and events carry values that equal the in-memory state at
* emission, in write order.
* @module @deepseek-ai/dsh-storage-domain/src/domain
*/
const noop = () => {};
/**
* The single domain implementation behind the {@link Domain} interface. The
* facility constructs it from a validated `loadAll` snapshot and erases it to
* `Domain<S>`; nothing outside this package constructs one.
*/
var DomainImpl = class {
	ctx;
	unit;
	onClosed;
	/** Domain name from the spec. */
	name;
	tables = /* @__PURE__ */ new Map();
	globalValue;
	globalHandle;
	/** Tail of the write chain; every link settles (rejections are observed by the caller's slice). */
	chain = Promise.resolve();
	/** Set when close begins: new writes reject while already-queued writes drain. */
	disposing = false;
	/** Set when close finishes (chain drained, unit closed): reads reject from here on. */
	closed = false;
	disposal;
	/**
	* @param ctx - Context that carries `domain/changed` emissions.
	* @param spec - The domain declaration.
	* @param unit - The opened backend unit; this instance owns its lifecycle.
	* @param records - Validated records from the unit's `loadAll`, one entry
	* per declared table (empty maps included) — the facility builds it from
	* the spec, so the entry set IS the table set.
	* @param globalValue - Validated stored global, or the spec's `initial`
	* when the medium held none; `undefined` when the spec declares no global.
	* @param onClosed - Facility hook run once after teardown completes; frees
	* the domain name for a later open.
	*/
	constructor(ctx, spec, unit, records, globalValue, onClosed) {
		this.ctx = ctx;
		this.unit = unit;
		this.onClosed = onClosed;
		this.name = spec.name;
		const host = {
			domainName: spec.name,
			unit,
			enqueue: (job) => this.enqueue(job),
			assertReadable: () => {
				this.assertReadable();
			},
			emitChanged: (change) => {
				this.emitChanged(change);
			}
		};
		for (const [table, tableRecords] of records) this.tables.set(table, new KvTableImpl(host, table, tableRecords));
		if (spec.global !== void 0) {
			this.globalValue = globalValue;
			this.globalHandle = {
				get: () => {
					this.assertReadable();
					return this.globalValue;
				},
				set: (value) => this.enqueue(async () => {
					await this.unit.setGlobal(value);
					this.globalValue = value;
					this.emitChanged({
						domain: this.name,
						table: "",
						key: "",
						operation: "put",
						value
					});
				})
			};
		}
	}
	/** Global singleton handle; accessing it on a spec that declares no global is a caller bug and throws. */
	get global() {
		if (this.globalHandle === void 0) throw new Error(`domain '${this.name}' declares no global`);
		return this.globalHandle;
	}
	/**
	* Resolve one declared table handle; an undeclared name is a caller bug
	* and throws.
	* @param name - Declared table name.
	* @returns the stable table handle.
	*/
	table(name) {
		const table = this.tables.get(name);
		if (table === void 0) throw new Error(`domain '${this.name}' declares no table '${name}'`);
		return table;
	}
	/**
	* Close this domain: reject new writes immediately, drain already-queued
	* writes (their events still emit), close the unit, then free the name via
	* the facility hook. Idempotent — repeated calls share one teardown.
	* @returns resolution after the unit is released.
	*/
	close() {
		this.disposal ??= this.runClose();
		return this.disposal;
	}
	async runClose() {
		this.disposing = true;
		await this.chain;
		await this.unit.close();
		this.closed = true;
		this.onClosed();
	}
	/**
	* Dispatch one post-durability change notification, containing observer
	* failures: the write is already committed (medium and memory both hold
	* the new state), so a throwing listener must not retroactively reject it.
	*/
	emitChanged(change) {
		try {
			this.ctx.emit("domain/changed", change);
		} catch (error) {
			this.ctx.logger.warn(`domain '${this.name}': domain/changed listener failed: ${String(error)}`);
		}
	}
	enqueue(job) {
		if (this.disposing) return Promise.reject(new DomainError("closed", `domain '${this.name}' is closed`));
		const result = this.chain.then(job);
		this.chain = result.then(noop, noop);
		return result;
	}
	assertReadable() {
		if (this.closed) throw new DomainError("closed", `domain '${this.name}' is closed`);
	}
};
/** Table handle bound to one in-memory record map and its domain's write chain. */
var KvTableImpl = class {
	host;
	tableName;
	records;
	constructor(host, tableName, records) {
		this.host = host;
		this.tableName = tableName;
		this.records = records;
	}
	get(key) {
		this.host.assertReadable();
		return this.records.get(key);
	}
	entries() {
		this.host.assertReadable();
		return [...this.records.entries()][Symbol.iterator]();
	}
	keys() {
		this.host.assertReadable();
		return [...this.records.keys()][Symbol.iterator]();
	}
	get size() {
		this.host.assertReadable();
		return this.records.size;
	}
	put(key, value) {
		return this.host.enqueue(async () => {
			await this.host.unit.putRecord(this.tableName, key, value);
			this.records.set(key, value);
			this.emitPut(key, value);
		});
	}
	delete(key) {
		return this.host.enqueue(async () => {
			if (!this.records.has(key)) return false;
			await this.host.unit.deleteRecord(this.tableName, key);
			this.records.delete(key);
			this.host.emitChanged({
				domain: this.host.domainName,
				table: this.tableName,
				key,
				operation: "deleted"
			});
			return true;
		});
	}
	update(key, fn) {
		return this.host.enqueue(async () => {
			if (!this.records.has(key)) throw new DomainError("missing-key", `domain '${this.host.domainName}' table '${this.tableName}' has no record '${key}' to update`);
			const next = fn(this.records.get(key));
			await this.host.unit.putRecord(this.tableName, key, next);
			this.records.set(key, next);
			this.emitPut(key, next);
			return next;
		});
	}
	emitPut(key, value) {
		this.host.emitChanged({
			domain: this.host.domainName,
			table: this.tableName,
			key,
			operation: "put",
			value
		});
	}
};
//#endregion
//#region lib/types/index.js
/**
* Domain data form (`ctx.storage.domain`): schema-validated, change-emitting
* KV domains over storage backends. The single implementation of the domain
* layer — consumers depend on this package and never touch backends directly.
* Plugin `Config` is schemastery; record schemas inside domain specs are zod
* (see `src/spec.ts` for the split rationale).
* @module @deepseek-ai/dsh-storage-domain
*/
/** Cordis plugin name. */
const name = "storage-domain";
/** The storage hub must be present before the form can mount. */
const inject = ["storage"];
const Config = z.object({
	backend: z.string().required(),
	routes: z.dict(z.string()).default({})
});
/**
* The mounted domain facility. Opens declared domains over routed backends;
* one facility instance owns the open-domain table and enforces single-open
* per domain name.
*/
var DomainFacility = class {
	ctx;
	config;
	domains = /* @__PURE__ */ new Map();
	/** Names reserved by an in-flight or completed open, so concurrent opens of one name fail loud. */
	reserved = /* @__PURE__ */ new Set();
	/**
	* @param ctx - Context of the domain plugin; open-domain effects and change
	* events attach here.
	* @param config - Validated plugin config.
	*/
	constructor(ctx, config) {
		this.ctx = ctx;
		this.config = config;
	}
	/**
	* Open one declared domain. Steps, each failing the whole call: reject a
	* name that is already open (`already-open`); resolve the backend route
	* (`backend-not-found` passes through from the hub); require its `kv` facet
	* (`facet-unsupported`); open the unit projected from the spec (backend
	* `version-mismatch`/`malformed-medium` pass through); load and validate
	* every stored record against the spec's zod schemas (`invalid-record`
	* with the offending table and key — unless the spec declares
	* `invalidRecords: 'backup-and-skip'` and the unit can move documents aside, in
	* which case the failing record is backed up, logged, and skipped);
	* construct the domain.
	*
	* Lifecycle: the CALLER owns the returned handle and closes it via
	* `Domain.close()` (typically as its own `ctx.effect` disposer) — the
	* facility does not tie the domain to any consumer fiber. Domains still
	* open when the facility unmounts are closed by the plugin disposer.
	* @param spec - The domain declaration, typically from `defineDomain`.
	* @returns the opened domain handle, typed by the spec.
	*/
	async open(spec) {
		if (this.reserved.has(spec.name)) throw new DomainError("already-open", `domain '${spec.name}' is already open`);
		this.reserved.add(spec.name);
		try {
			const backendName = this.config.routes?.[spec.name] ?? this.config.backend;
			const backend = this.ctx.storage.backend.get(backendName);
			if (!backend.kv) throw new DomainError("facet-unsupported", `backend '${backendName}' routed for domain '${spec.name}' has no kv facet`);
			const unit = await backend.kv.open(descriptorOf(spec));
			try {
				const snapshot = await unit.loadAll();
				const tables = /* @__PURE__ */ new Map();
				for (const [table, tableSpec] of Object.entries(spec.tables)) {
					const records = /* @__PURE__ */ new Map();
					for (const [key, raw] of Object.entries(snapshot.tables[table] ?? {})) {
						let parsed;
						try {
							parsed = parseRecord(spec.name, table, key, () => tableSpec.valueSchema.parse(raw));
						} catch (error) {
							if (spec.invalidRecords !== "backup-and-skip" || unit.backupRecord === void 0) throw error;
							const moved = await unit.backupRecord(table, key);
							this.ctx.logger.error(`domain '${spec.name}': stored record '${key}' in table '${table}' failed schema validation; moved to '${moved}' and treated as absent. Cause: ${String(error.cause)}`);
							continue;
						}
						records.set(key, parsed);
					}
					tables.set(table, records);
				}
				const globalSpec = spec.global;
				const globalValue = globalSpec === void 0 ? void 0 : snapshot.global === null ? globalSpec.initial : parseRecord(spec.name, "", "", () => globalSpec.schema.parse(snapshot.global));
				const domain = new DomainImpl(this.ctx, spec, unit, tables, globalValue, () => {
					this.domains.delete(spec.name);
					this.reserved.delete(spec.name);
				});
				this.domains.set(spec.name, domain);
				return domain;
			} catch (error) {
				await unit.close();
				throw error;
			}
		} catch (error) {
			this.reserved.delete(spec.name);
			throw error;
		}
	}
	/**
	* Look up an open domain by name, untyped. Diagnostic surface (the package
	* invariant cross-checks change events against live domain state); typed
	* consumers hold the handle returned by {@link open}.
	* @param name - Domain name.
	* @returns the open domain runtime, or `undefined` when not open.
	*/
	get(name) {
		return this.domains.get(name);
	}
	/**
	* Close every domain still open on this facility. The unmount path for
	* consumers that never called `Domain.close()` themselves; closing is
	* idempotent, so double-closing an already-closed domain is harmless.
	* @returns resolution after every unit is released.
	*/
	async closeAll() {
		await Promise.all([...this.domains.values()].map((domain) => domain.close()));
	}
};
/** Run one zod parse, translating failure to `invalid-record` with its location. */
function parseRecord(domain, table, key, parse) {
	try {
		return parse();
	} catch (error) {
		throw new DomainError("invalid-record", `domain '${domain}': stored ${table === "" ? "global" : `record '${key}' in table '${table}'`} does not match its schema`, {
			detail: {
				table,
				key
			},
			cause: error
		});
	}
}
/**
* Mount the domain data form on the storage hub.
* @param ctx - Plugin context.
* @param config - Validated plugin config.
* @returns resolution after an already-available backend set activates the form.
*/
function apply(ctx, config) {
	const backendServices = [...new Set([config.backend, ...Object.values(config.routes ?? {})])].map(storageBackendServiceKey);
	const fiber = ctx.inject(backendServices, (domainCtx) => {
		const facility = new DomainFacility(domainCtx, config);
		domainCtx.effect(() => {
			const unmount = domainCtx.storage.mount("domain", facility);
			return async () => {
				await facility.closeAll();
				unmount();
			};
		});
		domainCtx.provide("storageDomain", facility);
	});
	return Promise.resolve(fiber).then(() => {});
}
//#endregion
export { Config, DomainError, DomainFacility, apply, defineDomain, descriptorOf, domainTable, inject, name };
