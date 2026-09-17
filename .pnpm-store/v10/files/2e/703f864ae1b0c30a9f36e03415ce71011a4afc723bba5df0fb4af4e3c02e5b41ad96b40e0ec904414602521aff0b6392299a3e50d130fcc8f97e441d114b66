/** Pure terminal-card derivation from raw Tool call and result fields. @module */
import type { TerminalBlockLabels, TerminalBlockProps } from '@deepseek-ai/dsh-client-ui-primitives';
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { ToolCallBlock } from './tool-call-model.ts';
/**
 * Build the TerminalBlock display copy from the conversation locale seat —
 * the one place the primitive's label surface pairs with this package's
 * dictionary, shared by every terminal render site (chat row, bash row,
 * details panel).
 * @param t - the render site's conversation locale seat.
 * @returns the full label set for {@link TerminalBlockProps}'s `labels`.
 */
export declare function terminalBlockLabels(t: TranslateNS<'conversation'>): TerminalBlockLabels;
/**
 * The {@link TerminalBlock} props this derivation owns. Picked off the
 * primitive's props so the two stay in step; `maxLines`/`className` belong to
 * each render site.
 */
export interface TerminalCardModel {
    /**
     * The locale-neutral props {@link TerminalBlock} draws. The render site adds
     * `command` after resolving {@link copy} through its locale seat.
     */
    card: Pick<TerminalBlockProps, 'cwd' | 'output' | 'exitCode' | 'signal' | 'running'>;
    /**
     * Verbatim Tool data or semantic `terminal_send` data. Product copy stays
     * unresolved until a render site supplies its locale seat.
     */
    copy: {
        readonly kind: 'shell';
        readonly command: string;
        readonly description: string | undefined;
    } | {
        readonly kind: 'terminal-send';
        readonly text: string;
        readonly sessionId: string;
    };
}
interface LocalizedTerminalCardModel {
    readonly card: Pick<TerminalBlockProps, 'command' | 'cwd' | 'output' | 'exitCode' | 'signal' | 'running'>;
    readonly description: string | undefined;
}
/**
 * Resolve locale-owned `terminal_send` copy while preserving Tool-authored
 * shell commands and descriptions verbatim.
 * @param model - locale-neutral terminal card data.
 * @param t - the render site's conversation locale seat.
 * @returns terminal props and description ready for rendering.
 */
export declare function localizeTerminalCardModel(model: TerminalCardModel, t: TranslateNS<'conversation'>): LocalizedTerminalCardModel;
/**
 * True when a settled terminal card reports a failing exit — a non-zero code
 * or a terminating signal. The bash tool settles a failing command as a
 * completed call (`isError` stays false: the exit status is result data), so
 * this is the collapsed row's only failure signal; without it the red exit
 * pill would be visible only after expanding the card.
 * @param model - a derived terminal card.
 * @returns whether the card's exit status is a failure.
 */
export declare function terminalFailed(model: TerminalCardModel): boolean;
/**
 * Identify a settled root call from the persistent Bash or PowerShell tool.
 * Its result stays on the generic input/output path because the persistent
 * shell can report resets and partial output without one process exit status.
 * @param block - running or settled Tool block.
 * @returns whether the block is a settled persistent-shell call.
 */
export declare function isSettledPersistentShellCall(block: ToolCallBlock): boolean;
/**
 * Identify a settled foreground shell preview whose spill footer can hide the exit marker.
 * @param block - running or settled Tool block.
 * @returns whether the shell output must remain generic without an inferred exit status.
 */
export declare function isSpilledShellCall(block: ToolCallBlock): boolean;
/**
 * Derive terminal props for supported shell and terminal-send calls, including
 * nested Code Dispatch calls. Standard shell results parse their final status
 * marker; persistent shell results, spill previews, background calls, errors,
 * and malformed input use the generic path. {@link isSettledPersistentShellCall} lets that generic
 * persistent result remain expandable without inventing one process status.
 * @param block - running or settled Tool block.
 * @param sessionCwd - session workspace root used to resolve workdir.
 * @returns locale-neutral terminal-card data, or null for the generic path.
 */
export declare function terminalCardModel(block: ToolCallBlock, sessionCwd?: string): TerminalCardModel | null;
export {};
//# sourceMappingURL=terminal-card-model.d.ts.map