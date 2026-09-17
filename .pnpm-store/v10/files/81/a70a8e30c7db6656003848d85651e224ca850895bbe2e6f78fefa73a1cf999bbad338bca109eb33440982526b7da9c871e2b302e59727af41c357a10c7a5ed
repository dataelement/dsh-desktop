import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { PopupSelectController } from './popup.ts';
/** Injected business face of the popupSelect overlay entry. */
export interface PopupSelectInjected {
    /** The session's shell controller (state store + verbs; the view never touches the open-context type). */
    popup: PopupSelectController;
}
/** Full shell props: injected face + the locale seat. */
export type PopupSelectViewProps = PopupSelectInjected & PropsLocale<'command'>;
/**
 * Render the popupSelect shell overlay entry.
 * @param props - injected face: the session's shell controller; `t` rides the standard locale seat.
 * @returns the select card while open; null while closed.
 */
export declare function PopupSelectView({ popup, t }: PopupSelectViewProps): import("react").JSX.Element | null;
//# sourceMappingURL=PopupSelectView.d.ts.map