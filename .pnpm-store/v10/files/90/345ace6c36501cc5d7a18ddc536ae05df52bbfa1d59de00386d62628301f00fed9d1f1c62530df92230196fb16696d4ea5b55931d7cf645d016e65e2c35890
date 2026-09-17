/**
 * Plain-text reference decoration (the plain-text-reference decision;
 * see .agents/notes/archived/architecture/2026-07-25-web-input-machine-and-slash-pipeline.md):
 * a `/name` or `@name` token whose name is on the trigger's lexicon, and
 * syntax-recognizable `@dir/` folder tokens, render in the chip family
 * colors. Color only, no icon: a token still carrying its trigger character
 * is editable text, not a settled chip — the domain icon marks exactly the
 * settled state. Pure derivation as before — the entity transform converts
 * matching text into TextRefNode and back as edits move it in and out of
 * match shape; no occurrence identity exists.
 */
import type { EditorConfig, LexicalEditor, SerializedTextNode } from 'lexical';
import { TextNode } from 'lexical';
/** JSON form of one text-ref node. */
export type SerializedTextRefNode = SerializedTextNode;
/** One matched plain-text reference as a styled, fully editable text node. */
export declare class TextRefNode extends TextNode {
    /** Lexical node registry type tag. */
    static getType(): string;
    /**
     * Clone with identity (Lexical writable-copy contract).
     * @param node - node to clone.
     * @returns a copy carrying the same NodeKey.
     */
    static clone(node: TextRefNode): TextRefNode;
    /**
     * Rebuild one text-ref from its JSON form.
     * @param json - serialized node.
     * @returns a fresh node.
     */
    static importJSON(json: SerializedTextRefNode): TextRefNode;
    /** Serialize to the JSON node form. */
    exportJSON(): SerializedTextRefNode;
    /** Style the span the base TextNode mounts. */
    createDOM(config: EditorConfig): HTMLElement;
    /** Entity nodes never merge with plain siblings (the transform owns their bounds). */
    isTextEntity(): true;
    /** Editing continues inside; the transform re-evaluates match shape per edit. */
    canInsertTextBefore(): boolean;
}
/**
 * Register the plain-text reference entity transform. The claim decoration
 * has precedence on the leading-token seat: while a command claim holds, the
 * claimed token must stay a plain TextNode (transforms register per concrete
 * node class, so a TextRefNode would never receive the TextNode claim
 * transform and the warn color would be lost).
 * @param editor - the shell-owned editor.
 * @param lexiconOf - live per-trigger name-roll accessor (the controller's aggregated store).
 * @param activeToken - live claim token accessor; null while unclaimed.
 * @returns the unregister disposer.
 */
export declare function registerTextRefDecoration(editor: LexicalEditor, lexiconOf: () => ReadonlyMap<'/' | '@', readonly string[]>, activeToken: () => string | null): () => void;
/**
 * Force a re-scan of the whole document (transforms only visit dirty nodes;
 * a lexicon roll change dirties nothing on its own). Queued, not discrete —
 * the caller may sit inside an update listener.
 * @param editor - the shell-owned editor.
 */
export declare function rescanTextRefs(editor: LexicalEditor): void;
//# sourceMappingURL=text-ref.d.ts.map