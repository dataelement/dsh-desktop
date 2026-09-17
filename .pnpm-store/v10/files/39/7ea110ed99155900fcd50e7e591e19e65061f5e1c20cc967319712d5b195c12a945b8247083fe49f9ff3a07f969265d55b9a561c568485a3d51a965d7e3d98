/**
 * Deliverables plugin, browser half: registers the produced-files row into
 * the chat view's turn-tail chain, and provides the `chatFileMentions`
 * service that links inline-code mentions of produced files in the closing
 * prose. All policy lives here — the supported mutation calls, mention
 * matching, chip cap, and copy — so
 * composing this plugin out of cordis.yml removes both surfaces entirely;
 * the owning view renders an empty chain and inert prose at zero cost.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type DeliverablesKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Produced-files row copy. */
        'deliverables': DeliverablesKey;
    }
}
export { ProducedFiles, type ProducedFilesProps } from './ProducedFiles.tsx';
export { producedForClosing } from './turn-deliverables.ts';
/** Required services for the tail-slot registration and its dictionaries. */
export declare const inject: string[];
/**
 * Client plugin body: register the dictionaries and the turn-tail entry.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map