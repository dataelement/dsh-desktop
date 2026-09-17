/** Package-owned workflow lifecycle invariants. @module @deepseek-ai/dsh-workflow/invariant */
const PACKAGE_NAME = '@deepseek-ai/dsh-workflow';
/** Cordis companion plugin name. */
export const name = 'workflow-invariant';
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants'];
/** Require every event for a run to retain its validated identity snapshot. */
function traceFor(traces, info, fail) {
    const trace = traces.get(info.id);
    if (trace === undefined)
        fail(`workflow event has no matching workflow/start for run ${JSON.stringify(info.id)}`);
    if (trace.meta !== JSON.stringify(info.meta)) {
        fail(`workflow event meta diverges from workflow/start for run ${JSON.stringify(info.id)}`);
    }
    return trace;
}
/** Assert the immutable identity fields shared by an agent pair. */
function validateAgentEnd(start, end, fail) {
    if (start.label !== end.label || start.phase !== end.phase || start.childId !== end.childId) {
        fail(`workflow/agent-end identity diverges from workflow/agent-start for seq ${end.seq}`);
    }
    const outcome = end.outcome;
    if (outcome !== 'completed' && outcome !== 'failed' && outcome !== 'cancelled') {
        fail(`workflow/agent-end carries unknown outcome ${JSON.stringify(outcome)}`);
    }
}
/** Validate a terminal result against the accumulated run trace. */
function validateWorkflowEnd(trace, result, fail) {
    if (trace.agents.size > 0)
        fail(`workflow/end has ${trace.agents.size} agent call(s) without workflow/agent-end`);
    if (!Number.isSafeInteger(result.agentsStarted) || result.agentsStarted < trace.starts) {
        fail('workflow/end agentsStarted must be a safe integer covering every observed agent start');
    }
    if (result.stopReason === 'completed' ? result.error !== undefined : typeof result.error !== 'string') {
        fail('workflow/end error must be absent exactly for completed runs');
    }
}
/** Install workflow start/end and child-call pairing checks. */
const install = (ctx, fail) => {
    const traces = new Map();
    const stagedStarts = new WeakSet();
    const stagedAgentStarts = new WeakSet();
    const stagedAgentEnds = new WeakSet();
    const stagedEnds = new WeakSet();
    ctx.on('internal/dispatch', (_mode, eventName, args) => {
        if (eventName === 'workflow/start') {
            const info = args[0];
            if (String(info.id).length === 0 || info.meta.name.length === 0 || info.meta.description.length === 0) {
                fail('workflow/start id, meta.name, and meta.description must be non-empty');
            }
            if (traces.has(info.id))
                fail(`workflow/start repeated run id ${JSON.stringify(info.id)}`);
            stagedStarts.add(info);
            return;
        }
        if (!eventName.startsWith('workflow/'))
            return;
        const info = args[0];
        const trace = traceFor(traces, info, fail);
        if (eventName === 'workflow/agent-start') {
            const agent = args[1];
            if (!Number.isSafeInteger(agent.seq) || agent.seq < 1 || String(agent.childId).length === 0) {
                fail('workflow/agent-start seq must be positive and childId must be non-empty');
            }
            if (trace.agents.has(agent.seq))
                fail(`workflow/agent-start repeated seq ${agent.seq}`);
            stagedAgentStarts.add(agent);
            return;
        }
        if (eventName === 'workflow/agent-end') {
            const agent = args[1];
            const start = trace.agents.get(agent.seq);
            if (start === undefined)
                return fail(`workflow/agent-end has no matching start for seq ${agent.seq}`);
            validateAgentEnd(start, agent, fail);
            stagedAgentEnds.add(agent);
            return;
        }
        if (eventName === 'workflow/end') {
            const result = args[1];
            validateWorkflowEnd(trace, result, fail);
            stagedEnds.add(result);
        }
    }, { global: true });
    ctx.on('workflow/start', (info) => {
        /* v8 ignore next -- internal/dispatch stages the same run-info object */
        if (!stagedStarts.delete(info))
            return;
        traces.set(info.id, { meta: JSON.stringify(info.meta), agents: new Map(), starts: 0 });
    }, { global: true });
    ctx.on('workflow/agent-start', (info, agent) => {
        /* v8 ignore next -- internal/dispatch stages the same agent object */
        if (!stagedAgentStarts.delete(agent))
            return;
        const trace = traceFor(traces, info, fail);
        trace.agents.set(agent.seq, agent);
        trace.starts += 1;
    }, { global: true });
    ctx.on('workflow/agent-end', (info, agent) => {
        /* v8 ignore next -- internal/dispatch stages the same agent object */
        if (!stagedAgentEnds.delete(agent))
            return;
        traceFor(traces, info, fail).agents.delete(agent.seq);
    }, { global: true });
    ctx.on('workflow/end', (info, result) => {
        /* v8 ignore next -- internal/dispatch stages the same result object */
        if (!stagedEnds.delete(result))
            return;
        traces.delete(info.id);
    }, { global: true });
};
/**
 * Register the workflow invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//# sourceMappingURL=invariant.js.map