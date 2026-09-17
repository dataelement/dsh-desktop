/**
 * Profile discovery, initialization, and patch-layer composition for the
 * `dsh --profile` launcher family.
 *
 * A profile is a directory under `$DSH_HOME/profiles/<name>` holding a
 * `package.json` (out-of-tree plugin dependencies plus the profile manifest
 * `dsh.profile` with its ordered `bundles` list) and a `cordis.patch.yml`
 * (the user's own patch layer, applied after every bundle layer). Bundles are
 * npm packages whose manifest declares
 * `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`; the tree is
 * composed by applying each bundle's patch list in `dsh.profile.bundles` order over
 * an empty entry list, then the profile's own patches, then any launcher
 * layers (`--patch` files and flag-derived patches).
 *
 * Module resolution is two-anchor by construction: a bundle name resolves
 * first from the dsh installation (the launcher's own package), then from the
 * profile directory. Pnpm-managed entries in the profile's `node_modules`
 * resolve first. Dsh-owned links add packages carried only by selected
 * bundles, while `$DSH_HOME/profiles/node_modules` supplies the installation
 * dependency closure through Node's ordinary parent-walk. Plain Node uses
 * symlinks for that shared fallback; packaged executables use ESM proxies so
 * external plugins retain the installation's module instances.
 * @module @deepseek-ai/dsh-app-boot/profile
 */
import type { EntryOptions } from '@deepseek-ai/cordis-plugin-loader';
import { type PatchOptions } from '@deepseek-ai/cordis-plugin-include';
import type { DshManifest, ProfilePatchReload } from '@deepseek-ai/dsh-package-manifest';
/** Directory under the Harness home holding every profile. */
export declare const PROFILES_DIR = "profiles";
/** The user patch layer inside a profile directory (hot-reloaded on long-lived surfaces). */
export declare const PROFILE_PATCH_FILENAME = "cordis.patch.yml";
/** Installation-owned defaults used when a shipped profile is first opened. */
export interface ProfileTemplate {
    /** Ordered bundle layer list. */
    bundles: readonly string[];
    /** User patch-file lifecycle for the generated profile. */
    patchReload: ProfilePatchReload;
}
/** The slice of package.json both profiles and bundles use. */
export interface ProfileManifest {
    name?: string;
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    dsh?: DshManifest;
}
/** One resolved bundle layer of a profile. */
export interface ProfileLayer {
    /** The bundle's package name, as listed in `dsh.profile.bundles`. */
    packageName: string;
    /** Absolute directory of the resolved bundle package. */
    packageDir: string;
    /** Absolute path of the bundle's patch file. */
    patchPath: string;
    /** The parsed patch list. */
    patches: PatchOptions[];
}
/** A loaded profile: resolved bundle layers plus the user's own patch layer. */
export interface Profile {
    /** The profile name (its directory basename). */
    name: string;
    /** Absolute profile directory. */
    dir: string;
    /** Bundle layers in `dsh.profile.bundles` order. */
    layers: ProfileLayer[];
    /** Absolute path of the profile's own patch file. */
    patchPath: string;
    /** The profile's own patches; empty when the file is absent. */
    patches: PatchOptions[];
    /** Whether the launcher watches user patch files after boot. */
    patchReload: ProfilePatchReload;
}
/**
 * Resolve a profile's directory under the Harness home.
 * @param name - the profile name (`dsh --profile <name>`).
 * @param home - the Harness home; defaults to {@link resolveDshHome}.
 * @returns the absolute profile directory (which may not exist yet).
 */
export declare function resolveProfileDir(name: string, home?: string): string;
/** The shipped profile templates auto-initialized on first use, by name. */
export declare const PROFILE_TEMPLATES: Record<string, ProfileTemplate>;
/** The bundle list a `dsh plugin` init uses for a name with no shipped template. */
export declare const DEFAULT_PROFILE_BUNDLES: readonly string[];
/** Custom profiles retain the historical live patch-file behavior. */
export declare const DEFAULT_PROFILE_PATCH_RELOAD: ProfilePatchReload;
/**
 * Initialize a profile directory: manifest, empty user patch layer, and the
 * pnpm settings out-of-tree plugins need. Existing files are never touched,
 * so re-running is a no-op on an initialized profile.
 * @param dir - the profile directory from {@link resolveProfileDir}.
 * @param bundles - the initial `dsh.profile.bundles` layer list.
 * @param patchReload - user patch-file lifecycle; custom profiles default to live reload.
 */
