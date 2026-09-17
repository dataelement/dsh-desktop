/**
 * InputTriggerService (`ctx.inputTriggers`): the root half of the trigger pipeline — the
 * stateless source registry plus the per-session controller map. Every piece
 * of mutable interaction state (hit, menu, fetch) lives on the
 * {@link InputTriggerController}; the service only registers sources, resolves
 * controllers by session scope, and relays roster changes.
 */
import { Service } from '@deepseek-ai/cordis';
import type { Context } from '@deepseek-ai/cordis';
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { InputTriggerSource } from '../types.ts';
import { InputTriggerController } from './controller.ts';
import type { InputTriggerServiceContract } from './contract.ts';
/** The `ctx.inputTriggers` trigger pipeline service (root registry + controller resolution). */
export declare class InputTriggerService extends Service implements InputTriggerServiceContract {
    static inject: string[];
    private readonly live;
    /**
     * @param ctx - owning root context (the service registers itself as `slash`).
     */
    constructor(ctx: Context);
    /**
     * Register one trigger source. Live session controllers are notified so a
     * source arriving after scope birth still warms and joins the lexicon.
     * @param src - the source; (trigger, name) must be unique — duplicates throw.
     * @returns the disposer (callers wrap registration in ctx.effect). Disposal
     * while a controller shows the source's menu group drops that group.
     */
    registerSource(src: InputTriggerSource): () => void;
    /**
     * Resolve the per-session controller for one session scope (lazy; the
     * scope disposer removes and disposes it). Construction warms the source
     * roster once — sessions are always agent-backed, so scope birth is the
     * single prewarm moment.
     * @param actx - session-scope ctx.
     * @returns the resident controller.
     */
    sessionOf(actx: ClientContext): InputTriggerController;
    private sessions;
}
//# sourceMappingURL=service.d.ts.map