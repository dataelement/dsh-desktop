/**
 * Session feedback: the `feedback/record` event, its command-independent
 * producer, the `sessionFeedback` Host Remote a product surface records
 * through, and the human-facing `/feedback` command. Recording appends one
 * authoritative log-only event and does not start model work. The append is
 * eager but unflushed, so acknowledgement reports that the entry is logged,
 * not that it reached disk.
 * @module @deepseek-ai/dsh-command-feedback
 */
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { getOrCreateAnonymousUserId } from '@deepseek-ai/dsh-anonymous-user-id';
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol';
/**
 * Every feedback category in the order product surfaces present them; each
 * surface owns its localized labels.
 */
export const FEEDBACK_CATEGORIES = [
    'task-result',
    'instruction-following',
    'product-interaction',
    'service-stability',
    'resource-cost',
    'security-privacy-permission',
    'other',
];
export const name = 'command-feedback';
export const inject = ['commands'];
const USAGE = 'Usage: /feedback <text>';
/**
 * Record feedback independently of any UI trigger. Surrounding whitespace is
 * discarded and a blank text is recorded as absent; an entry with neither
 * text nor category is still recorded.
 * @param session - session the feedback describes.
 * @param entry - human-authored remark and its category.
 */
export function recordFeedback(session, entry) {
    const text = entry.text?.trim() ?? '';
    session.append('feedback/record', {
        ...(text.length === 0 ? {} : { text }),
        ...(entry.category === undefined ? {} : { category: entry.category }),
    });
}
/**
 * Validate, record, and acknowledge one feedback entry. Returning an error
 * leaves no `feedback/record` event.
 * @param invocation - receiving agent, raw command input, and UI cancellation.
 * @returns an acknowledgement containing the receiving session and anonymous
 * user ids, or a usage error when no feedback text was supplied.
 */
function executeFeedbackCommand(invocation) {
    if (invocation.rawInput.trim().length === 0) {
        return { kind: 'error', text: `Feedback text is required. ${USAGE}` };
    }
    recordFeedback(invocation.agent.session, { text: invocation.rawInput });
    return {
        kind: 'success',
        text: `Feedback recorded for session ${invocation.agent.session.id}\nAnonymous user: ${getOrCreateAnonymousUserId()}.`,
    };
}
/** Host Remote through which a product surface records a Session-level remark. */
let SessionFeedbackService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _record_decorators;
    return class SessionFeedbackService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _record_decorators = [Remote('record')];
            __esDecorate(this, null, _record_decorators, { kind: "method", name: "record", static: false, private: false, access: { has: obj => "record" in obj, get: obj => obj.record }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static inject = ['sessions'];
        /**
         * @param ctx - Host context carrying the live Session store.
         */
        constructor(ctx) {
            super(ctx, 'sessionFeedback');
            __runInitializers(this, _instanceExtraInitializers);
        }
        /**
         * Record one remark on a live Session.
         * @param request - target Session plus the optional text and category.
         * @returns the recorded postcondition, or `session-not-found` when no live
         * Session carries the id.
         */
        record(request) {
            const session = this.ctx.sessions.get(request.sessionId);
            if (session === undefined) {
                return Promise.resolve({ ok: false, error: { code: 'session-not-found', sessionId: request.sessionId } });
            }
            recordFeedback(session, request);
            return Promise.resolve({ ok: true, value: { recorded: true } });
        }
    };
})();
export { SessionFeedbackService };
/**
 * Register the global `/feedback` command for every composed command adapter
 * and mount the `sessionFeedback` Remote.
 * @param ctx - Host context.
 */
export function apply(ctx) {
    ctx.plugin(SessionFeedbackService);
    ctx.commands.register({
        name: 'feedback',
        description: 'record feedback about this session',
        input: { hint: '<text>' },
        recordInput: false,
        handler: executeFeedbackCommand,
    });
}
//# sourceMappingURL=index.js.map