export declare function initProfile(dir: string, bundles: readonly string[], patchReload?: ProfilePatchReload): void;
/** Inputs for {@link healProfilesModuleFallback}. */
export interface ProfileModuleFallbackOptions {
    /** Absolute package.json path of the running dsh installation. */
    installAnchor: string;
    /** Loaded profile whose selected bundles may carry profile-local plugins. */
    profile?: Profile;
    /** Harness home; defaults to {@link resolveDshHome}. */
    home?: string;
}
/**
 * Maintain module fallbacks for one profile launch. The shared
 * `$DSH_HOME/profiles/node_modules` mirrors the dsh installation dependency
 * closure. Plain Node writes symlinks; a packaged executable writes ESM
 * proxies under a cross-process lock because operating-system links cannot
 * enter pkg's virtual filesystem. Missing packages carried only by selected
 * bundles are linked through a profile-owned directory into that profile's
 * `node_modules`; pnpm-managed entries remain authoritative, and another
 * profile's links cannot change its resolution.
 * @param options - installation anchor, optional loaded profile, and Harness home.
 * @returns settlement after the shared fallback and profile-local links are current.
 */
export declare function healProfilesModuleFallback(options: ProfileModuleFallbackOptions): Promise<void>;
/**
 * Read a profile's manifest.
 * @param binName - the diagnostic prefix on the thrown error.
 * @param dir - the profile directory.
 * @returns the parsed manifest.
 */
export declare function readProfileManifest(binName: string, dir: string): ProfileManifest;
/**
 * Write a profile's manifest back (2-space JSON, trailing newline).
 * @param dir - the profile directory.
 * @param manifest - the manifest value to persist.
 */
export declare function writeProfileManifest(dir: string, manifest: ProfileManifest): void;
/**
 * Resolve one bundle package's directory: installation anchor first, then the
 * profile directory. The installation-first order is the contract that
 * `@deepseek-ai/dsh-base` (and every other in-box bundle) always comes from
 * the same installation as the running dsh, never from a profile-local copy.
 * Resolution does not require the package to export `./package.json`.
 * @param binName - the diagnostic prefix on the thrown error.
 * @param packageName - the bundle's package name from `dsh.profile.bundles`.
 * @param installAnchor - absolute path of a file inside the dsh app package (its package.json).
 * @param profileDir - the profile directory (second anchor).
 * @returns the bundle package's absolute directory.
 */
export declare function resolveBundleDir(binName: string, packageName: string, installAnchor: string, profileDir: string): string;
/**
 * Load an already initialized profile directory without resolving it through
 * the shared Harness home. This is used by application-owned profiles whose
 * package project and lifecycle belong to that application.
 * @param binName - the diagnostic prefix on thrown errors.
 * @param dir - absolute profile package directory.
 * @param installAnchor - absolute path of the owning dsh app's package.json.
 * @param options - `userLayer: false` skips reading `cordis.patch.yml`.
 * @returns the resolved bundle layers and optional user patch layer.
 */
export declare function loadProfileDirectory(binName: string, dir: string, installAnchor: string, options?: {
    userLayer?: boolean;
}): Profile;
/**
 * Load a profile: resolve every `dsh.profile.bundles` entry to its patch
 * layer and parse the profile's own patch file. A listed bundle without a
 * `dsh.bundle` manifest fails loud — naming a bundle-less package as a layer
 * is a misconfiguration, not "no patches".
 * @param binName - the diagnostic prefix on thrown errors.
 * @param name - the profile name.
 * @param installAnchor - absolute path of the dsh app's package.json (first resolution anchor).
 * @param home - the Harness home; defaults to {@link resolveDshHome}.
 * @param options - `userLayer: false` skips reading `cordis.patch.yml`, so a
 * bundles-only consumer (`--dump-default-config`, a recovery diagnostic)
 * cannot fail on a broken user layer.
 * @returns the loaded profile (empty `patches` when the user layer is skipped).
 */
export declare function loadProfile(binName: string, name: string, installAnchor: string, home?: string, options?: {
    userLayer?: boolean;
}): Profile;
/**
 * Compose patch layers into the effective entry list over an empty root —
 * the same single `applyEntryPatches` call the boot include makes, so flag
 * derivation and config dumps see exactly what mounts.
 * @param layers - patch lists in application order.
 * @param warn - sink for skipped-patch diagnostics; defaults to silent (boot repeats them).
 * @returns the composed entry list.
 */
export declare function composeEntries(layers: readonly PatchOptions[][], warn?: (message: string) => void): EntryOptions[];
//# sourceMappingURL=profile.d.ts.map