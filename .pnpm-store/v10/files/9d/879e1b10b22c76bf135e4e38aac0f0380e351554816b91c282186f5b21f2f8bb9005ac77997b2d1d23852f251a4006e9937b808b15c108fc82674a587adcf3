/**
 * Meta validation checks caller-provided DATA against the {@link WorkflowMeta}
 * contract and rejects every violation by name. Meta arrives as schema-checked
 * JSON data, never evaluated script text; evaluating it on the host could run getters outside the
 * worker timeout that exists to isolate model-written code.
 * @module @deepseek-ai/dsh-workflow-worker-thread/meta
 */
import type { WorkflowMeta } from '@deepseek-ai/dsh-workflow';
/**
 * Validate a caller-provided meta value against the {@link WorkflowMeta}
 * contract. Throws `META_INVALID` naming every violation (unknown fields,
 * missing/mistyped `name`/`description`, malformed `phases`); the returned
 * meta is a NORMALIZED copy built from the validated fields, so the engine
 * never aliases the caller's object.
 * @param value - the meta data from the start request (plain JSON by the seam contract).
 * @returns the validated, normalized meta block.
 */
export declare function validateMeta(value: unknown): WorkflowMeta;
//# sourceMappingURL=meta.d.ts.map