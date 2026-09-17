/** Registers the target-neutral Conversation assembly, shell, input, and docks. */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { type ConversationKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Conversation shell, composer, queue, and dock copy. */
        conversation: ConversationKey;
    }
}
/** Services required by the Conversation plugin. */
export declare const inject: string[];
/** Conversation runtime configuration. */
export interface Config {
    /** Maximum generic-file uploads allowed to run concurrently in browser Workers. */
    maxConcurrentFileUploads?: number;
}
/** Validated Conversation runtime configuration. */
export declare const Config: z<Config>;
/**
 * Mount the Conversation core and target-neutral presentation.
 * @param ctx - Client root context.
 */
export declare function apply(ctx: Context, config?: Config): void;
//# sourceMappingURL=apply.d.ts.map