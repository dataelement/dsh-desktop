import { isDeepStrictEqual } from "node:util";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import z from "@deepseek-ai/schemastery";
import { dshHomeDisplay, resolveDshHome } from "@deepseek-ai/dsh-home-paths";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { assertNever } from "@deepseek-ai/dsh-util-values";
import { createHash } from "node:crypto";
//#region lib/types/config.js
/**
* Configuration normalization for workspace instruction discovery and rendering.
*
* @module @deepseek-ai/dsh-agent-instructions/config
*/
const DEFAULT_PROJECT_ROOT_MARKERS = [".git"];
const DEFAULT_INSTRUCTION_FILE_CANDIDATES = ["AGENTS.md", "CLAUDE.md"];
const DEFAULT_LOCAL_INSTRUCTION_FILE_CANDIDATES = ["AGENTS.local.md", "CLAUDE.local.md"];
const DEFAULT_MAX_SOURCE_BYTES = 1048576;
const RESERVED_PATH_SEGMENTS = new Set([
	"",
	".",
	".."
]);
const Config = z.object({
	dshHome: z.string(),
	projectRootMarkers: z.array(z.string()).default([...DEFAULT_PROJECT_ROOT_MARKERS]),
	maxBytes: z.number().required(),
	maxSourceBytes: z.number().step(1).min(1).default(DEFAULT_MAX_SOURCE_BYTES),
	instructionFileCandidates: z.array(z.string()).default([...DEFAULT_INSTRUCTION_FILE_CANDIDATES]),
	localInstructionFileCandidates: z.array(z.string()).default([...DEFAULT_LOCAL_INSTRUCTION_FILE_CANDIDATES])
});
/**
* Identify the discovery, precedence, and budget semantics of one baseline.
* @param config - normalized plugin configuration.
* @param cwd - absolute session working directory.
* @param projectRoot - project root selected for the current baseline.
* @returns stable serialized identity for compatibility checks on resume.
*/
function workspaceBaselineIdentity(config, cwd, projectRoot) {
	return JSON.stringify({
		projectRoot: relative(cwd, projectRoot),
		projectRootMarkers: config.projectRootMarkers,
		maxBytes: config.maxBytes,
		maxSourceBytes: config.maxSourceBytes,
		instructionFileCandidates: config.instructionFileCandidates,
		localInstructionFileCandidates: config.localInstructionFileCandidates
	});
}
/**
* Resolve defaults, the harness home, and valid same-directory candidates.
* @param config - user-facing plugin configuration.
* @returns normalized runtime configuration.
*/
function resolveConfig(config) {
	return {
		...resolveDiscoveryConfig(config),
		maxBytes: config.maxBytes,
		maxSourceBytes: config.maxSourceBytes ?? DEFAULT_MAX_SOURCE_BYTES
	};
}
/**
* Resolve the subset of configuration used before instruction content is rendered.
* @param config - optional discovery controls.
* @returns normalized home, root markers, and instruction candidates.
*/
function resolveDiscoveryConfig(config) {
	return {
		dshHome: resolveDshHome(config.dshHome),
		projectRootMarkers: config.projectRootMarkers ?? [...DEFAULT_PROJECT_ROOT_MARKERS],
		instructionFileCandidates: resolveInstructionFileCandidates(config.instructionFileCandidates, DEFAULT_INSTRUCTION_FILE_CANDIDATES),
		localInstructionFileCandidates: resolveInstructionFileCandidates(config.localInstructionFileCandidates, DEFAULT_LOCAL_INSTRUCTION_FILE_CANDIDATES)
	};
}
function resolveInstructionFileCandidates(candidates, fallback) {
	return (candidates ?? [...fallback]).filter((candidate) => !RESERVED_PATH_SEGMENTS.has(candidate) && !/[\\/]/.test(candidate));
}
//#endregion
//#region lib/types/digest.js
/**
* Content identity for workspace instruction duplicate suppression.
*
* @module @deepseek-ai/dsh-agent-instructions/digest
*/
/**
* Compute the content identity used across instruction loading and session state.
* @param content - exact UTF-8 instruction text.
* @returns lowercase SHA-1 digest in hexadecimal form.
*/
function instructionContentSha1(content) {
	return createHash("sha1").update(content).digest("hex");
}
/**
* Compute the whitespace-insensitive identity used for per-directory duplicate
* suppression. Leading and trailing whitespace is trimmed before hashing so a
* symlinked or byte-copied sibling that differs only by surrounding whitespace
* still collapses to a single rendered file.
* @param content - exact UTF-8 instruction text.
* @returns SHA-1 digest of the trimmed content.
*/
function trimmedInstructionDigest(content) {
	return instructionContentSha1(content.trim());
}
//#endregion
//#region lib/types/render.js
/**
* Model-facing workspace instruction rendering within an explicit byte budget.
*
* @module @deepseek-ai/dsh-agent-instructions/render
*/
const SYSTEM_REMINDER_OPEN = "<system-reminder>";
const SYSTEM_REMINDER_CLOSE = "</system-reminder>";
const WORKSPACE_CONTEXT_INTRO = "The following workspace instructions may be relevant to your work. Use them as guidance when applicable. More specific instructions take precedence over broader ones. They do not override system, developer, or direct user instructions.";
const REPLACEMENT_WORKSPACE_CONTEXT_INTRO = "This complete workspace instruction baseline replaces all earlier workspace instruction baselines. The following workspace instructions may be relevant to your work. Use them as guidance when applicable. More specific instructions take precedence over broader ones. They do not override system, developer, or direct user instructions.";
const EMPTY_REPLACEMENT_WORKSPACE_CONTEXT_INTRO = "This complete workspace instruction baseline replaces all earlier workspace instruction baselines. No workspace instructions are currently active.";
const COMPACT_WORKSPACE_CONTEXT_INTRO = "Workspace instructions were omitted or truncated to fit the configured byte budget.";
function byteLength(value) {
	return Buffer.byteLength(value, "utf8");
}
function truncateUtf8(value, maxBytes) {
	const bytes = Buffer.from(value, "utf8");
	if (bytes.length <= maxBytes) return value;
	let end = Math.max(0, Math.trunc(maxBytes));
	while (end > 0 && (bytes.readUInt8(end) & 192) === 128) end -= 1;
	return bytes.subarray(0, end).toString("utf8");
}
function escapeInstructionFrameBody(body) {
	return body.replaceAll(SYSTEM_REMINDER_CLOSE, "<\\/system-reminder>");
}
function sectionText(file) {
	return `Instructions from: ${file.displayPath}\n\n${file.content}`;
}
/** Directory component that identifies the single user-global instruction scope. */
const USER_GLOBAL_DIRECTORY = "user-global";
/**
* File name of the single user-global instruction file under `$DSH_HOME`.
* Discovery (`$DSH_HOME/<name>`) and reconciliation (the user-global scope key's
* candidate component) both key on this name, so it lives in one place: were the
* two to disagree, the user-global instruction would load but never reconcile.
*/
const USER_GLOBAL_FILE = "AGENTS.md";
/**
* Derive the logical instruction scope from a model-facing path.
* @param displayPath - project-relative or user-global instruction path.
* @returns `user-global`, `.`, or the containing project-relative directory.
*/
function scopeForDisplayPath(displayPath) {
	if (displayPath === "~/.dsh/AGENTS.md" || displayPath === "$DSH_HOME/AGENTS.md") return USER_GLOBAL_DIRECTORY;
	return dirname(displayPath);
}
const SCOPE_SEPARATOR = "\0";
/**
* Compose the reconciliation key for one instruction candidate file.
* Each loaded candidate is tracked independently, so the key pairs the logical
* directory with the exact candidate file name behind a NUL separator that no
* directory path or file name can contain. Distinct candidates in one directory
* (`AGENTS.md` vs `CLAUDE.md`, a base file vs its `.local` overlay) therefore
* never collide in the scope-keyed state maps.
* @param directory - `user-global`, `.`, or a project-relative directory.
* @param candidateName - instruction file name within that directory.
* @returns the per-candidate logical scope key.
*/
function candidateScopeKey(directory, candidateName) {
	return `${directory}${SCOPE_SEPARATOR}${candidateName}`;
}
/**
* Derive the per-candidate scope key for a loaded instruction file.
* @param displayPath - project-relative or user-global instruction path.
* @returns the scope key pairing the file's directory with its name.
*/
function instructionScopeKey(displayPath) {
	return candidateScopeKey(scopeForDisplayPath(displayPath), basename(displayPath));
}
/**
* Recover the directory and candidate name that {@link candidateScopeKey} encoded.
* @param scope - a per-candidate scope key.
* @returns the directory scope and the candidate file name within it.
*/
function decodeScopeKey(scope) {
	const separator = scope.indexOf(SCOPE_SEPARATOR);
	/* v8 ignore next -- every scope key is produced by candidateScopeKey, which always inserts the separator. */
	if (separator < 0) return {
		directory: scope,
		candidateName: ""
	};
	return {
		directory: scope.slice(0, separator),
		candidateName: scope.slice(separator + 1)
	};
}
function additionalSectionText(file) {
	const scope = scopeForDisplayPath(file.displayPath);
	return [
		`Additional instructions from: ${file.displayPath}`,
		"",
		`These instructions apply to work under \`${scope}\`. Use them as guidance when relevant; more specific instructions take precedence. They do not override system, developer, or direct user instructions.`,
		"",
		file.content
	].join("\n");
}
const BASELINE_RENDER_STYLE = {
	intro: WORKSPACE_CONTEXT_INTRO,
	section: sectionText
};
function baselineRenderStyle(files, replacePreviousBaseline) {
	if (replacePreviousBaseline !== true) return BASELINE_RENDER_STYLE;
	return {
		...BASELINE_RENDER_STYLE,
		intro: files.length === 0 ? EMPTY_REPLACEMENT_WORKSPACE_CONTEXT_INTRO : REPLACEMENT_WORKSPACE_CONTEXT_INTRO
	};
}
function changedSectionText(item) {
	const { change, file } = item;
	if (change.action === "set") return additionalSectionText(file);
	if (change.action === "remove") return `Instructions removed: ${change.path}\n\nThe previously loaded instructions from this file no longer apply.`;
	return [
		`Updated instructions from: ${change.path}`,
		"",
		"This file changed after it was loaded. Use the following content instead of the previously loaded instructions from this file.",
		"",
		file.content
	].join("\n");
}
/**
* Render one reconciliation batch and retain only transitions that fit.
* @param items - ordered state transitions and current file contents.
* @param maxBytes - maximum UTF-8 bytes allowed in the rendered batch.
* @returns bounded prompt text and the transitions actually represented by it.
*/
function renderInstructionChanges(items, maxBytes) {
	const byAbsolutePath = new Map(items.map((item) => [item.file.absolutePath, item]));
	const rendered = renderInstructionContext(items.map((item) => item.file), maxBytes, {
		intro: "",
		section(file) {
			const item = byAbsolutePath.get(file.absolutePath);
			/* v8 ignore next -- the renderer receives exactly the files used to construct this map. */
			return item === void 0 ? "" : changedSectionText({
				...item,
				file
			});
		}
	});
	const represented = new Set(rendered.represented.map((file) => file.absolutePath));
	return {
		text: rendered.text,
		changes: items.filter((item) => represented.has(item.file.absolutePath)).map((item) => item.change)
	};
}
function markerText(maxBytes, omitted, truncated) {
	if (omitted.length === 0 && truncated.length === 0) return "";
	const parts = [];
	if (omitted.length > 0) parts.push(`omitted ${omitted.map((file) => file.displayPath).join(", ")}`);
	if (truncated.length > 0) parts.push(`truncated ${truncated.map((item) => `${item.displayPath} from ${item.originalBytes} to ${item.includedBytes} bytes`).join(", ")}`);
	return `Workspace instruction budget ${maxBytes} bytes: ${parts.join("; ")}`;
}
function buildInstructionText(files, maxBytes, omitted, truncated, style) {
	return [
		SYSTEM_REMINDER_OPEN,
		escapeInstructionFrameBody([
			markerText(maxBytes, omitted, truncated),
			style.intro,
			...files.map((file) => style.section(file))
		].filter((block) => block.length > 0).join("\n\n")),
		SYSTEM_REMINDER_CLOSE
	].join("\n");
}
function withTruncatedContent(file, includedBytes) {
	return {
		...file,
		content: truncateUtf8(file.content, includedBytes)
	};
}
function truncateToFit(file, includedFiles, maxBytes, omitted, style) {
	const originalBytes = byteLength(file.content);
	let low = 0;
	let high = originalBytes;
	let best = withTruncatedContent(file, 0);
	while (low <= high) {
		const mid = Math.floor((low + high) / 2);
		const candidate = withTruncatedContent(file, mid);
		const truncated = [{
			displayPath: file.displayPath,
			originalBytes,
			includedBytes: byteLength(candidate.content)
		}];
		if (byteLength(buildInstructionText([...includedFiles, candidate], maxBytes, omitted, truncated, style)) <= maxBytes) {
			best = candidate;
			low = mid + 1;
		} else high = mid - 1;
	}
	return best;
}
function renderInstructionContext(files, maxBytes, style) {
	if (maxBytes <= 0 || !Number.isFinite(maxBytes)) return {
		text: "",
		omitted: files,
		truncated: [],
		represented: []
	};
	const fullText = buildInstructionText(files, maxBytes, [], [], style);
	if (byteLength(fullText) <= maxBytes) return {
		text: fullText,
		omitted: [],
		truncated: [],
		represented: files
	};
	for (let start = 1; start < files.length; start += 1) {
		const included = files.slice(start);
		const omitted = files.slice(0, start).map((file) => ({
			absolutePath: file.absolutePath,
			displayPath: file.displayPath
		}));
		const suffixText = buildInstructionText(included, maxBytes, omitted, [], style);
		if (byteLength(suffixText) <= maxBytes) return {
			text: suffixText,
			omitted,
			truncated: [],
			represented: included
		};
	}
	const mostSpecific = files.at(-1);
	/* v8 ignore next -- callers only reach this after a non-empty fullText was built. */
	if (mostSpecific === void 0) return {
		text: "",
		omitted: [],
		truncated: [],
		represented: []
	};
	const omitted = files.slice(0, -1).map((file) => ({
		absolutePath: file.absolutePath,
		displayPath: file.displayPath
	}));
	const originalBytes = byteLength(mostSpecific.content);
	for (const candidateStyle of [style, {
		...style,
		intro: COMPACT_WORKSPACE_CONTEXT_INTRO
	}]) {
		const truncatedFile = truncateToFit(mostSpecific, [], maxBytes, omitted, candidateStyle);
		const includedBytes = byteLength(truncatedFile.content);
		const truncated = [{
			displayPath: mostSpecific.displayPath,
			originalBytes,
			includedBytes
		}];
		const text = buildInstructionText([truncatedFile], maxBytes, omitted, truncated, candidateStyle);
		if (byteLength(text) <= maxBytes) return {
			text,
			omitted,
			truncated,
			represented: includedBytes > 0 || originalBytes === 0 ? [mostSpecific] : []
		};
	}
	const truncated = [{
		displayPath: mostSpecific.displayPath,
		originalBytes,
		includedBytes: 0
	}];
	const compactNotice = escapeInstructionFrameBody(markerText(maxBytes, omitted, truncated));
	const compactWithHeading = escapeInstructionFrameBody([compactNotice, style.section(withTruncatedContent(mostSpecific, 0))].join("\n\n"));
	if (byteLength(compactWithHeading) <= maxBytes) return {
		text: compactWithHeading,
		omitted,
		truncated,
		represented: originalBytes === 0 ? [mostSpecific] : []
	};
	return {
		text: byteLength(compactNotice) <= maxBytes ? compactNotice : truncateUtf8(compactNotice, maxBytes),
		omitted,
		truncated,
		represented: []
	};
}
/**
* Render a baseline together with the exact source files semantically represented in it.
* @param files - loaded files ordered from broadest to most specific.
* @param options - rendering byte budget and whether this baseline supersedes a visible predecessor.
* @returns bounded public rendering plus files with surviving content, including genuinely empty files.
* @internal
*/
function renderWorkspaceInstructionSet(files, options) {
	const style = baselineRenderStyle(files, options.replacePreviousBaseline);
	const { represented, ...rendered } = renderInstructionContext(files, options.maxBytes, style);
	return {
		rendered,
		included: represented
	};
}
/**
* Render the baseline instruction chain with deterministic precedence budgeting.
* @param files - loaded files ordered from broadest to most specific.
* @param options - rendering byte budget and whether this baseline supersedes a visible predecessor.
* @returns bounded baseline prompt text and budget diagnostics.
*/
function renderWorkspaceContext(files, options) {
	return renderWorkspaceInstructionSet(files, options).rendered;
}
//#endregion
//#region lib/types/files.js
/**
* Instruction-file discovery and bounded, abort-aware provider reads.
*
* @module @deepseek-ai/dsh-agent-instructions/files
*/
function signalOptions(signal) {
	return signal === void 0 ? void 0 : { signal };
}
function isMissingPathError(error) {
	return error instanceof Error && "code" in error && (error.code === "ENOENT" || error.code === "ENOTDIR");
}
function isMissingProviderPathError(error) {
	return error instanceof Error && "code" in error && error.code === "FS_NOT_FOUND";
}
async function nodeStatFile(path, signal) {
	try {
		signal?.throwIfAborted();
		const info = await stat(path);
		signal?.throwIfAborted();
		if (!info.isFile()) return { kind: "absent" };
		return {
			kind: "present",
			info: { size: info.size }
		};
	} catch (error) {
		signal?.throwIfAborted();
		return isMissingPathError(error) ? { kind: "absent" } : { kind: "unavailable" };
	}
}
async function fsStatFile(path, fileSystem, signal) {
	try {
		const target = await fileSystem.resolve(path, signalOptions(signal));
		signal?.throwIfAborted();
		const info = await fileSystem.stat(target, signal);
		signal?.throwIfAborted();
		if (info?.type !== "file") return { kind: "absent" };
		return {
			kind: "present",
			info: {
				target,
				version: info.version,
				...info.size === void 0 ? {} : { size: info.size }
			}
		};
	} catch {
		signal?.throwIfAborted();
		return { kind: "unavailable" };
	}
}
async function statFile(path, fileSystem, signal) {
	return fileSystem === void 0 ? nodeStatFile(path, signal) : fsStatFile(path, fileSystem, signal);
}
async function existsAsMarker(path, fileSystem, signal) {
	if (fileSystem !== void 0) try {
		const target = await fileSystem.resolve(path, signalOptions(signal));
		return await fileSystem.stat(target, signal) !== void 0;
	} catch (error) {
		signal?.throwIfAborted();
		if (isMissingProviderPathError(error)) return false;
		throw error;
	}
	try {
		signal?.throwIfAborted();
		await stat(path);
		signal?.throwIfAborted();
		return true;
	} catch (error) {
		signal?.throwIfAborted();
		if (isMissingPathError(error)) return false;
		throw error;
	}
}
/**
* Walk upward to the first directory containing a configured root marker.
* @param cwd - absolute session working directory where the walk begins.
* @param markers - child names that identify a project root.
* @param fileSystem - optional provider used instead of host filesystem probes.
* @param signal - cancellation for provider and host probes.
* @returns the discovered project root, or `cwd` when no marker exists.
* @throws the original marker metadata error or cancellation reason when a probe is unavailable.
*/
async function findProjectRoot(cwd, markers, fileSystem, signal) {
	let current = resolve(cwd);
	for (;;) {
		for (const marker of markers) if (await existsAsMarker(join(current, marker), fileSystem, signal)) return current;
		const parent = dirname(current);
		if (parent === current) return resolve(cwd);
		current = parent;
	}
}
/**
* Build the inclusive root-to-cwd directory chain.
* @param root - root directory expected to contain or equal `cwd`.
* @param cwd - most-specific directory in the chain.
* @returns directories ordered from broadest to most specific.
*/
function ancestorChain(root, cwd) {
	const chain = [];
	let current = resolve(cwd);
	const resolvedRoot = resolve(root);
	while (current !== resolvedRoot) {
		chain.push(current);
		const parent = dirname(current);
		/* v8 ignore next -- discovery always supplies cwd or an ancestor root. */
		if (parent === current) break;
		current = parent;
	}
	chain.push(resolvedRoot);
	return chain.reverse();
}
/**
* Find descendant directories crossed between a cwd and a touched file.
* @param root - session cwd that bounds nested discovery.
* @param touchedPath - absolute path or path relative to `root`.
* @returns descendant directories from shallowest through the touched file's parent.
*/
function descendantDirsBetween(root, touchedPath) {
	const resolvedRoot = resolve(root);
	const targetDir = dirname(isAbsolute(touchedPath) ? resolve(touchedPath) : resolve(resolvedRoot, touchedPath));
	const rel = relative(resolvedRoot, targetDir);
	if (rel.length === 0 || rel.startsWith("..") || isAbsolute(rel)) return [];
	return ancestorChain(resolvedRoot, targetDir).slice(1);
}
/**
* Convert an absolute instruction path to its project-root-relative display form.
* @param root - project root used as the display base.
* @param path - absolute path to display.
* @returns the root-relative path.
*/
function relativeDisplay(root, path) {
	return relative(root, path);
}
async function allExistingInstructionFiles(dir, root, instructionFileCandidates, fileSystem, signal) {
	const found = [];
	for (const candidate of instructionFileCandidates) {
		const path = join(dir, candidate);
		const probe = await statFile(path, fileSystem, signal);
		switch (probe.kind) {
			case "present":
				found.push({
					absolutePath: path,
					displayPath: relativeDisplay(root, path),
					...probe.info
				});
				continue;
			case "absent":
			case "unavailable": continue;
			/* v8 ignore next 2 -- StatFileProbe is closed; this arm only makes adding a kind a compile error. */
			default: assertNever(probe, "StatFileProbe");
		}
	}
	return found;
}
async function discoverInstructionFiles(options, fileSystem) {
	const config = resolveDiscoveryConfig(options);
	const files = [];
	const seen = /* @__PURE__ */ new Set();
	const addFile = (file) => {
		if (seen.has(file.absolutePath)) return;
		seen.add(file.absolutePath);
		files.push(file);
	};
	const userGlobal = join(config.dshHome, USER_GLOBAL_FILE);
	const userGlobalProbe = await statFile(userGlobal, fileSystem, options.signal);
	switch (userGlobalProbe.kind) {
		case "present":
			addFile({
				absolutePath: userGlobal,
				displayPath: userGlobalDisplayPath(config.dshHome),
				...userGlobalProbe.info
			});
			break;
		case "absent":
		case "unavailable": break;
		/* v8 ignore next 2 -- StatFileProbe is closed; this arm only makes adding a kind a compile error. */
		default: assertNever(userGlobalProbe, "StatFileProbe");
	}
	const cwd = resolve(options.cwd);
	const projectRoot = options.projectRoot ?? await findProjectRoot(cwd, config.projectRootMarkers, fileSystem, options.signal);
	for (const dir of ancestorChain(projectRoot, cwd)) for (const candidates of [config.instructionFileCandidates, config.localInstructionFileCandidates]) for (const file of await allExistingInstructionFiles(dir, projectRoot, candidates, fileSystem, options.signal)) addFile(file);
	return files;
}
/**
* Discover host-visible user-global and root-to-cwd instruction candidates.
* All present candidates in each directory are returned; trimmed-content
* duplicates are collapsed later, once content is read.
* @param options - cwd, home, root marker, and candidate configuration.
* @returns path-deduplicated instruction candidates in model precedence order.
* @throws the original root-marker metadata error or cancellation reason when
* discovery cannot identify the project root.
*/
async function discoverBaselineInstructionFiles(options) {
	return (await discoverInstructionFiles(options)).map(({ absolutePath, displayPath }) => ({
		absolutePath,
		displayPath
	}));
}
async function* nodeTextChunks(path, signal) {
	const stream = createReadStream(path, {
		encoding: "utf8",
		signal
	});
	for await (const chunk of stream) yield String(chunk);
}
async function readBounded(file, maxSourceBytes, fileSystem, signal) {
	signal?.throwIfAborted();
	if (file.size !== void 0 && file.size > maxSourceBytes) return void 0;
	try {
		const chunks = fileSystem === void 0 || file.target === void 0 ? nodeTextChunks(file.absolutePath, signal) : await fileSystem.streamText(file.target, signal);
		const parts = [];
		let bytes = 0;
		for await (const chunk of chunks) {
			signal?.throwIfAborted();
			bytes += Buffer.byteLength(chunk, "utf8");
			if (bytes > maxSourceBytes) return void 0;
			parts.push(chunk);
		}
		signal?.throwIfAborted();
		return parts.join("");
	} catch {
		signal?.throwIfAborted();
		return;
	}
}
/**
* Drop later candidates whose trimmed content duplicates an earlier sibling in
* the same directory. Different directories never collapse even when identical;
* within one directory the earliest candidate in discovery order is kept and its
* original bytes are rendered. A candidate that symlinks a sibling resolves to
* the same content and collapses here like any byte-identical real file.
* @param files - loaded files in discovery order.
* @returns the retained files in the same order.
*/
function dedupInstructionFilesByDirectory(files) {
	const keptDigestsByDir = /* @__PURE__ */ new Map();
	const kept = [];
	for (const file of files) {
		const dir = dirname(file.displayPath);
		let digests = keptDigestsByDir.get(dir);
		if (digests === void 0) {
			digests = /* @__PURE__ */ new Set();
			keptDigestsByDir.set(dir, digests);
		}
		const digest = trimmedInstructionDigest(file.content);
		if (digests.has(digest)) continue;
		digests.add(digest);
		kept.push(file);
	}
	return kept;
}
/**
* Discover, read, and render the baseline instruction chain.
* @param options - discovery, source-size, byte-budget, and cancellation configuration.
* @param fileSystem - optional provider used instead of host filesystem reads.
* @returns rendered baseline context, or undefined when nothing can be loaded.
* @throws the original root-marker metadata error or cancellation reason when
* discovery cannot identify the project root.
*/
async function loadBaselineInstructions(options, fileSystem) {
	return (await loadBaselineInstructionSet(options, fileSystem))?.rendered;
}
/**
* Load a baseline together with the files retained after rendering.
* @param options - discovery, source-size, byte-budget, and cancellation configuration.
* @param fileSystem - optional provider used instead of host filesystem reads.
* @returns rendered context and retained files, an explicit empty replacement set, or undefined when empty or disabled.
*/
async function loadBaselineInstructionSet(options, fileSystem) {
	const config = resolveConfig(options);
	if (config.maxBytes <= 0 || !Number.isFinite(config.maxBytes)) return void 0;
	if (config.maxSourceBytes <= 0 || !Number.isFinite(config.maxSourceBytes)) return void 0;
	const discovered = await discoverInstructionFiles(options, fileSystem);
	const loaded = [];
	for (const file of discovered) {
		const content = await readBounded(file, config.maxSourceBytes, fileSystem, options.signal);
		if (content !== void 0) loaded.push({
			absolutePath: file.absolutePath,
			displayPath: file.displayPath,
			content,
			...file.version === void 0 ? {} : { version: file.version }
		});
	}
	const deduped = dedupInstructionFilesByDirectory(loaded);
	if (deduped.length === 0) {
		if (options.replacePreviousBaseline !== true) return void 0;
		const { rendered, included } = renderWorkspaceInstructionSet([], {
			maxBytes: config.maxBytes,
			replacePreviousBaseline: true
		});
		return {
			rendered,
			observed: [],
			included
		};
	}
	const { rendered, included } = renderWorkspaceInstructionSet(deduped, {
		maxBytes: config.maxBytes,
		...options.replacePreviousBaseline === void 0 ? {} : { replacePreviousBaseline: options.replacePreviousBaseline }
	});
	return {
		rendered,
		observed: loaded,
		included
	};
}
/**
* Probe the current provider metadata for one per-candidate instruction scope.
* @param scope - a {@link candidateScopeKey} identifying a directory and candidate file.
* @param projectRoot - project root used to resolve and display project scopes.
* @param resolved - normalized plugin configuration.
* @param fileSystem - provider used to resolve and stat scope candidates.
* @param signal - cancellation for provider probes.
* @returns present metadata, confirmed absence, or temporary unavailability.
*/
async function probeScopeInstruction(scope, projectRoot, resolved, fileSystem, signal) {
	const { directory, candidateName } = decodeScopeKey(scope);
	const absolutePath = join(directory === "user-global" ? resolved.dshHome : directory === "." ? projectRoot : join(projectRoot, directory), candidateName);
	let target;
	let info;
	try {
		target = await fileSystem.resolve(absolutePath, signalOptions(signal));
		info = await fileSystem.stat(target, signal);
	} catch {
		signal?.throwIfAborted();
		return { kind: "unavailable" };
	}
	if (info?.type !== "file") return { kind: "absent" };
	return {
		kind: "present",
		file: {
			absolutePath,
			displayPath: directory === "user-global" ? userGlobalDisplayPath(resolved.dshHome) : relativeDisplay(projectRoot, absolutePath),
			target,
			version: info.version,
			...info.size === void 0 ? {} : { size: info.size }
		}
	};
}
/**
* Read one already-probed scope candidate under the configured source cap.
* @param file - winning provider candidate and its metadata snapshot.
* @param maxSourceBytes - maximum UTF-8 bytes accepted from the source.
* @param fileSystem - provider used for the streaming read.
* @param signal - cancellation for provider streaming.
* @returns loaded content with the probed version, or undefined when unavailable.
*/
async function readScopeInstruction(file, maxSourceBytes, fileSystem, signal) {
	const content = await readBounded(file, maxSourceBytes, fileSystem, signal);
	if (content === void 0) return void 0;
	return {
		absolutePath: file.absolutePath,
		displayPath: file.displayPath,
		content,
		version: file.version
	};
}
function userGlobalDisplayPath(dshHome) {
	return `${dshHomeDisplay(dshHome)}/AGENTS.md`;
}
//#endregion
//#region lib/types/state.js
/**
* Session-visible workspace instruction state and dynamic reconciliation.
*
* @module @deepseek-ai/dsh-agent-instructions/state
*/
const name = "agent-instructions";
function workspaceContextHook(text, changes) {
	return createUserMessage({
		content: [{
			type: "text",
			text
		}],
		source: {
			kind: "agent-instructions",
			form: "instructions",
			changes
		}
	});
}
/**
* Build the user-role message for a rendered baseline.
* @param text - complete plugin-owned system-reminder text.
* @returns a user-role prefix message.
*/
function workspaceContextMessage(text) {
	return createUserMessage({
		content: [{
			type: "text",
			text
		}],
		source: {
			kind: "plugin",
			plugin: name
		}
	});
}
function isWorkspaceContextSource(source) {
	return typeof source === "object" && source !== null && "kind" in source && source.kind === "agent-instructions" && "changes" in source && Array.isArray(source.changes);
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function workspaceInstructionChanges(source) {
	const changes = [];
	for (const value of source.changes) {
		if (!isRecord(value)) continue;
		if (value.action !== "set" && value.action !== "replace" && value.action !== "remove") continue;
		if (typeof value.scope !== "string" || typeof value.path !== "string") continue;
		if (value.digest !== void 0 && typeof value.digest !== "string") continue;
		changes.push({
			action: value.action,
			scope: value.scope,
			path: value.path,
			...value.digest !== void 0 ? { digest: value.digest } : {}
		});
	}
	return changes;
}
function sameInstructionChange(a, b) {
	return a.action === b.action && a.scope === b.scope && a.path === b.path && a.digest === b.digest;
}
function visibleInstructionChanges(agent, authorityMessages) {
	const visible = /* @__PURE__ */ new Map();
	for (const seq of agent.session.surface.nodes) {
		const event = agent.session.eventAt(seq);
		if (event?.type !== "user/message" || !isWorkspaceContextSource(event.data.source)) continue;
		const changes = workspaceInstructionChanges(event.data.source);
		for (const change of changes) visible.set(change.scope, change);
	}
	for (const message of authorityMessages) {
		if (!isWorkspaceContextSource(message.source)) continue;
		for (const change of workspaceInstructionChanges(message.source)) visible.set(change.scope, change);
	}
	return visible;
}
/**
* Convert retained baseline files into comparison and metadata-cache state.
* @param files - baseline files that survived rendering.
* @returns latest baseline changes and provider versions keyed by logical scope.
*/
function baselineInstructionState(files) {
	const changes = /* @__PURE__ */ new Map();
	const versions = /* @__PURE__ */ new Map();
	for (const file of files) {
		const digest = instructionContentSha1(file.content);
		const change = {
			action: "set",
			scope: instructionScopeKey(file.displayPath),
			path: file.displayPath,
			digest
		};
		changes.set(change.scope, change);
		if (file.version !== void 0) versions.set(change.scope, {
			path: file.displayPath,
			version: file.version,
			digest,
			trimmedDigest: trimmedInstructionDigest(file.content)
		});
	}
	return {
		changes,
		versions
	};
}
function versionStatesFor(session, cache) {
	let states = cache.get(session);
	if (states === void 0) {
		states = /* @__PURE__ */ new Map();
		cache.set(session, states);
	}
	return states;
}
/**
* Keep only cache updates represented by rendered changes.
* @param updates - proposed updates from one or more reconciliations.
* @param renderedChanges - transitions retained by the renderer.
* @returns updates represented by an exact retained transition.
*/
function retainedInstructionVersionUpdates(updates, renderedChanges) {
	return updates.filter((update) => renderedChanges.some((change) => sameInstructionChange(update.change, change)));
}
/**
* Apply metadata-cache transitions without retaining instruction prose.
* @param session - owning session.
* @param updates - ordered set/delete transitions.
* @param cache - session-isolated metadata cache.
*/
function applyInstructionVersionUpdates(session, updates, cache) {
	if (updates.length === 0) return;
	const states = versionStatesFor(session, cache);
	for (const update of updates) if (update.state === void 0) states.delete(update.change.scope);
	else states.set(update.change.scope, update.state);
	if (states.size === 0) cache.delete(session);
}
function relativeScope(projectRoot, dir) {
	const scope = relativeDisplay(projectRoot, dir);
	return scope.length === 0 ? "." : scope;
}
/**
* Compare visible state with provider-visible files and render transitions.
* @param agent - session owner whose visible surface supplies durable state.
* @param resolved - normalized plugin configuration.
* @param versionCache - per-session scope metadata used to skip unchanged reads.
* @param fileSystem - provider used for current file probes.
* @param options - authoritative claimed context, pending scope hints, touched paths, and baseline participation.
* @returns rendered context plus deferred cache updates, or undefined when unchanged/unavailable.
*/
async function reconcileInstructionContext(agent, resolved, versionCache, fileSystem, options) {
	const session = agent.session;
	const effective = visibleInstructionChanges(agent, options.authorityMessages);
	/* v8 ignore next -- normal agents carry an absolute session cwd. */
	const cwd = session.header.cwd ?? process.cwd();
	const projectRoot = options.projectRoot ?? await findProjectRoot(cwd, resolved.projectRootMarkers, fileSystem, options.signal);
	const scopes = /* @__PURE__ */ new Set();
	const baselineScopes = /* @__PURE__ */ new Set();
	const addDirScopes = (target, directory) => {
		for (const candidate of resolved.instructionFileCandidates) target.add(candidateScopeKey(directory, candidate));
		for (const candidate of resolved.localInstructionFileCandidates) target.add(candidateScopeKey(directory, candidate));
	};
	const addProjectScopes = (target, dir) => {
		addDirScopes(target, relativeScope(projectRoot, dir));
	};
	baselineScopes.add(candidateScopeKey(USER_GLOBAL_DIRECTORY, USER_GLOBAL_FILE));
	for (const dir of ancestorChain(projectRoot, cwd)) addProjectScopes(baselineScopes, dir);
	if (options.includeBaselineScopes) for (const scope of baselineScopes) scopes.add(scope);
	for (const message of options.scopeMessages) {
		/* v8 ignore next -- the plugin passes its workspace-only pending projection. */
		if (!isWorkspaceContextSource(message.source)) continue;
		for (const change of workspaceInstructionChanges(message.source)) {
			if (!options.includeBaselineScopes && baselineScopes.has(change.scope)) continue;
			scopes.add(change.scope);
		}
	}
	for (const scope of effective.keys()) {
		if (!options.includeBaselineScopes && baselineScopes.has(scope)) continue;
		const { directory } = decodeScopeKey(scope);
		if (directory === "user-global") scopes.add(candidateScopeKey(USER_GLOBAL_DIRECTORY, USER_GLOBAL_FILE));
		else addDirScopes(scopes, directory);
	}
	for (const touchedPath of options.touchedPaths) for (const dir of descendantDirsBetween(cwd, touchedPath)) addProjectScopes(scopes, dir);
	const versions = versionStatesFor(session, versionCache);
	const seenAbsolutePaths = /* @__PURE__ */ new Set();
	const keptTrimmedByDir = /* @__PURE__ */ new Map();
	const registerKeptTrimmed = (directory, digest) => {
		let digests = keptTrimmedByDir.get(directory);
		if (digests === void 0) {
			digests = /* @__PURE__ */ new Set();
			keptTrimmedByDir.set(directory, digests);
		}
		if (digests.has(digest)) return true;
		digests.add(digest);
		return false;
	};
	const items = [];
	const versionUpdates = [];
	const pushRemoval = (scope, path) => {
		const change = {
			action: "remove",
			scope,
			path
		};
		items.push({
			change,
			file: {
				absolutePath: `removed:${scope}`,
				displayPath: path,
				content: ""
			}
		});
		versionUpdates.push({ change });
	};
	const scopesByDirectory = /* @__PURE__ */ new Map();
	for (const scope of scopes) {
		const { directory } = decodeScopeKey(scope);
		const directoryScopes = scopesByDirectory.get(directory);
		if (directoryScopes === void 0) scopesByDirectory.set(directory, [scope]);
		else directoryScopes.push(scope);
	}
	for (const [directory, directoryScopes] of scopesByDirectory) {
		const probedScopes = [];
		for (const scope of directoryScopes) if (options.excludedBaselineScopes !== void 0 && baselineScopes.has(scope) && options.excludedBaselineScopes.has(scope)) {
			const previous = effective.get(scope);
			if (previous === void 0 || previous.action === "remove") versions.delete(scope);
			else pushRemoval(scope, previous.path);
		} else probedScopes.push(scope);
		const itemStart = items.length;
		const versionUpdateStart = versionUpdates.length;
		const addedAbsolutePaths = [];
		const priorVersions = new Map(probedScopes.map((scope) => [scope, versions.get(scope)]));
		for (const scope of probedScopes) {
			const previous = effective.get(scope);
			const probe = await probeScopeInstruction(scope, projectRoot, resolved, fileSystem, options.signal);
			if (probe.kind === "unavailable") {
				if (previous === void 0 || previous.action === "remove") continue;
				items.splice(itemStart);
				versionUpdates.splice(versionUpdateStart);
				for (const [candidateScope, prior] of priorVersions) if (prior === void 0) versions.delete(candidateScope);
				else versions.set(candidateScope, prior);
				for (const absolutePath of addedAbsolutePaths) seenAbsolutePaths.delete(absolutePath);
				keptTrimmedByDir.delete(directory);
				break;
			}
			if (probe.kind === "absent") {
				if (previous === void 0 || previous.action === "remove") versions.delete(scope);
				else pushRemoval(scope, previous.path);
				continue;
			}
			const { file: probedFile } = probe;
			if (seenAbsolutePaths.has(probedFile.absolutePath)) continue;
			seenAbsolutePaths.add(probedFile.absolutePath);
			addedAbsolutePaths.push(probedFile.absolutePath);
			const cached = versions.get(scope);
			if (cached !== void 0 && cached.path === probedFile.displayPath && cached.version === probedFile.version && previous !== void 0 && previous.action !== "remove" && previous.path === cached.path && previous.digest === cached.digest) {
				if (registerKeptTrimmed(directory, cached.trimmedDigest)) pushRemoval(scope, previous.path);
				continue;
			}
			const file = await readScopeInstruction(probedFile, resolved.maxSourceBytes, fileSystem, options.signal);
			if (file === void 0) continue;
			const currentDigest = instructionContentSha1(file.content);
			const trimmedDigest = trimmedInstructionDigest(file.content);
			if (registerKeptTrimmed(directory, trimmedDigest)) {
				if (previous !== void 0 && previous.action !== "remove") pushRemoval(scope, previous.path);
				else versions.delete(scope);
				continue;
			}
			const nextVersion = {
				path: file.displayPath,
				version: probedFile.version,
				digest: currentDigest,
				trimmedDigest
			};
			if (previous !== void 0 && previous.action !== "remove" && previous.path === file.displayPath && previous.digest === currentDigest) {
				versions.set(scope, nextVersion);
				continue;
			}
			const change = {
				action: previous === void 0 || previous.action === "remove" ? "set" : "replace",
				scope,
				path: file.displayPath,
				digest: currentDigest
			};
			items.push({
				change,
				file
			});
			versionUpdates.push({
				change,
				state: nextVersion
			});
		}
	}
	if (items.length === 0) return void 0;
	const rendered = renderInstructionChanges(items, resolved.maxBytes);
	if (rendered.text.length === 0 || rendered.changes.length === 0) return void 0;
	return {
		context: workspaceContextHook(rendered.text, rendered.changes),
		versionUpdates: retainedInstructionVersionUpdates(versionUpdates, rendered.changes)
	};
}
//#endregion
//#region lib/types/index.js
/**
* Workspace instruction loader for AGENTS.md-compatible files.
*
* Baseline instructions enter durable context before the first request; successful fs
* tool touches project nested, changed, and removed instructions into the inbox.
* Plugin lifecycle reads use the optional `ctx.fs` provider, so providerless products
* mount it as a no-op.
*
* @module @deepseek-ai/dsh-agent-instructions
*/
/** Services required by workspace instruction projection. */
const inject = ["sessionProjections"];
function visibleBaselineSource(agent, authorityMessages) {
	for (const message of authorityMessages.toReversed()) if (message.source.kind === "agent-instructions" && message.source.baseline === true) return message.source;
	for (const seq of agent.session.surface.nodes.toReversed()) {
		const event = agent.session.eventAt(seq);
		if (event?.type === "user/message" && event.data.source.kind === "agent-instructions" && event.data.source.baseline === true) return event.data.source;
	}
}
function isWorkspaceContext(message) {
	return message.source.kind === "agent-instructions";
}
function sameContextPayload(left, right) {
	return isDeepStrictEqual(left.content, right.content) && isDeepStrictEqual(left.source, right.source);
}
const FILE_TOUCH_TOOL_NAMES = new Set([
	"read",
	"write",
	"edit"
]);
function filePathFromExecution(exec) {
	if (!FILE_TOUCH_TOOL_NAMES.has(exec.name)) return void 0;
	if (typeof exec.arguments !== "object" || exec.arguments === null) return void 0;
	if (!("file_path" in exec.arguments) || typeof exec.arguments.file_path !== "string") return void 0;
	const filePath = exec.arguments.file_path.trim();
	return filePath.length > 0 ? filePath : void 0;
}
function apply(ctx, config) {
	const resolved = resolveConfig(config);
	const instructionVersions = /* @__PURE__ */ new WeakMap();
	const baselinePreparations = /* @__PURE__ */ new WeakMap();
	const projectionLifecycle = new AbortController();
	const executionTouches = /* @__PURE__ */ new Map();
	ctx.effect(() => () => {
		projectionLifecycle.abort(/* @__PURE__ */ new Error("agent-instructions disposed"));
		executionTouches.clear();
	}, "agent-instructions.projectionLifecycle");
	const projectionTails = /* @__PURE__ */ new WeakMap();
	const stepTouches = /* @__PURE__ */ new WeakMap();
	const compose = async (agent, signal, claimed, pending, touchedPaths = []) => {
		signal.throwIfAborted();
		if (resolved.maxBytes <= 0 || !Number.isFinite(resolved.maxBytes)) return;
		const fileSystem = ctx.get("fs");
		if (fileSystem === void 0) return void 0;
		if (touchedPaths.length === 0 && pending.length > 0) return pending[0];
		const content = [];
		const changes = [];
		let desiredBaseline = false;
		const authorityMessages = [...claimed];
		/* v8 ignore next -- normal agents carry an absolute session cwd. */
		const cwd = agent.session.header.cwd ?? process.cwd();
		const projectRoot = await findProjectRoot(cwd, resolved.projectRootMarkers, fileSystem, signal);
		const identity = workspaceBaselineIdentity(resolved, cwd, projectRoot);
		const visibleBaseline = visibleBaselineSource(agent, authorityMessages);
		const baselinePresent = visibleBaseline !== void 0;
		const keepVisibleBaseline = visibleBaseline?.baselineIdentity === identity;
		const prepared = baselinePreparations.get(agent.session);
		let excludedBaselineScopes = keepVisibleBaseline && prepared?.identity === identity ? prepared.excludedScopes : void 0;
		let nextPreparation;
		if (!baselinePresent || !keepVisibleBaseline || excludedBaselineScopes === void 0) {
			const replacePreviousBaseline = baselinePresent && !keepVisibleBaseline;
			const instructions = await loadBaselineInstructionSet({
				cwd,
				dshHome: resolved.dshHome,
				projectRootMarkers: resolved.projectRootMarkers,
				maxBytes: resolved.maxBytes,
				maxSourceBytes: resolved.maxSourceBytes,
				instructionFileCandidates: resolved.instructionFileCandidates,
				localInstructionFileCandidates: resolved.localInstructionFileCandidates,
				projectRoot,
				replacePreviousBaseline,
				signal
			}, fileSystem);
			const baseline = baselineInstructionState(instructions?.included ?? []);
			const observedBaseline = baselineInstructionState(instructions?.observed ?? []);
			const excludedScopes = new Set(observedBaseline.changes.keys());
			for (const scope of baseline.changes.keys()) excludedScopes.delete(scope);
			excludedBaselineScopes = excludedScopes;
			nextPreparation = {
				identity,
				excludedScopes
			};
			let versionStates = instructionVersions.get(agent.session);
			if (versionStates === void 0 && baseline.versions.size > 0) {
				versionStates = /* @__PURE__ */ new Map();
				instructionVersions.set(agent.session, versionStates);
			}
			for (const [scope, state] of baseline.versions) versionStates?.set(scope, state);
			if (!keepVisibleBaseline && instructions !== void 0 && instructions.rendered.text.length > 0) {
				const baselineContent = workspaceContextMessage(instructions.rendered.text).content;
				content.push(...baselineContent);
				const replacementScopes = new Set(baseline.changes.keys());
				const baselineChanges = [...replacePreviousBaseline ? visibleBaseline.changes.flatMap((change) => change.action === "remove" || replacementScopes.has(change.scope) ? [] : [{
					action: "remove",
					scope: change.scope,
					path: change.path
				}]) : [], ...baseline.changes.values()];
				changes.push(...baselineChanges);
				authorityMessages.push(createUserMessage({
					content: baselineContent,
					source: {
						kind: "agent-instructions",
						form: "instructions",
						baseline: true,
						baselineIdentity: identity,
						changes: baselineChanges
					}
				}));
				desiredBaseline = true;
			}
		}
		const update = await reconcileInstructionContext(agent, resolved, instructionVersions, fileSystem, {
			authorityMessages,
			scopeMessages: pending,
			includeBaselineScopes: keepVisibleBaseline,
			...keepVisibleBaseline ? { excludedBaselineScopes } : {},
			touchedPaths,
			projectRoot,
			signal
		});
		if (update !== void 0) {
			content.push(...update.context.content);
			/* v8 ignore next -- reconciliation constructs only agent-instructions contexts. */
			if (update.context.source.kind === "agent-instructions") changes.push(...update.context.source.changes);
			applyInstructionVersionUpdates(agent.session, update.versionUpdates, instructionVersions);
		}
		if (nextPreparation !== void 0) baselinePreparations.set(agent.session, nextPreparation);
		if (content.length === 0) return void 0;
		return createUserMessage({
			content,
			source: {
				kind: "agent-instructions",
				form: "instructions",
				...desiredBaseline ? { baseline: true } : {},
				...desiredBaseline ? { baselineIdentity: identity } : {},
				changes
			}
		});
	};
	const syncInbox = (agent, claimed, desired) => {
		const pending = agent.inbox.nextStep.filter(isWorkspaceContext);
		const alreadySupplied = desired !== void 0 && (claimed.some((message) => sameContextPayload(message, desired)) || agent.session.surface.nodes.some((seq) => {
			const event = agent.session.eventAt(seq);
			return event?.type === "user/message" && sameContextPayload(event.data, desired);
		}));
		if (desired === void 0 || alreadySupplied) {
			for (const message of pending) agent.inbox.remove(message.id);
			return;
		}
		const reusable = pending.find((message) => sameContextPayload(message, desired));
		if (reusable !== void 0) {
			for (const message of pending) if (message !== reusable) agent.inbox.remove(message.id);
			return;
		}
		const replaced = pending[0];
		if (replaced === void 0) agent.inbox.prepend("next-step", desired);
		else agent.inbox.replace(replaced.id, desired);
		for (const message of pending.slice(1)) agent.inbox.remove(message.id);
	};
	const composeAndSync = async (agent, signal, claimed, touchedPaths = []) => {
		const desired = await compose(agent, signal, claimed, agent.inbox.nextStep.filter(isWorkspaceContext), touchedPaths);
		signal.throwIfAborted();
		syncInbox(agent, claimed, desired);
	};
	const queueProjection = (agent, touchedPath) => {
		const current = (projectionTails.get(agent) ?? Promise.resolve()).then(() => composeAndSync(agent, projectionLifecycle.signal, [], [touchedPath])).catch((error) => {
			if (!projectionLifecycle.signal.aborted) ctx.logger.warn("workspace instruction refresh failed: %o", error);
		});
		projectionTails.set(agent, current);
		current.then(() => {
			if (projectionTails.get(agent) === current) projectionTails.delete(agent);
		});
	};
	const waitForProjections = async (agent) => {
		let projection;
		while ((projection = projectionTails.get(agent)) !== void 0) await projection;
	};
	const stepIsOpen = (session) => {
		const boundary = ctx.sessionProjections.stateOf(session, "turnBoundary");
		if (boundary === void 0) throw new Error("agent-instructions requires the turnBoundary session projection");
		return boundary.openTurnStartSeq !== null && boundary.lastStepBoundary?.kind === "start" && boundary.lastStepBoundary.seq > boundary.openTurnStartSeq;
	};
	const projectTouch = (touch) => {
		const session = touch.agent.session;
		if (!stepIsOpen(session)) {
			queueProjection(touch.agent, touch.path);
			return;
		}
		const pending = stepTouches.get(session);
		if (pending === void 0) stepTouches.set(session, [touch]);
		else pending.push(touch);
	};
	ctx.on("session/event", (session, event) => {
		if (event.type !== "step/end") return;
		const pending = stepTouches.get(session);
		if (pending === void 0) return;
		stepTouches.delete(session);
		for (const touch of pending) queueProjection(touch.agent, touch.path);
	});
	ctx.on("agent/pre-step", async ({ agent, messages, step, signal }, next) => {
		const decision = await next();
		await waitForProjections(agent);
		const pending = agent.inbox.nextStep.filter(isWorkspaceContext);
		const desired = await compose(agent, signal, messages, pending);
		signal.throwIfAborted();
		if (decision.kind === "reject" || step === 1 && decision.messages.length === 0) {
			syncInbox(agent, messages, desired);
			return decision;
		}
		for (const message of pending) agent.inbox.remove(message.id);
		if (desired === void 0 || decision.messages.some((message) => sameContextPayload(message, desired))) return decision;
		const lastClaimedIndex = decision.messages.findLastIndex((message) => messages.includes(message));
		const entered = decision.messages.toSpliced(lastClaimedIndex + 1, 0, desired);
		return {
			...decision,
			messages: entered
		};
	});
	ctx.on("tools/result", (exec, result) => {
		const touches = executionTouches.get(exec.token) ?? [];
		executionTouches.delete(exec.token);
		if (!result.isError && exec.agent !== void 0 && !exec.signal.aborted) {
			const ownPath = filePathFromExecution(exec);
			if (ownPath !== void 0) touches.push({
				agent: exec.agent,
				path: ownPath
			});
		}
		if (exec.parent !== void 0) {
			if (touches.length > 0) {
				const parentTouches = executionTouches.get(exec.parent);
				if (parentTouches === void 0) executionTouches.set(exec.parent, touches);
				else parentTouches.push(...touches);
			}
			return;
		}
		for (const touch of touches) projectTouch(touch);
	});
}
//#endregion
export { Config, apply, discoverBaselineInstructionFiles, inject, loadBaselineInstructions, name, renderWorkspaceContext };
