import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { createFontSizeRowStore } from './settings-store.ts';
/** Injected business face: the preference write (t rides the standard locale seat). */
export interface FontSizeRowInjected {
    /** Change the content font size (integer px within FONT_SIZE_MIN..FONT_SIZE_MAX). */
    setFontSize: (px: number) => void;
}
/** Full component props: runtime share + store share + locale seat + injected face. */
export type FontSizeRowComponentProps = PropsRuntime<'settings.general.item'> & PropsStore<ReturnType<typeof createFontSizeRowStore>> & PropsLocale<'settings.theme'> & FontSizeRowInjected;
/**
 * Render the font-size row.
 * @param props - composed slot props.
 * @returns the row element tree.
 */
export declare function FontSizeRow({ t, setFontSize, useStore }: FontSizeRowComponentProps): import("react").JSX.Element;
//# sourceMappingURL=FontSizeRow.d.ts.map