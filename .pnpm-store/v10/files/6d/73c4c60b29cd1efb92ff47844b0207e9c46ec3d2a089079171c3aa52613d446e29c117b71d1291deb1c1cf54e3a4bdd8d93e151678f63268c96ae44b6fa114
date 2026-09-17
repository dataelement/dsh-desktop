/** Baseline-and-delta protocol layered over a reconnecting Remote stream. */
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol';
/** Host-side stream protocol violation, marked so consumers surface it as an error state. */
function protocolViolation(message) {
    return new RemoteError('gateway/internal', message, {});
}
/**
 * Consumes generations that each contain exactly one opening snapshot followed by deltas.
 *
 * The previous domain snapshot remains published while the underlying stream retries. A
 * replacement becomes accepted only after the domain owner applies it successfully.
 */
export class RemoteSnapshotStream {
    stream;
    options;
    started = false;
    disposed = false;
    done;
    /**
     * @param stream - reconnecting physical-generation stream.
     * @param options - frame discriminator and domain state destinations.
     */
    constructor(stream, options) {
        this.stream = stream;
        this.options = options;
    }
    /** Start the single consumer; repeated calls are inert. */
    start() {
        if (this.started)
            return;
        this.started = true;
        this.done = this.consume();
    }
    /** Replace the active physical generation without discarding the published snapshot. */
    restart() {
        this.stream.restart();
    }
    /**
     * Permanently stop the stream and wait for its consumer to become quiescent.
     * @returns when no generation or callback can still run.
     */
    async dispose() {
        this.disposed = true;
        await this.stream.dispose();
        await this.done;
    }
    async consume() {
        let generation = 0;
        let snapshotSeen = false;
        try {
            for await (const item of this.stream) {
                if (item.generation !== generation) {
                    generation = item.generation;
                    snapshotSeen = false;
                }
                if (this.options.isSnapshot(item.value)) {
                    if (snapshotSeen) {
                        throw protocolViolation(`${this.options.name} emitted more than one opening snapshot`);
                    }
                    this.options.replace(item.value);
                    snapshotSeen = true;
                    item.accept();
                    continue;
                }
                if (!snapshotSeen) {
                    throw protocolViolation(`${this.options.name} emitted an update before its opening snapshot`);
                }
                this.options.update(item.value);
            }
        }
        catch (error) {
            if (!this.disposed)
                this.options.failed(error);
        }
    }
}
//# sourceMappingURL=snapshot-stream.js.map