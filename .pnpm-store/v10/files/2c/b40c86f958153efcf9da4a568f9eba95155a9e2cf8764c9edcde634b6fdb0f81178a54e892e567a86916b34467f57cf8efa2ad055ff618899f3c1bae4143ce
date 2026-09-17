/**
 * Bridge for unmodified Claude Code command hooks on harness interception
 * extension points. It supports SessionStart, prompt/tool pre/post, Stop, and subagent
 * start/stop. It owns Claude payloads, environment, substitution, and decision
 * mapping; shared execution and parsing live in `dsh-hook-protocol`.
 * `updatedInput` is logged and warned but not honored. Bespoke behavior should
 * use typed native plugins on the same extension points.
 * @module @deepseek-ai/dsh-hooks-claude-code
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export declare const name = "hooks-claude-code";
export declare const inject: string[];
/** Plugin config: where the CC hook config lives + substitution roots. */
export interface Config {
    /**
     * Path to a `hooks.json` or a settings file whose `hooks` key holds the config.
     * Process-level: read once at load, a relative path resolves against the process
     * launch cwd, so one config applies to the whole process.
     * TODO(per-session-hook-config): per-session discovery of a project-local
     * `hooks.json` from each `session/new.cwd`.
     */
    configPath: string;
    /**
     * Replaces `${CLAUDE_PLUGIN_ROOT}` in command strings (the plugin's root dir).
     */
    pluginRoot?: string;
    /**
     * Replaces `${CLAUDE_PROJECT_DIR}` in command strings AND is exported as the
     * `CLAUDE_PROJECT_DIR` env var for hook processes. When omitted, the env var
     * defaults per-run to the agent's session workspace (`session.header.cwd`, the
     * same dir the hook runs in) — Claude Code always exports this var, and common
     * unmodified hooks reference `$CLAUDE_PROJECT_DIR` for project-relative paths.
     */
    projectDir?: string;
    /** Default per-hook timeout in ms when a hook sets none (CC default: 600000). */
    defaultTimeoutMs?: number;
    /** Character cap for the `hook/result` event's persisted stderr summary. */
    stderrSummaryMaxChars?: number;
}
export declare const Config: z<Config>;
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map