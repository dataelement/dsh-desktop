import { Service } from "@deepseek-ai/cordis";
//#region lib/types/types.js
/**
* Types shared by PTY backends, the owner-scoped registry, and tool consumers.
* Runtime service code lives in `./index.ts`.
* @module @deepseek-ai/dsh-terminal/types
*/
/**
* Backend-reported failure to clean partial resources after unpublished setup failed.
* @param spawnError - original setup or cancellation failure.
* @param cleanupError - failure that may leave backend-owned resources alive.
*/
var TerminalBackendCleanupError = class extends AggregateError {
	spawnError;
	cleanupError;
	constructor(spawnError, cleanupError) {
		super([spawnError, cleanupError], "PTY backend startup and cleanup both failed");
		this.spawnError = spawnError;
		this.cleanupError = cleanupError;
		this.name = "TerminalBackendCleanupError";
	}
};
//#endregion
//#region lib/types/index.js
/**
* Owner-scoped persistent PTY registry. Backends own terminal mechanics while
* this service owns ids, publication, authorization, and awaited cleanup.
* @module @deepseek-ai/dsh-terminal
*/
/** Error carrying a stable {@link TerminalErrorCode}. */
var TerminalError = class extends Error {
	code;
	constructor(message, code) {
		super(message);
		this.code = code;
		this.name = "TerminalError";
	}
};
/**
* Brand one registry-minted string as a {@link TerminalSessionId}.
* @param value - raw registry-issued id.
* @returns Same string with the PTY session brand.
*/
function TerminalSessionId(value) {
	return value;
}
/** In-process registry for replaceable PTY backends and exact-Agent sessions. */
var TerminalSessionService = class extends Service {
	backends = /* @__PURE__ */ new Map();
	sessions = /* @__PURE__ */ new Map();
	reservedNames = /* @__PURE__ */ new Map();
	pendingSpawns = /* @__PURE__ */ new Map();
	ownerCleanups = /* @__PURE__ */ new Map();
	disposedOwners = /* @__PURE__ */ new WeakSet();
	nextId = 0;
	disposing = false;
	constructor(ctx) {
		super(ctx, "terminals");
		ctx.effect(() => () => this.disposeAll(), "pty teardown");
	}
	/**
	* Register one backend type for this effect scope.
	* @param backend - provider with a non-empty unique type.
	* @returns disposer that removes exactly this contribution.
	*/
	registerBackend(backend) {
		if (backend.type.length === 0) throw new Error("pty backend type must be non-empty");
		if (this.backends.has(backend.type)) throw new TerminalError(`a PTY backend named "${backend.type}" is already registered`, "DUPLICATE_BACKEND");
		const dispose = this.ctx.effect(() => {
			this.backends.set(backend.type, backend);
			return () => {
				if (this.backends.get(backend.type) === backend) this.backends.delete(backend.type);
			};
		}, "pty.registerBackend()");
		return () => void dispose();
	}
	/**
	* List registered backend types in registration order.
	* @returns fresh backend type names.
	*/
	listBackends() {
		return [...this.backends.keys()];
	}
	/**
	* Create and publish one owner-scoped session after backend setup succeeds.
	* @param owner - exact registered Agent that owns access and cleanup.
	* @param request - backend type plus optional owner-local name and cwd.
	* @param signal - cancellation of unpublished setup.
	* @returns published identity, metadata, status, and MOTD.
	*/
	async spawn(owner, request, signal) {
		this.assertActive();
		signal?.throwIfAborted();
		this.ensureOwnerCleanup(owner);
		const backend = this.backends.get(request.type);
		if (backend === void 0) throw new TerminalError(`no PTY backend registered for "${request.type}"`, "NO_BACKEND");
		if (request.name !== void 0 && request.name.length === 0) throw new Error("PTY session name must be non-empty");
		const releaseName = this.reserveName(owner, request.name);
		const spawnReservation = this.reserveSpawn(owner);
		const backendSignal = signal === void 0 ? spawnReservation.signal : AbortSignal.any([signal, spawnReservation.signal]);
		const sessionId = TerminalSessionId(`pty-${++this.nextId}`);
		let session;
		let cleanupFailure;
		try {
			session = await backend.spawn({
				sessionId,
				owner,
				type: request.type,
				...request.name !== void 0 ? { name: request.name } : {},
				...request.cwd !== void 0 ? { cwd: request.cwd } : {},
				signal: backendSignal
			});
			signal?.throwIfAborted();
			if (this.disposing) throw new TerminalError("PTY service is disposing", "SERVICE_DISPOSING");
			if (!this.isLiveOwner(owner)) throw new TerminalError("PTY owner is no longer live", "OWNER_NOT_LIVE");
			const record = {
				id: sessionId,
				owner,
				name: request.name,
				type: request.type,
				session,
				active: void 0,
				closing: void 0
			};
			this.sessions.set(sessionId, record);
			return this.snapshot(record, session.motd);
		} catch (error) {
			if (error instanceof TerminalBackendCleanupError) cleanupFailure = { error: error.cleanupError };
			let rollbackFailure;
			if (session !== void 0 && !this.sessions.has(sessionId)) try {
				await session.close("PTY spawn rolled back");
			} catch (closeError) {
				rollbackFailure = { error: closeError };
				cleanupFailure = rollbackFailure;
			}
			let failure = error;
			try {
				signal?.throwIfAborted();
				spawnReservation.signal.throwIfAborted();
			} catch (cancellation) {
				failure = cancellation;
			}
			if (rollbackFailure !== void 0 && signal?.aborted !== true) throw new AggregateError([failure, rollbackFailure.error], "PTY spawn and rollback both failed");
			throw failure;
		} finally {
			spawnReservation.release(cleanupFailure);
			releaseName();
		}
	}
	/**
	* Test whether an exact owner has a published session or unpublished spawn.
	* @param owner - exact live owner to inspect.
	* @returns true across the entire spawn-to-close interval, with no publication gap.
	*/
	hasOwnerActivity(owner) {
		return (this.pendingSpawns.get(owner)?.size ?? 0) > 0 || [...this.sessions.values()].some((record) => record.owner === owner);
	}
	/**
	* Start one exclusive interactive send.
	* @param owner - exact session owner.
	* @param id - target PTY identity.
	* @param request - explicit text, submit behavior, and cancellation.
	* @returns live operation handle for foreground await or task registration.
	*/
	startSend(owner, id, request) {
		const record = this.expectOwned(owner, id);
		if (record.closing !== void 0) throw new Error(`PTY session ${id} is closing`);
		if (record.active !== void 0) throw new TerminalError(`PTY session ${id} already has an active send`, "SEND_ACTIVE");
		const operation = record.session.startSend(request);
		record.active = operation;
		operation.done.then(() => {
			record.active = void 0;
		}, () => {
			record.active = void 0;
		});
		return operation;
	}
	/**
	* Read one bounded scrollback page from an owned session.
	* @param owner - exact session owner.
	* @param id - target PTY identity.
	* @param request - optional newest-relative offset and line count.
	* @returns bounded retained text and pagination metadata.
	*/
	read(owner, id, request = {}) {
		return this.expectOwned(owner, id).session.read(request);
	}
	/**
	* Deliver an allowed signal through an owned backend session.
	* @param owner - exact session owner.
	* @param id - target PTY identity.
	* @param signal - allowed POSIX signal name.
	* @returns delivered foreground process-group identity.
	*/
	signal(owner, id, signal) {
		return this.expectOwned(owner, id).session.signal(signal);
	}
	/**
	* Close one owned session and remove it only after quiescent backend cleanup.
	* @param owner - exact session owner.
	* @param id - target PTY identity.
	* @param reason - diagnostic cleanup reason.
	* @returns true for a newly closed session, false when the same close is already in flight.
	*/
	async kill(owner, id, reason = "model request") {
		const record = this.expectOwned(owner, id);
		if (record.closing !== void 0) {
			await record.closing;
			return false;
		}
		const closing = record.session.close(reason);
		record.closing = closing;
		try {
			await closing;
			this.sessions.delete(id);
			return true;
		} catch (error) {
			record.closing = void 0;
			throw error;
		}
	}
	/**
	* List fresh snapshots for exactly one owner.
	* @param owner - exact owner whose sessions are visible.
	* @returns owner-visible snapshots in publication order.
	*/
	list(owner) {
		return [...this.sessions.values()].filter((record) => record.owner === owner).map((record) => this.snapshot(record));
	}
	assertActive() {
		if (this.disposing) throw new TerminalError("PTY service is disposing", "SERVICE_DISPOSING");
	}
	isLiveOwner(owner) {
		return !this.disposedOwners.has(owner) && this.ctx.get("agents")?.get(owner.id) === owner;
	}
	ensureOwnerCleanup(owner) {
		if (!this.isLiveOwner(owner)) throw new TerminalError(`agent "${owner.id}" is not the registered PTY owner`, "OWNER_NOT_LIVE");
		if (this.ownerCleanups.has(owner)) return;
		const detach = owner.ctx.effect(() => async () => {
			this.disposedOwners.add(owner);
			this.ownerCleanups.delete(owner);
			await this.disposeOwned(owner);
		}, "pty.ownerCleanup()");
		this.ownerCleanups.set(owner, detach);
	}
	reserveName(owner, name) {
		if (name === void 0) return () => {};
		if ([...this.sessions.values()].some((record) => record.owner === owner && record.name === name)) throw new TerminalError(`PTY session name "${name}" already exists for this owner`, "DUPLICATE_NAME");
		const reserved = this.reservedNames.get(owner) ?? /* @__PURE__ */ new Set();
		if (reserved.has(name)) throw new TerminalError(`PTY session name "${name}" is already being created`, "DUPLICATE_NAME");
		reserved.add(name);
		this.reservedNames.set(owner, reserved);
		return () => {
			reserved.delete(name);
			if (reserved.size === 0) this.reservedNames.delete(owner);
		};
	}
	reserveSpawn(owner) {
		const controller = new AbortController();
		const settlement = Promise.withResolvers();
		const pending = {
			owner,
			controller,
			settled: settlement.promise,
			cleanupFailure: void 0
		};
		const owned = this.pendingSpawns.get(owner) ?? /* @__PURE__ */ new Set();
		owned.add(pending);
		this.pendingSpawns.set(owner, owned);
		return {
			signal: controller.signal,
			release: (cleanupFailure) => {
				pending.cleanupFailure = cleanupFailure;
				if (cleanupFailure === void 0) this.removePendingSpawn(pending);
				settlement.resolve();
			}
		};
	}
	removePendingSpawn(pending) {
		const owned = this.pendingSpawns.get(pending.owner);
		if (owned === void 0) return;
		owned.delete(pending);
		if (owned.size === 0) this.pendingSpawns.delete(pending.owner);
	}
	async abortPendingSpawns(owner, reason) {
		const pending = owner === void 0 ? [...this.pendingSpawns.values()].flatMap((owned) => [...owned]) : [...this.pendingSpawns.get(owner) ?? []];
		for (const spawn of pending) spawn.controller.abort(reason);
		await Promise.all(pending.map((spawn) => spawn.settled));
		const failures = pending.flatMap((spawn) => spawn.cleanupFailure === void 0 ? [] : [spawn.cleanupFailure.error]);
		for (const spawn of pending) this.removePendingSpawn(spawn);
		if (failures.length > 0) throw new AggregateError(failures, "failed to roll back unpublished PTY setup");
	}
	expectOwned(owner, id) {
		const record = this.sessions.get(id);
		if (record === void 0) throw new TerminalError(`unknown PTY session ${id}`, "NO_SESSION");
		if (record.owner !== owner) throw new TerminalError(`PTY session ${id} belongs to another agent`, "FOREIGN_SESSION");
		return record;
	}
	snapshot(record, motd) {
		return {
			sessionId: record.id,
			...record.name !== void 0 ? { name: record.name } : {},
			type: record.type,
			...record.session.pid !== void 0 ? { pid: record.session.pid } : {},
			status: record.session.status(),
			...motd !== void 0 ? { motd } : {}
		};
	}
	async abortAndClose(owner, abortReason, closeReason) {
		const failures = [];
		try {
			await this.abortPendingSpawns(owner, abortReason);
		} catch (error) {
			failures.push(error);
		}
		const records = [...this.sessions.values()].filter((record) => owner === void 0 || record.owner === owner);
		try {
			await this.closeRecords(records, closeReason);
		} catch (error) {
			failures.push(error);
		}
		if (failures.length > 0) throw new AggregateError(failures, "failed to clean up PTY lifecycle");
	}
	async disposeOwned(owner) {
		try {
			await this.abortAndClose(owner, new TerminalError("PTY owner is no longer live", "OWNER_NOT_LIVE"), "PTY owner disposed");
		} finally {
			this.reservedNames.delete(owner);
		}
	}
	async disposeAll() {
		this.disposing = true;
		try {
			await this.abortAndClose(void 0, new TerminalError("PTY service is disposing", "SERVICE_DISPOSING"), "PTY service disposed");
		} finally {
			this.backends.clear();
			this.reservedNames.clear();
			this.pendingSpawns.clear();
			const cleanups = [...this.ownerCleanups.values()];
			this.ownerCleanups.clear();
			await Promise.all(cleanups.map((cleanup) => Promise.resolve(cleanup())));
		}
	}
	async closeRecords(records, reason) {
		const failures = (await Promise.allSettled(records.map(async (record) => {
			const closing = record.closing ?? record.session.close(reason);
			record.closing = closing;
			try {
				await closing;
				this.sessions.delete(record.id);
			} catch (error) {
				if (record.closing === closing) record.closing = void 0;
				throw error;
			}
		}))).filter((result) => result.status === "rejected").map((result) => result.reason);
		if (failures.length > 0) throw new AggregateError(failures, `failed to close ${failures.length} PTY session(s)`);
	}
};
//#endregion
export { TerminalBackendCleanupError, TerminalError, TerminalSessionId, TerminalSessionService, TerminalSessionService as default };
