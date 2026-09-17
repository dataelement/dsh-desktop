/** Browser background-upload Cordis service. */
import type { Context } from '@deepseek-ai/cordis';
import type { FileUploadService } from './contract.ts';
export type { FileUploadProgress, FileUploadService } from './contract.ts';
export type { FileUploadReceiptId, FileUploadValue } from '../types.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Session-addressed browser service for staged file uploads. */
        fileUpload: FileUploadService;
    }
}
/** The upload service uses the generated Remote fallback. */
export declare const inject: string[];
/**
 * Provide the browser background-upload service.
 * @param ctx - Client plugin context.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map