/**
 * The agent-preset chip on the new-session screen, beside the workspace
 * picker.
 *
 * It lives here rather than in the composer because the choice is only
 * available before a conversation starts: once a turn has run, the session's
 * history was produced under that preset's tools and the host refuses to swap
 * them. A control that spends most of its life disabled belongs on the screen
 * where it still works.
 *
 * The menu opens on the staged choice, which starts as the deployment default.
 * Picking stages; the choice reaches a session when one becomes current.
 */
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { AgentPresetSeatState } from './seat-store.ts';
/** Registration-side business face for the hero chip. */
export interface AgentPresetSeatInjected {
    hooks: {
        /** Seat snapshot bound by the renderer as useAgentPresetSeat. */
        agentPresetSeat: SnapshotStore<AgentPresetSeatState>;
    };
    /** Read the roster when the chip first renders. */
    load: () => Promise<void>;
    /** Stage one preset for the next session; resolves to a refusal, or undefined. */
    select: (id: string) => Promise<string | undefined>;
    /** Clear the one-shot introduce cue once the chip has played it. */
    introduced: () => void;
}
/** Full component props. */
export type AgentPresetSeatProps = PropsRuntime<'conversation.hero.agentPreset'> & PropsLocale<'settings.agentPreset'> & InjectFace<AgentPresetSeatInjected>;
/**
 * Render the new-session agent-preset chip.
 * @param props - composed slot props.
 * @returns the chip, or null when the deployment composes no presets.
 */
export declare function AgentPresetSeat({ load, select, introduced, useAgentPresetSeat, t }: AgentPresetSeatProps): import("react").JSX.Element | null;
//# sourceMappingURL=AgentPresetSeat.d.ts.map