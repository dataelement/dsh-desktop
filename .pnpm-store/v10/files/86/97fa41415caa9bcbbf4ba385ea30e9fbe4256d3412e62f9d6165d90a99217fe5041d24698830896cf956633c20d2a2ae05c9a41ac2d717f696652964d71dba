window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-api-workspace-files",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		require("@deepseek-ai/cordis");
		//#region lib/types/client/change-feed.js
		/**
		* The follower key of one absolute path.
		* @param path - an absolute path from a Host stat or change frame.
		* @returns the path with `\\` normalized to `/`.
		*/
		function keyOf(path) {
			return path.replace(/\\/g, "/");
		}
		/** Notices of one follower, delivered in order and pulled by its consumer. */
		var Follower = class {
			leave;
			pending = [];
			started = Promise.withResolvers();
			wake;
			ended = false;
			hostKey;
			/**
			* Resolves true after the Host acknowledges its subscription, or false if
			* this follower ends before acknowledgement.
			*/
			ready = this.started.promise;
			/**
			* @param leave - unregisters this follower and its abort listener.
			*/
			constructor(leave) {
				this.leave = leave;
			}
			/**
			* Select the Host path for queued and future changes.
			* @param absolutePath - the successful stat's absolute path.
			*/
			bind(absolutePath) {
				this.hostKey = keyOf(absolutePath);
			}
			/** The Host acknowledged an active subscription and resolved workspace root. */
			start() {
				this.started.resolve(true);
			}
			/**
			* Queue one notice.
			* @param notice - what the consumer receives next.
			* @param key - normalized Host path for the change.
			*/
			push(notice, key) {
				this.pending.push({
					key,
					notice
				});
				this.wake?.();
			}
			/** Deliver what is queued, then finish. */
			end() {
				this.ended = true;
				this.started.resolve(false);
				this.wake?.();
			}
			/** Unregister even when the consumer has not started pulling notices. */
			dispose() {
				this.leave();
			}
			/** @inheritdoc */
			async *[Symbol.asyncIterator]() {
				try {
					while (true) {
						const next = this.pending.shift();
						if (next !== void 0) {
							if (this.hostKey === void 0 || next.key === this.hostKey) yield next.notice;
							continue;
						}
						if (this.ended) return;
						await new Promise((resolve) => {
							this.wake = resolve;
						});
						this.wake = void 0;
					}
				} finally {
					this.dispose();
				}
			}
		};
		/** The stream and followers of one session. */
		var SessionFeed = class {
			onClose;
			followers = /* @__PURE__ */ new Set();
			stream;
			closed = false;
			started = false;
			/**
			* @param remote - the Remote face carrying `workspaceFiles.changes`.
			* @param sessionId - the session whose writes this feed follows.
			* @param after - the previous feed of this session still closing, if any; the stream opens once it has settled.
			* @param onClose - called once when the stream is gone, whatever the cause, with the dispose that is closing it.
			*/
			constructor(remote, sessionId, after, onClose) {
				this.onClose = onClose;
				this.stream = remote.$stream({
					name: `workspace file changes of ${sessionId}`,
					open: (signal) => {
						this.started = false;
						return openAfter(after, () => remote.workspaceFiles.changes(sessionId, signal));
					},
					ended: () => /* @__PURE__ */ new Error(`workspace file changes of ${sessionId} ended`)
				});
				this.pump();
			}
			/**
			* Register one resource address before its Host path is known.
			* @param follower - receives changes and binds its path after stat.
			*/
			add(follower) {
				this.followers.add(follower);
				if (this.started) follower.start();
			}
			/**
			* Unregister one follower; the last one leaving disposes the stream.
			* @param follower - the follower to drop.
			*/
			remove(follower) {
				this.followers.delete(follower);
				if (this.followers.size === 0) this.close();
			}
			async pump() {
				try {
					for await (const item of this.stream) {
						const frame = item.value;
						switch (frame.kind) {
							case "ready":
								item.accept();
								this.started = true;
								for (const follower of this.followers) follower.start();
								break;
							case "change": {
								const key = keyOf(frame.change.absolutePath);
								const notice = editOf(frame.change);
								for (const follower of this.followers) follower.push(notice, key);
								break;
							}
							default: assertNever(frame);
						}
					}
				} catch {} finally {
					this.close();
				}
			}
			close() {
				if (this.closed) return;
				this.closed = true;
				const closed = this.stream.dispose();
				for (const follower of this.followers) follower.end();
				this.followers.clear();
				this.onClose(closed);
			}
		};
		/**
		* Open a Host stream once a predecessor has finished closing.
		* @param after - the predecessor's dispose, or nothing to wait for.
		* @param open - opens the stream.
		* @returns the stream's items.
		*/
		async function* openAfter(after, open) {
			await after;
			yield* open();
		}
		/**
		* The write one Host frame reports.
		* @param frame - the Host frame.
		* @returns the edit notice followers receive.
		*/
		function editOf(frame) {
			return "absent" in frame ? { kind: "absent" } : {
				kind: "changed",
				version: frame.version
			};
		}
		function assertNever(frame) {
			throw new Error(`Unexpected workspace file watch frame: ${JSON.stringify(frame)}`);
		}
		/**
		* Per-session fan-out of the Host's workspace file change stream.
		*
		* Owned by the provider; one instance serves every session of the Client.
		*/
		var ChangeFeed = class {
			remote;
			/** Live feeds only: a feed removes itself when its stream closes. */
			sessions = /* @__PURE__ */ new Map();
			/** Streams still closing, by session: the session's next feed opens after its predecessor has settled. */
			closing = /* @__PURE__ */ new Map();
			/**
			* @param remote - the Remote face carrying `$stream` and `workspaceFiles.changes`.
			*/
			constructor(remote) {
				this.remote = remote;
			}
			/**
			* Follow one resource in one session before its Host path is known.
			*
			* The follower is registered on call, not on first pull. Changes delivered
			* to this Client are queued while stat is pending. The first follower starts
			* the session's local `changes` call. The iterable ends
			* when `signal` aborts or when the session stream is gone; ending it early
			* (`break`, `return`) unregisters the follower as well, and the last follower
			* of a session disposes its stream. Await a true `ready` result before stat
			* so the Host subscription is active, then bind each stat's absolute path. Until binding,
			* any session write can trigger a retry; after binding, only matching queued
			* and live changes pass.
			* @param sessionId - the session whose workspace holds the file.
			* @param signal - ends the follow.
			* @returns a single-consumer subscription with Host-path binding and explicit disposal.
			*/
			follow(sessionId, signal) {
				const feed = signal.aborted ? void 0 : this.feedOf(sessionId);
				const leave = () => {
					signal.removeEventListener("abort", leave);
					follower.end();
					feed?.remove(follower);
				};
				const follower = new Follower(leave);
				if (feed === void 0) follower.end();
				else {
					feed.add(follower);
					signal.addEventListener("abort", leave, { once: true });
				}
				return follower;
			}
			/**
			* Wait for every stream that is still closing, so an owner tearing down
			* leaves no Host stream behind.
			* @returns resolves once no stream of this feed is closing.
			*/
			async settle() {
				await Promise.all(this.closing.values());
			}
			feedOf(sessionId) {
				const existing = this.sessions.get(sessionId);
				if (existing !== void 0) return existing;
				const feed = new SessionFeed(this.remote, sessionId, this.closing.get(sessionId), (closed) => {
					this.sessions.delete(sessionId);
					const tracked = closed.then(() => void 0, () => void 0).then(() => {
						if (this.closing.get(sessionId) === tracked) this.closing.delete(sessionId);
					});
					this.closing.set(sessionId, tracked);
				});
				this.sessions.set(sessionId, feed);
				return feed;
			}
		};
		//#endregion
		//#region ../../typert/protocol/lib/index.js
		/** The one Remote failure class shared by owners, the Gateway, and consumers. */
		/**
		* One Remote call failure: a real Error carrying its stable code and typed
		* details. Owners throw it at the failure point; the Host Gateway encodes it
		* onto the wire unchanged; the Client face rebuilds an instance for the
		* `RemoteResult` error branch, so `throw result.error` keeps throw semantics.
		* Discrimination is always by `code`, never by instanceof.
		*/
		var RemoteError = class extends Error {
			code;
			details;
			/** Structural marker: cross-realm/bundle identification never uses instanceof. */
			isDSHRemoteError = true;
			/**
			* @param code - stable failure code declared in {@link RemoteErrorDetailsMap}.
			* @param message - human diagnostic carried across the wire.
			* @param details - structured payload typed by the code.
			* @param options - standard Error options (`cause` survives in-process only).
			*/
			constructor(code, message, details, options) {
				super(message, options);
				this.code = code;
				this.details = details;
				this.name = "RemoteError";
			}
		};
		//#endregion
		//#region ../../util/workspace-path/lib/index.js
		/**
		* The `dsh-resource://file/…` address grammar: how a file is named across the
		* Sidebar and the resource model, built and parsed without touching a
		* filesystem.
		* @module
		*/
		/** The scheme and type every file address opens with. */
		const FILE_ADDRESS_PREFIX = "dsh-resource://file/";
		/** Whether a decoded first path segment is a Windows drive (`C:`). */
		function isDriveSegment(segment) {
			return segment !== void 0 && /^[A-Za-z]:$/.test(segment);
		}
		/**
		* Read a file address back into its parts without resolving `.` or `..`.
		* Query and fragment suffixes are ignored; encoded path segments are decoded.
		* @param address - a candidate address.
		* @returns the parts, or `undefined` when the string is not a `dsh-resource://file/` URI in a known scope with a path, or a segment is not validly encoded.
		*/
		function parseFileAddress(address) {
			try {
				if (!address.startsWith(FILE_ADDRESS_PREFIX)) return void 0;
				const end = address.search(/[?#]/);
				const [scope, ...rest] = address.slice(20, end === -1 ? void 0 : end).split("/");
				if (scope === "session") {
					const [id, ...segments] = rest;
					if (id === void 0 || id === "" || segments.length === 0) return void 0;
					return {
						scope,
						sessionId: decodeURIComponent(id),
						path: segments.map(decodeURIComponent).join("/")
					};
				}
				if (scope === "absolute") {
					const unc = rest[0] === "" && rest.length > 1;
					const segments = (unc ? rest.slice(1) : rest).map(decodeURIComponent);
					if (segments.length === 0 || segments[0] === "") return void 0;
					if (unc) return {
						scope,
						path: `//${segments.join("/")}`
					};
					return {
						scope,
						path: isDriveSegment(segments[0]) ? segments.join("/") : `/${segments.join("/")}`
					};
				}
				return;
			} catch {
				return;
			}
		}
		//#endregion
		//#region lib/types/client/provider.js
		/**
		* Build the `file` provider over one Remote face and one change feed.
		* @param remote - the Remote face carrying `workspaceFiles.stat`.
		* @param changes - the per-session change fan-out.
		* @returns the provider to register into `ctx.resources`.
		*/
		function createFileResourceProvider(remote, changes) {
			return {
				protocol: "file",
				async *open(address, { signal }) {
					const resolved = resolve(address);
					if (!resolved.ok) {
						yield resolved;
						return;
					}
					const { sessionId, path } = resolved.value;
					const notices = changes.follow(sessionId, signal);
					const stat = () => remote.workspaceFiles.stat(sessionId, path, signal);
					const aborted = () => signal.aborted;
					let current;
					try {
						if (!await notices.ready || aborted()) return;
						const first = await stat();
						if (aborted()) return;
						if (first.ok) {
							notices.bind(first.value.absolutePath);
							current = first.value;
							yield {
								ok: true,
								value: current
							};
						} else yield first;
						for await (const notice of notices) {
							if (current === void 0) {
								if (notice.kind === "absent") continue;
							} else if (notice.kind === "changed") {
								if (notice.version === current.version) continue;
								current = {
									...current,
									version: notice.version
								};
								yield {
									ok: true,
									value: current
								};
								continue;
							}
							const again = await stat();
							if (aborted()) return;
							if (!again.ok) {
								current = void 0;
								yield again;
								continue;
							}
							notices.bind(again.value.absolutePath);
							current = again.value;
							yield {
								ok: true,
								value: current
							};
						}
					} finally {
						notices.dispose();
					}
				}
			};
		}
		/**
		* Resolve one address to the Host call it stands for, or to the failure frame it earns.
		* @param address - the full address, scheme included.
		* @returns the Host file, or the `unsupported-address` / `unknown-workspace` failure.
		*/
		function resolve(address) {
			const parsed = parseFileAddress(address);
			if (parsed === void 0) return {
				ok: false,
				error: unsupportedAddress(address)
			};
			if (parsed.scope === "session") return {
				ok: true,
				value: {
					sessionId: parsed.sessionId,
					path: parsed.path
				}
			};
			return {
				ok: false,
				error: unknownWorkspace(address)
			};
		}
		/**
		* The failure frame's error for an address this provider does not serve.
		* @param address - the offending address.
		* @returns the typed error.
		*/
		function unsupportedAddress(address) {
			return new RemoteError("workspace-file/unsupported-address", `${address} is not a dsh-resource://file/session/<sessionId>/<path> or dsh-resource://file/absolute/<path> address`, { address });
		}
		/**
		* The failure frame's error for an absolute address with no Session.
		* @param address - the offending address.
		* @returns the typed error.
		*/
		function unknownWorkspace(address) {
			return new RemoteError("workspace-file/unknown-workspace", `${address} requires a dsh-resource://file/session/<sessionId>/<path> address`, { address });
		}
		//#endregion
		//#region lib/types/client/index.js
		/** Required browser services: the resource model, the Remote carrier and its namespace. */
		const inject = [
			"resources",
			"remote",
			"remote.workspaceFiles"
		];
		/**
		* Client plugin body: register the `file` provider for this plugin's lifetime.
		* @param ctx - client root context carrying `resources` and the Remote face.
		*/
		function apply(ctx) {
			const changes = new ChangeFeed(ctx.remote);
			const provider = createFileResourceProvider(ctx.remote, changes);
			ctx.effect(() => {
				const release = ctx.resources.register(provider);
				return async () => {
					release();
					await changes.settle();
				};
			}, "workspace-files: file resource provider");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map