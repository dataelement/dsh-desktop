/**
 * Read-only enumeration of durable subagent children and descendant trees
 * through the Session query service. Candidates come from one live-preferred
 * corpus; each child's mode/label is the registered `subagent` projection
 * unit's value, resolved
 * down a three-rung ladder: the registry's watermark cache for a live child,
 * an unseeded durable projection-cache row, and one shared Session observation
 * otherwise. A seeded header deliberately lacks its exact inherited cut, so
 * it takes the body-bearing observation path before classifying an identity.
 * The projection fold is the single classification
 * authority — this module parses no descriptor
 * itself. Absent persistence, enumeration is live-only: a cold child is
 * unreachable for resume anyway, so its absence is capability absence, not an
 * error. The module owns no catalog state and does not consult Activation,
 * Agent-registry, continuation-manager, or provider state.
 *
 * @module @deepseek-ai/dsh-subagent
 */
var __addDisposableResource = (this && this.__addDisposableResource) || function (env, value, async) {
    if (value !== null && value !== void 0) {
        if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
        var dispose, inner;
        if (async) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
        }
        if (dispose === void 0) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
            if (async) inner = dispose;
        }
        if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
        if (inner) dispose = function() { try { inner.call(this); } catch (e) { return Promise.reject(e); } };
        env.stack.push({ value: value, dispose: dispose, async: async });
    }
    else if (async) {
        env.stack.push({ async: true });
    }
    return value;
};
var __disposeResources = (this && this.__disposeResources) || (function (SuppressedError) {
    return function (env) {
        function fail(e) {
            env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
            env.hasError = true;
        }
        var r, s = 0;
        function next() {
            while (r = env.stack.pop()) {
                try {
                    if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
                    if (r.dispose) {
                        var result = r.dispose.call(r.value);
                        if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
                    }
                    else s |= 1;
                }
                catch (e) {
                    fail(e);
                }
            }
            if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
            if (env.hasError) throw env.error;
        }
        return next();
    };
})(typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
import { SessionLogOffset } from '@deepseek-ai/dsh-session';
import { SubagentError } from "./error.js";
/**
 * Concurrent cold observations per explicit catalog listing. Current Session
 * persistence providers are local; a networked provider must promote this to
 * a validated deployment setting.
 */
const COLD_READ_CONCURRENCY = 4;
/**
 * Enumerate one parent's origin-classified direct children from the
 * live-preferred merge of `ctx.sessions` and optional session persistence,
 * serving each identity from the `subagent` projection unit: the registry's
 * watermark snapshot for a live child; for a cold one, a durable
 * projection-cache read for an unseeded lifecycle, else one bounded-concurrency
 * shared Session observation carrying the exact inherited cut.
 * @see SubagentRuntime.listChildren for the public cancellation and failure contract.
 * @param ctx - context carrying the session store, the projection registry,
 *   optional persistence, and the optional projection cache.
 * @param parentSessionId - parent session whose direct children are listed.
 * @param signal - caller-owned cancellation observed around every persistence read.
 * @returns children and per-child diagnostics ordered by `createdAt`, then id.
 * @throws {@link SubagentError} when the projection registry or the session
 *   store is not mounted, or the caller cancels the listing.
 */
export async function listChildren(ctx, parentSessionId, signal) {
    const listing = await prepareListing(ctx, signal);
    const candidates = [...listing.corpus.values()]
        .filter(record => record.header.parentSession === parentSessionId
        && record.header.origin === 'subagent')
        .sort(compareCorpusRecords);
    const rows = await resolveCandidateRows(candidates, listing, signal);
    return rows.filter((row) => row !== undefined);
}
/**
 * Enumerate every session-backed subagent below one root in stable pre-order.
 * Ordinary sessions and one-shot children remain traversal nodes, so a
 * continuable child below either is still discovered. Classification uses the
 * same projection-backed runtime as {@link listChildren}; no Agent is loaded or
 * resumed.
 * @see SubagentRuntime.listDescendants for the public cancellation and failure contract.
 * @param ctx - context carrying the session store, projection registry, and optional persistence/cache.
 * @param rootSessionId - session whose complete descendant tree is listed.
 * @param signal - caller-owned cancellation observed around every persistence read.
 * @returns interpreted subagents with durable direct-parent and root-relative depth.
 * @throws {@link SubagentError} under the same conditions as {@link listChildren}.
 */
export async function listDescendants(ctx, rootSessionId, signal) {
    const listing = await prepareListing(ctx, signal);
    const positioned = descendantCandidates(listing.corpus, rootSessionId);
    const rows = await resolveCandidateRows(positioned.map(candidate => candidate.record), listing, signal);
    const entries = [];
    positioned.forEach((position, index) => {
        const row = rows[index];
        if (row !== undefined) {
            entries.push({ ...row, parentId: position.parentId, depth: position.depth });
        }
    });
    return entries;
}
/** Resolve listing services once and build one live-preferred session corpus. */
async function prepareListing(ctx, signal) {
    const projections = ctx.get('sessionProjections');
    // Checked before any read, even with zero candidates: mode/label are the
    // row's strong contract, so a missing fold capability is a deterministic
    // deployment configuration error, never an empty success.
    if (projections === undefined) {
        throw new SubagentError('listing subagents requires the sessionProjections registry (load @deepseek-ai/dsh-session-projection)', 'SUBAGENT_CONTROL_PROJECTIONS_UNAVAILABLE');
    }
    // Strict global read, never the `ctx.sessions` property proxy: the proxy is
    // caller-scope bound, so a consumer plugin without its own `sessions`
    // injection (the model-facing tool, the API proxy) would throw on access.
    const sessions = ctx.get('sessions');
    if (sessions === undefined) {
        throw new SubagentError('listing subagents requires the session store (load @deepseek-ai/dsh-session)', 'SUBAGENT_CONTROL_SESSION_STORE_UNAVAILABLE');
    }
    assertListingNotCancelled(signal);
    const query = ctx.get('sessionQuery');
    if (query === undefined) {
        throw new SubagentError('listing subagents requires the sessionQuery service (load @deepseek-ai/dsh-session-query)', 'SUBAGENT_CONTROL_QUERY_UNAVAILABLE');
    }
    // Optional acceleration only: an absent cache service just means every
    // cold candidate takes the authoritative preparation rung, so it carries
    // no error code and no configuration check.
    const cache = ctx.get('sessionProjectionCache');
    let records;
    try {
        records = await query.listSessions(signal);
    }
    catch (error) {
        assertListingNotCancelled(signal);
        throw error;
    }
    assertListingNotCancelled(signal);
    // Live-preferred merge without header reconciliation: a live record wins
    // its id wholesale, exactly as a live-preferred corpus would serve it.
    const corpus = new Map();
    for (const record of records) {
        const live = sessions.get(record.header.id);
        corpus.set(record.header.id, {
            header: live?.header ?? record.header,
            live,
        });
    }
    const subagentParents = new Set();
    for (const record of corpus.values()) {
        if (record.header.origin === 'subagent' && record.header.parentSession !== undefined) {
            subagentParents.add(record.header.parentSession);
        }
    }
    return { projections, query, cache, corpus, subagentParents };
}
/** Resolve projection-backed rows for aligned candidates with bounded cold reads. */
async function resolveCandidateRows(candidates, listing, signal) {
    const { projections, query, cache, subagentParents } = listing;
    const rows = Array.from({ length: candidates.length });
    const coldReads = [];
    candidates.forEach((candidate, index) => {
        const childId = candidate.header.id;
        if (candidate.live === undefined) {
            coldReads.push({ index, header: candidate.header });
            return;
        }
        // Read only the identity unit. A live child without an identity yet is the
        // creation window before the establishing provider appends its descriptor.
        let identity;
        try {
            identity = projections.snapshot(candidate.live, ['subagent']).values.subagent;
        }
        catch {
            // A rejecting identity fold is deterministic data damage in this child;
            // contain it as one diagnostic instead of failing the whole listing.
            rows[index] = { kind: 'diagnostic', id: childId, reason: 'corrupt' };
            return;
        }
        // The unit's serializable no-value sentinel is `null`; `undefined` can
        // only mean the key was dropped at a JSON boundary. Both are no value.
        if (identity === undefined || identity === null
            || !candidate.live.isOwnSeq(identity.seq))
            return;
        rows[index] = childRow(childId, identity, 'running', subagentParents.has(childId));
    });
    // Cold candidates came from the query corpus and are resolved concurrently.
    if (coldReads.length > 0) {
        const queue = [...coldReads];
        await Promise.all(Array.from({ length: Math.min(COLD_READ_CONCURRENCY, queue.length) }, async () => {
            for (let job = queue.shift(); job !== undefined; job = queue.shift()) {
                rows[job.index] = await resolveColdIdentity(query, cache, job.header, subagentParents.has(job.header.id), signal);
            }
        }));
    }
    assertListingNotCancelled(signal);
    return rows;
}
/** Build origin-classified candidates from the complete tree without recursion. */
function descendantCandidates(corpus, rootSessionId) {
    const children = new Map();
    for (const record of corpus.values()) {
        const parentId = record.header.parentSession;
        if (parentId === undefined)
            continue;
        const siblings = children.get(parentId);
        if (siblings === undefined)
            children.set(parentId, [record]);
        else
            siblings.push(record);
    }
    for (const siblings of children.values())
        siblings.sort(compareCorpusRecords);
    const positioned = [];
    const stack = (children.get(rootSessionId) ?? [])
        .map(record => ({ record, parentId: rootSessionId, depth: 1 }))
        .reverse();
    const visited = new Set([rootSessionId]);
    while (stack.length > 0) {
        // The length guard proves one frame exists.
        // oxlint-disable-next-line typescript/no-non-null-assertion
        const position = stack.pop();
        const id = position.record.header.id;
        if (visited.has(id))
            continue;
        visited.add(id);
        if (position.record.header.origin === 'subagent')
            positioned.push(position);
        const descendants = children.get(id) ?? [];
        for (const record of [...descendants].reverse()) {
            stack.push({ record, parentId: id, depth: position.depth + 1 });
        }
    }
    return positioned;
}
/** Compare siblings by durable creation time, then id. */
function compareCorpusRecords(a, b) {
    return a.header.createdAt - b.header.createdAt || a.header.id.localeCompare(b.header.id);
}
/**
 * Resolve one cold candidate down the remaining ladder: an unseeded durable
 * projection-cache row, otherwise one shared Session observation. An absent or transiently failed
 * observation is one `unavailable` row retried on the next listing; an observation
 * source naming another lifecycle, and a
 * settled log the fold cannot identify — or that makes any registered unit
 * throw — are final, so they report `corrupt`.
 */
async function resolveColdIdentity(query, cache, header, hasChildren, signal) {
    const env_1 = { stack: [], error: void 0, hasError: false };
    try {
        const childId = header.id;
        // A header deliberately exposes only whether a fork cut exists, not its
        // integer. An unseeded lifecycle has the exact cut 0 and may use the cache;
        // a seeded lifecycle must read the body before an identity seq can be
        // classified as inherited or owned.
        if (cache !== undefined && !header.isSeeded) {
            let cached;
            try {
                cached = cache.cachedSnapshot(header, SessionLogOffset(0), ['subagent'])?.values.subagent;
            }
            catch {
                // Unlike the preparation fold below, a throwing cache read renders no
                // verdict: the cache is derived data, so its damage (a poisoned stored
                // row of ANY unit) silently falls through to the authoritative re-fold.
                cached = undefined;
            }
            // An unseeded child's descriptor is owned at every valid seq. Everything
            // else falls through to preparation: an absent key and the `null`
            // sentinel, whose verdict belongs to the authoritative re-fold, not to a
            // derived row.
            if (cached !== undefined && cached !== null) {
                return childRow(childId, cached, 'inactive', hasChildren);
            }
        }
        assertListingNotCancelled(signal);
        let observation;
        try {
            observation = await query.observeSession(childId, {
                ...(signal === undefined ? {} : { signal }),
            });
        }
        catch (error) {
            // Per-child isolation: durable corruption is stable; absence and backend
            // failures remain retryable. Either way, the listing itself still succeeds.
            assertListingNotCancelled(signal);
            return {
                kind: 'diagnostic',
                id: childId,
                reason: sessionQueryCode(error) === 'SESSION_QUERY_CORRUPT_SESSION'
                    || sessionQueryCode(error) === 'SESSION_QUERY_SOURCE_CONFLICT'
                    ? 'corrupt'
                    : 'unavailable',
            };
        }
        const ownedObservation = __addDisposableResource(env_1, observation, false);
        assertListingNotCancelled(signal);
        // A session id names a slot, not a lifecycle: a child deleted and
        // re-published under another owner between the enumeration and this read
        // must not leak into the old parent's listing.
        if (!sameLifecycle(ownedObservation.header, header)) {
            return { kind: 'diagnostic', id: childId, reason: 'corrupt' };
        }
        const identity = ownedObservation.projections?.values.subagent;
        if (identity === undefined || identity === null
            || identity.seq < ownedObservation.inheritedEventCount) {
            return { kind: 'diagnostic', id: childId, reason: 'corrupt' };
        }
        return childRow(childId, identity, 'inactive', hasChildren);
    }
    catch (e_1) {
        env_1.error = e_1;
        env_1.hasError = true;
    }
    finally {
        __disposeResources(env_1);
    }
}
/** Materialize one served identity as its child row. */
function childRow(id, identity, activity, hasChildren) {
    return identity.mode === 'one-shot'
        ? {
            kind: 'child',
            id,
            mode: 'one-shot',
            ...identity.label !== undefined ? { label: identity.label } : {},
            activity,
            hasChildren,
        }
        : {
            kind: 'child',
            id,
            mode: 'continuable',
            label: identity.label,
            activity,
            hasChildren,
        };
}
/** Immutable header fields that distinguish one session lifecycle from another under the same id. */
const LIFECYCLE_WITNESS_KEYS = [
    'version', 'id', 'createdAt', 'cwd', 'parentSession', 'isSeeded', 'delegationDepth',
    'origin', 'agentPreset',
];
/** Whether an inspected log still belongs to the enumerated lifecycle. */
function sameLifecycle(meta, expected) {
    return LIFECYCLE_WITNESS_KEYS.every(key => meta[key] === expected[key]);
}
/** Stop a listing at its next cancellation checkpoint. */
function assertListingNotCancelled(signal) {
    if (signal?.aborted) {
        throw new SubagentError('subagent listing was cancelled', 'CANCELLED');
    }
}
function sessionQueryCode(error) {
    return error instanceof Error && 'code' in error ? error.code : undefined;
}
//# sourceMappingURL=list-children.js.map