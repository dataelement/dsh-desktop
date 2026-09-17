/**
 * File-reference discovery seam shared by host-backed user interfaces.
 *
 * @module @deepseek-ai/dsh-file-reference
 */
import { Service } from '@deepseek-ai/cordis';
export { activeAtToken, formatFileMention } from "./grammar.js";
/** Model guidance for path-only references selected by a user interface. */
export const FILE_REFERENCE_PROMPT = 'Tokens prefixed with @ are workspace paths the user explicitly referenced, relative to the workspace root. A trailing slash marks a directory: list it when its contents matter. Anything else is a file: use the read tool when its contents are needed, and do not claim to have inspected it before reading. @"..." quotes a path containing spaces.';
/** Host capability for cancellable file-reference discovery. */
export class FileReferenceService extends Service {
    constructor(ctx) {
        super(ctx, 'fileReferences');
    }
}
export default FileReferenceService;
//# sourceMappingURL=index.js.map