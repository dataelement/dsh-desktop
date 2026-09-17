import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";
import z from "@deepseek-ai/schemastery";
import { addHarnessSourceSection } from "@deepseek-ai/dsh-app-boot";
import * as FrontendStatic from "@deepseek-ai/dsh-host-frontend-static";
import { launchEnvironmentOf, launchedThroughSsh } from "@deepseek-ai/dsh-launch-environment";
import { scrubbedParentEnv } from "@deepseek-ai/dsh-subprocess";
//#region lib/types/index.js
/**
* @deepseek-ai/dsh-web-app — the browser-surface bundle's runtime glue plugin
* plus the bundle patch (`cordis.patch.yml`, declared by the `dsh.bundle.patch`
* manifest field). The plugin owns the browser-surface glue: it resolves
* the built frontend dist (workspace knowledge of this bundle, never user
* config), mounts the `frontend-static` fallback owner over it, registers the
* harness-source and web-surface prompt sections, the bash-visible web runtime
* variable, the process-token URL line, and the default-browser handoff. The
* model and shell retain the clean URL. App command-line values arrive through
* the `webStartup` service expressions in the bundle patch.
* @module @deepseek-ai/dsh-web-app
*/
/** Stable Cordis plugin name. */
const name = "web-app";
/** This dsh installation's root, from either this package's source or built entry. */
const SOURCE_ROOT = fileURLToPath(new URL("../../../..", import.meta.url));
const ANNOUNCED_ROOTS = /* @__PURE__ */ new WeakSet();
/** Runtime service that releases Web rows after bind-dependent values resolve. */
const WEB_RUNTIME_SERVICE = "webRuntime";
/** Services required before the web runtime can mount. */
const inject = ["webServer"];
const Config = z.object({
	openBrowser: z.boolean().default(true),
	printUrl: z.boolean().default(true),
	surfaceContext: z.boolean().default(true),
	trustedHosts: z.array(String).default([])
});
/** Environment variable naming the canonical local URL of this Web GUI. */
const DSH_WEB_URL = "DSH_WEB_URL";
const LOOPBACK_HOST = "127.0.0.1";
/** The webserver schema's all-interfaces bind literal. */
const ALL_INTERFACES_HOST = "0.0.0.0";
const BROWSER_OPENER_MODULE = import.meta.resolve("open");
const BROWSER_OPENER_PROGRAM = `
try {
  const { default: open } = await import(${JSON.stringify(BROWSER_OPENER_MODULE)})
  const launcher = await open(process.argv[1])
  if (process.platform === 'win32') {
    // open resolves at PowerShell spawn; keep it referenced until that launcher hands the URL to Windows.
    const code = launcher.exitCode ?? await new Promise((resolve, reject) => {
      function onError(error) {
        launcher.off('close', onClose)
        reject(error)
      }
      function onClose(code) {
        launcher.off('error', onError)
        resolve(code)
      }
      launcher.ref()
      launcher.once('error', onError)
      launcher.once('close', onClose)
    })
    if (code !== 0) throw new Error('browser operating-system launcher exited with code ' + String(code))
  }
  process.exitCode = 0
} catch (error) {
  // The parent turns this exit into the manual-URL warning.
  console.error(error)
  process.exitCode = 1
}
`;
/**
* Resolve one LAN-trust snapshot from the active server bind.
*
* Derived entries are port-less IP literals: DNS rebinding needs an
* attacker-controlled name, while an IP-literal Host is safe on any port and
* an OS-assigned port is unknowable before bind.
* @param bindHost - the active webserver bind host.
* @param extra - explicit `--trusted-host` values, in argument order.
* @returns the LAN display addresses and invocation-derived fence authorities.
*/
function resolveLanTrust(bindHost, extra) {
	const lanAddresses = bindHost === ALL_INTERFACES_HOST ? Object.values(networkInterfaces()).flat().filter((iface) => iface !== void 0 && iface.family === "IPv4" && !iface.internal).map((iface) => iface.address) : [];
	return {
		lanAddresses,
		trustedHosts: [...lanAddresses, ...extra]
	};
}
/** Model-visible orientation and acceptance boundary for sessions created through `dsh web`. */
function webSurfacePrompt(webUrl) {
	return `You are interacting with the user through the DeepSeek Harness Web GUI at ${webUrl}. When the user refers to "this page", "this GUI", or "this app" without naming another target, they mean this GUI. The browser provides no implicit DOM, route, or screenshot context. The client-plugin HMR receiver is active, but client-plugin changes reload without a refresh only while \`pnpm run dev:web\` is also running from this same checkout to rebuild their bundles; verify that watcher before promising automatic updates. Every other change — the apps/web shell and plain packages — requires rebuilding the affected Web artifacts and verifying this existing URL after a page refresh. Starting another server does not update this GUI. The apps/web Vite entry builds the shell but is not a standalone application because only dsh web injects window.__DSH_BOOT__. Do not start a replacement server unless the user asks; if one is needed, use a managed background job and verify its exact URL.`;
}
/** Resolve the canonical loopback URL from the active Web server. */
function localWebUrl(ctx) {
	const port = ctx.get("webServer")?.port;
	if (port === void 0) throw new Error("web-app: webServer service missing while resolving Web runtime");
	return `http://${LOOPBACK_HOST}:${String(port)}`;
}
/**
* Dist location is workspace knowledge of this bundle: anchored on the
* frontend package manifest, not configured. Existence is a request-time
* concern — the fallback owner reads files per request, so a composition
* whose page never reaches the fallback seat (the static worker preview
* ships its own page and carries no dist) boots without one.
*/
function resolveDistIndex() {
	const require = createRequire(import.meta.url);
	try {
		return join(dirname(require.resolve("@deepseek-ai/dsh-web-frontend/package.json")), "dist", "index.html");
	} catch {
		/* v8 ignore next 2 -- reachable only when the frontend package is absent from the checkout */
		throw new Error("web-app: @deepseek-ai/dsh-web-frontend is not resolvable from this composition");
	}
}
/** Start the maintained platform opener without forwarding Harness credentials. */
function spawnBrowserLauncher(url) {
	return spawn(process.execPath, [
		"--input-type=module",
		"--eval",
		BROWSER_OPENER_PROGRAM,
		"--",
		url
	], {
		env: scrubbedParentEnv(),
		stdio: [
			"ignore",
			"inherit",
			"pipe"
		]
	});
}
/** Hand one URL to the operating system's default browser. */
async function openBrowser(url) {
	const launcher = spawnBrowserLauncher(url);
	let launcherStderr = "";
	launcher.stderr?.setEncoding("utf8");
	launcher.stderr?.on("data", (chunk) => {
		launcherStderr += chunk;
	});
	await new Promise((resolve, reject) => {
		function onError(error) {
			launcher.off("close", onClose);
			reject(error);
		}
		function onClose(code) {
			launcher.off("error", onError);
			if (code !== 0) {
				const firstLine = launcherStderr.trim().split(/\r?\n/u)[0];
				const reason = firstLine === void 0 || firstLine === "" ? `browser launcher exited with code ${String(code)}` : firstLine.replace(/^(?:[A-Za-z]*Error):\s*/u, "");
				reject(new Error(reason));
				return;
			}
			if (launcherStderr !== "") process.stderr.write(launcherStderr);
			resolve();
		}
		launcher.once("error", onError);
		launcher.once("close", onClose);
	});
}
/** Test hooks for the built dist and native browser handoff; production never mutates them. */
const internals = {
	resolveDistIndex,
	openBrowser
};
/**
* Mount the Web runtime: dist serving, surface prompt, the bash runtime
* variable, the URL line, and the default-browser handoff.
* @param ctx - plugin context carrying the webServer service.
* @param config - validated {@link Config}.
*/
function apply(ctx, config) {
	const runtime = resolveLanTrust(ctx.webServer.host, config.trustedHosts);
	const handoffBrowser = config.openBrowser && !launchedThroughSsh(launchEnvironmentOf(ctx));
	ctx.provide(WEB_RUNTIME_SERVICE, runtime);
	ctx.plugin(FrontendStatic, { distIndex: internals.resolveDistIndex() });
	if (config.surfaceContext) {
		ctx.inject(["systemPrompt"], (promptCtx) => {
			addHarnessSourceSection(promptCtx, SOURCE_ROOT);
			promptCtx.systemPrompt.section({
				name: "app:web-surface",
				order: promptCtx.systemPrompt.getSectionOrder("WEB_SURFACE"),
				text: () => webSurfacePrompt(localWebUrl(promptCtx))
			});
		});
		ctx.inject(["shellEnv"], (runtimeCtx) => {
			runtimeCtx.shellEnv.register({
				name: "web-runtime",
				variables: { [DSH_WEB_URL]: { description: "Canonical local URL of the DeepSeek Harness Web GUI serving this session." } },
				resolve: () => ({ [DSH_WEB_URL]: localWebUrl(runtimeCtx) })
			});
		});
	}
	if (config.printUrl || handoffBrowser) ctx.inject(["connection"], (connectionCtx) => {
		const announceReady = () => {
			if (ANNOUNCED_ROOTS.has(connectionCtx.root)) return;
			const webUrl = localWebUrl(connectionCtx);
			const authenticatedUrl = connectionCtx.connection.authenticatedUrl(webUrl);
			const lanCandidate = runtime.lanAddresses[0];
			const port = connectionCtx.webServer.port;
			const lanUrl = lanCandidate === void 0 ? void 0 : connectionCtx.connection.authenticatedUrl(`http://${lanCandidate}:${String(port)}`);
			ANNOUNCED_ROOTS.add(connectionCtx.root);
			if (config.printUrl) console.log(`dsh web: ${authenticatedUrl}${lanUrl === void 0 ? "" : ` (LAN: ${lanUrl})`}`);
			if (handoffBrowser) {
				console.log("dsh web: opening the default browser; pass --no-open to disable");
				internals.openBrowser(authenticatedUrl).catch((error) => {
					const reason = error instanceof Error ? error.message : String(error);
					console.error(`web-app: could not open the default browser because ${reason}; use the dsh web URL printed at startup`);
				});
			}
		};
		const settled = connectionCtx.get("loader")?.await();
		if (settled === void 0) announceReady();
		else settled.then(() => {
			if (connectionCtx.get("webServer") !== void 0 && connectionCtx.get("connection") !== void 0) announceReady();
		}, () => {});
	});
}
//#endregion
export { Config, apply, inject, internals, name, resolveLanTrust };
