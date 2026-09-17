/**
 * Goal surface plugin, browser half: the GoalBar entry in the
 * conversation.input.dock strip. The durable goal arrives through
 * `useProjection('goal')`. A registrant-private activation hook source owns
 * the live Remote read and event subscription; the inject face carries that
 * hook plus the four mutation verbs through the generated Goal Remote API.
 * This plugin does not create goals; deployments may expose /goal separately.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type GoalKey } from './locales.ts';
export { GoalBar, GoalDock } from './GoalBar.tsx';
export type { GoalActionResult, GoalBarActions, } from './slots.ts';
export type { GoalKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The goal strip's copy. */
        goal: GoalKey;
    }
}
/** Required services for the Goal dock, command-input projection, Remote mutations, and copy. */
export declare const inject: string[];
/**
 * Client plugin body: the GoalBar dock entry with its mutation verbs.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map