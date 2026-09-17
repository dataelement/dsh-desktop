/** Chat transcript preferences stored in the Host user-settings document. */
import z from '@deepseek-ai/schemastery';
/** Settings namespace owned by the Chat target. */
export declare const CHAT_SETTINGS_NAMESPACE = "ui-chat";
/** Field carrying the completed-Turn transcript presentation mode. */
export declare const TRANSCRIPT_VIEW_FIELD = "transcriptView";
/** Transcript presentation modes accepted at settings boundaries. */
export declare const TRANSCRIPT_VIEW_MODES: readonly ["normal", "compact"];
/** Completed-Turn transcript presentation. */
export type TranscriptViewMode = typeof TRANSCRIPT_VIEW_MODES[number];
/** Default preserves the compact process disclosure introduced by Chat. */
export declare const DEFAULT_TRANSCRIPT_VIEW_MODE: TranscriptViewMode;
/** Durable Chat section shared by the Host schema and browser scope. */
export interface ChatSettings {
    /** Presentation mode for completed Turn process content. */
    transcriptView: TranscriptViewMode;
}
/** Durable Chat schema; also the wire envelope the browser scope validates against. */
export declare const ChatSettingsSchema: z<ChatSettings>;
//# sourceMappingURL=chat-settings.d.ts.map