/**
 * User-facing permission presets over the independent sandbox-mode and
 * approval-policy knobs. A switch records the selected preset, then writes
 * changed knobs through their canonical setters. Execution, prompt narration,
 * and replay keep reading their knob folds. The preset event preserves user
 * intent when two presets share a bundle. The read side ships as the
 * `permissions` session projection; the write side ships as the
 * `/permission` command.
 *
 * @module dsh-permission-presets
 */
import { Context, Service } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { Session } from '@deepseek-ai/dsh-session';
import type { SandboxMode } from '@deepseek-ai/dsh-sandbox';
import type { ApprovalPolicy } from '@deepseek-ai/dsh-user-approval';
import type { PermissionSelect, PresetOption } from './types.ts';
export type * from './types.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        permissionPresets: PermissionPresetService;
    }
}
declare module '@deepseek-ai/dsh-session-projection/types' {
    interface SessionProjectionStateMap {
        /** Latest logged permission overrides and constructor-seed provenance. */
        permissions: PermissionProjectionState;
    }
}
declare module '@deepseek-ai/dsh-session/types' {
    interface SessionEventMap {
        /**
         * Records the selected preset as durable, log-only user intent. The knob
         * events follow in the same turn and control execution; this event stays
         * out of the model transcript and lets the permission projection unit
         * preserve a selection when bundles match.
         */
        'permission/preset': {
            preset: string;
        };
    }
}
/** One preset's sandbox/approval bundle and optional client presentation. */
export interface PresetSpec {
    /** The `sandbox/mode` value the preset writes through. */
    sandbox: SandboxMode;
    /** The `approval/policy` value the preset writes through. */
    approval: ApprovalPolicy;
    /** The display label a client shows for this preset; the raw table key when omitted. */
    name?: string;
    /** One user-facing sentence on what the preset means; omitted when not configured. */
    description?: string;
}
/**
 * Returned when effective knob values match no table entry. Clients may show
 * it as the current value, but it is never a switch target or event payload.
 */
export declare const CUSTOM_PRESET = "custom";
/** Settings namespace carrying the default for future sessions. */
export declare const PERMISSION_SETTINGS_NAMESPACE = "permission";
/**
 * The projection unit's knob state: the last seen value of each knob event,
 * null before an override (composition defaults apply at view time).
 */
export interface KnobState {
    /** Last `permission/preset` payload, or null. */
    preset: string | null;
    /** Last `sandbox/mode` payload, or null. */
    sandbox: SandboxMode | null;
    /** Last `approval/policy` payload, or null. */
    approval: ApprovalPolicy | null;
}
/** Projection state for permission overrides and constructor-seed provenance. */
interface PermissionProjectionState extends KnobState {
    /** Whether the log contains a constructor-seed boundary. */
    seeded: boolean;
}
/** User setting resolved when a new session receives its initial permission. */
export interface PermissionSettings {
    /** Preset pinned into a newly created session. */
    defaultPreset: string;
}
/** The {@link PermissionPresetService} config: preset table and composition default. */
export interface Config {
    /**
     * The preset table: name → knob bundle. Defaults to `workspace-write`
     * (workspace-write + ask) and `danger-full-access` (danger-full-access +
     * never). The name `custom` is reserved for the derived not-a-preset state.
     */
    presets?: Record<string, PresetSpec>;
    /**
     * Default for new sessions. When omitted, the preset matching the composed
     * sandbox and approval defaults is used.
     */
    defaultPreset?: string;
}
/**
 * Owns the deployment's permission presets and their write path. Requires a
 * confining `ctx.shell` executor and `ctx.approval`; unmatched knob values are
 * reported as {@link CUSTOM_PRESET}, not an error.
 */
export declare class PermissionPresetService extends Service {
    static Config: z<Config>;
    static inject: string[];
    private readonly presets;
    private defaultSettings;
    constructor(ctx: Context, config: Config);
    /**
     * The advertised preset names, in the preset table's declaration order.
     * @returns every switchable preset name.
     */
    get names(): readonly string[];
    /**
     * The preset currently selected as the default for future sessions.
     * @returns the resolved settings value, or the composition default without
     * a mounted settings provider.
     */
    get defaultPreset(): string;
    private permissionState;
    /**
     * Resolve the preset matching the effective knob values. A still-matching
     * last selection wins shared-bundle ties; otherwise the first table match
     * wins, or {@link CUSTOM_PRESET} when no entry matches.
     * @param session - the session whose knob state is read.
     * @returns the effective preset name, or `custom` when nothing matches.
     */
    current(session: Session): string;
    /** Resolve the preset for one folded knob state (the shared mathematics of `current` and the projection unit). */
    private derive;
    /**
     * Build the whole select value for one folded knob state: every table
     * option in declaration order, `custom` appended exactly while derived.
     * @param state - the folded knob overrides.
     * @returns the `permissions` projection payload.
     */
    selectFor(state: KnobState): PermissionSelect;
    /**
     * Resolve a preset's knob bundle.
     * @param name - the preset name to resolve.
     * @returns the configured bundle.
     * @throws when `name` is not in the table.
     */
    resolve(name: string): PresetSpec;
    /**
     * Build the client option for a table entry or {@link CUSTOM_PRESET}. A
     * missing label falls back to the table key.
     * @param name - a table key, or `custom`.
     * @returns the option a client renders.
     * @throws when `name` is neither a table key nor `custom`.
     */
    optionOf(name: string): PresetOption;
    /**
     * Record a changed preset, then update each changed knob through its own
     * setter. Selecting the effective preset again appends nothing.
     * @param session - the session the switch belongs to.
     * @param name - the preset to switch to; unknown names throw.
     */
    set(session: Session, name: string): void;
    /** Apply one preset with the caller-selected live or initialization policy writer. */
    private apply;
    /**
     * Fill every missing permission fact before a session is published. A
     * genuinely fresh session uses the current user default; seeded or partially
     * initialized sessions preserve their effective knob values and only gain
     * the missing durable facts.
     */
    private pinInitialPermission;
}
export default PermissionPresetService;
//# sourceMappingURL=index.d.ts.map