import { Service } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import { watch } from "chokidar";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { Document, parseDocument } from "yaml";
import { withFileLock, writeFileAtomic } from "@deepseek-ai/dsh-atomic-write";
import { canonicalizeWatchPath, resolveDshHome } from "@deepseek-ai/dsh-home-paths";
import { SettingsProvider } from "@deepseek-ai/dsh-settings";
import { deepEqualJson } from "@deepseek-ai/dsh-util-values";
//#region lib/types/index.js
/**
* File-backed settings provider. One YAML or JSON document under the user's
* harness home carries every namespace section; external edits hot-publish
* through the seam, and every write re-reads the document under a
* cross-process writer lock before patching it as a comment-preserving
* leaf-level diff.
* @module @deepseek-ai/dsh-settings-file
*/
const FORMATS = {
	".yaml": "yaml",
	".yml": "yaml",
	".json": "json"
};
/**
* Resolve the runtime spec from plugin config: an explicit `path` wins,
* otherwise the document lives at `<harness home>/settings.yaml`.
* @param config - raw plugin config.
* @returns the resolved file location, format, and watch behavior.
*/
function resolveSpec(config) {
	const filename = resolve(config.path ?? join(resolveDshHome(config.dshHome), "settings.yaml"));
	const format = FORMATS[extname(filename)];
	if (format === void 0) throw new Error(`settings-file: extension "${extname(filename)}" is not supported (use .yaml, .yml, or .json)`);
	return {
		filename,
		format,
		watch: config.watch ?? true,
		debounceMs: config.debounceMs ?? 100
	};
}
/** Whether a parsed YAML value is a map for diffing purposes. */
function isMapLike(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
* Apply the difference between one node's stored and next value as minimal
* `setIn`/`deleteIn` edits, recursing through maps, so every untouched node —
* and the key node of every changed pair — keeps its comments, anchors, and
* formatting. Non-map values (arrays and scalars) replace wholesale when
* unequal, taking any comments inside them along.
*/
function patchNode(document, path, current, next) {
	if (isMapLike(current) && isMapLike(next)) {
		for (const key of Object.keys(current)) if (!(key in next)) document.deleteIn([...path, key]);
		for (const [key, value] of Object.entries(next)) patchNode(document, [...path, key], current[key], value);
		return;
	}
	if (!deepEqualJson(current, next)) document.setIn([...path], next);
}
/** Whether a filesystem error means absence; every non-ENOENT failure must surface. */
function isENOENT(error) {
	return error?.code === "ENOENT";
}
/** Whether an exclusive file create found an existing document. */
function isEEXIST(error) {
	return error?.code === "EEXIST";
}
/** File-backed settings provider (`settings.yaml`/`.json`). */
var FileSettingsProvider = class extends SettingsProvider {
	config;
	static Config = z.object({
		path: z.string(),
		dshHome: z.string(),
		watch: z.boolean().default(true),
		debounceMs: z.number().min(0).default(100)
	});
	spec;
	/**
	* Raw text of the last successfully parsed or persisted document;
	* `undefined` while the file is absent. Watcher events whose content equals
	* this cache are no-ops, which is also the self-write suppression.
	*/
	text;
	/**
	* Single exclusive operation chain: watcher reloads and document writes run
	* one at a time in queue order (settled tail), so a write can never render
	* from text a concurrent reload is busy replacing, and a reload can never
	* read a half-committed write.
	*/
	operations = Promise.resolve();
	/** Set at dispose: refuse new watcher events and let in-flight work no-op. */
	closed = false;
	/** Opaque read of {@link closed}: control flow cannot narrow it across awaits. */
	isClosed() {
		return this.closed;
	}
	constructor(ctx, config) {
		super(ctx);
		this.config = config;
		this.spec = resolveSpec(config);
	}
	/** The local document is always writable through {@link SettingsProvider.update}. */
	get writable() {
		return true;
	}
	/** The resolved YAML/JSON document path exposed to local configuration surfaces. */
	get documentPath() {
		return this.spec.filename;
	}
	/** Materialize an absent owner-only document, then return its resolved path. */
	prepareDocument() {
		return this.enqueue(async () => {
			await mkdir(dirname(this.spec.filename), {
				recursive: true,
				mode: 448
			});
			await withFileLock(this.spec.filename, async () => {
				try {
					await writeFile(this.spec.filename, "", {
						flag: "wx",
						mode: 384
					});
				} catch (error) {
					if (isEEXIST(error)) return;
					throw error;
				}
				this.text = "";
				if (!this.isClosed()) this.publish({});
			});
			return this.spec.filename;
		});
	}
	async load() {
		let text;
		try {
			text = await readFile(this.spec.filename, "utf8");
		} catch (error) {
			if (!isENOENT(error)) throw error;
			this.text = void 0;
			return {};
		}
		const doc = this.parse(text);
		this.text = text;
		return doc;
	}
	persist(ns, section) {
		return this.enqueue(() => this.persistSection(ns, section));
	}
	/** Queue one exclusive document operation behind every earlier one. */
	enqueue(operation) {
		const task = this.operations.then(operation);
		this.operations = task.then(() => void 0, () => void 0);
		return task;
	}
	/** Queue a reload; only an invariant violation escaping a commit can reject it. */
	queueRefresh() {
		this.enqueue(() => this.refresh()).catch((error) => {
			this.ctx.logger.error("settings-file: reload commit failed at %s", this.spec.filename);
			this.ctx.logger.error(error);
		});
	}
	async persistSection(ns, section) {
		await mkdir(dirname(this.spec.filename), {
			recursive: true,
			mode: 448
		});
		await withFileLock(this.spec.filename, async () => {
			await this.reconcileFromDisk();
			const output = this.spec.format === "yaml" ? this.renderYaml(ns, section) : this.renderJson(ns, section);
			await writeFileAtomic(this.spec.filename, output, {
				mode: 384,
				dirMode: 448
			});
			this.text = output;
		});
	}
	async *[Service.init]() {
		yield* super[Service.init]();
		const watcher = this.spec.watch ? watch(await canonicalizeWatchPath(this.spec.filename), {
			ignoreInitial: true,
			awaitWriteFinish: {
				stabilityThreshold: this.spec.debounceMs,
				pollInterval: Math.max(1, Math.min(this.spec.debounceMs, 10))
			}
		}) : void 0;
		if (watcher !== void 0) {
			watcher.on("all", () => {
				if (this.closed) return;
				this.queueRefresh();
			});
			watcher.on("ready", () => {
				if (this.closed) return;
				this.queueRefresh();
			});
			watcher.on("error", (error) => {
				this.ctx.logger.warn("settings-file: watcher error on %s", this.spec.filename);
				this.ctx.logger.warn(error);
			});
		}
		yield async () => {
			this.closed = true;
			await watcher?.close();
			await this.operations;
		};
	}
	/** Parse one document text into raw sections, failing on a non-map root. */
	parse(text) {
		let root;
		if (this.spec.format === "yaml") {
			const document = parseDocument(text, { prettyErrors: true });
			if (document.errors.length > 0) throw new Error(`settings-file: invalid document at ${this.spec.filename}: ${document.errors.map((error) => {
				const at = error.linePos?.[0];
				/* v8 ignore next -- `prettyErrors` populates linePos on every error; the guard answers its optional type */
				return `${error.code}${at === void 0 ? "" : ` at line ${String(at.line)}, column ${String(at.col)}`}`;
			}).join("; ")}`);
			root = document.toJS() ?? {};
		} else root = text.trim().length === 0 ? {} : JSON.parse(text);
		if (typeof root !== "object" || root === null || Array.isArray(root)) throw new TypeError(`settings-file: ${this.spec.filename} must be a map of namespace sections`);
		return root;
	}
	/**
	* Re-read the document after a watcher event. Unchanged content (including
	* this provider's own writes) is a no-op; an unreadable or unparsable
	* document keeps the last good sections and warns — a live hot-reload must
	* never take the process down. An invariant violation escaping a commit is
	* not a reload failure and propagates to the queue's error surface.
	*/
	async refresh() {
		if (this.closed) return;
		try {
			await this.reconcileFromDisk();
		} catch (error) {
			if (error?.code === "INVARIANT") throw error;
			this.ctx.logger.warn("settings-file: reload failed at %s; keeping the last good document", this.spec.filename);
			this.ctx.logger.warn(error);
		}
	}
	/**
	* Compare the on-disk text against the cache and publish any difference
	* into the seam. Absence publishes the empty document; an unreadable or
	* unparsable file throws, so each caller picks its policy — a reload warns
	* and keeps the last good document, a write fails loud.
	*/
	async reconcileFromDisk() {
		let text;
		try {
			text = await readFile(this.spec.filename, "utf8");
		} catch (error) {
			if (!isENOENT(error)) throw error;
			text = void 0;
		}
		if (text === this.text || this.isClosed()) return;
		if (text === void 0) {
			this.text = void 0;
			this.publish({});
			return;
		}
		const doc = this.parse(text);
		this.text = text;
		this.publish(doc);
	}
	/**
	* Render the next YAML text by patching one namespace in the
	* comment-preserving document. The next section lands as a leaf-level diff
	* against the stored one — only changed values set, only removed keys
	* delete — so comments inside the section survive edits to their siblings,
	* not just comments outside it.
	*/
	renderYaml(ns, section) {
		if (this.text === void 0) return new Document({ [ns]: section }).toString();
		const document = parseDocument(this.text);
		const root = document.toJS();
		patchNode(document, [ns], isMapLike(root) ? root[ns] : void 0, section);
		return document.toString();
	}
	/** Render the next JSON text by replacing one namespace key. */
	renderJson(ns, section) {
		const root = this.text === void 0 ? {} : this.parse(this.text);
		root[ns] = section;
		return `${JSON.stringify(root, null, 2)}\n`;
	}
};
//#endregion
export { FileSettingsProvider, FileSettingsProvider as default, resolveSpec };
