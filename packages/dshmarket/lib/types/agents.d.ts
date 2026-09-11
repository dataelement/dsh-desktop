/**
 * Optional host-provided agent inventory: lets the market refuse plugin
 * mutations while a live agent is mid-turn. Mutating `node_modules` under a
 * running agent replaces files the running plugin modules may still read or
 * lazily import — the update "succeeds" while old code and new files mix.
 */
export interface RunningAgentLike {
    id?: unknown;
    status?: unknown;
}
export interface AgentsServiceLike {
    list(): RunningAgentLike[];
}
export type AgentsLookup = () => AgentsServiceLike | undefined;
/**
 * Ids of the host's currently running agents, or [] when the host has no
 * agents service. Only a positive `status === 'running'` blocks an update —
 * unknown statuses are treated as not running, so a future agent
 * implementation with different wording fails open (the market stays
 * usable) instead of wedging the plugin page.
 */
export declare function runningAgentIds(agents: AgentsServiceLike | undefined): string[];
