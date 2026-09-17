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
import type { Context } from '@deepseek-ai/cordis';
import type { GenericCallView, SearchResultView, ToolResult } from '@deepseek-ai/dsh-tools';
import type { SpillRef } from '@deepseek-ai/dsh-spill';
/**
 * Default cap on paths retained inline by one `glob` call (the `globMaxResults`
 * config), matching Claude Code's default `GlobTool` result limit.
 */
export declare const GLOB_MAX_RESULTS = 100;
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
export declare const GLOB_VCS_EXCLUDES: readonly string[];
/** Resolved glob-tool caps — plugin config after defaulting (see `Config` in index.ts). */
export interface GlobToolCaps {
    /** Whether over-cap pages are sampled across top-level entries instead of taking the modification-time head. */
    sampleOverCapGlobResults: boolean;
    /** Max paths retained inline; later paths go to the formatted spill file. */
    maxResults: number;
    /** Max bytes of serialized `presentationMeta`; trailing paths drop past it. */
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
/** Validated `glob` arguments. */
export interface GlobInput {
    pattern: string;
    path?: string;
}
/**
 * Validate value constraints the schema DSL can't express: a non-blank
 * `pattern`, and a non-blank `path` when given. Throws a plain `Error` (an
 * ordinary tool argument error) otherwise.
 *
 * @param args - the schema-validated `glob` arguments.
 * @returns the accepted input, unchanged.
 */
export declare function parseGlobArgs(args: {
    pattern: string;
    path?: string;
}): GlobInput;
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
export declare function buildGlobCommand(input: GlobInput): string[];
/**
 * The inline page of a capped `glob` result, plus how much of the complete
 * result's top level it reaches.
 */
export interface GlobSample {
    /** Paths to show inline: grouped by top-level entry, modification-time ordered within each group. */
    items: string[];
    /** Distinct top-level entries the shown paths reach. */
    shown: number;
    /** Distinct top-level entries across the complete result. */
    total: number;
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
export declare function sampleAcrossTopLevel(paths: readonly string[], maxItems: number, root?: string): GlobSample;
/**
 * Format a capped sampled page and its complete-result recovery path. A flat
 * result keeps the plain footer because its sample is the modification-time head.
 *
 * @param sample - the inline page and its top-level spread.
 * @param seen - how many paths the complete result holds; always more than the page.
 * @param spillRef - the saved complete-result reference, or `undefined` when unsaved.
 * @returns the model-facing text.
 */
export declare function formatGlobOutput(sample: GlobSample, seen: number, spillRef: SpillRef | undefined): string;
/**
 * Pending-call presentation: a search card titled by the pattern (and root).
 *
 * @param args - the raw tool arguments; `pattern` and `path` feed the title.
 * @returns the generic card view (`kind: 'search'`) shown while the call runs.
 */
export declare function presentGlobCall(args: {
    pattern: string;
    path?: string;
}): GenericCallView;
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
export declare function presentGlobResult(_args: {
    pattern: string;
    path?: string;
}, result: ToolResult): SearchResultView | undefined;
/**
 * Register the `glob` tool and its scope-aware system-prompt guidance.
 *
 * @param ctx - the plugin context; registrations are effects scoped to it, and
 *   execution uses its `subprocess` service.
 * @param caps - the deployment's resolved glob caps (plugin config after defaulting).
 */
export declare function applyGlobTool(ctx: Context, caps: GlobToolCaps): void;
//# sourceMappingURL=glob.d.ts.map