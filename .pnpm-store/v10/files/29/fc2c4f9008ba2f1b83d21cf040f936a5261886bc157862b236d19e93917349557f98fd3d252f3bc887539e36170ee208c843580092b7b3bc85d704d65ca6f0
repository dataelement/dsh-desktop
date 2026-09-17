/**
 * Authorization flows for the pi-ai providers that ship a login. This is the
 * whole of the translation between the harness's neutral notice/prompt
 * vocabulary and pi-ai's `AuthInteraction`; nothing above it knows which
 * library ran the conversation.
 *
 * @module dsh-llm-pi-ai/login
 */
import type { Context } from '@deepseek-ai/cordis';
import type { PiAiAuthInjection } from './adapter.ts';
/**
 * Register one authorization flow per installed provider that ships a login.
 *
 * Registration is unconditional on configuration: a provider has to be signed
 * into before a route for it is worth adding, so the flow exists from the
 * moment the plugin mounts rather than appearing once a profile does.
 * @param ctx - the plugin context carrying `ctx.authorization`.
 * @param auth - the injectables every collection here is built with.
 */
export declare function registerPiAiFlows(ctx: Context, auth: PiAiAuthInjection): void;
//# sourceMappingURL=login.d.ts.map