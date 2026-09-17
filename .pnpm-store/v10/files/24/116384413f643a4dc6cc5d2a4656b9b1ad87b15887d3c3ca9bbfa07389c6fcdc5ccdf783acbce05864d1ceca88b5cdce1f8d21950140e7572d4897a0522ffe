/**
 * Model-facing full-file write. It obtains an optional intent from the single policy slot, calls
 * `ctx.fs.writeText` without a stat, then records the resulting version; no policy means an
 * unconditional atomic create-or-overwrite.
 * @module @deepseek-ai/dsh-tool-fs/src/write
 */
import type { Context } from '@deepseek-ai/cordis';
import type { FsWriteOutcome } from '@deepseek-ai/dsh-fs';
import type { FsSandboxController } from './sandbox.ts';
/**
 * Validate value constraints the schema DSL can't express: only a non-blank
 * `file_path` — an empty `content` is legitimate (it writes an empty file).
 * @param args - the schema-validated raw tool arguments.
 * @returns the camelCased input; `content` passes through untouched.
 */
export declare function parseWriteArgs(args: {
    file_path: string;
    content: string;
}): {
    filePath: string;
    content: string;
};
/**
 * Format a write outcome as one model-facing text block body.
 * @param displayPath - the backend-resolved path rendered in the envelope's `<path>` element.
 * @param outcome - the write outcome; its `operation` selects the Created/Updated wording.
 * @returns the model-facing confirmation envelope (no file content is echoed back).
 */
export declare function formatWriteOutput(displayPath: string, outcome: Pick<FsWriteOutcome, 'operation'>): string;
/**
 * Register the `write` tool and its scope-aware system-prompt guidance.
 * @param ctx - the plugin context; registrations are effects scoped to it, and execution uses its `fs` service.
 * @param sandbox - the shared sandbox-escalation API (advertisement, mode stamping, denial mapping).
 */
export declare function applyWriteTool(ctx: Context, sandbox: FsSandboxController): void;
//# sourceMappingURL=write.d.ts.map