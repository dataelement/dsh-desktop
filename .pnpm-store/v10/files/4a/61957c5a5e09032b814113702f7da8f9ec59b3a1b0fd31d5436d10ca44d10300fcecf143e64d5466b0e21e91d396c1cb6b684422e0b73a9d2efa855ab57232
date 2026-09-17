/**
 * Client module system: the browser peer of Node's internal ESM loader, built
 * as a lazy CJS table. The vendored cordis Loader consumes this object
 * through its `internal` contract (the only call site is `EntryTree.import` →
 * `internal.import`), which keeps entry governance (fiber lifecycle, inject
 * waiting, update/refresh) entirely on the vendored side while this package
 * owns code arrival.
 *
 * Lazy CJS model: executing a plugin bundle only REGISTERS its
 * factory (`window.__ModuleLoader__.load({id, factory})`); every module body
 * side effect — including CSS injection — lives inside the factory closure
 * and runs at materialization, not at script execution. Materialization
 * (factory(require) → exports) happens on first import/require and is
 * memoized in {@link ClientModuleLoader.loadCache}; a factory that requires
 * another registered-but-unmaterialized module materializes it recursively,
 * so load order needs no external sequencing.
 *
 * Resolution branch order (import): seed word → shell instance; memoized
 * record → exports; graph row → register its dependency factories and own
 * factory; registered factory → materialize; anything else → throw (loud —
 * the runtime mirror of the build-time bundle purity gate).
 * The synchronous `require` handed to factories walks the same order minus
 * the load branch. Loading is async, so a requested dynamic package must have
 * registered its factory before a consumer materializes.
 *
 * This file is the browser-safe contract face (zero node imports): the
 * `__DSH_BOOT__` wire types, the boot-manifest parser, and the boundaries around
 * {@link ClientModuleSystem}. The package root is the host-side service that
 * composes the wire.
 */
import type { ClientModuleSystem } from './system.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** The client module system the web shell builds at boot (provided by the `./client` wrapper plugin). */
        modules: ClientModuleLoader;
    }
}
/**
 * One composed client entry pushed by the host (a graph row). Wire
 * single source: the host node half (package root) produces this same shape.
 * `immediately` marks stage-one prefetch. `inject` names package rows whose
 * factories must arrive before this row materializes, while Cordis separately
 * uses the same package edges to compose entries. `external` carries exact
 * non-inject module requests (see {@link WebBootGraph.entries}).
 */
export interface WebBootEntry {
    /** Entry name == package name. */
    id: string;
    /** Revisioned single-resource combo endpoint used by HMR. */
    url: string;
    /** Opaque plugin-artifact revision used for HMR cache busting. */
    rev: string;
    /** Package-name dependency edges used for factory arrival and plugin composition. */
    inject?: string[];
    /** Stage-one prefetch mark: load the script for factory registration during module-face boot. */
    immediately?: boolean;
    /** Non-baseline module specifiers this row requests; omitted when it requests none. */
    external?: string[];
}
/** Initial scheduling phase for one content-addressed combo script. */
export type WebBootBatchPhase = 'bootstrap' | 'application';
/** One initial combo script; a scheduling phase may span several descriptors. */
export interface WebBootBatch {
    /** Parser-blocking bootstrap or preloaded application scheduling. */
    phase: WebBootBatchPhase;
    /** Content-addressed combo script endpoint. */
    url: string;
    /** Revision over the combined plugin script bytes and indexed source map. */
    rev: string;
    /** Graph entry ids whose factories the script registers, in execution order. */
    entries: string[];
}
/** The composed client entry graph the host injects as `window.__DSH_BOOT__`. */
export interface WebBootGraph {
    /** Consistency anchor over the whole graph (content + bundle hashes). */
    rev: string;
    /**
     * Composed entries in module-graph order — a dynamic package row precedes
     * rows whose `external` requests that package. Cordis activation order is
     * unrelated and remains owned by fiber service waiting.
     */
    entries: WebBootEntry[];
    /** Initial combo descriptors; every entry belongs to exactly one descriptor. */
    batches: WebBootBatch[];
}
/** The npm-package view of one boot row: what the module table needs to fetch the bundle. */
export interface BootModuleRow {
    /** Entry name == package name (module-table key). */
    id: string;
    /** Revisioned single-resource combo endpoint used after HMR invalidation. */
    url: string;
    /** Content-addressed combo endpoint used before the first HMR invalidation. */
    initialUrl: string;
    /** Opaque plugin-artifact revision used after HMR invalidation. */
    rev: string;
    /** Injected package rows whose factories arrive before this row materializes. */
    inject: string[];
    /** Module specifiers this row requests from the module table ([] when the wire omits them). */
    external: string[];
}
/** The cordis-plugin view of one boot row: what entry composition needs (optional wire fields normalized). */
export interface BootPluginRow {
    /** Entry name == package name. */
    id: string;
    /** Package-name dependency edges ([] when the wire omits them). */
    inject: string[];
    /** Stage-one prefetch tier (false when the wire omits it). */
    immediately: boolean;
}
/** The parsed boot manifest: one wire, two consumer views. */
export interface BootManifest {
    /** Consistency anchor over the whole graph. */
    rev: string;
    /** Rows as the module table consumes them. */
    modules: BootModuleRow[];
    /** Rows as entry composition consumes them. */
    plugins: BootPluginRow[];
}
/**
 * Validate an optional string-array field read from a `dsh.client` declaration
 * or from the boot wire.
 * @param subject - diagnostic prefix naming the package or the wire row.
 * @param field - field name as it appears in the diagnostic.
 * @param value - the raw field value.
 * @returns the validated array, or undefined when the field is absent.
 * @throws {Error} when the value is present but is not an array of strings.
 */
