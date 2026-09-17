import { ChangeFeed } from "./change-feed.js";
import { createFileResourceProvider } from "./provider.js";
/** Required browser services: the resource model, the Remote carrier and its namespace. */
export const inject = ['resources', 'remote', 'remote.workspaceFiles'];
/**
 * Client plugin body: register the `file` provider for this plugin's lifetime.
 * @param ctx - client root context carrying `resources` and the Remote face.
 */
export function apply(ctx) {
    const changes = new ChangeFeed(ctx.remote);
    const provider = createFileResourceProvider(ctx.remote, changes);
    ctx.effect(() => {
        const release = ctx.resources.register(provider);
        // Teardown waits for every session stream still closing, so the plugin
        // leaves no Host stream behind.
        return async () => {
            release();
            await changes.settle();
        };
    }, 'workspace-files: file resource provider');
}
//# sourceMappingURL=index.js.map