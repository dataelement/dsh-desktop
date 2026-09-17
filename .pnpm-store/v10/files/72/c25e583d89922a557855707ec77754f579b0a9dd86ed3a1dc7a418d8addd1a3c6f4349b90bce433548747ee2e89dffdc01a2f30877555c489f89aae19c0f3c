import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type PlanKey } from './locales.ts';
export type { PlanKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The composer plan chip's copy. */
        plan: PlanKey;
    }
}
/** Injected business face of the composer plan seat. */
export interface PlanChipInjected {
    /**
     * Leave plan mode by executing /plan off.
     * @returns null on admitted execution; a user-visible failure line otherwise.
     */
    exitPlanMode: () => Promise<string | null>;
}
/** Required services: the seat's slot registry, commands Remote, and locale registry. */
export declare const inject: string[];
/**
 * Client plugin body: register the plan chip over the command channel.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map