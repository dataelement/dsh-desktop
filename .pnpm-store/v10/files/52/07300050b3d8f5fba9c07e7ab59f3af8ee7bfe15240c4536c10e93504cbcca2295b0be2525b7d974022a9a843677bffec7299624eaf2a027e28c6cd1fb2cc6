import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { Service } from "@deepseek-ai/cordis";
import s from "@deepseek-ai/schemastery";
import { z } from "zod";
import { FEEDBACK_CATEGORIES } from "@deepseek-ai/dsh-command-feedback";
import { SessionSeq } from "@deepseek-ai/dsh-session/types";
import { deriveEventMessage, isAppendSurfaceEvent } from "@deepseek-ai/dsh-session/surface";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
//#region lib/types/index.js
/**
* Canonical Session-log feedback for finalized assistant messages.
* @module @deepseek-ai/dsh-message-feedback
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
const timestamp = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const itemSchema = z.object({
	messageId: z.string().min(1),
	rating: z.enum(["positive", "negative"]),
	note: z.string().refine((note) => note.trim().length > 0).optional(),
	category: z.enum(FEEDBACK_CATEGORIES).optional(),
	version: z.uuid(),
	createdAt: timestamp,
	updatedAt: timestamp
}).refine((item) => item.updatedAt >= item.createdAt);
const putSchema = z.object({
	sessionId: z.string().min(1),
	item: itemSchema
});
const deleteSchema = z.object({
	sessionId: z.string().min(1),
	messageId: z.string().min(1)
});
/** Return a caller-owned immutable value, detached from the log. */
function snapshotItem(item) {
	return Object.freeze({ ...item });
}
function success(value) {
	return Object.freeze({
		ok: true,
		value
	});
}
function rejected(error) {
	return Object.freeze({
		ok: false,
		error: Object.freeze(error)
	});
}
/** Validate persisted payloads before deriving current, Session-owned feedback. */
function currentItems(sessionId, events) {
	const items = /* @__PURE__ */ new Map();
	for (const event of events) switch (event.type) {
		case "feedback/message-put":
			putSchema.parse(event.data);
			if (event.data.sessionId === sessionId) items.set(event.data.item.messageId, event.data.item);
			break;
		case "feedback/message-delete":
			deleteSchema.parse(event.data);
			if (event.data.sessionId === sessionId) items.delete(event.data.messageId);
			break;
		default: break;
	}
	return [...items.values()];
}
/** Session-log service; cold operations never construct a Session or Agent. */
let MessageFeedbackService = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _list_decorators;
	let _put_decorators;
	let _delete_decorators;
	return class MessageFeedbackService extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_list_decorators = [Remote("list")];
			_put_decorators = [Remote("put")];
			_delete_decorators = [Remote("delete")];
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
			__esDecorate(this, null, _put_decorators, {
				kind: "method",
				name: "put",
				static: false,
				private: false,
				access: {
					has: (obj) => "put" in obj,
					get: (obj) => obj.put
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
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		static inject = ["sessionPersistence", "sessions"];
		/** Loader validation for the required note-size policy. */
		static Config = s.object({ maxNoteBytes: s.number().step(1).min(1).required() });
		maxNoteBytes = __runInitializers(this, _instanceExtraInitializers);
		operationTails = /* @__PURE__ */ new Map();
		mutationAdmissionOpen = true;
		/**
		* @param ctx - Host context carrying Session persistence and live owners.
		* @param config - Required note-size policy.
		*/
		constructor(ctx, config) {
			super(ctx, "messageFeedback");
			if (!Number.isSafeInteger(config.maxNoteBytes) || config.maxNoteBytes < 1) throw new TypeError("message-feedback: maxNoteBytes must be a positive safe integer");
			this.maxNoteBytes = config.maxNoteBytes;
		}
		[Service.init]() {
			this.ctx.effect(() => async () => {
				this.mutationAdmissionOpen = false;
				await Promise.all(this.operationTails.values());
			}, "message-feedback.drain");
		}
		/**
		* Read current feedback from the canonical log.
		* @param request - Session to inspect.
		* @returns immutable items or a definite persistence miss.
		*/
		list(request) {
			return this.enqueue(request.sessionId, () => this.withSession(request.sessionId, false, (events) => success(Object.freeze({ items: Object.freeze(currentItems(request.sessionId, events).map(snapshotItem)) }))));
		}
		/**
		* Create or replace feedback after checking its current version.
		* Matching no-ops retain the version and append no event.
		* @param request - Target, desired value, and observed item version.
		* @returns the durable item or an explicit business failure.
		*/
		put(request) {
			const note = this.resolveNote(request.note);
			if (!note.ok) return Promise.resolve(note);
			return this.enqueue(request.sessionId, () => this.withSession(request.sessionId, true, async (events, append) => {
				const items = currentItems(request.sessionId, events);
				if (!events.some((event) => event.type === "assistant/message" && isAppendSurfaceEvent(event) && deriveEventMessage(event)?.id === request.messageId)) return rejected({
					code: "target-not-found",
					sessionId: request.sessionId,
					messageId: request.messageId
				});
				const existing = items.find((item) => item.messageId === request.messageId);
				if (request.ifVersion !== (existing?.version ?? null)) return rejected(this.versionConflict(existing ?? null));
				if (existing !== void 0 && existing.rating === request.rating && existing.note === note.value && existing.category === request.category) {
					await append();
					return success(snapshotItem(existing));
				}
				const now = Date.now();
				const item = {
					messageId: request.messageId,
					rating: request.rating,
					...note.value === void 0 ? {} : { note: note.value },
					...request.category === void 0 ? {} : { category: request.category },
					version: randomUUID(),
					createdAt: existing?.createdAt ?? now,
					updatedAt: existing === void 0 ? now : Math.max(now, existing.updatedAt)
				};
				await append({
					type: "feedback/message-put",
					data: {
						sessionId: request.sessionId,
						item
					}
				});
				return success(snapshotItem(item));
			}));
		}
		/**
		* Delete one item after checking its version; absence succeeds without an event.
		* @param request - Session, message, and observed item version.
		* @returns the stable absent postcondition or an explicit failure.
		*/
		delete(request) {
			return this.enqueue(request.sessionId, () => this.withSession(request.sessionId, true, async (events, append) => {
				const existing = currentItems(request.sessionId, events).find((item) => item.messageId === request.messageId);
				if (existing !== void 0) {
					if (request.ifVersion !== existing.version) return rejected(this.versionConflict(existing));
					await append({
						type: "feedback/message-delete",
						data: {
							sessionId: request.sessionId,
							messageId: request.messageId
						}
					});
				} else await append();
				return success(Object.freeze({ absent: true }));
			}));
		}
		/** Hold cold write ownership across read/compare/append; use live owners directly. */
		async withSession(sessionId, write, operation) {
			if (this.ctx.sessions.get(sessionId) === void 0 && await this.ctx.sessionPersistence.stat(sessionId) === void 0 && this.ctx.sessions.get(sessionId) === void 0) return rejected({
				code: "session-not-found",
				sessionId
			});
			const live = this.ctx.sessions.get(sessionId);
			if (live !== void 0) return operation(live.snapshotEvents(), async (event) => {
				if (event !== void 0) live.append(event.type, event.data);
				const last = live.snapshotEvents().at(-1);
				if (!await this.ctx.sessions.flush(live)) throw new Error(`message-feedback: no durability listener participated for live session '${sessionId}'`);
				const handle = await this.ctx.sessionPersistence.open(sessionId, "read");
				try {
					const { events: stored } = await handle.read(last?.seq ?? 0, 1);
					if (!isDeepStrictEqual([
						handle.header.id,
						handle.header.createdAt,
						handle.header.cwd
					], [
						live.header.id,
						live.header.createdAt,
						live.header.cwd
					]) || last !== void 0 && !isDeepStrictEqual(stored[0], last)) throw new Error(`message-feedback: feedback prefix is not durable for live session '${sessionId}'`);
				} finally {
					await handle.close();
				}
			});
			const handle = await this.ctx.sessionPersistence.open(sessionId, write ? "write" : "read");
			try {
				const { events } = await handle.read();
				return await operation(events, async (event) => {
					const entry = event === void 0 ? void 0 : {
						...event,
						seq: SessionSeq(events.length),
						time: Date.now()
					};
					if (entry !== void 0) await handle.append([entry]);
					await handle.flush();
					if (entry !== void 0) try {
						await this.ctx.parallel("feedback/committed", {
							meta: handle.header,
							inheritedEventCount: handle.inheritedEventCount,
							events: [...events, entry]
						});
					} catch (error) {
						this.ctx.logger.warn("message-feedback: committed feedback observer failed", error);
					}
				});
			} finally {
				await handle.close();
			}
		}
		resolveNote(note) {
			if (note === void 0) return success(void 0);
			if (note.trim().length === 0) return rejected({ code: "note-blank" });
			const actualBytes = Buffer.byteLength(note, "utf8");
			if (actualBytes > this.maxNoteBytes) return rejected({
				code: "note-too-large",
				maxBytes: this.maxNoteBytes,
				actualBytes
			});
			return success(note);
		}
		versionConflict(current) {
			return {
				code: "version-conflict",
				current: current === null ? null : snapshotItem(current)
			};
		}
		/** Serialize complete operations and drain their handles before disposal. */
		enqueue(sessionId, operation) {
			if (!this.mutationAdmissionOpen) return Promise.reject(/* @__PURE__ */ new Error("message-feedback: service is disposing"));
			const result = (this.operationTails.get(sessionId) ?? Promise.resolve()).then(operation);
			const tail = result.then(() => void 0, () => void 0);
			this.operationTails.set(sessionId, tail);
			return result.finally(() => {
				if (this.operationTails.get(sessionId) === tail) this.operationTails.delete(sessionId);
			});
		}
	};
})();
//#endregion
export { MessageFeedbackService, MessageFeedbackService as default };
