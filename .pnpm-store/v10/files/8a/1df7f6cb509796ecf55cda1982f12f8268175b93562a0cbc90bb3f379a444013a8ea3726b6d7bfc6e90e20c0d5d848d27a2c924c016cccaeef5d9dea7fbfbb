/**
 * Lossless-JSON snapshots for the dependency-free source worker closure.
 * @module @deepseek-ai/dsh-code-runtime-worker-thread/worker-json
 */
import type { CodeJsonValue } from '@deepseek-ai/dsh-code-runtime';
/**
 * Validate and detach one worker-boundary value without loading another
 * workspace package at runtime. This mirrors the session-owned canonical
 * JSON boundary while remaining safe to import from the unbuilt worker.
 * Its iterative traversal adds no JavaScript call-stack depth limit.
 *
 * @param value - the candidate completion value.
 * @returns a detached lossless-JSON snapshot, or `undefined` when invalid.
 */
export declare function snapshotCodeJsonValue(value: unknown): CodeJsonValue | undefined;
interface ArrayWireToken {
    kind: 'array';
    length: number;
}
interface ObjectWireToken {
    kind: 'object';
    keys: string[];
}
type WorkerJsonToken = null | boolean | number | string | ArrayWireToken | ObjectWireToken;
/**
 * A pre-order, bounded-depth transport for one lossless JSON value. Container
 * markers and scalar leaves share one flat token array, so `worker_threads`
 * never has to structured-clone the value's application nesting.
 */
export type WorkerJsonWire = WorkerJsonToken[];
/**
 * Flatten one validated JSON value for the worker-thread message port.
 * @param value - the lossless JSON value to transport.
 * @returns a pre-order token stream whose own nesting is bounded.
 */
export declare function encodeWorkerJson(value: CodeJsonValue): WorkerJsonWire;
/**
 * Rebuild one lossless JSON value from the flat worker-thread wire format.
 * Malformed or incomplete traffic returns `undefined`; traversal is iterative
 * and therefore independent of the transported value's application depth.
 * @param input - untrusted message-port payload.
 * @returns the detached JSON value, or `undefined` when the wire is invalid.
 */
export declare function decodeWorkerJson(input: unknown): CodeJsonValue | undefined;
export {};
//# sourceMappingURL=worker-json.d.ts.map