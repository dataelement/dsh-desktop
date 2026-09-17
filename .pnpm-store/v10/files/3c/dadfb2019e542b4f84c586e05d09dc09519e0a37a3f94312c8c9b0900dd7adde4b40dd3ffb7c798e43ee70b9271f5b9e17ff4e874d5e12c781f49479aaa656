/** Host file-upload service: streamed intake and Agent-scoped staged receipts. */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { FileAttachmentRef } from '@deepseek-ai/dsh-attachment';
import type { SessionId } from '@deepseek-ai/dsh-session';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { EncodedFileUploadRequest, FileUploadReceiptId, FileUploadValue } from './types.ts';
export type * from './types.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Host storage and staged-receipt service for browser file uploads. */
        fileUploads: FileUploads;
    }
}
/** Resolve or resume the ordinary Agent that owns one Session identity. */
export type AgentResolver = (sessionId: SessionId) => Promise<Agent>;
/** Prompt receipt binding that restores its previous owners unless delivery commits it. */
export interface PromptFileBinding extends Disposable {
    /** Keep the receipt bindings until queue or history observation retires them. */
    commit(): void;
}
/** Host service owning upload storage and Agent-scoped staged receipts. */
export declare class FileUploads extends TypertRemoteService {
    static inject: string[];
    private readonly stagedFiles;
    private agentResolver;
    /** @param ctx - Host context carrying Agent, attachment, command, and Connection services. */
    constructor(ctx: Context);
    /**
     * Register the ordinary-Session resolver used when a raw upload addresses a cold Session.
     * @param resolve - resolver that returns the exact live Agent or throws a Remote error.
     * @returns disposer removing this resolver.
     */
    registerAgentResolver(resolve: AgentResolver): () => void;
    /**
     * Persist one encoded upload and stage it under the Agent receiver selected by Typert.
     * @param agent - receiving Agent resolved from the Remote Agent scope.
     * @param request - canonical base64 bytes and optional display name.
     * @param signal - caller cancellation before storage begins.
     * @returns the staged receipt and durable file reference.
     */
    upload(agent: Agent, request: EncodedFileUploadRequest, signal: AbortSignal): Promise<FileUploadValue>;
    /**
     * Persist raw chunks for one Session without aggregating the upload.
     * @param request - Session identity, ordered bytes, cancellation, and optional display name.
     * @returns the staged receipt and durable file reference.
     */
    uploadStream(request: {
        readonly sessionId: SessionId;
        readonly data: AsyncIterable<Uint8Array>;
        readonly signal?: AbortSignal;
        readonly name?: string;
    }): Promise<FileUploadValue>;
    /**
     * Resolve one staged receipt inside its receiving Agent scope.
     * @param agent - receiving Agent.
     * @param receiptId - opaque receipt minted for one completed upload.
     * @returns durable file reference, or `undefined` for an unknown or foreign receipt.
     */
    resolve(agent: Agent, receiptId: FileUploadReceiptId): FileAttachmentRef | undefined;
    /**
     * Bind receipts while one prompt enters an Agent inbox.
     * Disposal restores every prior binding unless the caller commits successful delivery.
     * @param agent - receiving Agent.
     * @param receiptIds - distinct staged receipts referenced by the prompt.
     * @param requestId - prompt identity later observed in queue or history.
     * @returns binding kept after commit until queue or history observation retires its receipts.
     */
    bindPrompt(agent: Agent, receiptIds: readonly FileUploadReceiptId[], requestId: string): PromptFileBinding;
    /**
     * Retire every receipt accepted by one removed queue occurrence.
     * @param agent - receiving Agent.
     * @param requestId - prompt identity carried by the queue occurrence.
     */
    retirePrompt(agent: Agent, requestId: string): void;
    private commit;
    private resolveAgent;
    private assertAgentScope;
    private assertOrdinaryAgent;
    private observeSessionEvent;
    private retire;
}
export default FileUploads;
//# sourceMappingURL=index.d.ts.map