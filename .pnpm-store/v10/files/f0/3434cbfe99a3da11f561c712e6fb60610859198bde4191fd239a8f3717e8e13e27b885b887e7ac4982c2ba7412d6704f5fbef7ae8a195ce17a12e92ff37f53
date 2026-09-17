/** GitHub HTTP authentication, parsing, and fire-and-forget dispatch. */
import type { Context } from '@deepseek-ai/cordis';
import type { CredentialRef } from '@deepseek-ai/dsh-credentials';
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';
/** Handler values validated once at plugin load. */
export interface GitHubWebhookHandlerConfig {
    readonly source: string;
    readonly secretEnv: CredentialRef;
    readonly maxBodyBytes: number;
}
/**
 * Create one exact-route GitHub handler.
 * @param ctx - adapter context carrying credentials and webhook runtime.
 * @param config - validated source, credential reference, and body ceiling.
 * @returns an HTTP handler that answers after in-memory dispatch, never rule settlement.
 */
export declare function createGitHubWebhookHandler(ctx: Context, config: GitHubWebhookHandlerConfig): WebRoute['handler'];
//# sourceMappingURL=handler.d.ts.map