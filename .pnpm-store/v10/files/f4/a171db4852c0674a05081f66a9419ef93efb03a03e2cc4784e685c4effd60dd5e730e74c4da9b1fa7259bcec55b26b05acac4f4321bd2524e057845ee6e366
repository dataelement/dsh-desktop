/**
 * Command UI plugin, browser half: CommandUiRuntime (`ctx.commandUi`) owning the
 * capability-keyed directory cache, the '/' command source, the client
 * contribution registry, and the per-session popupSelect controllers; the
 * popupSelect shell self-registers into conversation.input.overlay with
 * per-session resolution.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { CommandUiRuntime } from './service.ts';
import { type CommandKey } from './locales.ts';
export { CommandUiRuntime } from './service.ts';
export { CommandDirectory } from './directory.ts';
export type { CommandDescriptor, DirectoryStatus } from './directory.ts';
export { filterOptions, PopupSelectController } from './popup.ts';
export type { PopupSelectDeps, PopupSpec, PopupState, TokenSegment } from './popup.ts';
export type { PopupSelectInjected, PopupSelectViewProps } from './PopupSelectView.tsx';
export type { ActionSpec, CommandContribution, CommandDecoration, CommandUiContract, CommandUiSpec, PopupSelectSpec, SelectConfirmation, SelectOption, } from './contract.ts';
export type { CommandKey } from './locales.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        commandUi: CommandUiRuntime;
    }
}
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The popupSelect shell's copy. */
        command: CommandKey;
    }
}
/** Required services: the '/' source registry, session scopes, commands Remote, and locale registry. */
export declare const inject: string[];
/**
 * Client plugin body: mount the service, then register the popupSelect shell
 * into the input overlay once its declarer is up.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map