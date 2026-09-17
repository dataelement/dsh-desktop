/**
 * The session header's agent-preset label.
 *
 * Read-only by construction: a session's composition is fixed once its
 * conversation starts, and a header is only worth reading after that. Offering
 * a control here would promise a switch the host refuses; naming what the
 * session runs is the honest affordance, and the choice itself lives on the
 * new-session screen ({@link AgentPresetSeat}).
 */
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { AgentPresetSettingsState } from './settings-store.ts';
/** Registration-side business face for the header label. */
export interface AgentPresetLabelInjected {
    hooks: {
        /** Roster snapshot bound by the renderer as useAgentPresets. */
        agentPresets: SnapshotStore<AgentPresetSettingsState>;
    };
    /** Read the roster, so the label can show a name rather than an id. */
    load: () => Promise<void>;
}
/** Full component props. */
export type AgentPresetLabelProps = PropsRuntime<'conversation.session.header.actions'> & PropsLocale<'settings.agentPreset'> & InjectFace<AgentPresetLabelInjected>;
/**
 * Render this session's agent-preset name beside its title.
 * @param props - composed slot props.
 * @returns the label, or null when the session records no preset.
 */
export declare function AgentPresetLabel({ sessionId, useSessions, useAgentPresets, load, t, }: AgentPresetLabelProps): import("react").JSX.Element | null;
//# sourceMappingURL=AgentPresetLabel.d.ts.map