export declare function optionalStringArray(subject: string, field: string, value: unknown): string[] | undefined;
/**
 * Normalize a module specifier onto the graph row that owns it: a plugin bundle
 * IS its package's client half, so `<id>/client` (the exports subpath external
 * bundles emit) and the bare package name resolve to the same exports. Both the
 * require path and graph composition normalize here, which is what lets each
 * importing package request the subpath its own code imports.
 * @param spec - module specifier as a bundle requires it or a declaration spells it.
 * @returns the specifier with a trailing `/client` removed.
 */
export declare function stripClientSuffix(spec: string): string;
/**
 * Parse `window.__DSH_BOOT__` into the two consumer views. Wire boundary:
 * a missing or malformed graph throws (the shell shows the loud failure —
 * a page without a valid manifest cannot boot anything).
 * @param wire - the raw `window.__DSH_BOOT__` value.
 * @returns the manifest with optional plugin-view fields normalized.
 */
export declare function parseBootManifest(wire: unknown): BootManifest;
/** One client bundle's factory registration submitted through `window.__ModuleLoader__.load`. */
export interface ClientBundleRegistration {
    /** Plugin id (package name) — the registration key; must match the graph row being executed. */
    id: string;
    /**
     * Closure factory holding the whole bundle body: receives the synchronous
     * require bound to the module table and returns the bundle's exports. Runs
     * once, at materialization.
     */
    factory: (require: (spec: string) => unknown) => Record<string, unknown>;
}
/** Inputs passed by the web entry when it creates the client module system. */
export interface ClientModuleCreateOptions {
    /** Raw Host-injected boot graph; the modules bundle owns validation and projection. */
    boot: unknown;
    /** Module-table seed: platform-singleton specifier → shell instance. */
    staticModules: Record<string, unknown>;
    /** Bundle-load hook. Defaults to a same-origin classic `<script src>` element. */
    loadBundle?: (url: string) => Promise<void>;
}
/** The modules bundle after its factory has been materialized by the HTML bootstrap facade. */
export interface ClientBootstrapModule {
    /** Graph/module id carried by the modules bundle registration. */
    id: string;
    /** Materialized exports reused when Cordis later activates the modules entry. */
    exports: Record<string, unknown>;
}
/** Stable page-global facade: queues early bundle registrations, then registers them live. */
export interface ClientModuleLoaderTarget {
    /** Queue before {@link create}; live registration after it returns. */
    mode: 'queue' | 'live';
    /** Registrations submitted by parser-preloaded scripts before the module system exists. */
    pendingQueue: ClientBundleRegistration[];
    /** Queue or immediately register one bundle factory according to {@link mode}. */
    load(registration: ClientBundleRegistration): void;
    /** Create the module system exactly once from the parser-preloaded modules bundle. */
    create(options: ClientModuleCreateOptions): ClientModuleSystem;
}
/** Window API of the web boot protocol: the host-injected graph and registration facade. */
export interface DshWindow {
    /** Host-composed entry graph, injected before the shell bundle runs; wire-boundary raw until {@link parseBootManifest}. */
    __DSH_BOOT__?: unknown;
    /** HTML-installed facade: a pending registration queue, then the live module-system target. */
    __ModuleLoader__?: ClientModuleLoaderTarget;
}
/** Per-module bookkeeping in {@link ClientModuleLoader.loadCache} (flat module-graph boundary). */
export interface ClientModuleRecord {
    /** Module id (entry name / package name). */
    id: string;
    /** Materialized exports (`module.exports` from a factory or bootstrap registration). */
    exports: unknown;
    /** Owned `<style data-plugin>` tag ids (`data-plugin-css` values) injected during materialization. */
    styles: string[];
    /** Observed `require()` edges (module-graph boundary; only table words can appear). */
    edges: Set<string>;
}
/**
 * The internal-contract subset the vendored Loader and the client HMR plugin
 * consume. Mounted on `ctx.loader.internal` by the shell boot and provided
 * as `ctx.modules`.
 */
