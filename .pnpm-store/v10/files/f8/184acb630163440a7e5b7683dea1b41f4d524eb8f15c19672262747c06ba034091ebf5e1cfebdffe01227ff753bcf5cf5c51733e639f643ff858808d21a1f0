import { type QuestionComposerProps } from './contract/slots.ts';
/**
 * Split the conventional recommendation suffix without changing the answer value.
 * @param label - Original option label returned if selected.
 * @returns Display label plus recommendation state.
 */
export declare function parseRecommendedLabel(label: string): {
    label: string;
    recommended: boolean;
};
/**
 * Composer takeover router. Generic-question drafts live in this entry's
 * Session-scoped Slot store, keyed by the pending carrier, so a strict Session
 * entry remount restores the same request without exposing it to another one.
 *
 * One takeover, two presentations: a request that declares a presentation intent this
 * package renders uses that presentation (a plan review is one decision over one
 * plan, not a question set), and every other request takes the generic flow.
 * The routing lives here, at the one entry that owns the composer seat, so
 * neither presentation can claim a request the other is already rendering.
 *
 * @param props - the selector-matched pending question carrier plus the framework standard kit.
 * @returns The question flow, or the intent's own surface, for this request.
 */
export declare function QuestionComposer(props: QuestionComposerProps): import("react").JSX.Element;
//# sourceMappingURL=QuestionComposer.d.ts.map