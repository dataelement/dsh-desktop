/**
 * Domain data form (`ctx.storage.domain`): schema-validated, change-emitting
 * KV domains over storage backends. The single implementation of the domain
 * layer — consumers depend on this package and never touch backends directly.
 * Plugin `Config` is schemastery; record schemas inside domain specs are zod
 * (see `src/spec.ts` for the split rationale).
 * @module @deepseek-ai/dsh-storage-domain
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { DomainSpec } from './spec.ts';
import { DomainImpl } from './domain.ts';
import type { Domain } from './domain.ts';
export { DomainError } from './error.ts';
export type { DomainErrorCode, DomainErrorOptions, InvalidRecordDetail } from './error.ts';
export { defineDomain, domainTable, descriptorOf } from './spec.ts';
export type { DomainSpec, DomainGlobalSpec, DomainTableSpec, TableKeyOf, TableValueOf, GlobalValueOf, } from './spec.ts';
export type { DomainChanged } from './events.ts';
export type { Domain, DomainGlobal, DomainGlobalHandleOf, KvTable } from './domain.ts';
declare module '@deepseek-ai/dsh-storage' {
    interface StorageForms {
        domain: DomainFacility;
    }
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        storageDomain: DomainFacility;
    }
}
/** Cordis plugin name. */
export declare const name = "storage-domain";
/** The storage hub must be present before the form can mount. */
export declare const inject: string[];
/**
 * Plugin config. Which backend serves which domain is decided here, not
 * globally on the hub: `backend` is the default route and `routes` overrides
 * it per domain name. A route naming an unregistered backend fails loud at
 * `open` with `backend-not-found`.
 */
export interface Config {
    /** Default backend name for every domain without an explicit route. Required: there is no universally correct medium. */
    backend: string;
    /** Per-domain overrides: domain name → backend name. */
    routes?: Record<string, string>;
}
export declare const Config: z<Config>;
/**
 * The mounted domain facility. Opens declared domains over routed backends;
 * one facility instance owns the open-domain table and enforces single-open
 * per domain name.
 */
export declare class DomainFacility {
    private readonly ctx;
    private readonly config;
    private readonly domains;
    /** Names reserved by an in-flight or completed open, so concurrent opens of one name fail loud. */
    private readonly reserved;
    /**
     * @param ctx - Context of the domain plugin; open-domain effects and change
     * events attach here.
     * @param config - Validated plugin config.
     */
    constructor(ctx: Context, config: Config);
    /**
     * Open one declared domain. Steps, each failing the whole call: reject a
     * name that is already open (`already-open`); resolve the backend route
     * (`backend-not-found` passes through from the hub); require its `kv` facet
     * (`facet-unsupported`); open the unit projected from the spec (backend
     * `version-mismatch`/`malformed-medium` pass through); load and validate
     * every stored record against the spec's zod schemas (`invalid-record`
     * with the offending table and key — unless the spec declares
     * `invalidRecords: 'backup-and-skip'` and the unit can move documents aside, in
     * which case the failing record is backed up, logged, and skipped);
     * construct the domain.
     *
     * Lifecycle: the CALLER owns the returned handle and closes it via
     * `Domain.close()` (typically as its own `ctx.effect` disposer) — the
     * facility does not tie the domain to any consumer fiber. Domains still
     * open when the facility unmounts are closed by the plugin disposer.
     * @param spec - The domain declaration, typically from `defineDomain`.
     * @returns the opened domain handle, typed by the spec.
     */
    open<S extends DomainSpec>(spec: S): Promise<Domain<S>>;
    /**
     * Look up an open domain by name, untyped. Diagnostic surface (the package
     * invariant cross-checks change events against live domain state); typed
     * consumers hold the handle returned by {@link open}.
     * @param name - Domain name.
     * @returns the open domain runtime, or `undefined` when not open.
     */
    get(name: string): DomainImpl | undefined;
    /**
     * Close every domain still open on this facility. The unmount path for
     * consumers that never called `Domain.close()` themselves; closing is
     * idempotent, so double-closing an already-closed domain is harmless.
     * @returns resolution after every unit is released.
     */
    closeAll(): Promise<void>;
}
/**
 * Mount the domain data form on the storage hub.
 * @param ctx - Plugin context.
 * @param config - Validated plugin config.
 * @returns resolution after an already-available backend set activates the form.
 */
export declare function apply(ctx: Context, config: Config): Promise<void>;
//# sourceMappingURL=index.d.ts.map