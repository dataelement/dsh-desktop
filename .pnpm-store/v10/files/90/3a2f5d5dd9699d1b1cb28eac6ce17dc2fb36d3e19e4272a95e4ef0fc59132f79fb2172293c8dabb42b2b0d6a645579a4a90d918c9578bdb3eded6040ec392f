/**
 * Skill reference plugin, browser half: registers the '/' skill source —
 * candidates from the `skills/list` Remote addressed by the per-call session
 * projection's sessionId (sessions are always agent-backed; the host
 * resolves cwd from the session header). A pick lands the literal `/name `
 * text and the prompt ships the same literal (plain-text-reference decision;
 * see .agents/notes/archived/architecture/2026-07-25-web-input-machine-and-slash-pipeline.md);
 * determinism
 * lives host-side — the pre-step boundary (`dsh-tool-skill`) recognizes a
 * leading `/name` naming a user-invocable skill and injects the rendered
 * body for every entry point, including `disable-model-invocation` skills the
 * model-side catalog never lists (issue #1470). The RPC rides the plugin's
 * root-context Remote captured at registration — the source never reads
 * services off a per-call argument. Draft chip visuals derive from
 * the lexicon scan; this source implements no reference codec.
 *
 * Catalog fetches are cached per session (the small twin of the ui-commands
 * directory): the per-keystroke candidates re-poll filters a settled
 * snapshot locally, so one session costs one RPC. The scope-birth warm hook
 * prewarms the session's key; a preset switch drops that one key (the
 * catalog is the preset's, and a blank session may switch after the warm);
 * connection/reset clears everything — the host
 * catalog may differ across generations. A shared in-flight fetch
 * deliberately outlives any single menu interaction: closing the menu must
 * not kill the prewarm other consumers will hit, so it carries its own
 * abort (fired only on invalidation/teardown) while a candidates caller
 * with an aborted signal just returns early.
 *
 * This browser half also owns the `skill` keyed toolview: a replay-stable
 * accent row derived only from each logged call/result slice.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type SkillKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The dedicated skill tool row's copy. */
        skill: SkillKey;
    }
}
/** Required services: reference source faces plus the tool-row and locale registries. */
export declare const inject: string[];
/**
 * Client plugin body: register the '/' source, dictionaries, and keyed tool row.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map