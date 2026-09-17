import { Remote, RemoteError, TypertRemoteService, remoteErrorOf } from "@deepseek-ai/dsh-typert-protocol";
import { WorkspaceId, WorkspaceMoveInvalidError, WorkspaceOrderInvalidError, WorkspaceUnknownSessionError, workspaceDomainState, workspaceRecord } from "@deepseek-ai/dsh-workspace";
import { Deque } from "@deepseek-ai/dsh-deque";
import { z } from "zod";
import { DirectoryPickerError } from "@deepseek-ai/dsh-host-directory-picker";
//#region lib/types/feed.js
/** Reconnect-safe Workspace baseline and increment producer. */
/**
* Project one authoritative Workspace entity into its Remote value.
* @param workspace - authoritative registry entity.
* @returns detached Workspace projection for Remote consumers.
*/
function workspaceView(workspace) {
	return {
		workspaceId: workspace.id,
		path: workspace.path,
		title: workspace.title,
		sessionIds: [...workspace.sessionIds],
		createdAt: workspace.createdAt,
		updatedAt: workspace.updatedAt
	};
}
function changedWorkspaceView(workspaceId, value) {
	const record = workspaceRecord.parse(value);
	return {
		workspaceId: WorkspaceId(workspaceId),
		path: record.path,
		title: record.title,
		sessionIds: [...record.sessionIds],
		createdAt: record.createdAt,
		updatedAt: record.updatedAt
	};
}
/** Owns Workspace domain observation and all active follow generations. */
var WorkspaceFeed = class {
	ctx;
	followers = /* @__PURE__ */ new Set();
	knownIds;
	order;
	archived;
	/** @param ctx - Host context containing the authoritative Workspace registry. */
	constructor(ctx) {
		this.ctx = ctx;
		const baseline = ctx.workspaceRegistry.list();
		this.knownIds = new Set(baseline.map((workspace) => String(workspace.id)));
		this.order = baseline.map((workspace) => String(workspace.id));
		this.archived = ctx.workspaceRegistry.archivedSessionIds.map(String);
		ctx.on("domain/changed", (change) => {
			this.changed(change);
		});
		ctx.effect(() => () => {
			for (const follower of this.followers) follower.close();
			this.followers.clear();
		}, "workspace-controller.feed");
	}
	/**
	* Read the complete current projection synchronously.
	* @returns all active Workspaces and archived Session identities.
	*/
	baseline() {
		return {
			items: this.ctx.workspaceRegistry.list().map(workspaceView),
			archivedSessionIds: [...this.ctx.workspaceRegistry.archivedSessionIds]
		};
	}
	/**
	* Open one generation beginning with a complete baseline.
	* @param signal - generation cancellation.
	* @returns baseline followed by ordered Workspace increments.
	*/
	async *follow(signal) {
		signal.throwIfAborted();
		const follower = new WorkspaceFollower();
		this.followers.add(follower);
		try {
			yield {
				type: "baseline",
				value: this.baseline()
			};
			yield* follower.read(signal);
		} finally {
			this.followers.delete(follower);
			follower.close();
		}
	}
	changed(change) {
		if (change.domain !== "workspace") return;
		if (change.table === "") {
			if (change.operation !== "put") return;
			const state = workspaceDomainState.parse(change.value);
			const nextOrder = state.workspaceIds.map(String);
			const orderChanged = !sameStrings(this.order, nextOrder);
			for (const id of state.workspaceIds) {
				if (this.knownIds.has(id)) continue;
				const workspace = this.ctx.workspaceRegistry.get(id);
				if (workspace === void 0) throw new Error(`committed Workspace registry references missing Workspace "${id}"`);
				this.knownIds.add(id);
				this.publish({
					type: "upsert",
					workspace: workspaceView(workspace)
				});
			}
			this.order = nextOrder;
			if (orderChanged) this.publish({
				type: "order",
				workspaceIds: [...state.workspaceIds]
			});
			const nextArchived = state.archivedSessionIds.map(String);
			if (!sameStrings(this.archived, nextArchived)) {
				this.archived = nextArchived;
				this.publish({
					type: "archived",
					archivedSessionIds: [...state.archivedSessionIds]
				});
			}
			return;
		}
		if (change.table !== "workspaces") return;
		if (change.operation === "deleted") {
			if (!this.knownIds.delete(change.key)) return;
			this.publish({
				type: "remove",
				workspaceId: WorkspaceId(change.key)
			});
			return;
		}
		if (!this.knownIds.has(change.key)) return;
		this.publish({
			type: "upsert",
			workspace: changedWorkspaceView(change.key, change.value)
		});
	}
	publish(frame) {
		for (const follower of this.followers) follower.push(frame);
	}
};
function sameStrings(left, right) {
	return left.length === right.length && left.every((value, index) => value === right[index]);
}
var WorkspaceFollower = class {
	frames = new Deque();
	waiting;
	closed = false;
	push(frame) {
		/* v8 ignore next -- closed followers are removed before later publication can reach them. */
		if (this.closed) return;
		this.frames.pushBack(frame);
		this.waiting?.();
	}
	close() {
		if (this.closed) return;
		this.closed = true;
		this.waiting?.();
	}
	async *read(signal) {
		while (!this.closed && !signal.aborted) {
			const frame = this.frames.popFront();
			if (frame !== void 0) {
				yield frame;
				continue;
			}
			await this.wait(signal);
		}
	}
	wait(signal) {
		return new Promise((resolve) => {
			const finish = () => {
				signal.removeEventListener("abort", finish);
				/* v8 ignore next -- one read owns the sole installed wait callback. */
				if (this.waiting === finish) this.waiting = void 0;
				resolve();
			};
			this.waiting = finish;
			signal.addEventListener("abort", finish, { once: true });
			/* v8 ignore next -- native signals and the private queue cannot change during this synchronous setup. */
			if (signal.aborted || this.closed || this.frames.size > 0) finish();
		});
	}
};
//#endregion
//#region lib/types/commands.js
/** Workspace command implementation and stable Remote failure mapping. */
/** Implements Workspace mutations against the authoritative registry. */
var WorkspaceCommands = class {
	ctx;
	operationTail = Promise.resolve();
	/** @param ctx - Host context containing the Workspace registry. */
	constructor(ctx) {
		this.ctx = ctx;
	}
	/**
	* Create or resolve one Workspace over an existing directory.
	* @param request - directory path to register.
	* @returns the Workspace and whether this call created it.
	*/
	create(request) {
		return this.enqueue(async () => {
			try {
				const existing = await this.ctx.workspaceRegistry.resolveByPath(request.path);
				if (existing !== void 0) return {
					workspace: workspaceView(existing),
					created: false
				};
				return {
					workspace: workspaceView(await this.ctx.workspaceRegistry.create(request.path)),
					created: true
				};
			} catch (error) {
				if (remoteErrorOf(error) !== void 0) throw error;
				throw new RemoteError("workspace/invalid-path", `cannot create a Workspace at "${request.path}": ${errorMessage$1(error)}`, { path: request.path }, { cause: error });
			}
		});
	}
	/**
	* Rename one Workspace after serializing title ownership checks.
	* @param request - Workspace identity and proposed title.
	* @returns the updated Workspace projection.
	*/
	rename(request) {
		const title = request.title.trim();
		if (title === "") return Promise.reject(new RemoteError("gateway/bad-request", "Workspace rename requires a non-blank title", {}));
		return this.enqueue(async () => {
			const workspace = this.requireWorkspace(request.workspaceId);
			if (title !== workspace.title) {
				if (this.ctx.workspaceRegistry.list().some((candidate) => candidate.id !== workspace.id && candidate.title === title)) throw new RemoteError("workspace/name-conflict", `Workspace name '${title}' is already in use`, { name: title });
				await workspace.setTitle(title);
			}
			return { workspace: workspaceView(workspace) };
		});
	}
	/**
	* Delete one Workspace registration without deleting its directory or Sessions.
	* @param request - Workspace identity to remove.
	* @returns deletion confirmation.
	*/
	delete(request) {
		return this.enqueue(async () => {
			if (!await this.ctx.workspaceRegistry.delete(WorkspaceId(request.workspaceId))) throw workspaceNotFound(request.workspaceId);
			return { deleted: true };
		});
	}
	/**
	* Move one Workspace within the durable registry order.
	* @param request - moved Workspace and optional anchor.
	* @returns the complete resulting Workspace order.
	*/
	async insertBefore(request) {
		try {
			return { workspaceIds: [...await this.ctx.workspaceRegistry.insertBefore(WorkspaceId(request.workspaceId), request.beforeWorkspaceId === void 0 ? void 0 : WorkspaceId(request.beforeWorkspaceId))] };
		} catch (error) {
			if (!(error instanceof WorkspaceOrderInvalidError)) throw error;
			throw workspaceNotFound(error.workspaceId);
		}
	}
	/**
	* Move one accounted Session within a Workspace's manual order.
	* @param request - Workspace, Session, and optional anchor identities.
	* @returns the updated Workspace projection.
	*/
	async insertSessionBefore(request) {
		const workspace = this.requireWorkspace(request.workspaceId);
		try {
			await workspace.insertSessionBefore(request.sessionId, request.beforeSessionId);
		} catch (error) {
			if (!(error instanceof WorkspaceMoveInvalidError)) throw error;
			throw new RemoteError("workspace/move-invalid", error.message, {
				workspaceId: request.workspaceId,
				sessionId: request.sessionId,
				...request.beforeSessionId === void 0 ? {} : { beforeSessionId: request.beforeSessionId }
			}, { cause: error });
		}
		return { workspace: workspaceView(workspace) };
	}
	/**
	* Add one known Session to the registry-global archive set.
	* @param request - Session identity to archive.
	* @returns the complete resulting archive set.
	*/
	async archiveSession(request) {
		try {
			await this.ctx.workspaceRegistry.archiveSession(request.sessionId);
		} catch (error) {
			if (!(error instanceof WorkspaceUnknownSessionError)) throw error;
			throw new RemoteError("session/not-found", error.message, { sessionId: request.sessionId }, { cause: error });
		}
		return { archivedSessionIds: [...this.ctx.workspaceRegistry.archivedSessionIds] };
	}
	requireWorkspace(workspaceId) {
		const workspace = this.ctx.workspaceRegistry.get(WorkspaceId(workspaceId));
		if (workspace === void 0) throw workspaceNotFound(workspaceId);
		return workspace;
	}
	enqueue(operation) {
		const result = this.operationTail.then(operation);
		this.operationTail = result.then(() => void 0, () => void 0);
		return result;
	}
};
function workspaceNotFound(workspaceId) {
	return new RemoteError("workspace/not-found", `Workspace "${workspaceId}" not found`, { workspaceId });
}
function errorMessage$1(error) {
	return error instanceof Error ? error.message : String(error);
}
//#endregion
//#region lib/types/directory-picker.js
/**
* Host directory-picking Remote owner: capability gating, cancellation, and the
* stable wire failure vocabulary over the `ctx.directoryPicker` seam.
*/
var __runInitializers$1 = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate$1 = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
		else descriptor[key] = _;
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
const createDirectoryRequestSchema = z.object({
	path: z.string(),
	name: z.string()
}).refine((request) => request.name.trim() !== "" && request.name !== "." && request.name !== ".." && !/[/\\]/.test(request.name), { message: "host.createDirectory requires a single non-blank path segment name" });
/**
* Host service backing the generated `ctx.remote.directoryPicker` namespace. The
* seam it exports is abstract and therefore never a Loader entry of its own, so
* this controller carries the wire verbs: one composed backend serves either the
* native chooser or the browse primitives, and a verb the composition cannot
* serve is refused rather than approximated.
*/
let DirectoryPickerController = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _pick_decorators;
	let _list_decorators;
	let _createDirectory_decorators;
	return class DirectoryPickerController extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_pick_decorators = [Remote("pick")];
			_list_decorators = [Remote("list")];
			_createDirectory_decorators = [Remote("createDirectory")];
			__esDecorate$1(this, null, _pick_decorators, {
				kind: "method",
				name: "pick",
				static: false,
				private: false,
				access: {
					has: (obj) => "pick" in obj,
					get: (obj) => obj.pick
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _list_decorators, {
				kind: "method",
				name: "list",
				static: false,
				private: false,
				access: {
					has: (obj) => "list" in obj,
					get: (obj) => obj.list
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _createDirectory_decorators, {
				kind: "method",
				name: "createDirectory",
				static: false,
				private: false,
				access: {
					has: (obj) => "createDirectory" in obj,
					get: (obj) => obj.createDirectory
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		static inject = ["directoryPicker"];
		/** @param ctx - Host context carrying the composed directory-picking backend. */
		constructor(ctx) {
			super(ctx, "directoryPickerController", { namespace: "directoryPicker" });
			__runInitializers$1(this, _instanceExtraInitializers);
		}
		/**
		* Open the host's OS chooser for a Remote caller.
		* @param signal - caller lifetime; abort terminates the chooser.
		* @returns the chosen absolute path, or null when the operator cancels.
		*/
		async pick(signal) {
			const capability = this.requireCapability("native", "pick");
			try {
				return await capability.pick(signal);
			} catch (error) {
				throw cancellableFailure(error, signal, "directory picker was aborted", "directory picker failed");
			}
		}
		/**
		* List one directory level for a Remote caller's in-app browser.
		* @param path - absolute directory to list; absent lists the home directory.
		* @param signal - caller lifetime; abort stops the backend's scan instead of
		*   letting it outlive a disconnected caller.
		* @returns the level's listing with its ancestry.
		*/
		async list(path, signal) {
			const capability = this.requireCapability("browse", "list");
			try {
				return await capability.list(path, signal);
			} catch (error) {
				throw cancellableFailure(error, signal, "directory listing was aborted");
			}
		}
		/**
		* Create one child directory for a Remote caller's in-app browser.
		* @param path - absolute existing parent directory.
		* @param name - single non-blank path segment.
		* @returns the created directory's absolute path.
		*/
		async createDirectory(path, name) {
			const request = createDirectoryRequestSchema.safeParse({
				path,
				name
			});
			if (!request.success) throw new RemoteError("gateway/bad-request", "invalid payload for host.createDirectory", { issues: request.error.issues });
			const capability = this.requireCapability("browse", "createDirectory");
			try {
				return await capability.createDirectory(request.data.path, request.data.name);
			} catch (error) {
				throw browseFailure(error);
			}
		}
		/** Resolve the capability one wire verb needs, or refuse with the kind this backend serves. */
		requireCapability(kind, method) {
			const capability = this.ctx.directoryPicker.capability();
			if (capability.kind !== kind) throw new RemoteError("directory-picker/unavailable", `directoryPicker.${method} needs the ${kind} capability; the composed picker serves "${capability.kind}"`, { capability: capability.kind });
			return capability;
		}
	};
})();
/**
* Wire code answered for each seam browse failure. The seam's closed codes are
* its own local vocabulary, so this controller owns the projection onto the
* `directory-picker/*` codes a Remote caller discriminates on.
*/
const BROWSE_FAILURE_CODES = {
	"directory-unreadable": "directory-picker/unreadable",
	"directory-exists": "directory-picker/exists",
	"directory-create-failed": "directory-picker/create-failed"
};
/**
* Classify a browse-primitive rejection: the seam's own closed codes carry the
* path they are about, and anything else stays an infrastructure failure.
* @param error - the primitive's rejection.
* @returns the failure to throw across the Remote boundary.
*/
function browseFailure(error) {
	if (error instanceof DirectoryPickerError) return new RemoteError(BROWSE_FAILURE_CODES[error.code], error.message, { path: error.path }, { cause: error });
	return new RemoteError("gateway/internal", errorMessage(error), {}, { cause: error });
}
/**
* Classify a cancellable primitive's rejection. An abort is the caller's own
* timeout or disconnect, not a backend failure, so it answers `gateway/cancelled`
* before the business classification runs.
* @param error - the primitive's rejection.
* @param signal - the caller lifetime the primitive ran under.
* @param cancelled - operator-facing text for the abort outcome.
* @param failed - prefix for a non-seam failure, when the verb has no closed codes.
* @returns the failure to throw across the Remote boundary.
*/
function cancellableFailure(error, signal, cancelled, failed) {
	if (signal.aborted) return new RemoteError("gateway/cancelled", cancelled, {}, { cause: error });
	if (failed === void 0) return browseFailure(error);
	return new RemoteError("gateway/internal", `${failed}: ${errorMessage(error)}`, {}, { cause: error });
}
function errorMessage(error) {
	return error instanceof Error ? error.message : String(error);
}
//#endregion
//#region lib/types/index.js
/** Host Workspace Remote owner: explicit commands and reconnect-safe state. */
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
		else descriptor[key] = _;
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
/** Host service backing the generated `ctx.remote.workspace` namespace. */
let WorkspaceController = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _create_decorators;
	let _rename_decorators;
	let _delete_decorators;
	let _insertBefore_decorators;
	let _insertSessionBefore_decorators;
	let _archiveSession_decorators;
	let _follow_decorators;
	return class WorkspaceController extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_create_decorators = [Remote("create")];
			_rename_decorators = [Remote("rename")];
			_delete_decorators = [Remote("delete")];
			_insertBefore_decorators = [Remote("insertBefore")];
			_insertSessionBefore_decorators = [Remote("insertSessionBefore")];
			_archiveSession_decorators = [Remote("archiveSession")];
			_follow_decorators = [Remote({ mode: "stream" })];
			__esDecorate(this, null, _create_decorators, {
				kind: "method",
				name: "create",
				static: false,
				private: false,
				access: {
					has: (obj) => "create" in obj,
					get: (obj) => obj.create
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _rename_decorators, {
				kind: "method",
				name: "rename",
				static: false,
				private: false,
				access: {
					has: (obj) => "rename" in obj,
					get: (obj) => obj.rename
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _delete_decorators, {
				kind: "method",
				name: "delete",
				static: false,
				private: false,
				access: {
					has: (obj) => "delete" in obj,
					get: (obj) => obj.delete
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _insertBefore_decorators, {
				kind: "method",
				name: "insertBefore",
				static: false,
				private: false,
				access: {
					has: (obj) => "insertBefore" in obj,
					get: (obj) => obj.insertBefore
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _insertSessionBefore_decorators, {
				kind: "method",
				name: "insertSessionBefore",
				static: false,
				private: false,
				access: {
					has: (obj) => "insertSessionBefore" in obj,
					get: (obj) => obj.insertSessionBefore
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _archiveSession_decorators, {
				kind: "method",
				name: "archiveSession",
				static: false,
				private: false,
				access: {
					has: (obj) => "archiveSession" in obj,
					get: (obj) => obj.archiveSession
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _follow_decorators, {
				kind: "method",
				name: "follow",
				static: false,
				private: false,
				access: {
					has: (obj) => "follow" in obj,
					get: (obj) => obj.follow
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		static inject = ["typert", "workspaceRegistry"];
		commands = __runInitializers(this, _instanceExtraInitializers);
		feed;
		/** @param ctx - Host context containing the Workspace registry. */
		constructor(ctx) {
			super(ctx, "workspaceController", { namespace: "workspace" });
			this.commands = new WorkspaceCommands(ctx);
			this.feed = new WorkspaceFeed(ctx);
			ctx.plugin(DirectoryPickerController);
		}
		/**
		* Create or idempotently resolve one Workspace over an existing directory.
		* @param request - directory path to register.
		* @returns the Workspace and whether this call created it.
		*/
		create(request) {
			return this.commands.create(request);
		}
		/**
		* Rename one Workspace to a unique non-blank title.
		* @param request - Workspace identity and proposed title.
		* @returns the updated Workspace projection.
		*/
		rename(request) {
			return this.commands.rename(request);
		}
		/**
		* Remove one Workspace registration while retaining files and Sessions.
		* @param request - Workspace identity to remove.
		* @returns deletion confirmation.
		*/
		delete(request) {
			return this.commands.delete(request);
		}
		/**
		* Move one Workspace within the registry display order.
		* @param request - moved Workspace and optional anchor.
		* @returns the complete resulting Workspace order.
		*/
		insertBefore(request) {
			return this.commands.insertBefore(request);
		}
		/**
		* Move one accounted Session within a Workspace.
		* @param request - Workspace, Session, and optional anchor identities.
		* @returns the updated Workspace projection.
		*/
		insertSessionBefore(request) {
			return this.commands.insertSessionBefore(request);
		}
		/**
		* Hide one known Session from Workspace grouping surfaces.
		* @param request - Session identity to archive.
		* @returns the complete resulting archive set.
		*/
		archiveSession(request) {
			return this.commands.archiveSession(request);
		}
		/**
		* Stream a complete Workspace baseline followed by ordered increments.
		* @param signal - generation cancellation.
		* @returns baseline followed by ordered Workspace increments.
		*/
		follow(signal) {
			return this.feed.follow(signal);
		}
	};
})();
//#endregion
export { DirectoryPickerController, WorkspaceController, WorkspaceController as default };
