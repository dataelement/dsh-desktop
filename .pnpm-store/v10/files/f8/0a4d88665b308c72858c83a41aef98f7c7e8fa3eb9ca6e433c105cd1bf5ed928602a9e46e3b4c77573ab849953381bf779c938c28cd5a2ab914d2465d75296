/** Reconnecting lifecycle for one single-consumer Remote stream. */
import { RemoteError, remoteErrorOf } from '@deepseek-ai/dsh-typert-protocol';
import { RemoteStreamCarrierError } from "./stream-client.js";
/**
 * Reopens one logical Remote stream across carrier generations.
 *
 * Connection owns physical retry timing; Gateway performs each requested
 * replacement. The domain consumer owns its opening item and every later
 * item, and calls {@link RemoteStreamItem.accept} only after validating the
 * opening baseline or cursor.
 */
export class RemoteStream {
    connection;
    options;
    lifetime = new AbortController();
    generationAbort;
    iterator;
    closing;
    revision = 0;
    taken = false;
    /**
     * @param connection - observable Host generation source used to pace retries.
     * @param options - domain stream opener, end classification, and diagnostics.
     */
    constructor(connection, options) {
        this.connection = connection;
        this.options = options;
    }
    /** Cancellation lifetime shared by the stream and sibling page requests. */
    get signal() {
        return this.lifetime.signal;
    }
    /** Interrupt the current generation and immediately request a replacement. */
    restart() {
        if (this.lifetime.signal.aborted)
            return;
        this.revision++;
        this.generationAbort?.abort(new Error(`${this.options.name} generation restarted`));
    }
    /**
     * Permanently stop this stream and wait for its iterator to close.
     * @returns when the active generation and consumer iterator are quiescent.
     */
    dispose() {
        if (this.closing !== undefined)
            return this.closing;
        if (!this.lifetime.signal.aborted) {
            const reason = new Error(`${this.options.name} disposed`);
            this.lifetime.abort(reason);
            this.generationAbort?.abort(reason);
        }
        const iterator = this.iterator;
        if (iterator === undefined)
            return Promise.resolve();
        const closing = closeRemoteStreamIterator(iterator);
        this.closing = closing;
        return closing;
    }
    /** @inheritdoc */
    [Symbol.asyncIterator]() {
        if (this.taken)
            throw new Error(`${this.options.name} already has a consumer`);
        this.taken = true;
        const iterator = this.read();
        this.iterator = iterator;
        return iterator;
    }
    async *read() {
        let attempt = 0;
        let generation = 0;
        let observedRevision = this.revision;
        try {
            while (!isAborted(this.lifetime.signal)) {
                if (observedRevision !== this.revision) {
                    observedRevision = this.revision;
                    attempt = 0;
                }
                const revision = this.revision;
                const generationAbort = new AbortController();
                this.generationAbort = generationAbort;
                const signal = AbortSignal.any([this.lifetime.signal, generationAbort.signal]);
                const generationId = ++generation;
                let accepted = false;
                try {
                    for await (const value of this.options.open(signal)) {
                        if (isAborted(this.lifetime.signal))
                            return;
                        if (revision !== this.revision)
                            break;
                        yield {
                            generation: generationId,
                            value,
                            signal,
                            accept: () => {
                                if (this.generationAbort !== generationAbort || revision !== this.revision)
                                    return;
                                accepted = true;
                                attempt = 0;
                            },
                        };
                    }
                    if (isAborted(this.lifetime.signal))
                        return;
                    if (revision !== this.revision)
                        continue;
                    throw this.options.ended(accepted);
                }
                catch (error) {
                    if (isAborted(this.lifetime.signal))
                        return;
                    if (revision !== this.revision)
                        continue;
                    if (!(error instanceof RemoteStreamCarrierError))
                        throw terminalStreamFailure(error);
                    this.options.carrierFailed?.(error);
                    if (revision !== this.revision)
                        continue;
                    attempt++;
                    try {
                        await waitForRemoteStreamRetry(this.connection, error, attempt, signal);
                    }
                    catch (retryError) {
                        if (isAborted(this.lifetime.signal))
                            return;
                        if (revision !== this.revision)
                            continue;
                        throw terminalStreamFailure(retryError);
                    }
                }
                finally {
                    this.generationAbort = undefined;
                    if (!generationAbort.signal.aborted) {
                        generationAbort.abort(new Error(`${this.options.name} generation ended`));
                    }
                }
            }
        }
        finally {
            if (!this.lifetime.signal.aborted) {
                this.lifetime.abort(new Error(`${this.options.name} consumer closed`));
            }
            this.generationAbort?.abort(this.lifetime.signal.reason);
            this.generationAbort = undefined;
        }
    }
}
async function waitForRemoteStreamRetry(connection, error, attempt, signal) {
    signal.throwIfAborted();
    if (connection.generation.getSnapshot() !== undefined) {
        if (attempt === 1)
            return;
        throw error;
    }
    await new Promise((resolve, reject) => {
        const subscription = { finished: false };
        const finish = (failure) => {
            if (subscription.finished)
                return;
            subscription.finished = true;
            subscription.dispose?.();
            signal.removeEventListener('abort', aborted);
            if (failure === undefined)
                resolve();
            else
                reject(failure);
        };
        const inspect = () => {
            if (connection.generation.getSnapshot() !== undefined)
                finish();
        };
        const aborted = () => {
            finish(new Error('Remote stream retry aborted', { cause: signal.reason }));
        };
        const dispose = connection.generation.subscribe(inspect);
        subscription.dispose = dispose;
        if (subscription.finished)
            dispose();
        signal.addEventListener('abort', aborted, { once: true });
        if (signal.aborted)
            aborted();
        else
            inspect();
    });
}
/**
 * Mark a terminal escape before it crosses the stream boundary: consumers
 * discriminate failures by code, so an unmarked throw reads as a local bug.
 * Marked failures pass through verbatim. The carrier class never escapes as a
 * terminal outcome — it stays the retry-internal signal fed to `carrierFailed`
 * and the `ended(true)` retry trigger.
 */
function terminalStreamFailure(error) {
    return remoteErrorOf(error) ?? new RemoteError('gateway/internal', error instanceof Error ? error.message : String(error), {}, { cause: error });
}
function isAborted(signal) {
    return signal.aborted;
}
async function closeRemoteStreamIterator(iterator) {
    try {
        await iterator.return?.();
    }
    catch {
        // The disposed logical stream has no remaining consumer for cancellation failures.
    }
}
//# sourceMappingURL=remote-stream.js.map