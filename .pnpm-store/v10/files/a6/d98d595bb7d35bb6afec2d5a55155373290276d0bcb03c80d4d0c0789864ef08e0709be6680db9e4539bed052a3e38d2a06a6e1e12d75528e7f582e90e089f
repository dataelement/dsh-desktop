import { randomUUID } from "node:crypto";
import { Service, symbols } from "@deepseek-ai/cordis";
import { Deque } from "@deepseek-ai/dsh-deque";
import { MAX_TIMER_DELAY_MS } from "@deepseek-ai/dsh-timeout";
import z from "@deepseek-ai/schemastery";
import { RemoteError, remoteErrorOf, remoteMethods } from "@deepseek-ai/dsh-typert-protocol";
import WebSocket, { WebSocketServer } from "ws";
//#region lib/types/stream-protocol.js
/** Wire messages for Gateway-owned Remote streams and event-result RPCs. */
/** Exact WebSocket route carrying every Typert Remote stream. */
const REMOTE_STREAM_MUX_PATH = "/api/remote.mux";
/** Gateway-internal logical stream carrying application-selected Cordis events. */
const REMOTE_EVENT_STREAM_ENDPOINT = "$events";
/** Discriminator for the first item proving the Host event source is ready. */
const REMOTE_EVENT_STREAM_READY = { type: "ready" };
/**
* Parse one result sent through the Client's `$events/result` HTTP RPC.
* @param value - untrusted result payload.
* @returns validated event correlation and outcome fields.
*/
function parseRemoteEventResult(value) {
	if (!isRecord(value) || !exactKeys(value, [
		"clientId",
		"eventId",
		"outcome"
	]) || !isRemoteEventClientId(value.clientId) || !isRemoteEventId(value.eventId) || !isRecord(value.outcome)) throw new Error("api gateway: invalid Remote event result");
	const outcome = value.outcome;
	if (outcome.kind === "next" && exactKeys(outcome, ["kind"])) return {
		clientId: value.clientId,
		eventId: value.eventId,
		outcome: { kind: "next" }
	};
	if (outcome.kind === "result" && (exactKeys(outcome, ["kind"]) || exactKeys(outcome, ["kind", "value"])) && (!Object.hasOwn(outcome, "value") || isRemoteJsonValue(outcome.value))) return {
		clientId: value.clientId,
		eventId: value.eventId,
		outcome: Object.hasOwn(outcome, "value") ? {
			kind: "result",
			value: outcome.value
		} : { kind: "result" }
	};
	if (outcome.kind === "rejected" && exactKeys(outcome, ["kind", "error"])) return {
		clientId: value.clientId,
		eventId: value.eventId,
		outcome: {
			kind: "rejected",
			error: parseRemoteEventRejection(outcome.error)
		}
	};
	throw new Error("api gateway: invalid Remote event result");
}
/**
* Remove the direct Agent and cancellation fields from one waterfall request.
* @param value - request object before the waterfall's `next` callback.
* @param subject - Agent used by the Cordis scope carrier.
* @returns JSON-safe request fields and the optional Host cancellation signal.
*/
function projectRemoteEventRequest(value, subject) {
	if (!isPlainRecord(value) || !Object.hasOwn(value, "agent") || value.agent !== subject) throw new TypeError("api gateway: Remote event request must carry its scoped Agent directly");
	const signal = value.signal;
	if (signal !== void 0 && !(signal instanceof AbortSignal)) throw new TypeError("api gateway: Remote event request signal must be an AbortSignal");
	const request = Object.create(null);
	for (const key of Reflect.ownKeys(value)) {
		if (key === "agent" || key === "signal") continue;
		if (typeof key !== "string" || (typeof key === "string" ? Object.getOwnPropertyDescriptor(value, key) : void 0)?.enumerable !== true) throw new TypeError("api gateway: Remote event request has a non-JSON property");
		request[key] = Reflect.get(value, key);
	}
	if (!isRemoteJsonValue(request)) throw new TypeError("api gateway: Remote event request is not lossless JSON data");
	return {
		request,
		...signal === void 0 ? {} : { signal }
	};
}
/**
* Recreate a Client rejection for the Host continuation.
* @param rejection - validated wire-safe error fields.
* @returns an Error preserving the remote name, code, and JSON-safe details.
*/
function restoreRemoteEventRejection(rejection) {
	const error = new Error(rejection.message);
	error.name = rejection.name;
	if (rejection.code !== void 0) error.code = rejection.code;
	if (rejection.details !== void 0) error.details = rejection.details;
	return error;
}
/**
* Test whether a value crosses JSON transport without coercion or omission.
* @param value - candidate boundary value.
* @returns whether the value is losslessly JSON-compatible.
*/
function isRemoteJsonValue(value) {
	return visitJsonValue(value, /* @__PURE__ */ new Set());
}
/**
* Recognize a non-empty Remote Event correlation id at a wire boundary.
* @param value - untrusted wire value.
* @returns whether the value is a valid Remote Event id.
*/
function isRemoteEventId(value) {
	return typeof value === "string" && value.length > 0;
}
/**
* Recognize a non-empty Remote Event Client id at a wire boundary.
* @param value - untrusted wire value.
* @returns whether the value identifies one event-stream generation.
*/
function isRemoteEventClientId(value) {
	return typeof value === "string" && value.length > 0;
}
/**
* Recognize the direct Agent identity used by a scoped Remote Event.
* @param value - untrusted wire value.
* @returns whether the value is a non-empty Agent identity.
*/
function isRemoteEventAgentId(value) {
	return typeof value === "string" && value.length > 0;
}
/**
* Parse and validate one browser-to-Host text message.
* @param text - complete WebSocket text message.
* @returns the validated logical-stream request.
*/
function parseRemoteStreamClientMessage(text) {
	return parseMessage(text, (value) => {
		if (value.type === "cancel" && exactKeys(value, ["type", "streamId"]) && validId(value.streamId)) return value;
		if (value.type === "open" && exactKeys(value, [
			"type",
			"streamId",
			"endpoint",
			"payload"
		]) && validId(value.streamId) && typeof value.endpoint === "string" && value.endpoint.length > 0) return value;
		throw new Error("api gateway: invalid Remote stream client message");
	});
}
function parseMessage(text, validate) {
	let decoded;
	try {
		decoded = JSON.parse(text);
	} catch (cause) {
		throw new Error("api gateway: Remote stream message is not JSON", { cause });
	}
	if (!isRecord(decoded)) throw new Error("api gateway: Remote stream message must be an object");
	return validate(decoded);
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isPlainRecord(value) {
	if (!isRecord(value)) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}
function exactKeys(value, expected) {
	return Reflect.ownKeys(value).length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}
function validId(value) {
	return typeof value === "string" && value.length > 0;
}
function parseRemoteEventRejection(value) {
	if (!isRecord(value) || !hasOnlyKeys(value, ["name", "message"], ["code", "details"]) || typeof value.name !== "string" || value.name.length === 0 || typeof value.message !== "string" || Object.hasOwn(value, "code") && typeof value.code !== "string" || Object.hasOwn(value, "details") && !isRemoteJsonValue(value.details)) throw new Error("api gateway: invalid Remote event rejection");
	return {
		name: value.name,
		message: value.message,
		...typeof value.code === "string" ? { code: value.code } : {},
		...Object.hasOwn(value, "details") ? { details: value.details } : {}
	};
}
function hasOnlyKeys(value, required, optional) {
	const keys = Reflect.ownKeys(value);
	return required.every((key) => Object.hasOwn(value, key)) && keys.every((key) => typeof key === "string" && (required.includes(key) || optional.includes(key)));
}
function visitJsonValue(value, ancestors) {
	if (value === null || typeof value === "string" || typeof value === "boolean") return true;
	if (typeof value === "number") return Number.isFinite(value) && !Object.is(value, -0);
	if (typeof value !== "object") return false;
	if (ancestors.has(value)) return false;
	ancestors.add(value);
	try {
		if (Array.isArray(value)) {
			if (Object.getPrototypeOf(value) !== Array.prototype || Reflect.ownKeys(value).length !== value.length + 1) return false;
			for (let index = 0; index < value.length; index++) if (!Object.hasOwn(value, index) || !visitJsonValue(value[index], ancestors)) return false;
			return true;
		}
		const prototype = Object.getPrototypeOf(value);
		if (prototype !== Object.prototype && prototype !== null) return false;
		for (const key of Reflect.ownKeys(value)) {
			if (typeof key !== "string") return false;
			if (Object.getOwnPropertyDescriptor(value, key)?.enumerable !== true || !visitJsonValue(Reflect.get(value, key), ancestors)) return false;
		}
		return true;
	} finally {
		ancestors.delete(value);
	}
}
//#endregion
//#region lib/types/stream-server.js
/** Host WebSocket owner for multiplexed Typert Remote streams. */
const MAX_MISSED_HEARTBEATS = 2;
/** Own the no-server WebSocket acceptor and every active logical stream. */
var RemoteStreamMuxServer = class {
	open;
	failure;
	heartbeatIntervalMs;
	server = new WebSocketServer({ noServer: true });
	connections = /* @__PURE__ */ new Set();
	missedHeartbeats = /* @__PURE__ */ new WeakMap();
	heartbeatTimer;
	/**
	* @param open - Gateway stream dispatcher.
	* @param failure - Gateway error-to-wire mapper.
	* @param heartbeatIntervalMs - interval between WebSocket Ping control frames.
	*/
	constructor(open, failure, heartbeatIntervalMs) {
		this.open = open;
		this.failure = failure;
		this.heartbeatIntervalMs = heartbeatIntervalMs;
	}
	/**
	* Upgrade one trusted request and begin serving its logical streams.
	* @param req - authenticated HTTP upgrade request.
	* @param socket - carrier socket transferred to the WebSocket server.
	* @param head - bytes already read after the HTTP upgrade headers.
	*/
	handleUpgrade(req, socket, head) {
		this.server.handleUpgrade(req, socket, head, (websocket) => {
			this.missedHeartbeats.set(websocket, 0);
			websocket.on("pong", () => {
				this.missedHeartbeats.set(websocket, 0);
			});
			this.startHeartbeat();
			const done = new RemoteStreamMuxConnection(websocket, this.open, this.failure).run();
			this.connections.add(done);
			done.then(() => {
				this.connections.delete(done);
			});
		});
	}
	/** Terminate all sockets and wait until every iterator has returned. */
	async close() {
		clearInterval(this.heartbeatTimer);
		this.heartbeatTimer = void 0;
		for (const socket of this.server.clients) socket.terminate();
		const closed = Promise.withResolvers();
		this.server.close((error) => {
			if (error === void 0) closed.resolve();
			else closed.reject(error);
		});
		await closed.promise;
		await Promise.all(this.connections);
	}
	/** Start one `unref()` timer after the first upgrade; it spans empty-client periods until close(). */
	startHeartbeat() {
		if (this.heartbeatTimer !== void 0) return;
		this.heartbeatTimer = setInterval(() => {
			for (const socket of this.server.clients) {
				if (socket.readyState !== WebSocket.OPEN) continue;
				const missed = this.missedHeartbeats.get(socket);
				if (missed >= MAX_MISSED_HEARTBEATS) {
					setImmediate(() => {
						if (this.missedHeartbeats.get(socket) >= MAX_MISSED_HEARTBEATS) socket.terminate();
					});
					continue;
				}
				this.missedHeartbeats.set(socket, missed + 1);
				socket.ping();
			}
		}, this.heartbeatIntervalMs);
		this.heartbeatTimer.unref();
	}
};
var RemoteStreamMuxConnection = class {
	socket;
	open;
	failure;
	streams = /* @__PURE__ */ new Map();
	writes = Promise.resolve();
	constructor(socket, open, failure) {
		this.socket = socket;
		this.open = open;
		this.failure = failure;
	}
	async run() {
		await new Promise((resolve) => {
			this.socket.once("close", resolve);
			this.socket.once("error", () => {
				this.socket.terminate();
			});
			this.socket.on("message", (data, isBinary) => {
				if (isBinary) {
					this.socket.close(1003, "text messages required");
					return;
				}
				try {
					this.receive(rawText(data));
				} catch {
					this.socket.close(1008, "invalid Remote stream request");
				}
			});
		});
		const active = [...this.streams.values()];
		for (const stream of active) stream.abort.abort(/* @__PURE__ */ new Error("Remote stream socket closed"));
		await Promise.all(active.map((stream) => stream.done));
	}
	receive(text) {
		const message = parseRemoteStreamClientMessage(text);
		if (message.type === "cancel") {
			this.streams.get(message.streamId)?.abort.abort(/* @__PURE__ */ new Error("Remote stream cancelled"));
			return;
		}
		if (this.streams.has(message.streamId)) throw new Error(`api gateway: duplicate Remote stream id ${JSON.stringify(message.streamId)}`);
		const active = {
			abort: new AbortController(),
			done: Promise.resolve()
		};
		this.streams.set(message.streamId, active);
		const done = this.pump(message.streamId, message.endpoint, message.payload, active);
		active.done = done;
		const remove = () => {
			this.streams.delete(message.streamId);
		};
		done.then(remove, remove);
	}
	async pump(streamId, endpoint, payload, active) {
		try {
			const source = await this.open(endpoint, payload, active.abort.signal);
			for await (const value of source) await this.send({
				type: "item",
				streamId,
				value
			});
			if (!active.abort.signal.aborted) await this.send({
				type: "end",
				streamId
			});
		} catch (error) {
			if (!active.abort.signal.aborted && this.socket.readyState === WebSocket.OPEN) try {
				await this.send({
					type: "error",
					streamId,
					error: this.failure(error)
				});
			} catch {
				this.socket.close(1011, "Remote stream failure could not be delivered");
			}
		}
	}
	send(message) {
		let text;
		try {
			text = JSON.stringify(message);
		} catch (cause) {
			return Promise.reject(new Error("api gateway: Remote stream item is not JSON serializable", { cause }));
		}
		const delivery = this.writes.then(() => new Promise((resolve, reject) => {
			if (this.socket.readyState !== WebSocket.OPEN) {
				reject(/* @__PURE__ */ new Error("api gateway: Remote stream socket is closed"));
				return;
			}
			this.socket.send(text, (error) => {
				if (error) reject(error);
				else resolve();
			});
		}));
		this.writes = delivery.catch(() => void 0);
		return delivery;
	}
};
function rawText(data) {
	if (Array.isArray(data)) return Buffer.concat(data).toString("utf8");
	if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8");
	return Buffer.from(data).toString("utf8");
}
/**
* Reject an upgrade without transferring socket ownership to ws.
* @param socket - carrier socket that receives the HTTP rejection.
* @param status - authentication or browser-trust rejection status.
*/
function rejectRemoteStreamUpgrade(socket, status) {
	const reason = status === 401 ? "Unauthorized" : "Forbidden";
	const body = reason.toLowerCase();
	socket.end([
		`HTTP/1.1 ${String(status)} ${reason}`,
		"Connection: close",
		"Content-Type: text/plain; charset=utf-8",
		`Content-Length: ${String(Buffer.byteLength(body))}`,
		"",
		body
	].join("\r\n"));
}
//#endregion
//#region lib/types/index.js
/**
* Live Typert Remote dispatch over Cordis Services and registered providers.
* Unary transport and response envelopes belong to Connection; live Remote
* streams use the Gateway-owned WebSocket mux.
* @module @deepseek-ai/dsh-api-gateway
*/
const NEVER_ABORTED_SIGNAL = new AbortController().signal;
const DEFAULT_WEBSOCKET_HEARTBEAT_INTERVAL_MS = 2e3;
/**
* Dispatch failure produced outside the invoked business method. Rides the
* shared Remote failure vocabulary, so its code crosses the wire instead of
* folding to `internal`.
*/
var TypertGatewayError = class extends RemoteError {
	/** Canonical `<namespace>/<method>` endpoint. */
	endpoint;
	/** Affected wire field when the failure is field-specific. */
	field;
	/**
	* Construct a Gateway failure without embedding boundary values in its message.
	* @param code - stable failure category.
	* @param endpoint - canonical Remote endpoint.
	* @param message - correction-oriented diagnostic without sensitive values.
	* @param options - optional field and contained cause.
	*/
	constructor(code, endpoint, message, options = {}) {
		super(code, `typert gateway: ${endpoint}: ${message}`, {
			endpoint,
			...options.field === void 0 ? {} : { field: options.field }
		}, options.cause === void 0 ? void 0 : { cause: options.cause });
		this.name = "TypertGatewayError";
		this.endpoint = endpoint;
		this.field = options.field;
	}
};
/**
* Resolve strict generated definitions or conservative SRC markers against
* current Cordis Services and Typert providers.
* @typert service typertGateway
*/
var TypertGatewayService = class extends Service {
	static inject = ["typert"];
	static Config = z.object({ websocketHeartbeatIntervalMs: z.number().step(1).min(1).max(MAX_TIMER_DELAY_MS).default(DEFAULT_WEBSOCKET_HEARTBEAT_INTERVAL_MS) });
	/** Carrier adapter shared by the WebSocket mux and local Host transports. */
	wireStream = {
		open: (endpoint, payload, signal) => this.openWireStream(endpoint, payload, signal),
		failure: (error) => rpcError(error)
	};
	srcClaims;
	remoteEvents;
	remoteEventClients = /* @__PURE__ */ new Map();
	pendingRemoteEvents = /* @__PURE__ */ new Map();
	/**
	* Register the Gateway against the active Typert registry.
	* @param ctx - owning Host Context with Typert registry access.
	* @param config - validated Gateway transport configuration.
	*/
	constructor(ctx, config) {
		super(ctx, "typertGateway");
		const resolved = config;
		ctx.on("internal/service", () => {
			this.srcClaims = void 0;
		});
		ctx.inject(["connection"], (connectionCtx) => {
			connectionCtx.connection.rpc.intercept("/api", (endpoint) => this.claimsEndpoint(endpoint), (endpoint, payload, signal) => this.dispatchRpc(endpoint, payload, signal));
		});
		ctx.inject(["connection", "webServer"], (webCtx) => {
			const mux = new RemoteStreamMuxServer((endpoint, payload, signal) => this.openWireStream(endpoint, payload, signal), this.wireStream.failure, resolved.websocketHeartbeatIntervalMs);
			webCtx.effect(() => {
				const route = {
					path: REMOTE_STREAM_MUX_PATH,
					handler: (req, socket, head) => {
						const rejection = webCtx.connection.requestRejection(req);
						if (rejection !== void 0) {
							rejectRemoteStreamUpgrade(socket, rejection);
							return;
						}
						mux.handleUpgrade(req, socket, head);
					}
				};
				const unregister = webCtx.webServer.registerUpgrade(route);
				return async () => {
					unregister();
					await mux.close();
				};
			}, `api-gateway: ${REMOTE_STREAM_MUX_PATH} WebSocket`);
		});
	}
	/**
	* Register the sole application-selected forwarded-event source.
	* @param source - stream factory installed by the Remote assembly.
	* @param host - stable Host facts included in each Client generation's opening frame.
	* @returns disposer removing this source and cancelling its active streams.
	*/
	registerRemoteEvents(source, host) {
		if (this.remoteEvents !== void 0) throw new Error("typert gateway: forwarded Remote event source is already registered");
		const lifetime = new AbortController();
		const stream = source(lifetime.signal);
		const registration = {
			lifetime,
			done: this.consumeRemoteEvents(stream, lifetime.signal).catch((error) => {
				if (this.remoteEvents?.lifetime !== lifetime || lifetime.signal.aborted) return;
				this.closeRemoteEvents(error);
				this.remoteEvents = void 0;
				lifetime.abort(error);
			}),
			host: { home: host.home }
		};
		this.remoteEvents = registration;
		return async () => {
			if (this.remoteEvents === registration) {
				this.remoteEvents = void 0;
				const error = /* @__PURE__ */ new Error("typert gateway: forwarded Remote event source was removed");
				registration.lifetime.abort(error);
				this.closeRemoteEvents(error);
			}
			await registration.done;
		};
	}
	claimsEndpoint(endpoint) {
		if (endpoint === "$events/result") return true;
		const segments = endpoint.split("/");
		if (segments.length !== 2 || segments[0] === "" || segments[1] === "") return false;
		if (this.ctx.typert.local.get(endpoint) !== void 0 || this.ctx.typert.local.hasSeen(endpoint)) return true;
		this.srcClaims ??= this.collectSrcClaims();
		return this.srcClaims.has(endpoint);
	}
	collectSrcClaims() {
		const claims = /* @__PURE__ */ new Set();
		for (const [serviceKey, definition] of Object.entries(this.ctx.reflect.props)) {
			if (definition.type !== "service") continue;
			const receiver = this.ctx.get(serviceKey);
			if (!isObject(receiver)) continue;
			const original = originalOf(receiver);
			const binding = Reflect.get(original, "typertRemote");
			if (!isObject(binding) || typeof Reflect.get(binding, "namespace") !== "string") continue;
			const namespace = Reflect.get(binding, "namespace");
			for (const candidate of remoteMethods(original)) claims.add(endpointOf(namespace, candidate.exportName ?? candidate.method));
		}
		return claims;
	}
	/**
	* Invoke one live Remote method through strict generated reflection or SRC markers.
	* @param request - decoded endpoint and exact named wire arguments.
	* @returns the business result without output decoding.
	* @throws {@link TypertGatewayError} for dispatch, provider, or boundary failures; lookup-policy and business errors retain identity.
	*/
	async invoke(request) {
		const prepared = await this.prepareInvocation(request);
		if (prepared.descriptor.mode === "stream") throw new TypertGatewayError("gateway/signature-invalid", prepared.endpoint, "stream Remote methods must be opened through the stream carrier");
		try {
			return await Reflect.apply(prepared.method, prepared.receiver, prepared.args);
		} catch (error) {
			if (request.signal?.aborted === true) throw remoteCancelled(prepared.endpoint, error);
			throw error;
		}
	}
	/**
	* Open one live stream Remote method without assuming a physical carrier.
	* @param request - decoded endpoint and named wire arguments.
	* @returns a cancellation-aware iterable over the business results.
	*/
	async stream(request) {
		const prepared = await this.prepareInvocation(request);
		if (prepared.descriptor.mode !== "stream") throw new TypertGatewayError("gateway/signature-invalid", prepared.endpoint, "unary Remote methods cannot be opened through the stream carrier");
		let source;
		try {
			source = Reflect.apply(prepared.method, prepared.receiver, prepared.args);
		} catch (error) {
			if (request.signal?.aborted === true) throw remoteCancelled(prepared.endpoint, error);
			throw error;
		}
		if (!isIterable(source)) throw new TypertGatewayError("gateway/result-invalid", prepared.endpoint, "stream Remote method did not return Iterable or AsyncIterable", { field: "result" });
		return cancellableStream(source, prepared.endpoint, request.signal ?? NEVER_ABORTED_SIGNAL);
	}
	async dispatchRpc(endpoint, payload, signal) {
		if (endpoint === "$events/result") try {
			const result = parseRemoteEventResultPayload(payload);
			const client = this.remoteEventClients.get(result.clientId);
			if (client === void 0) throw new Error("typert gateway: Remote event result identifies no active event stream");
			this.receiveRemoteEventResult(client, result);
			return {
				ok: true,
				value: void 0
			};
		} catch (error) {
			return rpcFailure(error);
		}
		return this.invokeRpc(endpoint, payload, signal);
	}
	async openWireStream(endpoint, payload, signal) {
		if (endpoint === "$events") return this.openRemoteEvents(payload, signal);
		return this.stream(remoteRequest(endpoint, payload, signal));
	}
	async *openRemoteEvents(payload, signal) {
		if (!isObject(payload) || !isPlainObject(payload) || Reflect.ownKeys(payload).length !== 1 || !Object.hasOwn(payload, "args") || !isObject(payload.args) || !isPlainObject(payload.args) || Reflect.ownKeys(payload.args).length !== 0) throw new TypertGatewayError("gateway/arguments-invalid", REMOTE_EVENT_STREAM_ENDPOINT, "forwarded Remote event stream requires an empty args object");
		const registration = this.remoteEvents;
		if (registration === void 0) throw new TypertGatewayError("gateway/service-unavailable", REMOTE_EVENT_STREAM_ENDPOINT, "forwarded Remote event source is unavailable");
		const lifetime = AbortSignal.any([signal, registration.lifetime.signal]);
		let clientId = randomUUID();
		while (this.remoteEventClients.has(clientId)) clientId = randomUUID();
		const client = {
			id: clientId,
			queue: new RemoteEventQueue(),
			deliveries: /* @__PURE__ */ new Map()
		};
		this.remoteEventClients.set(clientId, client);
		for (const pending of this.pendingRemoteEvents.values()) this.deliverRemoteEvent(pending, client);
		try {
			yield {
				...REMOTE_EVENT_STREAM_READY,
				clientId,
				host: registration.host
			};
			yield* client.queue.iterate(lifetime);
		} finally {
			this.removeRemoteEventClient(client);
		}
	}
	async consumeRemoteEvents(source, signal) {
		for await (const dispatch of source) {
			if (signal.aborted) {
				if ("context" in dispatch) dispatch.reject(signal.reason);
				return;
			}
			if ("context" in dispatch) this.startRemoteEvent(dispatch);
			else this.broadcastRemoteEvent(dispatch);
		}
		if (!signal.aborted) throw new Error("typert gateway: forwarded Remote event source ended unexpectedly");
	}
	broadcastRemoteEvent(frame) {
		assertRemoteEventFrame(frame);
		const wire = {
			type: "emit",
			event: frame.event,
			args: frame.args
		};
		for (const client of this.remoteEventClients.values()) client.queue.push(wire);
	}
	startRemoteEvent(source) {
		try {
			assertRemoteEventName(source);
			if (!isRemoteEventAgentId(source.context.agentId)) throw new TypeError("typert gateway: scoped Remote events require a non-empty Agent identity");
			const projected = projectRemoteEventRequest(source.request, source.context.subject);
			let id = randomUUID();
			while (this.pendingRemoteEvents.has(id)) id = randomUUID();
			let releaseContext;
			try {
				const dispose = source.context.value.effect(() => () => {
					this.cancelRemoteEvent(pending, /* @__PURE__ */ new Error("typert gateway: Remote event Agent Context was released"));
				}, `api-gateway: Remote event ${JSON.stringify(source.event)}`);
				releaseContext = () => {
					dispose();
				};
			} catch {
				source.resolve({ kind: "next" });
				return;
			}
			const signals = new Set(projected.signal === void 0 ? [] : [projected.signal]);
			const abort = () => {
				const reason = [...signals].find((signal) => signal.aborted)?.reason;
				this.cancelRemoteEvent(pending, reason instanceof Error ? reason : new Error("typert gateway: Remote event was cancelled", { cause: reason }));
			};
			const pending = {
				id,
				source,
				frame: {
					type: "waterfall",
					event: source.event,
					eventId: id,
					agentId: source.context.agentId,
					request: projected.request
				},
				deliveries: /* @__PURE__ */ new Set(),
				releaseContext,
				releaseSignal: () => {
					for (const signal of signals) signal.removeEventListener("abort", abort);
				}
			};
			this.pendingRemoteEvents.set(id, pending);
			for (const signal of signals) signal.addEventListener("abort", abort, { once: true });
			if ([...signals].some((signal) => signal.aborted)) abort();
			else for (const client of this.remoteEventClients.values()) this.deliverRemoteEvent(pending, client);
		} catch (error) {
			source.reject(error);
		}
	}
	deliverRemoteEvent(pending, client) {
		pending.deliveries.add(client);
		client.deliveries.set(pending.id, pending);
		client.queue.push(pending.frame);
	}
	receiveRemoteEventResult(client, result) {
		const pending = this.pendingRemoteEvents.get(result.eventId);
		if (pending === void 0 || !pending.deliveries.has(client)) return;
		this.removeRemoteEventDelivery(pending, client);
		if (result.outcome.kind === "result") this.settleRemoteEvent(pending, {
			kind: "result",
			value: result.outcome.value
		});
		else if (result.outcome.kind === "rejected") this.cancelRemoteEvent(pending, restoreRemoteEventRejection(result.outcome.error));
		else if (pending.deliveries.size === 0) this.settleRemoteEvent(pending, { kind: "next" });
	}
	removeRemoteEventDelivery(pending, client) {
		pending.deliveries.delete(client);
		client.deliveries.delete(pending.id);
	}
	removeRemoteEventClient(client) {
		this.remoteEventClients.delete(client.id);
		for (const pending of [...client.deliveries.values()]) this.removeRemoteEventDelivery(pending, client);
		client.queue.end();
	}
	settleRemoteEvent(pending, outcome) {
		this.finishRemoteEvent(pending);
		pending.source.resolve(outcome);
	}
	cancelRemoteEvent(pending, reason) {
		if (this.pendingRemoteEvents.get(pending.id) !== pending) return;
		this.finishRemoteEvent(pending);
		pending.source.reject(reason);
	}
	finishRemoteEvent(pending) {
		this.pendingRemoteEvents.delete(pending.id);
		pending.releaseSignal();
		pending.releaseContext();
		const clients = new Set(pending.deliveries);
		for (const client of clients) this.removeRemoteEventDelivery(pending, client);
		const cancellation = {
			type: "cancel",
			eventId: pending.id
		};
		for (const client of clients) client.queue.push(cancellation);
	}
	closeRemoteEvents(reason) {
		for (const pending of [...this.pendingRemoteEvents.values()]) this.cancelRemoteEvent(pending, reason);
		for (const client of [...this.remoteEventClients.values()]) client.queue.end();
	}
	async invokeRpc(endpoint, payload, signal) {
		try {
			return {
				ok: true,
				value: await this.invoke(remoteRequest(endpoint, payload, signal))
			};
		} catch (error) {
			return rpcFailure(error);
		}
	}
	async prepareInvocation(request) {
		const endpoint = endpointOf(request.namespace, request.method);
		const descriptor = this.resolveDescriptor(request.namespace, request.method, endpoint);
		assertExactArguments(request.args, descriptor, endpoint);
		const receiver = (await this.resolveReceiverContext(descriptor, request.args, endpoint)).get(descriptor.service);
		if (!isObject(receiver)) throw new TypertGatewayError("gateway/service-unavailable", endpoint, `active Service ${JSON.stringify(descriptor.service)} is unavailable`);
		validateBinding(receiver, descriptor.service, descriptor.namespace, endpoint);
		const args = await Promise.all(descriptor.parameters.map((parameter) => this.resolveParameter(parameter, request.args, endpoint)));
		if (descriptor.cancellation !== void 0) args.push(request.signal ?? NEVER_ABORTED_SIGNAL);
		const implementation = descriptor.implementation ?? descriptor.method;
		const method = Reflect.get(receiver, implementation);
		if (typeof method !== "function") throw new TypertGatewayError("gateway/method-unavailable", endpoint, `active Service ${JSON.stringify(descriptor.service)} has no callable method ${JSON.stringify(implementation)}`);
		return {
			endpoint,
			descriptor,
			receiver,
			args,
			method
		};
	}
	resolveDescriptor(namespace, method, endpoint) {
		const strict = this.ctx.typert.local.get(endpoint);
		if (strict !== void 0) return strict;
		if (this.ctx.typert.local.hasSeen(endpoint)) throw new TypertGatewayError("gateway/definition-unavailable", endpoint, "its strict definition was withdrawn and SRC fallback is forbidden");
		return this.resolveSrcDescriptor(namespace, method, endpoint);
	}
	resolveSrcDescriptor(namespace, method, endpoint) {
		const candidates = [];
		for (const [serviceKey, definition] of Object.entries(this.ctx.reflect.props)) {
			if (definition.type !== "service") continue;
			const receiver = this.ctx.get(serviceKey);
			if (!isObject(receiver)) continue;
			const original = originalOf(receiver);
			const value = Reflect.get(original, "typertRemote");
			if (value === void 0) continue;
			const binding = readBinding(value, original, serviceKey, endpoint);
			if (binding.namespace !== namespace) continue;
			const marker = remoteMethods(original).find((candidate) => (candidate.exportName ?? candidate.method) === method);
			if (marker === void 0) continue;
			candidates.push(this.srcDescriptor(binding, marker, method, endpoint));
		}
		if (candidates.length === 0) throw new TypertGatewayError("gateway/invocation-unavailable", endpoint, "no active Remote method exports this endpoint");
		if (candidates.length > 1) throw new TypertGatewayError("gateway/ambiguous-endpoint", endpoint, `multiple active Services export this endpoint: ${candidates.map((candidate) => candidate.service).sort().join(", ")}`);
		return candidates[0];
	}
	srcDescriptor(binding, marker, method, endpoint) {
		const names = methodParameterNames(binding.service, marker.method, endpoint);
		const signalIndex = names.indexOf("signal");
		if (signalIndex >= 0 && signalIndex !== names.length - 1) throw new TypertGatewayError("gateway/signature-invalid", endpoint, "SRC cancellation parameter signal must be the final parameter", { field: "signal" });
		const cancellation = signalIndex >= 0 ? { parameter: "signal" } : void 0;
		const businessNames = cancellation === void 0 ? names : names.slice(0, -1);
		const parameters = [];
		const wires = /* @__PURE__ */ new Set();
		for (const name of businessNames) {
			const matches = this.ctx.typert.lookups.definitions().filter((definition) => definition.parameter === name);
			if (matches.length > 1) throw new TypertGatewayError("gateway/signature-invalid", endpoint, `parameter ${JSON.stringify(name)} matches multiple lookup providers`, { field: name });
			const match = matches[0];
			const parameter = match === void 0 ? {
				name,
				wire: name,
				source: "json",
				codec: { mode: "src-json" }
			} : {
				name,
				wire: match.wire,
				source: "lookup",
				lookup: match.key,
				codec: { mode: "src-json" }
			};
			if (wires.has(parameter.wire)) throw new TypertGatewayError("gateway/signature-invalid", endpoint, `multiple parameters use wire field ${JSON.stringify(parameter.wire)}`, { field: parameter.wire });
			wires.add(parameter.wire);
			parameters.push(parameter);
		}
		let receiver = { kind: "direct" };
		if (marker.invocation.kind === "context") {
			const provider = this.ctx.typert.contexts.getHost(marker.invocation.context);
			if (provider === void 0) throw new TypertGatewayError("gateway/context-unavailable", endpoint, `Context provider ${JSON.stringify(marker.invocation.context)} is unavailable`);
			if (wires.has(provider.wire)) throw new TypertGatewayError("gateway/signature-invalid", endpoint, `Context identity conflicts with wire field ${JSON.stringify(provider.wire)}`, { field: provider.wire });
			receiver = {
				kind: "context",
				context: marker.invocation.context,
				wire: provider.wire,
				codec: { mode: "src-json" }
			};
		}
		return {
			id: `src:${binding.serviceKey}#${endpoint}`,
			service: binding.serviceKey,
			namespace: binding.namespace,
			method,
			...marker.method === method ? {} : { implementation: marker.method },
			...marker.mode === void 0 ? {} : { mode: marker.mode },
			invocation: receiver,
			parameters,
			...cancellation === void 0 ? {} : { cancellation },
			result: { mode: "src-json" }
		};
	}
	async resolveReceiverContext(descriptor, args, endpoint) {
		if (descriptor.invocation.kind === "direct") return this.ctx;
		const invocation = descriptor.invocation;
		const provider = this.ctx.typert.contexts.getHost(invocation.context);
		if (provider === void 0) throw new TypertGatewayError("gateway/context-unavailable", endpoint, `Context provider ${JSON.stringify(invocation.context)} is unavailable`);
		if (provider.wire !== invocation.wire || invocation.codec.mode === "strict" && provider.wireTypeSymbol !== invocation.codec.typeSymbol) throw new TypertGatewayError("gateway/provider-mismatch", endpoint, `Context provider ${JSON.stringify(invocation.context)} does not match its strict definition`, { field: invocation.wire });
		const identity = decode(invocation.codec, args[invocation.wire], endpoint, invocation.wire);
		let context;
		try {
			context = await provider.resolve(identity);
		} catch (cause) {
			if (remoteErrorOf(cause) !== void 0) throw cause;
			throw new TypertGatewayError("gateway/context-failed", endpoint, `Context provider ${JSON.stringify(invocation.context)} failed`, {
				cause,
				field: invocation.wire
			});
		}
		if (context === void 0) throw new TypertGatewayError("gateway/context-not-found", endpoint, `Context provider ${JSON.stringify(invocation.context)} did not resolve the requested identity`, { field: invocation.wire });
		return context;
	}
	async resolveParameter(parameter, args, endpoint) {
		if (!Object.hasOwn(args, parameter.wire)) return void 0;
		const value = decode(parameter.codec, args[parameter.wire], endpoint, parameter.wire);
		if (parameter.source === "json") return value;
		const key = parameter.lookup;
		/* v8 ignore next -- registry validation rejects strict descriptors without a key, and SRC derivation always supplies one. */
		if (key === void 0) throw new TypertGatewayError("gateway/lookup-unavailable", endpoint, `lookup parameter ${JSON.stringify(parameter.name)} has no provider key`, { field: parameter.wire });
		const provider = this.ctx.typert.lookups.get(key);
		if (provider === void 0) throw new TypertGatewayError("gateway/lookup-unavailable", endpoint, `lookup provider ${JSON.stringify(key)} is unavailable`, { field: parameter.wire });
		if (provider.wire !== parameter.wire || parameter.codec.mode === "strict" && provider.wireTypeSymbol !== parameter.codec.typeSymbol) throw new TypertGatewayError("gateway/provider-mismatch", endpoint, `lookup provider ${JSON.stringify(key)} does not match its strict definition`, { field: parameter.wire });
		let resolved;
		try {
			resolved = await provider.resolve(value);
		} catch (cause) {
			if (remoteErrorOf(cause) !== void 0) throw cause;
			throw new TypertGatewayError("gateway/lookup-failed", endpoint, `lookup provider ${JSON.stringify(key)} failed`, {
				cause,
				field: parameter.wire
			});
		}
		if (resolved === void 0) throw new TypertGatewayError("gateway/lookup-not-found", endpoint, `lookup provider ${JSON.stringify(key)} did not resolve the requested identity`, { field: parameter.wire });
		return resolved;
	}
};
/** Pull-driven queue owned by one connected Client event generation. */
var RemoteEventQueue = class {
	frames = new Deque();
	waiter;
	closed = false;
	push(frame) {
		if (this.closed) return;
		this.frames.pushBack(frame);
		this.waiter?.();
	}
	end() {
		if (this.closed) return;
		this.closed = true;
		this.waiter?.();
	}
	async *iterate(signal) {
		const abort = () => {
			this.end();
		};
		signal.addEventListener("abort", abort, { once: true });
		try {
			while (true) {
				while (this.frames.size > 0) yield this.frames.popFront();
				if (this.closed || signal.aborted) return;
				await new Promise((resolve) => {
					this.waiter = resolve;
				});
				this.waiter = void 0;
			}
		} finally {
			signal.removeEventListener("abort", abort);
		}
	}
};
function assertRemoteEventFrame(frame) {
	assertRemoteEventName(frame);
	if (!Array.isArray(frame.args) || !isRemoteJsonValue(frame.args)) throw new TypeError(`typert gateway: Remote event ${JSON.stringify(frame.event)} arguments are not lossless JSON data`);
}
function assertRemoteEventName(frame) {
	if (typeof frame.event !== "string" || frame.event.length === 0) throw new TypeError("typert gateway: Remote event name must be a nonempty string");
}
function parseRemoteEventResultPayload(payload) {
	if (!isObject(payload) || !isPlainObject(payload) || Reflect.ownKeys(payload).length !== 1 || !Object.hasOwn(payload, "args")) throw new Error("typert gateway: Remote event result requires exactly one plain-object args field");
	return parseRemoteEventResult(payload.args);
}
function remoteRequest(endpoint, payload, signal) {
	const segments = endpoint.split("/");
	if (segments.length !== 2 || segments[0] === "" || segments[1] === "") throw new Error(`invalid Remote endpoint ${JSON.stringify(endpoint)}`);
	const [namespace, method] = segments;
	if (!isObject(payload) || !isPlainObject(payload) || Reflect.ownKeys(payload).length !== 1 || !Object.hasOwn(payload, "args") || !isObject(payload.args) || !isPlainObject(payload.args)) throw new Error("Remote payload must contain exactly one plain-object args field");
	return {
		namespace,
		method,
		args: payload.args,
		signal
	};
}
function isIterable(value) {
	return isObject(value) && (typeof Reflect.get(value, Symbol.iterator) === "function" || typeof Reflect.get(value, Symbol.asyncIterator) === "function");
}
async function* cancellableStream(source, endpoint, signal) {
	const asyncFactory = Reflect.get(source, Symbol.asyncIterator);
	const syncFactory = Reflect.get(source, Symbol.iterator);
	const iterator = typeof asyncFactory === "function" ? Reflect.apply(asyncFactory, source, []) : Reflect.apply(syncFactory, source, []);
	let rejectAbort;
	const aborted = new Promise((_resolve, reject) => {
		rejectAbort = reject;
	});
	const onAbort = () => {
		rejectAbort?.(remoteCancelled(endpoint, signal.reason));
	};
	signal.addEventListener("abort", onAbort, { once: true });
	try {
		if (signal.aborted) throw remoteCancelled(endpoint, signal.reason);
		while (true) {
			const next = await Promise.race([Promise.resolve(iterator.next()), aborted]);
			if (next.done === true) return;
			yield next.value;
		}
	} finally {
		signal.removeEventListener("abort", onAbort);
		await iterator.return?.();
	}
}
/** Carrier-signal cancellation as the shared failure vocabulary expresses it. */
function remoteCancelled(endpoint, cause) {
	return new RemoteError("gateway/cancelled", `Remote invocation "${endpoint}" was aborted`, {}, { cause });
}
function rpcFailure(error) {
	const remote = remoteErrorOf(error);
	if (remote !== void 0) return {
		ok: false,
		error: {
			code: remote.code,
			message: remote.message,
			details: remote.details
		}
	};
	return {
		ok: false,
		error: {
			code: "gateway/internal",
			message: error instanceof Error ? error.message : String(error),
			details: {}
		}
	};
}
function rpcError(error) {
	return rpcFailure(error).error;
}
function endpointOf(namespace, method) {
	return `${namespace}/${method}`;
}
function validateBinding(receiver, serviceKey, namespace, endpoint) {
	const original = originalOf(receiver);
	const value = Reflect.get(original, "typertRemote");
	if (value === void 0) throw new TypertGatewayError("gateway/binding-invalid", endpoint, `Service ${JSON.stringify(serviceKey)} has no visible typertRemote binding`);
	return {
		binding: readBinding(value, original, serviceKey, endpoint, namespace),
		original
	};
}
function readBinding(value, original, serviceKey, endpoint, namespace) {
	if (!isObject(value) || Reflect.get(value, "service") !== original || Reflect.get(value, "serviceKey") !== serviceKey || typeof Reflect.get(value, "namespace") !== "string" || namespace !== void 0 && Reflect.get(value, "namespace") !== namespace) throw new TypertGatewayError("gateway/binding-invalid", endpoint, `Service ${JSON.stringify(serviceKey)} has an inconsistent typertRemote binding`);
	return value;
}
function originalOf(receiver) {
	const original = Reflect.get(receiver, symbols.original);
	return isObject(original) ? original : receiver;
}
function methodParameterNames(service, method, endpoint) {
	let prototype = Object.getPrototypeOf(service);
	let implementation;
	while (prototype !== null) {
		const descriptor = Object.getOwnPropertyDescriptor(prototype, method);
		if (descriptor !== void 0) {
			if ("value" in descriptor && typeof descriptor.value === "function") implementation = descriptor.value;
			break;
		}
		prototype = Object.getPrototypeOf(prototype);
	}
	if (implementation === void 0) throw new TypertGatewayError("gateway/method-unavailable", endpoint, `Remote marker has no prototype method ${JSON.stringify(method)}`);
	const source = Function.prototype.toString.call(implementation);
	const open = source.indexOf("(");
	const close = source.indexOf(")", open + 1);
	/* v8 ignore next -- standard public class-method syntax always contains a parenthesized parameter list. */
	if (open < 0 || close < 0) return invalidSignature(endpoint, method);
	const body = source.slice(open + 1, close).trim();
	if (body.length === 0) return [];
	const parts = body.split(",").map((part) => part.trim());
	const names = /* @__PURE__ */ new Set();
	for (const part of parts) {
		if (!/^[$A-Z_a-z][$\w]*$/u.test(part) || names.has(part)) return invalidSignature(endpoint, method);
		names.add(part);
	}
	return [...names];
}
function invalidSignature(endpoint, method) {
	throw new TypertGatewayError("gateway/signature-invalid", endpoint, `SRC method ${JSON.stringify(method)} must use unique identifier parameters without destructuring, defaults, or rest`);
}
function assertExactArguments(args, descriptor, endpoint) {
	if (!isPlainObject(args)) throw new TypertGatewayError("gateway/arguments-invalid", endpoint, "args must be a plain object");
	const expected = new Set(descriptor.parameters.map((parameter) => parameter.wire));
	if (descriptor.invocation.kind === "context") expected.add(descriptor.invocation.wire);
	const extra = Reflect.ownKeys(args).filter((key) => typeof key !== "string" || !expected.has(key));
	const acceptsMissing = new Set(descriptor.parameters.filter((parameter) => parameter.source === "json" && (parameter.acceptsUndefined === true || parameter.codec.mode === "src-json")).map((parameter) => parameter.wire));
	const missing = [...expected].filter((key) => !Object.hasOwn(args, key) && !acceptsMissing.has(key));
	if (extra.length === 0 && missing.length === 0) return;
	const clauses = [];
	if (missing.length > 0) clauses.push(`missing ${missing.map((key) => JSON.stringify(key)).join(", ")}`);
	if (extra.length > 0) clauses.push(`unexpected ${extra.map((key) => JSON.stringify(String(key))).join(", ")}`);
	throw new TypertGatewayError("gateway/arguments-invalid", endpoint, `args fields do not match the descriptor: ${clauses.join("; ")}`);
}
function decode(codec, value, endpoint, field) {
	try {
		if (codec.mode === "strict") {
			value = codec.schema.parse(value);
			/* v8 ignore next -- generated optional-input codecs are the only strict codecs that return undefined. */
			if (value === void 0) return value;
		}
		assertJsonValue(value, /* @__PURE__ */ new Set());
		return value;
	} catch (cause) {
		throw new TypertGatewayError("gateway/input-invalid", endpoint, `wire field ${JSON.stringify(field)} failed boundary validation`, {
			cause,
			field
		});
	}
}
function assertJsonValue(value, ancestors) {
	if (value === null || typeof value === "string" || typeof value === "boolean") return;
	if (typeof value === "number") {
		if (Number.isFinite(value)) return;
		throw new TypeError("non-finite number is not JSON-safe");
	}
	if (!isObject(value)) throw new TypeError(`${typeof value} is not JSON-safe`);
	if (ancestors.has(value)) throw new TypeError("cyclic value is not JSON-safe");
	ancestors.add(value);
	try {
		if (Array.isArray(value)) {
			if (Object.getOwnPropertySymbols(value).length > 0 || Object.keys(value).length !== value.length) throw new TypeError("sparse or decorated array is not JSON-safe");
			for (let index = 0; index < value.length; index += 1) {
				if (!Object.hasOwn(value, index)) throw new TypeError("sparse array is not JSON-safe");
				assertJsonValue(value[index], ancestors);
			}
			return;
		}
		if (!isPlainObject(value)) throw new TypeError("non-plain object is not JSON-safe");
		if (Object.getOwnPropertySymbols(value).length > 0) throw new TypeError("symbol property is not JSON-safe");
		for (const key of Reflect.ownKeys(value)) {
			const descriptor = Object.getOwnPropertyDescriptor(value, key);
			/* v8 ignore next -- ownKeys() just returned this key; only a hostile same-process Proxy can delete it between operations. */
			if (descriptor === void 0 || !descriptor.enumerable || !("value" in descriptor)) throw new TypeError("non-data property is not JSON-safe");
			assertJsonValue(descriptor.value, ancestors);
		}
	} finally {
		ancestors.delete(value);
	}
}
function isPlainObject(value) {
	if (Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === null || prototype === Object.prototype;
}
function isObject(value) {
	return typeof value === "object" && value !== null || typeof value === "function";
}
//#endregion
export { TypertGatewayError, TypertGatewayService, TypertGatewayService as default };
