import { credentialRef } from "@deepseek-ai/dsh-credentials";
import z from "@deepseek-ai/schemastery";
import { Webhooks } from "@octokit/webhooks";
import { snapshotJsonValue } from "@deepseek-ai/dsh-util-values";
import { WebhookDeliveryId, WebhookSourceId } from "@deepseek-ai/dsh-webhook";
//#region lib/types/body.js
/** Bounded raw HTTP body intake for GitHub signature verification. */
/** HTTP refusal whose message is safe to return without request data. */
var WebhookHttpError = class extends Error {
	status;
	name = "WebhookHttpError";
	constructor(status, message) {
		super(message);
		this.status = status;
	}
};
/** Parse a decimal Content-Length or reject an ambiguous header. */
function contentLength(request) {
	const value = request.headers["content-length"];
	if (value === void 0) return void 0;
	if (!/^(0|[1-9]\d*)$/.test(value)) throw new WebhookHttpError(400, "invalid Content-Length");
	const length = Number(value);
	if (!Number.isSafeInteger(length)) throw new WebhookHttpError(413, "request body is too large");
	return length;
}
/**
* Read one request body as exact, bounded UTF-8 text.
* @param request - incoming request before any parser consumes it.
* @param maxBodyBytes - positive byte ceiling.
* @returns the decoded body after EOF.
* @throws {WebhookHttpError} for invalid length, excessive bytes, invalid UTF-8, or an aborted stream.
*/
async function readBoundedUtf8Body(request, maxBodyBytes) {
	const declared = contentLength(request);
	if (declared !== void 0 && declared > maxBodyBytes) {
		request.resume();
		throw new WebhookHttpError(413, "request body is too large");
	}
	const chunks = [];
	let size = 0;
	try {
		for await (const raw of request) {
			const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
			size += chunk.byteLength;
			if (size > maxBodyBytes) {
				request.resume();
				throw new WebhookHttpError(413, "request body is too large");
			}
			chunks.push(chunk);
		}
	} catch (error) {
		if (error instanceof WebhookHttpError) throw error;
		throw new WebhookHttpError(400, "request body was aborted");
	}
	if (!request.complete) throw new WebhookHttpError(400, "request body was aborted");
	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks, size));
	} catch {
		throw new WebhookHttpError(400, "request body is not valid UTF-8");
	}
}
//#endregion
//#region lib/types/handler.js
/** GitHub HTTP authentication, parsing, and fire-and-forget dispatch. */
/** Require one unambiguous non-empty request header. */
function requiredHeader(request, name) {
	const values = request.headersDistinct[name];
	const value = values?.[0];
	if (values?.length !== 1 || value === void 0 || value.trim() === "") throw new WebhookHttpError(400, `missing ${name} header`);
	return value;
}
/** Whether Content-Type names JSON with at most one UTF-8 charset parameter. */
function isJsonContentType(value) {
	if (value === void 0) return false;
	const [mediaType, parameter, ...extra] = value.split(";").map((part) => part.trim());
	if (mediaType?.toLowerCase() !== "application/json") return false;
	if (parameter === void 0) return true;
	return extra.length === 0 && /^charset=(?:utf-8|"utf-8")$/i.test(parameter);
}
/** Send one empty or plain-text response exactly once. */
function respond(response, status, message) {
	if (message === void 0) {
		response.writeHead(status);
		response.end();
		return;
	}
	response.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
	response.end(message);
}
/** Convert a parsed value into the adapter's generic signed-object guarantee. */
function parsePayload(body) {
	let parsed;
	try {
		parsed = JSON.parse(body);
	} catch {
		throw new WebhookHttpError(400, "request body is not valid JSON");
	}
	if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new WebhookHttpError(400, "GitHub webhook payload must be a JSON object");
	const snapshot = snapshotJsonValue(parsed);
	if (snapshot === void 0) throw new WebhookHttpError(400, "GitHub webhook payload is not lossless JSON");
	return snapshot;
}
/**
* Create one exact-route GitHub handler.
* @param ctx - adapter context carrying credentials and webhook runtime.
* @param config - validated source, credential reference, and body ceiling.
* @returns an HTTP handler that answers after in-memory dispatch, never rule settlement.
*/
function createGitHubWebhookHandler(ctx, config) {
	return async (request, response) => {
		try {
			if (request.method !== "POST") {
				response.setHeader("allow", "POST");
				throw new WebhookHttpError(405, "method not allowed");
			}
			if (!isJsonContentType(request.headers["content-type"])) throw new WebhookHttpError(415, "content type must be application/json");
			const body = await readBoundedUtf8Body(request, config.maxBodyBytes);
			const signature = requiredHeader(request, "x-hub-signature-256");
			const deliveryId = requiredHeader(request, "x-github-delivery");
			const eventName = requiredHeader(request, "x-github-event");
			const credential = await ctx.credentials.resolve(config.secretEnv);
			if (credential === void 0 || credential.value === "") throw new WebhookHttpError(503, "GitHub webhook secret is unavailable");
			let verified = false;
			try {
				verified = await new Webhooks({ secret: credential.value }).verify(body, signature);
			} catch {}
			if (!verified) throw new WebhookHttpError(401, "invalid webhook signature");
			const payload = parsePayload(body);
			const delivery = {
				kind: "github",
				source: WebhookSourceId(config.source),
				deliveryId: WebhookDeliveryId(deliveryId),
				event: {
					name: eventName,
					payload
				},
				receivedAt: Date.now()
			};
			try {
				ctx.webhookRuntime.dispatch(delivery);
			} catch {
				ctx.logger.warn("webhook-github: dispatch unavailable");
				throw new WebhookHttpError(503, "webhook runtime is unavailable");
			}
			respond(response, 202);
		} catch (error) {
			if (error instanceof WebhookHttpError) {
				respond(response, error.status, error.message);
				return;
			}
			ctx.logger.warn("webhook-github: request failed");
			respond(response, 503, "webhook ingress is unavailable");
		}
	};
}
//#endregion
//#region lib/types/index.js
/** Signed GitHub HTTP adapter for the provider-neutral webhook runtime. */
/** Cordis function-plugin name. */
const name = "webhook-github";
/** Host services required before the exact route can register. */
const inject = [
	"webServer",
	"webhookRuntime",
	"credentials"
];
const Config = z.object({
	source: z.string().required(),
	path: z.string().required(),
	secretEnv: z.string().role("credential-ref").required(),
	maxBodyBytes: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).required()
});
/** Validate route and source facts that Schemastery cannot express. */
function assertConfig(config) {
	if (config.source.trim() !== config.source || config.source === "") throw new Error("webhook-github source must be a non-empty trimmed string");
	if (!config.path.startsWith("/") || config.path === "/" || config.path.endsWith("/") || config.path.includes("?") || config.path.includes("#")) throw new Error("webhook-github path must be an absolute non-root pathname without a trailing slash, query, or fragment");
}
/** Register one signed GitHub endpoint on the injected WebServer. */
function apply(ctx, config) {
	assertConfig(config);
	const route = {
		kind: "exact",
		path: config.path,
		handler: createGitHubWebhookHandler(ctx, {
			source: config.source,
			secretEnv: credentialRef(config.secretEnv),
			maxBodyBytes: config.maxBodyBytes
		})
	};
	ctx.effect(() => ctx.webServer.register(route), `webhook-github: ${config.path}`);
}
//#endregion
export { Config, apply, inject, name };
