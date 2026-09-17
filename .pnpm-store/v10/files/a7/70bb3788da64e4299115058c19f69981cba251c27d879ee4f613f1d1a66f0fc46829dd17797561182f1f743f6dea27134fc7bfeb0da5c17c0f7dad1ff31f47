/** Fire-and-forget webhook rule registry and Workspace-backed Session runtime. */
import { Context, Service } from '@deepseek-ai/cordis';
import type { VerifiedWebhookDelivery, WebhookRule } from './types.ts';
export * from './brand.ts';
export type * from './types.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        webhookRuntime: WebhookRuntime;
    }
}
/** Fire-and-forget rule runtime. Session creation is the only built-in action. */
export declare class WebhookRuntime extends Service {
    static inject: string[];
    private readonly rules;
    private readonly selfCtx;
    private closing;
    constructor(ctx: Context);
    /**
     * Register one trusted programmatic rule.
     * @param rule - unique id, provider kind, and arbitrary callback.
     * @returns awaitable effect disposer that aborts and drains this rule's active callbacks.
     */
    register<K extends string>(rule: WebhookRule<K>): () => Promise<void>;
    /**
     * Start every currently matching rule and return before any callback settles.
     * @param delivery - authenticated provider data; snapshotted before dispatch.
     * @throws synchronously when the runtime is closing or the delivery is malformed.
     */
    dispatch<K extends string>(delivery: VerifiedWebhookDelivery<K>): void;
    /** Start one contained invocation and attach it to registration teardown. */
    private startInvocation;
    /** Memoized registration teardown: hide, abort, then drain. */
    private disposeRegistration;
}
export default WebhookRuntime;
//# sourceMappingURL=index.d.ts.map