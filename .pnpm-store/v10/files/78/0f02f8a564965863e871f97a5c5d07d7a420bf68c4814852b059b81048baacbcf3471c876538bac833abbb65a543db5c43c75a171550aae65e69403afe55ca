/**
 * Single replay-aware token-meter service for request and surface pressure.
 *
 * @module @deepseek-ai/dsh-token-meter
 */
import { Service } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { assembleAssistantStream } from '@deepseek-ai/dsh-llm';
import { deepFreeze } from '@deepseek-ai/dsh-util-values';
import { canonicalHeader, headerEquals, isSurfaceEvent, SessionLogOffset, SessionSeq, } from '@deepseek-ai/dsh-session';
import { contextBreakdownProjectionDefinition } from "./breakdown-projection.js";
import { contextPressureProjectionDefinition, tokenUsageProjectionDefinition } from "./usage-projection.js";
import { estimateContent, estimateMessage, estimateToolsTokens, ROLE_OVERHEAD } from "./estimate.js";
import { commitSurfaceTokens, planSurfaceTokens } from "./surface-fold.js";
import { priceSurface } from "./route-pricing.js";
/** Sum disjoint provider usage buckets without double-counting reasoning output. */
function usageTokens(usage) {
    return usage.inputTokens
        + (usage.cacheReadTokens ?? 0)
        + (usage.cacheWriteTokens ?? 0)
        + usage.outputTokens;
}
/** Compare optional envelopes so a headerless estimate can track later surface deltas. */
function optionalHeaderEquals(left, right) {
    if (left === undefined || right === undefined)
        return left === right;
    return headerEquals(left, right);
}
/** Reject stale or misspelled keys before defaults can hide them. */
function validateConfigKeys(config) {
    for (const key of Object.keys(config)) {
        throw new Error(`TokenMeterConfig: unknown key "${key}" (no settings are supported)`);
    }
}
/** Replay owner for one service-wide estimator and isolated per-session folds. */
export class TokenMeter extends Service {
    // Schemastery preserves untrusted loader keys on an empty object schema;
    // the public type excludes settings while validateConfigKeys rejects them.
    static Config = z.object({});
    static inject = ['sessionProjections'];
    states = new WeakMap();
    constructor(ctx, config = {}) {
        super(ctx, 'tokenMeter');
        validateConfigKeys(config);
        ctx.sessionProjections.register(tokenUsageProjectionDefinition);
        ctx.sessionProjections.register(contextPressureProjectionDefinition);
        ctx.sessionProjections.register(contextBreakdownProjectionDefinition);
        // Readers catch up independently, while eager observation bounds ordinary
        // read latency without creating state for sessions no consumer has read.
        ctx.on('session/event', (session) => {
            if (this.states.has(session))
                this._sync(session);
        });
    }
    /**
     * Measure current request pressure and surface through the durable tail.
     *
     * The effective envelope's routed provider/model selects the request-image
     * pricing every node is priced under: a route whose adapter declares image
     * pricing charges each retained image its visual tokens plus its
     * model-visible text, while other routes keep the fixed heuristic. Provider
     * usage is reused only when the latest successful call's canonical request
     * envelope matches `requestHeader` and its total is no lower than that
     * call's full route-priced anchor; otherwise the complete envelope and
     * surface are repriced. The anchor includes all surface nodes immediately
     * before the assistant message, including inputs admitted after step/start.
     *
     * `requestHeader` replaces the latest logged envelope for pressure and node
     * pricing; the node set always describes the current session surface. Every
     * call clones those positional nodes, so measurement is O(surface).
     *
     * @param session - session to replay through its current durable tail.
     * @param requestHeader - optional effective request envelope replacing the latest logged header.
     * @returns a detached deeply immutable pressure and surface measurement.
     */
    measure(session, requestHeader) {
        const state = this._sync(session);
        const header = requestHeader === undefined
            ? state.header
            : canonicalHeader(requestHeader);
        const pricing = this._routeImagePricing(header);
        const fileText = this._fileRequestText();
        const surface = priceSurface(state.surface, pricing, fileText);
        const anchor = state.anchor;
        let baseline;
        let surfaceDeltaTokens;
        if (anchor !== undefined && optionalHeaderEquals(anchor.header, header)) {
            // Matching headers share one route, so the anchored snapshot reprices
            // under the same pricing as the current surface and the signed delta
            // compares like with like.
            const anchorSurfaceTokens = priceSurface(anchor.nodes, pricing, fileText).surfaceTokens
                + anchor.assistantTokens;
            const estimatedAnchorTokens = estimateToolsTokens(header) + anchorSurfaceTokens;
            const usage = anchor.usage;
            // Signed heuristic deltas remain conservative only from an anchor
            // that is at least as large as the matching full heuristic price.
            baseline = usage !== undefined && usageTokens(usage) >= estimatedAnchorTokens
                ? { kind: 'usage', tokens: usageTokens(usage), usage }
                : { kind: 'estimated', tokens: estimatedAnchorTokens };
            surfaceDeltaTokens = surface.surfaceTokens - anchorSurfaceTokens;
        }
        else if (header === undefined && surface.surfaceTokens === 0) {
            baseline = { kind: 'none', tokens: 0 };
            surfaceDeltaTokens = 0;
        }
        else {
            baseline = {
                kind: 'estimated',
                tokens: estimateToolsTokens(header) + surface.surfaceTokens,
            };
            surfaceDeltaTokens = 0;
        }
        return deepFreeze(structuredClone({
            logRevision: state.consumedEvents,
            baseline,
            surfaceDeltaTokens,
            totalTokens: Math.max(0, baseline.tokens + surfaceDeltaTokens),
            surfaceTokens: surface.surfaceTokens,
            nodes: surface.nodes,
        }));
    }
    /** Resolve the routed model's image pricing, when the llm service and route declare one. */
    _routeImagePricing(header) {
        const config = header?.config;
        if (config === undefined)
            return undefined;
        return this.ctx.get('llm')?.imageRequestPricing(config.provider, config.model);
    }
    /** Resolve request-time file projection when an LLM service is mounted. */
    _fileRequestText() {
        const llm = this.ctx.get('llm');
        return llm === undefined ? undefined : ref => llm.fileRequestText(ref);
    }
    /**
     * Heuristically price one model-visible message (instance face of the pure
     * `estimateMessage` export from `estimate.ts`).
     * @param message - message to price without mutation.
     * @returns content and role-framing tokens under the fixed service heuristic.
     */
    estimateMessage(message) {
        return estimateMessage(message);
    }
    /** Catch one session's fold up to the current durable tail. */
    _sync(session) {
        let state = this.states.get(session);
        if (state === undefined) {
            state = {
                consumedEvents: SessionLogOffset(0),
                header: undefined,
                surface: [],
                stepStart: undefined,
                anchor: undefined,
            };
            this.states.set(session, state);
        }
        while (state.consumedEvents < session.seq) {
            // oxlint-disable-next-line typescript/no-non-null-assertion -- contiguous session seqs index the durable log
            const event = session.eventAt(SessionSeq(state.consumedEvents));
            this._foldEvent(state, event);
            state.consumedEvents = SessionLogOffset(state.consumedEvents + 1);
        }
        return state;
    }
    /**
     * Run every fallible step — surface plan and anchor validation — before
     * mutating replay state, so a malformed event remains unread on every
     * retry instead of half-applying.
     */
    _foldEvent(state, event) {
        let nextHeader = state.header;
        let nextStepStart = state.stepStart;
        let nextAnchor = state.anchor;
        switch (event.type) {
            case 'request/header':
                nextHeader = canonicalHeader(event.data.header);
                break;
            case 'step/start':
                if (state.stepStart !== undefined) {
                    throw new Error(`token meter: step/start at seq ${event.seq} arrived before turn ${state.stepStart.turn}/step ${state.stepStart.step} ended`);
                }
                nextStepStart = { ...event.data };
                break;
            case 'step/end':
                if (state.stepStart === undefined
                    || state.stepStart.turn !== event.data.turn
                    || state.stepStart.step !== event.data.step) {
                    throw new Error(`token meter: step/end at seq ${event.seq} has no matching step/start event`);
                }
                nextStepStart = undefined;
                break;
            default:
                break;
        }
        const plan = isSurfaceEvent(event)
            ? planSurfaceTokens(state.surface, event)
            : undefined;
        if (event.type === 'assistant/message') {
            const stepStart = state.stepStart;
            if (stepStart === undefined
                || stepStart.turn !== event.data.turn
                || stepStart.step !== event.data.step) {
                throw new Error(`token meter: assistant/message at seq ${event.seq} has no matching step/start event`);
            }
            // assistant/message is surface-mandatory at every append/seed boundary.
            // oxlint-disable-next-line typescript/no-non-null-assertion
            const eventTokens = plan.tokens;
            // The loop admits prompts and user messages after step/start; retries may
            // replace them before succeeding. Only the pre-assistant surface is priced
            // by this call. Provider output stays separate from durable output rewrites.
            if (event.data.usage !== undefined && nextHeader !== undefined) {
                nextAnchor = {
                    header: nextHeader,
                    nodes: [...state.surface],
                    assistantTokens: this._estimateProviderAssistant(event),
                    usage: event.data.usage,
                };
            }
            else {
                nextAnchor = {
                    header: nextHeader,
                    nodes: [...state.surface],
                    assistantTokens: eventTokens,
                    usage: undefined,
                };
            }
        }
        state.header = nextHeader;
        state.stepStart = nextStepStart;
        if (plan !== undefined) {
            commitSurfaceTokens(state.surface, plan);
        }
        state.anchor = nextAnchor;
    }
    /**
     * Reassemble provider output from the message's exact embedded stream.
     */
    _estimateProviderAssistant(event) {
        const providerContent = assembleAssistantStream(event.data.stream).blocks();
        return providerContent.length === 0 ? 0 : estimateContent(providerContent) + ROLE_OVERHEAD;
    }
}
export default TokenMeter;
//# sourceMappingURL=index.js.map