import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type ModelKey } from './locales.ts';
export { ModelDirectory } from './directory.ts';
export type { ModelDirectoryState } from './directory.ts';
export { ModelDirectoryResolver } from './service.ts';
export type { ModelSelectInjected } from './slots.ts';
export type { ModelKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The model selection surfaces' copy (/model popup + composer seat). */
        model: ModelKey;
    }
}
/** Required services: the contribution registry, the seat's slot registry, locale, and the service's own faces. */
export declare const inject: string[];
/**
 * Client plugin body: mount ModelDirectoryResolver, register the `model` dictionaries,
 * then register the /model popup contribution and the composer model seat
 * over the service.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map