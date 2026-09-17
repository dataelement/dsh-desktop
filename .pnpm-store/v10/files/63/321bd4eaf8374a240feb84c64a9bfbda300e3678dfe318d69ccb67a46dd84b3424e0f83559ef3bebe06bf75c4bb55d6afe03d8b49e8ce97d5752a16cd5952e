/**
 * Claim-token highlight: while a command claim holds, the draft's leading
 * token renders in the warn color. A TextNode transform keeps the token in
 * its own styled node (splitting when typing merges text into it), and the
 * shell nudges the first leaf dirty when the claim flips so entering and
 * leaving claimed restyles without a text edit.
 */
import type { LexicalEditor } from 'lexical';
/**
 * Register the claim-token styling transform.
 * @param editor - the shell-owned editor.
 * @param activeToken - live claim token accessor; null while unclaimed.
 * @returns the unregister disposer.
 */
export declare function registerClaimDecoration(editor: LexicalEditor, activeToken: () => string | null): () => void;
/**
 * Nudge the token seat dirty so the transform restyles after a claim flip
 * (claims change phase without a text edit; transforms only run on dirty
 * nodes).
 * @param editor - the shell-owned editor.
 */
export declare function refreshClaimDecoration(editor: LexicalEditor): void;
//# sourceMappingURL=claim-decor.d.ts.map