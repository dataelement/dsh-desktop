import type { $ZodMemoizer, $ZodType } from "./schemas.js";
export declare class $ZodCyclicError extends Error {
    constructor();
}
/**
 * Whether one parse can re-enter this schema, i.e. its subtree contains a cycle.
 * Exported for `z.compile`, which refuses to compile such a schema: cycle
 * breaking is driven from here off state keyed on the parse context, and a
 * generated fast path has no context to key on.
 */
export declare function isRecursiveSchema(inst: $ZodType): boolean;
/** The memoizer that gives containers cycle support. `zod` installs it by default; `zod/mini` opts in with `config({ memoizer: memoizer() })`. */
export declare function memoizer(): $ZodMemoizer;
/** Whether this value is a node a back-edge resolved to before it finished. */
export declare function isBackEdge(ctx: object, value: unknown): boolean;
