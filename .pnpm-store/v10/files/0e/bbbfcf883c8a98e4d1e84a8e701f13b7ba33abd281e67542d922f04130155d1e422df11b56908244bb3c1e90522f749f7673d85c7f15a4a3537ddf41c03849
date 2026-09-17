import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import z from "@deepseek-ai/schemastery";
//#region lib/types/index.js
/**
* @deepseek-ai/dsh-host-frontend-static — SPA dist server over the webserver
* fallback seat: serves the built frontend directory with explicit index
* entry points. A readable index renders at the dist root and configured index
* path; missing paths return 404, traversal outside the dist root is 403,
* unknown extensions ship as octet-stream, and non-GET/HEAD is 405. Every
* index response first passes Connection's browser authentication, then the
* webserver's index render (structured injection rows, then raw taps).
* Non-index assets stay public. The dist location is workspace knowledge of
* the composing application, so `distIndex` is typically supplied through a
* `!!js` expression, never hardcoded by a deployment.
* @module @deepseek-ai/dsh-host-frontend-static
*/
/** Stable Cordis plugin name. */
const name = "frontend-static";
/** Services required before the authenticated fallback seat can be claimed. */
const inject = ["webServer", "connection"];
const Config = z.object({ distIndex: z.string().required() });
const HTML_MIME = "text/html; charset=utf-8";
const MIME = {
	".html": HTML_MIME,
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".svg": "image/svg+xml",
	".json": "application/json",
	".map": "application/json",
	".webmanifest": "application/manifest+json",
	".gz": "application/gzip"
};
const STATIC_MISS_CODES = new Set([
	"ENOENT",
	"EISDIR",
	"ENOTDIR"
]);
/**
* Serve one GET/HEAD static request from the dist root.
* @param pathname - decoded URL pathname of the request.
* @param res - the node:http response to write.
* @param distRoot - absolute dist root directory (resolved by the caller).
* @param distIndex - absolute path of index.html inside distRoot.
* @param authorizeIndex - authenticates an index response before its bytes are read.
* @param renderIndex - produces the index.html body (structured injection
* rendering) for the dist root and configured index path.
*/
async function serveStatic(pathname, res, distRoot, distIndex, authorizeIndex, renderIndex) {
	const target = resolve(normalize(join(distRoot, pathname)));
	if (target !== distRoot && !target.startsWith(distRoot + sep)) {
		res.writeHead(403);
		res.end();
		return;
	}
	let body;
	let type;
	try {
		if (target === distRoot || target === distIndex) {
			if (!authorizeIndex()) return;
			body = await renderIndex();
			type = HTML_MIME;
		} else {
			body = await readFile(target);
			type = MIME[extname(target)] ?? "application/octet-stream";
		}
	} catch (error) {
		if (!STATIC_MISS_CODES.has(error.code)) throw error;
		res.writeHead(404);
		res.end();
		return;
	}
	res.writeHead(200, { "content-type": type });
	res.end(body);
}
/**
* Claim the webserver fallback seat and serve the dist.
* @param ctx - plugin context carrying the webServer service.
* @param config - validated {@link Config}.
*/
function apply(ctx, config) {
	const distIndex = config.distIndex;
	const distRoot = dirname(distIndex);
	const renderIndex = async () => {
		return ctx.webServer.renderIndex(await readFile(distIndex, "utf8")).replace(/<head(?:\s[^>]*)?>/i, (open) => `${open}<base href="/">`);
	};
	ctx.effect(() => ctx.webServer.registerFallback(async (req, res) => {
		if (req.method !== "GET" && req.method !== "HEAD") {
			res.writeHead(405);
			res.end();
			return;
		}
		/* v8 ignore next -- node:http always sets url on server requests */
		const rawPath = new URL(req.url ?? "/", "http://x").pathname;
		await serveStatic(decodeURIComponent(rawPath), res, distRoot, distIndex, () => ctx.connection.authorizeIndex(req, res), renderIndex);
	}), "frontend-static: fallback seat");
}
//#endregion
export { Config, apply, inject, name, serveStatic };
