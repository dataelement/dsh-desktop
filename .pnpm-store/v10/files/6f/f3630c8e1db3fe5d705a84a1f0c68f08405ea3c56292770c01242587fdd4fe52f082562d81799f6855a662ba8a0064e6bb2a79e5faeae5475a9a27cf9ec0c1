import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from './locales.ts';
/** Why a catalog-addressed conversation cannot accept human input. */
export interface SubagentReadOnlyMatch {
    reason: 'one-shot' | 'parent-unavailable';
}
/** Full chain props after the read-only subagent selector accepts the owner currency. */
export type SubagentReadOnlyComposerProps = PropsRuntime<'conversation.composer'> & {
    matched: SubagentReadOnlyMatch;
} & PropsLocale<typeof NS>;
/**
 * Explain why the normal composer is unavailable for an addressed child.
 * @param props - selector-owned read-only reason plus standard slot props.
 * @returns A read-only composer replacement.
 */
export declare function SubagentReadOnlyComposer({ matched, t, }: Pick<SubagentReadOnlyComposerProps, 'matched' | 't'>): import("react").JSX.Element;
//# sourceMappingURL=SubagentReadOnlyComposer.d.ts.map