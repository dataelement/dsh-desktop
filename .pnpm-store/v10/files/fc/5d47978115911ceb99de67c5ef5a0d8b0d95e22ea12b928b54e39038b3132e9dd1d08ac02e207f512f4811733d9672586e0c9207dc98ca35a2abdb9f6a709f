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
import type { ServerResponse } from 'node:http';
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
/** Stable Cordis plugin name. */
export declare const name = "frontend-static";
/** Services required before the authenticated fallback seat can be claimed. */
export declare const inject: string[];
/** Plugin config: the dist anchor. */
export interface Config {
    /** Absolute path of index.html inside the dist root. */
    distIndex: string;
}
export declare const Config: z<Config>;
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
export declare function serveStatic(pathname: string, res: ServerResponse, distRoot: string, distIndex: string, authorizeIndex: () => boolean, renderIndex: () => Promise<string>): Promise<void>;
/**
 * Claim the webserver fallback seat and serve the dist.
 * @param ctx - plugin context carrying the webServer service.
 * @param config - validated {@link Config}.
 */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map