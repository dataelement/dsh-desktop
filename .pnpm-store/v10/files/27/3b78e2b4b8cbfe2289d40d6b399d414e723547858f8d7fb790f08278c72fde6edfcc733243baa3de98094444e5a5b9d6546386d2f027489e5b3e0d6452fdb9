import { EntryGroup, EntryTree, isJsExpr } from "@deepseek-ai/cordis-plugin-loader";
import { Service } from "@deepseek-ai/cordis";
import { extname } from "node:path";
import { access, constants, readFile, rename, writeFile } from "node:fs/promises";
import { setTimeout as setTimeout$1 } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as yaml from "js-yaml";
//#region lib/types/index.js
var __rewriteRelativeImportExtension = function(path, preserveJsx) {
	if (typeof path === "string" && /^\.\.?\//.test(path)) return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function(m, tsx, d, ext, cm) {
		return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : d + ext + "." + cm.toLowerCase() + "js";
	});
	return path;
};
const JsExpr = new yaml.Type("tag:yaml.org,2002:js", {
	kind: "scalar",
	resolve: (data) => typeof data === "string",
	construct: (data) => ({ __jsExpr: data }),
	predicate: isJsExpr,
	represent: (data) => data["__jsExpr"]
});
/**
* The entry-list YAML dialect: `!!js` scalars round-trip as expression nodes
* the Loader evaluates at entry activation. Exported so config tooling
* (`dsh --dump-config`) parses and prints exactly the dialect this include
* mounts.
*/
const entryListSchema = yaml.JSON_SCHEMA.extend(JsExpr);
const schema = entryListSchema;
const writable = {
	".json": "application/json",
	".yaml": "application/yaml",
	".yml": "application/yaml"
};
const supported = new Set(Object.keys(writable));
const WRITE_RETRY_LIMIT = 10;
const WRITE_RETRY_DELAY_MS = 50;
function retryableWriteError(error) {
	const code = error?.code;
	return code === "EACCES" || code === "EBUSY" || code === "EPERM";
}
/**
* Apply patch lists to an entry list — THE patch semantics of this include,
* shared by mounting (`applyPatches`) and offline config tooling
* (`dsh --dump-config`) so a dump can never drift from what boots. The input
* is never mutated and the result is always detached from it (even with no
* patches): patching or mounting shared entry objects would bake earlier
* values into the cached parse, so repeated application (config hot-reloads)
* could never revert a removed or changed patch. Inserted entries are indexed
* as they are added, so a later patch in the same list can target a row an
* earlier patch inserted. A patch that matches nothing warns and is skipped.
* @param data - the parsed entry list (JSON-safe plain data).
* @param patches - the patch list to apply, in order.
* @param warn - sink for skipped-patch diagnostics (printf-style, `%C` = code).
* @returns a detached entry list with every applicable patch applied.
*/
function applyEntryPatches(data, patches, warn) {
	data = structuredClone(data);
	if (!patches?.length) return data;
	const entryMap = /* @__PURE__ */ new Map();
	const buildMap = (entries) => {
		for (const entry of entries) {
			if (entry.id) entryMap.set(entry.id, entry);
			if (entry.group && Array.isArray(entry.config)) buildMap(entry.config);
		}
	};
	buildMap(data);
	for (const patch of patches) {
		const { id, insert, name, ...overrides } = patch;
		if (insert) {
			if (id) {
				const target = entryMap.get(id);
				if (!target) {
					warn("patch insert: entry %C not found", id);
					continue;
				}
				if (!target.group) {
					warn("patch insert: entry %C is not a group", id);
					continue;
				}
				if (!Array.isArray(target.config)) target.config = [];
				target.config.push(...insert);
			} else data.push(...insert);
			buildMap(insert);
			continue;
		}
		if (!id) {
			warn("patch: id is required for non-insert patches");
			continue;
		}
		const target = entryMap.get(id);
		if (!target) {
			warn("patch: entry %C not found", id);
			continue;
		}
		if (name && name !== target.name) {
			warn("patch: name mismatch for %C (expected %C, got %C), skipping", id, target.name, name);
			continue;
		}
		for (const [key, value] of Object.entries(overrides)) {
			if (key === "id") continue;
			target[key] = value;
		}
	}
	return data;
}
var ConfigFileError = class extends Error {
	stage;
	constructor(stage, path, cause) {
		super(`failed to ${stage} config file ${path}`, { cause });
		this.stage = stage;
		this.name = "ConfigFileError";
	}
};
/** Loader entry tree backed by a YAML or JSON file. */
var Include = class extends EntryTree {
	config;
	static inject = ["loader"];
	static [EntryGroup.key] = true;
	filename;
	type;
	readonly;
	content;
	data;
	writeTask;
	pendingWrite;
	writeQueue = Promise.resolve();
	applyQueue = Promise.resolve();
	constructor(ctx, config) {
		super(ctx);
		this.config = config;
		this.enableLogs = config.enableLogs ?? ctx.fiber.entry?.parent.tree.enableLogs ?? false;
		this.filename = fileURLToPath(new URL(this.config.path, this.ctx.baseUrl));
		const ext = extname(this.filename);
		if (!supported.has(ext)) throw new Error(`extension "${ext}" not supported`);
		this.type = writable[ext];
		this.readonly = !this.type;
		this.ctx.baseUrl = new URL(".", pathToFileURL(this.filename)).href;
		ctx.on("internal/update", async (config, _, next) => {
			if (config.path !== this.config.path) return next();
			await this.enqueue(async () => {
				const data = this.applyPatches(this.data, config.patches);
				await this.root.update(data);
				this.config = config;
			});
		});
	}
	/**
	* Serialize one child-tree mutation behind every earlier one. The group's
	* transactional `update` is not reentrant: two concurrent applies (the init
	* apply racing an HMR-triggered refresh from the watcher's initial scan)
	* interleave create and rollback on the same entries and strand the include
	* fiber without settling, so every apply path funnels through this queue.
	* A predecessor's failure is its own caller's outcome and never gates the
	* next task.
	*/
	enqueue(task) {
		const run = this.applyQueue.then(task, task);
		this.applyQueue = run.then(() => {}, () => {});
		return run;
	}
	async checkAccess() {
		if (!this.type) return;
		try {
			await access(this.filename, constants.W_OK);
		} catch {
			this.readonly = true;
		}
	}
	async read(forced = false) {
		let content;
		try {
			content = await readFile(this.filename, "utf8");
		} catch (error) {
			throw new ConfigFileError("read", this.filename, error);
		}
		if (!forced && this.content === content) return;
		let data;
		try {
			if (this.type === "application/yaml") data = yaml.load(content, { schema });
			else if (this.type === "application/json") data = JSON.parse(content);
			else {
				const module = await import(__rewriteRelativeImportExtension(
					/* @vite-ignore */
					this.filename
				));
				data = module.default || module;
			}
		} catch (error) {
			throw new ConfigFileError("parse", this.filename, error);
		}
		if (!Array.isArray(data)) throw new ConfigFileError("validate", this.filename, /* @__PURE__ */ new TypeError("config file must be a top-level array"));
		return {
			content,
			data
		};
	}
	applyPatches(data, patches) {
		return applyEntryPatches(data, patches, (message, ...args) => {
			this.ctx.root.logger?.("loader").warn(message, ...args);
		});
	}
	async *[Service.init]() {
		let candidate;
		try {
			candidate = await this.read(true);
		} catch (error) {
			if (!(error instanceof ConfigFileError) || error.stage !== "read" || error.cause?.code !== "ENOENT") throw error;
			if (this.config.initial) {
				await this._writeFile(this.config.initial);
				candidate = await this.read(true);
			} else throw new Error(`config file not found: ${this.filename}`);
		}
		yield () => this.stop();
		await this.apply(candidate);
	}
	async stop() {
		await this.root.stop();
		await this.flushWrite();
	}
	/**
	* Re-read the file and transactionally refresh child entries when content changed.
	* @returns a promise resolving after the new tree commits, or immediately when unchanged.
	* @throws when reading, parsing, validation, application, or rollback fails; the last good tree remains active when rollback succeeds.
	*/
	async refresh() {
		await this.enqueue(async () => {
			const candidate = await this.read();
			if (!candidate) return;
			await this._apply(candidate);
		});
	}
	apply(candidate) {
		return this.enqueue(() => this._apply(candidate));
	}
	async _apply(candidate) {
		const data = this.applyPatches(candidate.data, this.config.patches);
		await this.root.update(data);
		this.content = candidate.content;
		this.data = candidate.data;
		await this.checkAccess();
	}
	async _writeFile(config) {
		if (this.readonly) throw new Error(`cannot overwrite readonly config`);
		if (this.type === "application/yaml") this.content = yaml.dump(config, { schema });
		else if (this.type === "application/json") this.content = JSON.stringify(config, null, 2);
		await writeFile(this.filename + ".tmp", this.content);
		for (let retry = 0;; retry++) try {
			await rename(this.filename + ".tmp", this.filename);
			return;
		} catch (error) {
			if (!retryableWriteError(error) || retry >= WRITE_RETRY_LIMIT) throw error;
			await setTimeout$1((retry + 1) * WRITE_RETRY_DELAY_MS);
		}
	}
	writeFile(config) {
		clearTimeout(this.writeTask);
		this.pendingWrite = config;
		this.writeTask = setTimeout(() => {
			this.flushWrite();
		}, 0);
	}
	flushWrite() {
		clearTimeout(this.writeTask);
		this.writeTask = void 0;
		const config = this.pendingWrite;
		this.pendingWrite = void 0;
		if (config === void 0) return this.writeQueue;
		const run = this.writeQueue.then(() => this._writeFile(config), () => this._writeFile(config));
		this.writeQueue = run;
		run.catch((error) => {
			this.ctx.root.logger?.("loader").warn("failed to write config file %C", this.filename);
			this.ctx.root.logger?.("loader").warn(error);
		});
		return run;
	}
	/** Schedule a write of the current root entry data. */
	write() {
		this.context.emit("loader/config-update");
		return this.writeFile(this.root.data);
	}
};
//#endregion
export { Include, Include as default, applyEntryPatches, entryListSchema };
