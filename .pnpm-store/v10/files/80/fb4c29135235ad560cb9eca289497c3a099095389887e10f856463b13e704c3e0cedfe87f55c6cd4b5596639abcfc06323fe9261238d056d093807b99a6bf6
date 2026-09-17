import type { BootManifest, ClientModuleLoader, ClientModuleRecord, ClientModuleSystemOptions } from './manifest.ts';
/**
 * The client module system: state tables plus the arrival/materialization
 * machinery implementing {@link ClientModuleLoader} (whose members carry the
 * contract documentation). Construction indexes the boot rows, retains the
 * already-materialized bootstrap module, and switches the HTML-installed
 * loader facade from its pending queue to live registration.
 */
export declare class ClientModuleSystem implements ClientModuleLoader {
    readonly version = "client";
    readonly manifest: BootManifest;
    readonly loadCache: Map<string, ClientModuleRecord>;
    private readonly seed;
    private readonly factories;
    private readonly bootstrapIds;
    /** In-flight script transport per URL; every row in one batch shares it. */
    private readonly pendingArrival;
    /** Single-resource combo URL selected by HMR after invalidating one row. */
    private readonly reloadUrls;
    /** Materialization re-entrancy guard: factory-form CJS cannot deliver partial exports, so a cycle is fatal. */
    private readonly materializing;
    private readonly graphRows;
    private readonly loadBundle;
    /**
     * Build the module system over the parsed boot rows.
     * @param options - Parsed graph, platform seed, bootstrap module, registration facade, and transport.
     */
    constructor(options: ClientModuleSystemOptions);
    /** Register one bundle factory, rejecting a script that executes twice without invalidation. */
    private register;
    /** Load one graph row so its factory is registered (idempotent per in-flight arrival). */
    private arrive;
    /** Register each injected package and unresolved dynamic request before its consumer. */
    private arriveGraphRow;
    /** Materialize a registered factory (synchronous; memoized in loadCache). */
    private materialize;
    /**
     * The synchronous require answered to factories: seed → memoized record →
     * registered factory. Fetching is async and therefore unreachable
     * from here; an external dynamic package must have arrived before its
     * consumer materializes.
     */
    private makeRequire;
    import(specifier: string): Promise<unknown>;
    prefetch(id: string): Promise<void>;
    invalidate(id: string, rev?: string): void;
}
//# sourceMappingURL=system.d.ts.map