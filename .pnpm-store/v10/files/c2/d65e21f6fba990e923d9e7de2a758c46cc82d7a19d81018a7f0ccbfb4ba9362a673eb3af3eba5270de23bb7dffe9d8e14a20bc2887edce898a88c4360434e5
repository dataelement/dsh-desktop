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
import type { Context } from '@deepseek-ai/cordis';
import { HarnessError } from '@deepseek-ai/dsh-llm';
import type { RetainedItems } from '@deepseek-ai/dsh-output-retention';
import type { SpillRef } from '@deepseek-ai/dsh-spill';
import type { ToolExecution } from '@deepseek-ai/dsh-tools';
/**
 * Default cap on the complete raw `rg` stdout the tools will parse (the
 * `rawOutputMaxBytes` config), matching Claude Code's ripgrep raw buffer.
 */
export declare const RAW_OUTPUT_MAX_BYTES = 20000000;
/**
 * Default cooperative tool-call timeout budget in milliseconds (the `timeoutMs`
 * config), attached to both tool definitions for
 * `@deepseek-ai/dsh-tool-call-timeout-policy` to enforce through `exec.signal`.
 */
export declare const SEARCH_TIMEOUT_MS = 30000;
/**
 * Default cap in bytes on the retained stderr tail of one search run — a
 * diagnostic excerpt only (the tool never reads a stderr spill path, and the
 * collect disposition requests none).
 */
export declare const SEARCH_STDERR_MAX_BYTES: number;
/** Default terminate grace period for a search process (ms). */
export declare const SEARCH_GRACE_MS = 3000;
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
export declare const SEARCH_META_MAX_BYTES = 65536;
/**
 * Stable, machine-routable codes for search failures. Package-owned (not
 * `FsErrorCode`) because these tools are spawn-backed discovery, not `ctx.fs`
 * provider operations: `SEARCH_INVALID_PATTERN` — ripgrep rejected the regex or
 * glob; `SEARCH_FAILED` — the search could not run or its output could not be
 * parsed (a failed `rg` launch, inaccessible target, signal kill, malformed
 * `--json`); `SEARCH_RAW_OUTPUT_OVERFLOW` — raw `rg` output exceeded
 * `rawOutputMaxBytes` or stayed truncated after that requested stdout budget;
 * `SEARCH_ABORTED` — the cooperative tool timeout or caller cancellation cut
 * the search short.
 */
export type SearchErrorCode = 'SEARCH_INVALID_PATTERN' | 'SEARCH_FAILED' | 'SEARCH_RAW_OUTPUT_OVERFLOW' | 'SEARCH_ABORTED';
/**
 * Typed search failure. Extends {@link HarnessError} so it carries a stable
 * {@link SearchErrorCode} and chains `cause`; the tool registry exposes
 * `{ name, code }` on `isError` results so retry/permission/UI layers can
 * branch without parsing messages.
 */
export declare class SearchError extends HarnessError {
    readonly code: SearchErrorCode;
    constructor(message: string, code: SearchErrorCode, options?: ErrorOptions);
}
/** The completed acquisition of one `rg` run: complete stdout plus the resolved workdir. */
export interface RipgrepRun {
    /** Complete raw stdout retained by the subprocess seam within the requested cap. */
    stdout: string;
    /** True when ripgrep exited 1: a successful search with zero results. */
    noMatches: boolean;
    /** The resolved working directory the command ran in (the display-relativization base). */
    workdir: string;
}
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
export declare function resolveRgPath(): Promise<string>;
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
export declare function runRipgrep(ctx: Context, exec: ToolExecution, toolName: string, argv: readonly string[], rawOutputMaxBytes: number, graceMs: number, stderrMaxBytes: number): Promise<RipgrepRun>;
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
export declare function toWorkdirRelative(path: string, workdir: string): string;
/** One parsed match: the file, the 1-based line number, and the (possibly previewed) line text. */
export interface GrepMatch {
    path: string;
    lineNumber: number;
    line: string;
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
export declare function previewLine(line: string, maxBytes: number): string;
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
export declare function retainGrepMatches(matches: GrepMatch[], maxMatches: number, maxLineBytes: number): RetainedItems<GrepMatch>;
/**
 * Apply the shared inline cap to a canonical `glob` path list: keep the first
 * `maxResults`. The single retention pass both the model-facing render and the
 * search-card projection consume.
 *
 * @param paths - every path the search discovered (the canonical value's paths).
 * @param maxResults - the inline path cap (the `globMaxResults` config).
 * @returns the retention outcome over the paths.
 */
export declare function retainGlobPaths(paths: string[], maxResults: number): RetainedItems<string>;
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
export declare function trySaveFormattedResult(ctx: Context, exec: ToolExecution, suggestedName: string, content: string): Promise<SpillRef | undefined>;
//# sourceMappingURL=search-core.d.ts.map