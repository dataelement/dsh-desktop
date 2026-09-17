/**
 * Model-facing literal edit, unique-match by default. It obtains an optional guard from the
 * single intent slot, calls `ctx.fs.editText` without a separate stat, then records the observed
 * version; no policy means an unconditional atomic edit.
 * @module @deepseek-ai/dsh-tool-fs/src/edit
 */
import type { Context } from '@deepseek-ai/cordis';
import type { FsSandboxController } from './sandbox.ts';
/** Validated `edit` arguments after defaulting. */
interface EditInput {
    filePath: string;
    oldString: string;
    newString: string;
    replaceAll: boolean;
}
/**
 * Validate value constraints the schema DSL can't express: a non-blank
 * `file_path`, a non-empty `old_string`, and `old_string !== new_string`
 * (an equal pair would be a guaranteed no-op edit).
 * @param args - the schema-validated raw tool arguments.
 * @returns the camelCased input with `replace_all` defaulted to false.
 */
export declare function parseEditArgs(args: {
    file_path: string;
    old_string: string;
    new_string: string;
    replace_all?: boolean;
}): EditInput;
/**
 * Format an edit success (single-match or replace-all) as a Claude-style model-facing message.
 * @param displayPath - the backend-resolved path shown to the model.
 * @param replaceAll - selects the all-occurrences wording over the single-replacement one.
 * @returns the confirmation sentence the model sees as the tool result.
 */
export declare function formatEditOutput(displayPath: string, replaceAll: boolean): string;
/**
 * Register the `edit` tool and its scope-aware system-prompt guidance.
 * @param ctx - the plugin context; registrations are effects scoped to it, and execution uses its `fs` service.
 * @param sandbox - the shared sandbox-escalation API (advertisement, mode stamping, denial mapping).
 */
export declare function applyEditTool(ctx: Context, sandbox: FsSandboxController): void;
export {};
//# sourceMappingURL=edit.d.ts.map