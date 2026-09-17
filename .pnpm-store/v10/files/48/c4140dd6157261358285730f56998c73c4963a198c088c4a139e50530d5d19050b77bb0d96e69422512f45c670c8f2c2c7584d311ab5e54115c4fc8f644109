import type { HTMLAttributes, ReactNode } from 'react';
import type { LexicalEditor } from 'lexical';
/** Host props: the editor binding plus the div passthroughs the bar owns. */
export interface ComposerContentEditableProps extends HTMLAttributes<HTMLDivElement> {
    /** The shell-owned editor; null renders the same div unbound and inert. */
    readonly editor: LexicalEditor | null;
    /** Whether the user may edit (readOnly/disabled states fold in here). */
    readonly editable: boolean;
}
/**
 * Render the composer's editable surface.
 * @param props - editor binding, editability, and div passthroughs.
 * @returns the resident contenteditable div.
 */
export declare function ComposerContentEditable({ editor, editable, ...rest }: ComposerContentEditableProps): ReactNode;
//# sourceMappingURL=ComposerContentEditable.d.ts.map