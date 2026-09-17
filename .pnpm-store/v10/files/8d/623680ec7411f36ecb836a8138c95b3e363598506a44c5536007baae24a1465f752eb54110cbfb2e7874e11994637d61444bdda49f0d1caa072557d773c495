/**
 * ReferenceChipNode: one inline reference as an atomic Lexical decorator.
 * The node IS the occurrence — NodeKey carries identity, the node carries
 * the owner's insert-time projections (label/appearance/clipboardText), and
 * `getTextContent()` answers the clipboard/persistence projection so native
 * copy and the draft mirror stay correct without expansion code. The detect
 * projection (trigger scanning and TokenSpan coordinates) counts every chip
 * as one U+FFFC instead; see projection.ts.
 */
import type { JSX } from 'react';
import type { EditorConfig, LexicalNode, NodeKey, SerializedLexicalNode, Spread } from 'lexical';
import { DecoratorNode } from 'lexical';
import type { ReferenceInsert } from '../../contract/input.ts';
/** JSON form of one chip (Lexical node serialization contract). */
export type SerializedReferenceChipNode = Spread<{
    source: string;
    ref: string;
    label: string;
    appearance?: ReferenceInsert['appearance'];
    clipboardText: string;
    invalid: boolean;
}, SerializedLexicalNode>;
/** One inline reference occurrence as an atomic decorator node. */
export declare class ReferenceChipNode extends DecoratorNode<JSX.Element> {
    /** Owning source name (serializer routing key). */
    __source: string;
    /** Owner-scoped reference id. */
    __ref: string;
    /** Inline display label (insert-time cache). */
    __label: string;
    /** Optional domain glyph (insert-time cache). */
    __appearance: ReferenceInsert['appearance'];
    /** Clipboard / persistence projection, e.g. `/name` (never the model form). */
    __clipboardText: string;
    /** Owner-resolution failure flag: chip renders invalid; serialization must fail. */
    __invalid: boolean;
    /** Lexical node registry type tag. */
    static getType(): string;
    /**
     * Clone with identity (Lexical writable-copy contract).
     * @param node - node to clone.
     * @returns a copy carrying the same NodeKey.
     */
    static clone(node: ReferenceChipNode): ReferenceChipNode;
    /**
     * Rebuild one chip from its JSON form.
     * @param json - serialized chip.
     * @returns a fresh node (new key).
     */
    static importJSON(json: SerializedReferenceChipNode): ReferenceChipNode;
    /**
     * @param insert - the owner's reference insertion (display projections included).
     * @param invalid - owner-resolution failure bit (defaults valid).
     * @param key - Lexical clone-path key; absent for fresh nodes.
     */
    constructor(insert: Omit<ReferenceInsert, 'appearance'> & {
        appearance?: ReferenceInsert['appearance'];
    }, invalid?: boolean, key?: NodeKey);
    /** Serialize to the JSON node form. */
    exportJSON(): SerializedReferenceChipNode;
    /**
     * Mount the chip's host element; the decorator portal renders into it.
     * @returns an inline, non-editable span carrying the test/e2e anchor.
     */
    createDOM(_config: EditorConfig): HTMLElement;
    /** Host element never changes shape. */
    updateDOM(): boolean;
    /** Chips sit in the text line. */
    isInline(): boolean;
    /**
     * No keyboard-selected intermediate state: arrows step across the chip in
     * one move and Backspace/Delete remove it whole (the placeholder semantics
     * of the old textarea). `true` would put a NodeSelection between the
     * keystroke and the caret — a state the plain-text binding's handlers all
     * ignore, deadlocking arrows, typing, and deletion at the chip edge.
     */
    isKeyboardSelectable(): boolean;
    /** Clipboard / persistence projection (native copy reads this). */
    getTextContent(): string;
    /**
     * Flip the owner-resolution failure bit.
     * @param invalid - next bit; no-op writes are the caller's concern.
     */
    setInvalid(invalid: boolean): void;
    /** Owner-resolution failure bit. */
    isInvalid(): boolean;
    /** Owning source name. */
    getSource(): string;
    /** Owner-scoped reference id. */
    getReference(): string;
    /** Inline display label. */
    getLabel(): string;
    /** Optional domain glyph. */
    getAppearance(): ReferenceInsert['appearance'];
    /** React face rendered into the host element by the decorator portal. */
    decorate(): JSX.Element;
}
/**
 * Mint one chip node from a reference insertion.
 * @param insert - the owner's reference insertion.
 * @returns the fresh node.
 */
export declare function $createReferenceChipNode(insert: ReferenceInsert): ReferenceChipNode;
/**
 * Chip type guard.
 * @param node - any node or nullish.
 * @returns whether the node is a ReferenceChipNode.
 */
export declare function $isReferenceChipNode(node: LexicalNode | null | undefined): node is ReferenceChipNode;
//# sourceMappingURL=chip-node.d.ts.map