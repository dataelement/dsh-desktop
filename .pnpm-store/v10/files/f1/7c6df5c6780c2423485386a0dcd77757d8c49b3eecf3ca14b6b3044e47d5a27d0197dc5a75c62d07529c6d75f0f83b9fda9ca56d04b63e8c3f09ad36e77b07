/** Pure replay-safe render intents for Cordis tools. */
import type { GenericCallView } from '@deepseek-ai/dsh-tools';
/**
 * Render a runtime-inspection call.
 * @param args - requested runtime category and optional member name.
 * @returns replay-safe generic call presentation.
 */
export declare function presentRuntimeInspectCall(args: {
    what?: string;
    name?: string;
}): GenericCallView;
/**
 * Render provider-directory inspection.
 * @returns replay-safe generic call presentation.
 */
export declare function presentInspectListCall(): GenericCallView;
/**
 * Render one provider query.
 * @param args - target platform, provider, and method.
 * @returns replay-safe generic call presentation.
 */
export declare function presentInspectQueryCall(args: {
    platform: string;
    provider: string;
    method: string;
}): GenericCallView;
/**
 * Render layered self-inspection.
 * @param args - optional Plugin and Package identity.
 * @returns replay-safe generic call presentation.
 */
export declare function presentInspectSelfCall(args: {
    pluginId?: string;
    packageId?: string;
}): GenericCallView;
/**
 * Render an immutable Package source-inspection call.
 * @param args - exact Plugin and Package identity.
 * @returns replay-safe generic call presentation.
 */
export declare function presentPackageInspectCall(args: {
    pluginId: string;
    packageId: string;
}): GenericCallView;
/**
 * Render a new or appended Package definition.
 * @param args - target Plugin, Package metadata, and source halves.
 * @returns replay-safe generic call presentation with source in raw input.
 */
export declare function presentDefineCall(args: {
    plugin: {
        kind: 'new';
        idPrefix: string;
    } | {
        kind: 'existing';
        pluginId: string;
    };
    name: string;
    purpose: string;
    code: {
        host?: string;
        client?: string;
    };
}): GenericCallView;
/**
 * Render Plugin removal.
 * @param args - Plugin identity to remove.
 * @returns replay-safe generic call presentation.
 */
export declare function presentUndefineCall(args: {
    pluginId: string;
}): GenericCallView;
/**
 * Render one exact Package activation.
 * @param args - Plugin, Package, and activation mode.
 * @returns replay-safe generic call presentation.
 */
export declare function presentRunCall(args: {
    pluginId: string;
    packageId: string;
    mode: 'run' | 'update';
}): GenericCallView;
/**
 * Render Plugin stop.
 * @param args - Plugin identity to stop.
 * @returns replay-safe generic call presentation.
 */
export declare function presentStopCall(args: {
    pluginId: string;
}): GenericCallView;
//# sourceMappingURL=present.d.ts.map