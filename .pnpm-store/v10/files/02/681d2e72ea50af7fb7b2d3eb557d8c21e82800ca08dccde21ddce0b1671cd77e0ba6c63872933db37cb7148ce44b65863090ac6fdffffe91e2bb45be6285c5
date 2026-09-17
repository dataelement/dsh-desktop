import z from "@deepseek-ai/schemastery";
import { Readable } from "node:stream";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { credentialKey } from "@deepseek-ai/dsh-credentials";
import { Service } from "@deepseek-ai/cordis";
import { z as z$1 } from "zod";
//#region lib/types/api-path.js
/**
* The /api URL prefix — single source for both halves of the web transport.
* The node half registers this prefix on the web server.
*/
/** Route prefix owning every api request (`/api` and `/api/<anything>`). */
const API_PATH = "/api";
//#endregion
//#region lib/types/http-bridge.js
/**
* node:http ↔ WHATWG fetch bridge for the /api transport (host side of the
* web carrier; the fetch-shaped handler itself is transport-agnostic).
*/
/** Default carrier cap for all HTTP RPC bodies: sized for the default
* aggregate image limit (200 MiB) after base64 expansion plus envelope
* headroom (~267.7 MiB required), rounded up for slack. The bridge buffers
* each body in memory, so this cap is also the per-request resident bound. */
const DEFAULT_MAX_REQUEST_BODY_BYTES = 300 * 1024 * 1024;
/**
* Bridge one node:http request to the fetch-shaped handler (client close
* aborts; response bodies stream out chunk by chunk).
* @param req - incoming node:http request.
* @param res - node:http response the bridge writes and owns to completion.
* @param apiHandler - fetch-shaped API carrier the request is dispatched to.
* @param maxRequestBodyBytes - maximum bytes buffered for a buffered route.
*/
async function bridge(req, res, apiHandler, maxRequestBodyBytes = DEFAULT_MAX_REQUEST_BODY_BYTES) {
	const abort = new AbortController();
	res.on("close", () => {
		if (!res.writableEnded) abort.abort();
	});
	/* v8 ignore next 2 -- node:http always sets url/method on server requests. */
	const url = new URL(req.url ?? "/", "http://dsh.internal");
	const method = req.method ?? "GET";
	const headers = Object.fromEntries(Object.entries(req.headers).filter(([, value]) => typeof value === "string"));
	const bodyMode = apiHandler.requestBodyMode({
		method,
		url
	});
	let request;
	if (bodyMode === "buffered") {
		const declaredLength = req.headers["content-length"];
		if (declaredLength !== void 0 && Number(declaredLength) > maxRequestBodyBytes) {
			res.writeHead(413, { connection: "close" });
			res.end();
			req.destroy();
			return;
		}
		const chunks = [];
		let received = 0;
		for await (const chunk of req) {
			const buffer = chunk;
			received += buffer.byteLength;
			if (received > maxRequestBodyBytes) {
				res.writeHead(413, { connection: "close" });
				res.end();
				req.destroy();
				return;
			}
			chunks.push(buffer);
		}
		request = new Request(url, {
			method,
			headers,
			...chunks.length > 0 ? { body: Buffer.concat(chunks) } : {},
			signal: abort.signal
		});
	} else request = new Request(url, {
		method,
		headers,
		body: Readable.toWeb(req),
		signal: abort.signal,
		duplex: "half"
	});
	const response = await apiHandler.fetch(request);
	const requestUnread = bodyMode === "streaming" && !req.readableEnded;
	const responseHeaders = Object.fromEntries(response.headers.entries());
	res.writeHead(response.status, requestUnread ? {
		...responseHeaders,
		connection: "close"
	} : responseHeaders);
	if (response.body === null) {
		res.end();
		if (requestUnread) req.destroy();
		return;
	}
	for await (const chunk of response.body) if (!res.write(chunk)) await new Promise((resolve) => {
		const done = () => {
			res.off("drain", done);
			res.off("close", done);
			resolve();
		};
		res.once("drain", done);
		res.once("close", done);
	});
	res.end();
	if (requestUnread) req.destroy();
}
//#endregion
//#region lib/types/loopback-hostname.js
/**
* Browser-safe, zero-dependency loopback classification shared by the `/api`
* Host fence and the package's `ctx.connection` state. The predicate stays
* package-internal; client plugins consume the derived state through Cordis.
*/
/**
* Whether a normalized URL hostname names the local loopback authority.
* @param hostname - WHATWG URL hostname (IPv6 literals retain brackets).
* @returns true for localhost, IPv6 loopback, or any IPv4 address in 127/8.
*/
function isLoopbackHostname(hostname) {
	if (hostname === "localhost" || hostname === "[::1]") return true;
	const parts = hostname.split(".");
	return parts.length === 4 && parts[0] === "127" && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}
