/** Pure diff-card derivation from raw file-mutation calls and result metadata. @module */
import type { DiffBlockProps } from '@deepseek-ai/dsh-client-ui-primitives';
import type { ToolCallBlock } from './tool-call-model.ts';
/**
 * Diff-body lines the chat row shows before collapsing the middle — half the
 * primitive's own default, which the details panel keeps. A chat row is a
 * summary surface inside the message flow: the flow must stay scannable across
 * many calls, while the details panel is the single-call reading surface. The
 * same split {@link CHAT_TERMINAL_MAX_LINES} draws for a terminal card, so the
 * two card kinds cap a long body at the same place in the flow. A design
 * constant of this UI's row geometry, not a deployment choice.
 */
export declare const CHAT_DIFF_MAX_LINES = 8;
/**
 * The {@link DiffBlock} props this derivation owns. Picked off the primitive's
 * props so the two stay in step; `maxLines`/`className` belong to each render
 * site.
 */
export interface DiffCardModel {
    /**
     * The props {@link DiffBlock} draws. Held as a nested object so a render site
     * spreads exactly the primitive's own surface and can never leak a
     * neighbouring field into it.
     */
    card: Pick<DiffBlockProps, 'diffs'>;
}
/**
 * Derive running diffs for root write/edit and `str_replace_editor`
 * create/replace calls, plus applied settled diffs for root write/edit calls.
 * A successful write with valid empty metadata uses its argument-derived
 * whole-file diff, matching create and identical-overwrite presentation;
 * `str_replace_editor` settles through Generic because it has no result view.
 * @param block - running or settled Tool block.
 * @returns the diff-card props, or null for the generic path.
 */
export declare function diffCardModel(block: ToolCallBlock): DiffCardModel | null;
//# sourceMappingURL=diff-card-model.d.ts.map