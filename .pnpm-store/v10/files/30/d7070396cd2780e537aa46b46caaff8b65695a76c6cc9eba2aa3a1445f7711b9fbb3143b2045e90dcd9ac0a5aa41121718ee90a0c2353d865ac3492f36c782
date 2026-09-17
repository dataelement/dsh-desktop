/** Pure read-card derivation from raw result content and metadata. @module */
import type { ReadBlockProps } from '@deepseek-ai/dsh-client-ui-primitives';
import type { ToolCallBlock } from './tool-call-model.ts';
/**
 * Content lines the chat row's resident read body shows before collapsing the
 * middle — half the primitive's own default, which the details panel keeps. A
 * chat row is a summary surface inside the message flow: the flow must stay
 * scannable across many calls, while the details panel is the single-call
 * reading surface. A design constant of this UI's row geometry, not a
 * deployment choice, so it is fixed here rather than a plugin Config field. The
 * same split [`CHAT_TERMINAL_MAX_LINES`](./terminal-card-model.ts) draws for
 * terminal output.
 */
export declare const CHAT_READ_MAX_LINES = 8;
/**
 * The {@link ReadBlock} props this derivation owns. Picked off the primitive's
 * props so the two stay in step; `maxLines`/`className` belong to each render
 * site.
 */
export type ReadCardModel = Pick<ReadBlockProps, 'label' | 'lines' | 'totalLines' | 'lang'>;
/**
 * The line one `read` call was about, from its arguments.
 *
 * `offset` is the read tool's own 1-based start line, so opening the path can
 * land where the model looked. Available while the call is still running,
 * unlike the persisted metadata, because the arguments carry it. The arguments
 * are model-produced JSON: only an integer of at least 1 is a line, and a call
 * whose `offset` is anything else names none.
 * @param block - running or settled Tool block.
 * @returns the 1-based line, or undefined when the call named none.
 */
export declare function readCallLine(block: ToolCallBlock): number | undefined;
/**
 * Derive a settled root read card after validating its persisted metadata and
 * model-facing read envelope.
 * @param block - running or settled Tool block.
 * @param sessionCwd - the session workspace root; a workspace-rooted absolute
 *   path label displays relative to it. Absent leaves the path as authored.
 * @param home - host account home; a leftover POSIX home path displays as `~`.
 * @returns the read-card props, or null for the generic path.
 */
export declare function readCardModel(block: ToolCallBlock, sessionCwd?: string, home?: string): ReadCardModel | null;
//# sourceMappingURL=read-card-model.d.ts.map