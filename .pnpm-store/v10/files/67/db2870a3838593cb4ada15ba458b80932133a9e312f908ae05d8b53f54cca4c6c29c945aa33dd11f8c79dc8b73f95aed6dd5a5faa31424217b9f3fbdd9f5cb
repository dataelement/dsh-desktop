import type { ReactNode } from 'react';
interface ModalBaseProps {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children?: ReactNode;
    footer?: ReactNode;
    className?: string;
    contentClassName?: string;
}
type ModalProps = ModalBaseProps & ({
    headless: true;
    closeLabel?: never;
} | {
    headless?: false;
    closeLabel: string;
});
/**
 * Render a centered, body-portaled modal over a blurred page mask.
 * @param props.open - whether the dialog is showing.
 * @param props.onClose - Escape or mask click.
 * @param props.title - dialog heading (aria-label in every mode).
 * @param props.closeLabel - localized accessible close-button label.
 * @param props.description - optional supporting sentence under the title.
 * @param props.children - body (inputs, etc.).
 * @param props.footer - action row (Cancel / Create).
 * @param props.contentClassName - optional class for a scrollable content region.
 * @param props.headless - render children directly in the card (no default
 * header/close/body chrome); mask, card, Escape, and aria-label remain.
 * @returns null when closed; otherwise the overlay tree.
 */
export declare function Modal({ open, onClose, title, closeLabel, description, children, footer, className, contentClassName, headless, }: ModalProps): import("react").ReactPortal | null;
export {};
//# sourceMappingURL=Modal.d.ts.map