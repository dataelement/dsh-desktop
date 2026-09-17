import { remoteErrorOf } from "@deepseek-ai/dsh-typert-protocol";
//#region lib/types/presented.js
/** Authenticated POST route for opening a workspace file on the Host desktop. */
const PRESENT_OPEN_PATH = "/api/present.open";
/** Authenticated desktop availability and destination metadata. */
const PRESENT_HOST_PATH = "/api/present.host";
/**
* Validate a file declaration read from a Session log.
* @param value - decoded durable data.
* @returns whether the declaration contains a path and optional description.
*/
function isPresentedFile(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const { path, description } = value;
	return typeof path === "string" && path.trim().length > 0 && (description === void 0 || typeof description === "string");
}
/**
* Validate a delivery event before reading its turn or file declarations.
* @param value - decoded durable event data.
* @returns whether the event identifies a turn, call, and file list.
*/
function isPresentedData(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const { turn, callId, files } = value;
	return typeof turn === "number" && Number.isSafeInteger(turn) && turn >= 1 && typeof callId === "string" && callId.length > 0 && Array.isArray(files);
}
//#endregion
//#region lib/types/present-open.js
/**
* Register native opening inside Connection's authentication fence.
* @param ctx - Session lookup, native opener, and route lifetime.
*/
function registerPresentOpen(ctx) {
	ctx.connection.fetch.register({
		path: PRESENT_HOST_PATH,
		methods: ["GET"],
		requestBody: "buffered",
		fetch: () => Promise.resolve(Response.json(ctx.sessionController.workspaceDesktop(), { headers: { "cache-control": "no-store" } }))
	});
	const lifetime = new AbortController();
	const pending = /* @__PURE__ */ new Set();
	ctx.effect(() => async () => {
		lifetime.abort();
		await Promise.allSettled(pending);
	});
	ctx.connection.fetch.register({
		path: PRESENT_OPEN_PATH,
		methods: ["POST"],
		requestBody: "buffered",
		fetch: (request) => {
			const task = handlePresentOpen(ctx, new Request(request, { signal: AbortSignal.any([request.signal, lifetime.signal]) }));
			pending.add(task);
			task.then(() => {
				pending.delete(task);
			}, () => {
				pending.delete(task);
			});
			return task;
		}
	});
}
async function handlePresentOpen(ctx, request) {
	const query = new URL(request.url).searchParams;
	const action = query.get("action") ?? "open";
	if (action !== "open" && action !== "reveal") return new Response("Invalid file action.", { status: 400 });
	const id = query.get("sessionId");
	const seq = query.get("seq");
	const index = query.get("index");
	if (!id || seq === null || index === null || !/^\d+$/.test(seq) || !/^\d+$/.test(index) || !Number.isSafeInteger(Number(seq)) || !Number.isSafeInteger(Number(index))) return new Response("Invalid Presented file coordinates.", { status: 400 });
	try {
		request.signal.throwIfAborted();
		if (!ctx.sessionController.workspaceDesktop().available) return new Response("Host desktop unavailable.", { status: 409 });
		const { target, session } = await ctx.sessionQuery.readEvent({
			sessionId: id,
			seq: Number(seq),
			before: 0,
			after: 0
		}, request.signal);
		const file = target.type === "deliverables/presented" && isPresentedData(target.data) ? target.data.files[Number(index)] : void 0;
		if (!isPresentedFile(file)) return new Response("Presented file not found in this Session result.", { status: 404 });
		request.signal.throwIfAborted();
		const { fs, workspaceFiles } = ctx;
		const { absolutePath: path } = await workspaceFiles.stat({
			sessionId: id,
			workspaceRoot: session.cwd ?? ctx.sandboxPolicy.workspaceRoot
		}, file.path, request.signal);
		const mapped = fs.processPathFromHostPath(path);
		if (mapped === void 0 || fs.processPath(await fs.resolve(mapped, { signal: request.signal })) !== path) return new Response("Presented file has no verified Host path.", { status: 422 });
		request.signal.throwIfAborted();
		await ctx.sessionController.openWorkspacePath({
			path,
			...action === "reveal" ? { action } : {}
		}, request.signal);
		return new Response(null, {
			status: 204,
			headers: { "cache-control": "no-store" }
		});
	} catch (error) {
		request.signal.throwIfAborted();
		const remote = remoteErrorOf(error);
		const missing = remote?.code === "session/not-found" || remote?.code === "workspace-file/not-found" || remote?.code === "workspace-file/not-regular-file" || error instanceof Error && "code" in error && (error.code === "SESSION_QUERY_SESSION_NOT_FOUND" || error.code === "SESSION_QUERY_EVENT_NOT_FOUND" || error.code === "ENOENT" || error.code === "ENOTDIR");
		return new Response("Presented file unavailable.", { status: missing ? 404 : 500 });
	}
}
//#endregion
//#region lib/types/index.js
/**
* Deliverables plugin, node half. Registers the response-format guidance that
* lets the browser half recognize final-response file references and serves
* authenticated native opens of declared files. The browser
* half ships via exports["./client"], discovered through the package.json
* dsh.client declaration.
*/
/** Services required for file-reference guidance and authenticated native opens of declared files. */
const inject = [
	"systemPrompt",
	"connection",
	"sessionQuery",
	"sessionController",
	"workspaceFiles",
	"fs",
	"sandboxPolicy"
];
/** Stable final-response guidance owned by the matching renderer. */
const FILE_REFERENCE_PROMPT = "When you successfully create or modify files, mention the primary outputs in your final response. To make those and any other changed-file references clickable in Web, format them as Markdown inline code using the exact file-tool path, or a basename when unique among the files changed in that turn.";
/**
* Register model guidance for the file-reference renderer shipped by this package.
* @param ctx - host context carrying the system-prompt registry.
*/
function apply(ctx) {
	registerPresentOpen(ctx);
	ctx.systemPrompt.section({
		name: "ui:deliverable-file-references",
		order: ctx.systemPrompt.getSectionOrder("DELIVERABLE_FILE_REFERENCES"),
		text: FILE_REFERENCE_PROMPT
	});
}
//#endregion
export { apply, inject };
