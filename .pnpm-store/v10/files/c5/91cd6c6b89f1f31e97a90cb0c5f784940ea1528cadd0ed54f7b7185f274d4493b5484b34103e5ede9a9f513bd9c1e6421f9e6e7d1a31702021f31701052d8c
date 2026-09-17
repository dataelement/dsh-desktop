import { randomUUID } from "node:crypto";
import { StringDecoder } from "node:string_decoder";
//#region lib/types/transport.js
/**
* Newline-delimited JSON-RPC 2.0 over byte streams. Frames with `id` and
* `method` are requests, `id` alone is a response, and `method` alone is a
* notification. Malformed lines are ignored; handler failures become error frames.
*
* @module @deepseek-ai/dsh-sdk-protocol/transport
*/
/** A JSON-RPC error response, preserving the wire `code` and optional `data`. */
var JsonRpcResponseError = class extends Error {
	code;
	data;
	/**
	* @param code - the wire error code, or `undefined` when the peer sent none.
	* @param message - the wire error message.
	* @param data - the optional structured error payload, verbatim.
	*/
	constructor(code, message, data) {
		super(message);
		this.code = code;
		this.data = data;
		this.name = "JsonRpcResponseError";
	}
};
/**
* Line-delimited endpoint over caller-owned streams. {@link start} attaches
* listeners; {@link close} detaches them and rejects pending requests without
* destroying the streams. Missing request handlers return `-32601`; handler
* failures return `-32603`. Notifications without a handler are dropped.
*/
var JsonRpcLineTransport = class {
	input;
	output;
	buffer = "";
	decoder = new StringDecoder("utf8");
	started = false;
	requestHandler;
	notificationHandler;
	pending = /* @__PURE__ */ new Map();
	constructor(input, output) {
		this.input = input;
		this.output = output;
	}
	/** Attach the input listeners and begin reading frames. Idempotent. */
	start() {
		if (this.started) return;
		this.started = true;
		this.input.on("data", this.onData);
		this.input.on("error", this.onInputError);
		this.input.on("end", this.onInputEnd);
	}
	/**
	* Detach listeners and reject pending requests. Safe before {@link start}.
	*/
	close() {
		this.input.off("data", this.onData);
		this.input.off("error", this.onInputError);
		this.input.off("end", this.onInputEnd);
		this.failPending(/* @__PURE__ */ new Error("JSON-RPC transport closed"));
	}
	/**
	* Install the request handler, replacing any prior handler.
	* @param handler - resolves to the response `result`; a rejection becomes a
	* `-32603` error response carrying the message.
	*/
	onRequest(handler) {
		this.requestHandler = handler;
	}
	/**
	* Install the notification handler, replacing any prior handler.
	* @param handler - invoked per notification with the method and normalized
	* params object.
	*/
	onNotification(handler) {
		this.notificationHandler = handler;
	}
	/**
	* Send a request and await its response.
	* @param method - the JSON-RPC method name.
	* @param params - the request parameters object.
	* @param signal - optional abandonment signal: aborting removes the pending
	* entry (no state is retained for a response that may never come) and
	* rejects with the signal's reason.
	* @returns the result; rejects per {@link JsonRpcTransportPeer.request}.
	*/
	request(method, params, signal) {
		const id = `req_${randomUUID().replaceAll("-", "")}`;
		const message = {
			jsonrpc: "2.0",
			id,
			method,
			params
		};
		return new Promise((resolve, reject) => {
			let detach = () => {};
			if (signal !== void 0) {
				if (signal.aborted) {
					reject(abortError(signal.reason));
					return;
				}
				const onAbort = () => {
					this.pending.delete(id);
					reject(abortError(signal.reason));
				};
				signal.addEventListener("abort", onAbort, { once: true });
				detach = () => {
					signal.removeEventListener("abort", onAbort);
				};
			}
			this.pending.set(id, {
				resolve: (value) => {
					detach();
					resolve(value);
				},
				reject: (error) => {
					detach();
					reject(error);
				}
			});
			try {
				this.write(message);
			} catch (error) {
				this.pending.delete(id);
				detach();
				reject(error instanceof Error ? error : new Error(String(error)));
			}
		});
	}
	notify(method, params) {
		this.write(params === void 0 ? {
			jsonrpc: "2.0",
			method
		} : {
			jsonrpc: "2.0",
			method,
			params
		});
	}
	/**
	* Wait for prior frame write callbacks. The empty barrier emits no bytes.
	* @returns a promise that settles with the output write callback.
	*/
	flush() {
		return new Promise((resolve, reject) => {
			this.output.write("", (error) => {
				if (error) reject(error);
				else resolve();
			});
		});
	}
	onData = (chunk) => {
		this.buffer += typeof chunk === "string" ? chunk : this.decoder.write(chunk);
		this.drainLines();
	};
	drainLines() {
		for (;;) {
			const newline = this.buffer.indexOf("\n");
			if (newline < 0) break;
			const line = this.buffer.slice(0, newline).trim();
			this.buffer = this.buffer.slice(newline + 1);
			if (!line) continue;
			this.handleLine(line);
		}
	}
	onInputError = (error) => {
		this.failPending(error);
	};
	onInputEnd = () => {
		this.buffer += this.decoder.end();
		this.drainLines();
		this.failPending(/* @__PURE__ */ new Error("JSON-RPC input closed"));
	};
	async handleLine(line) {
		let message;
		try {
			message = JSON.parse(line);
		} catch {
			return;
		}
		if (!message || typeof message !== "object") return;
		const frame = message;
		const id = frame.id;
		const method = frame.method;
		if ((typeof id === "string" || typeof id === "number") && typeof method === "string") {
			await this.handleIncomingRequest(id, method, objectParams(frame.params));
			return;
		}
		if (typeof id === "string" || typeof id === "number") {
			this.handleIncomingResponse(id, frame);
			return;
		}
		if (typeof method === "string") this.notificationHandler?.(method, objectParams(frame.params));
	}
	async handleIncomingRequest(id, method, params) {
		const handler = this.requestHandler;
		if (!handler) {
			this.writeError(id, -32601, `method not found: ${method}`);
			return;
		}
		try {
			const result = await handler(method, params);
			this.write({
				jsonrpc: "2.0",
				id,
				result
			});
		} catch (error) {
			this.writeError(id, -32603, error instanceof Error ? error.message : String(error));
		}
	}
	handleIncomingResponse(id, frame) {
		const pending = this.pending.get(id);
		if (!pending) return;
		this.pending.delete(id);
		if (frame.error && typeof frame.error === "object") {
			const error = frame.error;
			pending.reject(new JsonRpcResponseError(typeof error.code === "number" ? error.code : void 0, typeof error.message === "string" ? error.message : "JSON-RPC error", error.data));
			return;
		}
		pending.resolve(frame.result);
	}
	writeError(id, code, message) {
		this.write({
			jsonrpc: "2.0",
			id,
			error: {
				code,
				message
			}
		});
	}
	write(message) {
		this.output.write(`${JSON.stringify(message)}\n`);
	}
	failPending(error) {
		const pending = [...this.pending.values()];
		this.pending.clear();
		for (const waiter of pending) waiter.reject(error);
	}
};
/** Normalize JSON-RPC `params` to a plain object (arrays and scalars collapse to `{}`). */
function objectParams(params) {
	return params && typeof params === "object" && !Array.isArray(params) ? params : {};
}
/** Normalize an abort reason into the rejection Error (a non-Error reason is stringified). */
function abortError(reason) {
	return reason instanceof Error ? reason : /* @__PURE__ */ new Error(`JSON-RPC request aborted: ${String(reason)}`);
}
//#endregion
export { JsonRpcLineTransport, JsonRpcResponseError };
