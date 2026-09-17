/**
 * Adaptive chooser of the directory-picker seam: resolves the host's
 * situation once at boot (bind host, SSH launch, display session, Linux
 * chooser binary) and mounts the matching interaction — `native` or `browse`
 * — as real Loader entries in the in-memory root tree. Each interaction is a
 * pair: the Host backend serving the seam capability and the client surface
 * occupying ui-workspace's directory-flow holes. Both arrive as ordinary
 * entries, so the surface is discovered exactly as a config-row's would be
 * and one resolved choice still swaps both faces; pinning an interaction
 * remains composing that pair directly instead of this row.
 * @module @deepseek-ai/dsh-host-directory-picker-auto
 */
import type { Context } from '@deepseek-ai/cordis';
import type { DirectoryPickerBackendKind } from './resolve.ts';
export { canExecute, hasLinuxChooserBinary } from './probe.ts';
export type { DirectoryPickerBackendKind, DirectoryPickerEnv, DirectoryPickerHostFacts } from './resolve.ts';
export { resolveDirectoryPickerBackend } from './resolve.ts';
/** Cordis plugin name. */
export declare const name = "directory-picker-auto";
/** Required services: the effective bind host (`webServer`) and the entry tree the backend mounts into (`loader`). */
export declare const inject: string[];
/**
 * Host backend package per resolved kind — fixed composition vocabulary, not a
 * tunable. Exported because the reference is a runtime string the static
 * config gate cannot see in a yml row: `verify-cordis-config` requires every
 * app composing this chooser to declare both values as dependencies.
 */
export declare const BACKEND_PACKAGES: Record<DirectoryPickerBackendKind, string>;
/**
 * Client surface package per resolved kind, mounted with its backend so one
 * resolved interaction still composes both faces. Declared as dependencies by
 * every composing app for the same reason as {@link BACKEND_PACKAGES}. Only the
 * specifier is referenced here because the packages belong to the Client
 * program, so no import of them exists on this side.
 */
export declare const SURFACE_PACKAGES: Record<DirectoryPickerBackendKind, string>;
/**
 * Resolve the interaction from one boot-time sample and mount its backend and
 * surface as Loader entries; the effect's disposer removes both entries and
 * joins their fibers' teardown, so unloading this plugin returns only after
 * both faces of the mounted interaction (and their dependents) quiesced.
 * @param ctx - cordis context carrying the injected `webServer` and `loader`.
 */
export declare function apply(ctx: Context): Promise<void>;
//# sourceMappingURL=index.d.ts.map