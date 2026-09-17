/** Baseline-and-delta protocol layered over a reconnecting Remote stream. */
import type { RemoteStream } from './remote-stream.ts';
/** Domain operations for one snapshot stream. */
export interface RemoteSnapshotStreamOptions<Snapshot, Delta> {
    /** Diagnostic stream name used in protocol failures. */
    readonly name: string;
    /** Distinguish the opening snapshot from later deltas. */
    readonly isSnapshot: (value: Snapshot | Delta) => value is Snapshot;
    /** Atomically replace the domain model from a complete snapshot. */
    readonly replace: (snapshot: Snapshot) => void;
    /** Apply one incremental update after the generation snapshot. */
    readonly update: (delta: Delta) => void;
    /** Publish a terminal business or protocol failure. */
    readonly failed: (error: unknown) => void;
}
/**
 * Consumes generations that each contain exactly one opening snapshot followed by deltas.
 *
 * The previous domain snapshot remains published while the underlying stream retries. A
 * replacement becomes accepted only after the domain owner applies it successfully.
 */
export declare class RemoteSnapshotStream<Snapshot, Delta> {
    private readonly stream;
    private readonly options;
    private started;
    private disposed;
    private done;
    /**
     * @param stream - reconnecting physical-generation stream.
     * @param options - frame discriminator and domain state destinations.
     */
    constructor(stream: RemoteStream<Snapshot | Delta>, options: RemoteSnapshotStreamOptions<Snapshot, Delta>);
    /** Start the single consumer; repeated calls are inert. */
    start(): void;
    /** Replace the active physical generation without discarding the published snapshot. */
    restart(): void;
    /**
     * Permanently stop the stream and wait for its consumer to become quiescent.
     * @returns when no generation or callback can still run.
     */
    dispose(): Promise<void>;
    private consume;
}
//# sourceMappingURL=snapshot-stream.d.ts.map