//#endregion
//#region lib/types/api-request-trust.js
/**
* Browser-trust fence for every /api request. Defends the two confused-deputy
* paths a browser opens against a local HTTP API — DNS rebinding (Host names
* the attacker's domain while the socket reaches this server) and cross-site
* requests fired from a malicious page. The Host fence binds every request,
* browser-looking or not: over plain HTTP a browser attaches neither Origin
* nor Fetch-Metadata to reads (images and navigations — those
* headers go only to trustworthy destinations), so an unmarked request may
* still be a rebound browser read and Host is the one header rebinding cannot
* forge. Non-browser and remote clients pass the same fence via loopback,
* deployment-derived LAN IP literals, or a declared `trustedHosts` authority.
* Network reachability and authentication stay out of scope: binding policy
* belongs to the webserver config, and this fence is not an auth layer.
*/
function header$1(headers, name) {
	if (headers instanceof Headers) return headers.get(name) ?? void 0;
	const value = headers[name];
	return typeof value === "string" ? value : void 0;
}
/** Normalized URL of a Host-header authority (hostname lowercased, default port stripped, IPv6 bracketed), or undefined when unparsable. */
function parseAuthority(authority) {
	try {
		return new URL(`http://${authority}`);
	} catch {
		return;
	}
}
/**
* Assert one configured `trustedHosts` entry is a bare authority (`host` or
* `host:port`) in canonical form: it must survive WHATWG parsing unchanged
* (case aside). Anything parsing would silently rewrite is refused as a typo
* that must fail the load loudly instead of being ignored until requests 403
* or quietly changing the grant: URL parts beyond the authority
* (`harness.internal/path`, `user@harness.internal` — which would authorize
* the embedded hostname), stripped whitespace, a dangling colon or
* zero-padded port (which would broaden an intended exact-port grant to every
* port), and non-canonical host spellings (`0x7f.0.0.1`, percent-encoding,
* unbracketed IPv6; IDN hosts are declared in punycode, the form the wire
* carries).
* @param entry - the configured value, verbatim.
*/
function assertTrustedAuthority(entry) {
	const entryUrl = parseAuthority(entry);
	if (entryUrl !== void 0 && canonicalAuthority(entry, entryUrl) === entry.toLowerCase()) return;
	throw new Error(`client-connection: trustedHosts entry ${JSON.stringify(entry)} is not a bare host[:port] authority`);
}
/**
* Canonical form of a parsed authority: `hostname` when no port was written,
* else `hostname:port`. The port is judged from URL parses under both special
* schemes (their default ports differ, so `:80` and `:443` still count as
* explicit), never from the raw string, where WHATWG trimming would misread
* shapes like `host:port ` as port-less.
*/
function canonicalAuthority(entry, entryUrl) {
	const port = entryUrl.port !== "" ? entryUrl.port : new URL(`https://${entry}`).port;
	return port === "" ? entryUrl.hostname : `${entryUrl.hostname}:${port}`;
}
/**
* Whether the request authority matches a `trustedHosts` entry. An entry with
* an explicit port matches that exact authority; a port-less entry matches the
* hostname on any port (the shape the CLI derives for IP-literal LAN serving,
* where the bound port may be OS-assigned). Both sides compare through WHATWG
* normalization, so case and a redundant `:80` never decide trust.
*/
function isTrustedAuthority(hostUrl, trustedHosts) {
	return trustedHosts.some((entry) => {
		const entryUrl = parseAuthority(entry);
		if (entryUrl === void 0) return false;
		return canonicalAuthority(entry, entryUrl) === entryUrl.hostname ? entryUrl.hostname === hostUrl.hostname : entryUrl.host === hostUrl.host;
	});
}
/**
* Decide whether one /api request may reach the RPC bridge.
* @param request - Node HTTP or Fetch request facts (headers).
* @param trustedHosts - non-loopback authorities this deployment serves: exact `host:port`, or port-less `host` matching any port.
* @returns true when the Host is ours (loopback or trusted) and any attached browser markers are same-origin.
*/
function isTrustedApiRequest(request, trustedHosts) {
	const host = header$1(request.headers, "host");
	if (host === void 0) return false;
	const hostUrl = parseAuthority(host);
	if (hostUrl === void 0) return false;
	if (!isLoopbackHostname(hostUrl.hostname) && !isTrustedAuthority(hostUrl, trustedHosts)) return false;
	if (header$1(request.headers, "sec-fetch-site") === "cross-site") return false;
	const origin = header$1(request.headers, "origin");
	if (origin === void 0) return true;
	try {
		return new URL(origin).host === hostUrl.host;
	} catch {
		return false;
	}
}
//#endregion
//#region lib/types/browser-auth.js
/** Browser-session authentication for the Host Connection carrier. */
const AUTH_RECORD_KEY = credentialKey("client-connection", "browser-session");
const DAY_MILLISECONDS = 1440 * 60 * 1e3;
const SECRET_BYTES = 32;
const TOKEN_QUERY = "token";
const COOKIE_PREFIX = "dsh-auth-";
const COOKIE_PAYLOAD_VERSION = 1;
const STORED_SECRET_VERSION = 1;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]*$/;
const PROCESS_LAUNCH_TOKENS = /* @__PURE__ */ new WeakMap();
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function encodeBase64Url(value) {
	return Buffer.from(value).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}
