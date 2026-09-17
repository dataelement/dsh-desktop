/** PDF page presentation; binary content and tab information come from the document owner. */
import { type ReactNode } from 'react';
import type { PropsLocale, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit';
import type { DocumentPreviewProps } from '../document/contract.ts';
import { type PdfStore } from './store.ts';
/** A record's viewing preferences survive body unmounts and leave with the tab. */
export interface PdfBodyInjected {
    /**
     * Retain viewing preferences until the tab record ends.
     * @param tabId - owning tab.
     * @param signal - tab-record lifetime, not body visibility.
     */
    readonly retainTab: (tabId: TabId, signal: AbortSignal) => void;
}
/** Standard document props plus the PDF entry's locale, viewing store, and lifetime callback. */
export type PdfBodyProps = DocumentPreviewProps & PropsLocale<'sidebarPdf'> & PropsStore<PdfStore> & PdfBodyInjected;
/**
 * Present a PDF with tab-local viewing preferences and component-owned rendering resources.
 * @param props - complete bytes and framework-owned tab/store/locale seats.
 * @returns the PDF reader.
 */
export declare function PdfBody(props: PdfBodyProps): ReactNode;
//# sourceMappingURL=PdfBody.d.ts.map