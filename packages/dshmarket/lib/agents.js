/**
 * Optional host-provided agent inventory: lets the market refuse plugin
 * mutations while a live agent is mid-turn. Mutating `node_modules` under a
 * running agent replaces files the running plugin modules may still read or
 * lazily import — the update "succeeds" while old code and new files mix.
 */
/**
 * Ids of the host's currently running agents, or [] when the host has no
 * agents service. Only a positive `status === 'running'` blocks an update —
 * unknown statuses are treated as not running, so a future agent
 * implementation with different wording fails open (the market stays
 * usable) instead of wedging the plugin page.
 */
export function runningAgentIds(agents) {
    if (agents === undefined)
        return [];
    let listed;
    try {
        listed = agents.list();
    }
    catch {
        // A half-disposed registry must never take the market's routes down.
        return [];
    }
    if (!Array.isArray(listed))
        return [];
    const ids = [];
    for (const agent of listed) {
        if (agent === null || typeof agent !== 'object' || agent.status !== 'running')
            continue;
        const id = typeof agent.id === 'string' && agent.id !== '' ? agent.id : 'agent';
        if (!ids.includes(id))
            ids.push(id);
    }
    return ids;
}
