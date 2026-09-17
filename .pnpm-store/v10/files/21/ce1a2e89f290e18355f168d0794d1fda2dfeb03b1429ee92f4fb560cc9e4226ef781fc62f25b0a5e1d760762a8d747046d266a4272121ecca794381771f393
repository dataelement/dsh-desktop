/**
 * Browser half: register `text` as a right-Sidebar tab type.
 *
 * The type reaches the Sidebar through its public path only: the definition into
 * `ctx.sidebarRightTabs`, the body into the keyed `sidebar.right.pane.tab`
 * seat, and the chip title into `sidebar.right.pane.tab.title`, both under the
 * definition's `id`. Nothing here reaches into the Sidebar's store, its
 * panes, or its sequence. The file's metadata comes from the standard
 * `useResource`, served by the `file` provider; the content is this type's own
 * business, read through its face. Every import from another
 * client plugin is a type.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { WorkspaceFileParams } from '@deepseek-ai/dsh-api-workspace-files/client';
import { DocumentPreviewRegistry } from './document/registry.ts';
export type { SidebarDocumentPreviewKey } from './locales.ts';
export type { TextPreviewProps } from './TextPreview.tsx';
export type { TextInjected } from './face.ts';
export type { ReadWorkspaceFilePage, SessionFile, WorkspaceFilesReadRemote } from './rpc.ts';
export type { TextPage, TextState, TextStore, TextTabState } from './store.ts';
export type { DocumentContent, DocumentPreviewProps, DocumentTextPage } from './document/contract.ts';
export type { DocumentLoadMode, DocumentPreviewDefinition } from './document/registry.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** File-extension renderer registrations, independent from their keyed document bodies. */
        documentPreviews: DocumentPreviewRegistry;
    }
}
declare module '@deepseek-ai/dsh-client-ui-sidebar-right/client' {
    interface SidebarRightResourceParamsMap {
        /** File line navigation supported by the text preview. */
        file: WorkspaceFileParams;
    }
}
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Text-preview progress, paging, change, control, and failure lines. */
        sidebarDocumentPreview: import('./locales.ts').SidebarDocumentPreviewKey;
    }
}
/**
 * Required browser services: the tab registry, the slot registry, copy, and the
 * Remote carrier with its `workspaceFiles` namespace.
 */
export declare const inject: string[];
/**
 * Client plugin body: register the type, its dictionaries, its body, and its chip title.
 * @param ctx - client root context carrying the registry, the slots, copy, and the Remote face.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map