export interface ClientModuleLoader {
    /** Discriminant against Node's internal loader shapes ('v1'/'v2'). */
    version: 'client';
    /** Parsed Host boot graph shared with the web entry after module-system creation. */
    manifest: BootManifest;
    /** Materialized-module registry: id → record. The governance-side read API for entry exports. */
    loadCache: Map<string, ClientModuleRecord>;
    /**
     * Internal contract consumed by the vendored Loader's `tree.import`. Resolves
     * `specifier` through the branch order documented on the module, fetching
     * and executing a bundle when needed.
     * @param specifier - module specifier (entry name or table word).
     * @param parentURL - importer URL (unused — the client module graph is flat).
     * @param attrs - Import attributes (unused; interface parity with Node's loader contract).
     * @returns the module's exports.
     */
    import(specifier: string, parentURL: string, attrs: Record<string, unknown>): Promise<unknown>;
    /**
     * Stage-one arrival: load the entry's declared dynamic requests, then its
     * own script, to register their factories (no materialization — module side
     * effects wait for import).
     * No-op for materialized bootstrap ids. A registered graph row still
     * registers any unresolved declared requests before skipping its own script;
     * concurrent arrivals share one in-flight task. To force a fresh load (HMR),
     * {@link invalidate} first.
     * @param id - graph entry name.
     */
    prefetch(id: string): Promise<void>;
    /**
     * Full reset of one non-bootstrap module: drop its registered factory and
     * materialized record so the next prefetch/import loads its one-resource
     * combo script rather than the initial multi-resource request. The bootstrap
     * module remains materialized.
     * @param id - entry name to invalidate.
     * @param rev - New content revision from the HMR frame; omitted to reuse
     * the graph revision or for page-local modules that register directly.
     */
    invalidate(id: string, rev?: string): void;
}
/** Internal construction inputs assembled by the modules bundle's bootstrap export. */
export interface ClientModuleSystemOptions {
    /** Parsed boot graph owned by the resulting module system. */
    manifest: BootManifest;
    /** Module-table seed: platform-singleton specifier → shell instance. */
    staticModules: Record<string, unknown>;
    /** Stable HTML-installed registration facade to switch from queue to live mode. */
    registrationTarget: ClientModuleLoaderTarget;
    /** Already-materialized modules bundle consumed while creating the system. */
    bootstrapModule: ClientBootstrapModule;
    /** Bundle-load hook. Defaults to a same-origin classic `<script src>` element. */
    loadBundle?: (url: string) => Promise<void>;
}
//# sourceMappingURL=manifest.d.ts.map