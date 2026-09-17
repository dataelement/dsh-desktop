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
import type { Context } from '@deepseek-ai/cordis';
import type { GenericCallView, SearchResultView, ToolResult } from '@deepseek-ai/dsh-tools';
import type { RetainedItems } from '@deepseek-ai/dsh-output-retention';
import type { SpillRef } from '@deepseek-ai/dsh-spill';
import type { GrepMatch } from './search-core.ts';
/**
 * Default cap on flat matches retained inline by one `grep` call (the
 * `grepMaxMatches` config), matching Claude Code's default `GrepTool`
 * `head_limit`.
 */
export declare const GREP_MAX_MATCHES = 250;
/**
 * Default cap in bytes on one matched-line preview (the `grepMaxLineBytes`
 * config); the cut preserves UTF-8 boundaries.
 */
export declare const GREP_MAX_LINE_BYTES = 2000;
/** Resolved grep-tool caps — plugin config after defaulting (see `Config` in index.ts). */
export interface GrepToolCaps {
    /** Max flat matches retained inline; later matches go to the formatted spill file. */
    maxMatches: number;
    /** Max bytes retained per matched-line preview. */
    maxLineBytes: number;
    /** Max bytes of serialized `presentationMeta`; trailing file groups drop past it. */
    maxMetaBytes: number;
    /** Cap on the complete raw `rg` stdout the tool will parse. */
    rawOutputMaxBytes: number;
    /** Terminate-escalation grace period (ms) for the search process. */
    graceMs: number;
    /** Cap on the retained stderr diagnostic tail. */
    stderrMaxBytes: number;
    /** Cooperative tool-call budget (ms) attached as `ToolDefinition.timeoutMs`. */
    timeoutMs: number;
}
/** Validated `grep` arguments. */
export interface GrepInput {
    pattern: string;
    path?: string;
    include?: string;
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
export declare function parseGrepArgs(args: {
    pattern: string;
    path?: string;
    include?: string;
}): GrepInput;
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
export declare function buildGrepCommand(input: GrepInput): string[];
/**
 * Parse complete `rg --json` stdout into flat matches, in output order (ripgrep
 * emits one file's matches contiguously). Only `match` records are consumed.
 *
 * @param stdout - the complete raw `rg --json` stdout.
 * @returns the flat matches; empty for output with no match records.
 */
export declare function parseGrepMatches(stdout: string): GrepMatch[];
/**
 * Group flat matches by file (first-seen order) into the model-facing body:
 * each file's display path, then one `Line N: <text>` row per match.
 *
 * @param matches - the flat matches to render.
 * @returns the grouped body text.
 */
export declare function formatGrepMatches(matches: GrepMatch[]): string;
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
export declare function formatGrepOutput(retained: RetainedItems<GrepMatch>, spillRef: SpillRef | undefined): string;
/**
 * Pending-call presentation: a search card titled by the pattern (and target /
 * include filter).
 *
 * @param args - the raw tool arguments; `pattern`, `path`, and `include` feed the title.
 * @returns the generic card view (`kind: 'search'`) shown while the call runs.
 */
export declare function presentGrepCall(args: {
    pattern: string;
    path?: string;
    include?: string;
}): GenericCallView;
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
export declare function presentGrepResult(_args: {
    pattern: string;
    path?: string;
    include?: string;
}, result: ToolResult): SearchResultView | undefined;
/**
 * Register the `grep` tool and its scope-aware system-prompt guidance.
 *
 * @param ctx - the plugin context; registrations are effects scoped to it, and
 *   execution uses its `subprocess` service.
 * @param caps - the deployment's resolved grep caps (plugin config after defaulting).
 */
export declare function applyGrepTool(ctx: Context, caps: GrepToolCaps): void;
//# sourceMappingURL=grep.d.ts.map