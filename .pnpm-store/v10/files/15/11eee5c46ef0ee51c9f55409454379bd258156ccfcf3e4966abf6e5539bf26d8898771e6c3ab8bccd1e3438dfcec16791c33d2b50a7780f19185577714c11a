/**
 * Agent-presets settings section: the roster as cards, a copy dialog as the
 * only way a preset is created, and a read-only viewer over the shipped
 * compositions.
 *
 * The browser edits no composition text — a shipped preset opens read-only to
 * be READ (it is the known-good composition a copy starts from), and a custom
 * preset is edited in its own files, which is what the location action leads
 * to. Deleting a preset leaves running sessions alone: a composition is
 * mounted once at session creation and nothing re-reads the file.
 */
import type { ReactNode } from 'react';
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { type AgentPresetSectionState } from './section-store.ts';
/** Registration-side business face for the management section. */
export interface AgentPresetSectionInjected {
    hooks: {
        /** Page snapshot bound by the renderer as useAgentPresetSection. */
        agentPresetSection: SnapshotStore<AgentPresetSectionState>;
    };
    /** Read the roster; called once when the section first renders. */
    load: () => Promise<void>;
    /** Open one shipped preset's composition in the read-only viewer. */
    view: (id: string) => Promise<void>;
    /** Close the read-only viewer. */
    closeView: () => void;
    /** Open the copy dialog over one preset. */
    beginCopy: (from: string) => void;
    /** Close the copy dialog, discarding the draft. */
    cancelCopy: () => void;
    /** Name the preset the copy creates. */
    setCopyId: (id: string) => void;
    /** Name the copy's display name. */
    setCopyName: (name: string) => void;
    /** Submit the copy. */
    confirmCopy: () => Promise<void>;
    /** Open one preset's directory, or reveal its path where there is no desktop. */
    openLocation: (id: string) => Promise<void>;
    /**
     * Stage the self-referential preset and start a new session on it — the
     * guided way to author a preset, beside copying. Absent when the surface
     * is composed without the conversation flow to land the session in.
     */
    startCreatorDraft?: () => void;
    /** Ask for delete confirmation, or dismiss it with null. */
    confirmDelete: (id: string | null) => void;
    /** Delete the preset awaiting confirmation. */
    remove: () => Promise<void>;
    /** Make one preset the default for sessions created later. */
    makeDefault: (id: string) => Promise<void>;
}
/** Full component props. */
export type AgentPresetSectionProps = PropsRuntime<'settings.section'> & PropsLocale<'settings.agentPreset'> & InjectFace<AgentPresetSectionInjected>;
/**
 * Render the Agent presets section content column.
 * @param props - composed slot props.
 * @returns the section, or null when the deployment composes no presets.
 */
export declare function AgentPresetSection(props: AgentPresetSectionProps): ReactNode;
//# sourceMappingURL=AgentPresetSection.d.ts.map