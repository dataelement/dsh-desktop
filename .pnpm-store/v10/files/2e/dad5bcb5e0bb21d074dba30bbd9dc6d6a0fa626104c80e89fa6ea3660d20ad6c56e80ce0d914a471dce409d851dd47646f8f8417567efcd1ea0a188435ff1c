/**
 * Parse Claude Code's event-to-matcher-group hook format into shared {@link MatcherGroup}s.
 * Only command hooks run; other hook types are returned as skipped so the
 * bridge can warn. Plugin-root and project-directory substitutions are applied
 * to commands at parse time.
 * @module @deepseek-ai/dsh-hooks-claude-code/config
 */
import { type MatcherGroup } from '@deepseek-ai/dsh-hook-protocol';
/** A parsed CC config: event name → its matcher groups (command hooks only). */
export type ClaudeCodeHookConfig = Record<string, MatcherGroup[]>;
/** A skipped non-command hook, surfaced so the bridge can warn about it. */
export interface SkippedHook {
    event: string;
    type: string;
}
/** The outcome of parsing one config file: the runnable groups + what was skipped. */
export interface ParsedClaudeConfig {
    config: ClaudeCodeHookConfig;
    skipped: SkippedHook[];
}
/** Substitution variables applied to each `command` string at parse time. */
export interface SubstitutionVars {
    /** Replaces `${CLAUDE_PLUGIN_ROOT}` — the plugin's root dir. */
    pluginRoot?: string;
    /** Replaces `${CLAUDE_PROJECT_DIR}` — the project root. */
    projectDir?: string;
}
/**
 * Apply `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PROJECT_DIR}` substitution to a command string.
 * @param command - the raw command from config.
 * @param vars - the substitution values; a token whose variable is unset stays verbatim.
 * @returns the command with every occurrence of each set token replaced.
 */
export declare function substituteCommand(command: string, vars: SubstitutionVars): string;
/**
 * Parse either a settings `hooks` value or a bare `hooks.json` event map. Malformed entries are
 * ignored rather than failing boot; unsupported events are ignored before their groups are parsed,
 * non-command hooks are returned in `skipped`, and substitutions are applied to every surviving
 * command. Matcher fields on UserPromptSubmit and Stop are discarded because those events have no
 * matcher subject. A matcher-bearing supported runnable group with an invalid regex throws a
 * `SyntaxError`, allowing the bridge to reject the complete config before listener registration.
 *
 * @param raw - the parsed JSON config: a settings object with a `hooks` key, or the bare
 *   event map.
 * @param vars - substitution values applied to every surviving `command` (defaults to
 *   none).
 * @returns the runnable per-event groups plus the skipped non-command hooks.
 */
export declare function parseClaudeCodeConfig(raw: unknown, vars?: SubstitutionVars): ParsedClaudeConfig;
//# sourceMappingURL=config.d.ts.map