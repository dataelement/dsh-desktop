import type { ChatNodeViewProps, ChatViewSlotProps } from '../contract/slots.ts';
/** Props for one complete system prompt disclosure. */
export interface SystemPromptRowProps {
    /** Complete model-visible prompt text. */
    text: string;
    /** True when the prompt replaced an earlier one from this position in the history. */
    update?: boolean;
    /** The owning view's locale seat. */
    t: ChatViewSlotProps['t'];
}
/**
 * Render one complete system prompt as a collapsed disclosure whose expanded
 * body is the same opaque context chrome: 141px code-block scrollport and
 * model-facing text with its real line breaks. An in-history update uses the
 * same row under its own title.
 * @param props - Complete prompt text, whether it is an update, and the locale seat.
 * @returns The system-prompt disclosure row.
 */
export declare function SystemPromptRow({ text, update, t }: SystemPromptRowProps): import("react").JSX.Element;
/** System-prompt keyed Chat renderer. */
export declare const SystemPromptNodeView: import("react").MemoExoticComponent<({ node, t, }: Pick<ChatNodeViewProps<"system-prompt">, "node" | "t">) => import("react").JSX.Element>;
//# sourceMappingURL=SystemPromptRow.d.ts.map