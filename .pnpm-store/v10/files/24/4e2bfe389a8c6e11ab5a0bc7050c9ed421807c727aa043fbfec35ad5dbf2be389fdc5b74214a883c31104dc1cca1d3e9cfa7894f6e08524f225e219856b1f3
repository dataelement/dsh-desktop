/**
 * Composer keymap over the Lexical command layer: menu arbitration
 * (arrows/escape/enter), space adjudication, the Enter submit gesture, and
 * paste routing. Registered at CRITICAL priority so it decides before
 * @lexical/plain-text's own Enter/paste defaults; a handler returning false
 * falls through to those defaults (Shift+Enter's line break, ordinary
 * spaces, text paste the bar routes itself).
 *
 * IME guard: a composition-closing Enter/Space must not submit or adjudicate.
 * KeyboardEvent.isComposing covers most engines; Safari delivers the closing
 * keydown AFTER compositionend, so a root-element composition watch holds the
 * guard for 10ms more (the old textarea's proven window); keyCode
 * 229 is the legacy signal engines emit without isComposing.
 */
import type { LexicalEditor } from 'lexical';
import type { ArbitrateKey, ArbitrateOutcome } from '../../contract/input.ts';
/** The bar-supplied behavior behind each intercepted gesture. */
export interface ComposerKeymapHandlers {
    /** Keyboard arbitration while the menu is open ('pass' when no pipeline). */
    arbitrate(key: ArbitrateKey, composing: boolean): ArbitrateOutcome;
    /** Space adjudication; true = a claim was applied — the keystroke is consumed. */
    space(): boolean;
    /** Dismiss the popupSelect shell (Escape layering: an open overlay closes first). */
    dismissPopup(): void;
    /** Whether Enter may submit right now (locked/busy states refuse). */
    canSubmit(): boolean;
    /** The Enter gesture after every guard passed; `accelerated` = Ctrl/Cmd held. */
    submit(accelerated: boolean): void;
    /** Pasted files (image intake). */
    intakeFiles(files: readonly File[]): void;
    /** Pasted plain text (sanitized insertion through the shell). */
    pasteText(text: string): void;
}
/**
 * Register the composer keymap on one editor.
 * @param editor - the shell-owned editor.
 * @param handlers - bar-supplied behavior.
 * @returns the unregister disposer.
 */
export declare function registerComposerKeymap(editor: LexicalEditor, handlers: ComposerKeymapHandlers): () => void;
//# sourceMappingURL=keymap.d.ts.map