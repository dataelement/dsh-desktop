import { access, lstat, readFile, readdir, stat } from "node:fs/promises";
import { unwatchFile, watchFile } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { homedir } from "node:os";
import chokidar from "chokidar";
import z from "@deepseek-ai/schemastery";
import { parse } from "yaml";
import { canonicalizeWatchPath, resolveDshHome } from "@deepseek-ai/dsh-home-paths";
import { BUNDLED_SKILL_RANK, isSkillName } from "@deepseek-ai/dsh-skill";
//#region lib/types/index.js
/**
* Local filesystem skill provider.
*
* This package is one implementation of the `ctx.skills` provider registry. It
* discovers directory-bundle and flat Markdown skills from project, custom, and
* user roots, parses YAML frontmatter, and loads bodies through `ctx.fs` when a
* filesystem service is present.
*
* @module @deepseek-ai/dsh-skill-filesystem
*/
const PROJECT_DSH_RANK = 100;
const PROJECT_AGENTS_RANK = 200;
const CUSTOM_RANK = 300;
const USER_DSH_RANK = 400;
const USER_AGENTS_RANK = 500;
const DEFAULT_WATCH_STABILITY_THRESHOLD_MS = 200;
const DEFAULT_WATCH_POLL_INTERVAL_MS = 100;
const DEFAULT_WATCH_MAX_PROJECTS = 128;
const name = "skill-filesystem";
const inject = ["skills"];
const Config = z.object({
	providerName: z.string().min(1).default("filesystem"),
	includeDefaultRoots: z.boolean().default(true),
	dshHome: z.string(),
	agentsHome: z.string(),
	customSkillDirs: z.array(z.string()).default([]),
	watch: z.boolean().default(true),
	watchUsePolling: z.boolean().default(false),
	watchStabilityThresholdMs: z.number().default(DEFAULT_WATCH_STABILITY_THRESHOLD_MS),
	watchPollIntervalMs: z.number().default(DEFAULT_WATCH_POLL_INTERVAL_MS),
	watchMaxProjects: z.number().default(DEFAULT_WATCH_MAX_PROJECTS),
	watchFollowSymlinks: z.boolean().default(true),
	bundledSkillDir: z.string()
});
/** Register the local filesystem skill provider on `ctx.skills`. */
function apply(ctx, config = {}) {
	let provider;
	ctx.skills.registerProvider((control) => {
		provider = new FileSystemSkillProvider(ctx, control, config);
		return provider;
	});
	ctx.effect(function* () {
		yield async () => {
			await provider.dispose();
		};
	}, "skill-filesystem watcher");
	ctx.on("fs/observed", (target, _observation, actor) => {
		if (mutationToolName(actor) === void 0) return;
		provider.observeHostMutation(target.displayPath);
	});
}
/** Provider that maps local project/user skill roots into `ctx.skills`. */
var FileSystemSkillProvider = class {
	ctx;
	name;
	includeDefaultRoots;
	dshHome;
	agentsHome;
	customSkillDirs;
	watchManager;
	bundledSkillDir;
	disposal;
	constructor(ctx, control, config = {}) {
		this.ctx = ctx;
		this.name = config.providerName ?? "filesystem";
		this.includeDefaultRoots = config.includeDefaultRoots ?? true;
		this.dshHome = resolveDshHome(config.dshHome);
		this.agentsHome = resolve(config.agentsHome ?? process.env.DSH_AGENTS_HOME ?? join(homedir(), ".agents"));
		this.customSkillDirs = (config.customSkillDirs ?? []).map((root) => resolve(root));
		this.watchManager = new SkillWatchManager(ctx, control.invalidate, resolveWatchConfig(config));
		control.signal.addEventListener("abort", () => {
			this.dispose();
		}, { once: true });
		const bundledSkillDir = config.bundledSkillDir ?? (this.includeDefaultRoots ? process.env.DSH_BUNDLED_SKILL_DIR : void 0);
		this.bundledSkillDir = bundledSkillDir === void 0 ? void 0 : resolve(bundledSkillDir);
	}
	/**
	* Discover local skill summaries for a cwd-sensitive workspace.
	* @param options - lookup options; `cwd` selects the project roots to scan.
	* @returns local provider candidates with stable root ranks; watcher startup
	*   failure returns readable candidates as an incomplete observation.
	*/
	async list(options) {
		const roots = await this.roots(options.cwd);
		let complete = true;
		try {
			await this.watchManager.observeRoots(roots);
		} catch (error) {
			if (this.disposal !== void 0) throw error;
			complete = false;
		}
		const candidates = [];
		for (const root of roots) for (const skill of await discoverRoot(root, this.ctx, this.name)) candidates.push(skill);
		return complete ? candidates : {
			candidates,
			complete
		};
	}
	/**
	* Load a complete local skill body from the candidate's file locator.
	* @param candidate - the winning candidate returned by this provider.
	* @param options - lookup options whose signal cancels filesystem reads.
	* @returns the full local skill, or `undefined` if the file disappeared.
	*/
	async get(candidate, options) {
		const locator = candidate.locator;
		const parsed = await parseSkillFile(locator.path, this.ctx, options.signal, candidate.source === "bundled");
		if (parsed === void 0) return void 0;
		return {
			name: parsed.name,
			description: parsed.description,
			...parsed.whenToUse !== void 0 ? { whenToUse: parsed.whenToUse } : {},
			invocation: parsed.invocation,
			source: candidate.source,
			provider: this.name,
			resourceBase: {
				kind: "directory",
				path: locator.directory
			},
			path: locator.path,
			...parsed.metadata !== void 0 ? { metadata: parsed.metadata } : {},
			content: parsed.content
		};
	}
	/**
	* Invalidate this provider synchronously after a first-party filesystem mutation.
	* @param path - host display path observed after a model-facing write or edit.
	*/
	observeHostMutation(path) {
		this.watchManager.observeHostMutation(path);
	}
	/**
	* Close every host watcher and contain late filesystem callbacks.
	* @returns a shared promise that settles when every watcher reaches quiescence.
	*/
	dispose() {
		this.disposal ??= this.watchManager.dispose();
		return this.disposal;
	}
	async roots(cwd) {
		const roots = [];
		if (this.includeDefaultRoots && cwd !== void 0) {
			const projectRoot = await findProjectRoot(resolve(cwd), optionalFileSystem(this.ctx));
			roots.push({
				path: join(projectRoot, ".dsh/skills"),
				source: "project-dsh",
				rank: PROJECT_DSH_RANK,
				projectRoot
			}, {
				path: join(projectRoot, ".agents/skills"),
				source: "project-agents",
				rank: PROJECT_AGENTS_RANK,
				projectRoot
			});
		}
		roots.push(...this.customSkillDirs.map((path) => ({
			path,
			source: "custom",
			rank: CUSTOM_RANK
		})));
		if (this.includeDefaultRoots) roots.push({
			path: join(this.dshHome, "skills"),
			source: "user-dsh",
			rank: USER_DSH_RANK,
			skipSystem: true
		}, {
			path: join(this.agentsHome, "skills"),
			source: "user-agents",
			rank: USER_AGENTS_RANK
		});
		if (this.bundledSkillDir !== void 0) roots.push({
			path: this.bundledSkillDir,
			source: "bundled",
			rank: BUNDLED_SKILL_RANK,
			trustedHost: true
		});
		return roots;
	}
};
/** Owns bounded host watchers while discovery and reads remain on the filesystem service. */
var SkillWatchManager = class {
	ctx;
	invalidate;
	config;
	roots = /* @__PURE__ */ new Map();
	projects = /* @__PURE__ */ new Map();
	lifecycle = new AbortController();
	closing = false;
	invalidationQueued = false;
	constructor(ctx, invalidate, config) {
		this.ctx = ctx;
		this.invalidate = invalidate;
		this.config = config;
	}
	async observeRoots(roots) {
		if (this.closing) return;
		const projectRoots = /* @__PURE__ */ new Map();
		const pending = [];
		for (const root of roots) {
			if (root.projectRoot === void 0) {
				pending.push(this.retainRoot(root, `shared:${root.path}`));
				continue;
			}
			const grouped = projectRoots.get(root.projectRoot) ?? [];
			grouped.push(root);
			projectRoots.set(root.projectRoot, grouped);
		}
		for (const [projectRoot, grouped] of projectRoots) {
			const owner = `project:${projectRoot}`;
			this.projects.delete(projectRoot);
			const paths = new Set(grouped.map((root) => root.path));
			this.projects.set(projectRoot, paths);
			for (const root of grouped) pending.push(this.retainRoot(root, owner));
		}
		let evictedProject = false;
		while (this.projects.size > this.config.maxProjects) {
			const oldest = this.projects.entries().next();
			/* v8 ignore next -- the loop condition proves one project exists. */
			if (oldest.done) break;
			const [projectRoot, paths] = oldest.value;
			this.projects.delete(projectRoot);
			const owner = `project:${projectRoot}`;
			for (const path of paths) pending.push(this.releaseRoot(path, owner));
			evictedProject = true;
		}
		await Promise.all(pending);
		if (evictedProject) this.invalidate();
	}
	observeHostMutation(path) {
		if (this.closing) return;
		const normalized = resolve(path);
		if (![...this.roots.values()].some((state) => isPotentialSkillPath(state.root, normalized))) return;
		this.invalidate();
	}
	async dispose() {
		this.closing = true;
		this.lifecycle.abort(/* @__PURE__ */ new Error("skill-filesystem watcher disposed"));
		const states = [...this.roots.values()];
		this.roots.clear();
		this.projects.clear();
		await Promise.all(states.map(async (state) => {
			await settleWatcherOpening(state.opening);
			const watcher = state.watcher;
			state.watcher = void 0;
			if (watcher !== void 0) await this.closeWatcher(watcher);
		}));
	}
	async retainRoot(root, owner) {
		let state = this.roots.get(root.path);
		if (state === void 0) {
			state = {
				root,
				owners: /* @__PURE__ */ new Set(),
				watcher: void 0,
				opening: void 0,
				unhealthy: true
			};
			this.roots.set(root.path, state);
		}
		state.owners.add(owner);
		if (this.config.enabled) await this.ensureWatcher(state);
	}
	async releaseRoot(path, owner) {
		const state = this.roots.get(path);
		/* v8 ignore next -- Concurrent cwd observations can evict the same shared root before this release settles. */
		if (state === void 0) return;
		state.owners.delete(owner);
		if (state.owners.size > 0) return;
		this.roots.delete(path);
		await settleWatcherOpening(state.opening);
		const watcher = state.watcher;
		state.watcher = void 0;
		if (watcher !== void 0) await this.closeWatcher(watcher);
	}
	ensureWatcher(state) {
		/* v8 ignore next -- A scheduled rewatch can reach this guard only when teardown wins its await. */
		if (this.closing || !this.config.enabled) return Promise.resolve();
		if (state.opening !== void 0) return state.opening;
		const opening = this.ensureCurrentWatcher(state);
		state.opening = opening;
		opening.then(() => {
			state.opening = void 0;
		}, () => {
			state.opening = void 0;
		});
		return opening;
	}
	async ensureCurrentWatcher(state) {
		const watcher = state.watcher;
		if (watcher !== void 0 && !state.unhealthy) {
			const current = await resolveRootWatchMode(state.root.path, this.config.followSymlinks);
			if (!state.unhealthy && sameWatchMode(watcher.mode, current)) return;
		}
		await this.replaceWatcher(state);
	}
	async replaceWatcher(state) {
		const previous = state.watcher;
		state.watcher = void 0;
		if (previous !== void 0) await this.closeWatcher(previous);
		/* v8 ignore next -- Teardown can win while an unhealthy watcher is still closing. */
		if (this.closing || state.owners.size === 0) return;
		try {
			const watcher = await this.openStableWatcher(state);
			/* v8 ignore next -- The loop returns no handle only when teardown wins between awaited probes. */
			if (watcher === void 0) return;
			/* v8 ignore start -- Post-open teardown is timing-dependent; the disposal race has an explicit integration test. */
			if (this.closing || state.owners.size === 0) {
				await this.closeWatcher(watcher);
				return;
			}
			/* v8 ignore stop */
			state.watcher = watcher;
			state.unhealthy = false;
		} catch (error) {
			if (!this.closing) {
				state.unhealthy = true;
				this.ctx.logger.warn(`skill-filesystem: failed to watch ${state.root.path}: ${errorMessage(error)}`);
			}
			throw error;
		}
	}
	async openStableWatcher(state) {
		while (!this.closing && state.owners.size > 0) {
			const mode = await resolveRootWatchMode(state.root.path, this.config.followSymlinks);
			const watcher = mode.kind === "ancestor" ? this.openAncestorWatcher(state, mode) : await this.openRootWatcher(state, mode);
			/* v8 ignore else -- A host path transition between the two probes is timing-dependent. */
			if (sameWatchMode(mode, await resolveRootWatchMode(state.root.path, this.config.followSymlinks))) return watcher;
			/* v8 ignore next -- Covered by the same host path transition guard. */
			await this.closeWatcher(watcher);
		}
	}
	openAncestorWatcher(state, mode) {
		const listener = (_current, _previous) => {
			this.handleAncestorWatchEvent(state, mode);
		};
		watchFile(mode.nextPath, {
			persistent: false,
			interval: this.config.pollIntervalMs
		}, listener);
		return {
			mode,
			close() {
				unwatchFile(mode.nextPath, listener);
			}
		};
	}
	async handleAncestorWatchEvent(state, mode) {
		let current;
		try {
			current = await resolveRootWatchMode(state.root.path, this.config.followSymlinks);
		} catch (error) {
			/* v8 ignore start -- Non-absence stat failures need a platform permission or I/O fault. */
			if (!this.closing && state.owners.size > 0) this.handleWatcherError(state, error);
			return;
		}
		if (this.closing || state.owners.size === 0 || sameWatchMode(mode, current)) return;
		this.queueInvalidation();
		state.unhealthy = true;
		this.scheduleRewatch(state);
	}
	async openRootWatcher(state, mode) {
		const watcher = chokidar.watch(mode.anchor, {
			persistent: true,
			ignoreInitial: true,
			depth: 1,
			followSymlinks: this.config.followSymlinks,
			atomic: true,
			awaitWriteFinish: {
				stabilityThreshold: this.config.stabilityThresholdMs,
				pollInterval: this.config.pollIntervalMs
			},
			usePolling: this.config.usePolling,
			interval: this.config.pollIntervalMs
		});
		const handle = {
			mode,
			close: () => watcher.close()
		};
		let ready = false;
		const readiness = Promise.withResolvers();
		const signal = this.lifecycle.signal;
		if (signal.aborted) {
			await this.closeWatcher(handle);
			signal.throwIfAborted();
		}
		const onAbort = () => {
			readiness.reject(signal.reason);
		};
		signal.addEventListener("abort", onAbort, { once: true });
		const onError = (error) => {
			if (!ready) {
				readiness.reject(error);
				return;
			}
			this.handleWatcherError(state, error);
		};
		watcher.on("error", onError);
		watcher.once("ready", () => {
			ready = true;
			readiness.resolve(void 0);
		});
		for (const event of [
			"add",
			"addDir",
			"change",
			"unlink",
			"unlinkDir"
		]) watcher.on(event, (path) => {
			this.handleWatchEvent(state, mode, event, path);
		});
		try {
			await readiness.promise;
		} catch (error) {
			await this.closeWatcher(handle);
			throw error;
		} finally {
			signal.removeEventListener("abort", onAbort);
		}
		return handle;
	}
	handleWatchEvent(state, mode, event, path) {
		const target = resolve(path);
		if (this.closing || !isRelevantWatchEvent({
			...state.root,
			path: mode.anchor
		}, event, target)) return;
		this.queueInvalidation();
		if (target === mode.anchor && event === "unlinkDir") {
			state.unhealthy = true;
			this.scheduleRewatch(state);
		}
	}
	handleWatcherError(state, error) {
		if (this.closing) return;
		this.ctx.logger.warn(`skill-filesystem: watcher for ${state.root.path} failed: ${errorMessage(error)}`);
		state.unhealthy = true;
		this.queueInvalidation();
		this.scheduleRewatch(state);
	}
	scheduleRewatch(state) {
		const currentOpening = state.opening ?? Promise.resolve();
		(async () => {
			await settleWatcherOpening(currentOpening);
			try {
				await this.ensureWatcher(state);
			} catch {
				return;
			}
			this.queueInvalidation();
		})();
	}
	queueInvalidation() {
		if (this.closing || this.invalidationQueued) return;
		this.invalidationQueued = true;
		queueMicrotask(() => {
			this.invalidationQueued = false;
			/* v8 ignore next -- Effect teardown can win this queued microtask before provider disposal emits. */
			if (this.closing) return;
			this.invalidate();
		});
	}
	async closeWatcher(watcher) {
		try {
			await watcher.close();
		} catch (error) {
			this.ctx.logger.warn(`skill-filesystem: failed to close watcher: ${errorMessage(error)}`);
		}
	}
};
async function settleWatcherOpening(opening) {
	if (opening === void 0) return;
	try {
		await opening;
	} catch {}
}
function resolveWatchConfig(config) {
	const stabilityThresholdMs = config.watchStabilityThresholdMs ?? DEFAULT_WATCH_STABILITY_THRESHOLD_MS;
	const pollIntervalMs = config.watchPollIntervalMs ?? DEFAULT_WATCH_POLL_INTERVAL_MS;
	const maxProjects = config.watchMaxProjects ?? DEFAULT_WATCH_MAX_PROJECTS;
	assertPositiveInteger("watchStabilityThresholdMs", stabilityThresholdMs);
	assertPositiveInteger("watchPollIntervalMs", pollIntervalMs);
	assertPositiveInteger("watchMaxProjects", maxProjects);
	return {
		enabled: config.watch ?? true,
		usePolling: config.watchUsePolling ?? false,
		stabilityThresholdMs,
		pollIntervalMs,
		maxProjects,
		followSymlinks: config.watchFollowSymlinks ?? true
	};
}
async function resolveRootWatchMode(root, followSymlinks) {
	let candidate = root;
	while (true) {
		try {
			if ((await stat(candidate)).isDirectory()) {
				const anchor = candidate === root && !followSymlinks && (await lstat(candidate)).isSymbolicLink() ? resolve(candidate) : await canonicalizeWatchPath(candidate);
				if (candidate === root) return {
					kind: "root",
					anchor
				};
				const firstSegment = relative(candidate, root).split(sep)[0];
				/* v8 ignore next -- candidate is a strict ancestor of root. */
				if (firstSegment === void 0 || firstSegment.length === 0) return {
					kind: "root",
					anchor
				};
				return {
					kind: "ancestor",
					anchor,
					nextPath: join(anchor, firstSegment)
				};
			}
		} catch (error) {
			/* v8 ignore next -- Non-absence stat failures are platform/permission-specific and propagate as incomplete discovery. */
			if (!isAbsentPathError(error)) throw error;
		}
		const parent = dirname(candidate);
		/* v8 ignore next -- Traversal reaches the existing filesystem root before this fallback. */
		if (parent === candidate) return {
			kind: "ancestor",
			anchor: candidate,
			nextPath: root
		};
		candidate = parent;
	}
}
function sameWatchMode(left, right) {
	return left.kind === right.kind && left.anchor === right.anchor && (left.kind === "root" || right.kind === "ancestor" && left.nextPath === right.nextPath);
}
function isRelevantWatchEvent(root, event, path) {
	const segments = containedSegments(root.path, path);
	if (segments === void 0) return false;
	if (segments.length === 0) return event === "addDir" || event === "unlinkDir";
	if (root.skipSystem === true && segments[0] === ".system") return false;
	if (segments.length === 1) {
		if (event === "addDir" || event === "unlinkDir") return true;
		return segments[0]?.endsWith(".md") === true;
	}
	return segments.length === 2 && segments[1] === "SKILL.md" && event !== "addDir" && event !== "unlinkDir";
}
function isPotentialSkillPath(root, path) {
	const segments = containedSegments(root.path, path);
	if (segments === void 0 || segments.length === 0 || segments.length > 2) return false;
	if (root.skipSystem === true && segments[0] === ".system") return false;
	return segments.length === 1 ? segments[0]?.endsWith(".md") === true : segments[1] === "SKILL.md";
}
function containedSegments(root, path) {
	const child = relative(root, path);
	if (child.length === 0) return [];
	if (child === ".." || child.startsWith(`..${sep}`) || isAbsolute(child)) return void 0;
	return child.split(sep);
}
function mutationToolName(actor) {
	if (actor === void 0 || !("name" in actor)) return void 0;
	const value = actor.name;
	return value === "edit" || value === "write" ? value : void 0;
}
function assertPositiveInteger(field, value) {
	if (!Number.isInteger(value) || value < 1) throw new TypeError(`skill-filesystem: ${field} must be a positive integer`);
}
function isAbsentPathError(error) {
	return hasErrorCode(error, "ENOENT") || hasErrorCode(error, "ENOTDIR");
}
function isAbsentSkillPathError(error) {
	return isAbsentPathError(error) || hasErrorCode(error, "FS_NOT_FOUND") || hasErrorCode(error, "FS_NOT_DIRECTORY");
}
function hasErrorCode(error, code) {
	return typeof error === "object" && error !== null && "code" in error && error.code === code;
}
async function discoverRoot(root, ctx, provider) {
	const skills = [];
	const entries = await listSkillRootEntries(root, ctx);
	for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
		if (root.skipSystem && entry.name === ".system") continue;
		const locator = entry.type === "directory" ? {
			path: join(entry.path, "SKILL.md"),
			directory: entry.path
		} : entry.type === "file" && entry.name.endsWith(".md") ? {
			path: entry.path,
			directory: root.path
		} : void 0;
		if (locator === void 0) continue;
		const parsed = await parseSkillFile(locator.path, ctx, void 0, root.trustedHost === true);
		if (parsed === void 0) continue;
		skills.push({
			name: parsed.name,
			description: parsed.description,
			...parsed.whenToUse !== void 0 ? { whenToUse: parsed.whenToUse } : {},
			invocation: parsed.invocation,
			provider,
			source: root.source,
			rank: root.rank,
			locator,
			resourceBase: {
				kind: "directory",
				path: locator.directory
			},
			path: locator.path,
			...parsed.metadata !== void 0 ? { metadata: parsed.metadata } : {}
		});
	}
	return skills;
}
async function listSkillRootEntries(root, ctx) {
	const fs = optionalFileSystem(ctx);
	if (fs !== void 0 && root.trustedHost !== true) return await listSkillRootEntriesFromFileSystem(root, fs);
	return await listSkillRootEntriesFromNode(root, ctx);
}
async function listSkillRootEntriesFromFileSystem(root, fs) {
	try {
		return (await fsListDir(fs, root.path)).map(entryFromFs);
	} catch (error) {
		if (isAbsentSkillPathError(error)) return [];
		throw error;
	}
}
async function fsListDir(fs, path) {
	const target = await fs.resolve(path);
	return await fs.listDir(target);
}
function entryFromFs(entry) {
	return {
		name: entry.name,
		type: entry.type,
		path: entry.target.displayPath
	};
}
async function listSkillRootEntriesFromNode(root, ctx) {
	let entries;
	try {
		entries = await readdir(root.path, {
			withFileTypes: true,
			encoding: "utf8"
		});
	} catch (error) {
		/* v8 ignore else -- Native non-absence directory failures are provider-dependent; the ctx.fs path pins incomplete discovery. */
		if (isAbsentSkillPathError(error)) return [];
		/* v8 ignore next -- Same native error branch as above. */
		throw error;
	}
	const result = [];
	for (const entry of entries) {
		const path = join(root.path, entry.name);
		const type = await nodeEntryKind(path, entry, ctx);
		result.push({
			name: entry.name,
			type: type ?? "other",
			path
		});
	}
	return result;
}
async function parseSkillFile(path, ctx, signal, trustedHost = false) {
	const raw = await readSkillText(ctx, path, signal, trustedHost);
	signal?.throwIfAborted();
	if (raw === void 0) return;
	let parsed;
	try {
		parsed = parseFrontmatter(raw);
	} catch (error) {
		ctx.logger.warn(`skill file ${path} ignored: invalid YAML frontmatter: ${errorMessage(error)}`);
		return;
	}
	if (!parsed) {
		ctx.logger.warn(`skill file ${path} ignored: missing YAML frontmatter`);
		return;
	}
	const name = stringField(parsed.data, "name");
	const description = stringField(parsed.data, "description");
	if (name === void 0 || description === void 0) {
		ctx.logger.warn(`skill file ${path} ignored: frontmatter requires name and description`);
		return;
	}
	if (!isSkillName(name)) {
		ctx.logger.warn(`skill file ${path} ignored: invalid skill name "${name}"`);
		return;
	}
	let invocation;
	try {
		invocation = parseInvocationPolicy(parsed.data);
	} catch (error) {
		ctx.logger.warn(`skill file ${path} ignored: invalid invocation frontmatter: ${errorMessage(error)}`);
		return;
	}
	return {
		name,
		description,
		...optionalString(parsed.data, "whenToUse"),
		invocation,
		...optionalMetadata(parsed.data),
		content: parsed.body.trim()
	};
}
function optionalFileSystem(ctx) {
	return ctx.get("fs");
}
async function readSkillText(ctx, path, signal, trustedHost = false) {
	signal?.throwIfAborted();
	const fs = optionalFileSystem(ctx);
	if (fs !== void 0 && !trustedHost) return await readSkillTextFromFileSystem(ctx, fs, path, signal);
	try {
		return await readFile(path, {
			encoding: "utf8",
			signal
		});
	} catch (error) {
		signal?.throwIfAborted();
		if (isAbsentSkillPathError(error)) return void 0;
		throw error;
	}
}
async function readSkillTextFromFileSystem(ctx, fs, path, signal) {
	signal?.throwIfAborted();
	let target;
	try {
		target = await fs.resolve(path);
	} catch (error) {
		if (isAbsentSkillPathError(error)) return void 0;
		throw error;
	}
	signal?.throwIfAborted();
	let info;
	try {
		info = await fs.stat(target, signal);
	} catch (error) {
		signal?.throwIfAborted();
		if (isAbsentSkillPathError(error)) return void 0;
		throw error;
	}
	if (info === void 0 || info.type !== "file") return void 0;
	try {
		return await fs.readText(target, signal);
	} catch (error) {
		signal?.throwIfAborted();
		if (isAbsentSkillPathError(error)) return void 0;
		if (!hasErrorCode(error, "FS_NOT_TEXT")) throw error;
		ctx.logger.warn(`skill file ${path} ignored: ${fsReadErrorMessage(target, error)}`);
		return;
	}
}
function fsReadErrorMessage(target, error) {
	return `failed to read text file at ${target.displayPath}: ${errorMessage(error)}`;
}
async function nodeEntryKind(fullPath, entry, ctx) {
	if (entry.isDirectory()) return "directory";
	if (entry.isFile()) return "file";
	/* v8 ignore next -- Non-file directory entries such as FIFOs are platform-specific and intentionally skipped. */
	if (!entry.isSymbolicLink()) return void 0;
	try {
		const info = await stat(fullPath);
		if (info.isDirectory()) return "directory";
		/* v8 ignore else -- the special-file symlink branch relies on POSIX /dev/null. */
		if (info.isFile()) return "file";
		/* v8 ignore next -- The special-file symlink fixture relies on POSIX /dev/null. */
		return;
	} catch (error) {
		ctx.logger.warn(`skill entry ${fullPath} ignored: failed to follow symbolic link: ${errorMessage(error)}`);
		return;
	}
}
function parseFrontmatter(raw) {
	const firstLineEnd = raw.indexOf("\n");
	if (firstLineEnd < 0) return void 0;
	if (raw.slice(0, firstLineEnd).replace(/\r$/, "") !== "---") return void 0;
	const start = firstLineEnd + 1;
	const closing = findClosingFrontmatter(raw, start);
	if (closing === void 0) return void 0;
	const parsed = parse(raw.slice(start, closing.start));
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return void 0;
	return {
		data: parsed,
		body: raw.slice(closing.bodyStart)
	};
}
function findClosingFrontmatter(raw, start) {
	let lineStart = start;
	while (lineStart <= raw.length) {
		const nextNewline = raw.indexOf("\n", lineStart);
		const lineEnd = nextNewline < 0 ? raw.length : nextNewline;
		if (raw.slice(lineStart, lineEnd).replace(/\r$/, "") === "---") return {
			start: lineStart,
			bodyStart: nextNewline < 0 ? raw.length : nextNewline + 1
		};
		if (nextNewline < 0) return void 0;
		lineStart = nextNewline + 1;
	}
}
async function findProjectRoot(cwd, fs) {
	let current = cwd;
	while (true) {
		if (await pathExists(join(current, ".git"), fs)) return current;
		const parent = dirname(current);
		if (parent === current) return cwd;
		current = parent;
	}
}
async function pathExists(path, fs) {
	if (fs !== void 0) return await pathExistsInFileSystem(path, fs);
	return await pathExistsInNode(path);
}
async function pathExistsInFileSystem(path, fs) {
	let target;
	try {
		target = await fs.resolve(path);
	} catch {
		return false;
	}
	try {
		return await fs.stat(target) !== void 0;
	} catch {
		return false;
	}
}
async function pathExistsInNode(path) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}
function stringField(data, key) {
	const value = data[key];
	return typeof value === "string" && value.length > 0 ? value : void 0;
}
function optionalString(data, key) {
	const value = data[key];
	return typeof value === "string" && value.length > 0 ? { [key]: value } : {};
}
function parseInvocationPolicy(data) {
	rejectLegacyInvocationKey(data, "disableModelInvocation", "disable-model-invocation");
	rejectLegacyInvocationKey(data, "modelInvocable", "disable-model-invocation");
	rejectLegacyInvocationKey(data, "userInvocable", "user-invocable");
	const disableModelInvocation = frontmatterBoolean(data, "disable-model-invocation");
	const userInvocable = frontmatterBoolean(data, "user-invocable");
	return {
		modelInvocable: disableModelInvocation !== true,
		userInvocable: userInvocable !== false
	};
}
function rejectLegacyInvocationKey(data, legacy, canonical) {
	if (Object.hasOwn(data, legacy)) throw new Error(`frontmatter field "${legacy}" is unsupported; use "${canonical}"`);
}
function frontmatterBoolean(data, key) {
	if (!Object.hasOwn(data, key)) return void 0;
	const value = data[key];
	if (typeof value === "boolean") return value;
	if (value === 1 || value === "1") return true;
	if (value === 0 || value === "0") return false;
	if (typeof value === "string") switch (value.toLowerCase()) {
		case "true":
		case "yes":
		case "on": return true;
		case "false":
		case "no":
		case "off": return false;
	}
	throw new TypeError(`frontmatter field "${key}" must be a boolean`);
}
function optionalMetadata(data) {
	const value = data.metadata;
	if (typeof value === "object" && value !== null && !Array.isArray(value)) return { metadata: value };
	return {};
}
function errorMessage(error) {
	return String(error);
}
//#endregion
export { Config, FileSystemSkillProvider, apply, inject, name };
