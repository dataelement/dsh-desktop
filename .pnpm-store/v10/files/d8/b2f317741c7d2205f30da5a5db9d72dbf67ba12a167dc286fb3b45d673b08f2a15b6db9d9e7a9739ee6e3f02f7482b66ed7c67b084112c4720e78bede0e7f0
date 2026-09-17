/**
 * Permission default-settings controller. The permission descriptor comes
 * from the shared describe mirror (the dynamic preset enum lives in the
 * namespace schema, which per-namespace scopes do not carry); writes target
 * only `defaultPreset`, carry the descriptor revision, and fold their answer
 * back into the mirror.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { SettingsNamespaceView } from '@deepseek-ai/dsh-api-remotes/client';
import { type SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { SettingsDescribeFace, SettingsSchemaService } from '@deepseek-ai/dsh-client-ui-settings/client';
/** Permission's settings namespace on the host wire. */
export declare const PERMISSION_SETTINGS_NS = "permission";
/** One selectable new-session default. */
export interface PermissionDefaultOption {
    /** Preset key written to Settings. */
    id: string;
    /** Host-supplied label or a title-cased preset key. */
    label: string;
}
/** Permission settings-row snapshot. */
export interface PermissionSettingsState {
    status: 'idle' | 'loading' | 'ready' | 'saving' | 'unavailable' | 'error';
    error: string | null;
    writable: boolean;
    currentValue: string;
    options: readonly PermissionDefaultOption[];
    revision: number;
}
/**
 * Read the dynamic preset enum encoded by the host's `defaultPreset` schema.
 * @param view - permission namespace descriptor.
 * @param schema - settings schema operations.
 * @returns current value and selectable options.
 */
export declare function permissionDefaultOf(view: SettingsNamespaceView, schema: SettingsSchemaService): {
    currentValue: string;
    options: PermissionDefaultOption[];
};
/** Controller deriving the row from the shared mirror and writing the default through it. */
export declare class PermissionPresetSettingsController {
    private readonly describeFace;
    private readonly ctx;
    private readonly schema;
    /** Row snapshot consumed through a bound selector hook. */
    readonly store: SnapshotStore<PermissionSettingsState>;
    private following;
    private saving;
    private disposed;
    /**
     * @param describeFace - the shared mirror's read/fold face (descriptor and schema source).
     * @param ctx - the row plugin's context, whose `remote.settings` namespace
     * carries the `defaultPreset` write.
     * @param schema - settings-owned schema operations.
     */
    constructor(describeFace: SettingsDescribeFace, ctx: ClientContext, schema: SettingsSchemaService);
    /**
     * Begin following the mirror (idempotent) and reflect its current answer.
     * @returns settlement once the snapshot reflects the mirror.
     */
    load(): Promise<void>;
    /**
     * Persist one preset as the default for subsequently created sessions.
     * A selection made while one is already saving is ignored — the row's
     * control is disabled during the save, so this only drops programmatic
     * double-submits rather than user intent.
     * @param preset - advertised preset key.
     * @returns nothing; {@link store} carries success or failure.
     */
    select(preset: string): Promise<void>;
    /** Stop following the mirror; later publishes leave the snapshot alone. */
    dispose(): void;
    private derive;
    private fail;
}
//# sourceMappingURL=settings-store.d.ts.map