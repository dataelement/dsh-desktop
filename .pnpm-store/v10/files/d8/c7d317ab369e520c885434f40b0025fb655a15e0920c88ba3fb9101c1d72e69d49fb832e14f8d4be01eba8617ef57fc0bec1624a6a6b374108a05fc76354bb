/** Durable model-selection intent and request-use projection. */
import { z } from 'zod';
const modelSelectionSchema = z.object({
    provider: z.string().min(1),
    model: z.string().min(1),
    reasoningEffort: z.string().min(1).optional(),
});
const modelSelectionProjectionStateSchema = z.object({
    lastUsed: modelSelectionSchema.nullable(),
    pending: modelSelectionSchema.nullable(),
});
const modelSelectionProjectionSchema = z.object({
    lastUsed: modelSelectionSchema.nullable(),
    next: modelSelectionSchema.nullable(),
});
/**
 * Advance durable model-selection state by one Session event.
 * @param state - selection state before the event.
 * @param event - next committed Session event.
 * @returns the original or advanced selection state.
 */
function applyModelSelectionProjection(state, event) {
    if (event.type === 'model/selection') {
        return sameSelection(state.pending, event.data)
            ? state
            : { lastUsed: state.lastUsed, pending: event.data };
    }
    if (event.type !== 'request/header')
        return state;
    const lastUsed = {
        provider: event.data.header.config.provider,
        model: event.data.header.config.model,
        ...(event.data.header.config.reasoningEffort === undefined
            ? {}
            : { reasoningEffort: String(event.data.header.config.reasoningEffort) }),
    };
    const pending = sameSelection(state.pending, lastUsed) ? null : state.pending;
    return sameSelection(state.lastUsed, lastUsed) && pending === state.pending
        ? state
        : { lastUsed, pending };
}
const modelSelectionProjection = {
    key: 'modelSelection',
    stateSchema: modelSelectionProjectionStateSchema,
    init: () => ({ lastUsed: null, pending: null }),
    apply: applyModelSelectionProjection,
    wire: {
        viewSchema: modelSelectionProjectionSchema,
        view: state => ({ lastUsed: state.lastUsed, next: state.pending ?? state.lastUsed }),
    },
    stateVersion: 2,
};
function sameSelection(left, right) {
    return left === right || (left !== null && right !== null
        && left.provider === right.provider
        && left.model === right.model
        && left.reasoningEffort === right.reasoningEffort);
}
/**
 * Register the durable model-selection projection when the registry is present.
 * @param ctx - Session Controller context.
 */
export function installModelSelectionProjection(ctx) {
    ctx.sessionProjections.register(modelSelectionProjection);
}
//# sourceMappingURL=model-selection-projection.js.map