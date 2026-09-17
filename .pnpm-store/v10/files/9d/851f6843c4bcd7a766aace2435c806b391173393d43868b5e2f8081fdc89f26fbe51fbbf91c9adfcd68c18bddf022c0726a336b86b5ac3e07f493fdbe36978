/** General Settings row for completed-Turn transcript presentation. */
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { TranscriptViewMode } from '../../chat-settings.ts';
/** Registration-side transcript preference face. */
export interface TranscriptViewRowInjected {
    hooks: {
        /** Persisted transcript preference bound as useTranscriptView. */
        transcriptView: SnapshotStore<TranscriptViewMode>;
    };
    /** Change the completed-Turn transcript presentation. */
    setTranscriptView: (mode: TranscriptViewMode) => void;
}
/** Full Settings-row props. */
export type TranscriptViewRowProps = PropsRuntime<'settings.general.item'> & PropsLocale<'chat'> & InjectFace<TranscriptViewRowInjected>;
/**
 * Render the completed-Turn transcript mode selector.
 * @param props - composed Settings slot props.
 * @returns the preference row.
 */
export declare function TranscriptViewRow({ useTranscriptView, setTranscriptView, t }: TranscriptViewRowProps): import("react").JSX.Element;
//# sourceMappingURL=TranscriptViewRow.d.ts.map