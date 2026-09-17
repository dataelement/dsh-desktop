/**
 * Background-job plugin, browser half: contributes one session-header action
 * that renders this session's `ctx.jobs` records. The data arrives entirely
 * through the `jobsBySession` list mirror, so the plugin issues no RPC and
 * holds no state of its own beyond popover visibility.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type JobKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Background-job list copy. */
        'job': JobKey;
    }
}
export type { JobListActionProps } from './JobListAction.tsx';
/** Required services for locale registration and header-slot contribution. */
export declare const inject: string[];
/**
 * Client plugin body: register the dictionaries and the header action.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map