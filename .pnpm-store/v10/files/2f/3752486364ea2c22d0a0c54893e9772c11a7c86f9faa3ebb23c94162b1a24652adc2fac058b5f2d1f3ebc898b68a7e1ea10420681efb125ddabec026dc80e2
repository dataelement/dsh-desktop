/**
 * Worker-side execution logic, written as plain functions over an injected port so the unit
 * suite can run every line IN-PROCESS against a fake port (a real worker thread is a separate
 * V8 isolate the coverage provider cannot observe).
 * @module @deepseek-ai/dsh-code-runtime-worker-thread/src/bootstrap
 */
import type { DoneMessage, ReplyMessage, WorkerBootData, WorkerToHost } from './protocol.ts';
/** The port API the bootstrap needs — satisfied by `parentPort` and by the tests' fake. */
export interface BootstrapPort {
    postMessage(message: WorkerToHost): void;
    on(event: 'message', listener: (message: ReplyMessage) => void): void;
}
/**
 * A writable stream's `write` slot, as the bootstrap patches it (see
 * {@link captureStreamWrites}). Method-typed so the real
 * `process.stdout`/`process.stderr` (narrower chunk parameters) remain
 * assignable.
 */
export interface PatchableStream {
    write(chunk: unknown, ...rest: unknown[]): boolean;
}
/**
 * Ordered text capture under the shared outer JSON-byte budget, delivered to
 * a sink as each item lands (the real sink streams text over the port eagerly,
 * so captured output survives a mid-run termination). It includes the log
 * array syntax and string escaping in its accounting. Once exhausted it emits
 * the fitting prefix and reports the limit once; the host turns that condition
 * into an explicit `output-limit` run failure.
 */
export declare class LogBuffer {
    private bytes;
    private entries;
    private truncated;
    private readonly sink;
    private readonly onLimit;
    private readonly maxBytes;
    constructor(maxBytes: number, sink: (text: string) => void, onLimit?: () => void);
    /**
     * Emit text to the sink, charging it against the budget (drops + marks once exhausted).
     * @param text - the captured text to deliver.
     */
    push(text: string): void;
    /** Remaining exact JSON-byte budget for the completion value or failure message. */
    remainingOutputBytes(): number;
}
/** The five console methods the shim captures, in the seam's level vocabulary. */
declare const CONSOLE_LEVELS: readonly ["log", "info", "warn", "error", "debug"];
/**
 * A `console` replacement whose five leveled methods render their arguments
 * `util.inspect`-style (matching real console formatting closely enough for
 * a model to recognize its own output) into the buffer. Only these five
 * exist — the program gets a deliberately small console, not Node's full
 * console API.
 * @param logs - the buffer every rendered line is pushed into.
 * @returns the five-method console object handed to the program.
 */
export declare function makeConsoleShim(logs: LogBuffer): Record<(typeof CONSOLE_LEVELS)[number], (...args: unknown[]) => void>;
/**
 * Redirect a stream's `write` into the log buffer (the program-visible
 * `process.stdout`/`process.stderr` in the real worker), so raw writes land in emission order
 * alongside console output instead of racing down a pipe. It preserves Node's optional callback
 * contract: the callback runs asynchronously after admission, even when the log budget drops
 * the write.
 *
 * @param logs - the buffer captured writes are pushed into.
 * @param stream - the stream whose `write` slot is patched.
 * @returns the restore function (the in-process tests un-patch; the real
 *   worker never needs to).
 */
export declare function captureStreamWrites(logs: LogBuffer, stream: PatchableStream): () => void;
/**
 * Prepare the program's completion value for the done message. Only lossless
 * JSON crosses, and a value that does not fit the remaining combined outer
 * budget reports `output-limit`; the host revalidates hostile traffic and
 * remains authoritative for native pipe writes the worker cannot observe.
 *
 * @param value - the program's completion value.
 * @param remainingOutputBytes - exact bytes left after captured logs.
 * @param maxOutputBytes - the configured cap named in an overflow diagnostic.
 * @returns the done-message fragment: `{}` for `undefined`, else a flat wire `{ value }`.
 */
export declare function prepareCompletion(value: unknown, remainingOutputBytes: number, maxOutputBytes?: number): Omit<DoneMessage, 'type'>;
/**
 * Prepare a thrown program value without sending an unbounded stack or
 * string across the worker port.
 * @param error - the value thrown by the program.
 * @param remainingOutputBytes - exact bytes left after captured logs.
 * @param maxOutputBytes - the configured cap named in an overflow diagnostic.
 * @returns a bounded exception or fixed output-limit fragment.
 */
export declare function prepareException(error: unknown, remainingOutputBytes: number, maxOutputBytes?: number): Omit<DoneMessage, 'type'>;
/** One awaited binding call's settlement handles, keyed by call id in the pending map. */
export interface PendingCall {
    resolve(value: unknown): void;
    reject(error: Error): void;
}
/** Constructor type for one program-visible binding rejection class. */
export type BindingErrorConstructor = new (memberName: string, message: string) => Error;
/**
 * Build each declared error class once so calls and `instanceof` share constructor identity.
 * @param data - binding namespace declarations from the boot payload.
 * @returns constructors keyed by their owning namespace global.
 */
export declare function makeBindingErrorClasses(data: Pick<WorkerBootData, 'namespaces'>): Map<string, BindingErrorConstructor>;
/**
 * Route host replies into the pending-call map: each reply settles its call
 * at most once, and a reply for an unknown id (stray, or a duplicate answer
 * to an id already settled) is ignored. Shared wiring between
 * {@link runWorkerMain} and the tests that exercise {@link makeNamespaces}
 * standalone.
 * @param port - the port whose `message` events carry the replies.
 * @param pending - the id-keyed map of unsettled binding calls.
 */
export declare function wireReplies(port: BootstrapPort, pending: Map<number, PendingCall>): void;
/**
 * Build the binding namespace objects the program sees: one null-prototype global per
 * namespace, each declared name an own enumerable async function that bridges over the port
 * (`__proto__`/`constructor`/`toString` are ordinary keys, never prototype collisions).
 * Lossy arguments reject before posting; clone failures and host failure
 * replies reject only the corresponding call.
 *
 * @param data - the boot payload's namespace declarations (globals + names).
 * @param port - the port binding calls are posted to.
 * @param pending - the id-keyed map each posted call parks its handles in.
 * @param nextId - the shared mutable id counter (worker-issued correlation ids).
 * @param errorClasses - per-namespace constructors shared with program globals.
 * @returns one namespace object per declaration, in declaration order.
 */
export declare function makeNamespaces(data: Pick<WorkerBootData, 'namespaces'>, port: BootstrapPort, pending: Map<number, PendingCall>, nextId: {
    value: number;
}, errorClasses?: Map<string, BindingErrorConstructor>): Record<string, unknown>[];
/**
 * Run one strict async-function body, allowing top-level `await` and `return`, and post exactly
 * one terminal {@link DoneMessage}; a thrown program error becomes its `error` field.
 * @param port - host message port or test double.
 * @param data - the boot payload the host sent.
 * @param streams - stdout/stderr objects captured as program logs.
 * @returns after posting the done message.
 */
export declare function runWorkerMain(port: BootstrapPort, data: WorkerBootData, streams: {
    stdout: PatchableStream;
    stderr: PatchableStream;
}): Promise<void>;
export {};
//# sourceMappingURL=bootstrap.d.ts.map