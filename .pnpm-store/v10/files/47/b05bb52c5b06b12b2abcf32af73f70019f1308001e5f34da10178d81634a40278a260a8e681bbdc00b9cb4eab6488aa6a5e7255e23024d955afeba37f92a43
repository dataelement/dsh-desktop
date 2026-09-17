/**
 * Matcher shared by both hook dialects. Claude treats alphanumeric/underscore/
 * pipe patterns as literal alternatives and other patterns as regex; Codex
 * treats every non-empty pattern as an unanchored regex. Missing, empty, and
 * `*` match all. Runtime matching contains invalid regexes as non-matches;
 * config parsers use {@link matcherDiagnostic} to reject them with a diagnostic.
 * @module @deepseek-ai/dsh-hook-protocol/matcher
 */
import type { MatcherMode } from './types.ts';
/**
 * Validate one matcher before a bridge accepts its config group.
 * @param matcher - configured pattern; match-all sentinels are valid.
 * @param mode - dialect deciding whether a word-and-pipe pattern is literal.
 * @returns `undefined` for a valid matcher, otherwise a stable diagnostic.
 */
export declare function matcherDiagnostic(matcher: string | undefined, mode: MatcherMode): string | undefined;
/**
 * Whether `matcher` selects `query` under the given dialect. Claude literal
 * patterns exact-match pipe-separated alternatives; all other patterns are
 * unanchored regexes. Invalid regexes return `false` rather than throwing;
 * bridge config parsers surface them through {@link matcherDiagnostic} before use.
 * @param matcher - the configured pattern; absent/empty/`'*'` are the match-all sentinels.
 * @param query - the candidate value (a tool name, a session source, …).
 * @param mode - the dialect deciding literal-vs-regex interpretation of the pattern.
 * @returns `true` when the pattern selects the query; `false` on a non-match or an invalid
 *   regex.
 */
export declare function matchesMatcher(matcher: string | undefined, query: string, mode: MatcherMode): boolean;
//# sourceMappingURL=matcher.d.ts.map