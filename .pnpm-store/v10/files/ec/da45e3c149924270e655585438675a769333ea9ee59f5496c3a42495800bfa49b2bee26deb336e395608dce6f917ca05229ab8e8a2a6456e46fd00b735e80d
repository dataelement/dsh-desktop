import z from "@deepseek-ai/schemastery";
import { MAX_TIMER_DELAY_MS } from "@deepseek-ai/dsh-timeout";
import { isAbsolute, join, parse, relative, sep } from "node:path";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { existsSync } from "node:fs";
import { HarnessError } from "@deepseek-ai/dsh-llm";
import { ItemRetainer, TextRetainer } from "@deepseek-ai/dsh-output-retention";
//#region lib/types/search-core.js
/**
* Shared execution plumbing for the `glob` / `grep` search tools: the
* package-owned `SEARCH_*` error vocabulary, one spawn helper that runs the
* PACKAGED ripgrep binary (`@vscode/ripgrep`) with a plain argv vector and
* returns complete raw stdout, the best-effort formatted-result spill handoff,
* and workdir-relative path display.
*
* Both tools execute as ordinary foreground spawns through `ctx.subprocess` —
* never `ctx.shell`, never `ctx.shell.start()`, never a model-visible background
* task. The ripgrep binary ships inside the npm package, so no system `rg`
* install is required, and no shell layer exists between the argv vector and
* ripgrep, so no shell quoting is involved. Raw `rg` stdout is an internal
* transport detail: the tools request a per-run stdout capture budget from the
* subprocess seam, parse only complete in-memory stdout within
* `rawOutputMaxBytes`, and never read spill files. The model-facing recovery
* artifact is the formatted result saved through `ctx.spillStore.saveText()`
* ({@link trySaveFormattedResult}).
*
* @module @deepseek-ai/dsh-tool-fs-search/search-core
*/
/**
* Default cap on the complete raw `rg` stdout the tools will parse (the
* `rawOutputMaxBytes` config), matching Claude Code's ripgrep raw buffer.
*/
const RAW_OUTPUT_MAX_BYTES = 2e7;
/**
* Default cooperative tool-call timeout budget in milliseconds (the `timeoutMs`
* config), attached to both tool definitions for
* `@deepseek-ai/dsh-tool-call-timeout-policy` to enforce through `exec.signal`.
*/
const SEARCH_TIMEOUT_MS = 3e4;
/**
* Default cap in bytes on the retained stderr tail of one search run — a
* diagnostic excerpt only (the tool never reads a stderr spill path, and the
* collect disposition requests none).
*/
const SEARCH_STDERR_MAX_BYTES = 64 * 1024;
/** Default terminate grace period for a search process (ms). */
const SEARCH_GRACE_MS = 3e3;
/**
* Default cap in bytes on one search's serialized `presentationMeta` (the
* `searchMetaMaxBytes` config). The inline match/path caps already bound the item
* COUNT, but retained matches of a broad search (many long lines) can still
* serialize to hundreds of kilobytes, and `meta` is persisted with the session
* log and re-sent on every request. A deployment's final output budget
* (`dsh-spill-policy`) only shrinks a result's `content`, never its `meta`, so the
* projection owns this cap. 64 KiB holds the full default-capped result of a
* typical search while bounding the pathological one.
*/
const SEARCH_META_MAX_BYTES = 65536;
/**
* Typed search failure. Extends {@link HarnessError} so it carries a stable
* {@link SearchErrorCode} and chains `cause`; the tool registry exposes
* `{ name, code }` on `isError` results so retry/permission/UI layers can
* branch without parsing messages.
*/
var SearchError = class extends HarnessError {
	code;
	constructor(message, code, options) {
		super(message, code, options);
		this.code = code;
	}
};
/**
* The retained stderr tail as a diagnostic excerpt, with a truncation note when
* the subprocess seam dropped bytes.
*/
function stderrExcerpt(stderrText, truncated) {
	const text = stderrText.trim();
	if (text.length === 0) return "";
	return truncated ? `${text} [stderr truncated]` : text;
}
/**
* Classify a nonzero-exit `rg` run into the search error vocabulary. There is
* no shell layer, so an exit 127 or shell "command not found" text cannot
* occur — a launch failure rejects at spawn (see {@link runRipgrep}).
*/
function classifyRunFailure(toolName, exitCode, stderrText, stderrTruncated) {
	const stderr = stderrExcerpt(stderrText, stderrTruncated);
	if (/regex parse error|error parsing glob/i.test(stderr)) return new SearchError(`${toolName} pattern rejected by ripgrep: ${stderr}`, "SEARCH_INVALID_PATTERN");
	return new SearchError(`${toolName} search failed (exit ${exitCode})${stderr.length > 0 ? `: ${stderr}` : ""}`, "SEARCH_FAILED");
}
/**
* Acquire the COMPLETE raw stdout of a finished run, enforcing
* `rawOutputMaxBytes` on the in-memory transport. A truncated result means the
* subprocess seam could not retain complete stdout within the requested
* budget, so the tool fails clearly instead of parsing a silently-partial
* stream.
*/
function completeStdout(toolName, stdout, rawOutputMaxBytes) {
	const narrow = "narrow pattern, path, or include and retry";
	if (!stdout.lossy) {
		const inlineBytes = Buffer.byteLength(stdout.text, "utf8");
		if (inlineBytes > rawOutputMaxBytes) throw new SearchError(`${toolName} produced ${inlineBytes} bytes of raw output, over the ${rawOutputMaxBytes}-byte cap; ${narrow}`, "SEARCH_RAW_OUTPUT_OVERFLOW");
		return stdout.text;
	}
	throw new SearchError(`${toolName} produced more raw output than the subprocess seam retained within the ${rawOutputMaxBytes}-byte cap; ${narrow}`, "SEARCH_RAW_OUTPUT_OVERFLOW");
}
let rgPathPromise;
/**
* The packaged ripgrep binary path, resolved lazily once per process.
*
* A single-file runtime uses the executable's `-rg` sidecar because a native
* helper cannot be spawned from pkg's virtual filesystem. Node-mode builds
* fall back to the platform package selected by `@vscode/ripgrep`. Resolving
* at the call boundary keeps a missing or corrupt binary at the first search
* call as `SEARCH_FAILED`, rather than failing the Loader composition.
*
* @returns the packaged binary's absolute path; the memoized promise rejects
*   when the platform package cannot be resolved.
*/
function resolveRgPath() {
	rgPathPromise ??= Promise.resolve().then(async () => {
		const executable = parse(process.execPath);
		const executableSidecar = process.platform === "win32" ? join(executable.dir, `${executable.name}-rg.exe`) : `${process.execPath}-rg`;
		if ("pkg" in process && existsSync(executableSidecar)) return executableSidecar;
		return (await import("@vscode/ripgrep")).rgPath;
	});
	return rgPathPromise;
}
/**
* Run the packaged ripgrep binary with a plain argv vector and return its
* complete raw stdout. The working directory is the calling agent's session
* cwd (`exec.agent.session.header.cwd`) when available, else
* `process.cwd()`. `exec.signal` is forwarded so the cooperative tool timeout
* (`@deepseek-ai/dsh-tool-call-timeout-policy`) and caller cancellation terminate the
* process tree.
*
* The spawn is unconfined (a plain `ctx.subprocess` call), so `--no-config`
* is prepended: a host `RIPGREP_CONFIG_PATH` (or `rg.conf` next to the
* binary) can otherwise inject `--pre` and make ripgrep execute an arbitrary
* preprocessor for every matched file. The collect dispositions are the
* seam's diagnostic-tail shape (no spill files): the tools never read a raw
* spill path, and truncated stdout fails as `SEARCH_RAW_OUTPUT_OVERFLOW`.
*
* Exit semantics are tool-owned: exit 0 is success with results, exit 1 is
* success with zero results (`noMatches`), anything else throws a
* {@link SearchError} (abort/timeout → `SEARCH_ABORTED`, invalid pattern →
* `SEARCH_INVALID_PATTERN`, the rest → `SEARCH_FAILED` /
* `SEARCH_RAW_OUTPUT_OVERFLOW`). Both launch-time failure domains are
* classified: a synchronous throw at spawn CREATION (a NUL in argv, an abort
* racing the pre-check, a rejected `@vscode/ripgrep` resolution) reports that
* the command could not start, while a rejection of `handle.done` reports a
* provider failure without claiming whether execution began. Both become
* `SEARCH_FAILED` with the original as `cause`; an abort already observed by
* creation time becomes `SEARCH_ABORTED` instead.
*
* @param ctx - the plugin context; execution uses its `subprocess` service.
* @param exec - the tool-execution context; supplies the session cwd and the abort signal.
* @param toolName - `glob` or `grep`, used in error messages.
* @param argv - the ripgrep arguments (every model value an unquoted argv element; no shell layer exists).
* @param rawOutputMaxBytes - cap on the complete raw stdout the tool will parse.
* @param graceMs - the seam's terminate-escalation grace period.
* @param stderrMaxBytes - cap on the retained stderr diagnostic tail.
* @returns the complete stdout, the zero-result flag, and the resolved workdir.
*/
async function runRipgrep(ctx, exec, toolName, argv, rawOutputMaxBytes, graceMs, stderrMaxBytes) {
	if (exec.signal.aborted) throw new SearchError(`${toolName} was aborted before completion (tool timeout or caller cancellation)`, "SEARCH_ABORTED");
	const workdir = exec.agent?.session.header.cwd ?? process.cwd();
	let handle;
	try {
		handle = ctx.subprocess.spawn({
			argv: [
				await resolveRgPath(),
				"--no-config",
				...argv
			],
			cwd: workdir,
			stdio: {
				stdin: "ignore",
				stdout: { maxBytes: rawOutputMaxBytes },
				stderr: { maxBytes: stderrMaxBytes }
			},
			graceMs,
			signal: exec.signal
		});
	} catch (error) {
		if (exec.signal.aborted) throw new SearchError(`${toolName} was aborted before completion (tool timeout or caller cancellation)`, "SEARCH_ABORTED");
		throw new SearchError(`${toolName} could not start its search command (ripgrep launch failed)`, "SEARCH_FAILED", { cause: error });
	}
	let outcome;
	try {
		outcome = await handle.done;
	} catch (error) {
		throw new SearchError(`${toolName} subprocess failed before reporting an outcome (ripgrep provider failure)`, "SEARCH_FAILED", { cause: error });
	}
	const stdout = handle.collected.stdout?.readFrom(0);
	const stderr = handle.collected.stderr?.readFrom(0);
	if (stdout === void 0 || stderr === void 0) throw new SearchError(`${toolName} search command produced no collected output streams`, "SEARCH_FAILED");
	if (exec.signal.aborted) throw new SearchError(`${toolName} was aborted before completion (tool timeout or caller cancellation)`, "SEARCH_ABORTED");
	if (outcome.signal !== null || outcome.exitCode === null) throw new SearchError(`${toolName} search command was killed by signal ${outcome.signal ?? "(unknown)"}`, "SEARCH_FAILED");
	if (outcome.exitCode !== 0 && outcome.exitCode !== 1) throw classifyRunFailure(toolName, outcome.exitCode, stderr.text, stderr.lossy);
	return {
		stdout: completeStdout(toolName, stdout, rawOutputMaxBytes),
		noMatches: outcome.exitCode === 1,
		workdir
	};
}
/**
* Map an `rg` output path to its display form: absolute paths inside the
* resolved workdir become workdir-relative; everything else (relative output,
* paths outside the workdir) passes through unchanged. Display-only —
* returned paths are follow-up-readable in co-located workdir/filesystem
* deployments where both resolve the same workspace (the documented v1
* deployment requirement).
*
* @param path - one path as ripgrep printed it.
* @param workdir - the resolved workdir the command ran in.
* @returns the workdir-relative display path when possible, else `path` unchanged.
*/
function toWorkdirRelative(path, workdir) {
	if (!isAbsolute(path)) return path;
	const rel = relative(workdir, path);
	if (rel.length === 0) return ".";
	if (rel === ".." || rel.startsWith(`..${sep}`)) return path;
	return rel;
}
/**
* Bound one matched-line preview to `maxBytes` (UTF-8 boundary preserved) and
* mark the cut. The cap is a per-line budget fact; the complete line stays in
* the searched file for `read`.
*
* @param line - the matched line text (trailing newline already stripped).
* @param maxBytes - the preview budget in bytes.
* @returns the preview, suffixed with ` (line truncated)` when bytes were cut.
*/
function previewLine(line, maxBytes) {
	const retainer = new TextRetainer({
		kind: "head",
		maxBytes
	});
	retainer.push(line);
	const kept = retainer.finish();
	return kept.truncated ? `${kept.text} (line truncated)` : kept.text;
}
/**
* Apply the shared inline cap to a canonical `grep` match list: preview each
* retained line to `maxLineBytes` and keep the first `maxMatches`. The single
* retention pass both the model-facing render ({@link module:@deepseek-ai/dsh-tool-fs-search/grep}
* `formatGrepOutput`) and the search-card projection
* ({@link module:@deepseek-ai/dsh-tool-fs-search/presentation} `grepSearchMeta`)
* consume, so text and card never disagree about which matches survived.
*
* @param matches - every match the search parsed (the canonical value's matches).
* @param maxMatches - the inline match cap (the `grepMaxMatches` config).
* @param maxLineBytes - the per-matched-line preview budget in bytes.
* @returns the retention outcome over the previewed matches.
*/
function retainGrepMatches(matches, maxMatches, maxLineBytes) {
	const retainer = new ItemRetainer({
		kind: "head",
		maxItems: maxMatches
	});
	for (const match of matches) retainer.push({
		...match,
		line: previewLine(match.line, maxLineBytes)
	});
	return retainer.finish();
}
/**
* Best-effort save of one COMPLETE formatted search result through
* `ctx.spillStore.saveText()` — the model-facing recovery path for a capped
* result. `spillStore` is read with `ctx.get()` (not static inject) because
* formatted-result spill is optional; the spill owner is the calling agent's
* session header id and the source is the tool execution identity. A missing
* backend, a call with no session owner, or a `saveText()` rejection logs a
* warning and returns `undefined` — the caller keeps the inline result and
* reports that the complete result could not be saved; search success never
* turns into `isError` because spill storage is unavailable.
*
* @param ctx - the plugin context; `spillStore` is looked up opportunistically.
* @param exec - the tool-execution context; supplies the owning session, tool name, and call id.
* @param suggestedName - the backend-sanitized filename hint (e.g. `grep-results.txt`).
* @param content - the complete formatted result to persist.
* @returns the saved spill reference, or `undefined` when the result could not be saved.
*/
async function trySaveFormattedResult(ctx, exec, suggestedName, content) {
	const sessionId = exec.agent?.session.header.id;
	if (sessionId === void 0) {
		ctx.logger.warn(`tool-fs-search: no session owner for ${exec.name} result; complete result not saved`);
		return;
	}
	const spillStore = ctx.get("spillStore");
	if (!spillStore) {
		ctx.logger.warn(`tool-fs-search: no ctx.spillStore backend loaded; complete ${exec.name} result not saved`);
		return;
	}
	const save = {
		owner: { sessionId },
		source: {
			kind: "tool",
			toolName: exec.name,
			callId: exec.callId,
			label: "result"
		},
		suggestedName,
		content
	};
	try {
		return await spillStore.saveText(save);
	} catch (error) {
		ctx.logger.warn(`tool-fs-search: saveText failed for ${exec.name}: ${String(error)}; complete result not saved`);
		return;
	}
}
//#endregion
//#region lib/types/presentation.js
/**
* Result-time search-card presentation for `grep` and `glob`. Both tools land on
* one `card: 'search'` render intent ({@link SearchResultView}) with two
* `shape`-discriminated variants: `grep` projects its matches grouped by file
* ({@link SearchMatchesResultView}), `glob` projects a flat path list
* ({@link SearchPathsResultView}). This module owns the value→`presentationMeta`
* projection each tool declares and the defensive `meta`→view narrowing each
* tool's `presentResult` reads back on replay.
*
* The canonical value never crosses the wire — only the model-facing render text
* and this JSON `meta` do — so the structured shape a UI renders MUST ride in
* `meta`. Each projection consumes the SAME retained matches/paths the
* model-facing render consumes ({@link module:@deepseek-ai/dsh-tool-fs-search/search-core}
* `retainGrepMatches`/`retainGlobPaths`), so text and card agree about which
* results survived the inline cap, and reports `total` (every result found) and
* `truncated`, so a UI never presents a capped result as complete.
*
* A second, independent cap bounds the JSON `meta` itself: the retained matches
* of a broad search (hundreds of long lines) can still serialize to hundreds of
* kilobytes, and `meta` is persisted with the session log and re-sent on every
* request. {@link capMetaBytes} drops trailing groups/paths until the serialized
* `meta` fits `maxMetaBytes` and marks the result `truncated`; a deployment's
* final output budget (`dsh-spill-policy`) only shrinks `content`, never `meta`,
* so this projection owns keeping `meta` bounded.
*
* @module @deepseek-ai/dsh-tool-fs-search/presentation
*/
/**
* Group flat matches by file (first-seen order) into the structured by-file shape
* a UI renders as expandable per-file groups. The grouping matches the
* model-facing text grouping
* ({@link module:@deepseek-ai/dsh-tool-fs-search/grep} `formatGrepMatches`), so
* card and text agree about file order and membership.
*
* @param matches - the retained matches to group, in output order.
* @returns one entry per file, in first-seen order.
*/
function groupMatchesByFile(matches) {
	const byFile = /* @__PURE__ */ new Map();
	for (const match of matches) {
		const entry = {
			lineNumber: match.lineNumber,
			line: match.line
		};
		const group = byFile.get(match.path);
		if (group !== void 0) group.push(entry);
		else byFile.set(match.path, [entry]);
	}
	return Array.from(byFile, ([path, fileMatches]) => ({
		path,
		matches: fileMatches
	}));
}
/** The serialized UTF-8 byte size of one meta payload (the size persisted and re-sent). */
function metaBytes(meta) {
	return Buffer.byteLength(JSON.stringify(meta), "utf8");
}
/**
* Drop trailing top-level items (file groups or paths) until the serialized meta
* fits `maxMetaBytes`, marking the result `truncated` when anything was dropped.
* `total` is preserved (it counts what the search found, not what meta retains).
* A single item too large to fit on its own is kept: the invariant is a bounded
* payload wherever droppable, never an empty card that hides a real result.
*
* @param meta - the projected meta, already capped to the inline item count.
* @param maxMetaBytes - the serialized-meta byte budget.
* @returns the same meta when it fits, else a byte-bounded copy marked `truncated`.
*/
function capMetaBytes(meta, maxMetaBytes) {
	if (metaBytes(meta) <= maxMetaBytes) return meta;
	if (meta.shape === "matches") {
		const files = [...meta.files];
		while (files.length > 1 && metaBytes({
			...meta,
			files,
			truncated: true
		}) > maxMetaBytes) files.pop();
		return {
			...meta,
			files,
			truncated: true
		};
	}
	const paths = [...meta.paths];
	while (paths.length > 1 && metaBytes({
		...meta,
		paths,
		truncated: true
	}) > maxMetaBytes) paths.pop();
	return {
		...meta,
		paths,
		truncated: true
	};
}
/**
* Project the retained `grep` matches into {@link SearchMeta} for the search
* card. Consumes the same {@link RetainedItems} the model-facing render consumes
* (preview budget and inline match cap already applied), groups the retained
* matches by file, reports `total` (every parsed match) and `truncated`, then
* bounds the serialized meta to `maxMetaBytes`.
*
* @param retained - the retention outcome over every parsed match (previewed, capped).
* @param maxMetaBytes - the serialized-meta byte budget.
* @returns the `matches`-shaped search metadata.
*/
function grepSearchMeta(retained, maxMetaBytes) {
	return capMetaBytes({
		shape: "matches",
		files: groupMatchesByFile(retained.items),
		truncated: retained.truncated,
		total: retained.seen
	}, maxMetaBytes);
}
/**
* Project the retained `glob` paths into {@link SearchMeta} for the search card.
* Consumes the same {@link RetainedItems} the model-facing render consumes (inline
* path cap already applied), reports `total` (every discovered path) and
* `truncated`, then bounds the serialized meta to `maxMetaBytes`.
*
* @param retained - the retention outcome over every discovered path (capped).
* @param maxMetaBytes - the serialized-meta byte budget.
* @returns the `paths`-shaped search metadata.
*/
function globSearchMeta(retained, maxMetaBytes) {
	return capMetaBytes({
		shape: "paths",
		paths: retained.items,
		truncated: retained.truncated,
		total: retained.seen
	}, maxMetaBytes);
}
/** Whether `value` is a valid {@link SearchLineMatch} (defensive narrowing from opaque `meta`). */
function isSearchLineMatch(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const { lineNumber, line } = value;
	return typeof lineNumber === "number" && typeof line === "string";
}
/** Whether `value` is a valid {@link SearchFileMatches} (defensive narrowing from opaque `meta`). */
function isSearchFileMatches(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const { path, matches } = value;
	return typeof path === "string" && Array.isArray(matches) && matches.every(isSearchLineMatch);
}
/**
* Narrow opaque live or replayed result metadata to a {@link SearchResultView}.
* Malformed metadata returns `undefined` so `presentResult` can fall back to the
* generic card instead of throwing during replay of an older or hand-edited log.
* The view carries no result text: a UI without a search card falls back to the
* raw `tool/result` content.
*
* A zero-result meta (`files: []` / `paths: []`) narrows to a valid empty card —
* unlike the mirrored `diffsFromMeta`, which rejects empty diffs, because a
* zero-match grep is a legitimate result a UI shows as "no matches", not an
* absent projection.
*
* @param meta - result metadata (the {@link SearchMeta} the tool projected).
* @returns the search view, or `undefined` for absent or malformed metadata.
*/
function searchViewFromMeta(meta) {
	if (typeof meta !== "object" || meta === null || Array.isArray(meta)) return void 0;
	const record = meta;
	const { truncated, total } = record;
	if (typeof truncated !== "boolean" || typeof total !== "number") return void 0;
	if (record.shape === "matches") {
		const { files } = record;
		if (!Array.isArray(files) || !files.every(isSearchFileMatches)) return void 0;
		return {
			card: "search",
			shape: "matches",
			files,
			truncated,
			total
		};
	}
	if (record.shape === "paths") {
		const { paths } = record;
		if (!Array.isArray(paths) || !paths.every((path) => typeof path === "string")) return void 0;
		return {
			card: "search",
			shape: "paths",
			paths,
			truncated,
			total
		};
	}
}
//#endregion
//#region lib/types/direct-call.js
/** Shared top-level-call post-policy selection for search result spill. @module dsh-tool-fs-search/direct-call */
/**
* Return the accepted canonical value only when this tool still owns a direct
* successful top-level call and no downstream policy replaced either projection.
* @param ctx - the tool plugin context used to resolve the live scoped owner.
* @param tool - the exact registered definition whose value may be projected.
* @param exec - the completed execution identity.
* @param result - the canonical result before post-policy decisions are applied.
* @param decision - the composed downstream post-policy decision.
* @returns the canonical value to project, or `undefined` when spill must defer.
*/
function acceptedDirectCallValue(ctx, tool, exec, result, decision) {
	if (decision.kind !== "accept" || decision.content !== void 0 || Object.hasOwn(decision, "value") || exec.parent !== void 0 || exec.name !== tool.name || result.isError || ctx.tools.get(exec.name, exec.agent) !== tool) return void 0;
	return result.value;
}
//#endregion
//#region lib/types/glob.js
/**
* The model-facing `glob` tool: discover files whose paths match a glob
* pattern, sorted by modification time. Execution spawns the packaged
* ripgrep binary (`@vscode/ripgrep`) directly through the subprocess seam
* with a plain argv vector — this module owns the model-facing schema,
* argument validation, argv construction, result parsing, inline sampling,
* and formatting; process concerns (spawn execution, tree termination,
* environment scrubbing, output capture) stay behind `ctx.subprocess`.
* @module @deepseek-ai/dsh-tool-fs-search/glob
*/
/**
* Default cap on paths retained inline by one `glob` call (the `globMaxResults`
* config), matching Claude Code's default `GlobTool` result limit.
*/
const GLOB_MAX_RESULTS = 100;
/**
* Directory names ripgrep must never descend into for a discovery listing: VCS
* metadata stores. `--no-ignore --hidden` would otherwise surface them in every
* broad search. Each name is excluded with TWO negated `--glob`s (see
* {@link buildGlobCommand}): an any-depth directory glob that matches — and
* prunes — the directory during traversal, and a contents glob that still
* excludes the internals when the search root itself is at or inside the
* directory (an explicit `path` of `.git` or `sub/.git`), where the prune glob
* alone never matches.
*/
const GLOB_VCS_EXCLUDES = [
	".git",
	".svn",
	".hg",
	".bzr",
	".jj",
	".sl"
];
/**
* Validate value constraints the schema DSL can't express: a non-blank
* `pattern`, and a non-blank `path` when given. Throws a plain `Error` (an
* ordinary tool argument error) otherwise.
*
* @param args - the schema-validated `glob` arguments.
* @returns the accepted input, unchanged.
*/
function parseGlobArgs(args) {
	if (args.pattern.trim().length === 0) throw new Error("pattern must be a non-empty string");
	if (args.path !== void 0 && args.path.trim().length === 0) throw new Error("path must be a non-empty string when given");
	return {
		pattern: args.pattern,
		...args.path !== void 0 ? { path: args.path } : {}
	};
}
/**
* Build the fixed `rg --files` argv for one `glob` call. Every
* model-controlled value ({@link GlobInput.pattern}, {@link GlobInput.path})
* is a plain argv element — no shell layer exists, so no quoting applies; the
* search root rides behind `--` so a leading-dash path can never be parsed as
* a flag. `--sort=modified` orders by modification time, `--no-ignore
* --hidden` searches ignored and hidden files, and
* {@link GLOB_VCS_EXCLUDES} keeps VCS metadata out.
*
* @param input - the validated arguments.
* @returns the complete ripgrep argument vector (excluding the binary itself).
*/
function buildGlobCommand(input) {
	const parts = [
		"--files",
		`--glob=${input.pattern}`,
		"--sort=modified",
		"--no-ignore",
		"--hidden",
		...GLOB_VCS_EXCLUDES.flatMap((name) => [`--glob=!**/${name}`, `--glob=!**/${name}/**`])
	];
	if (input.path !== void 0) parts.push("--", input.path);
	return parts;
}
/** Remove the displayed search-root prefix before choosing a top-level group. */
function relativeToSearchRoot(path, root) {
	if (root === ".") return path.startsWith(`.${sep}`) ? path.slice(2) : path;
	let rootEnd = root.length;
	while (rootEnd > 0 && root[rootEnd - 1] === sep) rootEnd -= 1;
	const trimmedRoot = root.slice(0, rootEnd);
	if (trimmedRoot.length === 0) return stripLeadingSeparators(path);
	if (path === trimmedRoot) return "";
	if (path.startsWith(`${trimmedRoot}${sep}`)) return path.slice(trimmedRoot.length + 1);
	return path;
}
/** Strip only separators recognized by the execution platform. */
function stripLeadingSeparators(path) {
	let start = 0;
	while (path[start] === sep) start += 1;
	return path.slice(start);
}
/**
* The leading path segment of one display path — the top-level entry, relative
* to the search root, that the path sits under. A path with no separator is its
* own top-level entry. Leading separators are stripped first so an absolute path
* (one outside the workdir, which {@link toWorkdirRelative} leaves untouched)
* groups by its first real name instead of collapsing every such path into one
* empty group.
*/
function topLevelSegment(path) {
	const trimmed = stripLeadingSeparators(path);
	const cut = trimmed.indexOf(sep);
	return cut === -1 ? trimmed : trimmed.slice(0, cut);
}
/**
* Choose the inline page of an over-cap result by round-robin across the
* complete result's top-level entries, instead of taking its head.
*
* Every top-level entry receives a slot before any receives a second; exhausted
* groups drop out. Group order and order within each group follow `paths`, so a
* flat result reproduces the modification-time head.
*
* @param paths - the complete result, in ripgrep's modification-time order.
* @param maxItems - how many paths the page may hold; the caller has already established it is smaller than `paths`.
* @param root - the search root in the same display-path space as `paths`.
* @returns the page grouped by top-level entry, with the shown/total top-level spread.
*/
function sampleAcrossTopLevel(paths, maxItems, root = ".") {
	const groups = /* @__PURE__ */ new Map();
	let active = [];
	for (const path of paths) {
		const key = topLevelSegment(relativeToSearchRoot(path, root));
		const group = groups.get(key);
		if (group === void 0) {
			const items = [path];
			groups.set(key, items);
			active.push({
				key,
				items,
				index: 0,
				current: path
			});
		} else group.push(path);
	}
	const taken = /* @__PURE__ */ new Map();
	let count = 0;
	while (active.length > 0 && count < maxItems) {
		const nextActive = [];
		for (const { key, items, index, current } of active) {
			if (count >= maxItems) break;
			count += 1;
			const bucket = taken.get(key);
			if (bucket === void 0) taken.set(key, [current]);
			else bucket.push(current);
			const nextIndex = index + 1;
			const nextPath = items[nextIndex];
			if (nextPath !== void 0) nextActive.push({
				key,
				items,
				index: nextIndex,
				current: nextPath
			});
		}
		active = nextActive;
	}
	return {
		items: [...taken.values()].flat(),
		shown: taken.size,
		total: groups.size
	};
}
/**
* Format a capped sampled page and its complete-result recovery path. A flat
* result keeps the plain footer because its sample is the modification-time head.
*
* @param sample - the inline page and its top-level spread.
* @param seen - how many paths the complete result holds; always more than the page.
* @param spillRef - the saved complete-result reference, or `undefined` when unsaved.
* @returns the model-facing text.
*/
function formatGlobOutput(sample, seen, spillRef) {
	const basis = sample.total === seen ? "." : `, sampled across ${sample.shown} of the ${sample.total} top-level entries this pattern matched instead of taken in modification-time order.` + (sample.shown < sample.total ? " Narrow path to inspect a specific subtree." : "");
	return formatGlobPage(sample.items, seen, spillRef, basis);
}
/** Format one bounded page and the recovery path for its complete sorted result. */
function formatGlobPage(items, seen, spillRef, basis) {
	const body = items.join("\n");
	const recovery = spillRef !== void 0 ? `Full sorted result stored at: ${spillRef.locator}. ${spillRef.retrievalHint}` : "The complete result could not be saved; narrow pattern or path to see more.";
	return `${body}\n\n(Showing ${items.length} of ${seen} paths${basis} ${recovery})`;
}
/** Bound and format one canonical path list for the Native surface relative to its search root. */
function renderGlobPaths(paths, caps, root, spillRef) {
	if (paths.length === 0) return "No files found";
	if (paths.length <= caps.maxResults) return paths.join("\n");
	if (!caps.sampleOverCapGlobResults) return formatGlobPage(paths.slice(0, caps.maxResults), paths.length, spillRef, ".");
	return formatGlobOutput(sampleAcrossTopLevel(paths, caps.maxResults, root), paths.length, spillRef);
}
/**
* The inline page of paths a completed `glob` card shows, computed the SAME way
* {@link renderGlobPaths} computes its model-facing page so the card and the text
* agree on which paths survived the cap. A result within the cap is shown whole;
* an over-cap result is either the modification-time head or the top-level sample,
* matching the deployment's `sampleOverCapGlobResults`.
*
* @param paths - the complete discovered path list, in modification-time order.
* @param caps - the resolved glob caps (the inline cap and the sampling switch).
* @param root - the search root in the same display-path space as `paths`.
* @returns the inline page and whether the complete result was capped.
*/
function globCardPage(paths, caps, root) {
	if (paths.length <= caps.maxResults) return {
		items: paths,
		truncated: false
	};
	if (!caps.sampleOverCapGlobResults) return {
		items: paths.slice(0, caps.maxResults),
		truncated: true
	};
	return {
		items: sampleAcrossTopLevel(paths, caps.maxResults, root).items,
		truncated: true
	};
}
/**
* Pending-call presentation: a search card titled by the pattern (and root).
*
* @param args - the raw tool arguments; `pattern` and `path` feed the title.
* @returns the generic card view (`kind: 'search'`) shown while the call runs.
*/
function presentGlobCall(args) {
	const where = args.path !== void 0 ? ` in ${args.path}` : "";
	return {
		card: "generic",
		title: `Glob ${args.pattern}${where}`,
		kind: "search",
		rawInput: args.pattern
	};
}
/**
* Completed-call presentation: the search card projected from the result's
* `presentationMeta` (the discovered path list, with the truncation signal). A UI
* without a search card falls back to the raw `tool/result` content, so the view
* carries no result text of its own. Malformed or absent metadata (an obsolete or
* hand-edited replayed log) falls back to the generic card.
*
* @param _args - the raw tool arguments; unused, the view derives from the result.
* @param result - the final model-facing tool result carrying the projected metadata.
* @returns the search card view, or `undefined` for the generic fallback.
*/
function presentGlobResult(_args, result) {
	if (result.isError) return void 0;
	const view = searchViewFromMeta(result.meta);
	if (view === void 0 || view.shape !== "paths") return void 0;
	return view;
}
/**
* Register the `glob` tool and its scope-aware system-prompt guidance.
*
* @param ctx - the plugin context; registrations are effects scoped to it, and
*   execution uses its `subprocess` service.
* @param caps - the deployment's resolved glob caps (plugin config after defaulting).
*/
function applyGlobTool(ctx, caps) {
	const overCapGuidance = caps.sampleOverCapGlobResults ? "while a larger one is sampled across top-level entries, so it spans the tree instead of one subtree." : "while a larger one keeps the modification-time-ordered head.";
	ctx.systemPrompt.section({
		name: "tool:glob",
		order: ctx.systemPrompt.getSectionOrder("TOOL_GLOB"),
		text: ({ scope }) => ctx.tools.get("glob", scope) === void 0 ? "" : `Use the glob tool — not shell find — to discover files by path pattern. A pattern with no "/" matches basenames at any depth, so "*" matches every file in the tree rather than its top level. Results are files only, never directories, and include hidden and ignored files: a result that fits comes back in modification-time order, ${overCapGuidance}`
	});
	const overCapDescription = caps.sampleOverCapGlobResults ? `a larger result instead returns ${caps.maxResults} paths sampled across top-level entries` : `a larger result returns the first ${caps.maxResults} paths in modification-time order`;
	const tool = defineTool({
		name: "glob",
		description: `Find files whose paths match a glob pattern. Returns matching file paths — never directories — including hidden and ignored files (VCS metadata directories are excluded). Up to ${caps.maxResults} paths come back in modification-time order; ${overCapDescription}, says so, and reports where the complete sorted list was saved. This tool does not enumerate directory entries.`,
		parameters: {
			pattern: {
				type: "string",
				required: true,
				description: "Glob pattern to match file paths against (e.g. \"**/*.ts\", \"src/**/*.test.js\"). A pattern with no \"/\" matches the basename at any depth, so \"*\" and \"*.ts\" both search the whole tree; include a separator to anchor the depth."
			},
			path: {
				type: "string",
				description: "Directory to search in. Defaults to the session workspace; a relative path resolves against it."
			}
		},
		timeoutMs: caps.timeoutMs,
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					root: {
						type: "string",
						required: true
					},
					paths: {
						type: "array",
						required: true,
						items: { type: "string" }
					}
				}
			},
			render: (_args, value) => [{
				type: "text",
				text: renderGlobPaths(value.paths, caps, value.root)
			}],
			presentationMeta: (_args, value) => {
				const page = globCardPage(value.paths, caps, value.root);
				return globSearchMeta({
					items: page.items,
					truncated: page.truncated,
					seen: value.paths.length
				}, caps.maxMetaBytes);
			}
		},
		async execute(args, exec) {
			const input = parseGlobArgs(args);
			const run = await runRipgrep(ctx, exec, "glob", buildGlobCommand(input), caps.rawOutputMaxBytes, caps.graceMs, caps.stderrMaxBytes);
			const root = input.path === void 0 ? "." : toWorkdirRelative(input.path, run.workdir);
			if (run.noMatches) return {
				root,
				paths: []
			};
			const all = [];
			for (const line of run.stdout.split("\n")) {
				if (line.length === 0) continue;
				const displayPath = toWorkdirRelative(line, run.workdir);
				all.push(displayPath);
			}
			return {
				root,
				paths: all
			};
		},
		presentCall: presentGlobCall,
		presentResult: presentGlobResult
	});
	ctx.tools.register(tool);
	ctx.on("tools/post-execute", async (exec, result, next) => {
		const decision = await next();
		const value = acceptedDirectCallValue(ctx, tool, exec, result, decision);
		if (value === void 0) return decision;
		const paths = value.paths;
		if (paths.length <= caps.maxResults) return decision;
		const spillRef = await trySaveFormattedResult(ctx, exec, "glob-results.txt", paths.join("\n"));
		return {
			kind: "accept",
			content: [{
				type: "text",
				text: renderGlobPaths(paths, caps, value.root, spillRef)
			}],
			...decision.additionalContexts !== void 0 ? { additionalContexts: decision.additionalContexts } : {}
		};
	});
}
//#endregion
//#region lib/types/grep.js
/**
* The model-facing `grep` tool: search file contents with a ripgrep regular
* expression. Execution spawns the packaged ripgrep binary
* (`@vscode/ripgrep`) directly through the subprocess seam with a plain argv
* vector using a fixed line-oriented `rg --json` command so file path, line
* number, and line text parse without colon-splitting ambiguity — this module
* owns the model-facing schema, argument validation, argv construction,
* `--json` record parsing, per-line preview retention, match retention,
* grouping, and formatting; process concerns stay behind `ctx.subprocess`.
*
* @module @deepseek-ai/dsh-tool-fs-search/grep
*/
/**
* Default cap on flat matches retained inline by one `grep` call (the
* `grepMaxMatches` config), matching Claude Code's default `GrepTool`
* `head_limit`.
*/
const GREP_MAX_MATCHES = 250;
/**
* Default cap in bytes on one matched-line preview (the `grepMaxLineBytes`
* config); the cut preserves UTF-8 boundaries.
*/
const GREP_MAX_LINE_BYTES = 2e3;
/**
* Reject an `include` that is not ONE positive glob filter: blank strings,
* negated patterns (`!…`), and comma-separated lists. A comma inside a brace
* group is fine — `*.{ts,tsx}` is one glob with alternation, not a list.
*/
function validateInclude(include) {
	if (include.trim().length === 0) throw new Error("include must be a non-empty glob when given");
	if (include.startsWith("!")) throw new Error("include must be a positive glob filter; negated patterns (\"!…\") are not supported");
	let braceDepth = 0;
	for (const char of include) if (char === "{") braceDepth++;
	else if (char === "}") braceDepth = Math.max(0, braceDepth - 1);
	else if (char === "," && braceDepth === 0) throw new Error("include must be one glob, not a comma-separated list (use {a,b} alternation instead)");
}
/**
* Validate value constraints the schema DSL can't express: a non-EMPTY
* `pattern` (whitespace is a legitimate regex), a non-blank `path` when given,
* and a single positive `include` glob ({@link GrepInput}). Throws a plain
* `Error` (an ordinary tool argument error) otherwise.
*
* @param args - the schema-validated `grep` arguments.
* @returns the accepted input, unchanged.
*/
function parseGrepArgs(args) {
	if (args.pattern.length === 0) throw new Error("pattern must be a non-empty string");
	if (args.path !== void 0 && args.path.trim().length === 0) throw new Error("path must be a non-empty string when given");
	if (args.include !== void 0) validateInclude(args.include);
	return {
		pattern: args.pattern,
		...args.path !== void 0 ? { path: args.path } : {},
		...args.include !== void 0 ? { include: args.include } : {}
	};
}
/**
* Build the fixed line-oriented `rg --json` argv for one `grep` call. Every
* model-controlled value ({@link GrepInput.pattern}, {@link GrepInput.path},
* {@link GrepInput.include}) is a plain argv element — no shell layer exists,
* so no quoting applies; the pattern and include ride in `--flag=value` form
* and the target behind `--`, so a leading-dash value can never be parsed as
* a flag.
*
* @param input - the validated arguments.
* @returns the complete ripgrep argument vector (excluding the binary itself).
*/
function buildGrepCommand(input) {
	const parts = ["--json", `--regexp=${input.pattern}`];
	if (input.include !== void 0) parts.push(`--glob=${input.include}`);
	if (input.path !== void 0) parts.push("--", input.path);
	return parts;
}
/**
* The uniform malformed-output failure: raw `rg --json` is an internal
* transport, so missing or invalid response fields cause a search failure, not a partial result.
*/
function malformedRecord(detail, cause) {
	return new SearchError(`grep received malformed ripgrep --json output (${detail})`, "SEARCH_FAILED", cause !== void 0 ? { cause } : void 0);
}
/**
* Parse one `rg --json` NDJSON line into a match, `undefined` for the
* non-match record types (`begin`/`end`/`context`/`summary`). A line that is
* not JSON, or a `match` record missing its path / line number / line content,
* throws {@link SearchError} `SEARCH_FAILED`. A match whose line is not valid
* UTF-8 (ripgrep sends base64 `bytes` instead of `text`) yields a placeholder
* preview rather than failing the whole search.
*/
function parseRecord(line) {
	let parsed;
	try {
		parsed = JSON.parse(line);
	} catch (error) {
		throw malformedRecord("a line is not JSON", error);
	}
	if (typeof parsed !== "object" || parsed === null) throw malformedRecord("a record is not an object");
	const record = parsed;
	if (record.type !== "match") return void 0;
	if (typeof record.data !== "object" || record.data === null) throw malformedRecord("a match record has no data");
	const data = record.data;
	const pathText = typeof data.path === "object" && data.path !== null ? data.path.text : void 0;
	if (typeof pathText !== "string") throw malformedRecord("a match record has no path text");
	if (typeof data.line_number !== "number") throw malformedRecord("a match record has no line number");
	if (typeof data.lines !== "object" || data.lines === null) throw malformedRecord("a match record has no line content");
	const lines = data.lines;
	if (typeof lines.text === "string") return {
		path: pathText,
		lineNumber: data.line_number,
		line: lines.text.replace(/\r?\n$/, "")
	};
	if (typeof lines.bytes === "string") return {
		path: pathText,
		lineNumber: data.line_number,
		line: "(line is not valid UTF-8)"
	};
	throw malformedRecord("a match record has neither line text nor bytes");
}
/**
* Parse complete `rg --json` stdout into flat matches, in output order (ripgrep
* emits one file's matches contiguously). Only `match` records are consumed.
*
* @param stdout - the complete raw `rg --json` stdout.
* @returns the flat matches; empty for output with no match records.
*/
function parseGrepMatches(stdout) {
	const matches = [];
	for (const line of stdout.split("\n")) {
		if (line.length === 0) continue;
		const match = parseRecord(line);
		if (match !== void 0) matches.push(match);
	}
	return matches;
}
/** `match` / `matches` for a count. */
function matchNoun(count) {
	return count === 1 ? "match" : "matches";
}
/**
* Group flat matches by file (first-seen order) into the model-facing body:
* each file's display path, then one `Line N: <text>` row per match.
*
* @param matches - the flat matches to render.
* @returns the grouped body text.
*/
function formatGrepMatches(matches) {
	const byFile = /* @__PURE__ */ new Map();
	for (const match of matches) {
		const group = byFile.get(match.path);
		if (group !== void 0) group.push(match);
		else byFile.set(match.path, [match]);
	}
	const sections = [];
	for (const [path, group] of byFile) sections.push(`${path}\n${group.map((m) => `Line ${m.lineNumber}: ${m.line}`).join("\n")}`);
	return sections.join("\n\n");
}
/**
* Format the model-facing `grep` result: a found-count header, the retained
* matches grouped by file, then — when the result was capped — a footer
* carrying either the formatted-spill recovery locator or the could-not-save
* explanation. The omitted count is a budget fact: the search itself completed.
*
* @param retained - the retention outcome over every parsed match.
* @param spillRef - the saved complete-result reference, or `undefined` when unsaved.
* @returns the model-facing text.
*/
function formatGrepOutput(retained, spillRef) {
	const header = retained.truncated ? `Found ${retained.kept} of ${retained.seen} matches` : `Found ${retained.seen} ${matchNoun(retained.seen)}`;
	const body = formatGrepMatches(retained.items);
	if (!retained.truncated) return `${header}\n\n${body}`;
	return `${header}\n\n${body}\n\n(${spillRef !== void 0 ? `Full grep result stored at: ${spillRef.locator}. ${spillRef.retrievalHint}` : "The complete result could not be saved; narrow pattern, path, or include to see more."})`;
}
/** Format one already-retained match list for the Native surface. */
function formatRetainedGrep(retained, spillRef) {
	if (retained.seen === 0) return "No matches found";
	return formatGrepOutput(retained, spillRef);
}
/**
* Pending-call presentation: a search card titled by the pattern (and target /
* include filter).
*
* @param args - the raw tool arguments; `pattern`, `path`, and `include` feed the title.
* @returns the generic card view (`kind: 'search'`) shown while the call runs.
*/
function presentGrepCall(args) {
	const where = args.path !== void 0 ? ` in ${args.path}` : "";
	const filter = args.include !== void 0 ? ` (${args.include})` : "";
	return {
		card: "generic",
		title: `Grep ${args.pattern}${where}${filter}`,
		kind: "search",
		rawInput: args.pattern
	};
}
/**
* Completed-call presentation: the search card projected from the result's
* `presentationMeta` (matches grouped by file, with the truncation signal). A UI
* without a search card falls back to the raw `tool/result` content, so the view
* carries no result text of its own. Malformed or absent metadata (an obsolete or
* hand-edited replayed log) falls back to the generic card.
*
* @param _args - the raw tool arguments; unused, the view derives from the result.
* @param result - the final model-facing tool result carrying the projected metadata.
* @returns the search card view, or `undefined` for the generic fallback.
*/
function presentGrepResult(_args, result) {
	if (result.isError) return void 0;
	const view = searchViewFromMeta(result.meta);
	if (view === void 0 || view.shape !== "matches") return void 0;
	return view;
}
/**
* Register the `grep` tool and its scope-aware system-prompt guidance.
*
* @param ctx - the plugin context; registrations are effects scoped to it, and
*   execution uses its `subprocess` service.
* @param caps - the deployment's resolved grep caps (plugin config after defaulting).
*/
function applyGrepTool(ctx, caps) {
	ctx.systemPrompt.section({
		name: "tool:grep",
		order: ctx.systemPrompt.getSectionOrder("TOOL_GREP"),
		text: ({ scope }) => ctx.tools.get("grep", scope) === void 0 ? "" : "Use the grep tool — not shell grep or rg — to search file contents." + (ctx.tools.get("read", scope) === void 0 ? "" : " Use read on a matched file when you need surrounding context.")
	});
	const tool = defineTool({
		name: "grep",
		description: `Search file contents with a ripgrep regular expression. Returns matching lines with line numbers, grouped by file. Returns the first ${caps.maxMatches} matches inline; a capped result reports where the complete match list was saved. Use read on a matched file for surrounding context.`,
		parameters: {
			pattern: {
				type: "string",
				required: true,
				description: "Regular expression to search for (ripgrep syntax)."
			},
			path: {
				type: "string",
				description: "File or directory to search. Defaults to the session workspace; a relative path resolves against it."
			},
			include: {
				type: "string",
				description: "One glob filter for which files to search (e.g. \"*.ts\", \"*.{js,jsx}\"). Not a list; negation is not supported."
			}
		},
		timeoutMs: caps.timeoutMs,
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: { matches: {
					type: "array",
					required: true,
					items: {
						type: "object",
						additionalProperties: false,
						properties: {
							path: {
								type: "string",
								required: true
							},
							lineNumber: {
								type: "integer",
								required: true
							},
							line: {
								type: "string",
								required: true
							}
						}
					}
				} }
			},
			render: (_args, value) => [{
				type: "text",
				text: formatRetainedGrep(retainGrepMatches(value.matches, caps.maxMatches, caps.maxLineBytes))
			}],
			presentationMeta: (_args, value) => grepSearchMeta(retainGrepMatches(value.matches, caps.maxMatches, caps.maxLineBytes), caps.maxMetaBytes)
		},
		async execute(args, exec) {
			const run = await runRipgrep(ctx, exec, "grep", buildGrepCommand(parseGrepArgs(args)), caps.rawOutputMaxBytes, caps.graceMs, caps.stderrMaxBytes);
			if (run.noMatches) return { matches: [] };
			const all = [];
			for (const raw of parseGrepMatches(run.stdout)) {
				const match = {
					path: toWorkdirRelative(raw.path, run.workdir),
					lineNumber: raw.lineNumber,
					line: raw.line
				};
				all.push(match);
			}
			return { matches: all };
		},
		presentCall: presentGrepCall,
		presentResult: presentGrepResult
	});
	ctx.tools.register(tool);
	ctx.on("tools/post-execute", async (exec, result, next) => {
		const decision = await next();
		const value = acceptedDirectCallValue(ctx, tool, exec, result, decision);
		if (value === void 0) return decision;
		const matches = value.matches;
		if (matches.length <= caps.maxMatches) return decision;
		const previewedAll = matches.map((match) => ({
			...match,
			line: previewLine(match.line, caps.maxLineBytes)
		}));
		const spillRef = await trySaveFormattedResult(ctx, exec, "grep-results.txt", `Found ${matches.length} ${matchNoun(matches.length)}\n\n${formatGrepMatches(previewedAll)}`);
		return {
			kind: "accept",
			content: [{
				type: "text",
				text: formatRetainedGrep(retainGrepMatches(matches, caps.maxMatches, caps.maxLineBytes), spillRef)
			}],
			...decision.additionalContexts !== void 0 ? { additionalContexts: decision.additionalContexts } : {}
		};
	});
}
//#endregion
//#region lib/types/index.js
/**
* The model-facing filesystem discovery tool suite (`glob`, `grep`) over the
* packaged ripgrep binary (`@vscode/ripgrep`). This single plugin registers
* both tools; the binary ships inside the npm dependency, so no system `rg`
* install and no shell layer is involved.
*
* ## Spawn-backed, not a `ctx.fs` provider method
*
* Local workspace discovery is a process-backed `rg` workflow, so these tools
* execute through `ctx.subprocess.spawn()` with fixed ripgrep argv templates —
* never `ctx.shell`, never `ctx.shell.start()`, never a model-visible background
* task. The tool layer owns schemas, argument validation, argv construction
* ({@link module:@deepseek-ai/dsh-tool-fs-search/glob} /
* {@link module:@deepseek-ai/dsh-tool-fs-search/grep}), result parsing,
* retention, formatted-result spill, and timeout declaration; the subprocess
* seam owns spawn execution, process-tree termination, environment scrubbing,
* and raw output capture. The package injects `tools`, `systemPrompt`, and
* `subprocess` — deliberately NOT `fs`, and `ctx.spillStore` is read
* opportunistically with `ctx.get()` because formatted-result spill is optional.
*
* Returned paths are displayed relative to the resolved workdir and are
* follow-up-readable only in co-located deployments where the workdir and the
* filesystem `read` root are the same workspace — a documented v1 deployment
* requirement, not runtime-validated.
*
* @module @deepseek-ai/dsh-tool-fs-search
*/
/** Cordis plugin name used by loader diagnostics. */
const name = "tool-fs-search";
/** Services required by the search tool suite (`spillStore` is optional, read via `ctx.get()`). */
const inject = [
	"tools",
	"systemPrompt",
	"subprocess"
];
const Config = z.object({
	sampleOverCapGlobResults: z.boolean().required(),
	globMaxResults: z.number().default(100),
	grepMaxMatches: z.number().default(250),
	grepMaxLineBytes: z.number().default(GREP_MAX_LINE_BYTES),
	searchMetaMaxBytes: z.number().default(SEARCH_META_MAX_BYTES),
	rawOutputMaxBytes: z.number().default(RAW_OUTPUT_MAX_BYTES),
	graceMs: z.number().default(SEARCH_GRACE_MS),
	stderrMaxBytes: z.number().default(SEARCH_STDERR_MAX_BYTES),
	timeoutMs: z.number().default(SEARCH_TIMEOUT_MS)
});
/** Every search cap counts items/bytes/milliseconds — a positive integer, or retention and timeout arithmetic misbehaves silently. */
function assertPositiveInteger(name, value) {
	if (!Number.isInteger(value) || value < 1) throw new Error(`tool-fs-search: ${name} must be a positive integer`);
}
/**
* Register the `glob`/`grep` filesystem discovery tool suite. The packaged
* ripgrep binary is always available (an npm dependency), so registration is
* unconditional.
*
* @param ctx - plugin context; registrations are effects scoped to this plugin.
* @param config - resolved plugin configuration from schemastery.
*/
async function apply(ctx, config) {
	const resolved = config;
	assertPositiveInteger("globMaxResults", resolved.globMaxResults);
	assertPositiveInteger("grepMaxMatches", resolved.grepMaxMatches);
	assertPositiveInteger("grepMaxLineBytes", resolved.grepMaxLineBytes);
	assertPositiveInteger("searchMetaMaxBytes", resolved.searchMetaMaxBytes);
	assertPositiveInteger("rawOutputMaxBytes", resolved.rawOutputMaxBytes);
	assertPositiveInteger("graceMs", resolved.graceMs);
	if (resolved.graceMs > MAX_TIMER_DELAY_MS) throw new Error(`tool-fs-search: graceMs must be no greater than ${MAX_TIMER_DELAY_MS}`);
	assertPositiveInteger("stderrMaxBytes", resolved.stderrMaxBytes);
	assertPositiveInteger("timeoutMs", resolved.timeoutMs);
	applyGlobTool(ctx, {
		sampleOverCapGlobResults: resolved.sampleOverCapGlobResults,
		maxResults: resolved.globMaxResults,
		maxMetaBytes: resolved.searchMetaMaxBytes,
		rawOutputMaxBytes: resolved.rawOutputMaxBytes,
		graceMs: resolved.graceMs,
		stderrMaxBytes: resolved.stderrMaxBytes,
		timeoutMs: resolved.timeoutMs
	});
	applyGrepTool(ctx, {
		maxMatches: resolved.grepMaxMatches,
		maxLineBytes: resolved.grepMaxLineBytes,
		maxMetaBytes: resolved.searchMetaMaxBytes,
		rawOutputMaxBytes: resolved.rawOutputMaxBytes,
		graceMs: resolved.graceMs,
		stderrMaxBytes: resolved.stderrMaxBytes,
		timeoutMs: resolved.timeoutMs
	});
}
//#endregion
export { Config, GLOB_MAX_RESULTS, GLOB_VCS_EXCLUDES, GREP_MAX_LINE_BYTES, GREP_MAX_MATCHES, RAW_OUTPUT_MAX_BYTES, SEARCH_GRACE_MS, SEARCH_META_MAX_BYTES, SEARCH_STDERR_MAX_BYTES, SEARCH_TIMEOUT_MS, SearchError, apply, applyGlobTool, applyGrepTool, buildGlobCommand, buildGrepCommand, formatGlobOutput, formatGrepMatches, formatGrepOutput, inject, name, parseGlobArgs, parseGrepArgs, parseGrepMatches, presentGlobCall, presentGlobResult, presentGrepCall, presentGrepResult, previewLine, resolveRgPath, runRipgrep, sampleAcrossTopLevel, toWorkdirRelative, trySaveFormattedResult };
