/**
 * Runtime registry for generated Typert reflection, Remote invocations, and
 * dependency-inverted lookup/Context providers. It performs no TypeScript
 * analysis or schema generation.
 * @module @deepseek-ai/dsh-typert-registry
 */
import { Context, Service } from '@deepseek-ai/cordis';
import { z } from 'zod';
import type { InvocationDescriptor, TypertContextRegistry, TypertDisposer, TypertLocalRegistry, TypertLookupRegistry, TypertRemoteRegistry, TypertRegistryContract } from '@deepseek-ai/dsh-typert-protocol';
import type { TypertContribution, TypertFace, TypertPackageFilter, TypertPackageRecord, TypertSchemaFilter, TypertSchemaRecord } from './types.ts';
/**
 * Compose the global key of one generated schema.
 * @param packageName - contributing npm package.
 * @param name - schema export name.
 * @returns `<package>#<name>`.
 */
export declare function typertKey(packageName: string, name: string): string;
/**
 * Compose the identity of one package-face model.
 * @param packageName - contributing npm package.
 * @param face - independently compiled face.
 * @returns `<package>#<face>`.
 */
export declare function typertPackageKey(packageName: string, face: TypertFace): string;
/**
 * Compose the endpoint key used by local and Remote invocation registries.
 * @param descriptor - invocation whose namespace and method form the endpoint.
 * @returns `<namespace>/<method>`.
 */
export declare function typertEndpoint(descriptor: Pick<InvocationDescriptor, 'namespace' | 'method'>): string;
/**
 * Registry of generated schemas, package reflection, invocations, and Remote
 * dependency providers.
 * @typert service typert
 */
export declare class TypertRegistry extends Service implements TypertRegistryContract {
    private readonly schemas;
    private readonly packages;
    private readonly localStore;
    private readonly remoteStore;
    private readonly lookupStore;
    private readonly contextStore;
    constructor(ctx: Context);
    /** Current-environment invocation definitions. */
    get local(): TypertLocalRegistry;
    /** Consumer-selected Remote definitions. */
    get remotes(): TypertRemoteRegistry;
    /** Host object lookup providers. */
    get lookups(): TypertLookupRegistry;
    /** Host and Client Context adapters. */
    get contexts(): TypertContextRegistry;
    /**
     * Register one generated contribution atomically for the calling fiber.
     * Duplicate package-face identities, schemas, invocation ids, or endpoints
     * reject the whole batch.
     * @param contribution - generated schemas, reflection, and Host invocations.
     * @returns the exact effect disposer that removes this contribution.
     */
    register(contribution: TypertContribution): TypertDisposer;
    /**
     * Look up one schema by `<package>#<name>`.
     * @param key - global schema key.
     * @returns the live schema record, or `undefined` when absent.
     */
    get(key: string): TypertSchemaRecord | undefined;
    /**
     * Resolve one required schema.
     * @param key - global schema key.
     * @returns the live schema record.
     * @throws when the key is malformed, the package face is absent, or the schema is not contributed.
     */
    resolve(key: string): TypertSchemaRecord;
    /**
     * Enumerate live schemas in registration order.
     * @param filter - optional package and face restriction.
     * @returns matching schema records.
     */
    list(filter?: TypertSchemaFilter): TypertSchemaRecord[];
    /**
     * Look up generated reflection for one package face.
     * @param packageName - exact npm package name.
     * @param face - face to query; defaults to the host runtime.
     * @returns the live package record, or `undefined` when absent.
     */
    getPackage(packageName: string, face?: TypertFace): TypertPackageRecord | undefined;
    /**
     * Enumerate generated package reflection in registration order.
     * @param filter - optional package and face restriction.
     * @returns matching package records.
     */
    listPackages(filter?: TypertPackageFilter): TypertPackageRecord[];
    /**
     * Project a live Zod schema to JSON Schema without caching the result.
     * @param key - global schema key.
     * @param params - Zod projection parameters.
     * @returns a fresh JSON Schema document.
     */
    toJSONSchema(key: string, params?: z.core.ToJSONSchemaParams): z.core.JSONSchema.BaseSchema;
    private validatePackage;
    private validateSchemas;
}
export default TypertRegistry;
//# sourceMappingURL=service.d.ts.map