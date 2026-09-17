/**
 * Positional pricing shared by measurement and the context-breakdown fold:
 * measurement retains attachment details for route pricing; breakdown keeps
 * only retained node identities, heuristic prices, and system classification.
 * The occupancy projection uses the scalar shadow-price protocol instead.
 *
 * The fold is a plan/commit pair: {@link planSurfaceTokens} runs every
 * fallible step read-only and {@link commitSurfaceTokens} mutates in place,
 * so a throw leaves the caller's state untouched and the same malformed
 * event fails identically on every retry.
 * Nodes also carry durable attachment occurrences and their structural prices,
 * so `measure()` can price the request representation sent to the model.
 *
 * @module @deepseek-ai/dsh-token-meter/surface-fold
 */
import { deriveEventMessage } from '@deepseek-ai/dsh-session';
import { estimateMessage, estimateStructuralBlock } from "./estimate.js";
/** Collect projected attachment occurrences and their structural prices. */
function collectProjectedAttachments(blocks, images, files) {
    let imageTokens = 0;
    let fileTokens = 0;
    for (const block of blocks) {
        if (block.type === 'image') {
            images.push(block.attachment);
            imageTokens += estimateStructuralBlock(block);
        }
        else if (block.type === 'file') {
            files.push(block.attachment);
            fileTokens += estimateStructuralBlock(block);
        }
        else if (block.type === 'tool-result') {
            const nested = collectProjectedAttachments(block.content, images, files);
            imageTokens += nested.imageTokens;
            fileTokens += nested.fileTokens;
        }
    }
    return { imageTokens, fileTokens };
}
/** Build one priced node from a surface event's derived message. */
function analyzeNode(seq, message) {
    if (message === null) {
        return {
            seq,
            heuristicTokens: 0,
            imageStructuralTokens: 0,
            fileStructuralTokens: 0,
            images: [],
            files: [],
        };
    }
    const heuristicTokens = estimateMessage(message);
    const images = [];
    const files = [];
    const structural = collectProjectedAttachments(message.content, images, files);
    return {
        seq,
        heuristicTokens,
        imageStructuralTokens: structural.imageTokens,
        fileStructuralTokens: structural.fileTokens,
        images,
        files,
    };
}
/**
 * Validate and price one surface event without mutating the surface.
 * @param nodes - the priced surface preceding this event, in model-visible order.
 * @param event - the surface event to place.
 * @returns the plan for {@link commitSurfaceTokens}.
 * @throws when a replacement names a range absent from `nodes` — committed
 *   logs are surface-validated at append time, so an unresolvable range is log
 *   corruption and must fail loud rather than skip the event.
 */
export function planSurfaceTokens(nodes, event) {
    const node = analyzeNode(event.seq, deriveEventMessage(event));
    const tokens = node.heuristicTokens;
    const op = event.surfaceOp;
    if (op === 'append') {
        return { tokens, deltaTokens: tokens, node, target: 'append' };
    }
    const startIdx = nodes.findIndex(candidate => candidate.seq === op.startSeq);
    const endIdx = nodes.findIndex(candidate => candidate.seq === op.endSeq);
    if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) {
        throw new Error(`token surface: replace at seq ${event.seq} has invalid current range ${op.startSeq}-${op.endSeq}`);
    }
    const removed = nodes
        .slice(startIdx, endIdx + 1)
        .reduce((total, candidate) => total + candidate.heuristicTokens, 0);
    return { tokens, deltaTokens: tokens - removed, node, target: { startIdx, endIdx } };
}
/**
 * Apply one validated plan to the priced surface in place; infallible, so it
 * cannot leave a half-applied surface behind.
 * @param nodes - the exact priced surface the plan was built against.
 * @param plan - the transition returned by {@link planSurfaceTokens}.
 */
export function commitSurfaceTokens(nodes, plan) {
    if (plan.target === 'append') {
        nodes.push(plan.node);
        return;
    }
    nodes.splice(plan.target.startIdx, plan.target.endIdx - plan.target.startIdx + 1, plan.node);
}
//# sourceMappingURL=surface-fold.js.map