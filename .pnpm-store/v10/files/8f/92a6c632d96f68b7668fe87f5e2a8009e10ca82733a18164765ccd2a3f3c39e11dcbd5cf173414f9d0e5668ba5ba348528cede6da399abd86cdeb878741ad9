/** Session-addressed, cold-readable skill catalog Remote. */
import type { Context } from '@deepseek-ai/cordis';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { SkillListRequest, SkillListValue } from './types.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Host owner of the Session-addressed `skills` Remote namespace. */
        sessionSkillCatalog: SessionSkillCatalog;
    }
}
/** Host service backing `ctx.remote.skills` without activating a cold Agent. */
export declare class SessionSkillCatalog extends TypertRemoteService {
    static inject: string[];
    /** @param ctx - Host context carrying Session reads and optional skill/preset services. */
    constructor(ctx: Context);
    /**
     * List the user-invocable skills visible to one Session composition.
     * @param request - Session identity whose cwd and preset select the catalog view.
     * @param signal - caller lifetime carried by the Remote transport; admitted catalog reads retain their existing completion semantics.
     * @returns user-invocable skill metadata without loading skill bodies.
     * @throws RemoteError when the Session cannot be inspected or no registry can serve it.
     */
    list(request: SkillListRequest, signal: AbortSignal): Promise<SkillListValue>;
    /** Resolve a live or standing preset scope without creating an Agent. */
    private scopeFor;
}
export default SessionSkillCatalog;
//# sourceMappingURL=skill-catalog.d.ts.map