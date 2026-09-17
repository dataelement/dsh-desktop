/**
 * The worker-side half of the engine: {@link runWorkerSession} wires one MessagePort to one
 * {@link WorkflowExecution} — hook progress and child starts go out as messages, run control
 * and child lifecycle come back in — and posts the run's terminal result exactly once. Keeping it
 * separate from `worker.ts` lets unit tests drive the session over a MessageChannel, because main
 * process coverage cannot observe code inside a real Worker.
 *
 * The session announces ready and waits for `go`, so cancellation racing startup can prevent even
 * the script's synchronous prefix. A cancel in place of `go` releases the gate into a cancelled
 * drive without executing the body.
 * @module @deepseek-ai/dsh-workflow-worker-thread/session
 */
import type { MessagePort } from 'node:worker_threads';
import type { WorkerInit } from './types.ts';
/**
 * Narrow the nullable `parentPort` the bootstrap reads from
 * `node:worker_threads`.
 * @param port - `parentPort` as imported (null on the main thread).
 * @returns the port, non-null.
 */
export declare function requireParentPort(port: MessagePort | null): MessagePort;
/**
 * Run one workflow script to settlement against `port`, posting the terminal result message
 * exactly once; resolves after that post (stray children may still be winding down through the
 * port — the host owns their teardown and ultimately terminates the thread). It never rejects:
 * constructor failure becomes an error result. Host pre-parse makes syntax failure here a likely
 * Node-version skew, but the session still reports it instead of dying silently.
 * @param port - the channel to the host (the real `parentPort`, or one side
 *   of an in-process `MessageChannel` in tests).
 * @param init - the run payload the host provided as `workerData`.
 */
export declare function runWorkerSession(port: MessagePort, init: WorkerInit): Promise<void>;
//# sourceMappingURL=session.d.ts.map