import { posix, win32 } from "node:path";
import z from "@deepseek-ai/schemastery";
import { Remote, RemoteError, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { Deque } from "@deepseek-ai/dsh-deque";
//#region lib/types/changes.js
/**
* Producer of the `changes` stream: every `fs/observed` emission whose target
* lies inside a generation's workspace root becomes one frame of that
* generation. Instrumented filesystem operations emit these observations; the
* operating system is not watched.
* Each generation acknowledges its observation queue and resolved workspace
* root with `ready` before emitting any queued or live changes.
*/
/** Owns `fs/observed` observation and every open `changes` generation. */
var WorkspaceChangeFeed = class {
	ctx;
	followers = /* @__PURE__ */ new Set();
	/** @param ctx - Host context carrying the filesystem the observations come from. */
	constructor(ctx) {
		this.ctx = ctx;
		ctx.on("fs/observed", (target, observation) => {
			for (const follower of this.followers) follower.push([target, observation]);
		});
		ctx.effect(() => () => {
			for (const follower of this.followers) follower.close();
			this.followers.clear();
		}, "workspace-files.changes");
	}
	/**
	* Open one generation reporting observations inside `workspaceRoot`.
	* @param workspaceRoot - the session's workspace root path.
	* @param signal - generation cancellation.
	* @returns `ready` after observation is active and the root resolves, then
	*   observations made after the generation was first pulled, in emission order.
	*/
	async *follow(workspaceRoot, signal) {
		signal.throwIfAborted();
		const follower = new ChangeFollower();
		this.followers.add(follower);
		try {
			const root = await this.ctx.fs.resolve(workspaceRoot, { signal }).catch((error) => {
				if (signal.aborted) return void 0;
				throw error;
			});
			if (root === void 0 || signal.aborted || follower.isClosed) return;
			yield { kind: "ready" };
			for await (const [target, observation] of follower.read(signal)) {
				if (!this.ctx.fs.contains(root, target)) continue;
				const absolutePath = this.ctx.fs.processPath(target);
				yield {
					kind: "change",
					change: observation.kind === "present" ? {
						absolutePath,
						version: observation.version
					} : {
						absolutePath,
						absent: true
					}
				};
			}
		} finally {
			this.followers.delete(follower);
			follower.close();
		}
	}
};
/** One generation's queue: observations wait here until its consumer pulls them. */
var ChangeFollower = class {
	queue = new Deque();
	wake;
	closed = false;
	/** Whether the generation was closed while its workspace root resolved. */
	get isClosed() {
		return this.closed;
	}
	push(observed) {
		this.queue.pushBack(observed);
		this.wake?.();
	}
	close() {
		this.closed = true;
		this.wake?.();
	}
	/** Drain until closed or aborted; anything still queued then is dropped with the generation. */
	async *read(signal) {
		const abort = () => {
			this.close();
		};
		signal.addEventListener("abort", abort, { once: true });
		if (signal.aborted) abort();
		try {
			while (!this.closed) {
				const observed = this.queue.popFront();
				if (observed !== void 0) {
					yield observed;
					continue;
				}
				await new Promise((resolve) => {
					this.wake = resolve;
				});
				this.wake = void 0;
			}
		} finally {
			signal.removeEventListener("abort", abort);
		}
	}
};
//#endregion
//#region lib/types/index.js
/**
* Workspace file service: read-only file previews, workspace directory
* listings, and the filesystem-observation change feed, exposed as
* `workspaceFiles`.
*
* File reads follow the composed filesystem's read access, including paths
* outside the workspace. The selected Session header supplies the base for
* relative paths, with the sandbox policy root as its no-cwd fallback, not a
* read-containment restriction. Directory listings and change observations
* remain workspace-scoped. File-kind checks and configured read caps apply to
* every preview; this service exposes no mutations.
*
* A page is cut from `streamText`, which decodes and rejects non-UTF-8 as it
* goes, so the file is read only up to the first character past the page and
* never held whole in memory; the NUL scan runs on the page itself.
*
* This is NOT modelled on `session.openWorkspacePath`. That endpoint hands a
* path to the local opener and leaves the effect on the machine; this one sends
* file content across the wire, which is a different level of exposure.
*/
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
/** The byte text never carries: its presence marks a page as binary. */
const NUL = String.fromCharCode(0);
/** Refuse anything the wire schema admits as a number but a window cannot use: only safe integers index a file. */
function integerAtLeast(value, min, name) {
	if (!Number.isSafeInteger(value) || value < min) throw new RemoteError("gateway/bad-request", `${name} must be a safe integer of at least ${min}`, {});
	return value;
}
/**
* Cut lines `offset` through `offset + limit - 1` from decoded chunks, stopping
* at the first character past the page so the rest of the file is never read.
* Lines before the page are counted, not kept, and the page is refused the
* moment its bytes exceed `maxBytes`, so one giant line cannot grow memory past
* the cap either.
*/
async function cutPage(chunks, offset, limit, maxBytes, path) {
	const last = offset + limit - 1;
	const lines = [];
	let current = "";
	let bytes = 0;
	let lineNumber = 1;
	const admit = (size) => {
		bytes += size;
		if (bytes > maxBytes) throw new RemoteError("workspace-file/too-large", `lines ${offset}-${last} of "${path}" exceed the ${maxBytes} byte cap`, {
			path,
			limit: maxBytes
		});
	};
	const complete = () => {
		if (lines.length > 0) admit(1);
		lines.push(current);
		current = "";
	};
	for await (const chunk of chunks) {
		let position = 0;
		while (position < chunk.length) {
			if (lineNumber > last) return {
				text: lines.join("\n"),
				lines: lines.length,
				eof: false
			};
			const newline = chunk.indexOf("\n", position);
			const segment = newline === -1 ? chunk.slice(position) : chunk.slice(position, newline);
			if (lineNumber >= offset) {
				admit(Buffer.byteLength(segment, "utf8"));
				current += segment;
			}
			if (newline === -1) break;
			if (lineNumber >= offset) complete();
			lineNumber += 1;
			position = newline + 1;
		}
	}
	if (current.length > 0) complete();
	return {
		text: lines.join("\n"),
		lines: lines.length,
		eof: true
	};
}
/**
* Workspace path of `target` relative to `root`, derived from the two canonical
* `file:` URIs so the answer is `/`-joined on every platform. Empty for the root.
*/
function workspacePathOf(rootUrl, targetUrl) {
	const root = new URL(rootUrl).pathname.replace(/\/+$/, "");
	const target = new URL(targetUrl).pathname;
	if (target === root) return "";
	return target.slice(root.length + 1).split("/").map(decodeURIComponent).join("/");
}
/** Strip the resolved child target: the wire carries names and metadata only. */
function directoryEntry(child) {
	return {
		name: child.name,
		type: child.type,
		...child.size === void 0 ? {} : { size: child.size }
	};
}
/** Host Remote file reads and workspace directory observations over the composed filesystem. */
let WorkspaceFiles = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _read_decorators;
	let _readBytes_decorators;
	let _readAll_decorators;
	let _readRelated_decorators;
	let _stat_decorators;
	let _list_decorators;
	let _changes_decorators;
	return class WorkspaceFiles extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_read_decorators = [Remote];
			_readBytes_decorators = [Remote];
			_readAll_decorators = [Remote];
			_readRelated_decorators = [Remote];
			_stat_decorators = [Remote];
			_list_decorators = [Remote];
			_changes_decorators = [Remote({ mode: "stream" })];
			__esDecorate(this, null, _read_decorators, {
				kind: "method",
				name: "read",
				static: false,
				private: false,
				access: {
					has: (obj) => "read" in obj,
					get: (obj) => obj.read
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _readBytes_decorators, {
				kind: "method",
				name: "readBytes",
				static: false,
				private: false,
				access: {
					has: (obj) => "readBytes" in obj,
					get: (obj) => obj.readBytes
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _readAll_decorators, {
				kind: "method",
				name: "readAll",
				static: false,
				private: false,
				access: {
					has: (obj) => "readAll" in obj,
					get: (obj) => obj.readAll
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _readRelated_decorators, {
				kind: "method",
				name: "readRelated",
				static: false,
				private: false,
				access: {
					has: (obj) => "readRelated" in obj,
					get: (obj) => obj.readRelated
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _stat_decorators, {
				kind: "method",
				name: "stat",
				static: false,
				private: false,
				access: {
					has: (obj) => "stat" in obj,
					get: (obj) => obj.stat
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _list_decorators, {
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
			__esDecorate(this, null, _changes_decorators, {
				kind: "method",
				name: "changes",
				static: false,
				private: false,
				access: {
					has: (obj) => "changes" in obj,
					get: (obj) => obj.changes
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
		config = __runInitializers(this, _instanceExtraInitializers);
		static inject = [
			"fs",
			"sandboxPolicy",
			"sessions",
			"typert"
		];
		static Config = z.object({
			maxBytes: z.number().step(1).min(1).default(2 * 1024 * 1024),
			maxFileBytes: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER - 1).default(32 * 1024 * 1024),
			maxLines: z.number().step(1).min(1).default(5e3),
			maxEntries: z.number().step(1).min(1).default(2e3)
		});
		feed;
		/**
		* @param ctx - Host context carrying the filesystem and the sandbox policy.
		* @param config - deployment caps on one page or one listing.
		*/
		constructor(ctx, config) {
			super(ctx, "workspaceFiles");
			this.config = config;
			this.feed = new WorkspaceChangeFeed(ctx);
			ctx.inject(["sessions", "typert"], (scope) => {
				scope.typert.lookups.register("workspaceFileScope", {
					parameter: "workspaceFileScope",
					wire: "workspaceFileScopeId",
					hostTypeSymbol: "@deepseek-ai/dsh-api-workspace-files#WorkspaceFileScope",
					wireTypeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
					resolve: async (sessionId) => {
						const live = scope.sessions.get(sessionId)?.header;
						const stored = live === void 0 ? await scope.get("sessionPersistence")?.stat(sessionId) : void 0;
						const header = live ?? stored?.header;
						if (header === void 0) return void 0;
						return {
							sessionId,
							workspaceRoot: header.cwd ?? scope.sandboxPolicy.workspaceRoot
						};
					}
				});
			});
		}
		/**
		* Read one page of lines from a UTF-8 file readable by the filesystem backend.
		* @param workspaceFileScope - header-derived workspace root for the Session identity on the wire.
		* @param path - absolute path or path relative to the workspace root; files outside it are allowed.
		* @param range - the line window; omitted fields take the page defaults.
		* @param signal - caller cancellation.
		* @returns the page, the file's version at the stat before it, and whether it reaches the last line.
		*/
		async read(workspaceFileScope, path, range, signal) {
			const { offset, limit } = this.resolvePage(range);
			const { target, info } = await this.locateFile(workspaceFileScope, path, signal);
			const page = await this.cutPage(target, offset, limit, signal, path);
			if (page.text.includes(NUL)) throw new RemoteError("workspace-file/not-text", `"${path}" contains NUL bytes`, { path });
			return {
				...this.statOf(target, info),
				offset,
				text: page.text,
				lines: page.lines,
				eof: page.eof
			};
		}
		/**
		* Read one byte window of a regular file readable by the filesystem backend: raw
		* bytes, no text decoding and no binary rejection.
		* @param workspaceFileScope - header-derived workspace root for the Session identity on the wire.
		* @param path - absolute path or path relative to the workspace root; files outside it are allowed.
		* @param range - the byte window; omitted fields take the window defaults.
		* @param signal - caller cancellation.
		* @returns the window in base64, the file's version and size at the stat before it, and whether it reaches the last byte.
		*/
		async readBytes(workspaceFileScope, path, range, signal) {
			const { offset, length } = this.resolveWindow(range, path);
			const { target, info } = await this.locateFile(workspaceFileScope, path, signal);
			const data = await this.ctx.fs.readByteRange(target, {
				offset,
				length
			}, signal);
			const eof = info.size === void 0 ? data.length < length : offset + data.length >= info.size;
			return {
				...this.statOf(target, info),
				offset,
				data: Buffer.from(data).toString("base64"),
				eof
			};
		}
		/**
		* Read a complete regular file as bytes, subject to the configured full-file cap.
		* @param workspaceFileScope - header-derived workspace root for the Session identity on the wire.
		* @param path - absolute or workspace-relative file path.
		* @param signal - caller cancellation.
		* @returns one complete base64 window with offset zero and eof true; oversized files fail with too-large.
		*/
		async readAll(workspaceFileScope, path, signal) {
			const { target, info } = await this.locateFile(workspaceFileScope, path, signal);
			const limit = this.config.maxFileBytes;
			if (info.size !== void 0 && info.size > limit) throw new RemoteError("workspace-file/too-large", `"${path}" exceeds the ${limit} byte full-file cap`, {
				path,
				limit
			});
			const data = await this.ctx.fs.readByteRange(target, {
				offset: 0,
				length: limit + 1
			}, signal);
			if (data.length > limit) throw new RemoteError("workspace-file/too-large", `"${path}" exceeds the ${limit} byte full-file cap`, {
				path,
				limit
			});
			return {
				...this.statOf(target, info),
				offset: 0,
				data: Buffer.from(data).toString("base64"),
				eof: true
			};
		}
		/**
		* Read a complete file relative to another file's directory, including outside the workspace.
		* @param workspaceFileScope - header-derived workspace root for the Session identity on the wire.
		* @param path - base file, absolute or workspace-relative.
		* @param relativePath - relative filesystem path, not a URL or absolute path.
		* @param signal - caller cancellation.
		* @returns the complete related file using the ordinary file-size and access checks.
		*/
		async readRelated(workspaceFileScope, path, relativePath, signal) {
			const relative = relativePath.replace(/\\/g, "/");
			if (relative.length === 0 || relative.startsWith("/") || /^[a-z][a-z\d+.-]*:/iu.test(relative) || relative.includes(NUL)) throw new RemoteError("gateway/bad-request", "relativePath must be a relative filesystem path", {});
			const { target } = await this.locateFile(workspaceFileScope, path, signal);
			const absolute = this.ctx.fs.processPath(target);
			const paths = absolute.startsWith("/") ? posix : win32;
			return this.readAll(workspaceFileScope, paths.resolve(paths.dirname(absolute), relative), signal);
		}
		/**
		* Report one regular file's identity, version, and size without its content.
		* @param workspaceFileScope - header-derived workspace root for the Session identity on the wire.
		* @param path - absolute path or path relative to the workspace root; files outside it are allowed.
		* @param signal - caller cancellation.
		* @returns the file's absolute path, current version, and byte size.
		*/
		async stat(workspaceFileScope, path, signal) {
			const { target, info } = await this.locateFile(workspaceFileScope, path, signal);
			return this.statOf(target, info);
		}
		/**
		* List the direct children of one directory inside the Session's workspace.
		* @param workspaceFileScope - header-derived workspace root for the Session identity on the wire.
		* @param path - workspace path, absolute or relative to the workspace root.
		* @param signal - caller cancellation.
		* @returns the directory's children in the backend's stable name order, bounded by the entry cap.
		*/
		async list(workspaceFileScope, path, signal) {
			const { root, workspaceRoot, entry } = await this.inspect(workspaceFileScope, path, signal);
			if (entry.type !== "directory") throw new RemoteError("workspace-file/not-directory", `"${path}" is a ${entry.type}`, {
				path,
				kind: entry.type
			});
			const target = await this.confine(root, workspaceRoot, path, signal);
			const children = await this.ctx.fs.listDir(target, signal);
			return {
				path: workspacePathOf(this.ctx.fs.fileUrl(root), this.ctx.fs.fileUrl(target)),
				entries: children.slice(0, this.config.maxEntries).map(directoryEntry),
				truncated: children.length > this.config.maxEntries
			};
		}
		/**
		* Stream every `fs/observed` observation of a file inside the Session's
		* workspace. Only instrumented filesystem operations report here; the OS is
		* not watched.
		* @param workspaceFileScope - header-derived workspace root for the Session identity on the wire.
		* @param signal - generation cancellation.
		* @returns `ready` once the Host observation queue is active and the workspace
		*   root is resolved, then queued and live observations in emission order.
		*/
		changes(workspaceFileScope, signal) {
			return this.feed.follow(workspaceFileScope.workspaceRoot, signal);
		}
		/** Apply the page defaults and caps here, so the request never carries them implicitly. */
		resolvePage(range) {
			const offset = range.offset === void 0 ? 1 : integerAtLeast(range.offset, 1, "offset");
			const limit = range.limit === void 0 ? this.config.maxLines : integerAtLeast(range.limit, 1, "limit");
			if (limit > this.config.maxLines) throw new RemoteError("gateway/bad-request", `limit must be at most ${this.config.maxLines}`, {});
			return {
				offset,
				limit
			};
		}
		/** Apply the byte-window defaults and cap; a window above the cap is refused, not shortened. */
		resolveWindow(range, path) {
			const offset = range.offset === void 0 ? 0 : integerAtLeast(range.offset, 0, "offset");
			const length = range.length === void 0 ? this.config.maxBytes : integerAtLeast(range.length, 1, "length");
			if (offset + length > Number.MAX_SAFE_INTEGER) throw new RemoteError("gateway/bad-request", "offset plus length must stay a safe integer", {});
			if (length > this.config.maxBytes) throw new RemoteError("workspace-file/too-large", `${length} bytes of "${path}" exceed the ${this.config.maxBytes} byte cap`, {
				path,
				limit: this.config.maxBytes
			});
			return {
				offset,
				length
			};
		}
		/**
		* Inspect the requested path itself before resolution follows its final
		* component. Directory containment is checked separately by `list`.
		*/
		async inspect(workspaceFileScope, path, signal) {
			if (path.length === 0) throw new RemoteError("gateway/bad-request", "path is required", {});
			const { workspaceRoot } = workspaceFileScope;
			const root = await this.ctx.fs.resolve(workspaceRoot, { signal });
			const entry = await this.ctx.fs.lstat(path, { cwd: workspaceRoot }, signal);
			if (entry === void 0) throw new RemoteError("workspace-file/not-found", `no entry at "${path}"`, { path });
			return {
				root,
				workspaceRoot,
				entry
			};
		}
		/** Resolve an inspected path and refuse it unless the workspace contains it. */
		async confine(root, workspaceRoot, path, signal) {
			const target = await this.ctx.fs.resolve(path, {
				cwd: workspaceRoot,
				signal
			});
			if (!this.ctx.fs.contains(root, target)) throw new RemoteError("workspace-file/outside-workspace", `"${path}" is outside the workspace`, { path });
			return target;
		}
		/**
		* All gates for a regular file, ending in the one stat that names its version
		* and size. The stat re-checks what `lstat` saw: the file may have gone or
		* changed kind in between.
		*/
		async locateFile(workspaceFileScope, path, signal) {
			const { workspaceRoot, entry } = await this.inspect(workspaceFileScope, path, signal);
			if (entry.type !== "file") throw new RemoteError("workspace-file/not-regular-file", `"${path}" is a ${entry.type}`, {
				path,
				kind: entry.type
			});
			const target = await this.ctx.fs.resolve(path, {
				cwd: workspaceRoot,
				signal
			});
			const info = await this.ctx.fs.stat(target, signal);
			if (info === void 0) throw new RemoteError("workspace-file/not-found", `no entry at "${path}"`, { path });
			if (info.type !== "file") throw new RemoteError("workspace-file/not-regular-file", `"${path}" is a ${info.type}`, {
				path,
				kind: info.type
			});
			return {
				target,
				info
			};
		}
		statOf(target, info) {
			return {
				absolutePath: this.ctx.fs.processPath(target),
				version: info.version,
				...info.size === void 0 ? {} : { bytes: info.size }
			};
		}
		/** Stream the file as text and cut the page, classifying the backend's non-text refusal. */
		async cutPage(target, offset, limit, signal, path) {
			try {
				return await cutPage(await this.ctx.fs.streamText(target, signal), offset, limit, this.config.maxBytes, path);
			} catch (error) {
				if (isNotTextRefusal(error)) throw new RemoteError("workspace-file/not-text", `"${path}" is not UTF-8 text`, { path }, { cause: error });
				throw error;
			}
		}
	};
})();
/**
* The backend's non-text refusal, recognized by its code alone: the error class
* belongs to whichever `dsh-fs` instance the provider loaded, so no class
* identity is shared across the package boundary.
*/
function isNotTextRefusal(error) {
	return typeof error === "object" && error !== null && "code" in error && error.code === "FS_NOT_TEXT";
}
//#endregion
export { WorkspaceFiles, WorkspaceFiles as default };
