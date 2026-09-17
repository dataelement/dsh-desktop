/**
 * Named backend registry of the storage hub.
 * @module @deepseek-ai/dsh-storage/src/registry
 */
import type { StorageBackend } from './backend.ts';
/**
 * Mutable name → backend table. Multiple backends stay mounted side by side;
 * which backend serves which consumer is the consumer's configuration
 * (e.g. the domain layer's route table), never a hub-global choice.
 */
export declare class BackendRegistry {
    private readonly backends;
    /**
     * Register a named backend. Registration is an effect: the returned
     * disposer removes the name. Disposal does NOT close the backend — the
     * owning plugin closes it after unregistering.
     * @param name - Backend name, e.g. `json` or `sqlite`.
     * @param backend - The backend instance.
     * @returns the disposer that unregisters the name.
     */
    register(name: string, backend: StorageBackend): () => void;
    /**
     * Resolve a backend by name.
     * @param name - Registered backend name.
     * @returns the backend.
     */
    get(name: string): StorageBackend;
    /**
     * Registered backend names, for diagnostics.
     * @returns a snapshot array of names.
     */
    names(): string[];
}
//# sourceMappingURL=registry.d.ts.map