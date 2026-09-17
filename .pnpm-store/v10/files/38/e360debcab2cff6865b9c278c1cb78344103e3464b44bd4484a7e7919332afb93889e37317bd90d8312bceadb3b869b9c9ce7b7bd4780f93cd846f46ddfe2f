import type { AuthOperationOptions, Credential, CredentialInfo, CredentialStore } from "./types.ts";
/**
 * Default in-memory credential store. Apps inject persistent stores.
 * Keyed by `Provider.id`, one credential per provider; see `CredentialStore`.
 * Writes are serialized per provider through a promise chain.
 */
export declare class InMemoryCredentialStore implements CredentialStore {
    private credentials;
    private chains;
    /** Serialize tasks per provider id without releasing the chain before active work settles. */
    private enqueue;
    read(providerId: string, options?: AuthOperationOptions): Promise<Credential | undefined>;
    list(options?: AuthOperationOptions): Promise<readonly CredentialInfo[]>;
    modify(providerId: string, fn: (current: Credential | undefined) => Promise<Credential | undefined>, options?: AuthOperationOptions): Promise<Credential | undefined>;
    delete(providerId: string, options?: AuthOperationOptions): Promise<void>;
}
//# sourceMappingURL=credential-store.d.ts.map