/**
 * Materializes values leaving the script vm into plain JSON before they cross the worker
 * boundary, and renders thrown script values without rejecting the run. The walk rejects
 * values that JSON cannot preserve but trusts model-written workflow scripts: getters and proxy traps may
 * run, and the vm is not a security boundary. The worker provides host-loop isolation and
 * forced termination, not hostile-value containment. See
 * .agents/notes/implemented/feature/2026-07-05-dynamic-workflows.md for the isolation rationale.
 * @module @deepseek-ai/dsh-workflow-worker-thread/realm
 */
/** Thrown by {@link materializeFromRealm}; the caller wraps it into the right `WorkflowError` code. */
export declare class MaterializeError extends Error {
    readonly path: string;
    readonly reason: string;
    constructor(path: string, reason: string);
}
/**
 * Render a thrown value to failure text without ever throwing: prefer the
 * `stack` (host or realm — a realm error's `stack` is a plain string read),
 * fall back to `message`, then `String()`. Reading those properties MAY run
 * script code (a getter, `toString`) — accepted under the module's trust
 * premise; if that code itself throws, a fixed label is returned instead.
 * @param error - any value thrown in the host or worker realm.
 * @returns human-readable text for the failure report; prefers the stack.
 */
export declare function renderThrown(error: unknown): string;
/**
 * Copy `value` (typically from the vm realm) into plain host JSON data. Root `undefined` is
 * returned unchanged; nested `undefined` and values JSON cannot represent losslessly fail
 * with the offending path. Property accessors run normally, and a throwing read is wrapped
 * with its rendered failure.
 *
 * @param value - the realm value to materialize.
 * @param root - the path label for the root value (error messages).
 * @returns the host-realm copy (plain objects/arrays/scalars only).
 * @throws {@link MaterializeError} for unsupported values, cycles, sparse arrays, exotic
 *   prototypes, or property reads that throw.
 */
export declare function materializeFromRealm(value: unknown, root?: string): unknown;
//# sourceMappingURL=realm.d.ts.map