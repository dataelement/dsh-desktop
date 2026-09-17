import type { MarkdownFileMentions } from '@deepseek-ai/dsh-client-ui-primitives';
import type { ChatNodeOwnerProps, ChatViewSlotProps } from '../contract/slots.ts';
import type { AssistantBlock } from '../contract/snapshot.ts';
/**
 * Map one authored media destination to the same-origin workspace-file URL.
 * @param protocol - `window.location.protocol` at render time.
 * @param origin - `window.location.origin` at render time.
 * @param value - The authored markdown destination, exactly as written.
 * @returns The API URL for an absolute POSIX path on an HTTP(S) page, or
 * undefined when the destination cannot be a Host-served local file
 * (non-HTTP transport such as Electron `file://`, protocol-relative or
 * relative destinations).
 */
export declare function localPathMediaUrl(protocol: string, origin: string, value: string): string | undefined;
export interface AssistantMarkdownProps {
    blocks: readonly AssistantBlock[];
    streaming: boolean;
    /** Frozen partial of an aborted turn: rendered with a stopped marker. */
    interrupted?: boolean | undefined;
    /** Render consecutive image blocks through the attachment slot. */
    renderMessageImages: ChatNodeOwnerProps['renderMessageImages'];
    /** Hide reasoning that belongs to the Turn-level process disclosure. */
    reasoningHidden?: boolean | undefined;
    /** Reveal the owning Turn-level process disclosure. */
    revealProcess?: (() => void) | undefined;
    /** Resolved prose file mentions for this Assistant's closing turn. */
    mentions?: MarkdownFileMentions | undefined;
    /** The owning view's locale seat, passed down as a plain prop. */
    t: ChatViewSlotProps['t'];
}
/** Reasoning block as the Think variant summary row (figma 39:28304). */
export declare const AssistantMarkdown: import("react").MemoExoticComponent<({ blocks, streaming, interrupted, renderMessageImages, reasoningHidden, revealProcess, mentions, t, }: AssistantMarkdownProps) => import("react").JSX.Element | null>;
//# sourceMappingURL=AssistantMarkdown.d.ts.map