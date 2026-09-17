/**
 * Child-scoped structured-output tool, prompt instruction, terminal guard, and authoritative
 * result capture for in-process subagents. Each child registers its real schema on its own
 * scope, so concurrent runs do not interact and disposal leaves no global residue. The prompt
 * contribution is ordinary reconstructed request state.
 *
 * Capture commits only after the authoritative `tools/result` succeeds; PTC mode capture also
 * waits for the enclosing `run_code` result. The terminal result marker and monotonic tool
 * guard prevent later calls from reopening a completed structured run.
 * @module @deepseek-ai/dsh-subagent-in-process-driver/structured
 */
import type { Context } from '@deepseek-ai/cordis';
import { type ObjectJsonSchema } from '@deepseek-ai/dsh-tools';
/** The model-facing tool name a structured child must call to finish. */
export declare const STRUCTURED_OUTPUT_TOOL = "structured_output";
/**
 * The instruction registered as the child's trailing scoped prompt section:
 * the demand travels with the
 * tool, as ordinary prompt state of exactly one agent.
 */
export declare const STRUCTURED_OUTPUT_INSTRUCTION: string;
/** One structured run's live handle: read the captured value once the child settles. */
export interface StructuredAttachment {
    /**
     * The captured value, once the child called the tool with valid arguments
     * and the authoritative final tool result accepted that call.
     * @returns the committed value, or undefined while none was accepted.
     */
    captured(): {
        value: unknown;
    } | undefined;
}
/**
 * Attach the scoped capture tool, instruction, and enforcement to a child during
 * its creation window. Child disposal removes every registration.
 * @param childCtx - the child agent's scope context (`setup`'s argument).
 * @param schema - the trusted, already-asserted schema subset to enforce (see
 *   `assertObjectJsonSchema` in dsh-tools).
 * @returns the attachment handle (read `captured()` after the child settles).
 */
export declare function attachStructuredRuntime(childCtx: Context, schema: ObjectJsonSchema): StructuredAttachment;
//# sourceMappingURL=structured.d.ts.map