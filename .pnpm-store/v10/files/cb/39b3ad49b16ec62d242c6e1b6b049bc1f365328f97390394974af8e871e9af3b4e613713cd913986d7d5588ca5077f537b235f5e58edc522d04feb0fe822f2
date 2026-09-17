/**
 * Bridge for unmodified Codex command hooks on harness interception points. It
 * supports five points (SessionStart, prompt/tool pre/post, Stop), regex-only
 * matchers, snake_case payloads without a trailing newline, no hook environment
 * or command substitution, and no pre-tool approval or rewrite path; only
 * blocking decisions are honored. Shared execution and parsing live in
 * `dsh-hook-protocol`.
 * @module @deepseek-ai/dsh-hooks-codex
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export declare const name = "hooks-codex";
export declare const inject: string[];
/** Plugin config: where the Codex hooks.json lives + the model name for payloads. */
export interface Config {
    /**
     * Path to a Codex `hooks.json`. Process-level: read once at load, a relative
     * path resolves against the process launch cwd.
     * TODO(per-session-hook-config): per-session project-local discovery from each
     * `session/new.cwd`.
     */
    configPath: string;
    /** The model name stamped on every payload (Codex includes `model` on each event). */
    model?: string;
    /** Default per-hook timeout in ms when a hook sets none (Codex default: 600000). */
    defaultTimeoutMs?: number;
    /** Character cap for the `hook/result` event's persisted stderr summary. */
    stderrSummaryMaxChars?: number;
}
export declare const Config: z<Config>;
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map