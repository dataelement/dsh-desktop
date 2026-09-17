import { isBuiltin } from "node:module";
import { chmod, cp, readFile, readdir, rm, stat } from "node:fs/promises";
import { evaluate, isJsExpr } from "@deepseek-ai/cordis-plugin-loader";
import z from "@deepseek-ai/schemastery";
import { Remote, RemoteError, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { bindScopeParent, createScope, scopeOf, scopeParentOf } from "@deepseek-ai/dsh-scope";
import { dshHomePath, expandHomePath } from "@deepseek-ai/dsh-home-paths";
import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import yaml, { load } from "js-yaml";
import { Include, entryListSchema } from "@deepseek-ai/cordis-plugin-include";
import { writeFileAtomic } from "@deepseek-ai/dsh-atomic-write";
import { Context } from "@deepseek-ai/cordis";
import { z as z$1 } from "zod";
//#region lib/types/metadata.js
/**
* A preset's display metadata: the name and description a picker shows.
*
* It lives in its own file because the composition is a top-level list of
* plugin rows — YAML cannot carry sibling keys beside it, and faking a
* metadata row would hand the Loader something to load. Keeping it separate
* also keeps the composition exactly what its name says: a Cordis file the
* loader owns and the cordis preset can author.
*
* The file carries display text ONLY. `id` is the directory name and `trust`
* comes from the root a preset was discovered under, so neither is writable
* here — otherwise a locally authored preset could claim to be a shipped one.
*
* Every read failure degrades to no metadata. A preset whose display text is
* missing, malformed, or unreadable still mounts: presentation is not a
* capability, and a broken name must never become an agent that cannot start.
* @module @deepseek-ai/dsh-agent-presets/metadata
*/
/** The optional display-metadata file beside a preset's composition. */
const METADATA_FILE = "preset.yml";
/** A non-empty trimmed string, or undefined for anything else. */
function text(value) {
	if (typeof value !== "string") return void 0;
	const trimmed = value.trim();
	return trimmed === "" ? void 0 : trimmed;
}
/**
* Read one preset directory's display metadata.
*
* Absent, unparsable, and wrongly-shaped files are all the same answer —
* empty metadata — because the caller renders a picker, not a diagnostic.
* @param directory - the preset directory.
* @returns the display text the preset published, possibly empty.
*/
async function readPresetMetadata(directory) {
	let raw;
	try {
		raw = await readFile(join(directory, METADATA_FILE), "utf8");
	} catch {
		return {};
	}
	let parsed;
	try {
		parsed = yaml.load(raw);
	} catch {
		return {};
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
	const record = parsed;
	const name = text(record.name);
	const description = text(record.description);
	const order = typeof record.order === "number" && Number.isFinite(record.order) ? record.order : void 0;
	return {
		...name === void 0 ? {} : { name },
		...description === void 0 ? {} : { description },
		...order === void 0 ? {} : { order }
	};
}
/**
* Render display metadata as the file's contents.
*
* Absent fields are omitted rather than written empty, so a preset with no
* description does not ship a key that reads as an intentional blank.
* @param metadata - the display text to store.
* @returns the YAML document, or undefined when there is nothing to store.
*/
function renderPresetMetadata(metadata) {
	const name = text(metadata.name);
	const description = text(metadata.description);
	const { order } = metadata;
	if (name === void 0 && description === void 0 && order === void 0) return void 0;
	return yaml.dump({
		...name === void 0 ? {} : { name },
		...description === void 0 ? {} : { description },
		...order === void 0 ? {} : { order }
	}, { lineWidth: -1 });
}
//#endregion
//#region lib/types/preset.js
/** Agent-preset vocabulary shared by discovery, mounting, and consumers. */
/**
* Ids a preset directory may use.
*
* The id becomes a path segment, so this is a containment boundary rather than
* a style rule: `..`, a separator, or an absolute-looking name would place the
* composition outside the root the deployment authorised. Discovery shares it:
* a directory whose name no copy could ever claim is not a preset slot.
*/
const PRESET_ID = /^[a-z0-9][a-z0-9-]*$/;
//#endregion
//#region lib/types/specifier.js
/**
* How one composition row's `name` reaches a module.
*
* A preset composition is read by `Include`, which rewrites its context's
* `baseUrl` to the composition's own directory. That is right for a row
* naming a file the preset ships and wrong for a row naming a package: a
* locally authored preset lives under the user's home, where Node's upward
* `node_modules` walk never reaches the harness's own dependencies. Both the
* mount's import override and discovery's health check therefore have to
* classify a row's name before they can act on it, and they must classify it
* the same way — a row discovery resolves from one base and the mount imports
* from another would be reported healthy and then fail to load.
* @module @deepseek-ai/dsh-agent-presets/specifier
*/
/**
* Classify one row's `name`.
*
* An absolute filesystem path becomes a file URL here rather than at each
* call site, because Node's ESM resolver rejects a bare drive-letter path on
* Windows. A `file:` URL is already one and joins it: the Loader accepts both
* spellings for the same thing, and treating the URL as a package name would
* hand it to a resolver that only normalizes it, reporting a file that is not
* there as present. The `specifier` a caller receives is always the string to
* hand a resolver; only `kind` decides which base it goes with.
* @param name - the module specifier exactly as the row wrote it.
* @returns the classification, carrying the specifier to resolve.
*/
function classifyRowSpecifier(name) {
	if (name.startsWith("cordis:")) return {
		kind: "builtin",
		specifier: name
	};
	if (name.startsWith(".")) return {
		kind: "preset",
		specifier: name
	};
	if (name.startsWith("file:")) return {
		kind: "file",
		specifier: name
	};
	if (isAbsolute(name)) return {
		kind: "file",
		specifier: pathToFileURL(name).href
	};
	return {
		kind: "package",
		specifier: name
	};
}
//#endregion
//#region lib/types/discovery.js
/**
* Filesystem discovery of agent presets. A preset is a directory holding
* {@link COMPOSITION_FILE}, optionally beside a {@link METADATA_FILE} carrying
* its display text; the directory name is the preset id. Discovery
* re-reads the roots on every call so a preset authored while the process is
* running is visible without a restart.
*
* Discovery also owns preset HEALTH: a directory whose composition is
* missing or unloadable is reported as a broken roster row rather than
* skipped. A skipped directory would still occupy its id on disk — the copy
* path refuses the name while no surface shows anything to delete — and a
* malformed composition would otherwise read as an ordinary preset until the
* first session fails to mount it.
*
* Health is what every consumer reads before offering a preset — the pickers
* drop a broken row rather than defer the discovery to a failed session
* start — so it covers the way an authored preset actually rots: a row naming
* a package that was renamed or uninstalled. Resolving those names is a
* separate pass from the shape check and stops short of importing anything,
* so a composition is judged without running a line of plugin code.
* @module @deepseek-ai/dsh-agent-presets/discovery
*/
/** The composition file that makes a directory a preset. */
const COMPOSITION_FILE = "agent.cordis.yml";
/**
* Harness-home directory holding locally authored presets.
*
* This package owns the writable root the way `dsh-skill-filesystem` owns
* `<dshHome>/skills`: where a person's own presets go is the same place in
* every deployment that does not say otherwise, so a launcher that forgets to
* configure one still finds them.
*
* Package-internal on purpose: no consumer outside this package addresses the
* directory by name, and a test that imported it could not catch this value
* being wrong — the expected segment is spelled out where it is asserted.
*/
const USER_PRESET_DIR = ".agent-presets";
/**
* The shipped presets, bundled inside this package: the roster's built-in
* compositions travel with the machinery that mounts them, the way each
* preset's own skills travel inside its directory. Resolved relative to this
* module so both launch layouts work — `src/` under tsx and the bundled
* `lib/` sit one level below the package root.
*/
const SHIPPED_PRESET_ROOT = fileURLToPath(new URL("../presets/", import.meta.url));
/**
* Why `rows` cannot be an entry list, or undefined when it can.
*
* A shallow shape check, deliberately short of the loader's work: it does not
* resolve plugin names or apply configs. What it catches is the hand-edit
* that produces a file the loader cannot even begin with — and it must accept
* everything the loader accepts, which is why rows are only required to be
* maps carrying a plugin `name` (groups recurse into their own lists).
*
* Shared with the composition inventory, whose file reads race edits against
* the health verdict and must judge the raced content by the same rule.
* @param rows - the parsed composition document.
* @param at - row-path prefix for nested diagnostics, empty at the top level.
* @returns one human-readable reason, or undefined when the shape holds.
*/
function entryListProblem(rows, at = "") {
	if (!Array.isArray(rows)) return at === "" ? "the composition must be a top-level list of plugin rows" : `group ${at} must hold a list of plugin rows`;
	for (const [index, row] of rows.entries()) {
		const label = at === "" ? `row ${String(index + 1)}` : `${at} row ${String(index + 1)}`;
		if (typeof row !== "object" || row === null || Array.isArray(row)) return `${label} is not a plugin row (expected a map with a "name")`;
		const { name, group, config } = row;
		if (typeof name !== "string" || name === "") return `${label} names no plugin (a "name" string is required)`;
		if (group === true) {
			const nested = entryListProblem(config, label);
			if (nested !== void 0) return nested;
		}
	}
}
/**
* Whether a package name is installed anywhere above `base`.
*
* Node's own upward `node_modules` walk, stopping at the package directory:
* the question is whether the package is there at all, which is what a row
* naming a package a rename or an uninstall took away gets wrong. A pnpm
* store link answers through the symlink, and a link left dangling by a
* deleted checkout answers false — the shape a stale profile install leaves.
*
* `existsSync` rather than the async `stat`: the walk is a handful of lookups
* per package and runs on every roster read, where 150 promise round-trips
* cost more than the lookups they wrap.
* @param name - the package specifier, possibly carrying a subpath.
* @param base - the URL to walk up from.
* @returns true when the package directory is installed above `base`.
*/
function packageInstalled(name, base) {
	const pkg = name.split("/").slice(0, name.startsWith("@") ? 2 : 1).join("/");
	let dir = fileURLToPath(base);
	for (;;) {
		if (existsSync(join(dir, "node_modules", pkg, "package.json"))) return true;
		const parent = dirname(dir);
		if (parent === dir) return false;
		dir = parent;
	}
}
/**
* Whether one classified row names a module that exists, importing nothing.
*
* Each kind is checked by what actually answers it. A package name is looked
* up on disk — the same upward walk Node's own resolver starts with — and a
* relative or `file:` specifier is statted, because both name one file.
* Nothing is evaluated either way, so a row is judged without its plugin
* observing that discovery looked.
*
* `import.meta.resolve` is deliberately not the fallback for a name the disk
* lookup misses. Its `parentURL` argument only takes effect under
* `--experimental-import-meta-resolve`, which no launch passes, so it would
* resolve from THIS module rather than from the harness — reporting a
* dependency visible only to this package as healthy, and a plugin the mount
* can import as broken. The resolver that does honour an explicit parent is
* the Loader's internal one, whose `resolveSync` signature differs between
* Node 22 and 24 (`ModuleLoader.fromInternal` tags the raw object rather than
* normalising it); reaching into that for a case the walk already covers buys
* nothing a supported deployment needs, because every plugin a preset names
* is installed beside the roster.
*
* What that gives up: a package resolvable ONLY through a loader hook — an
* import map, or a tree with no `node_modules` at all — is reported broken.
* No supported install produces one.
* @param row - the classified specifier, from {@link classifyRowSpecifier}.
* @param presetBase - directory URL a preset-relative specifier resolves against.
* @param harnessBase - base URL a package name resolves against.
* @returns true when the row names something that can be imported.
*/
async function rowResolves(row, presetBase, harnessBase) {
	if (row.kind === "builtin") return true;
	if (row.kind === "package") return isBuiltin(row.specifier) || packageInstalled(row.specifier, harnessBase);
	return await isFile(fileURLToPath(row.kind === "file" ? new URL(row.specifier) : new URL(row.specifier, presetBase)));
}
/**
* Rows whose module cannot be resolved.
*
* Only rows that will certainly be started are checked, and the test is the
* Loader's own: it starts a row when `Boolean(options.disabled)` is false, so
* `disabled: 0` names a row that DOES start and must be checked. A `!!js`
* expression is an object and therefore truthy, which skips exactly the rows
* whose value only the loader context can decide. Skipping those trades a
* missed name for the failure that matters more: calling a usable preset
* broken makes it unselectable and uncopyable, which is worse than reporting
* the same stale row at mount time as before.
*
* Shape is the caller's precondition: {@link entryListProblem} has already
* proven every row is a map carrying a `name` string, and groups recurse the
* same way it does.
* @param rows - the parsed composition rows.
* @param presetBase - directory URL a preset-relative specifier resolves against.
* @param harnessBase - base URL a package name resolves against.
* @param at - row-path prefix for nested diagnostics, empty at the top level.
* @returns one entry per unresolvable row, in composition order.
*/
async function unresolvableRows(rows, presetBase, harnessBase, at = "") {
	const found = [];
	for (const [index, entry] of rows.entries()) {
		const row = entry;
		if (Boolean(row.disabled)) continue;
		const positional = at === "" ? `row ${String(index + 1)}` : `${at} row ${String(index + 1)}`;
		if (row.group === true) {
			found.push(...await unresolvableRows(row.config, presetBase, harnessBase, positional));
			continue;
		}
		if (await rowResolves(classifyRowSpecifier(row.name), presetBase, harnessBase)) continue;
		const label = typeof row.id === "string" && row.id !== "" ? `row "${row.id}"` : positional;
		found.push({
			label,
			name: row.name
		});
	}
	return found;
}
/**
* Why the composition at `path` cannot mount, or undefined when it looks
* loadable. Parsed with the loader's own YAML dialect ({@link entryListSchema},
* the one carrying `!!js`), so health can never call a composition broken
* that the loader would accept.
* @param path - absolute path of the composition file.
* @param harnessBase - base URL a row's package name resolves against.
* @returns one human-readable reason, or undefined when the file is loadable.
*/
async function compositionProblem(path, harnessBase) {
	let content;
	try {
		content = await readFile(path, "utf8");
	} catch {
		return `the composition file ${COMPOSITION_FILE} cannot be read`;
	}
	let rows;
	try {
		rows = load(content, { schema: entryListSchema });
	} catch (error) {
		return `the composition is not valid YAML: ${(error instanceof Error ? error.message : String(error)).replace(/\n[\s\S]*$/, "")}`;
	}
	const shape = entryListProblem(rows);
	if (shape !== void 0) return shape;
	const presetBase = new URL(".", pathToFileURL(path)).href;
	const unresolvable = await unresolvableRows(rows, presetBase, harnessBase);
	const [first] = unresolvable;
	if (first === void 0) return void 0;
	if (unresolvable.length === 1) return `${first.label} names a plugin that cannot be resolved: ${first.name}`;
	return `${String(unresolvable.length)} rows name plugins that cannot be resolved:\n` + unresolvable.map((row) => `- ${row.label}: ${row.name}`).join("\n");
}
/**
* Whether `path` names an existing regular file.
* @param path - absolute path to test.
* @returns true when the path resolves to a file.
*/
async function isFile(path) {
	try {
		return (await stat(path)).isFile();
	} catch {
		return false;
	}
}
/**
* Scan one root for preset directories.
*
* An absent root yields no presets rather than throwing: the user root does
* not exist until the first locally authored preset, and naming a default
* that no root supplies already fails loud at resolution.
*
* Every directory whose name is a usable preset id is a roster row — broken
* when its composition is missing or unloadable. A directory named outside
* {@link PRESET_ID} is skipped instead: no copy could ever claim that name,
* so it blocks nothing, and reporting `.DS_Store`-grade residue as broken
* presets would teach users to ignore the marker.
* @param root - the directory and the trust its presets inherit.
* @param harnessBase - base URL a row's package name resolves against; the
* caller's own `ctx.baseUrl`, which is where the installed harness lives.
* @returns the root's presets ordered by id.
*/
async function scanRoot(root, harnessBase) {
	const dir = resolve(expandHomePath(root.path));
	let children;
	try {
		children = await readdir(dir, { withFileTypes: true });
	} catch (error) {
		if (error.code === "ENOENT") return [];
		throw new Error(`agent-presets: cannot read preset root ${dir}: ${String(error)}`, { cause: error });
	}
	const found = [];
	for (const child of children) {
		if (!child.isDirectory() || !PRESET_ID.test(child.name)) continue;
		const directory = join(dir, child.name);
		const path = join(directory, COMPOSITION_FILE);
		const broken = await isFile(path) ? await compositionProblem(path, harnessBase) : `the composition file ${COMPOSITION_FILE} is missing — the directory still occupies the id; delete it or restore the file`;
		const metadata = await readPresetMetadata(directory);
		found.push({
			id: child.name,
			trust: root.trust,
			path,
			...metadata,
			...broken === void 0 ? {} : { broken }
		});
	}
	return found.sort((left, right) => {
		const byOrder = (left.order ?? Number.POSITIVE_INFINITY) - (right.order ?? Number.POSITIVE_INFINITY);
		return byOrder === 0 ? left.id.localeCompare(right.id) : byOrder;
	});
}
/**
* Scan every root in precedence order.
* @param roots - roots in precedence order; an earlier root wins a duplicate id.
* @param harnessBase - base URL a row's package name resolves against.
* @returns every discovered preset, first-root-wins per id.
*/
async function discoverPresets(roots, harnessBase) {
	const byId = /* @__PURE__ */ new Map();
	for (const root of roots) for (const preset of await scanRoot(root, harnessBase)) {
		if (byId.has(preset.id)) continue;
		byId.set(preset.id, preset);
	}
	return [...byId.values()];
}
//#endregion
//#region lib/types/authoring.js
/**
* Copying, reading, and deleting locally authored presets.
*
* Authoring is confined to a `user` root: the shipped `.system` set is part of
* the deployment, and letting a browser rewrite it would turn "reset to a known
* preset" into something the same caller could have broken first.
*
* The only authoring write is a whole-directory copy of an existing preset.
* No caller supplies composition text: the inputs are ids the host resolves
* against its own roots plus an optional display name, so authoring grants no
* capability the copied preset did not already carry.
* @module @deepseek-ai/dsh-agent-presets/authoring
*/
/**
* Refuse one authoring request the deployment does not allow.
* @param presetId - what the caller tried to change, for the diagnostic.
* @param reason - why authoring is refused.
* @returns the failure to throw.
*/
function notWritable(presetId, reason) {
	return new RemoteError("agent-preset/read-only", `agent-presets: preset "${presetId}" cannot be written: ${reason}`, {
		agentPreset: presetId,
		reason
	});
}
/**
* Refuse a copy onto an id something already occupies. Both the roster check
* and the on-disk check answer with it, so a taken id reads the same either way.
* @param presetId - the id that is already taken.
* @returns the failure to throw.
*/
function presetExists(presetId) {
	const reason = `preset "${presetId}" already exists — a copy never overwrites; delete the existing preset first or choose another id`;
	return new RemoteError("agent-preset/invalid", `agent-presets: ${reason}`, {
		agentPreset: presetId,
		reason
	});
}
/**
* The root locally authored presets are written to.
* @param roots - the configured roots in precedence order.
* @param presetId - the preset the caller is authoring, named by the refusal.
* @returns the absolute path of the first `user` root.
* @throws when the deployment configured no writable root.
*/
function writableRoot(roots, presetId) {
	const root = roots.find((candidate) => candidate.trust === "user");
	if (root === void 0) throw notWritable(presetId, "this deployment configures no user-writable preset root");
	return resolve(expandHomePath(root.path));
}
/**
* Read one preset's composition text.
* @param preset - the resolved preset.
* @returns the file's contents.
*/
async function readComposition(preset) {
	return await readFile(preset.path, "utf8");
}
/** Whether anything occupies the path (cp's own errorOnExist backstops races). */
async function occupied(path) {
	let present = true;
	try {
		await stat(path);
	} catch {
		present = false;
	}
	return present;
}
/**
* Re-tighten a copied tree to owner-only. A shipped preset is world-readable
* in its install and `cp` preserves that; the copy carries the same weight as
* the settings document beside it, so group/other access is stripped. A
* file's owner-execute bit survives — a preset may ship runnable helpers.
*/
async function tightenModes(dir) {
	await chmod(dir, 448);
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const target = join(dir, entry.name);
		if (entry.isDirectory()) await tightenModes(target);
		else
 /* v8 ignore next -- Windows exposes no POSIX owner-execute bit; the POSIX lane covers both file modes. */
		await chmod(target, ((await stat(target)).mode & 64) === 0 ? 384 : 448);
	}
}
/**
* Create a preset by copying an existing one's whole directory.
*
* The copy carries everything the source directory holds — composition,
* metadata, skill directories, assets — because a preset is its directory,
* not one file. Symlinks are dereferenced so the copy is self-contained
* rather than a set of links back into the install it was copied from.
*
* The copied metadata is then rewritten: the source's description is kept
* (the file is the author's to edit afterwards), but its name and roster
* `order` are not — a copy presenting itself identically to its source, or
* sorted into the shipped set's declared order, would make the roster stop
* distinguishing them. With no name given and no description to keep, the
* file is removed so the copy publishes nothing rather than a blank.
* @param roots - the configured roots; the first `user` one receives the copy.
* @param source - the resolved preset the copy starts from.
* @param id - the new preset's id, which becomes its directory name.
* @param name - display name for the copy; omitted falls back to the id.
* @returns the absolute path of the new preset directory.
* @throws when the id is unusable or already occupied on disk, or the
* deployment configures no writable root.
*/
async function copyComposition(roots, source, id, name) {
	if (!PRESET_ID.test(id)) {
		const reason = `preset id ${JSON.stringify(id)} must match ${String(PRESET_ID)} — the id is a directory name, so anything else could escape the preset root`;
		throw new RemoteError("agent-preset/invalid", `agent-presets: ${reason}`, {
			agentPreset: id,
			reason
		});
	}
	const dir = join(writableRoot(roots, id), id);
	if (await occupied(dir)) throw presetExists(id);
	try {
		await cp(dirname(source.path), dir, {
			recursive: true,
			dereference: true,
			force: false,
			errorOnExist: true
		});
		await tightenModes(dir);
		const rendered = renderPresetMetadata({
			...name === void 0 ? {} : { name },
			...source.description === void 0 ? {} : { description: source.description }
		});
		const metadataPath = join(dir, METADATA_FILE);
		if (rendered === void 0) await rm(metadataPath, { force: true });
		else await writeFileAtomic(metadataPath, rendered, {
			mode: 384,
			dirMode: 448
		});
	} catch (error) {
		await rm(dir, {
			recursive: true,
			force: true
		});
		throw error;
	}
	return dir;
}
/**
* Delete a locally authored preset.
*
* A shipped preset is refused: it belongs to the deployment. A preset a live
* session mounted is NOT refused — the composition was read at creation and is
* never re-read, so that session keeps running exactly as it was.
* @param roots - the configured roots.
* @param preset - the resolved preset to remove.
* @throws when the preset ships with the deployment or lies outside the writable root.
*/
async function deleteComposition(roots, preset) {
	if (preset.trust !== "user") throw notWritable(preset.id, "it ships with the deployment");
	const dir = join(writableRoot(roots, preset.id), preset.id);
	if (!isAbsolute(preset.path) || !preset.path.startsWith(dir)) throw notWritable(preset.id, "it does not live under the writable preset root");
	await rm(dir, {
		recursive: true,
		force: true
	});
}
//#endregion
//#region lib/types/mount.js
/**
* Mount one preset composition under an agent's scope context, then prove the
* result is usable before the agent is published.
*
* The scope context is what makes the composition per-session: entry contexts
* chain to the context the subtree was plugged into, so every `ctx.tools`
* and `ctx.systemPrompt` registration inside the preset files into that
* agent's layer and unwinds with it. Two guards make that safe. A row that
* never reached a usable state is rejected, because a directly-plugged subtree
* is absent from `ctx.loader.entries()` and no boot audit covers it. A row that
* published a service into the ROOT realm is rejected, because such a service
* is process-global rather than per-session and the second session mounting the
* same preset collides with the first.
* @module @deepseek-ai/dsh-agent-presets/mount
*/
/**
* Subtrees captured by config identity. A subtree plugged directly (rather than
* created as a loader entry) never links itself to an `Entry`, so this is the
* only handle to the rows it created; config objects are minted per mount, so
* concurrent mounts cannot collide.
*/
const mounted = /* @__PURE__ */ new WeakMap();
/**
* The base URL bare specifiers resolve against, per pending mount, keyed by the
* same config object. Recorded before the subtree is plugged, because `Include`
* rewrites its own context's `baseUrl` to the composition's directory and the
* pre-mount value is the only handle on where the harness itself lives.
*/
const harnessBase = /* @__PURE__ */ new WeakMap();
/**
* Include subclass that publishes its tree and fiber for the audit, and never
* writes to the file it read.
*/
var PresetTree = class extends Include {
	constructor(ctx, config) {
		super(ctx, config);
		const owner = this.ctx.fiber.entry;
		if (owner?.subtree === this) delete owner.subtree;
		mounted.set(config, {
			tree: this,
			fiber: ctx.fiber
		});
	}
	/**
	* Resolve a bare specifier from the harness rather than from the preset.
	*
	* `EntryTree.import()` resolves against the tree's own `baseUrl`, which
	* `Include` sets to the composition's directory. That is right for a
	* relative specifier — a preset's own files travel with it — and wrong for
	* a package name: a locally authored preset lives under the user's home,
	* where Node's upward `node_modules` walk never reaches the harness's own
	* dependencies, so every `@deepseek-ai/dsh-*` row would fail to import. The
	* mount records the host composition's base instead, which is inside the
	* installed harness, and bare names resolve from there. An absolute
	* filesystem path names neither base and becomes a file URL before Node's
	* ESM loader receives it, which is required for drive-letter paths on
	* Windows.
	*
	* {@link classifyRowSpecifier} makes that split, so discovery's health check
	* resolves every row from the same base this import uses.
	* @param name - the module specifier from the row.
	* @param getOuterStack - the loader's stack composer for import diagnostics.
	* @returns the imported module, or the `cordis:` builtin.
	*/
	import(name, getOuterStack) {
		const row = classifyRowSpecifier(name);
		const base = harnessBase.get(this.config);
		/* v8 ignore next -- every PresetTree is constructed by `mountPreset`, which records the base first */
		if (base === void 0) return super.import(row.specifier, getOuterStack);
		if (row.kind === "builtin" || row.kind === "preset") return super.import(row.specifier, getOuterStack);
		const internal = this.ctx.loader.internal;
		/* v8 ignore next -- Node always supplies the internal module loader; the branch keeps a
		hypothetical embedder from losing the row's name in a resolution error. */
		if (internal === void 0) return super.import(row.specifier, getOuterStack);
		return internal.import(row.specifier, base, {});
	}
	/**
	* A preset is an input, never a persistence target.
	*
	* The Loader writes a tree back through this method whenever it decides the
	* config changed — a plugin self-disposing is enough, and tearing an agent
	* down disposes its whole subtree. Inherited, that rewrites the preset file
	* with whatever the dying tree held, which in practice means truncating a
	* shipped composition to `[]` the first time a session ends. Persisting a
	* preset is also meaningless: nothing here is user state, and the same file
	* backs every session that names it.
	*
	* Dropping the write drops the `loader/config-update` the inherited method
	* emits with it. No consumer observes one for a preset subtree, and a
	* future "edit your preset while it runs" flow needs a deliberate
	* persistence path rather than this method's return.
	*/
	write() {}
};
const mounts = /* @__PURE__ */ new Set();
/**
* Drop every record whose subtree is gone.
*
* Records are pruned by observation rather than through a disposal hook
* because a subtree can be torn down by its owning agent, by a failed mount, or
* by the whole tree unloading, and a cleared `uid` is what all three share.
*
* Pruning therefore has to happen on a path this module owns. Reading is one
* such path, but not a reliable one: the only production reader is the
* invariant companion's service listener, and `dsh-invariants` is a
* development composition — a shipped host never loads it. Mounting is the
* other, and it is the one every session takes, which bounds the set at one
* generation of dead records rather than one per session ever composed. Each
* record would otherwise retain its whole disposed subtree: the fiber holds
* its config, and that config is the key its `EntryTree` is stored under.
*/
function pruneDisposedMounts() {
	for (const mount of mounts) if (mount.fiber.uid === null) mounts.delete(mount);
}
/**
* Every preset composition still installed, pruning fibers disposed since the
* last read.
*
* The record set is module state and therefore spans every Cordis runtime in
* the process; a reader that serves one runtime passes that runtime's root
* fiber so another runtime mounting the same preset id (a second embedded
* app, a test's second harness) never answers for it.
* @param within - when present, only mounts inside this fiber's subtree.
* @returns the live mounts.
*/
function livePresetMounts(within) {
	pruneDisposedMounts();
	const all = [...mounts];
	return within === void 0 ? all : all.filter((mount) => withinFiber(mount.fiber, within));
}
/**
* Whether `fiber` is `root` itself or is mounted anywhere inside its subtree.
*
* Membership is object identity. `uid` looks like a cheaper key but is a
* per-registry counter, so fibers in two different roots collide on it and a
* subtree in one runtime would be blamed for a service published in another.
* @param fiber - the fiber to locate.
* @param root - the subtree root to test membership against.
* @returns true when `fiber` belongs to `root`'s subtree.
*/
function withinFiber(fiber, root) {
	let current = fiber;
	while (true) {
		if (current === root) return true;
		const parent = current.parent.fiber;
		if (parent === current) return false;
		current = parent;
	}
}
/**
* Service names the mounted subtree published into the root realm.
*
* A provider without an `isolate` realm stores its implementation under the
* root's symbol for that name, which is exactly the comparison below; a
* provider inside an `isolate` realm stores under a realm-private symbol and
* is correctly absent here.
* @param ctx - any context of the runtime whose service store is inspected.
* @param mount - the mounted subtree's fiber.
* @returns the leaked service names in lexical order.
*/
function leakedServices(ctx, mount) {
	const store = ctx.reflect.store;
	const rootIsolate = ctx.root[Context.isolate];
	const leaked = [];
	for (const key of Object.getOwnPropertySymbols(store)) {
		const impl = store[key];
		/* v8 ignore next -- cordis deletes a store slot on disposal rather than
		clearing it, so an own symbol always resolves; the guard exists only
		because the store's index signature is optional. */
		if (impl === void 0) continue;
		if (!withinFiber(impl.fiber, mount)) continue;
		if (rootIsolate[impl.name] === key) leaked.push(impl.name);
	}
	return leaked.sort((left, right) => left.localeCompare(right));
}
/**
* The standing composition one agent is joined to.
*
* The agent's own key is parented to its preset's standing key, so the mount
* is found by matching that parent rather than by walking up from the agent —
* the mount is not under the agent's fiber. An agent that joined no preset —
* a deployment composing no roster, or a child agent before its join — has no
* parent link and resolves to undefined.
* @param agentCtx - the agent's scope context.
* @returns the mount the agent joined, or undefined when it joined none.
*/
function standingMountFor(agentCtx) {
	const agentKey = scopeOf(agentCtx);
	if (agentKey === void 0) return void 0;
	const standingKey = scopeParentOf(agentKey);
	if (standingKey === void 0) return void 0;
	return livePresetMounts().find((candidate) => candidate.key === standingKey);
}
/**
* One agent's instance of a service its preset mounted.
*
* A preset publishes a service behind an `isolate` realm so two sessions
* cannot collide, and an entry-local realm is invisible to everything outside
* the group — including the agent's own scope context and the host. That is
* right for the rows inside the group and wrong for one caller: a request that
* is ABOUT a session but arrives from outside it, which is every browser RPC
* the api-proxy serves.
*
* Ownership is the same relation {@link leakedServices} reads, inverted: there
* it names implementations a subtree published into the ROOT realm, here it
* names the one this subtree published anywhere. Fiber membership is object
* identity for the reason stated on {@link withinFiber}.
*
* This is READ addressing for a caller that already holds the agent. It is not
* a general host handle on a session's internals: a host row that `inject`s a
* service cannot use it, because injection resolves before any session exists
* and has no agent to key by — such a service belongs on the host plane.
* @param ctx - any context of the runtime whose service store is inspected.
* @param agent - the agent whose mounted composition to look inside.
* @param name - the service name as the preset's rows resolve it.
* @returns the agent's instance, or undefined when its preset mounts none.
*/
function serviceForAgent(ctx, agent, name) {
	const mount = standingMountFor(agent.ctx);
	if (mount === void 0) return void 0;
	const store = ctx.reflect.store;
	for (const key of Object.getOwnPropertySymbols(store)) {
		const impl = store[key];
		/* v8 ignore next -- cordis deletes a store slot on disposal rather than clearing it */
		if (impl === void 0) continue;
		if (impl.name !== name) continue;
		if (withinFiber(impl.fiber, mount.fiber)) return impl.value;
	}
}
/**
* Rows that did not reach a usable state, each rendered as one diagnostic line.
*
* A row whose module failed to import or whose plugin threw already rejects the
* mount through the loader; what remains observable here is a row still waiting
* for a service the composition never supplies.
* @param tree - the mounted subtree.
* @returns one line per unusable row, empty when every enabled row is usable.
*/
function inactiveRows(tree) {
	const lines = [];
	for (const entry of tree.entries()) {
		if (entry.disabled) continue;
		const fiber = entry.fiber;
		/* v8 ignore next 4 -- the loader rejects an entry whose module or plugin failed,
		so a settled tree never holds an enabled fiber-less entry; the branch exists
		only because `Entry.fiber` is declared optional. */
		if (fiber === void 0) {
			lines.push(`${entry.options.id} (${entry.options.name}): never started`);
			continue;
		}
		const missing = Object.keys(fiber.inject).filter((name) => fiber.ctx.get(name) === void 0);
		if (missing.length > 0) lines.push(`${entry.options.id} (${entry.options.name}): waiting for ${missing.join(", ")}`);
	}
	return lines;
}
/**
* The causes of `error` whose detail its own message does not already carry.
*
* `AggregateError` names none of its causes in its own message, so its
* `errors` are the branches. The Loader's per-row wrapper takes the opposite
* approach: it appends `cause.message` to the message it builds and keeps the
* cause only as `error.cause`, so following a plain chain would print every
* line twice. That leaves exactly one lossy shape — a wrapped row whose cause
* is an `AggregateError`. Its message ends with the aggregate's own line and
* drops the `errors` behind it, which is how a failed group reports as
* "loader entries failed to apply" and names none of the rows that failed.
* @param error - the failure to read branches from.
* @returns the branches to render beneath `error.message`, possibly empty.
*/
function detailBranches(error) {
	if (error instanceof AggregateError) return error.errors;
	return error.cause instanceof AggregateError ? error.cause.errors : [];
}
/**
* The reportable text of a mount failure.
*
* The loader reports several failed rows as one `AggregateError`, whose own
* message names none of them; without flattening, a composition that fails on
* two rows says only "loader entries failed to apply" and the operator has
* nothing to act on. Nested groups indent under the row that owns them, so a
* composition failing inside a group still names the rows rather than the
* group alone.
* @param error - the value the mount rejected with.
* @returns a single-line-per-cause description.
*/
function mountDetail(error) {
	/* v8 ignore next -- every path into the mount's catch throws an Error: the loader
	wraps a row's thrown value before it propagates, and this module's own
	rejections are Errors. The fallback keeps a hostile value readable. */
	if (!(error instanceof Error)) return String(error);
	const branches = detailBranches(error);
	if (branches.length === 0) return error.message;
	return [error.message, ...branches.map((branch) => `- ${mountDetail(branch).replaceAll("\n", "\n  ")}`)].join("\n");
}
/**
* Mount `preset` under `agentCtx` and return only once every row is usable.
*
* The subtree is owned by `agentCtx`'s fiber, so it unwinds with the agent and
* the caller receives no disposer. A rejection leaves nothing mounted.
* @param agentCtx - the agent's scope context, from the agent factory's `setup`.
* @param preset - the resolved preset to compose the agent from.
* @throws when `agentCtx` carries no scope, a row is unusable, or a row
* published a service into the root realm.
*/
async function mountPreset(agentCtx, preset) {
	if (scopeOf(agentCtx) === void 0) throw new Error(`agent-presets: refusing to mount preset "${preset.id}" into an unscoped context; its registrations would apply to every agent in the process`);
	const config = { path: pathToFileURL(preset.path).href };
	/* v8 ignore next -- the Loader sets `baseUrl` on the root before any scoped context derives from it */
	if (agentCtx.baseUrl !== void 0) harnessBase.set(config, agentCtx.baseUrl);
	pruneDisposedMounts();
	const handle = agentCtx.plugin(PresetTree, config);
	try {
		await handle.await();
		const subtree = mounted.get(config);
		/* v8 ignore next -- the subclass constructor runs before `await()` settles for every mounted tree */
		if (subtree === void 0) throw new Error("mounted subtree did not publish its entry tree");
		const { tree, fiber } = subtree;
		const unusable = inactiveRows(tree);
		if (unusable.length > 0) throw new Error(`${String(unusable.length)} row(s) did not activate:\n${unusable.join("\n")}`);
		const leaked = leakedServices(agentCtx, fiber);
		if (leaked.length > 0) throw new Error(`row(s) published process-global service(s) [${leaked.join(", ")}]; a preset service must sit behind an \`isolate\` realm or move to the host composition`);
		mounts.add({
			presetId: preset.id,
			fiber,
			tree,
			key: scopeOf(agentCtx)
		});
	} catch (error) {
		try {
			await handle.dispose();
		} catch {}
		const reason = `${mountDetail(error)} (${preset.path})`;
		throw new RemoteError("agent-preset/invalid", `agent-presets: preset "${preset.id}" failed to mount: ${reason}`, {
			agentPreset: preset.id,
			reason
		}, { cause: error });
	}
}
//#endregion
//#region lib/types/composition-inventory.js
/**
* Structured composition reads for plugin-listing surfaces: the plugin rows
* each preset names, with each row's effective enablement. A preset with a
* live standing mount answers from that mount's Loader entries — evaluated
* `disabled`, real root-fiber states; a preset no session has composed since
* boot answers from its composition file, with `!!js` disabled expressions
* evaluated through the caller-supplied Loader evaluator so the file answer
* matches the decision a mount on this host would make. A row whose
* expression the evaluator refuses stays `'conditional'`.
* @module @deepseek-ai/dsh-agent-presets/composition-inventory
*/
/**
* One `disabled` node's contribution to effective enablement, mirroring the
* Loader's own reading: a `!!js` expression is asked of the evaluator — a
* refusal (throw) leaves the decision to a mount — and anything else disables
* exactly when `Boolean(value)` does.
* @param value - the raw `disabled` node of one composition row.
* @param evaluateExpression - the Loader-context evaluator for `!!js` nodes.
* @returns true (disabled), false (enabled), or `'conditional'`.
*/
function disabledContribution(value, evaluateExpression) {
	if (isJsExpr(value)) try {
		return Boolean(evaluateExpression(value.__jsExpr));
	} catch {
		return "conditional";
	}
	return Boolean(value);
}
/**
* Combine an ancestor group's disabled state with a row's own, the way the
* Loader walks owning groups: any literal true disables, otherwise any
* expression leaves the decision to a mount.
* @param outer - the combined ancestor contribution.
* @param own - this row's contribution.
* @returns the row's effective disabled state.
*/
function combineDisabled(outer, own) {
	if (outer === true || own === true) return true;
	if (outer === "conditional" || own === "conditional") return "conditional";
	return false;
}
/**
* Flatten one parsed row list into plugin rows. Group rows are structural —
* the Loader reports a group entry as always enabled and lets children
* inherit its `disabled` — so only their children are emitted.
* @param rows - the parsed rows, shape-checked by the caller.
* @param outerDisabled - the combined ancestor-group disabled state.
* @param evaluateExpression - the Loader-context evaluator for `!!js` nodes.
* @param found - the accumulator receiving flattened rows.
*/
function flattenRows(rows, outerDisabled, evaluateExpression, found) {
	for (const value of rows) {
		const row = value;
		const disabled = combineDisabled(outerDisabled, disabledContribution(row.disabled, evaluateExpression));
		if (row.group === true) {
			flattenRows(row.config, disabled, evaluateExpression, found);
			continue;
		}
		found.push({
			entryId: typeof row.id === "string" && row.id !== "" ? row.id : null,
			moduleName: row.name,
			enabled: disabled === true ? false : disabled === "conditional" ? "conditional" : true,
			...isJsExpr(row.disabled) ? { condition: row.disabled.__jsExpr } : {}
		});
	}
}
/**
* Plugin rows of one composition file, for a preset with no live mount.
*
* Parsed with the Loader's own dialect ({@link entryListSchema}), so the rows
* reported are the rows a mount would start from. A file that stopped reading
* as a composition — discovery judged the preset healthy moments earlier, so
* only an edit racing this read gets here — answers as broken with the raced
* reason rather than dropping the rows silently.
* @param path - absolute path of the composition file.
* @param evaluateExpression - the Loader-context evaluator for `!!js` nodes.
* @returns flattened rows in composition order, or why they cannot be read.
*/
async function fileComposition(path, evaluateExpression) {
	let rows;
	try {
		rows = load(await readFile(path, "utf8"), { schema: entryListSchema });
	} catch (error) {
		/* v8 ignore next -- fs and js-yaml throw Errors for every failure here; the fallback keeps a hostile value readable */
		return { broken: error instanceof Error ? error.message : String(error) };
	}
	const problem = entryListProblem(rows);
	if (problem !== void 0) return { broken: problem };
	const found = [];
	flattenRows(rows, false, evaluateExpression, found);
	return { rows: found };
}
/**
* Plugin rows of one live standing composition, in Loader-entry order.
* @param tree - the standing mount's entry tree.
* @returns rows with the Loader's evaluated enablement and root-fiber states.
*/
function mountedCompositionRows(tree) {
	const found = [];
	for (const entry of tree.entries()) {
		if (entry.options.group) continue;
		found.push({
			entryId: entry.id,
			moduleName: entry.options.name,
			enabled: !entry.disabled,
			...isJsExpr(entry.options.disabled) ? { condition: entry.options.disabled.__jsExpr } : {},
			...entry.fiber === void 0 ? {} : { fiberState: entry.fiber.state }
		});
	}
	return found;
}
//#endregion
//#region lib/types/session.js
/**
* The session-log record of which preset a session actually runs.
*
* The creation header names the preset a session STARTED with, and it is
* deep-frozen because that is a creation fact. A session may still change
* preset while it is blank, and the effect of that change outlives the blank
* window: the first turn — and every turn after it — runs under the newly
* mounted composition. Recording the change is what keeps the log honest, and
* it is required outright by the repo's model-visible ⟺ logged rule, since the
* preset decides the tool schemas and prompt sections the model sees.
*
* Reconstruction reads the `agentPreset` Session projection, never the header
* alone.
* @module @deepseek-ai/dsh-agent-presets/session
*/
const agentPresetSchema = z$1.union([z$1.string(), z$1.null()]);
/** Current Session preset, initialized from its header and advanced by selection events. */
const agentPresetProjectionDefinition = {
	key: "agentPreset",
	stateSchema: agentPresetSchema,
	init: (header) => header.agentPreset ?? null,
	apply: (state, event) => event.type === "agent-preset/selected" ? event.data.agentPreset : state,
	wire: {
		viewSchema: agentPresetSchema,
		view: (state) => state
	},
	stateVersion: 1
};
//#endregion
//#region lib/types/index.js
/**
* Agent presets: each session composes its model-facing plugin set from one
* preset `cordis.yml`, mounted ONCE per preset under a standing scope and
* joined by every agent that names it.
*
* The standing mount is what makes a preset one composition rather than one
* per session: its plugin instances, tool registrations, prompt sections, and
* projection units exist exactly once, keyed per session inside the plugins
* themselves (they predate presets and were written for a shared world). An
* agent joins by having its scope key parented to the mount's
* ({@link bindScopeParent}), which makes the mount's registrations visible to
* that agent's views and the mount's listeners receive that agent's events —
* and a host reader with no agent at all (a cold transcript read) resolves
* the same standing registrations by preset id.
*
* This package owns the preset vocabulary, filesystem discovery, and the
* guarded standing mount. It does not decide when an agent is created — the
* agent factory's `setup(agentCtx)` hook is the one supported call site,
* because only there is the join installed while the agent is still
* unpublished, so a rejected composition rolls the whole creation back.
* @module @deepseek-ai/dsh-agent-presets
*/
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
		else descriptor[key] = _;
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
/** Settings namespace carrying the user's chosen default preset. */
const SETTINGS_NAMESPACE = "agent-presets";
/** Refuse an empty preset id before invoking a domain operation. */
function validatePresetId(value, field) {
	if (value.length === 0) throw new RemoteError("gateway/bad-request", `${field} must be a non-empty string`, {});
}
/** Runtime schema for the user-writable slice. */
const AgentPresetSettingsSchema = z.object({ default: z.string() });
/**
* Registry over the deployment's agent presets.
*
* Discovery is unmemoized: `list()` and `resolve()` re-read the roots on every
* call so a preset authored while the process runs is visible immediately,
* and a preset deleted underneath a picker disappears from the next read.
*/
let AgentPresets = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _remoteExportList_decorators;
	let _readDocument_decorators;
	let _remoteExportCopy_decorators;
	let _remoteExportDelete_decorators;
	let _select_decorators;
	return class AgentPresets extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_remoteExportList_decorators = [Remote("list")];
			_readDocument_decorators = [Remote("read")];
			_remoteExportCopy_decorators = [Remote("copy")];
			_remoteExportDelete_decorators = [Remote("deletePreset")];
			_select_decorators = [Remote("select")];
			__esDecorate(this, null, _remoteExportList_decorators, {
				kind: "method",
				name: "remoteExportList",
				static: false,
				private: false,
				access: {
					has: (obj) => "remoteExportList" in obj,
					get: (obj) => obj.remoteExportList
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _readDocument_decorators, {
				kind: "method",
				name: "readDocument",
				static: false,
				private: false,
				access: {
					has: (obj) => "readDocument" in obj,
					get: (obj) => obj.readDocument
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _remoteExportCopy_decorators, {
				kind: "method",
				name: "remoteExportCopy",
				static: false,
				private: false,
				access: {
					has: (obj) => "remoteExportCopy" in obj,
					get: (obj) => obj.remoteExportCopy
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _remoteExportDelete_decorators, {
				kind: "method",
				name: "remoteExportDelete",
				static: false,
				private: false,
				access: {
					has: (obj) => "remoteExportDelete" in obj,
					get: (obj) => obj.remoteExportDelete
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _select_decorators, {
				kind: "method",
				name: "select",
				static: false,
				private: false,
				access: {
					has: (obj) => "select" in obj,
					get: (obj) => obj.select
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		config = __runInitializers(this, _instanceExtraInitializers);
		static inject = ["loader", "sessionProjections"];
		/** Runtime schema for the preset roster. */
		static Config = z.object({
			default: z.string().required(),
			roots: z.array(z.object({
				path: z.string().required(),
				trust: z.union(["system", "user"]).default("user")
			})).default([]),
			includeShippedRoot: z.boolean().default(true),
			includeUserRoot: z.boolean().default(true)
		});
		/**
		* The roots discovery and authoring actually scan: the package's shipped
		* root unless `includeShippedRoot` is false, then every configured root in
		* order, then the harness-home user root unless `includeUserRoot` is false.
		*
		* Derived once, because a root set that changed between `list()` and the
		* `copy()` acting on its answer would author into a directory the caller
		* never saw. The shipped root comes FIRST and the user root LAST because an
		* earlier root wins a duplicate id: a shipped preset shadows any directory
		* that claimed its name, and a configured root still shadows a locally
		* authored one.
		*/
		resolvedRoots;
		/**
		* Where a row's package name resolves from: the base URL of the composition
		* this roster was loaded by, which is inside the installed harness.
		*
		* Discovery needs it because a preset's own directory is the wrong base for
		* a package name — a locally authored preset lives under the user's home,
		* where Node's upward `node_modules` walk never reaches the harness's
		* dependencies. The mount already resolves rows this way; holding the same
		* base here is what lets health answer the question before a session does.
		*/
		harnessBase;
		/**
		* The user layer over `config.default`, present only while a settings
		* provider is composed. Held rather than snapshotted so a hot-reloaded
		* document takes effect without a restart.
		*/
		settings;
		/**
		* The settings service behind {@link settings}, held for the one write this
		* service makes: clearing a user default it has just deleted.
		*/
		settingsService;
		/**
		* The service's own untraced context. Methods invoked through the traceable
		* proxy see `this.ctx` rebound to the CALLER's context, which carries a
		* shadow; a subtree minted from it resolves every service through that
		* shadow's fiber instead of each entry's own inject store, so preset rows
		* would fail on the very services they declare. Standing mounts must hang
		* off the untraced original (the `jobs-local` selfCtx precedent).
		*/
		selfCtx;
		constructor(ctx, config) {
			super(ctx, "agentPresets");
			this.config = config;
			this.selfCtx = ctx;
			const { baseUrl } = ctx;
			if (baseUrl === void 0) throw new Error("agent-presets: the roster needs `ctx.baseUrl` to resolve the plugins a composition names; compose it under a Loader, or set the base on the context this plugin is applied to");
			this.harnessBase = baseUrl;
			this.resolvedRoots = [
				...config.includeShippedRoot ? [{
					path: SHIPPED_PRESET_ROOT,
					trust: "system"
				}] : [],
				...config.roots,
				...config.includeUserRoot ? [{
					path: dshHomePath(USER_PRESET_DIR),
					trust: "user"
				}] : []
			];
			ctx.inject(["settings"], (settingsCtx) => {
				this.settings = settingsCtx.settings.register(SETTINGS_NAMESPACE, AgentPresetSettingsSchema, { base: { default: config.default } });
				this.settingsService = settingsCtx.settings;
				settingsCtx.effect(() => () => {
					this.settings = void 0;
					this.settingsService = void 0;
				}, "agentPresets.settings()");
			});
			ctx.sessionProjections.register(agentPresetProjectionDefinition);
			ctx.on("agent/created", ({ agent }) => {
				if (this.resolvedRoots.length === 0) return;
				if (this.composedPreset(agent.ctx) !== void 0) return;
				ctx.logger.warn(`agent "${agent.id}" was published without joining an agent preset; its tools, prompt sections, and skill catalog resolve against the empty global layer (join through AgentPresets.mount() or composeFrom() in the agent factory setup)`);
			});
			ctx.on("session/event", (session, event) => {
				if (event.type !== "agent-preset/selected") return;
				ctx.emit("agent-preset/selected", session.id, event.data.agentPreset);
			});
		}
		/**
		* The preset id mounted when a caller names none.
		*
		* Read per call rather than cached: the settings document is hot-reloaded, so
		* changing the default takes effect on the next session created and leaves
		* every running session on the preset it was composed from.
		*/
		get defaultId() {
			return this.settings?.get().default ?? this.config.default;
		}
		/**
		* Every preset the configured roots currently supply.
		* @returns the presets, first-root-wins per id.
		*/
		async list() {
			return await discoverPresets(this.resolvedRoots, this.harnessBase);
		}
		/**
		* The roster off the Host: {@link list} projected to path-free rows, with
		* the default marked and this deployment's authoring capability beside it.
		*
		* Whether a client can open a preset's directory is the Host's own opener
		* capability, not a roster property — a caller needing both joins them.
		* @returns the rows and the authoring capability.
		*/
		async remoteExportList() {
			const defaultId = this.defaultId;
			return {
				presets: (await this.list()).map((preset) => ({
					id: preset.id,
					trust: preset.trust,
					isDefault: preset.id === defaultId,
					...preset.name === void 0 ? {} : { name: preset.name },
					...preset.description === void 0 ? {} : { description: preset.description },
					...preset.broken === void 0 ? {} : { broken: preset.broken }
				})),
				authorable: this.authorable
			};
		}
		/**
		* Every preset's composition as flattened plugin rows, for plugin-listing
		* surfaces beside the roster's own picker.
		*
		* A preset with a live standing mount answers from its newest generation's
		* Loader entries — the composition new sessions join — even when the file
		* behind it has since been edited into an unreadable state: the mount is
		* what sessions actually run, so the broken verdict only applies to a
		* preset nothing composed. One never composed since boot answers from its
		* file, with `!!js` disabled gates evaluated against the Loader context so
		* both answers reflect the same host. Reading never mounts: an unmounted
		* preset is parsed, not composed, so listing a preset's plugins cannot
		* activate them early. A composition that stopped reading between
		* discovery's health verdict and this read is reported broken with the
		* raced reason rather than dropped.
		* @returns one composition per roster preset, in roster order.
		*/
		async compositionInventory() {
			const defaultId = this.defaultId;
			const evaluateExpression = (expression) => evaluate(this.ctx.loader.ctx, expression);
			const rootFiber = this.ctx.root.fiber;
			const found = [];
			for (const preset of await this.list()) {
				const identity = {
					id: preset.id,
					trust: preset.trust,
					...preset.name === void 0 ? {} : { name: preset.name },
					isDefault: preset.id === defaultId
				};
				const mount = livePresetMounts(rootFiber).findLast((candidate) => candidate.presetId === preset.id);
				if (mount !== void 0) {
					found.push({
						...identity,
						rows: mountedCompositionRows(mount.tree)
					});
					continue;
				}
				if (preset.broken !== void 0) {
					found.push({
						...identity,
						broken: preset.broken,
						rows: []
					});
					continue;
				}
				const read = await fileComposition(preset.path, evaluateExpression);
				found.push("broken" in read ? {
					...identity,
					broken: read.broken,
					rows: []
				} : {
					...identity,
					rows: read.rows
				});
			}
			return found;
		}
		/**
		* Resolve one preset by id.
		*
		* A broken preset resolves — deleting one, reading one, and reporting one
		* all need the row — and the mounting paths refuse it AFTER resolution
		* through {@link resolveMountable}.
		* @param id - the preset id, or `undefined` for {@link defaultId}.
		* @returns the resolved preset.
		* @throws when no configured root supplies that id.
		*/
		async resolve(id) {
			const wanted = id ?? this.defaultId;
			const presets = await this.list();
			const found = presets.find((preset) => preset.id === wanted);
			if (found === void 0) {
				const available = presets.map((preset) => preset.id);
				throw new RemoteError("agent-preset/not-found", `agent-presets: preset "${wanted}" not found (available: ${available.join(", ") || "none"})`, {
					agentPreset: wanted,
					available
				});
			}
			return found;
		}
		/**
		* Resolve one preset that is about to compose an agent, refusing a broken
		* one with its discovery-reported reason. Failing here rather than inside
		* the loader keeps the answer the same for every unloadable shape — ghost
		* directory, unparsable YAML, rowless list — and spends no mount attempt
		* on a composition discovery already read as unusable.
		* @param id - the preset id, or `undefined` for {@link defaultId}.
		* @returns the resolved, mountable preset.
		* @throws when the preset is unknown or discovery reports it broken.
		*/
		async resolveMountable(id) {
			const preset = await this.resolve(id);
			if (preset.broken !== void 0) throw new RemoteError("agent-preset/invalid", `agent-presets: preset "${preset.id}" failed to mount: ${preset.broken}`, {
				agentPreset: preset.id,
				reason: preset.broken
			});
			return preset;
		}
		/**
		* Standing mounts by preset id, single-flight so two agents racing the
		* first use of one preset share one composition. A settled failure is
		* removed so a later session retries a preset whose file has been fixed; a
		* settled success serves until the composition FILE visibly changes — each
		* generation records its file stamp, and a stale stamp starts the next
		* generation for sessions created afterwards. Sessions already joined keep
		* the generation they run on; a superseded one is never disposed while the
		* process lives (reclaimed only by whole-tree teardown), so editing files
		* is bounded by how often compositions change, not by session count.
		*/
		standing = /* @__PURE__ */ new Map();
		/**
		* Parent bindings of the agents this roster composed, keyed by the agent's
		* scope key. The binding is dsh-scope's only re-link capability; holding it
		* here makes this service the sole authority that can move an agent between
		* standing compositions. WeakMap: entries die with their agents.
		*/
		bindings = /* @__PURE__ */ new WeakMap();
		/**
		* Compose one agent from a preset: ensure the preset's standing mount, then
		* parent the agent's scope key to it so the mount's registrations and
		* listeners cover this agent.
		*
		* Call from the agent factory's `setup(agentCtx)`; a rejection there rolls
		* the agent creation back, so a broken preset never yields a half-composed
		* session.
		* @param agentCtx - the agent's scope context.
		* @param id - the preset id, or `undefined` for {@link defaultId}.
		* @returns the preset that was composed, for the caller to record.
		* @throws when the preset is unknown or its composition is unusable.
		*/
		async mount(agentCtx, id) {
			const agentKey = scopeOf(agentCtx);
			if (agentKey === void 0) throw new Error("agent-presets: refusing to compose an unscoped context; the scope key is what joins an agent to its preset");
			const preset = await this.resolveMountable(id);
			const standing = await this.ensureStanding(preset);
			this.bindings.set(agentKey, bindScopeParent(agentKey, standing.key));
			return preset;
		}
		/**
		* Join one agent to the SAME standing composition another already runs on.
		*
		* This is how a child agent inherits its parent's capabilities. It is a bind,
		* not a mount: the parent's generation is already composed, so the child gets
		* that exact instance — the same plugin objects, the same tool registrations,
		* the same prompt sections. Re-resolving the parent's preset by id instead
		* would re-read the roster, and a composition file edited since the parent
		* started would hand the child a DIFFERENT generation than the one its
		* parent's history was produced under (and a preset deleted since would fail
		* the child outright while its parent keeps running).
		*
		* Synchronous, and with no composition failure mode of its own — it reads no
		* roster, mounts nothing, and touches no file — which is what lets a child
		* creation window use it: the two in-process subagent drivers compose their
		* children inside a synchronous `setup`. It still rejects a caller error, as
		* the `@throws` below record.
		*
		* A parent that joined no preset — a rosterless deployment — yields no join
		* and no error: there, the model-facing rows sit in the host composition and
		* the child already sees them through the global layer.
		* @param agentCtx - the joining agent's scope context.
		* @param parentCtx - the scope context of the agent whose composition to join.
		* @returns the preset id joined, or undefined when the parent joined none.
		* @throws when `agentCtx` carries no scope, or has already joined a preset.
		*/
		composeFrom(agentCtx, parentCtx) {
			const agentKey = scopeOf(agentCtx);
			if (agentKey === void 0) throw new Error("agent-presets: refusing to compose an unscoped context; the scope key is what joins an agent to its preset");
			const standing = standingMountFor(parentCtx);
			if (standing === void 0) return void 0;
			this.bindings.set(agentKey, bindScopeParent(agentKey, standing.key));
			return standing.presetId;
		}
		/**
		* The preset one live agent runs on.
		*
		* Read from the live scope chain rather than from the session, so it answers
		* for an agent whose session has not recorded a preset yet — a child agent
		* whose durable header is being built from its parent's composition.
		* @param agentCtx - the agent's scope context.
		* @returns the preset id, or undefined when the agent joined none.
		*/
		composedPreset(agentCtx) {
			return standingMountFor(agentCtx)?.presetId;
		}
		/**
		* The roots this roster scans, which is not `config.roots`: the package's
		* shipped root unless `includeShippedRoot` is false, every configured root
		* in order, then the harness-home user root unless `includeUserRoot` is
		* false. Read this — not the config field — to answer whether a roster is
		* composed at all, so one derivation decides it.
		*/
		get roots() {
			return this.resolvedRoots;
		}
		/** Whether this deployment has a root locally authored presets go to. */
		get authorable() {
			return this.resolvedRoots.some((root) => root.trust === "user");
		}
		/**
		* Read one preset's composition text.
		* @param id - the preset id.
		* @returns the composition exactly as stored.
		* @throws when no configured root supplies that id.
		*/
		async read(id) {
			return await readComposition(await this.resolve(id));
		}
		/**
		* One preset's composition text with the roster row it belongs to.
		* @param agentPreset - the preset id.
		* @returns the composition beside its trust and published metadata.
		* @throws {RemoteError} `gateway/bad-request` for an empty id, or
		* `agent-preset/not-found` when no configured root supplies it.
		*/
		async readDocument(agentPreset) {
			validatePresetId(agentPreset, "agentPreset");
			const preset = await this.resolve(agentPreset);
			return {
				agentPreset: preset.id,
				trust: preset.trust,
				content: await this.read(preset.id),
				...preset.name === void 0 ? {} : { name: preset.name },
				...preset.description === void 0 ? {} : { description: preset.description }
			};
		}
		/**
		* Create a locally authored preset by copying an existing one whole.
		*
		* Copy is the only authoring write. Composition text never crosses this
		* seam: the source is named by id and its directory is copied as it stands,
		* so the copy is exactly as loadable as its source and authoring grants no
		* capability the roster did not already carry. The copy is NOT mounted to
		* validate — a source that mounts today yields a copy that mounts today.
		* @param from - the preset the copy starts from; shipped presets are the
		* primary source, so any trust is accepted.
		* @param id - the new preset's id, which becomes its directory name.
		* @param name - display name for the copy; absent falls back to the id.
		* @throws when the source is unknown, the id is unusable or already taken,
		* or the deployment configures no writable root.
		*/
		async copy(from, id, name) {
			const source = await this.resolve(from);
			if ((await this.list()).some((preset) => preset.id === id)) throw presetExists(id);
			await copyComposition(this.resolvedRoots, source, id, name);
			this.standing.delete(id);
		}
		/**
		* Copy one preset through the Remote API.
		* @param from - the source preset id.
		* @param id - the new preset id.
		* @param name - the copy's optional display name.
		* @returns once the copy is stored.
		* @throws {RemoteError} with the corresponding stable preset code and
		* details when the copy is refused.
		*/
		async remoteExportCopy(from, id, name) {
			validatePresetId(from, "from");
			validatePresetId(id, "agentPreset");
			await this.copy(from, id, name);
		}
		/**
		* Delete a locally authored preset.
		*
		* @param id - the preset id.
		* @throws when the preset is unknown or ships with the deployment.
		*/
		async remove(id) {
			await deleteComposition(this.resolvedRoots, await this.resolve(id));
			this.standing.delete(id);
			if (this.settings?.get().default !== id) return;
			await this.settingsService?.mutate(SETTINGS_NAMESPACE, [{
				op: "unset",
				path: ["default"]
			}]);
		}
		/**
		* Delete one preset through the Remote API.
		* @param id - the preset id.
		* @returns once the preset is deleted.
		* @throws {RemoteError} with the corresponding stable preset code and
		* details when deletion is refused.
		*/
		async remoteExportDelete(id) {
			validatePresetId(id, "agentPreset");
			await this.remove(id);
		}
		/**
		* One agent's instance of a service its preset mounted.
		*
		* A preset publishes services behind `isolate` realms, which are invisible
		* outside the group that declares them — including to the host. This is how a
		* caller holding the agent reads one anyway: a request that is ABOUT a
		* session but arrives from outside it, which is every browser RPC.
		*
		* Read addressing only. A host row that `inject`s a service cannot use this,
		* because injection resolves before any session exists and has no agent to
		* key by; such a service belongs on the host plane instead.
		* @param agent - the agent whose composition to look inside.
		* @param name - the service name as the preset's rows resolve it.
		* @returns the agent's instance, or undefined when its preset mounts none.
		*/
		serviceFor(agent, name) {
			return serviceForAgent(this.ctx, agent, name);
		}
		/**
		* Re-link one agent to a different preset's standing composition.
		*
		* Only valid while the agent has produced nothing: swapping tools mid
		* conversation would leave logged tool calls the new composition cannot
		* make. The CALLER owns that check — this method does not read session
		* history.
		*
		* The swap is a parent re-link, not an unmount: standing mounts are shared
		* and permanent, so the old composition stays for its other agents and the
		* new one is ensured BEFORE the link moves. An unknown or unusable preset
		* therefore throws with the agent exactly as it was — there is no torn-down
		* state to restore. The re-link runs through the binding this roster kept
		* from the agent's mount — dsh-scope's only re-link authority. An agent
		* that never composed one has nothing to re-link: the switch is then the
		* agent's first bind, exactly a mount. A committed re-link emits
		* `tools/change` because changing the parent scope changes the Agent's
		* resolved tool set without adding or removing registry entries.
		* @param agentCtx - the agent's scope context.
		* @param id - the preset to compose the agent from instead.
		* @returns the preset now installed.
		* @throws when the preset is unknown or its composition is unusable.
		*/
		async recompose(agentCtx, id) {
			const agentKey = scopeOf(agentCtx);
			if (agentKey === void 0) throw new Error("agent-presets: refusing to recompose an unscoped context");
			const preset = await this.resolveMountable(id);
			const standing = await this.ensureStanding(preset);
			const binding = this.bindings.get(agentKey);
			if (binding === void 0) this.bindings.set(agentKey, bindScopeParent(agentKey, standing.key));
			else binding.rebind(standing.key);
			try {
				this.ctx.emit("tools/change");
			} catch (error) {
				this.ctx.logger.warn(`agent-presets: tools/change listener failed after recomposing an Agent: ${String(error)}`);
			}
			return preset;
		}
		/**
		* Serializes {@link select} per session. Two concurrent selects would both
		* pass the blank check, and the second re-link would then find the record
		* the first already replaced — leaving two compositions registered into one
		* agent layer. A client's `busy` flag is not enforcement: the wire is
		* reachable directly.
		*
		* Entries hold a failure-swallowing guard rather than the turn itself, so a
		* refused switch does not reject the next caller's chain.
		*/
		switches = /* @__PURE__ */ new Map();
		/**
		* Compose a blank session's agent from a different preset and record it.
		* @param agent - the session's live agent, resolved from the wire identity.
		* @param agentPreset - the preset to compose the agent from instead.
		* @returns the preset id that was recorded.
		* @throws {RemoteError} with `gateway/bad-request`, `agent-preset/locked`,
		* `agent-preset/not-found`, or `agent-preset/invalid` when refused.
		*/
		async select(agent, agentPreset) {
			validatePresetId(agentPreset, "agentPreset");
			const turn = (this.switches.get(agent.id) ?? Promise.resolve()).then(() => this.swap(agent, agentPreset));
			const guard = turn.catch(() => void 0);
			this.switches.set(agent.id, guard);
			try {
				return await turn;
			} finally {
				if (this.switches.get(agent.id) === guard) this.switches.delete(agent.id);
			}
		}
		/** One queued switch: re-check, recompose, then record what the agent runs. */
		async swap(agent, agentPreset) {
			const boundary = this.selfCtx.sessionProjections.stateOf(agent.session, "turnBoundary");
			if (boundary !== void 0 && (boundary.openTurnStartSeq !== null || boundary.lastTurn > 0)) throw new RemoteError("agent-preset/locked", `session "${agent.id}" has already started; its agent preset is fixed`, {
				sessionId: agent.id,
				agentPreset
			});
			const preset = await this.recompose(agent.ctx, agentPreset);
			agent.session.append("agent-preset/selected", { agentPreset: preset.id });
			return preset.id;
		}
		/**
		* The standing scope key of one preset, for a host reader with no agent.
		*
		* A cold transcript read resolves tool presenters against the composition
		* the session recorded, and the standing mount makes that possible without
		* resuming anything: ensuring the mount composes plugins but starts no
		* agent, no session, and no turn.
		* @param id - the preset id, or `undefined` for {@link defaultId}.
		* @returns the standing scope key readers pass as a registry view scope.
		* @throws when the preset is unknown or its composition is unusable.
		*/
		async standingKeyFor(id) {
			const preset = await this.resolveMountable(id);
			return (await this.ensureStanding(preset)).key;
		}
		/** Resolve (or create, single-flight) the standing mount of one preset. */
		async ensureStanding(preset) {
			const pending = this.standing.get(preset.id);
			if (pending !== void 0) {
				const mounted = await pending;
				const current = await compositionStamp(preset.path);
				if (current === void 0 || sameStamp(mounted.stamp, current)) return mounted;
				if (this.standing.get(preset.id) === pending) this.standing.delete(preset.id);
				return this.ensureStanding(preset);
			}
			const created = (async () => {
				const key = { agentPreset: preset.id };
				const scope = createScope(this.selfCtx, key);
				try {
					const stamp = await compositionStamp(preset.path);
					if (stamp === void 0) {
						const reason = `composition file is unreadable: ${preset.path}`;
						throw new RemoteError("agent-preset/invalid", `agent-presets: preset "${preset.id}" failed to mount: ${reason}`, {
							agentPreset: preset.id,
							reason
						});
					}
					await mountPreset(scope.ctx, preset);
					return {
						key,
						scope,
						stamp
					};
				} catch (error) {
					this.standing.delete(preset.id);
					await scope.dispose();
					throw error;
				}
			})();
			this.standing.set(preset.id, created);
			return created;
		}
	};
})();
/** Read one composition file's stamp, or undefined when it cannot be statted. */
async function compositionStamp(path) {
	try {
		const { mtimeMs, size } = await stat(path);
		return {
			mtimeMs,
			size
		};
	} catch {
		return;
	}
}
/** Whether two stamps name the same file state. */
function sameStamp(a, b) {
	return a.mtimeMs === b.mtimeMs && a.size === b.size;
}
//#endregion
export { AgentPresetSettingsSchema, AgentPresets, AgentPresets as default, COMPOSITION_FILE, METADATA_FILE, SETTINGS_NAMESPACE, SHIPPED_PRESET_ROOT, agentPresetProjectionDefinition, copyComposition, deleteComposition, discoverPresets, inactiveRows, leakedServices, livePresetMounts, mountPreset, readComposition, readPresetMetadata, renderPresetMetadata, scanRoot, serviceForAgent, standingMountFor, writableRoot };
