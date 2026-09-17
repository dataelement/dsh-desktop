/**
 * Browser half of open-in-app: one Session-header split button opening the
 * session's workspace directory (the summary's `cwd`) in the remembered
 * installed application. Availability arrives once per page from the host
 * apps route; the last choice persists in the browser through the controller's
 * persisted snapshot store.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type OpenInAppKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Session-header "open workspace in application" copy. */
        'open-in-app': OpenInAppKey;
    }
}
export type { OpenInAppActionInjected, OpenInAppActionProps } from './OpenInAppAction.tsx';
/** Required services for locale registration and the header-slot contribution. */
export declare const inject: string[];
/**
 * Client plugin body: register the dictionaries and the header split button.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map