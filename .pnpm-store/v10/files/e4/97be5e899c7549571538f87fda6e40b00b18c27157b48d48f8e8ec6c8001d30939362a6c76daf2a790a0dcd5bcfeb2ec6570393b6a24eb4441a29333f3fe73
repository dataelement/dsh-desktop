import { Service } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import { watch } from "chokidar";
import { mkdir, readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { Document, isMap, isScalar, parseDocument } from "yaml";
import { withFileLock, writeFileAtomic } from "@deepseek-ai/dsh-atomic-write";
import { canonicalizeWatchPath, resolveDshHome } from "@deepseek-ai/dsh-home-paths";
import { launchEnvironmentOf } from "@deepseek-ai/dsh-launch-environment";
import { CredentialProvider, credentialRef, parseCredentialKey } from "@deepseek-ai/dsh-credentials";
//#region lib/types/index.js
/**
* File-backed credentials provider over `$DSH_HOME/.credentials.yaml`, layered
* against the environment by how much each layer is trusted:
*
* ```text
* inherited process environment      (read-only, wins)
* > $DSH_HOME/.credentials.yaml      (provider-managed, writable)
* > <invocation cwd>/.env            (read-only fallback)
* > $DSH_HOME/.env                   (read-only fallback)
* ```
*
* The inherited environment wins because `DEEPSEEK_API_KEY=… dsh`, a CI
* secret, or a container `-e` is this run's explicit intent; it cannot be
* edited from inside, so it must be *visibly* read-only rather than silently
* shadow writes. Everything below it loses to the managed store, so a key the
* Models page writes takes effect immediately even when an older key sits in
* the user's `.env`.
*
* The invoking project may supply a key, because the product trusts the
* project it is launched in. It ranks below the managed store, so a key stored
* through the Models page is never displaced by one a checkout happens to carry.
*
* The file is the provider-managed writable source: every write re-reads the
* document under a cross-process writer lock before patching only its own key
* — comments and the formatting of every untouched entry survive — external
* edits hot-publish through the seam, and each reload replaces the snapshot
* wholesale so a deleted entry never lingers in memory.
*
* The document holds nothing but credentials, which is why it is a strict
* `CredentialRef`-to-string mapping rather than a dotenv file: a store the
* Harness owns and never materializes into the environment cannot also serve
* as the user's environment layer; a store that doubled as the environment
* layer would shadow non-secret entries behind its precedence, making them
* silently unreachable.
* @module @deepseek-ai/dsh-credentials-local
*/
/** Basename of the credentials document inside the harness home. */
const CREDENTIALS_FILENAME = ".credentials.yaml";
/**
* Resolve the runtime spec from plugin config: an explicit `path` wins,
* otherwise the document lives at `<harness home>/.credentials.yaml`.
* @param config - raw plugin config.
* @returns the resolved file location and watch behavior.
*/
function resolveSpec(config) {
	return {
		filename: resolve(config.path ?? join(resolveDshHome(config.dshHome), ".credentials.yaml")),
		watch: config.watch ?? true,
		debounceMs: config.debounceMs ?? 100
	};
}
/** Permission bits outside the owner; a credentials document must have none of them. */
const GROUP_OTHER_BITS = 63;
/**
* How long a record write waits for the cross-process writer lock. A record
* mutation runs its caller's decision while holding the lock, and for the
* operation this half exists to serve — an owner refreshing an expired token —
* that decision includes a network round trip. The file-work default would
* fail every other writer of this document for its duration. A contender's
* wait is sized by the longest holder it can meet, and refs and records share
* one file and one lock, so every writer of this document — reference writes
* and record deletes included — waits this long, not only the mutation that
* holds it. Like the retry cadence in `dsh-atomic-write`, this is a
* robustness bound of the write protocol rather than a deployment choice: it
* is sized by what a provider request costs, which no deployment varies.
*/
const DOCUMENT_LOCK_WAIT_MS = 3e4;
/**
* Reject a credentials document other OS users can read, before its contents
* are read at all. The provider creates and replaces the file at `0600`, but a
* hand-written or externally generated one carries whatever umask produced it,
* and silently serving secrets out of a world-readable file would make the
* mode the provider promises meaningless.
*
* POSIX only: Windows has no mode to inspect — its ACLs are not expressible
* here — so the check is skipped rather than faked, and the file's protection
* there is whatever the create and replace APIs express.
* @param filename - absolute path of the document.
* @throws when the path hierarchy is invalid or the file exists with group or other permission bits set.
*/
async function assertOwnerOnly(filename) {
	let mode;
	try {
		mode = (await stat(filename)).mode;
	} catch (error) {
		if (!isENOENT(error)) throw error;
		await canonicalizeWatchPath(filename);
		return;
	}
	/* v8 ignore next -- POSIX coverage cannot take the Windows peer; native Windows coverage does. */
	if (process.platform === "win32") return;
	if ((mode & GROUP_OTHER_BITS) === 0) return;
	throw new Error(`credentials-local: ${filename} is readable beyond its owner (mode ${(mode & 511).toString(8)}); run "chmod 600 ${filename}" before starting again`);
	/* v8 ignore stop */
}
/** Whether a filesystem error means absence; every non-ENOENT failure must surface. */
function isENOENT(error) {
	return error?.code === "ENOENT";
}
/**
* Describe one YAML parse failure without quoting the source. The parser's own
* message embeds the offending line, which here holds a secret.
* @param error - the parser's error.
* @returns the error code with its line and column.
*/
function describeYamlError(error) {
	const at = error.linePos?.[0];
	/* v8 ignore next -- `prettyErrors` populates linePos on every error; the guard answers its optional type */
	const where = at === void 0 ? "" : ` at line ${String(at.line)}, column ${String(at.col)}`;
	return `${error.code}${where}`;
}
/** The document layout this build reads and writes. */
const DOCUMENT_VERSION = 1;
/**
* Parse one credentials document. Everything is rejected rather than skipped —
* an unversioned root, an unknown top-level key, a key that is not addressable,
* a wrong-typed value, an unknown record tag or field — because this file holds
* nothing but credentials and a silently ignored entry reads as "the credential
* I stored has no effect". Duplicate keys surface as parser errors. An empty
* document is an empty store and needs no version.
* @param text - the document's text.
* @param filename - absolute path, quoted in errors.
* @returns the parsed references and records.
*/
function parseCredentialsDocument(text, filename) {
	const document = parseDocument(text, {
		prettyErrors: true,
		uniqueKeys: true
	});
	if (document.errors.length > 0) throw new Error(`credentials-local: invalid document at ${filename}: ${document.errors.map(describeYamlError).join("; ")}`);
	const root = document.toJS() ?? {};
	if (typeof root !== "object" || root === null || Array.isArray(root)) throw new TypeError(`credentials-local: ${filename} must be a mapping`);
	const fields = root;
	const keys = Object.keys(fields);
	if (keys.length === 0) return {
		refs: /* @__PURE__ */ new Map(),
		records: /* @__PURE__ */ new Map()
	};
	if (!("version" in fields)) throw new Error(`credentials-local: ${filename} uses the pre-release flat layout. Add \`version: 1\` and nest the existing ${keys.length} ${keys.length === 1 ? "entry" : "entries"} under \`refs:\`. No values need to change.`);
	if (fields["version"] !== 1) throw new Error(`credentials-local: ${filename} declares version ${JSON.stringify(fields["version"])}; this build reads version 1`);
	for (const key of keys) if (key !== "version" && key !== "refs" && key !== "records") throw new Error(`credentials-local: unknown top-level key "${key}" in ${filename}`);
	return {
		refs: parseRefs(fields["refs"], filename),
		records: parseRecords(fields["records"], filename)
	};
}
/**
* Render the version-1 layout for a pre-release flat document, or `undefined`
* for anything else. The flat layout is recognized exactly — a non-empty
* top-level mapping of addressable reference names to non-empty string
* scalars, with no `version` key and no document directives — and the rewrite
* nests the original lines verbatim under `refs:` at two spaces' indent, so
* comments, blank lines, and each value's spelling survive byte for byte.
* Anything the recognizer declines keeps {@link parseCredentialsDocument}'s
* loud rejection: a document this build cannot prove it understands is never
* rewritten. Remove with the pre-release stance at the first tagged release.
* @param text - the document's text.
* @returns the migrated text, or `undefined` when the text is not the recognized flat layout.
*/
function renderFlatLayoutMigration(text) {
	const document = parseDocument(text, {
		prettyErrors: true,
		uniqueKeys: true
	});
	if (document.errors.length > 0) return void 0;
	const flat = document.contents;
	if (!isMap(flat) || flat.items.length === 0) return void 0;
	for (const line of text.split("\n")) if (/^(%|---|\.\.\.)/.test(line)) return void 0;
	for (const pair of flat.items) {
		if (!isScalar(pair.key) || typeof pair.key.value !== "string" || pair.key.value === "version") return void 0;
		try {
			credentialRef(pair.key.value);
		} catch {
			return;
		}
		if (!isScalar(pair.value) || typeof pair.value.value !== "string" || pair.value.value.length === 0) return void 0;
	}
	return `version: 1\nrefs:\n${text.split("\n").map((line) => line.length === 0 ? line : `  ${line}`).join("\n")}${text.endsWith("\n") ? "" : "\n"}`;
}
/** Admit a `refs` section: POSIX-identifier keys over non-empty string values. */
function parseRefs(section, filename) {
	const entries = /* @__PURE__ */ new Map();
	for (const [key, value] of Object.entries(asSection(section, "refs", filename))) {
		credentialRef(key);
		if (typeof value !== "string") throw new TypeError(`credentials-local: the value for "${key}" in ${filename} must be a string`);
		if (value.length === 0) throw new Error(`credentials-local: the value for "${key}" in ${filename} is empty; remove the key instead`);
		entries.set(key, value);
	}
	return entries;
}
/** Admit a `records` section: `<scope>/<id>` keys over tagged record mappings. */
function parseRecords(section, filename) {
	const entries = /* @__PURE__ */ new Map();
	for (const [key, value] of Object.entries(asSection(section, "records", filename))) {
		parseCredentialKey(key);
		entries.set(key, parseRecord(key, value, filename));
	}
	return entries;
}
/**
* Refuse an api-key record the read path could not admit, before it is
* rendered: an empty key, an env name outside the reference grammar, or an
* empty env value would persist a document `parseRecord` rejects at the next
* boot — a durable-boundary write is validated where it is written.
* @param key - the record's credential key, for the failure message.
* @param record - the api-key record a mutation returned.
*/
function assertStorableApiKey(key, record) {
	if (record.key !== void 0 && record.key.length === 0) throw new TypeError(`credentials-local: record "${key}" has an empty key; omit the field instead`);
	for (const [name, value] of Object.entries(record.env ?? {})) {
		credentialRef(name);
		if (value.length === 0) throw new TypeError(`credentials-local: record "${key}" env "${name}" must be a non-empty string`);
	}
}
/** One section of the document as a plain mapping; absent and null both mean empty. */
function asSection(section, name, filename) {
	if (section === void 0 || section === null) return {};
	if (typeof section !== "object" || Array.isArray(section)) throw new TypeError(`credentials-local: "${name}" in ${filename} must be a mapping`);
	return section;
}
/** Admit one record entry, rejecting an unknown tag or field rather than dropping it. */
function parseRecord(key, value, filename) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError(`credentials-local: record "${key}" in ${filename} must be a mapping`);
	const fields = value;
	const kind = fields["kind"];
	if (kind === "api-key") {
		assertFields(key, fields, [
			"kind",
			"key",
			"env"
		], filename);
		const apiKey = fields["key"];
		if (apiKey !== void 0 && (typeof apiKey !== "string" || apiKey.length === 0)) throw new TypeError(`credentials-local: record "${key}" in ${filename} has a non-string or empty key`);
		const env = parseRecordEnv(key, fields["env"], filename);
		return {
			kind: "api-key",
			...apiKey === void 0 ? {} : { key: apiKey },
			...env === void 0 ? {} : { env }
		};
	}
	if (kind === "grant") {
		assertFields(key, fields, ["kind", "payload"], filename);
		if (!("payload" in fields)) throw new Error(`credentials-local: record "${key}" in ${filename} has no payload`);
		assertJsonValue(`record "${key}" payload in ${filename}`, fields["payload"], /* @__PURE__ */ new Set());
		return {
			kind: "grant",
			payload: fields["payload"]
		};
	}
	if (kind === void 0) throw new Error(`credentials-local: record "${key}" in ${filename} has no kind`);
	throw new Error(`credentials-local: record "${key}" in ${filename} has unknown kind ${JSON.stringify(kind)}`);
}
/** Reject a field the tag does not define, so a typo is not silently dropped. */
function assertFields(key, fields, allowed, filename) {
	for (const field of Object.keys(fields)) if (!allowed.includes(field)) throw new Error(`credentials-local: record "${key}" in ${filename} has unknown field "${field}"`);
}
/** Admit an api-key record's provider environment: POSIX names over non-empty strings. */
function parseRecordEnv(key, env, filename) {
	if (env === void 0) return void 0;
	if (typeof env !== "object" || env === null || Array.isArray(env)) throw new TypeError(`credentials-local: record "${key}" in ${filename} has a non-mapping env`);
	const parsed = {};
	for (const [name, value] of Object.entries(env)) {
		credentialRef(name);
		if (typeof value !== "string" || value.length === 0) throw new TypeError(`credentials-local: record "${key}" env "${name}" in ${filename} must be a non-empty string`);
		parsed[name] = value;
	}
	return parsed;
}
/**
* Reject a payload that cannot survive a JSON round trip, on the way in and on
* the way out. The seam promises owners their payload comes back exactly as
* written, and both directions can break that: a document may spell `.inf` or
* an alias cycle, and an owner may hand over a `Date`, a class instance, or a
* `bigint` that this document has no faithful spelling for. Neither the value
* nor any nested value is quoted in a diagnostic.
* @param where - the subject named in a diagnostic, already free of any value.
* @param value - the payload or nested value to admit.
* @param seen - objects on the current path, for cycle detection.
* @throws TypeError naming `where` when the value cannot round-trip.
*/
function assertJsonValue(where, value, seen) {
	if (value === null || typeof value === "string" || typeof value === "boolean") return;
	if (typeof value === "number") {
		if (Number.isFinite(value)) return;
		throw new TypeError(`credentials-local: ${where} holds a non-finite number`);
	}
	if (typeof value === "object") {
		if (seen.has(value)) throw new TypeError(`credentials-local: ${where} is cyclic`);
		if (Object.getPrototypeOf(value) === Object.prototype || Array.isArray(value)) {
			seen.add(value);
			for (const nested of Object.values(value)) assertJsonValue(where, nested, seen);
			seen.delete(value);
			return;
		}
	}
	throw new TypeError(`credentials-local: ${where} holds a value JSON cannot represent`);
}
/**
* The comment-preserving mutable tree one edit renders from. Editing the
* parsed document rather than rebuilding it keeps comments and the formatting
* of every untouched entry; an absent document starts a fresh one.
* @param text - the current document text, `undefined` while the file is absent.
* @returns the tree to edit, carrying this build's version stamp.
*/
function mutableDocument(text) {
	const document = text === void 0 ? new Document({}) : parseDocument(text);
	document.setIn(["version"], 1);
	return document;
}
/**
* Render the next document text with one reference set or deleted.
* @param text - the current document text, `undefined` while the file is absent.
* @param ref - the reference to write.
* @param value - the new value, or `undefined` to delete the key.
* @returns the text to persist.
*/
function renderRef(text, ref, value) {
	const document = mutableDocument(text);
	if (value === void 0) deleteSectionEntry(document, "refs", ref);
	else document.setIn(["refs", ref], value);
	return document.toString();
}
/**
* Render the next document text with one record written or deleted. The record
* node is replaced wholesale rather than edited field by field: records are
* machine-written, so there is no hand formatting inside one to preserve.
* @param text - the current document text, `undefined` while the file is absent.
* @param key - the record to write.
* @param record - the new record, or `undefined` to delete it.
* @returns the text to persist.
*/
function renderRecord(text, key, record) {
	const document = mutableDocument(text);
	if (record === void 0) deleteSectionEntry(document, "records", key);
	else document.setIn(["records", key], record);
	return document.toString();
}
/**
* Remove one entry from a section, taking its annotation with it. A comment
* block written above a section's first entry annotates that entry, but the
* parser attaches it to the section's map rather than to the pair — leaving it
* behind would move it onto whichever entry became first, which reads as an
* annotation of a credential nobody wrote it for.
* @param document - the mutable tree being edited.
* @param section - the section holding the entry.
* @param key - the entry to remove.
*/
function deleteSectionEntry(document, section, key) {
	const map = document.get(section, true);
	/* v8 ignore next -- both callers render a delete only for an entry they just
	found in the parsed snapshot, so the section it lives in is always a map;
	the guard is what narrows `get`'s `unknown`. */
	if (isMap(map)) {
		const first = map.items[0];
		/* v8 ignore next -- a map that holds the entry has a first item, and the
		parser admits only scalar keys, so only the identity test can be false. */
		if (first !== void 0 && isScalar(first.key) && first.key.value === key) map.commentBefore = null;
	}
	document.deleteIn([section, key]);
}
/**
* Structural equality over two admitted JSON values. Records reach this after
* {@link assertJsonValue}, so the walk meets only JSON shapes; key order is
* ignored because an external editor may reorder a record's fields without
* changing what it stores.
* @param left - one value.
* @param right - the other value.
* @returns whether the two carry the same JSON content.
*/
function sameJsonValue(left, right) {
	if (left === right) return true;
	if (typeof left !== "object" || typeof right !== "object" || left === null || right === null) return false;
	if (Array.isArray(left) !== Array.isArray(right)) return false;
	const leftKeys = Object.keys(left);
	const rightKeys = Object.keys(right);
	if (leftKeys.length !== rightKeys.length) return false;
	return leftKeys.every((key) => key in right && sameJsonValue(left[key], right[key]));
}
/** File-backed credentials provider (`$DSH_HOME/.credentials.yaml`). */
var LocalCredentialProvider = class extends CredentialProvider {
	config;
	static Config = z.object({
		path: z.string(),
		dshHome: z.string(),
		watch: z.boolean().default(true),
		debounceMs: z.number().min(0).default(100)
	});
	spec;
	/**
	* Raw text of the last read or persisted document; `undefined` while the
	* file is absent. Watcher events whose content equals this cache are no-ops,
	* which is also the self-write suppression.
	*/
	text;
	/** Parsed reference snapshot; replaced wholesale on every reload. */
	values = /* @__PURE__ */ new Map();
	/** Parsed record snapshot; replaced wholesale on every reload. */
	records = /* @__PURE__ */ new Map();
	/**
	* Single exclusive operation chain: watcher reloads and line edits run one
	* at a time in queue order (settled tail), so an edit can never render from
	* text a concurrent reload is busy replacing.
	*/
	operations = Promise.resolve();
	/** Set at dispose: refuse new writes and let in-flight work no-op. */
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
	/** The inherited-environment value for a reference, or `undefined` when empty or unset. */
	inherited(ref) {
		const entry = launchEnvironmentOf(this.ctx).getFrom(ref, ["process"]);
		return entry !== void 0 && entry.value.length > 0 ? entry.value : void 0;
	}
	/**
	* The `.env` fallback for a reference — below the managed store, never above
	* it. The invoking project ranks over the user's home file, matching the
	* environment layering: the more specific location wins.
	*/
	dotenvFallback(ref) {
		const entry = launchEnvironmentOf(this.ctx).getFrom(ref, ["project-env", "user-env"]);
		return entry !== void 0 && entry.value.length > 0 ? entry : void 0;
	}
	async *[Service.init]() {
		yield async () => {
			this.closed = true;
			await this.operations;
		};
		await this.loadInitial();
		if (!this.spec.watch) return;
		const watcher = watch(await canonicalizeWatchPath(this.spec.filename), {
			ignoreInitial: true,
			awaitWriteFinish: {
				stabilityThreshold: this.spec.debounceMs,
				pollInterval: Math.max(1, Math.min(this.spec.debounceMs, 10))
			}
		});
		watcher.on("all", () => {
			if (this.closed) return;
			this.queueRefresh();
		});
		watcher.on("ready", () => {
			if (this.closed) return;
			this.queueRefresh();
		});
		watcher.on("error", (error) => {
			this.ctx.logger.warn("credentials-local: watcher error on %s", this.spec.filename);
			this.ctx.logger.warn(error);
		});
		yield async () => {
			this.closed = true;
			await watcher.close();
			await this.operations;
		};
	}
	resolve(ref) {
		const inherited = this.inherited(ref);
		if (inherited !== void 0) return Promise.resolve({
			value: inherited,
			source: "env"
		});
		const stored = this.values.get(ref);
		if (stored !== void 0) return Promise.resolve({
			value: stored,
			source: "file"
		});
		const fallback = this.dotenvFallback(ref);
		if (fallback !== void 0) return Promise.resolve({
			value: fallback.value,
			source: fallback.source
		});
		return Promise.resolve(void 0);
	}
	describe(ref) {
		if (this.inherited(ref) !== void 0) return Promise.resolve({
			configured: true,
			source: "env",
			writable: false
		});
		if (this.values.get(ref) !== void 0) return Promise.resolve({
			configured: true,
			source: "file",
			writable: true
		});
		const fallback = this.dotenvFallback(ref);
		if (fallback !== void 0) return Promise.resolve({
			configured: true,
			source: fallback.source,
			writable: true
		});
		return Promise.resolve({
			configured: false,
			writable: true
		});
	}
	async set(ref, value) {
		if (value.length === 0) throw new Error(`credentials-local: an empty value cannot be stored for "${ref}"; use unset`);
		await this.write(ref, value);
	}
	async unset(ref) {
		await this.write(ref, void 0);
	}
	readRecord(key) {
		return Promise.resolve(this.records.get(key));
	}
	describeRecord(key) {
		const stored = this.records.get(key);
		if (stored === void 0) return Promise.resolve({
			configured: false,
			writable: true
		});
		return Promise.resolve({
			configured: true,
			kind: stored.kind,
			writable: true
		});
	}
	listRecords() {
		return Promise.resolve([...this.records].map(([key, record]) => ({
			key: parseCredentialKey(key),
			kind: record.kind
		})));
	}
	async modifyRecord(key, mutate) {
		if (this.isClosed()) throw new Error(`credentials-local is disposed: cannot modify "${key}"`);
		return this.enqueue(async () => {
			if (this.isClosed()) throw new Error(`credentials-local was disposed before the queued "${key}" modify ran`);
			await mkdir(dirname(this.spec.filename), {
				recursive: true,
				mode: 448
			});
			return withFileLock(this.spec.filename, async () => {
				await this.reconcileFromDisk();
				const current = this.records.get(key);
				const next = await mutate(current);
				if (next === void 0) return current;
				if (next.kind === "grant") assertJsonValue(`record "${key}" payload`, next.payload, /* @__PURE__ */ new Set());
				else assertStorableApiKey(key, next);
				const nextText = renderRecord(this.text, key, next);
				await writeFileAtomic(this.spec.filename, nextText, {
					mode: 384,
					dirMode: 448
				});
				this.text = nextText;
				this.records.set(key, next);
				this.notifyRecordUpdated(key);
				return next;
			}, { waitMs: DOCUMENT_LOCK_WAIT_MS });
		});
	}
	async deleteRecord(key) {
		if (this.isClosed()) throw new Error(`credentials-local is disposed: cannot delete "${key}"`);
		await this.enqueue(async () => {
			if (this.isClosed()) throw new Error(`credentials-local was disposed before the queued "${key}" delete ran`);
			await mkdir(dirname(this.spec.filename), {
				recursive: true,
				mode: 448
			});
			await withFileLock(this.spec.filename, async () => {
				await this.reconcileFromDisk();
				if (!this.records.has(key)) return;
				const nextText = renderRecord(this.text, key, void 0);
				await writeFileAtomic(this.spec.filename, nextText, {
					mode: 384,
					dirMode: 448
				});
				this.text = nextText;
				this.records.delete(key);
				this.notifyRecordUpdated(key);
			}, { waitMs: DOCUMENT_LOCK_WAIT_MS });
		});
	}
	/** Queue one exclusive document operation behind every earlier one. */
	enqueue(operation) {
		const task = this.operations.then(operation);
		this.operations = task.then(() => void 0, () => void 0);
		return task;
	}
	/** Queue a reload; only an invariant violation escaping the fan-out can reject it. */
	queueRefresh() {
		this.enqueue(() => this.refresh()).catch((error) => {
			this.ctx.logger.error("credentials-local: reload commit failed at %s", this.spec.filename);
			this.ctx.logger.error(error);
		});
	}
	/** Queue one line edit; entry checks reject early, the queue re-judges them at run time. */
	async write(ref, value) {
		const verb = value === void 0 ? "unset" : "set";
		if (this.isClosed()) throw new Error(`credentials-local is disposed: cannot ${verb} "${ref}"`);
		this.assertUnshadowed(ref, verb);
		return this.enqueue(async () => {
			if (this.isClosed()) throw new Error(`credentials-local was disposed before the queued "${ref}" ${verb} ran`);
			this.assertUnshadowed(ref, verb);
			await mkdir(dirname(this.spec.filename), {
				recursive: true,
				mode: 448
			});
			await withFileLock(this.spec.filename, async () => {
				await this.reconcileFromDisk();
				const existing = this.values.get(ref);
				if (value === void 0 && existing === void 0) return;
				const nextText = renderRef(this.text, ref, value);
				await writeFileAtomic(this.spec.filename, nextText, {
					mode: 384,
					dirMode: 448
				});
				this.text = nextText;
				if (value === void 0) this.values.delete(ref);
				else this.values.set(ref, value);
				this.notifyUpdated(ref);
			}, { waitMs: DOCUMENT_LOCK_WAIT_MS });
		});
	}
	/**
	* Reject a write the inherited environment would shadow into apparent
	* no-effect. Only that layer can shadow a write: everything else this
	* provider resolves ranks below the document being written.
	*/
	assertUnshadowed(ref, verb) {
		if (this.inherited(ref) !== void 0) throw new Error(`credentials-local: "${ref}" is supplied read-only by the launching environment, so ${verb} would be shadowed; unset it in the shell you start dsh from instead`);
	}
	/**
	* Boot read: an absent file is an empty store; an invalid one fails the
	* plugin's activation, because a credentials document that exists but
	* cannot be trusted must never be treated as "no credentials stored". The
	* one exception is the recognized pre-release flat layout, which is
	* upgraded in place first — a key stored by an earlier build must survive
	* the layout change without a hand edit.
	*/
	async loadInitial() {
		await assertOwnerOnly(this.spec.filename);
		let text;
		try {
			text = await readFile(this.spec.filename, "utf8");
		} catch (error) {
			if (!isENOENT(error)) throw error;
			return;
		}
		if (renderFlatLayoutMigration(text) !== void 0) text = await this.migrateFlatDocument();
		const document = parseCredentialsDocument(text, this.spec.filename);
		this.values = document.refs;
		this.records = document.records;
		this.text = text;
	}
	/**
	* One-shot upgrade of the recognized pre-release flat layout, before the
	* watcher exists. The rewrite runs under the document's writer lock and
	* re-reads first — a concurrent boot may have migrated already — and
	* whatever the re-read finds that is not the flat layout is returned
	* untouched for the ordinary parse. Values are carried verbatim; only the
	* enclosing layout changes. Remove with the pre-release stance at the
	* first tagged release.
	* @returns the document text this boot should parse.
	*/
	async migrateFlatDocument() {
		return withFileLock(this.spec.filename, async () => {
			const current = await readFile(this.spec.filename, "utf8");
			const migrated = renderFlatLayoutMigration(current);
			/* v8 ignore next 2 -- the losing side of the cross-process migration race:
			another boot rewrote the document between the unlocked recognize and
			this lock. That interleaving cannot be scheduled deterministically
			through a whole boot (migration.spec drives it best-effort); the
			decision itself is the recognizer's covered versioned-document decline. */
			if (migrated === void 0) return current;
			await writeFileAtomic(this.spec.filename, migrated, {
				mode: 384,
				dirMode: 448
			});
			this.ctx.logger.info("credentials-local: migrated %s to the version %d layout; values are unchanged", this.spec.filename, 1);
			return migrated;
		}, { waitMs: DOCUMENT_LOCK_WAIT_MS });
	}
	/**
	* Re-read the document after a watcher event. Unchanged content (including
	* this provider's own writes) is a no-op; an unreadable document keeps the
	* last good snapshot and warns — a live hot-reload must never take the
	* process down. An invariant violation escaping the fan-out is not a reload
	* failure and propagates to the queue's error surface.
	*/
	async refresh() {
		if (this.closed) return;
		try {
			await this.reconcileFromDisk();
		} catch (error) {
			if (error?.code === "INVARIANT") throw error;
			this.ctx.logger.warn("credentials-local: reload failed at %s; keeping the last good document", this.spec.filename);
			this.ctx.logger.warn(error);
		}
	}
	/**
	* Compare the on-disk text against the cache and publish any difference
	* into the seam. Absence publishes the empty store; an unreadable or
	* invalid document throws, so each caller picks its policy — a reload warns
	* and keeps the last good snapshot, a write fails loud rather than
	* overwriting a document it could not understand.
	*/
	async reconcileFromDisk() {
		await assertOwnerOnly(this.spec.filename);
		let text;
		try {
			text = await readFile(this.spec.filename, "utf8");
		} catch (error) {
			if (!isENOENT(error)) throw error;
			text = void 0;
		}
		if (text === this.text || this.isClosed()) return;
		const next = text === void 0 ? {
			refs: /* @__PURE__ */ new Map(),
			records: /* @__PURE__ */ new Map()
		} : parseCredentialsDocument(text, this.spec.filename);
		const changedRefs = this.changedRefs(this.values, next.refs);
		const changedRecords = this.changedRecords(this.records, next.records);
		this.text = text;
		this.values = next.refs;
		this.records = next.records;
		for (const ref of changedRefs) this.notifyUpdated(ref);
		for (const key of changedRecords) this.notifyRecordUpdated(key);
	}
	/** Entries whose stored value changed; the parser has already proven every key addressable. */
	changedRefs(prev, next) {
		const changed = [];
		for (const key of new Set([...prev.keys(), ...next.keys()])) {
			if (prev.get(key) === next.get(key)) continue;
			changed.push(credentialRef(key));
		}
		return changed;
	}
	/** Records whose stored value changed; the parser has already proven every key addressable. */
	changedRecords(prev, next) {
		const changed = [];
		for (const key of new Set([...prev.keys(), ...next.keys()])) {
			if (sameJsonValue(prev.get(key), next.get(key))) continue;
			changed.push(parseCredentialKey(key));
		}
		return changed;
	}
};
//#endregion
export { CREDENTIALS_FILENAME, DOCUMENT_VERSION, LocalCredentialProvider, LocalCredentialProvider as default, parseCredentialsDocument, renderFlatLayoutMigration, resolveSpec };
