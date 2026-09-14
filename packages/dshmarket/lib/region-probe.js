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
import { logEvent } from "./log.js";
import { marketFetch } from "./net.js";
import { REGIONS, routesFor } from "./regions.js";
/**
 * What to ask each registry for.
 *
 * The market's own package: present on every npm mirror worth using, and
 * small — the `latest` document is a few KB, against ~320KB for the full
 * packument. A probe that downloads a third of a megabyte to answer "which
 * of these is closer" has spent more than the answer is worth.
 */
const PROBE_PATH = 'dshmarket/latest';
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
export async function probeRegion(timeoutMs = 2500, env = process.env) {
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); }, timeoutMs);
    const ask = async (region) => {
        const base = routesFor(region, env).npmRegistry;
        const res = await marketFetch(`${base}/${PROBE_PATH}`, {
            signal: controller.signal,
            headers: { accept: 'application/json', 'user-agent': 'dsh-market' },
        });
        if (!res.ok)
            throw new Error(`HTTP ${String(res.status)}`);
        // Read the body before declaring a winner. Headers can arrive from a
        // captive portal or a proxy that then stalls, and a region chosen on a
        // response that never finished would be chosen on nothing.
        await res.arrayBuffer();
        return region;
    };
    try {
        return await Promise.any(REGIONS.map(ask));
    }
    catch {
        return 'global';
    }
    finally {
        clearTimeout(timer);
        // Stop the losers. Their answer can no longer change anything, and a
        // request left running past the decision is a request nobody will read.
        controller.abort();
    }
}
/**
 * The region to run under, probing only if nothing has ever decided one.
 *
 * @param stored - the region already on record, or undefined.
 * @returns the region, and whether this call decided it (which is what earns
 *   the user a one-time notice explaining the choice).
 */
export async function resolveRegion(stored, timeoutMs, env) {
    if (stored !== undefined)
        return { region: stored, probed: false };
    const region = await probeRegion(timeoutMs, env);
    logEvent('info', 'region', `no region on record; network check chose ${region}`);
    return { region, probed: true };
}
