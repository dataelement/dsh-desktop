/** Signed GitHub HTTP adapter for the provider-neutral webhook runtime. */
import { credentialRef } from '@deepseek-ai/dsh-credentials';
import z from '@deepseek-ai/schemastery';
import { createGitHubWebhookHandler } from "./handler.js";
/** Cordis function-plugin name. */
export const name = 'webhook-github';
/** Host services required before the exact route can register. */
export const inject = ['webServer', 'webhookRuntime', 'credentials'];
export const Config = z.object({
    source: z.string().required(),
    path: z.string().required(),
    secretEnv: z.string().role('credential-ref').required(),
    maxBodyBytes: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).required(),
});
/** Validate route and source facts that Schemastery cannot express. */
function assertConfig(config) {
    if (config.source.trim() !== config.source || config.source === '') {
        throw new Error('webhook-github source must be a non-empty trimmed string');
    }
    if (!config.path.startsWith('/') || config.path === '/' || config.path.endsWith('/')
        || config.path.includes('?') || config.path.includes('#')) {
        throw new Error('webhook-github path must be an absolute non-root pathname without a trailing slash, query, or fragment');
    }
}
/** Register one signed GitHub endpoint on the injected WebServer. */
export function apply(ctx, config) {
    assertConfig(config);
    const route = {
        kind: 'exact',
        path: config.path,
        handler: createGitHubWebhookHandler(ctx, {
            source: config.source,
            secretEnv: credentialRef(config.secretEnv),
            maxBodyBytes: config.maxBodyBytes,
        }),
    };
    ctx.effect(() => ctx.webServer.register(route), `webhook-github: ${config.path}`);
}
//# sourceMappingURL=index.js.map