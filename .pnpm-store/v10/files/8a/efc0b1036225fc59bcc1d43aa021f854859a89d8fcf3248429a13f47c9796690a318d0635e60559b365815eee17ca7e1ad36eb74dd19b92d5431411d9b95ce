/**
 * Detect-coordinate span application: the one place that maps a TokenSpan's
 * numeric [start, end) back onto Lexical points and applies an edit there.
 * Every slash/input-* event (begin-command, insert-reference, insert-text,
 * consume-token) lands through here; revision CAS stays with the caller —
 * this module only maps and edits. All functions
 * must run inside `editor.update()`.
 */
import type { LexicalNode } from 'lexical';
/** Half-open [start, end) range in detect coordinates (TokenSpan's plane). */
export interface DetectSpan {
    readonly start: number;
    readonly end: number;
}
/**
 * Select one detect span (collapsed spans place the caret). Exposed for the
 * shell's caret placement and tests; the replace helpers below build on it.
 * @param span - detect span to select.
 * @returns whether both endpoints mapped.
 */
export declare function $selectDetectSpan(span: DetectSpan): boolean;
/**
 * Replace one detect span with plain text (empty text deletes the span).
 * The caret lands after the insertion.
 * @param span - detect span to replace.
 * @param text - replacement text.
 * @returns whether the span mapped and the edit applied.
 */
export declare function $replaceDetectSpanWithText(span: DetectSpan, text: string): boolean;
/**
 * Replace one detect span with nodes (chip insertion path). The caret lands
 * after the last inserted node.
 * @param span - detect span to replace.
 * @param nodes - replacement nodes in order.
 * @returns whether the span mapped and the edit applied.
 */
export declare function $replaceDetectSpanWithNodes(span: DetectSpan, nodes: readonly LexicalNode[]): boolean;
//# sourceMappingURL=span-map.d.ts.map