import type { ReactNode } from 'react';
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store';
import type { InjectFace, PropsLocale, PropsRenderSlots, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { TextInjected } from './face.ts';
import type { TextStore } from './store.ts';
import type { DocumentPreviewDefinition } from './document/registry.ts';
export { linesOf, loadedPages, lastLineLoaded, scrollToLine } from './text/lines.ts';
export type { LoadedPage } from './text/lines.ts';
/** Private registration inputs; the framework binds the registry source to useDocumentPreviews. */
export interface TextPreviewInjected extends TextInjected {
    readonly hooks: {
        readonly documentPreviews: ObservableSnapshot<readonly DocumentPreviewDefinition[]>;
    };
}
/** The body's composed props: the tab, its navigation, the shared store and face, and copy. */
export type TextPreviewProps = PropsRuntime<'sidebar.right.pane.tab'> & PropsRenderSlots<'sidebar.right.tab.document'> & PropsStore<TextStore> & InjectFace<TextPreviewInjected> & PropsLocale<'sidebarDocumentPreview'>;
/**
 * The text type's body, registered under `sidebar.right.pane.tab` as `text`.
 * @param props - composed slot props.
 * @returns the content read so far with its controls, or a progress line.
 */
export declare function TextPreview({ useTabInfo, useResource, useStore, actions, loadPage, reloadPages, loadAll, reloadAll, useDocumentPreviews, renderSlot, t, }: TextPreviewProps): ReactNode;
//# sourceMappingURL=TextPreview.d.ts.map