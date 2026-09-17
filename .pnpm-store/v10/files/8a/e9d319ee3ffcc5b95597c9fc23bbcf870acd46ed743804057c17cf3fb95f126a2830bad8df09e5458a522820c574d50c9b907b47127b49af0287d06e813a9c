/**
 * Parse Codex's five-event hook subset into shared {@link MatcherGroup}s. Only synchronous command
 * hooks run; other types and `async: true` commands are recorded as skipped. Codex performs no
 * command substitution.
 * @module @deepseek-ai/dsh-hooks-codex/config
 */
import { type MatcherGroup } from '@deepseek-ai/dsh-hook-protocol';
/** The five Codex hook points this bridge supports. */
export declare const CODEX_EVENTS: readonly ["PreToolUse", "PostToolUse", "SessionStart", "UserPromptSubmit", "Stop"];
/** A parsed Codex config: event name → its matcher groups (command hooks only). */
export type CodexHookConfig = Record<string, MatcherGroup[]>;
/** A skipped non-command (or async) hook, surfaced so the bridge can warn. */
export interface SkippedHook {
    event: string;
    reason: string;
}
/** The outcome of parsing one Codex config file. */
export interface ParsedCodexConfig {
    config: CodexHookConfig;
    skipped: SkippedHook[];
}
/**
 * Parse a wrapped or bare Codex event map. Unknown events and malformed entries are ignored rather
 * than failing boot; unsupported or asynchronous hooks are returned in `skipped`. Matcher fields on
 * UserPromptSubmit and Stop are discarded because those events have no matcher subject. A
 * matcher-bearing runnable group with an invalid regex throws a `SyntaxError`, allowing the bridge
 * to reject the complete config before listener registration.
 * @param raw - the parsed JSON config: a `{ hooks: … }` wrapper or the bare event map.
 * @returns the runnable per-event groups plus the skipped hooks with their reasons.
 */
export declare function parseCodexConfig(raw: unknown): ParsedCodexConfig;
//# sourceMappingURL=config.d.ts.map