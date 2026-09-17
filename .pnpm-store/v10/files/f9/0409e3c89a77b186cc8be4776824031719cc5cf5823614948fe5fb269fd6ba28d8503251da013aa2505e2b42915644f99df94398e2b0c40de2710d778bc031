import { mkdir, open, readFile, readdir, rename, rm } from "node:fs/promises";
import z from "@deepseek-ai/schemastery";
import { StorageError, UNIT_NAME_RE, storageBackendServiceKey } from "@deepseek-ai/dsh-storage";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
//#region lib/types/atomic.js
/**
* Atomic whole-file replacement for the JSON backend.
*
* Publish protocol: write a same-directory temp file, fsync it, then
* `rename()` over the target. Rename is an atomic replace on POSIX and on
* Windows (libuv maps it to `MoveFileExW(..., MOVEFILE_REPLACE_EXISTING)`),
* and replacement is the intended semantic here — unlike the session-log
* backend's link()+unlink() no-clobber protocol, a unit file has exactly one
* writer per process and last-write-wins is correct. After the rename the
* parent directory is fsynced on POSIX so the new entry is crash-durable.
* @module @deepseek-ai/dsh-storage-json/src/atomic
*/
/**
* Durably replace `path` with `data`.
* @param path - Absolute target file path.
* @param data - Full new file content.
* @returns resolution after the replacement is crash-durable.
*/
async function writeAtomic(path, data) {
	const tmp = join(dirname(path), `.${randomUUID()}.tmp`);
	try {
		const handle = await open(tmp, "wx", 384);
		try {
			await handle.writeFile(data, "utf8");
			await handle.sync();
		} finally {
			await handle.close();
		}
		await rename(tmp, path);
		await fsyncDirectory(dirname(path));
	} catch (error) {
		await rm(tmp, { force: true });
		throw error;
	}
}
/** fsync a POSIX directory so a just-renamed entry is crash-durable. */
/* v8 ignore start -- Windows rejects O_RDONLY directory opens; POSIX coverage exercises this. */
async function fsyncDirectory(path) {
	if (process.platform === "win32") return;
	const handle = await open(path, "r");
	try {
		await handle.sync();
	} finally {
		await handle.close();
	}
}
/* v8 ignore stop */
//#endregion
//#region lib/types/format.js
/**
* On-disk JSON unit format: the file is always the current net state, kept
* human-readable (pretty-printed, stable key order from insertion) — that
* legibility is this backend's reason to exist. `single`-layout units are
* one document with a unit header; `per-record`-layout units are a directory
* with one version-stamped document per record (`<table>/<key>.json`) plus a
* `global.json` for the global slot, so a write rewrites one record instead
* of the whole unit.
* @module @deepseek-ai/dsh-storage-json/src/format
*/
/**
* Serialize a unit state to file content.
* @param name - Unit name, stamped into the header.
* @param state - Authoritative in-memory state.
* @returns pretty-printed JSON document with a trailing newline.
*/
function serialize(name, state) {
	const tables = {};
	for (const [table, records] of state.tables) tables[table] = Object.fromEntries(records);
	const document = {
		unit: {
			name,
			version: state.version
		},
		global: state.global,
		tables
	};
	return `${JSON.stringify(document, null, 2)}\n`;
}
/**
* Parse file content into unit state, validating shape and version.
* @param text - Raw file content.
* @param descriptor - Expected identity; version mismatch rejects.
* @returns the parsed state.
*/
function parse(text, descriptor) {
	let document;
	try {
		document = JSON.parse(text);
	} catch (error) {
		throw new StorageError("malformed-medium", `unit '${descriptor.name}': file is not valid JSON`, { cause: error });
	}
	if (typeof document !== "object" || document === null) throw new StorageError("malformed-medium", `unit '${descriptor.name}': file is not a JSON object`);
	const { unit, global: globalValue, tables } = document;
	if (typeof unit !== "object" || unit === null || unit["name"] !== descriptor.name || typeof unit["version"] !== "number") throw new StorageError("malformed-medium", `unit '${descriptor.name}': missing or foreign unit header`);
	const version = unit["version"];
	if (version !== descriptor.version) throw new StorageError("version-mismatch", `unit '${descriptor.name}': stored version ${version} != expected ${descriptor.version}`);
	if (typeof tables !== "object" || tables === null) throw new StorageError("malformed-medium", `unit '${descriptor.name}': tables is not an object`);
	const state = {
		version,
		global: globalValue ?? null,
		tables: /* @__PURE__ */ new Map()
	};
	for (const table of descriptor.tables) {
		const records = tables[table];
		if (records === void 0) {
			state.tables.set(table, /* @__PURE__ */ new Map());
			continue;
		}
		if (typeof records !== "object" || records === null || Array.isArray(records)) throw new StorageError("malformed-medium", `unit '${descriptor.name}': table '${table}' is not an object`);
		state.tables.set(table, new Map(Object.entries(records)));
	}
	return state;
}
/**
* Serialize one per-record document: the unit's version stamp plus the
* record value, pretty-printed like the whole-unit document.
* @param version - Unit format version, stamped into the header.
* @param value - The record value (or the global singleton value).
* @returns pretty-printed JSON document with a trailing newline.
*/
function serializeRecord(version, value) {
	return `${JSON.stringify({
		version,
		record: value
	}, null, 2)}\n`;
}
/**
* Parse one per-record document, validating its version stamp. A document
* that is malformed or stamped with an unaccepted version is FOREIGN and
* reads as absent — the per-record contract: one bad or stale record file
* must not brick the whole unit, and an unaccepted version stamp discards the
* record instead of migrating it (the whole-unit format rejects instead,
* because there is exactly one document).
* @param text - Raw per-record document content.
* @param versions - Accepted unit versions (the current one plus the
* descriptor's compatibleVersions); any other stamp discards the
* document.
* @returns the record value, or `undefined` for a foreign document.
*/
function parseRecord(text, versions) {
	let document;
	try {
		document = JSON.parse(text);
	} catch {
		return;
	}
	if (typeof document !== "object" || document === null) return void 0;
	const { version: stamped, record } = document;
	if (typeof stamped !== "number" || !versions.includes(stamped)) return void 0;
	return record;
}
//#endregion
//#region lib/types/single-unit.js
/**
* One opened JSON unit in `single` layout: the whole unit is one document at
* `<root>/<name>.json`. The in-memory state is authoritative; every write
* primitive mutates it and republishes the whole file atomically. Writes are
* NOT queued here — per the backend contract, write ordering belongs to the
* caller (the domain layer's write chain); this unit only guarantees that
* each single call publishes a complete, durable file. The `per-record`
* layout is a separate unit class in `per-record-unit.ts`.
* @module @deepseek-ai/dsh-storage-json/src/single-unit
*/
/**
* Open (load or lazily create) one `single`-layout unit under `root`: the
* unit file is `<root>/<name>.json`.
* @param descriptor - Static identity and shape of the unit.
* @param root - Absolute backend root directory.
* @param onClose - Backend callback releasing the unit's open-slot.
* @returns the opened unit.
*/
async function openSingleUnit(descriptor, root, onClose) {
	const path = join(root, `${descriptor.name}.json`);
	let text;
	try {
		text = await readFile(path, "utf8");
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
	}
	return new SingleJsonUnit(descriptor, path, text === void 0 ? {
		version: descriptor.version,
		global: null,
		tables: new Map(descriptor.tables.map((table) => [table, /* @__PURE__ */ new Map()]))
	} : parse(text, descriptor), onClose);
}
var SingleJsonUnit = class {
	descriptor;
	path;
	state;
	onClose;
	closed = false;
	/** In-flight publishes; close() drains them before releasing the unit. */
	inFlight = /* @__PURE__ */ new Set();
	constructor(descriptor, path, state, onClose) {
		this.descriptor = descriptor;
		this.path = path;
		this.state = state;
		this.onClose = onClose;
	}
	async loadAll() {
		this.assertOpen();
		const tables = {};
		for (const [table, records] of this.state.tables) tables[table] = Object.fromEntries(records);
		return {
			tables,
			global: this.state.global
		};
	}
	async putRecord(table, key, value) {
		this.assertOpen();
		const records = this.records(table);
		const hadKey = records.has(key);
		const previous = records.get(key);
		records.set(key, value);
		await this.publish().catch((error) => {
			if (hadKey) records.set(key, previous);
			else records.delete(key);
			throw error;
		});
	}
	async deleteRecord(table, key) {
		this.assertOpen();
		const records = this.records(table);
		if (!records.has(key)) return;
		const previous = records.get(key);
		records.delete(key);
		await this.publish().catch((error) => {
			records.set(key, previous);
			throw error;
		});
	}
	async setGlobal(value) {
		this.assertOpen();
		if (!this.descriptor.hasGlobal) throw new Error(`unit '${this.descriptor.name}' does not declare a global slot`);
		const previous = this.state.global;
		this.state.global = value;
		await this.publish().catch((error) => {
			this.state.global = previous;
			throw error;
		});
	}
	async close() {
		if (this.closed) {
			await Promise.allSettled(this.inFlight);
			return;
		}
		this.closed = true;
		await Promise.allSettled(this.inFlight);
		this.onClose();
	}
	assertOpen() {
		if (this.closed) throw new StorageError("closed", `unit '${this.descriptor.name}' is closed`);
	}
	records(table) {
		const records = this.state.tables.get(table);
		if (!records) throw new Error(`unit '${this.descriptor.name}' does not declare table '${table}'`);
		return records;
	}
	publish() {
		const write = writeAtomic(this.path, serialize(this.descriptor.name, this.state));
		this.inFlight.add(write);
		write.catch(() => {}).finally(() => this.inFlight.delete(write));
		return write;
	}
};
//#endregion
//#region lib/types/per-record-unit.js
/**
* One opened JSON unit in `per-record` layout: the unit is a directory at
* `dir`, holding one document per record under `<dir>/<table>/<key>.json`
* plus `global.json` for the global slot. The directory is the state — this
* unit holds NO in-memory state of its own: `loadAll` re-reads the tree and
* every write is one durable file operation. The domain layer owns the live
* in-memory tables (seeded by the open-time `loadAll`) and serializes writes
* through its write chain, so this unit never mutates memory and needs no
* rollback — a failed write simply leaves both the file and the domain's
* memory unchanged.
*
* Per-record contract: a record document that is malformed or stamped with a
* version outside the accepted set (the descriptor's current version plus
* its `compatibleVersions`) reads as an absent record — one bad or stale
* file never bricks the whole unit, and an unaccepted version stamp discards
* the record instead of migrating it. Record keys become path segments, so
* they must be path-safe (`[a-zA-Z0-9_-]+`); an unsafe key rejects at write.
*
* Legacy bootstrap: when the new tree has no document path, a legacy
* whole-unit file `<root>/<name>.json` (the pre-per-record layout) seeds
* per-record documents, provided its stored unit version is in the accepted
* set — a legacy file stamped with any other version is left alone and reads
* as the empty unit. Any new document path, including one whose contents are
* unreadable or stale, suppresses the bootstrap for the whole unit. The
* legacy file is never changed or deleted.
* @module @deepseek-ai/dsh-storage-json/src/per-record-unit
*/
/** Keys become path segments in this layout; this set is path-safe on every OS. */
const SAFE_KEY_RE = /^[a-zA-Z0-9_-]+$/;
/**
* Open one `per-record`-layout unit under `root`: the unit directory is
* `<root>/<name>/`. Loads lazily on the first `loadAll` — this unit holds no
* state, so opening touches nothing on the medium.
* @param descriptor - Static identity and shape of the unit.
* @param root - Absolute backend root directory.
* @param onClose - Backend callback releasing the unit's open-slot.
* @returns the opened unit.
*/
async function openPerRecordUnit(descriptor, root, onClose) {
	return new PerRecordJsonUnit(descriptor, join(root, descriptor.name), onClose);
}
/**
* Read every record document under the unit directory: each declared table's
* `<key>.json` files plus `global.json`. A missing directory is the empty
* unit (materialization defers to the first write); a foreign document
* (missing, malformed, or stamped with an unaccepted version) reads as an absent
* record, per the per-record contract.
* @param descriptor - Static identity and shape of the unit.
* @param dir - Absolute unit directory path.
* @returns the authoritative state reconstructed from the tree.
*/
async function loadPerRecordState(descriptor, dir) {
	const versions = acceptedStamps(descriptor);
	const state = {
		version: descriptor.version,
		global: null,
		tables: new Map(descriptor.tables.map((table) => [table, /* @__PURE__ */ new Map()]))
	};
	let entries;
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
	}
	if (!(entries === void 0 ? false : (await Promise.all(entries.map(async (entry) => {
		if (entry.isDirectory()) {
			const records = state.tables.get(entry.name);
			if (records !== void 0) return loadTableRecords(records, versions, join(dir, entry.name));
		}
		if (entry.name === "global.json" && descriptor.hasGlobal) {
			const global = await readRecord(join(dir, entry.name), versions);
			if (global !== void 0) state.global = global;
			return true;
		}
		return false;
	}))).some(Boolean))) await bootstrapLegacyUnit(descriptor, dir, state);
	return state;
}
/** The version stamps this unit reads as its own: current plus declared compatible versions. */
function acceptedStamps(descriptor) {
	return [descriptor.version, ...descriptor.compatibleVersions ?? []];
}
/**
* Bootstrap an empty per-record tree from a legacy whole-unit file
* (`<root>/<name>.json`, the pre-per-record layout). Every declared-table
* record is copied into a current-version document, while the legacy file is
* retained unchanged. A missing, foreign (another unit's name), malformed,
* or non-unit legacy file is left alone, and so is one whose stored unit
* version is outside the accepted set — migrating records the owner never
* vouched for would stamp them with the current version and turn a
* discardable stale cache into schema failures at the domain layer. Other
* read failures propagate.
* @param descriptor - Static identity and shape of the unit.
* @param dir - The per-record unit directory (`<root>/<name>`).
* @param state - The empty tree state; bootstrapped records are added.
*/
async function bootstrapLegacyUnit(descriptor, dir, state) {
	const legacyPath = join(dirname(dir), `${descriptor.name}.json`);
	let text;
	try {
		text = await readFile(legacyPath, "utf8");
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
		return;
	}
	let document;
	try {
		document = JSON.parse(text);
	} catch {
		return;
	}
	if (document.unit?.name !== descriptor.name) return;
	const stamped = document.unit.version;
	if (typeof stamped !== "number" || !acceptedStamps(descriptor).includes(stamped)) return;
	const tables = document.tables;
	if (typeof tables !== "object" || tables === null) return;
	const recordsByTable = tables;
	for (const [table, records] of Object.entries(recordsByTable)) {
		const target = state.tables.get(table);
		if (target === void 0) continue;
		for (const [key, value] of Object.entries(records)) {
			const path = join(dir, table, `${key}.json`);
			await mkdir(dirname(path), {
				recursive: true,
				mode: 448
			});
			await writeAtomic(path, serializeRecord(descriptor.version, value));
			target.set(key, value);
		}
	}
}
/**
* Read one declared table's record documents into `records`.
* @returns whether the directory contains any `.json` document path,
* independently of key safety, readability, or stored version.
*/
async function loadTableRecords(records, versions, dir) {
	const files = await readdir(dir, { withFileTypes: true });
	const hasDocuments = files.some((file) => file.name.endsWith(".json"));
	const loaded = await Promise.all(files.map(async (file) => {
		if (!file.name.endsWith(".json")) return;
		const key = file.name.slice(0, -5);
		if (!SAFE_KEY_RE.test(key)) return;
		const record = await readRecord(join(dir, file.name), versions);
		if (record !== void 0) return [key, record];
	}));
	for (const record of loaded) if (record !== void 0) records.set(...record);
	return hasDocuments;
}
/** Read one record document; a foreign (unreadable or stale) one reads as absent. */
async function readRecord(path, versions) {
	try {
		return parseRecord(await readFile(path, "utf8"), versions);
	} catch {
		return;
	}
}
/**
* One opened `per-record`-layout unit. Stateless by design: the directory is
* the medium, the domain layer owns the live memory, and each method here is
* a single durable file operation. Write ordering belongs to the caller (the
* domain layer's write chain), exactly like the `single`-layout unit.
*/
var PerRecordJsonUnit = class {
	descriptor;
	dir;
	onClose;
	closed = false;
	/** In-flight durable writes; close() drains them before releasing the unit. */
	inFlight = /* @__PURE__ */ new Set();
	constructor(descriptor, dir, onClose) {
		this.descriptor = descriptor;
		this.dir = dir;
		this.onClose = onClose;
	}
	/** Re-read the tree: the directory is the authoritative state. */
	async loadAll() {
		this.assertOpen();
		const state = await loadPerRecordState(this.descriptor, this.dir);
		const tables = {};
		for (const [table, records] of state.tables) tables[table] = Object.fromEntries(records);
		return {
			tables,
			global: state.global
		};
	}
	/** Durably replace one record: its own document, atomically. */
	async putRecord(table, key, value) {
		this.assertOpen();
		assertSafeKey(this.descriptor.name, key);
		await this.tracked(this.writeDocument(join(this.tableDir(table), `${key}.json`), value));
	}
	/** Durably delete one record. Idempotent: a missing key is a no-op. */
	async deleteRecord(table, key) {
		this.assertOpen();
		assertSafeKey(this.descriptor.name, key);
		await this.tracked(rm(join(this.tableDir(table), `${key}.json`), { force: true }));
	}
	/**
	* Move one record's document aside as `<key>.json.bak.<YYYYMMDDHHmm>`. The
	* moved file no longer ends in `.json`, so every later read ignores it; the
	* bytes stay on disk for inspection. A same-minute backup of the same
	* key overwrites the previous backup (the newer bytes are the ones worth
	* keeping).
	*/
	async backupRecord(table, key) {
		this.assertOpen();
		assertSafeKey(this.descriptor.name, key);
		const path = join(this.tableDir(table), `${key}.json`);
		const moved = `${path}.bak.${backupStamp(/* @__PURE__ */ new Date())}`;
		await this.tracked(rename(path, moved));
		return moved;
	}
	/** Durably replace the global singleton. Only valid when declared. */
	async setGlobal(value) {
		this.assertOpen();
		if (!this.descriptor.hasGlobal) throw new Error(`unit '${this.descriptor.name}' does not declare a global slot`);
		await this.tracked(this.writeDocument(join(this.dir, "global.json"), value));
	}
	/** Drain in-flight writes and release the unit. Idempotent. */
	async close() {
		if (this.closed) {
			await Promise.allSettled(this.inFlight);
			return;
		}
		this.closed = true;
		await Promise.allSettled(this.inFlight);
		this.onClose();
	}
	assertOpen() {
		if (this.closed) throw new StorageError("closed", `unit '${this.descriptor.name}' is closed`);
	}
	/** Resolve a declared table's directory; an undeclared table is a caller bug and throws. */
	tableDir(table) {
		if (!this.descriptor.tables.includes(table)) throw new Error(`unit '${this.descriptor.name}' does not declare table '${table}'`);
		return join(this.dir, table);
	}
	/** Durably replace one document, creating its parent directory. */
	writeDocument(path, value) {
		return (async () => {
			await mkdir(dirname(path), {
				recursive: true,
				mode: 448
			});
			await writeAtomic(path, serializeRecord(this.descriptor.version, value));
		})();
	}
	/** Track one durable write so close() drains it. */
	tracked(write) {
		this.inFlight.add(write);
		write.catch(() => {}).finally(() => this.inFlight.delete(write));
		return write;
	}
};
/** Local-time `YYYYMMDDHHmm` suffix for backed-up documents. */
function backupStamp(now) {
	const pad = (value) => String(value).padStart(2, "0");
	return `${String(now.getFullYear())}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
}
/** Reject a record key that would be unsafe as a path segment. */
function assertSafeKey(unit, key) {
	if (!SAFE_KEY_RE.test(key)) throw new Error(`unit '${unit}': per-record key '${key}' is not path-safe (must match ${SAFE_KEY_RE})`);
}
//#endregion
//#region lib/types/index.js
/**
* JSON storage backend: one human-readable document per unit under a
* configured root — a whole-unit file (`single` layout) or one document per
* record (`per-record` layout), published by atomic rewrite. Registers as
* backend `json` on the storage hub.
* @module @deepseek-ai/dsh-storage-json
*/
/** Cordis plugin name. */
const name = "storage-json";
/** The hub must exist before the backend can register. */
const inject = ["storage"];
/** Config schema. */
const Config = z.object({ root: z.string().required() });
/** JSON backend: owns the file-tree root and serves the `kv` facet. */
var JsonStorageBackend = class {
	root;
	open = /* @__PURE__ */ new Map();
	opening = /* @__PURE__ */ new Map();
	closed = false;
	constructor(root) {
		this.root = root;
	}
	kv = { open: async (descriptor) => {
		if (this.closed) throw new StorageError("closed", "json backend is closed");
		validateDescriptor(descriptor);
		if (this.open.has(descriptor.name) || this.opening.has(descriptor.name)) throw new Error(`unit '${descriptor.name}' is already open; a unit has exactly one live handle`);
		const opening = this.openUnit(descriptor);
		this.opening.set(descriptor.name, opening);
		return opening.finally(() => this.opening.delete(descriptor.name));
	} };
	async openUnit(descriptor) {
		await mkdir(this.root, {
			recursive: true,
			mode: 448
		});
		const onClose = () => this.open.delete(descriptor.name);
		const unit = descriptor.layout === "per-record" ? await openPerRecordUnit(descriptor, this.root, onClose) : await openSingleUnit(descriptor, this.root, onClose);
		if (this.closed) {
			await unit.close();
			throw new StorageError("closed", "json backend is closed");
		}
		this.open.set(descriptor.name, unit);
		return unit;
	}
	async close() {
		if (!this.closed) this.closed = true;
		await Promise.allSettled([...this.opening.values()]);
		for (const unit of [...this.open.values()]) await unit.close();
	}
};
function validateDescriptor(descriptor) {
	if (!UNIT_NAME_RE.test(descriptor.name)) throw new StorageError("malformed-medium", `invalid unit name '${descriptor.name}'`);
	for (const table of descriptor.tables) if (!UNIT_NAME_RE.test(table)) throw new StorageError("malformed-medium", `invalid table name '${table}' in unit '${descriptor.name}'`);
}
/**
* Register the `json` backend on the storage hub.
* @param ctx - Plugin context.
* @param config - Validated configuration.
*/
function apply(ctx, config) {
	const backend = new JsonStorageBackend(config.root);
	ctx.effect(() => {
		const unregister = ctx.storage.backend.register("json", backend);
		return async () => {
			unregister();
			await backend.close();
		};
	});
	ctx.provide(storageBackendServiceKey("json"), backend);
}
//#endregion
export { Config, JsonStorageBackend, apply, inject, name };
