import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PROFILE_PATCH_FILENAME, PROFILE_TEMPLATES, boot, composeEntries, healProfilesModuleFallback, initProfile, installFailLoud, loadOptionalPatches, loadOverlayPatches, loadProfile, resolveProfileDir, watchUserPatches } from "@deepseek-ai/dsh-app-boot";
import { dirname, join, resolve } from "node:path";
import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";
import { installProxyFromEnvironment } from "@deepseek-ai/dsh-http-proxy";
import { DSH_LAUNCH_ENVIRONMENT_KEY } from "@deepseek-ai/dsh-launch-environment";
import { provideCmdline } from "@deepseek-ai/dsh-cmdline";
//#region lib/types/process-shutdown.js
/** Bounded, escalating process shutdown for the long-lived CLI surfaces. */
/** Maximum grace allowed for the application tree to dispose before process exit. */
const PROCESS_SHUTDOWN_TIMEOUT_MS = 5e3;
/**
* Create one process-exit controller around an application disposer.
* @param dispose - Whole-application teardown that resolves at quiescence.
* @param forceExit - Function that exits the process immediately, replaceable by tests.
* @param complete - Function that records the natural completion code, replaceable by tests.
* @param timeoutMs - Grace before forced exit, replaceable by tests.
* @returns A controller whose normal calls coalesce and whose repeated signal call escalates.
*/
function createProcessShutdown(dispose, forceExit = (code) => {
	process.exit(code);
}, complete = (code) => {
	process.exitCode = code;
}, timeoutMs = PROCESS_SHUTDOWN_TIMEOUT_MS) {
	let pending;
	let timeout;
	let completed = false;
	let forceExited = false;
	const clearExitTimeout = () => {
		/* v8 ignore else -- shutdown() arms the timer before any asynchronous exit path can run. */
		if (timeout !== void 0) clearTimeout(timeout);
	};
	const forceExitOnce = (code) => {
		if (forceExited) return;
		forceExited = true;
		clearExitTimeout();
		forceExit(code);
	};
	const completeOnce = (code) => {
		if (completed || forceExited) return;
		completed = true;
		clearExitTimeout();
		complete(code);
	};
	const start = (code, forceAfterDispose) => {
		if (pending !== void 0) return pending;
		timeout = setTimeout(() => {
			forceExitOnce(code);
		}, timeoutMs);
		pending = Promise.resolve().then(dispose).then(() => {
			if (forceAfterDispose) forceExitOnce(code);
			else completeOnce(code);
		}, () => {
			forceExitOnce(code);
		});
		return pending;
	};
	return {
		shutdown(code) {
			return start(code, false);
		},
		interrupt(code) {
			if (pending !== void 0) {
				forceExitOnce(code);
				return;
			}
			start(code, true);
		}
	};
}
//#endregion
//#region lib/types/profile-boot.js
/**
* Shared profile boot for every `dsh` surface: resolve the profile, stack its
* patch layers (bundle layers in `dsh.profile.bundles` order, the profile's
* own `cordis.patch.yml`, `--patch` overlays, the telemetry switch), mount the
* tree over the profile's empty root config, apply its selected patch-reload
* lifecycle, and wire fail-loud plus bounded shutdown.
*
* App flags are not the launcher's business: the invocation's inner arguments
* are provided to the tree through `ctx.cmdlineArgs`, where any injected app
* plugin may read the same immutable snapshot.
* @module @deepseek-ai/dsh/profile-boot
*/
const NAME = "dsh";
/** Launcher-owned readiness signal committed only after boot and host setup succeed. */
function createAppReady() {
	let ready = false;
	const listeners = /* @__PURE__ */ new Set();
	return {
		service: { onReady(listener) {
			if (ready) {
				listener();
				return () => {};
			}
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		} },
		commit() {
			if (ready) return;
			ready = true;
			for (const listener of [...listeners]) listener();
			listeners.clear();
		}
	};
}
/**
* The home-level user patch layer (`$DSH_HOME/cordis.patch.yml`), applied
* over every profile's own layer. Resolved per call, not at module load:
* `$DSH_HOME` may be set by the test or launcher after import.
* @returns the absolute patch-file path.
*/
function homePatchPath() {
	return join(resolveDshHome(), PROFILE_PATCH_FILENAME);
}
/** Absolute path of this dsh installation's package.json (both anchors: src/ and lib/ sit one level under apps/cli). */
const INSTALL_ANCHOR = fileURLToPath(new URL("../package.json", import.meta.url));
/** The session-telemetry row id the DSH_TELEMETRY_DISABLED switch targets. */
const TELEMETRY_ROW_ID = "session-telemetry-otel";
/** The empty root entry list every profile tree patches over. */
const PROFILE_ROOT_CONFIG = `# dsh profile root — an empty entry list. The tree is composed as patches:
# each bundle in package.json's dsh.profile.bundles, then cordis.patch.yml, then any
# --patch overlays. Edit cordis.patch.yml, not this file.
[]
`;
/** Root config filename inside a profile directory. */
const PROFILE_ROOT_FILENAME = "cordis.yml";
/**
* Initialize a missing profile from one shipped template. This copies only
* the template's bundle list and patch-reload policy; local state from the
* same-named shipped profile is not read, and no inheritance metadata is
* persisted. Shipped profile names are reserved, and the target directory is
* claimed exclusively so existing or concurrent state is never reused.
* @param name - the new profile name.
* @param fromDefaultProfile - shipped profile template to copy.
* @param home - Harness home containing the profile directory.
* @throws when the template is unknown, the target name is shipped, or the target directory exists.
*/
function initializeProfileFromDefault(name, fromDefaultProfile, home = resolveDshHome()) {
	const dir = resolveProfileDir(name, home);
	const template = Object.hasOwn(PROFILE_TEMPLATES, fromDefaultProfile) ? PROFILE_TEMPLATES[fromDefaultProfile] : void 0;
	if (template === void 0) {
		const expected = Object.keys(PROFILE_TEMPLATES).sort().map((value) => JSON.stringify(value)).join(", ");
		throw new Error(`${NAME}: unknown default profile ${JSON.stringify(fromDefaultProfile)}; expected one of ${expected}`);
	}
	if (Object.hasOwn(PROFILE_TEMPLATES, name)) throw new Error(`${NAME}: profile ${JSON.stringify(name)} is shipped and cannot be a custom profile target; omit --from-default-profile to use it`);
	mkdirSync(dirname(dir), { recursive: true });
	try {
		mkdirSync(dir);
	} catch (error) {
		if (error.code !== "EEXIST") throw error;
		const manifestPath = join(dir, "package.json");
		if (existsSync(manifestPath)) throw new Error(`${NAME}: profile ${JSON.stringify(name)} already exists at ${manifestPath}; omit --from-default-profile to use it`);
		throw new Error(`${NAME}: profile directory ${dir} already exists; choose an unused profile name`);
	}
	try {
		initProfile(dir, template.bundles, template.patchReload);
	} catch (error) {
		try {
			rmSync(dir, {
				recursive: true,
				force: true
			});
		} catch (cleanupError) {
			throw new AggregateError([error, cleanupError], `${NAME}: profile initialization failed and ${dir} could not be removed`);
		}
		throw error;
	}
}
/**
* Resolve the telemetry opt-out switch into its boot patch. ANY non-empty
* value (including `'0'`/`'false'`) disables: a privacy switch prefers
* off-by-mistake over on-by-mistake. A composition without the telemetry row
* exports nothing, so the switch is then trivially satisfied and no patch is
* generated — custom profiles need not mount telemetry to run with the
* switch set.
* @param disabledEnv - the raw `DSH_TELEMETRY_DISABLED` value (`undefined` when unset).
* @param hasRow - whether the composition carries the telemetry row.
* @returns the disable patch, or `undefined` when no hard-disable patch is required.
*/
function resolveTelemetryPatch(disabledEnv, hasRow) {
	if ((disabledEnv ?? "") === "" || !hasRow) return void 0;
	return {
		id: TELEMETRY_ROW_ID,
		disabled: true
	};
}
/**
* Load a resolved profile for `name` and (re)write the empty root config. The
* root is always rewritten: the whole composition is patch layers, and the
* vendored Loader's tree write-back (a plugin self-disposing persists the
* current tree) can bake composed rows into this file — which would duplicate
* every bundle insert on the next boot. The file exists on disk only because
* the Loader needs a real include root to anchor `baseUrl` at the profile
* directory (the config dump anchors on the same file, so both compose over
* the identical base).
* @param name - the profile name.
* @param userLayer - `false` skips parsing `cordis.patch.yml` (the default dump).
* @param fromDefaultProfile - shipped template used once to initialize a missing profile.
* @returns the loaded profile.
* @throws when explicit initialization names an unknown template or an existing profile.
*/
function prepareProfile(name, userLayer = true, fromDefaultProfile) {
	if (fromDefaultProfile !== void 0) initializeProfileFromDefault(name, fromDefaultProfile);
	const profile = loadProfile(NAME, name, INSTALL_ANCHOR, void 0, { userLayer });
	writeFileSync(join(profile.dir, PROFILE_ROOT_FILENAME), PROFILE_ROOT_CONFIG);
	return profile;
}
/** The full patch stack of one composed profile, in application order. */
function allPatches(composed) {
	return [
		...composed.bundlePatches,
		...composed.profile.patches,
		...composed.homePatches,
		...composed.overlays
	];
}
/**
* Load `name` and compose its effective patch stack: bundle layers in
* `dsh.profile.bundles` order (a base-backed profile gets the base bundle's
* platform-gated shell rows), the profile's user layer, the home-level user
* layer (`$DSH_HOME/cordis.patch.yml` — machine-local preferences that apply
* to every profile, so it outranks the per-profile layer), `--patch` overlays,
* then the telemetry switch.
* @param name - the profile name.
* @param patchFiles - `--patch` overlay paths, in argv order.
* @returns the profile and its patch layers.
*/
async function composeProfile(name, patchFiles, fromDefaultProfile) {
	const profile = prepareProfile(name, true, fromDefaultProfile);
	await healProfilesModuleFallback({
		installAnchor: INSTALL_ANCHOR,
		profile
	});
	const homePatches = loadOptionalPatches(NAME, homePatchPath()) ?? [];
	const overlays = patchFiles.flatMap((file) => loadOverlayPatches(NAME, resolve(file)));
	const bundlePatches = profile.layers.flatMap((layer) => layer.patches);
	const rows = /* @__PURE__ */ new Map();
	for (const row of composeEntries([
		bundlePatches,
		profile.patches,
		homePatches,
		overlays
	])) if (typeof row.id === "string") rows.set(row.id, row);
	const composedOverlays = [...overlays];
	const telemetryPatch = resolveTelemetryPatch(process.env.DSH_TELEMETRY_DISABLED, rows.has(TELEMETRY_ROW_ID));
	if (telemetryPatch !== void 0) composedOverlays.push(telemetryPatch);
	return {
		profile,
		bundlePatches,
		homePatches,
		overlays: composedOverlays
	};
}
/**
* Re-throw a watcher-setup failure unless a shutdown already owns the tree:
* a signal aborted this invocation, or an app requested exit (`ctx.appExit`
* from a fast one-shot) and the root's disposal rejected the in-flight setup
* await. Either way the failure describes a tree that is exiting as asked,
* not a broken watch.
* @param ctx - the booted root context.
* @param signal - this invocation's signal-shutdown fact.
* @param error - the setup failure.
*/
function suppressShutdownError(ctx, signal, error) {
	if (signal.aborted) return;
	if (ctx.fiber.state !== 2 || ctx.get("loader") === void 0) return;
	throw error;
}
/**
* Boot one profile invocation end to end and leave process lifetime to the
* mounted plugins (or to a one-shot runner the composition mounts).
* @param options - environment snapshot, profile name, overlays, and the booted app's own arguments.
* @returns the settled root context and the shutdown controller.
*/
async function runProfile(options) {
	const disposeProxy = await installProxyFromEnvironment(options.environment, (message) => {
		process.stderr.write(`${NAME}: ${message}\n`);
	});
	const composed = await composeProfile(options.profile, options.patchFiles, options.fromDefaultProfile);
	const app = {};
	const appReady = createAppReady();
	const shutdown = createProcessShutdown(async () => {
		await app.current?.fiber.dispose();
		await disposeProxy();
	});
	const signalShutdown = new AbortController();
	const interrupt = (code) => {
		signalShutdown.abort();
		shutdown.interrupt(code);
	};
	process.on("SIGTERM", () => {
		interrupt(0);
	});
	process.on("SIGINT", () => {
		interrupt(130);
	});
	installFailLoud(NAME, process, async () => {
		await app.current?.fiber.dispose();
	});
	const rootConfig = join(composed.profile.dir, PROFILE_ROOT_FILENAME);
	const composeLive = () => structuredClone([
		...composed.bundlePatches,
		...loadOptionalPatches(NAME, composed.profile.patchPath) ?? [],
		...loadOptionalPatches(NAME, homePatchPath()) ?? [],
		...composed.overlays
	]);
	const ctx = await boot(NAME, rootConfig, structuredClone(allPatches(composed)), (hostCtx) => {
		app.current = hostCtx;
		hostCtx.provide(DSH_LAUNCH_ENVIRONMENT_KEY, options.environment);
		provideCmdline(hostCtx, {
			args: options.args,
			exit: (code) => void shutdown.shutdown(code),
			ready: appReady.service
		});
	});
	app.current = ctx;
	if (composed.profile.patchReload === "live" && !signalShutdown.signal.aborted && ctx.fiber.state === 2 && ctx.get("loader") !== void 0) try {
		if (ctx.get("hmr") === void 0) {
			if (ctx.get("timer") === void 0) await ctx.loader.create({ name: "@deepseek-ai/cordis-plugin-timer" });
			await ctx.loader.create({
				name: "@deepseek-ai/cordis-plugin-hmr",
				config: { root: [] }
			});
		}
		await watchUserPatches(ctx, {
			binName: NAME,
			filename: composed.profile.patchPath,
			compose: composeLive
		});
		await watchUserPatches(ctx, {
			binName: NAME,
			filename: homePatchPath(),
			compose: composeLive
		});
	} catch (error) {
		suppressShutdownError(ctx, signalShutdown.signal, error);
	}
	if (!signalShutdown.signal.aborted && ctx.fiber.state === 2 && ctx.get("loader") !== void 0) appReady.commit();
	return {
		ctx,
		shutdown
	};
}
//#endregion
export { prepareProfile as a, initializeProfileFromDefault as i, PROFILE_ROOT_FILENAME as n, resolveTelemetryPatch as o, homePatchPath as r, runProfile as s, INSTALL_ANCHOR as t };
