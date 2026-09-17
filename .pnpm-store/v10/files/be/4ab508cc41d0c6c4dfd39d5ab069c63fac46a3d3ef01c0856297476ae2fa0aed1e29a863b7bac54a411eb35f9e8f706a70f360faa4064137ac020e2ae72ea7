/** Workspace-backed Session creation for one settled webhook rule result. */
import type { Context } from '@deepseek-ai/cordis';
import type { WebhookRuleId } from './brand.ts';
import type { VerifiedWebhookDelivery, WebhookSessionRequest } from './types.ts';
/**
 * Create, attach, title, configure, and prompt one ordinary root Session.
 * Successful prompt admission ends webhook ownership of the operation; the
 * Agent remains lifecycle-owned by `ctx` and follows normal Session behavior.
 *
 * @param ctx - untraced runtime context that owns the resulting Agent.
 * @param delivery - exact verified provider delivery used for provenance.
 * @param ruleId - rule that returned the request.
 * @param request - same-process rule result.
 * @param signal - registration lifetime cancellation through publication.
 */
export declare function createWebhookSession(ctx: Context, delivery: VerifiedWebhookDelivery, ruleId: WebhookRuleId, request: WebhookSessionRequest, signal: AbortSignal): Promise<void>;
//# sourceMappingURL=session.d.ts.map