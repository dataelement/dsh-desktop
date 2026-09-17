/**
 * Composer editor projections: one EditorState, three pure text views.
 * detectText feeds trigger detection and TokenSpan coordinates (every chip
 * counts as one U+FFFC — the opaque-reference invariant); clipboardText
 * feeds persistence, the InputState draft, and submit-plane decisions
 * (chips expand to their clipboard projection); the model form is not a
 * text view here — submit serializes chip nodes through their owner codec.
 * All $-functions must run inside `editor.read()` / `editor.update()`.
 */
import type { LexicalNode, NodeKey, Point } from 'lexical';
import type { Occurrence } from '../../contract/input.ts';
/** The detect-projection stand-in for one chip (object replacement character). */
export declare const ATOMIC_CHAR = "\uFFFC";
/** One leaf (or gap) of the composer document in projection coordinates. */
export interface ComposerSegment {
    /** text/linebreak carry a node; chip is atomic; gap is the newline between block elements. */
    readonly kind: 'text' | 'chip' | 'linebreak' | 'gap';
    /** The backing node; null only for gap. */
    readonly node: LexicalNode | null;
    readonly detectStart: number;
    readonly detectLength: number;
    readonly clipboardStart: number;
    readonly clipboardLength: number;
    /** gap only: the block elements this newline separates. */
    readonly gapBetween?: {
        readonly before: NodeKey;
        readonly after: NodeKey;
    };
}
/** One walk's product: segments plus the indexes point mapping needs. */
export interface ComposerLayout {
    readonly segments: readonly ComposerSegment[];
    readonly detectLength: number;
    readonly detectText: string;
    readonly clipboardText: string;
    /** Leaf node key → its segment (text/chip/linebreak). */
    readonly byKey: ReadonlyMap<NodeKey, ComposerSegment>;
    /** Element key → ordered child keys (root and every block element). */
    readonly children: ReadonlyMap<NodeKey, readonly NodeKey[]>;
    /** Element key → detect bounds of its content (gaps excluded). */
    readonly bounds: ReadonlyMap<NodeKey, {
        readonly start: number;
        readonly end: number;
    }>;
}
/**
 * Walk the composer document once, producing every projection segment in
 * document order. Blocks (paragraphs) contribute a one-newline gap between
 * one another in both text projections.
 * @returns the layout for this EditorState.
 */
export declare function $composerLayout(): ComposerLayout;
/**
 * Fold one clipboard-projection offset to its detect-projection twin.
 * Offsets inside a chip's clipboard expansion snap to the chip's trailing
 * edge; callers only pass boundaries that were once a document end (submit
 * snapshots), which never split a chip.
 * @param layout - the current walk product.
 * @param clipboardOffset - offset into the clipboard projection.
 * @returns the detect offset covering the same document position.
 */
export declare function detectOffsetOfClipboardOffset(layout: ComposerLayout, clipboardOffset: number): number;
/** The published projection product consumed by the shell every update. */
export interface EditorProjection {
    /** Trigger/TokenSpan coordinate text (chip = one U+FFFC). */
    readonly detectText: string;
    /** Persistence/InputState draft text (chip = clipboardText). */
    readonly clipboardText: string;
    /** InputState-compatible occurrence view (clipboardText coordinates). */
    readonly occurrences: readonly Occurrence[];
    /** Range selection in detect coordinates (ordered); null while absent or non-range. */
    readonly selection: {
        readonly start: number;
        readonly end: number;
    } | null;
    /** Collapsed caret in detect coordinates; null while the selection is absent or ranged. */
    readonly caret: number | null;
}
/**
 * Fold one selection point to a detect offset.
 * @param layout - the current walk product.
 * @param point - selection anchor/focus point.
 * @returns detect offset, or null when the point references an unknown node.
 */
export declare function $detectOffsetOfPoint(layout: ComposerLayout, point: Point): number | null;
/**
 * Project the composer document and its caret.
 * @param idOf - stable occurrence-id assignment per chip NodeKey (the shell
 * owns the map so ids survive across projections of the same node).
 * @returns the three-view projection product.
 */
export declare function $projectComposer(idOf: (key: NodeKey) => number): EditorProjection;
//# sourceMappingURL=projection.d.ts.map