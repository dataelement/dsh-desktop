/**
 * ModelDirectoryResolver (`ctx.modelDirectories`): the root owner of per-session
 * {@link ModelDirectory} instances. Both selection entries (the /model popup
 * and the composer model seat) resolve their session's directory through
 * this service, which is what makes the dual entry one shared state.
 *
 * Per-session storage follows the client service pattern (InputTriggerService /
 * CommandUiRuntime): a lazy service-internal map whose entry is deleted by the
 * owning scope's disposer. The host `dsh-scope` ScopedLayers registry does
 * does not belong here: it derives scope from the host carrier mechanism
 * (object-keyed), while client scopes tag contexts with branded SessionId
 * strings, and it models global+shadow named registries — this is a
 * per-session singleton with no global layer to merge.
 */
import { Service } from '@deepseek-ai/cordis';
import type { Context } from '@deepseek-ai/cordis';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import { ModelDirectory } from './directory.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        modelDirectories: ModelDirectoryResolver;
    }
}
/** The `ctx.modelDirectories` session model-selection service. */
export declare class ModelDirectoryResolver extends Service {
    static inject: string[];
    private readonly live;
    private readonly catalog;
    /** Localized composer-block copy; this plugin owns the string it raises. */
    private readonly blockReason;
    /**
     * @param ctx - owning root context (the service registers itself as `models`).
     * @param config - the bound translator for this plugin's own dictionary.
     */
    constructor(ctx: Context, config: {
        blockReason: () => string;
    });
    /**
     * Resolve the per-session shared directory (lazy; the scope disposer
     * removes and disposes it). Unknown sessions fail loud.
     * @param sessionId - the owning session.
     * @returns the resident directory both entries share.
     */
    directoryFor(sessionId: SessionId): ModelDirectory;
}
//# sourceMappingURL=service.d.ts.map