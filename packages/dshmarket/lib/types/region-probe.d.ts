/**
 * Deciding a download region by asking the network, once.
 *
 * The alternative was reading the system time zone, and it is wrong for
 * exactly the people who most need this to work: someone in Shanghai behind
 * a corporate proxy or a VPN reaches the official registry perfectly well
 * and would be routed onto mirrors they do not need, while a Chinese-locale
 * machine sitting in Singapore would be routed onto mirrors that are further
 * away than the origin. A time zone says where a clock is. It does not say
 * what the network can reach, which is the only question here.
 *
 * So the probe measures the thing itself: it asks both registries for the
 * same small document and takes whichever answers first. That is
 * self-correcting in a way a lookup table cannot be — the machine behind the
 * proxy measures fast official access and stays global, without anyone
 * having to enumerate the exceptions.
 *
 * It runs ONCE, when no region has ever been decided, and its answer is
 * persisted as the decision. Re-probing every boot would let a market
 * silently change routes between runs, which is the kind of behaviour that
 * makes "it was fast yesterday" impossible to debug.
 */
import { type Region } from './regions.ts';
/**
 * Ask every region's registry the same question; return whichever answers
 * first.
 *
 * First-past-the-post rather than a latency comparison, deliberately. From
 * inside China the official registry usually does answer eventually, so
 * "did it fail" is the wrong test and "which came back first" is the right
 * one. From outside, the mainland mirror is reachable but further, and the
 * same rule picks global. One rule, both directions, no thresholds to tune.
 *
 * @param timeoutMs - how long to wait before giving up on all of them.
 * @param env - environment, for the registry overrides.
 * @returns the winning region, or `global` when nothing answered — an
 *   unreachable network is not evidence for switching routes.
 */
export declare function probeRegion(timeoutMs?: number, env?: NodeJS.ProcessEnv): Promise<Region>;
/**
 * The region to run under, probing only if nothing has ever decided one.
 *
 * @param stored - the region already on record, or undefined.
 * @returns the region, and whether this call decided it (which is what earns
 *   the user a one-time notice explaining the choice).
 */
export declare function resolveRegion(stored: Region | undefined, timeoutMs?: number, env?: NodeJS.ProcessEnv): Promise<{
    region: Region;
    probed: boolean;
}>;
