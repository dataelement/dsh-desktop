/** Reconnecting lifecycle for one single-consumer Remote stream. */
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client';
import { RemoteStreamCarrierError } from './stream-client.ts';
/** One item annotated with the physical Remote-stream generation that delivered it. */
export interface RemoteStreamItem<Item> {
    /** Monotone physical generation number within this logical stream. */
    readonly generation: number;
    /** Decoded item yielded by the generated Remote method. */
    readonly value: Item;
    /** Cancellation lifetime of the generation that delivered this item. */
    readonly signal: AbortSignal;
    /** Mark this generation's opening baseline or cursor as accepted. */
    accept(): void;
}
/** Domain-owned operations used by {@link RemoteStream}. */
export interface RemoteStreamOptions<Item> {
    /** Diagnostic owner name used for cancellation failures. */
    readonly name: string;
    /** Open one physical generation of the logical stream. */
    readonly open: (signal: AbortSignal) => AsyncIterable<Item>;
    /** Classify a normal generation end after or before its opening item was accepted. */
    readonly ended: (accepted: boolean) => Error;
    /** Observe a retryable carrier loss before the supervisor waits or reopens. */
    readonly carrierFailed?: (error: RemoteStreamCarrierError) => void;
}
/**
 * Reopens one logical Remote stream across carrier generations.
 *
 * Connection owns physical retry timing; Gateway performs each requested
 * replacement. The domain consumer owns its opening item and every later
 * item, and calls {@link RemoteStreamItem.accept} only after validating the
 * opening baseline or cursor.
 */
export declare class RemoteStream<Item> implements AsyncIterable<RemoteStreamItem<Item>> {
    private readonly connection;
    private readonly options;
    private readonly lifetime;
    private generationAbort;
    private iterator;
    private closing;
    private revision;
    private taken;
    /**
     * @param connection - observable Host generation source used to pace retries.
     * @param options - domain stream opener, end classification, and diagnostics.
     */
    constructor(connection: Pick<ConnectionHandle, 'generation'>, options: RemoteStreamOptions<Item>);
    /** Cancellation lifetime shared by the stream and sibling page requests. */
    get signal(): AbortSignal;
    /** Interrupt the current generation and immediately request a replacement. */
    restart(): void;
    /**
     * Permanently stop this stream and wait for its iterator to close.
     * @returns when the active generation and consumer iterator are quiescent.
     */
    dispose(): Promise<void>;
    /** @inheritdoc */
    [Symbol.asyncIterator](): AsyncIterator<RemoteStreamItem<Item>>;
    private read;
}
//# sourceMappingURL=remote-stream.d.ts.map