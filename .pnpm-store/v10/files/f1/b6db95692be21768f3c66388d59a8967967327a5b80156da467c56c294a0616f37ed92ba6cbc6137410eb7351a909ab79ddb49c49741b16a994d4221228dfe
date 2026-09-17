import { operationSignal, raceWithAbortSignal } from "../utils/abort.js";
/**
 * Default in-memory credential store. Apps inject persistent stores.
 * Keyed by `Provider.id`, one credential per provider; see `CredentialStore`.
 * Writes are serialized per provider through a promise chain.
 */
export class InMemoryCredentialStore {
    credentials = new Map();
    chains = new Map();
    /** Serialize tasks per provider id without releasing the chain before active work settles. */
    enqueue(providerId, task, options) {
        const signal = operationSignal(options?.signal);
        const previous = this.chains.get(providerId) ?? Promise.resolve();
        const queued = (async () => {
            await previous.catch(() => { });
            signal.throwIfAborted();
            return task();
        })();
        const tail = queued.catch(() => { });
        this.chains.set(providerId, tail);
        void tail.then(() => {
            if (this.chains.get(providerId) === tail)
                this.chains.delete(providerId);
        });
        return raceWithAbortSignal(queued, signal);
    }
    async read(providerId, options) {
        options?.signal?.throwIfAborted();
        return this.credentials.get(providerId);
    }
    async list(options) {
        options?.signal?.throwIfAborted();
        return [...this.credentials].map(([providerId, credential]) => ({ providerId, type: credential.type }));
    }
    modify(providerId, fn, options) {
        return this.enqueue(providerId, async () => {
            const current = this.credentials.get(providerId);
            const next = await fn(current);
            options?.signal?.throwIfAborted();
            if (next !== undefined)
                this.credentials.set(providerId, next);
            return next ?? current;
        }, options);
    }
    delete(providerId, options) {
        return this.enqueue(providerId, async () => {
            this.credentials.delete(providerId);
        }, options);
    }
}
//# sourceMappingURL=credential-store.js.map