/**
 * Storage hub (`ctx.storage`): a named backend registry plus mounted
 * data-form facilities. The hub itself performs no IO — backends own media,
 * data forms (the domain layer first) own semantics.
 * @module @deepseek-ai/dsh-storage
 */
import { Context, Service } from '@deepseek-ai/cordis';
import { BackendRegistry } from './registry.ts';
export { BackendRegistry } from './registry.ts';
export { StorageError } from './error.ts';
export type { StorageErrorCode } from './error.ts';
export { UNIT_NAME_RE } from './backend.ts';
export type { StorageBackend, KvFacet, KvUnit, KvUnitDescriptor } from './backend.ts';
/**
 * Derive the Cordis lifecycle service that one named backend plugin provides.
 * Domain-form providers inject these keys so activation cannot race backend
 * registration even though callers continue resolving backends through the
 * storage registry.
 * @param name - Backend registry name.
 * @returns the corresponding lifecycle-only service key.
 */
export declare function storageBackendServiceKey(name: string): string;
declare module '@deepseek-ai/cordis' {
    interface Context {
        storage: Storage;
    }
}
/**
 * Data forms mountable on the hub, keyed by form name. Form owners extend
 * this map via declaration merging (the domain layer merges
 * `domain: DomainFacility`) and mount the facility in their `apply`.
 */
export interface StorageForms {
}
/**
 * The storage hub service. Backends register under `backend`; data forms
 * mount under their `StorageForms` key and are reached as `ctx.storage.<form>`.
 */
export declare class Storage extends Service {
    /** Named backend table; multiple backends stay mounted side by side. */
    readonly backend: BackendRegistry;
    private readonly forms;
    constructor(ctx: Context);
    /**
     * Mount a data-form facility on the hub. Mounting is an effect: the
     * returned disposer unmounts the form.
     * @param form - Form key declared in {@link StorageForms}.
     * @param facility - The facility instance to expose.
     * @returns the disposer that unmounts the form.
     */
    mount<K extends keyof StorageForms>(form: K, facility: StorageForms[K]): () => void;
    /**
     * Resolve a mounted data form.
     * @param form - Form key declared in {@link StorageForms}.
     * @returns the mounted facility.
     */
    form<K extends keyof StorageForms>(form: K): StorageForms[K];
    /** Domain data form; present once the domain layer plugin is loaded. */
    get domain(): StorageForms extends {
        domain: infer D;
    } ? D : never;
}
export default Storage;
//# sourceMappingURL=index.d.ts.map