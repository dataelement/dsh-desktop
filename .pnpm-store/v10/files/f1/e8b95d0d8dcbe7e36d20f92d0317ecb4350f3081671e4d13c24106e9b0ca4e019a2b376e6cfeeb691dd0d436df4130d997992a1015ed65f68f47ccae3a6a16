/**
 * Agent-preset roster store shared by the display surfaces.
 *
 * Options come from one `agentPresets.list` call. Writes target the settings
 * namespace's `default` field, which is what the host resolves at creation;
 * the management section is the surface that writes it.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { AgentPresetRoster } from '@deepseek-ai/dsh-agent-presets/types';
/** The agent-preset settings namespace on the host wire. */
export declare const AGENT_PRESET_SETTINGS_NS = "agent-presets";
/**
 * Persist one preset as the default for sessions created later.
 *
 * The default is a settings field rather than a preset property; the
 * management section writes it here — one home for which namespace and field
 * the host resolves at session creation.
 * @param ctx - the browser plugin context carrying the Remote namespaces.
 * @param id - the preset to make default.
 * @returns the failure message, or undefined once the write landed.
 */
export declare function writeDefaultPreset(ctx: ClientContext, id: string): Promise<string | undefined>;
/** One selectable preset. */
export interface AgentPresetOption {
    /** Preset id, written to Settings and the label's fallback. */
    id: string;
    /** Whether the preset ships with the deployment or was authored locally. */
    trust: 'system' | 'user';
    /** Display name the preset published, absent when it published none. */
    name?: string;
    /** One sentence on what the preset is for. */
    description?: string;
}
/** One roster entry exactly as the host reports it. */
export type RosterPreset = AgentPresetRoster['presets'][number];
/** The roster, or the message to show in its place. */
export type RosterRead = {
    ok: true;
    value: AgentPresetRoster;
} | {
    ok: false;
    error: string;
};
/**
 * Read the roster, turning a refusal into the message every surface shows.
 * @param ctx - the browser plugin context carrying the Remote namespaces.
 * @returns the roster, or the message to show in its place.
 */
export declare function readRoster(ctx: ClientContext): Promise<RosterRead>;
/**
 * The opening move every roster-backed surface makes: refuse a read that is
 * already in flight, mark the store loading, then read.
 *
 * A surface that gets `undefined` returns without touching its snapshot
 * further — either another read owns it, or this one already wrote the
 * failure. What differs between surfaces starts after this.
 * @param ctx - the browser plugin context carrying the Remote namespaces.
 * @param store - the surface's own snapshot store.
 * @returns the roster, or undefined when the caller should return.
 */
export declare function beginRosterRead<S extends {
    status: string;
    error: string | null;
}>(ctx: ClientContext, store: SnapshotStore<S>): Promise<AgentPresetRoster | undefined>;
/**
 * The roster entries as the pickers render them: healthy presets only.
 *
 * The chip exists to choose the NEXT session's composition, and a broken
 * preset cannot compose one — offering it would defer the discovery of that
 * fact to a failed session start. The management section renders the full
 * roster (broken rows included) from its own store instead.
 *
 * The chip, the header label, and the management section all show the same
 * facts, and `exactOptionalPropertyTypes` makes "absent" and "present as
 * undefined" different shapes — so the spread dance belongs in one place rather than
 * once per store.
 * @param presets - the roster the host answered with.
 * @returns one option per selectable preset, in roster order.
 */
export declare function presetOptions(presets: readonly {
    id: string;
    trust: 'system' | 'user';
    name?: string;
    description?: string;
    broken?: string;
}[]): AgentPresetOption[];
/** Agent-preset roster snapshot for the display surfaces. */
export interface AgentPresetSettingsState {
    status: 'idle' | 'loading' | 'ready' | 'unavailable' | 'error';
    error: string | null;
    options: readonly AgentPresetOption[];
}
/** Reads the roster for the surfaces that only display it. */
export declare class AgentPresetSettingsController {
    private readonly ctx;
    /** Roster snapshot the renderer subscribes to. */
    readonly store: SnapshotStore<AgentPresetSettingsState>;
    /**
     * @param ctx - the browser plugin context (the roster read).
     */
    constructor(ctx: ClientContext);
    private set;
    /**
     * Load the roster. An empty roster means the deployment composes no
     * presets, which is a valid deployment rather than a failure — the
     * surfaces report `unavailable` and render nothing.
     * @returns once the snapshot reflects the host.
     */
    load(): Promise<void>;
}
//# sourceMappingURL=settings-store.d.ts.map