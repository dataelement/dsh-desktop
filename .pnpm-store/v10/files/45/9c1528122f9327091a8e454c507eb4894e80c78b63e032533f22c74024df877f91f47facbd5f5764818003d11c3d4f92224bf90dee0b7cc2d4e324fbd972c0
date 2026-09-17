import { Service } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import { snapshotJsonValue } from "@deepseek-ai/dsh-util-values";
import { SessionLogOffset, SessionSeq } from "@deepseek-ai/dsh-session";
import { z as z$1 } from "zod";
import { defineDomain, domainTable } from "@deepseek-ai/dsh-storage-domain";
//#region lib/types/spec.js
/**
* The projection-cache domain declaration: one `sessions` table keyed by
* {@link SessionId}, each record the full projection checkpoint for one
* session (`key → {ver, seq, val}` rows). The spec object is the single
* source of the domain's identity, version, layout, and record schema; the
* storage-domain routing decides the medium (the shipped composition's json
* backend stores the domain `per-record`: one document per session under
* `<root>/session_projcache/sessions/`, so a checkpoint write rewrites one
* session's document instead of the whole unit).
* @module @deepseek-ai/dsh-session-projection-cache/src/spec
*/
/**
* One persisted checkpoint row (the RFC's `(sessionId, key, ver, seq, val)`
* minus the two record keys). `val` is the unit's internal state — plain
* JSON by the unit contract; `z.json()` enforces that at the durable
* boundary. A row is never wrong, only possibly stale: `seq` says exactly
* how stale, and a `ver` mismatch against the live unit's `stateVersion`
* discards it at read time (never a migration).
*/
const checkpointRow = z$1.object({
	ver: z$1.number().int().nonnegative(),
	seq: z$1.number().int().gte(-1).transform((value) => value === -1 ? -1 : SessionSeq(value)),
	val: z$1.json()
});
/**
* The stored-log identity a record is bound to: the immutable header fields
* that distinguish one session lifecycle from another under the same id. A
* session id names a slot, not a lifecycle — a deleted-then-recreated id, or
* a persistence root swapped under a surviving cache, would otherwise let an
* old record pass every watermark check and seed state folded from an
* unrelated log. Reads validate this against the live header (listing) or
* the stored header (cold read) before accepting any record.
*
* The format and lineage fields are optional because records admitted through
* `compatibleVersions` predate them. The reader (`identityMatches`) refuses an
* absent format generation because no current Session log can prove that
* record's fold semantics. It interprets absent lineage as unseeded only after
* the format generation matches. Current-version writes always store all three
* fields.
*/
const checkpointIdentity = z$1.object({
	formatVersion: z$1.number().int().nonnegative().optional(),
	createdAt: z$1.number().int().nonnegative(),
	cwd: z$1.string().optional(),
	isSeeded: z$1.boolean().optional(),
	inheritedEventCount: z$1.number().int().nonnegative().transform(SessionLogOffset).optional()
});
/**
* One session's stored record: the log identity it was folded from plus its
* checkpoint rows keyed by projection key. The whole record is replaced on
* every write (whole-value discipline — the registry checkpoint is always
* the complete per-session cut).
*/
const checkpointRecord = z$1.object({
	identity: checkpointIdentity,
	rows: z$1.record(z$1.string(), checkpointRow)
});
/**
* The session-projcache domain spec. The `per-record` layout scopes version
* bumps per session: after a bump, a stale session document is discarded on
* open (cache semantics — a stale or unreadable cache costs a longer tail
* replay, never a wrong value) while the rest of the domain stays usable,
* instead of rejecting the whole medium. The `compatibleVersions` entries
* keep structurally valid predecessor records available for a later current
* checkpoint rewrite. Records without `formatVersion` remain unusable as fold
* shortcuts because they cannot prove which Session event semantics produced
* their rows; the per-record version map and disposition live in the read-compat Agent Note
* (.agents/notes/implemented/architecture/2026-09-02-projcache-cross-version-read-compat.md).
* The per-row `ver` guard and the identity match still discard anything the
* current fold semantics cannot vouch for.
*
* A lifecycle-matching predecessor may still expose its version-compatible
* title through the cache service's listing-only hint; this never relaxes the
* format requirement for hydration or another fold shortcut.
*
* `invalidRecords: 'backup-and-skip'`: a stored record that fails the schema
* anyway is disposable derived data, so it must never cost the boot — the
* domain layer moves the document aside as `<key>.json.bak.<stamp>`, logs
* the concrete validation failure, and serves the session as uncached (a
* cold read rebuilds and rewrites it).
*/
const projectionCacheDomainSpec = defineDomain({
	name: "session_projcache",
	version: 7,
	compatibleVersions: [
		3,
		4,
		5,
		6
	],
	invalidRecords: "backup-and-skip",
	layout: "per-record",
	tables: { sessions: domainTable(checkpointRecord) }
});
//#endregion
//#region lib/types/index.js
/**
* Persisted projection cache (`ctx.sessionProjectionCache`): durable
* checkpoints of every projection unit's state, one record per session on
* the `session_projcache` domain (`per-record` layout — the shipped json
* backend stores one document per session under its root). Reads and writes
* share ONE coherent state: the domain's in-memory tables serve every read
* synchronously, and each write lands on the domain's write chain (durability
* first, then memory), so a read can never observe a disk write the memory
* has not applied, or a memory value the disk does not hold. The cache is a
* fold shortcut, never an authority: a row
* is possibly stale (its `seq` says how stale) but never wrong, so every
* write path is fail-soft (a lost write costs a longer tail replay on the
* next cold read) and a `ver` mismatch discards the row instead of migrating
* it. Design authority: the session-projection RFC
* (.agents/notes/proposed/architecture/2026-07-27-session-projection-and-command-log.md).
* @module @deepseek-ai/dsh-session-projection-cache
*/
const PREDECESSOR_TITLE_KEY = "title";
const Config = z.object({
	writeEveryEvents: z.natural().min(1).required(),
	writeIntervalMs: z.natural().min(1).required()
});
/**
* The persisted projection cache service. Opens the `session_projcache`
* domain at init, checkpoints live sessions on a throttled write-behind
* (count/interval triggers from {@link Config}) plus three mandatory points —
* session creation, `turn/end`, and session disposal (the live-to-cold
* moment) — and serves the
* cached rows for a session header. Every durable write is fail-soft:
* failures log a warning and the cache self-heals on the next write.
*/
var SessionProjectionCache = class extends Service {
	config;
	static inject = [
		"storageDomain",
		"sessionProjections",
		"sessions"
	];
	static Config = Config;
	table;
	dirty = /* @__PURE__ */ new Map();
	constructor(ctx, config) {
		super(ctx, "sessionProjectionCache");
		this.config = config;
	}
	/** Open the domain and install the write-behind listeners. */
	async [Service.init]() {
		const domain = await this.ctx.storageDomain.open(projectionCacheDomainSpec);
		this.ctx.effect(() => () => domain.close(), "sessionProjectionCache.domainClose");
		this.table = domain.table("sessions");
		this.installWritePath();
	}
	/**
	* The stored record for one session, accepted only when its bound log
	* identity matches `expected`. A session id names a slot, not a lifecycle:
	* a recreated id or a persistence store swapped under a surviving cache
	* must not let an old record seed state folded from an unrelated log.
	* Synchronous from the domain's in-memory state — the same state every
	* write mutated, so a read can never go around the write chain to the
	* medium.
	* @param id - the session whose record is read.
	* @param expected - the log identity the caller holds (live or stored header).
	* @returns the identity-matching record, or `undefined` (absent or unrelated).
	*/
	recordFor(id, expected) {
		const record = this.requireTable().get(id);
		if (record === void 0) return void 0;
		return identityMatches(record.identity, expected) ? record : void 0;
	}
	/**
	* The zero-I/O listing read: whole values viewed straight from the stored
	* rows (version-matching keys only), each cut carried with its watermark so
	* a client value store can seed under its higher-seq-wins rule — as stale
	* as the last durable checkpoint but never wrong, and never from an
	* unrelated log (the caller's header is the identity witness). Fresher
	* paths (the history tail baseline) supersede these values whenever a
	* session is actually opened.
	* @param meta - the listed session's header (identity witness; no log read).
	* @param inheritedEventCount - exact inherited prefix length that completes
	* the checkpoint identity.
	* @param keys - optional projection keys required by the caller's audience.
	* @returns the cut (`asOfSeq` = lowest served-row watermark), or
	*   `undefined` when no usable row exists for this lifecycle.
	*/
	cachedSnapshot(meta, inheritedEventCount, keys) {
		const record = this.recordFor(meta.id, identityOf(meta, inheritedEventCount));
		if (record === void 0) return void 0;
		return this.viewRecord(record, keys);
	}
	/**
	* Read only a predecessor checkpoint's title as a zero-I/O listing hint.
	*
	* The authoritative Session header supplies the lifecycle identity. A cache
	* checkpoint can lag that log but cannot lead it because writes flush the
	* log first, so a matching predecessor title is a genuine (possibly stale)
	* fact from this Session. The registry still requires the current title
	* projection's row version and schema. No other predecessor projection is
	* exposed: format normalization can change their current meaning, and the
	* strict {@link cachedSnapshot} / hydration paths continue to reject them.
	* @param meta - authoritative listed Session header.
	* @param inheritedEventCount - exact inherited cut completing the lifecycle identity.
	* @returns a title-only checkpoint view with `asOfSeq: -1`, or `undefined`
	*   when the record is current, newer, unrelated, missing, or incompatible
	*   with the title unit. The sentinel avoids reusing a sequence that a
	*   cardinality-changing Session migration may have remapped.
	*/
	cachedPredecessorTitle(meta, inheritedEventCount) {
		const expected = identityOf(meta, inheritedEventCount);
		const record = this.requireTable().get(meta.id);
		if (record === void 0 || !predecessorIdentityMatches(record.identity, expected)) return void 0;
		const title = this.viewRecord(record, [PREDECESSOR_TITLE_KEY]);
		return title === void 0 ? void 0 : {
			...title,
			asOfSeq: -1
		};
	}
	/** View selected wire rows and bind them to their lowest served watermark. */
	viewRecord(record, keys) {
		const values = this.ctx.sessionProjections.viewCheckpoint(record.rows, keys);
		const servedKeys = Object.keys(values);
		if (servedKeys.length === 0) return void 0;
		const firstKey = servedKeys[0];
		let asOfSeq = record.rows[firstKey].seq;
		for (const key of servedKeys.slice(1)) {
			const row = record.rows[key];
			if (row.seq < asOfSeq) asOfSeq = row.seq;
		}
		return {
			asOfSeq,
			values
		};
	}
	/**
	* Hydrate projection cells for an already-prepared Session without another
	* persistence read. The cache seeds matching rows; the supplied exact log
	* advances every unit to the observation cut. No checkpoint is written
	* because the logical observation may contain recovery events not yet durable.
	* @param session - exact unpublished Session retained by persistence.
	* @param events - exact logical event prefix represented by the observation.
	* @returns all projection values at the event cut.
	*/
	hydratePrepared(session, events) {
		const record = this.recordFor(session.id, identityOf(session.header, session.inheritedEventCount));
		if (record === void 0) return this.ctx.sessionProjections.hydrate(session, {}, events, SessionLogOffset(0));
		try {
			return this.ctx.sessionProjections.hydrate(session, record.rows, events, SessionLogOffset(0));
		} catch {
			return this.ctx.sessionProjections.hydrate(session, {}, events, SessionLogOffset(0));
		}
	}
	/**
	* Durably checkpoint one live session NOW (all mandatory points call
	* this; tests and carriers may too). The registry cut is snapshotted at
	* this boundary (states are live references), then the session's record is
	* replaced on the domain's write chain. NOT fail-soft — callers on the
	* fail-soft paths contain it.
	* @param session - the live session to checkpoint.
	* @returns resolution after durability and event emission.
	*/
	async write(session) {
		const rows = this.ctx.sessionProjections.checkpoint(session);
		this.markClean(session);
		if (this.ctx.sessions.get(session.id) === session) await this.ctx.sessions.flush(session);
		await this.put(session.id, identityOf(session.header, session.inheritedEventCount), rows);
	}
	/**
	* Cold-read one session's projections from its complete log. Each unit is
	* seeded from the identity-checked cached rows — the registry skips `apply`
	* for the already-folded prefix (events at or below the row's `seq`) — and
	* the refreshed checkpoint is written back (fail-soft, fire-and-forget), so
	* the first cold read creates the cache row and later ones seed from it.
	* The caller supplies the complete log in seq order: this service never
	* consults the persistence layer.
	* @param meta - the stored session header (identity witness).
	* @param inheritedEventCount - exact inherited prefix length for projection initialization and identity.
	* @param events - the session's complete log, in seq order.
	* @returns the projection cut at the log end.
	*/
	coldSnapshot(meta, inheritedEventCount, events) {
		const identity = identityOf(meta, inheritedEventCount);
		const restored = this.ctx.sessionProjections.restore(this.recordFor(meta.id, identity)?.rows ?? {}, events, SessionLogOffset(0), meta, inheritedEventCount);
		this.put(meta.id, identity, restored.checkpoint).catch((error) => {
			this.ctx.logger.warn(`session projection cache: cold-read write-back for "${meta.id}" failed (cache stays stale): ${String(error)}`);
		});
		return restored.snapshot;
	}
	installWritePath() {
		this.ctx.on("session/event", (session, event) => {
			if (event.type === "turn/end") {
				this.flushSoft(session, "turn/end");
				return;
			}
			const state = this.dirty.get(session) ?? {
				pending: 0,
				timer: void 0
			};
			this.dirty.set(session, state);
			state.pending += 1;
			if (state.pending >= this.config.writeEveryEvents) {
				this.flushSoft(session, "count threshold");
				return;
			}
			state.timer ??= setTimeout(() => {
				this.flushSoft(session, "interval");
			}, this.config.writeIntervalMs);
		});
		this.ctx.on("session/created", (session) => {
			this.flushSoft(session, "create");
		});
		this.ctx.on("session/disposed", (session) => {
			this.flushSoft(session, "detach");
			this.markClean(session);
			this.dirty.delete(session);
		});
		this.ctx.effect(() => () => {
			for (const state of this.dirty.values()) if (state.timer !== void 0) clearTimeout(state.timer);
			this.dirty.clear();
		}, "sessionProjectionCache.timers");
	}
	/**
	* One fail-soft durable checkpoint. Every caller has work by construction:
	* the throttle triggers only fire dirty (markClean clears the timer with
	* the counter) and the mandatory points write unconditionally.
	*/
	async flushSoft(session, trigger) {
		try {
			await this.write(session);
		} catch (error) {
			this.ctx.logger.warn(`session projection cache: ${trigger} write for "${session.id}" failed (cache stays stale): ${String(error)}`);
		}
	}
	/** Reset one session's dirty bookkeeping (its checkpoint is being written). */
	markClean(session) {
		const state = this.dirty.get(session);
		if (state === void 0) return;
		state.pending = 0;
		if (state.timer !== void 0) {
			clearTimeout(state.timer);
			state.timer = void 0;
		}
	}
	/** Replace one session's stored record with its log identity and a detached snapshot of `rows`. */
	async put(id, identity, rows) {
		const detached = snapshotJsonValue(rows);
		if (detached === void 0) throw new TypeError("projection checkpoint is not losslessly JSON-serializable (a unit state violates the plain-JSON contract)");
		await this.requireTable().put(id, {
			identity,
			rows: detached
		});
	}
	requireTable() {
		/* v8 ignore next -- Service.init assigns the table before the service becomes injectable */
		if (this.table === void 0) throw new Error("session projection cache is not initialized");
		return this.table;
	}
};
/** Project a header onto the identity fields a record is bound to. */
function identityOf(header, inheritedEventCount) {
	const cut = SessionLogOffset(inheritedEventCount);
	if (!header.isSeeded && cut !== 0) throw new Error("unseeded projection-cache identity inherited event count must be 0");
	return {
		formatVersion: header.version,
		createdAt: header.createdAt,
		...header.cwd === void 0 ? {} : { cwd: header.cwd },
		isSeeded: header.isSeeded,
		inheritedEventCount: cut
	};
}
/**
* Whether a stored record's bound identity names the caller's lifecycle.
* An absent format generation cannot prove the fold semantics and never
* matches. Once the format matches, absent lineage fields (records admitted
* via `compatibleVersions` predate them) read as the unseeded lineage: exact
* for an unseeded caller, while a seeded caller fails the match.
*/
function identityMatches(stored, expected) {
	return stored.formatVersion === expected.formatVersion && lifecycleIdentityMatches(stored, expected);
}
/** Match one predecessor cache record to the authoritative listed lifecycle. */
function predecessorIdentityMatches(stored, expected) {
	return (stored.formatVersion === void 0 || stored.formatVersion < expected.formatVersion) && lifecycleIdentityMatches(stored, expected);
}
/** Match the format-independent fields that distinguish one Session lifecycle. */
function lifecycleIdentityMatches(stored, expected) {
	return stored.createdAt === expected.createdAt && stored.cwd === expected.cwd && (stored.isSeeded ?? false) === expected.isSeeded && (stored.inheritedEventCount ?? 0) === expected.inheritedEventCount;
}
//#endregion
export { Config, SessionProjectionCache, SessionProjectionCache as default, checkpointIdentity, checkpointRecord, checkpointRow, projectionCacheDomainSpec };