function decodeBase64Url(value) {
	if (!BASE64URL_PATTERN.test(value) || value.length % 4 === 1) return void 0;
	const padding = "=".repeat((4 - value.length % 4) % 4);
	const decoded = Buffer.from(value.replaceAll("-", "+").replaceAll("_", "/") + padding, "base64");
	return encodeBase64Url(decoded) === value ? decoded : void 0;
}
function processLaunchToken(owner) {
	const existing = PROCESS_LAUNCH_TOKENS.get(owner);
	if (existing !== void 0) return existing;
	const created = encodeBase64Url(randomBytes(SECRET_BYTES));
	PROCESS_LAUNCH_TOKENS.set(owner, created);
	return created;
}
function header(headers, name) {
	if (headers instanceof Headers) return headers.get(name) ?? void 0;
	const value = headers[name];
	return typeof value === "string" ? value : void 0;
}
/** Canonical request authority used as the cookie name and signed audience. */
function requestAuthority(headers) {
	const host = header(headers, "host");
	if (host === void 0) return void 0;
	try {
		return new URL(`http://${host}`).host;
	} catch {
		return;
	}
}
function canonicalSecret(value) {
	if (typeof value !== "string") return void 0;
	const decoded = decodeBase64Url(value);
	if (decoded === void 0 || decoded.byteLength !== SECRET_BYTES) return void 0;
	return decoded;
}
function storedSecret(record) {
	if (record === void 0) return void 0;
	if (record.kind !== "grant" || !isRecord(record.payload) || record.payload.version !== STORED_SECRET_VERSION) throw new Error("client-connection: browser-session credential record has an unsupported format");
	const secret = canonicalSecret(record.payload.secret);
	if (secret === void 0) throw new Error("client-connection: browser-session credential record has an invalid secret");
	return secret;
}
function tokenMatches(actual, expected) {
	const actualBytes = Buffer.from(actual, "utf8");
	const expectedBytes = Buffer.from(expected, "utf8");
	return actualBytes.byteLength === expectedBytes.byteLength && timingSafeEqual(actualBytes, expectedBytes);
}
function cookieName(authority) {
	return COOKIE_PREFIX + encodeBase64Url(createHash("sha256").update(authority).digest());
}
/** Read the exact generated cookie without implementing general Cookie decoding. */
function cookieValue(headerValue, name) {
	for (const segment of headerValue.split(";")) {
		const at = segment.indexOf("=");
		if (at === -1 || segment.slice(0, at).trim() !== name) continue;
		return segment.slice(at + 1).trim();
	}
}
/** Serialize the fixed browser-session attributes; generated names and values are cookie-safe base64url. */
function sessionCookie(name, value, expiresAt, maxAgeSeconds) {
	return `${name}=${value}; Max-Age=${String(maxAgeSeconds)}; Path=/; Expires=${new Date(expiresAt).toUTCString()}; HttpOnly; SameSite=Strict`;
}
function signature(secret, body) {
	return createHmac("sha256", secret).update(body).digest();
}
function encodeCookie(payload, secret) {
	const body = encodeBase64Url(Buffer.from(JSON.stringify(payload), "utf8"));
	return `v1.${body}.${encodeBase64Url(signature(secret, body))}`;
}
function decodeCookie(value, secret) {
	const parts = value.split(".");
	const [version, body, encodedSignature] = parts;
	if (parts.length !== 3 || version !== "v1" || body === void 0 || encodedSignature === void 0) return;
	const actualSignature = decodeBase64Url(encodedSignature);
	if (actualSignature === void 0) return void 0;
	const expectedSignature = signature(secret, body);
	if (actualSignature.byteLength !== expectedSignature.byteLength || !timingSafeEqual(actualSignature, expectedSignature)) return void 0;
	let decoded;
	try {
		const bodyBytes = decodeBase64Url(body);
		if (bodyBytes === void 0) return void 0;
		decoded = JSON.parse(bodyBytes.toString("utf8"));
	} catch {
		return;
	}
	if (!isRecord(decoded) || decoded.version !== COOKIE_PAYLOAD_VERSION || typeof decoded.authority !== "string" || !Number.isSafeInteger(decoded.issuedAt) || !Number.isSafeInteger(decoded.expiresAt)) return void 0;
	return decoded;
}
async function initializeSecret(credentials) {
	const generated = {
		version: STORED_SECRET_VERSION,
		secret: encodeBase64Url(randomBytes(SECRET_BYTES))
	};
	const secret = storedSecret(await credentials.modifyRecord(AUTH_RECORD_KEY, (current) => {
		if (current !== void 0) {
			storedSecret(current);
			return Promise.resolve(void 0);
		}
		return Promise.resolve({
			kind: "grant",
			payload: generated
		});
	}));
	if (secret === void 0) throw new Error("client-connection: browser-session credential record was not created");
	return secret;
}
/**
* Process launch-token exchange and persistent signed-cookie verification.
* Connection loads the credential provider's signing secret during activation
* and retains it for synchronous request authentication.
*/
var BrowserAuth = class BrowserAuth {
	secret;
	launchToken;
	maxAgeMilliseconds;
	constructor(processOwner, secret, maxAgeDays) {
		this.secret = secret;
		this.launchToken = processLaunchToken(processOwner);
		this.maxAgeMilliseconds = maxAgeDays * DAY_MILLISECONDS;
		if (!Number.isSafeInteger(this.maxAgeMilliseconds) || !Number.isSafeInteger(Date.now() + this.maxAgeMilliseconds)) throw new Error("client-connection: cookieMaxAgeDays exceeds the safe timestamp range");
	}
	/**
	* Initialize browser authentication and create its durable signing secret
	* when this Harness home has none.
	* @param processOwner - root application context retaining one token across Connection reloads.
	* @param credentials - persistent credential provider for the Web profile.
	* @param maxAgeDays - positive absolute browser-cookie lifetime in days.
	* @returns initialized authentication owner with the process owner's launch token.
	*/
	static async create(processOwner, credentials, maxAgeDays) {
		return new BrowserAuth(processOwner, await initializeSecret(credentials), maxAgeDays);
	}
	/**
	* Add this process's launch token to the ordinary application root URL.
	* @param baseUrl - canonical browser origin without credentials.
	* @returns root URL carrying the process token as its sole authentication input.
	*/
	authenticatedUrl(baseUrl) {
		const url = new URL(baseUrl);
		url.pathname = "/";
		url.search = "";
		url.hash = "";
		url.searchParams.set(TOKEN_QUERY, this.launchToken);
		return url.href;
	}
	/**
	* Authenticate an index request. A valid root query token mints the cookie
	* and redirects to clean `/`; a valid cookie lets the caller serve the
	* index; every other request receives the same minimal 401 response.
	* @param req - incoming root or configured-index request.
	* @param res - response owned when this method returns false.
	* @returns true only when the caller may serve index.html.
	*/
	authorizeIndex(req, res) {
		/* v8 ignore next -- node:http always supplies url on server requests. */
		const url = new URL(req.url ?? "/", "http://dsh.invalid");
		const tokens = url.searchParams.getAll(TOKEN_QUERY);
		if (tokens.length > 0) {
			const authority = requestAuthority(req.headers);
			if (req.method === "GET" && url.pathname === "/" && tokens.length === 1 && authority !== void 0 && tokenMatches(tokens.join(""), this.launchToken)) {
				const issuedAt = Date.now();
				const expiresAt = issuedAt + this.maxAgeMilliseconds;
				const value = encodeCookie({
					version: COOKIE_PAYLOAD_VERSION,
					authority,
					issuedAt,
					expiresAt
				}, this.secret);
				res.writeHead(303, {
					"cache-control": "no-store",
					"location": "/",
					"referrer-policy": "no-referrer",
					"set-cookie": sessionCookie(cookieName(authority), value, expiresAt, Math.floor(this.maxAgeMilliseconds / 1e3))
				});
				res.end();
				return false;
			}
			if (req.method === "GET" && url.pathname === "/" && this.isAuthenticated(req)) {
				res.writeHead(303, {
					"cache-control": "no-store",
					"location": "/",
					"referrer-policy": "no-referrer"
				});
				res.end();
				return false;
			}
			this.writeUnauthorized(req, res);
			return false;
		}
		if (this.isAuthenticated(req)) return true;
		this.writeUnauthorized(req, res);
		return false;
	}
	/**
	* Verify the authority-bound browser cookie on a Host request.
	* @param request - request headers carrying Host and Cookie.
	* @returns true only for an unexpired cookie signed by this activation's loaded secret.
	*/
	isAuthenticated(request) {
		const authority = requestAuthority(request.headers);
		const rawCookie = header(request.headers, "cookie");
		if (authority === void 0 || rawCookie === void 0) return false;
		const value = cookieValue(rawCookie, cookieName(authority));
		if (value === void 0) return false;
		const payload = decodeCookie(value, this.secret);
		if (payload === void 0 || payload.authority !== authority) return false;
		const now = Date.now();
		return payload.issuedAt <= now && payload.expiresAt > now && payload.expiresAt > payload.issuedAt && payload.expiresAt - payload.issuedAt <= this.maxAgeMilliseconds;
	}
	writeUnauthorized(req, res) {
		res.writeHead(401, {
			"cache-control": "no-store",
			"content-type": "text/plain; charset=utf-8"
		});
		res.end(req.method === "HEAD" ? void 0 : "dsh web authentication required; reopen the URL printed by dsh web.\n");
	}
};
//#endregion
//#region lib/types/rpc.js
/** Generic unary RPC contracts shared by the Host and Client Connection halves. */
/**
* Brand one validated string as a Connection correlation id.
* @param id - validated wire identity.
* @returns the same string with the correlation-id brand.
*/
function RpcId(id) {
	return id;
}
/**
* Convert a rejected transport operation into a generic failure result.
* @param error - rejected transport value.
* @returns an `internal` failure preserving the available message.
*/
function transportError(error) {
	return {
		ok: false,
		error: {
			code: "gateway/internal",
			message: error instanceof Error ? error.message : String(error),
			details: {}
		}
	};
}
//#endregion
//#region lib/types/rpc-schema.js
/** Runtime validation for Connection RPC envelopes. */
/** Correlation id after wire validation. */
const rpcIdSchema = z$1.string();
/** Generic endpoint failure carried in a response envelope. */
const rpcErrorSchema = z$1.object({
	code: z$1.string(),
	message: z$1.string(),
	details: z$1.record(z$1.string(), z$1.unknown())
});
/**
* Build the result parser for one endpoint value parser.
* @param value - endpoint-owned success-value parser.
* @returns parser for either a success value or generic failure.
*/
function rpcResultSchema(value) {
	return z$1.union([z$1.object({
		ok: z$1.literal(true),
		value
	}), z$1.object({
		ok: z$1.literal(false),
		error: rpcErrorSchema
	})]);
}
/** Client request envelope; endpoint payload validation belongs to its owner. */
const clientRequestSchema = z$1.object({
	type: z$1.literal("client-request"),
	rpcId: rpcIdSchema,
	method: z$1.string(),
	payload: z$1.unknown()
});
/** Server response envelope; endpoint value validation belongs to its caller. */
const serverResponseSchema = z$1.object({
	type: z$1.literal("server-response"),
	rpcId: rpcIdSchema,
	result: rpcResultSchema(z$1.unknown().optional())
});
/** Either Connection RPC envelope direction. */
const rpcMessageSchema = z$1.discriminatedUnion("type", [clientRequestSchema, serverResponseSchema]);
//#endregion
//#region lib/types/rpc-host.js
/** Host registry and HTTP adapter for generic Connection RPC channels. */
const INVALID_REQUEST_RPC_ID = RpcId("invalid-request");
const CHANNEL_PATTERN = /^\/[A-Za-z0-9._~-]+$/;
const ENDPOINT_SEGMENT_PATTERN = /^[A-Za-z0-9_$.-]+$/;
/** Host Connection service whose channel registrations belong to the caller fiber. */
var HostConnectionService = class extends Service {
	trustedHosts;
	browserAuth;
	interceptors = /* @__PURE__ */ new Map();
	fetchRoutes = /* @__PURE__ */ new Map();
	/**
	* Provide the Host half over the active HTTP server.
	* @param ctx - owning Connection plugin context.
	* @param trustedHosts - deployment authorities accepted by the Host/Origin fence.
	* @param browserAuth - process token and persistent browser-session owner.
	*/
	constructor(ctx, trustedHosts, browserAuth) {
		super(ctx, "connection");
		this.trustedHosts = trustedHosts;
		this.browserAuth = browserAuth;
	}
	/** Generic channel registry scoped to the Context reading this service. */
	get rpc() {
		const owner = this.ctx;
		return {
			handle: (channel, handler) => this.register(owner, channel, handler),
			intercept: (channel, matches, handler) => this.registerInterceptor(owner, channel, matches, handler)
		};
	}
	/** Exact Fetch-route registry scoped to the Context reading this service. */
	get fetch() {
		const owner = this.ctx;
		return { register: (route) => this.registerFetchRoute(owner, route) };
	}
	/** Apply the configured Host/Origin fence, then browser authentication. */
	requestRejection(request) {
		if (!isTrustedApiRequest(request, this.trustedHosts)) return 403;
		return this.browserAuth.isAuthenticated(request) ? void 0 : 401;
	}
	/** Authenticate an index request through the process-token exchange or cookie. */
	authorizeIndex(request, response) {
		return this.browserAuth.authorizeIndex(request, response);
	}
	/** Add this process's launch token to the clean application URL. */
	authenticatedUrl(baseUrl) {
		return this.browserAuth.authenticatedUrl(baseUrl);
	}
	/**
	* Compose one shared-channel Fetch handler from exact routes and its interceptor.
	* @param channel - shared channel mounted by Connection.
	* @returns Fetch handler that selects one owner or returns 404.
	*/
	createSharedFetchHandler(channel) {
		return {
			requestBodyMode: ({ method, url }) => {
				const route = this.fetchRoutes.get(url.pathname);
				return route?.methods.has(method) === true ? route.requestBody : "buffered";
			},
			fetch: (request) => {
				const pathname = new URL(request.url).pathname;
				const route = this.fetchRoutes.get(pathname);
				if (route?.methods.has(request.method) === true) return route.fetch(request);
				const endpoint = endpointFromPath(channel, pathname);
				const interceptor = this.interceptors.get(channel);
				if (endpoint === void 0 || interceptor === void 0 || !interceptor.matches(endpoint)) return Promise.resolve(new Response("not found", { status: 404 }));
				return interceptor.fetchHandler.fetch(request);
			}
		};
	}
	registerFetchRoute(owner, route) {
		assertFetchRoute(route);
		const registered = {
			methods: new Set(route.methods),
			requestBody: route.requestBody,
			fetch: route.fetch
		};
		return owner.effect(() => {
			if (this.fetchRoutes.has(route.path)) throw new Error(`connection: exact Fetch route ${JSON.stringify(route.path)} is already registered`);
			this.fetchRoutes.set(route.path, registered);
			return () => {
				this.fetchRoutes.delete(route.path);
			};
		}, `client-connection: ${route.path} Fetch route`);
	}
	register(owner, channel, handler) {
		assertChannel(channel);
		const fetchHandler = rpcFetchHandler(channel, handler);
		const route = {
			kind: "prefix",
			path: channel,
			handler: async (req, res) => {
				const rejection = this.requestRejection(req);
				if (rejection !== void 0) {
					res.writeHead(rejection);
					res.end(rejection === 401 ? "unauthorized" : "forbidden");
					return;
				}
				await bridge(req, res, fetchHandler);
			}
		};
		return owner.effect(() => owner.webServer.register(route), `client-connection: ${channel} rpc channel`);
	}
	registerInterceptor(owner, channel, matches, handler) {
		if (channel !== "/api") throw new Error(`connection: invalid shared RPC channel ${JSON.stringify(channel)}`);
		const interceptor = {
			matches,
			fetchHandler: rpcFetchHandler(channel, handler)
		};
		return owner.effect(() => {
			if (this.interceptors.has(channel)) throw new Error(`connection: shared RPC channel ${JSON.stringify(channel)} already has an interceptor`);
			this.interceptors.set(channel, interceptor);
			return () => {
				this.interceptors.delete(channel);
			};
		}, `client-connection: ${channel} rpc interceptor`);
	}
};
function rpcFetchHandler(channel, handler) {
	return {
		requestBodyMode: () => "buffered",
		async fetch(request) {
			const endpoint = endpointFromPath(channel, new URL(request.url).pathname);
			if (request.method !== "POST" || endpoint === void 0) return new Response("not found", { status: 404 });
			if (request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") return new Response("content type must be application/json", { status: 415 });
			let body;
			try {
				body = await request.json();
			} catch {
				return new Response("body is not JSON", { status: 400 });
			}
			const envelope = clientRequestSchema.safeParse(body);
			if (!envelope.success) return invalidEnvelopeResponse(body, envelope.error.issues);
			const message = envelope.data;
			if (message.method !== endpoint) return errorResponse(message.rpcId, {
				code: "gateway/bad-request",
				message: `method ${JSON.stringify(message.method)} does not match endpoint ${JSON.stringify(endpoint)}`,
				details: { issues: [] }
			});
			try {
				const result = await handler(endpoint, message.payload, request.signal);
				return fullResponse(message.rpcId, result);
			} catch (error) {
				return new Response(`handler failure: ${String(error)}`, { status: 500 });
			}
		}
	};
}
function invalidEnvelopeResponse(body, issues) {
	const rawId = body?.rpcId;
	return errorResponse(typeof rawId === "string" ? RpcId(rawId) : INVALID_REQUEST_RPC_ID, {
		code: "gateway/bad-request",
		message: "invalid client-request message",
		details: { issues }
	});
}
function endpointFromPath(channel, pathname) {
	if (!pathname.startsWith(`${channel}/`)) return void 0;
	const endpoint = pathname.slice(channel.length + 1);
	if (endpoint.split("/").some((segment) => segment === "" || segment === "." || segment === ".." || !ENDPOINT_SEGMENT_PATTERN.test(segment))) return;
	return endpoint;
}
function errorResponse(rpcId, error) {
	return fullResponse(rpcId, {
		ok: false,
		error
	});
}
function fullResponse(rpcId, result) {
	const body = {
		type: "server-response",
		rpcId,
		result
	};
	return Response.json(body);
}
function assertChannel(channel) {
	if (!CHANNEL_PATTERN.test(channel) || channel === "/api") throw new Error(`connection: invalid or reserved RPC channel ${JSON.stringify(channel)}`);
}
function assertFetchRoute(route) {
	if (endpointFromPath("/api", route.path) === void 0) throw new Error(`connection: invalid exact Fetch route ${JSON.stringify(route.path)}`);
	if (route.methods.length === 0) throw new Error(`connection: exact Fetch route ${JSON.stringify(route.path)} declares no methods`);
	if (new Set(route.methods).size !== route.methods.length) throw new Error(`connection: exact Fetch route ${JSON.stringify(route.path)} repeats a method`);
}
//#endregion
//#region lib/types/recovery-config.js
/** Shared validation for Host-configured and browser-local connection recovery. */
const MAX_TIMER_MS = 2147483647;
/** Schema shared by the Host plugin and the Client's recovery input parser. */
const ConnectionRecoveryConfigSchema = z.object({
	backoffBaseMs: z.natural().min(1).max(MAX_TIMER_MS).default(500),
	backoffFactor: z.number().min(1).max(Number.MAX_VALUE).default(2),
	backoffMaxMs: z.natural().min(1).max(MAX_TIMER_MS).default(1e4),
	generationReadyWarnMs: z.natural().min(1).max(MAX_TIMER_MS).default(3e3),
	generationReadyTimeoutMs: z.natural().min(1).max(MAX_TIMER_MS).default(15e3)
});
/**
* Validate recovery input and supply every timing default before starting work.
* @param config - Host configuration, page bootstrap data, or direct loop options.
* @returns validated, complete recovery timing.
*/
function resolveConnectionConfig(config = {}) {
	const resolved = ConnectionRecoveryConfigSchema(config);
	if (!Number.isFinite(resolved.backoffFactor)) throw new RangeError("connection recovery backoffFactor must be finite");
	return resolved;
}
//#endregion
//#region lib/types/index.js
/** Stable Cordis plugin name. */
const name = "client-connection";
/** Headroom for RPC JSON fields around aggregate base64 image payloads. */
const REQUEST_ENVELOPE_HEADROOM_BYTES = 1024 * 1024;
function assertImageBodyCapacity(ctx, maxRequestBodyBytes) {
	const attachments = ctx.get("attachments");
	if (attachments === void 0) return;
	const requiredImageBodyBytes = Math.ceil(attachments.imageLimits.maxMessageImageBytes * 4 / 3) + REQUEST_ENVELOPE_HEADROOM_BYTES;
	if (maxRequestBodyBytes < requiredImageBodyBytes) throw new Error(`client-connection maxRequestBodyBytes (${String(maxRequestBodyBytes)}) must be at least ${String(requiredImageBodyBytes)} for the configured aggregate image limit`);
}
/** Services required before providing Connection. */
const inject = ["credentials"];
const Config = z.object({
	recovery: ConnectionRecoveryConfigSchema.default({}),
	trustedHosts: z.array(String).default([]),
	cookieMaxAgeDays: z.natural().min(1).default(30),
	maxRequestBodyBytes: z.natural().min(1).default(DEFAULT_MAX_REQUEST_BODY_BYTES)
});
/**
* Provides carrier-neutral RPC and Fetch registries. When `webServer` is
* present, the plugin also mounts the `/api` browser transport with Host/Origin
* checks and persistent browser authentication.
* @param ctx - Host plugin context.
* @param config - resolved plugin config (schema defaults applied).
*/
async function apply(ctx, config) {
	const recovery = resolveConnectionConfig(config?.recovery);
	const trustedHosts = config?.trustedHosts ?? [];
	const cookieMaxAgeDays = config?.cookieMaxAgeDays ?? 30;
	const maxRequestBodyBytes = config?.maxRequestBodyBytes ?? 314572800;
	for (const entry of trustedHosts) assertTrustedAuthority(entry);
	assertImageBodyCapacity(ctx, maxRequestBodyBytes);
	const connection = new HostConnectionService(ctx, trustedHosts, await BrowserAuth.create(ctx.root, ctx.credentials, cookieMaxAgeDays));
	ctx.inject(["webServer"], (webCtx) => {
		assertImageBodyCapacity(webCtx, maxRequestBodyBytes);
		webCtx.on("webserver/index-inject", (table) => {
			table.push({
				kind: "global",
				name: "__DSH_CONNECTION_RECOVERY__",
				value: recovery
			});
		});
		const fetchHandler = connection.createSharedFetchHandler(API_PATH);
		const route = {
			kind: "prefix",
			path: API_PATH,
			handler: async (req, res) => {
				const rejection = connection.requestRejection(req);
				if (rejection !== void 0) {
					res.writeHead(rejection);
					res.end(rejection === 401 ? "unauthorized" : "forbidden");
					return;
				}
				await bridge(req, res, fetchHandler, maxRequestBodyBytes);
			}
		};
		webCtx.effect(() => webCtx.webServer.register(route), "client-connection: /api route");
	});
	ctx.inject(["attachments"], (attachmentCtx) => {
		assertImageBodyCapacity(attachmentCtx, maxRequestBodyBytes);
	});
}
//#endregion
export { API_PATH, Config, HostConnectionService, RpcId, apply, clientRequestSchema, inject, name, rpcErrorSchema, rpcIdSchema, rpcMessageSchema, rpcResultSchema, serverResponseSchema, transportError };
