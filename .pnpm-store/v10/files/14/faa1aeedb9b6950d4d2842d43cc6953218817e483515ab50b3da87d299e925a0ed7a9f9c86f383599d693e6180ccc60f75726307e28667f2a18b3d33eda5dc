/**
 * Typert Loader integration: automatic registration for mounted plugin packages.
 *
 * When a loader entry mounts, this plugin resolves the entry's package.json; a
 * package exporting `./typert` has its host face imported and its
 * `TYPERT` manifest registered into `ctx.typert`, and the registration is
 * withdrawn when the entry unmounts. Explicit `packages` cover plugins nested
 * behind another Loader entry, whose Cordis fibers carry no resolvable package
 * specifier. Packages without the export are skipped silently when discovered
 * from Loader entries; an explicit package or declared artifact that is broken
 * fails loud — aggregated into this plugin's activation throw for existing
 * entries, contained to a logged error per package in steady state.
 *
 * Scanning is incremental per entry name. Every cordis `internal/plugin`
 * emission marks the fiber's entry name dirty, and a microtask flush
 * reconciles each dirty name against the live
 * loader entries; the activation pass seeds the same dirty set with all
 * current entries. Package verdicts and imported manifests are cached per
 * package name and never expire — plugin-set changes take effect on restart.
 *
 * Manual `ctx.typert.register()` remains available for contributions
 * that do not use a `./typert` artifact (hand-written wire schemas,
 * tests, non-loader compositions).
 *
 * @module @deepseek-ai/dsh-typert-loader
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { TypertContribution } from '@deepseek-ai/dsh-typert-registry/types';
/** The package.json exports key naming a package's host-face typert artifact. */
export declare const TYPERT_HOST_EXPORT = "./typert";
/** Cordis plugin name. */
export declare const name = "typert-loader";
/** Services required before registration: the registry this plugin feeds and the Loader it observes. */
export declare const inject: string[];
/** Additional package artifacts whose owning plugins are nested behind another Loader entry. */
export interface Config {
    /** Exact npm package names that must resolve and export `./typert`. */
    packages?: string[];
}
/** Validate explicit package names and default to Loader-entry discovery only. */
export declare const Config: z<Config>;
/**
 * Narrow a dynamically imported typert module's `TYPERT` export to a
 * contribution owned by `pkgName`. This is the module/file boundary: the
 * manifest crosses from a build artifact into the typed registry, so every
 * field is checked and every failure names the package and the defect.
 * @param pkgName - the package whose typert face was imported.
 * @param exported - the module's `TYPERT` export.
 * @returns the validated contribution.
 */
export declare function validateTypertManifest(pkgName: string, exported: unknown): TypertContribution;
/**
 * Scan current Loader entries during activation, then follow entry mounts and
 * unmounts for this plugin's lifetime.
 * @param ctx - plugin context carrying `typert` and `loader`.
 * @param config - explicit package artifacts in addition to Loader entries.
 */
export declare function apply(ctx: Context, config: Config): Promise<void>;
//# sourceMappingURL=index.d.ts.map