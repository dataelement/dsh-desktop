/**
 * Browser half: the `file` resource provider over `remote.workspaceFiles`.
 *
 * `types.ts` is what the protocol publishes, `change-feed.ts` shares one Host
 * `changes` stream per session, `provider.ts` turns it and `stat` into a value
 * stream, and this module only wires them into `ctx.resources`.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
export type { WorkspaceFileParams } from './types.ts';
/** Required browser services: the resource model, the Remote carrier and its namespace. */
export declare const inject: string[];
/**
 * Client plugin body: register the `file` provider for this plugin's lifetime.
 * @param ctx - client root context carrying `resources` and the Remote face.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map