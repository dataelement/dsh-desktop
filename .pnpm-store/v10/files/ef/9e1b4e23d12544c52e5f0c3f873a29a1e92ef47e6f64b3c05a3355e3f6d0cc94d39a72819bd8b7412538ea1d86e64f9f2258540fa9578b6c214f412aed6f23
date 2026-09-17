/**
 * CommandUiRuntime (`ctx.commandUi`): the '/' command source over the
 * session-keyed directory, the client-contribution registry, and the
 * per-session popupSelect controllers. Candidate synthesis merges the host
 * catalog with contributions by availability, then position filtering and
 * the `/` menu's shared name ranking (ui-primitives `rankByName`); a
 * host/contribution name collision fails loud. Every execute
 * addresses the session's agent by sessionId — sessions are always
 * agent-backed.
 */
import { Service } from '@deepseek-ai/cordis';
import type { Context } from '@deepseek-ai/cordis';
import type { CommandResult } from '@deepseek-ai/dsh-commands/types';
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { ClientSessionContext } from '@deepseek-ai/dsh-client-ui-input-trigger/client';
import type { CommandContribution, CommandDecoration, CommandUiContract } from './contract.ts';
import { PopupSelectController } from './popup.ts';
declare module '@deepseek-ai/cordis' {
    interface Events {
        /**
         * This browser client completed one admitted Host command execution.
         * Other clients receive the durable command nodes but never this local
         * submission acknowledgment.
         * @param sessionId - Session addressed by the local submission.
         * @param name - Executed command name without the leading slash.
         * @param result - Host command result returned to this browser.
         * @mode emit
         */
        'command/executed'(sessionId: SessionId, name: string, result: CommandResult): void;
    }
}
/** Command surface: session-keyed directory + '/' source + contribution registry + per-session popups. */
export declare class CommandUiRuntime extends Service implements CommandUiContract {
    static inject: string[];
    private readonly directory;
    private readonly live;
    /** `command`-namespace translator (composer refusal notices). */
    private readonly t;
    /**
     * @param ctx - owning root context (plugin fiber; the service registers
     * itself as `command` and follows that fiber's lifetime).
     */
    constructor(ctx: Context);
    /**
     * Register one client command contribution; effect disposer (rides the
     * caller's fiber). Duplicate names throw.
     * @param contribution - the contribution (descriptor + availability + popup spec).
     * @returns the disposer removing the registration.
     */
    register(contribution: CommandContribution): () => void;
    /**
     * Hang a bare-invocation decoration on one host command; effect disposer
     * (rides the caller's fiber). Duplicate names throw.
     * @param decoration - host command name + availability + popup spec.
     * @returns the disposer removing the registration.
     */
    decorate(decoration: CommandDecoration): () => void;
    /**
     * Resolve the per-session popup controller (lazy; dies with the session
     * scope). The controller's consume callback dispatches the scoped
     * consume-token event back to this session; focusComposer reaches the
     * composer through the overlay slot currency.
     * @param actx - session-scope ctx.
     * @returns the resident controller.
     */
    popupFor(actx: ClientContext): PopupSelectController<ClientSessionContext>;
    /** Composer focus hooks by session (the overlay wiring binds the textarea focus here). */
    private readonly focusHooks;
    /**
     * Bind one session's composer-focus hook (overlay slot wiring; unbind on unmount).
     * @param id - session id.
     * @param focus - textarea focus callback.
     * @returns the unbind disposer.
     */
    bindComposerFocus(id: SessionId, focus: () => void): () => void;
    /** Menu candidates: host catalog + contribution availability, then position filtering and the shared name ranking. */
    private candidates;
    /** Translate exact built-in Host copy while preserving scoped or third-party descriptors verbatim. */
    private hostDescription;
    /** Decision table, menu column: contribution/decorated-host → popup or action; host input → claim; host bare → detached execute. */
    private dispatch;
    /** Decision table, space column: hot-key sync check; only host leadingInput claims. */
    private matchSpace;
    /**
     * Decision table, enter column. Strong-waits the session's catalog (a
     * warmup failure rejects — never a silent downgrade). Contributions and
     * bare host commands act on the bare token only; leadingInput claims
     * args-tolerant.
     *
     * Envelope policy: an enter submission carrying attachments resolves only
     * through a command declaring attachment acceptance. Every other submitting
     * route — popup, non-accepting claim, bare detached execute — throws the
     * refusal so the machine surfaces one composer notice and the draft and
     * attachments stay in place; nothing executes and nothing is dropped. An
     * action submits nothing and runs regardless.
     */
    private matchEnter;
    /**
     * Invoke one contribution or decoration (menu pick / bare enter): open the
     * session's popup, or consume the token and run the action.
     */
    private invoke;
    /** Build the leadingInput claim: token `/name ` + the command.execute submit transaction. */
    private leadingClaim;
    /**
     * The command.execute transaction, addressed to the session's agent — pure
     * admission semantics. An unmatched line reports an error outcome (the
     * composer's immediate admission feedback); an admitted command reports
     * plain success regardless of its handler outcome, because the host
     * executor durably logged the lifecycle (`command/run`/`command/done`) and
     * the outcome renders as a persistent flow node — the composer never
     * echoes it. A handler error result reports an error outcome so the
     * composer keeps the draft and attachments for correction.
     * A refused call throws.
     */
    private execute;
    /** Publish the local acknowledgment without letting an observer change command admission. */
    private notifyExecuted;
    /** Log one contained `command/executed` observer failure. */
    private warnExecutedListenerFailure;
    /**
     * Fire-and-forget execute for the internal ('handled') paths. Outcomes are
     * NOT surfaced here: the host executor durably logs the command lifecycle
     * (`command/run`/`command/done`), and the mux-broadcast events render as a
     * persistent flow node on every tab. Only an admission failure — which never
     * entered a handler and therefore never logged — falls back to the composer
     * notice as immediate feedback.
     */
    private runDetached;
    /** Dispatch a consume-token event to one session (menu-pick / bare-enter execute paths). */
    private consumeVia;
    /** Route an admission failure to the session's composer notice channel (scope gone = attempt died with it). */
    private noticeFor;
    /** id → actx interchange (registered exchange point: this service coordinates for projection-only sources). */
    private scopeFor;
    private sessions;
}
//# sourceMappingURL=service.d.ts.map