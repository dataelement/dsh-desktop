window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-api-workspace-controller",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_api_gateway_client = require("@deepseek-ai/dsh-api-gateway/client");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let _deepseek_ai_cordis = require("@deepseek-ai/cordis");
		//#region lib/types/client/model.js
		/** Client-side Workspace state model shared by Remote transport and UI projection. */
		/**
		* Owns the Client Workspace projection, mutation echoes, and stream/unary race resolution.
		*/
		var ClientWorkspaceModel = class {
			remote;
			items = [];
			archivedSessionIds = [];
			state = "loading";
			phase = "pending";
			error = null;
			/** Latest local reorder request; only its unary echo may install order. */
			orderRequestGeneration = 0;
			/** Increments on stream orders so a later remote commit outranks an older unary echo. */
			orderFrameGeneration = 0;
			/** Last complete order accepted from a baseline, increment, or current unary echo. */
			committedOrder = [];
			/** Host Workspace ids are never reused, so delayed data cannot resurrect a removed row. */
			removedIds = /* @__PURE__ */ new Set();
			listeners = /* @__PURE__ */ new Set();
			snapshotCache;
			snapshotDirty = false;
			notificationPending = false;
			notificationScheduled = false;
			notificationGeneration = 0;
			/** @param remote - generated Workspace Remote namespace. */
			constructor(remote) {
				this.remote = remote;
				this.snapshotCache = this.buildSnapshot();
			}
			/**
			* Create or resolve a Workspace and merge the unary result immediately.
			* @param input - existing absolute path to adopt.
			* @returns generated Remote result.
			*/
			async create(input) {
				const result = await this.remote.create(input);
				if (result.ok) this.upsert(result.value.workspace);
				return result;
			}
			/**
			* Rename a Workspace and merge the unary result immediately.
			* @param workspaceId - target Workspace.
			* @param title - new display title.
			* @returns generated Remote result.
			*/
			async rename(workspaceId, title) {
				const result = await this.remote.rename({
					workspaceId,
					title
				});
				if (result.ok) this.upsert(result.value.workspace);
				return result;
			}
			/**
			* Delete a Workspace and remove it from the local projection immediately.
			* @param workspaceId - target Workspace.
			* @returns generated Remote result.
			*/
			async delete(workspaceId) {
				const result = await this.remote.delete({ workspaceId });
				if (result.ok) this.remove(workspaceId, true);
				return result;
			}
			/**
			* Optimistically move a Workspace and reconcile the returned complete order.
			* @param workspaceId - Workspace to move.
			* @param beforeWorkspaceId - anchor Workspace; omitted appends.
			* @returns generated Remote result.
			*/
			async insertBefore(workspaceId, beforeWorkspaceId) {
				const requestGeneration = ++this.orderRequestGeneration;
				const frameGeneration = this.orderFrameGeneration;
				const localOrder = this.items.map((workspace) => workspace.workspaceId);
				this.installOrder(insertIdBefore(localOrder, workspaceId, beforeWorkspaceId));
				const result = await this.remote.insertBefore({
					workspaceId,
					...beforeWorkspaceId === void 0 ? {} : { beforeWorkspaceId }
				});
				if (requestGeneration === this.orderRequestGeneration && frameGeneration === this.orderFrameGeneration) this.installOrder(result.ok ? result.value.workspaceIds : this.committedOrder, result.ok);
				return result;
			}
			/**
			* Move a Session within its Workspace and merge the returned row.
			* @param workspaceId - owning Workspace.
			* @param sessionId - accounted Session to move.
			* @param beforeSessionId - accounted anchor; omitted appends.
			* @returns generated Remote result.
			*/
			async insertSessionBefore(workspaceId, sessionId, beforeSessionId) {
				const result = await this.remote.insertSessionBefore({
					workspaceId,
					sessionId,
					...beforeSessionId === void 0 ? {} : { beforeSessionId }
				});
				if (result.ok) this.upsert(result.value.workspace);
				return result;
			}
			/**
			* Archive one Session and install the returned complete archive set.
			* @param sessionId - Session to archive.
			* @returns generated Remote result.
			*/
			async archiveSession(sessionId) {
				const result = await this.remote.archiveSession({ sessionId });
				if (result.ok) this.installArchived(result.value.archivedSessionIds);
				return result;
			}
			/**
			* Replace the projection from one complete stream-generation baseline.
			* @param baseline - complete Workspace and archive projection.
			*/
			replaceBaseline(baseline) {
				this.orderFrameGeneration++;
				this.installViews(baseline.items);
				this.installArchived(baseline.archivedSessionIds);
				this.state = "idle";
				this.phase = "ready";
				this.error = null;
				this.invalidate();
			}
			/** Merge one decoded Workspace upsert from the current follow generation. */
			upsertView(workspace) {
				this.upsert(workspace);
			}
			/** Apply one decoded Workspace removal from the current follow generation. */
			removeView(workspaceId) {
				this.remove(workspaceId);
			}
			/** Replace Host-confirmed order from the current follow generation. */
			replaceOrder(workspaceIds) {
				this.orderFrameGeneration++;
				this.installOrder(workspaceIds, true);
			}
			/**
			* Replace the archived Session set from the current follow generation.
			* @param archivedSessionIds - complete Host-confirmed archive set.
			*/
			replaceArchived(archivedSessionIds) {
				this.installArchived(archivedSessionIds);
			}
			/** Keep the last complete projection visible while a lost carrier reconnects. */
			handleCarrierFailure() {
				this.state = "loading";
				this.error = null;
				this.invalidate();
			}
			/**
			* Publish a non-retryable stream or protocol failure.
			* @param error - terminal stream failure.
			*/
			handleStreamFailure(error) {
				if (!(0, _deepseek_ai_dsh_api_gateway_client.isRemoteFailure)(error)) throw error;
				this.state = "error";
				this.error = error;
				this.invalidate();
			}
			/**
			* Subscribe to Workspace state invalidation.
			* @param listener - invalidation callback.
			* @returns unsubscribe function.
			*/
			subscribe(listener) {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			}
			/**
			* Read the cached state, rebuilding it first when necessary.
			* @returns the current stable Workspace list snapshot.
			*/
			getSnapshot() {
				this.refreshSnapshot();
				return this.snapshotCache;
			}
			buildSnapshot() {
				return {
					items: this.items,
					archivedSessionIds: this.archivedSessionIds,
					state: this.state,
					phase: this.phase,
					error: this.error
				};
			}
			installArchived(archivedSessionIds) {
				if (archivedSessionIds.length === this.archivedSessionIds.length && archivedSessionIds.every((id, index) => id === this.archivedSessionIds[index])) return;
				this.archivedSessionIds = [...archivedSessionIds];
				this.invalidate();
			}
			installOrder(workspaceIds, committed = false) {
				if (committed) this.committedOrder = [...workspaceIds];
				const rank = new Map(workspaceIds.map((id, index) => [id, index]));
				const items = [...this.items].sort((left, right) => (rank.get(left.workspaceId) ?? Number.MAX_SAFE_INTEGER) - (rank.get(right.workspaceId) ?? Number.MAX_SAFE_INTEGER));
				if (items.every((item, index) => item === this.items[index])) return;
				this.items = items;
				this.invalidate();
			}
			upsert(view) {
				if (this.removedIds.has(view.workspaceId)) return;
				const index = this.items.findIndex((item) => item.workspaceId === view.workspaceId);
				const installed = this.items[index];
				if (installed !== void 0 && Date.parse(view.updatedAt) < Date.parse(installed.updatedAt)) return;
				if (!this.committedOrder.includes(view.workspaceId)) this.committedOrder = [view.workspaceId, ...this.committedOrder];
				this.items = index === -1 ? [view, ...this.items] : this.items.map((item, position) => position === index ? view : item);
				this.invalidate();
			}
			remove(workspaceId, immediate = false) {
				this.removedIds.add(workspaceId);
				this.committedOrder = this.committedOrder.filter((id) => id !== workspaceId);
				const items = this.items.filter((item) => item.workspaceId !== workspaceId);
				if (items.length === this.items.length) {
					if (immediate) this.invalidate(true);
					return;
				}
				this.items = items;
				this.invalidate(immediate);
			}
			installViews(views) {
				const installed = /* @__PURE__ */ new Map();
				for (const view of views) if (!this.removedIds.has(view.workspaceId)) installed.set(view.workspaceId, view);
				this.items = [...installed.values()];
				this.committedOrder = views.map((view) => view.workspaceId);
			}
			invalidate(immediate = false) {
				this.snapshotDirty = true;
				this.notificationPending = true;
				if (immediate) {
					this.notificationGeneration++;
					this.notificationScheduled = false;
					this.flush();
					return;
				}
				if (this.notificationScheduled) return;
				this.notificationScheduled = true;
				const generation = ++this.notificationGeneration;
				queueMicrotask(() => {
					if (generation !== this.notificationGeneration) return;
					this.notificationScheduled = false;
					this.flush();
				});
			}
			flush() {
				if (!this.notificationPending || this.listeners.size === 0) return;
				this.notificationPending = false;
				this.refreshSnapshot();
				(0, _deepseek_ai_dsh_client_store.notifySubscribers)(this.listeners, "[workspace-controller]");
			}
			refreshSnapshot() {
				if (!this.snapshotDirty) return;
				this.snapshotDirty = false;
				this.snapshotCache = this.buildSnapshot();
			}
		};
		function insertIdBefore(ids, id, beforeId) {
			if (!ids.includes(id) || beforeId !== void 0 && !ids.includes(beforeId) || beforeId === id) return [...ids];
			const without = ids.filter((candidate) => candidate !== id);
			const at = beforeId === void 0 ? without.length : without.indexOf(beforeId);
			return [
				...without.slice(0, at),
				id,
				...without.slice(at)
			];
		}
		//#endregion
		//#region lib/types/client/service.js
		/** React-free Client Workspace service and command facade. */
		/** Structured create failure for callers that distinguish Host business errors. */
		var WorkspaceCreateError = class extends Error {
			rpcError;
			name = "WorkspaceCreateError";
			/** @param rpcError - Host business or folded carrier failure. */
			constructor(rpcError) {
				super(`workspace create failed: ${rpcError.code}: ${rpcError.message}`);
				this.rpcError = rpcError;
			}
		};
		/** Owns the bare Workspace snapshot and Workspace-only commands. */
		var WorkspaceController = class extends _deepseek_ai_cordis.Service {
			model;
			list;
			/**
			* @param ctx - Client root Context.
			* @param model - Remote-backed Workspace state model.
			*/
			constructor(ctx, model) {
				super(ctx, "workspaces");
				this.model = model;
				this.list = model;
			}
			async create(input) {
				const result = await this.model.create(input);
				if (!result.ok) throw new WorkspaceCreateError(result.error);
				return result.value.workspace;
			}
			async rename(workspaceId, title) {
				const result = await this.model.rename(workspaceId, title);
				if (!result.ok) throw commandError("rename", result.error);
				return result.value.workspace;
			}
			async delete(workspaceId) {
				const result = await this.model.delete(workspaceId);
				if (!result.ok) throw commandError("delete", result.error);
			}
			async insertBefore(workspaceId, beforeWorkspaceId) {
				const result = await this.model.insertBefore(workspaceId, beforeWorkspaceId);
				if (!result.ok) throw commandError("reorder", result.error);
			}
			async archiveSession(sessionId) {
				const result = await this.model.archiveSession(sessionId);
				if (!result.ok) throw commandError("session archive", result.error);
			}
			async insertSessionBefore(workspaceId, sessionId, beforeSessionId) {
				const result = await this.model.insertSessionBefore(workspaceId, sessionId, beforeSessionId);
				if (!result.ok) throw commandError("move", result.error);
				return result.value.workspace;
			}
		};
		function commandError(operation, failure) {
			return /* @__PURE__ */ new Error(`workspace ${operation} failed: ${failure.code}: ${failure.message}`);
		}
		//#endregion
		//#region lib/types/client/index.js
		/** Workspace-specific adapter for the Gateway-owned snapshot stream lifecycle. */
		/** Required Client Remote services. */
		const inject = ["remote", "remote.workspace"];
		/**
		* Install Client Workspace state, commands, and reconnecting follow control.
		* @param ctx - Client root Context.
		*/
		function apply(ctx) {
			const model = new ClientWorkspaceModel(ctx.remote.workspace);
			new WorkspaceController(ctx, model);
			const control = createWorkspaceStateStream(ctx.remote, {
				accept: model,
				carrierFailed: () => {
					model.handleCarrierFailure();
				},
				failed: (error) => {
					model.handleStreamFailure(error);
				}
			});
			control.start();
			ctx.effect(() => async () => {
				await control.dispose();
			}, "workspace-controller.client.control");
		}
		/**
		* Create the reconnecting Workspace state stream.
		* @param remote - Client Remote face carrying the Workspace namespace and the stream factory.
		* @param options - Workspace state destinations.
		* @returns an unstarted stream owned by the Client Workspace runtime.
		*/
		function createWorkspaceStateStream(remote, options) {
			return new _deepseek_ai_dsh_api_gateway_client.RemoteSnapshotStream(remote.$stream({
				name: "Workspace state stream",
				open: (signal) => remote.workspace.follow(signal),
				ended: (accepted) => accepted ? new _deepseek_ai_dsh_api_gateway_client.RemoteStreamCarrierError("Workspace state stream ended without a terminal result") : /* @__PURE__ */ new Error("Workspace state stream ended before its opening snapshot"),
				...options.carrierFailed === void 0 ? {} : { carrierFailed: options.carrierFailed }
			}), {
				name: "Workspace state stream",
				isSnapshot: (frame) => frame.type === "baseline",
				replace: (frame) => {
					options.accept.replaceBaseline(frame.value);
				},
				update: (frame) => {
					acceptIncrement(options.accept, frame);
				},
				failed: options.failed
			});
		}
		function acceptIncrement(accept, frame) {
			switch (frame.type) {
				case "upsert":
					accept.upsertView(frame.workspace);
					return;
				case "remove":
					accept.removeView(frame.workspaceId);
					return;
				case "order":
					accept.replaceOrder(frame.workspaceIds);
					return;
				case "archived":
					accept.replaceArchived(frame.archivedSessionIds);
					return;
				/* v8 ignore next -- the generated Remote codec validates this closed union */
				default: return assertNever(frame);
			}
		}
		/* v8 ignore next 3 -- closed-union backstop after generated Remote validation */
		function assertNever(value) {
			throw new Error(`unreachable Workspace increment: ${JSON.stringify(value)}`);
		}
		//#endregion
		exports.ClientWorkspaceModel = ClientWorkspaceModel;
		exports.WorkspaceController = WorkspaceController;
		exports.WorkspaceCreateError = WorkspaceCreateError;
		exports.apply = apply;
		exports.createWorkspaceStateStream = createWorkspaceStateStream;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map