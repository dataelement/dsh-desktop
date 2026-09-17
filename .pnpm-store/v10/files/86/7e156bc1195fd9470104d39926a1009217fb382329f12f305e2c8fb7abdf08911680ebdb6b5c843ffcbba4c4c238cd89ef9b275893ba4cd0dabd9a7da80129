/**
 * Client projection of generated Typert Remote descriptors. Contributions
 * install traced `remote.<namespace>` services; no JavaScript Proxy
 * participates in method lookup, invocation, or type exposure.
 */
export type { TypertGatewayFaultDetails } from '../remote-error-codes.ts';
import type { Context } from '@deepseek-ai/cordis';
import type { TypertClientRemote, RemoteFailure } from '@deepseek-ai/dsh-typert-protocol';
import { RemoteStream, type RemoteStreamOptions } from './remote-stream.ts';
export { RemoteStreamCarrierError } from './stream-client.ts';
export { RemoteJournalStream } from './journal-stream.ts';
export type { RemoteJournalChange, RemoteJournalFrame, RemoteJournalStreamOptions, RemoteStreamFactory, } from './journal-stream.ts';
export { RemoteStream } from './remote-stream.ts';
export type { RemoteStreamItem, RemoteStreamOptions } from './remote-stream.ts';
export { RemoteSnapshotStream } from './snapshot-stream.ts';
export type { RemoteSnapshotStreamOptions } from './snapshot-stream.ts';
/** Typed Remote service augmented by generated direct namespaces and Gateway stream supervision. */
export interface ClientRemote extends TypertClientRemote {
    /**
     * Create one independently cancellable, reconnecting logical stream.
     * @param options - domain-owned opener and generation-end classification.
     * @returns a single-consumer stream annotated with physical generation ids.
     */
    $stream<Item>(options: RemoteStreamOptions<Item>): RemoteStream<Item>;
    /**
     * Fixed Host facts as plain reads: no store, no subscription, no generation
     * counter. `home` stays undefined until the first ready frame and reflects
     * the latest one afterwards.
     */
    readonly $host: RemoteHostFacts;
}
/** The fixed Host facts exposed on `ctx.remote.$host`. */
export interface RemoteHostFacts {
    /** Host home directory from the ready frame, undefined before it. */
    readonly home: string | undefined;
    /** Whether the carrier connects to the local Host. */
    readonly isLoopback: boolean;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Generated Remote namespaces selected by the Client assembly. */
        remote: ClientRemote;
    }
}
/** Required Client services: the Typert registry and the existing Connection carrier. */
export declare const inject: string[];
/**
 * Install the typed Client Remote service.
 * @param ctx - Client Cordis root.
 */
export declare function apply(ctx: Context): void;
/**
 * Whether a caught value is a Remote failure this face delivered or threw.
 * The one consumer-facing discrimination point: marked instances carry their
 * Host code; anything else is a local fault the caller should let crash.
 * @param error - a caught value.
 * @returns true when the value narrows to RemoteFailure.
 */
export declare function isRemoteFailure(error: unknown): error is RemoteFailure;
//# sourceMappingURL=index.d.ts.map