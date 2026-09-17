/** Session-scoped durable image URL cache shared by Conversation targets. */
import type { Context } from '@deepseek-ai/cordis';
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
/** Resolve durable Conversation images and release their browser URLs with Session scope. */
export declare class HistoricalImageCache {
    private readonly sessions;
    private readonly entries;
    private readonly generations;
    private readonly scopeDisposers;
    private readonly urls;
    private disposed;
    /**
     * @param ctx - Owning ui-conversation fiber.
     * @param sessions - Session Controller object layer.
     */
    constructor(ctx: Context, sessions: ISessions);
    /**
     * Resolve and cache one session-authorized image URL.
     * @param sessionId - Session authorization and lifetime scope.
     * @param attachment - Durable image reference.
     * @returns browser URL valid until the Session binding is released.
     */
    resolve(sessionId: SessionId, attachment: ImageAttachmentRef): Promise<string>;
    /**
     * Return an already-displayable URL without starting a read.
     * @param sessionId - Session authorization and lifetime scope.
     * @param attachment - Durable image reference.
     * @returns current preview or canonical URL when cached.
     */
    peek(sessionId: SessionId, attachment: ImageAttachmentRef): string | undefined;
    /**
     * Adopt a submission preview while fetching the durable admitted bytes.
     * The preview is available synchronously, then replaced and revoked when
     * the canonical attachment read completes.
     * @param sessionId - Session authorization and lifetime scope.
     * @param attachment - Durable image reference the URL temporarily displays.
     * @param url - browser URL to adopt.
     * @returns whether the cache took ownership.
     */
    seed(sessionId: SessionId, attachment: ImageAttachmentRef, url: string): boolean;
    private key;
    private loadCanonical;
    private assertLive;
    private bindScope;
    private release;
    private releaseUrl;
    private dispose;
}
//# sourceMappingURL=historical-images.d.ts.map