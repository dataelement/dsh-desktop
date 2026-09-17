/** Host-backed completed-Turn transcript presentation policy. */
import { type SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client';
import { type ChatSettings, type TranscriptViewMode } from '../chat-settings.ts';
/** Live transcript preference consumed by Chat and its Settings row. */
export declare class TranscriptViewPolicy {
    private readonly host;
    /** Reactive current mode; defaults to Compact before Host settings arrive. */
    readonly mode: SnapshotStore<TranscriptViewMode>;
    /**
     * @param host - durable Chat settings scope.
     */
    constructor(host: SettingsScope<ChatSettings>);
    /**
     * Publish and persist one explicit user choice.
     * @param mode - Normal or Compact transcript presentation.
     */
    setMode(mode: TranscriptViewMode): void;
    /** Adopt the latest accepted Host section without writing it back. */
    private adopt;
}
//# sourceMappingURL=transcript-view.d.ts.map