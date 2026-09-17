/**
 * Advisory per-agent repeat-call detector. It enriches post-execute decisions
 * with logged model context without vetoing or rewriting calls. Configuration
 * and chain semantics live in the package README; rationale lives in the
 * repeat-tool-reminder Agent Note.
 * @module @deepseek-ai/dsh-repeat-tool-reminder
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export declare const name = "repeat-tool-reminder";
/**
 * Plugin config, validated by the same-named schemastery schema plus the
 * load-time checks in `apply` (misconfiguration fails loud: an empty
 * `thresholds` list, a non-integer, a value below 2, or a duplicate throws at
 * plugin load, never a silent fall-back). `include`/`exclude` entries are
 * `*`-wildcard predicates over tool names at call time, not references to
 * registry entries — a pattern matching no currently registered tool is valid
 * (`exclude: [mcp_*]` must stay legal in a deployment that loads no MCP tools).
 */
export interface Config {
    /** Consecutive-repeat counts that trigger a reminder (default `[3, 5, 8]`). */
    thresholds?: number[];
    /** Tool-name patterns to track; empty means every tool is tracked. */
    include?: string[];
    /** Tool-name patterns transparent to the chain (neither count nor reset). */
    exclude?: string[];
    /**
     * Maximum characters of canonical arguments quoted in the DETAILED reminder
     * (default 500). Large payloads (a `write` body, a long command) would
     * otherwise ride into the next request unbounded — precisely in a loop
     * scenario; the cap bounds the reminder, never the detection (the chain key
     * always compares the FULL canonical string).
     */
    argumentsPreviewChars?: number;
}
export declare const Config: z<Config>;
/**
 * Install the guard's listeners.
 * @param ctx - plugin context; listeners are scoped to it and disposed with it.
 * @param config - validated {@link Config}; `thresholds` is re-checked fail-loud here.
 */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map