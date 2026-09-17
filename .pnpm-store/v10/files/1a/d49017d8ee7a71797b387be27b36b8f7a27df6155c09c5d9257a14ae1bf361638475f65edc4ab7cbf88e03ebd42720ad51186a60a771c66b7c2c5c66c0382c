/**
 * File-reference discovery seam shared by host-backed user interfaces.
 *
 * @module @deepseek-ai/dsh-file-reference
 */
import { Service, type Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { FileReferenceCandidate } from './types.ts';
export { activeAtToken, formatFileMention } from './grammar.ts';
export type { ActiveAtToken } from './grammar.ts';
export type { FileReferenceCandidate } from './types.ts';
/** Model guidance for path-only references selected by a user interface. */
export declare const FILE_REFERENCE_PROMPT = "Tokens prefixed with @ are workspace paths the user explicitly referenced, relative to the workspace root. A trailing slash marks a directory: list it when its contents matter. Anything else is a file: use the read tool when its contents are needed, and do not claim to have inspected it before reading. @\"...\" quotes a path containing spaces.";
declare module '@deepseek-ai/cordis' {
    interface Context {
        fileReferences: FileReferenceService;
    }
}
/** Host capability for cancellable file-reference discovery. */
export declare abstract class FileReferenceService extends Service {
    constructor(ctx: Context);
    /**
     * List file and directory candidates for one agent's working directory.
     * @param agent - target agent whose session cwd bounds discovery.
     * @param query - path text following `@` or `@"`.
     * @param signal - caller cancellation.
     * @returns deterministic path-only candidates.
     */
    abstract list(agent: Agent, query: string, signal: AbortSignal): Promise<FileReferenceCandidate[]>;
}
export default FileReferenceService;
//# sourceMappingURL=index.d.ts.map