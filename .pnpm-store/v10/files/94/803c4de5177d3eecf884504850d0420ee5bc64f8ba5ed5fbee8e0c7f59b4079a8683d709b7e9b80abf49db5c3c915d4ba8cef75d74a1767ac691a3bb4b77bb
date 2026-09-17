/**
 * A per-agent persona as a composable row.
 *
 * `dsh-system-prompt` owns the global persona as its own config, and registers
 * that section unconditionally — so this row is **scope-only**. Mounted inside
 * an agent preset it shadows the deployment persona for that one session,
 * exactly like the per-child persona `dsh-subagent` installs; mounted globally
 * it collides with the registry's own registration and fails loud.
 *
 * That constraint is the reason the row exists. An agent preset cannot mount
 * the prompt registry itself, so without a row of its own a preset could
 * change an agent's tools but never its identity.
 * @module @deepseek-ai/dsh-persona
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { PERSONA_PREFIX_SECTION, PERSONA_SUFFIX_SECTION } from '@deepseek-ai/dsh-system-prompt';
export { PERSONA_PREFIX_SECTION, PERSONA_SUFFIX_SECTION };
/** Cordis plugin name. */
export declare const name = "persona";
/** The prompt registry this row contributes to. */
export declare const inject: string[];
/** Plugin config: the persona text this composition contributes. */
export interface Config {
    /**
     * Persona prose rendered as the `deployment:persona-prefix` section. A template:
     * complete `{{…}}` groups interpolate strictly against registered prompt
     * variables. Empty text drops the section at render, matching the registry.
     */
    prefix: string;
    /**
     * Persona suffix template rendered after first-party guidance. Omitted or empty
     * text shadows the deployment suffix away; interpolation is strict.
     */
    suffix?: string;
    /** Make the prefix the complete system prompt, suppressing the suffix and every other section. */
    complete?: boolean;
    /** Suppress dynamic runtime-context snapshots for this persona's agent scope. */
    includeRuntimeContext?: boolean;
}
/** Runtime schema for the persona row. */
export declare const Config: z<Config>;
/**
 * Register the persona prefix and suffix sections for the mounting context's scope.
 * @param ctx - an agent scope context; an unscoped context collides with the
 * prompt registry's own persona registration and rejects.
 * @param config - the prefix, suffix, and complete-prompt policy.
 */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map