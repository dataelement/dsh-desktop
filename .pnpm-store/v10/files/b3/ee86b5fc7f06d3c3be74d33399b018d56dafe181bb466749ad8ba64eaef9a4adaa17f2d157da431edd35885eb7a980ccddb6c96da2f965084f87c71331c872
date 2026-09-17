import { launchEnvironmentOf, launchedThroughSsh } from "@deepseek-ai/dsh-launch-environment";
import { accessSync, constants } from "node:fs";
import { delimiter, join } from "node:path";
//#region lib/types/probe.js
/**
* PATH probe for the native backend's Linux chooser binaries: one boot-time
* sampled fact for the resolver, so an attended Linux host without
* zenity/kdialog keeps the working `browse` interaction instead of a backend
* whose every pick fails.
* @module @deepseek-ai/dsh-host-directory-picker-auto/probe
*/
/** The chooser binaries the native backend can drive on Linux (zenity, KDialog fallback). */
const LINUX_CHOOSER_BINARIES = ["zenity", "kdialog"];
/**
* Whether the current process may execute the candidate path.
* @param candidate - absolute or PATH-joined file path.
* @returns true only for an existing executable file.
*/
function canExecute(candidate) {
	try {
		accessSync(candidate, constants.X_OK);
	} catch {
		return false;
	}
	return true;
}
/**
* Scan a PATH value for one of the native backend's Linux chooser binaries.
* @param pathValue - the `PATH` environment value (absent or empty scans nothing).
* @param isExecutable - executability predicate ({@link canExecute} in production; injected for deterministic tests).
* @returns whether any PATH directory holds an executable chooser binary.
*/
function hasLinuxChooserBinary(pathValue, isExecutable) {
	for (const dir of (pathValue ?? "").split(delimiter)) {
		if (dir === "") continue;
		for (const name of LINUX_CHOOSER_BINARIES) if (isExecutable(join(dir, name))) return true;
	}
	return false;
}
//#endregion
//#region lib/types/resolve.js
/**
* Boot-time backend resolution for the adaptive directory-picker composition:
* one pure decision from sampled host facts to a concrete backend kind. The
* caller samples exactly once per boot, so the mounted capability stays
* stable for the service lifetime as the seam requires.
* @module @deepseek-ai/dsh-host-directory-picker-auto/resolve
*/
/** An env value counts only when set and non-blank (an empty export is "unset" by shell convention). */
const present = (value) => value !== void 0 && value !== "";
/**
* Resolve which backend serves this boot. `native` requires every signal that
* the operator can see the host display and the native backend can serve it:
* a loopback-only bind (an all-interfaces bind admits remote browsers no OS
* chooser can reach), no SSH launch (under SSH port-forwarding the chooser
* would open on the unattended server), and a servable display session —
* assumed on darwin/win32, requiring `DISPLAY`/`WAYLAND_DISPLAY` plus a
* chooser binary on linux, and never true elsewhere (the native backend
* drives exactly darwin/win32/linux). Anything ambiguous resolves to
* `browse`, which works everywhere.
* @param facts - the sampled host facts.
* @returns the backend kind to mount.
*/
function resolveDirectoryPickerBackend(facts) {
	if (facts.bindHost !== "127.0.0.1") return "browse";
	if (facts.ssh) return "browse";
	if (facts.platform === "darwin" || facts.platform === "win32") return "native";
	if (facts.platform !== "linux" || !facts.linuxChooser) return "browse";
	return present(facts.env.DISPLAY) || present(facts.env.WAYLAND_DISPLAY) ? "native" : "browse";
}
//#endregion
//#region lib/types/index.js
/**
* Adaptive chooser of the directory-picker seam: resolves the host's
* situation once at boot (bind host, SSH launch, display session, Linux
* chooser binary) and mounts the matching interaction — `native` or `browse`
* — as real Loader entries in the in-memory root tree. Each interaction is a
* pair: the Host backend serving the seam capability and the client surface
* occupying ui-workspace's directory-flow holes. Both arrive as ordinary
* entries, so the surface is discovered exactly as a config-row's would be
* and one resolved choice still swaps both faces; pinning an interaction
* remains composing that pair directly instead of this row.
* @module @deepseek-ai/dsh-host-directory-picker-auto
*/
/** Cordis plugin name. */
const name = "directory-picker-auto";
/** Required services: the effective bind host (`webServer`) and the entry tree the backend mounts into (`loader`). */
const inject = ["webServer", "loader"];
/**
* Host backend package per resolved kind — fixed composition vocabulary, not a
* tunable. Exported because the reference is a runtime string the static
* config gate cannot see in a yml row: `verify-cordis-config` requires every
* app composing this chooser to declare both values as dependencies.
*/
const BACKEND_PACKAGES = {
	native: "@deepseek-ai/dsh-host-directory-picker-native",
	browse: "@deepseek-ai/dsh-host-directory-picker-browse"
};
/**
* Client surface package per resolved kind, mounted with its backend so one
* resolved interaction still composes both faces. Declared as dependencies by
* every composing app for the same reason as {@link BACKEND_PACKAGES}. Only the
* specifier is referenced here because the packages belong to the Client
* program, so no import of them exists on this side.
*/
const SURFACE_PACKAGES = {
	native: "@deepseek-ai/dsh-client-ui-directory-picker-native",
	browse: "@deepseek-ai/dsh-client-ui-directory-picker-browse"
};
/**
* Resolve the interaction from one boot-time sample and mount its backend and
* surface as Loader entries; the effect's disposer removes both entries and
* joins their fibers' teardown, so unloading this plugin returns only after
* both faces of the mounted interaction (and their dependents) quiesced.
* @param ctx - cordis context carrying the injected `webServer` and `loader`.
*/
async function apply(ctx) {
	const backend = resolveDirectoryPickerBackend({
		bindHost: ctx.webServer.host,
		platform: process.platform,
		ssh: launchedThroughSsh(launchEnvironmentOf(ctx)),
		env: process.env,
		linuxChooser: hasLinuxChooserBinary(process.env.PATH, canExecute)
	});
	await ctx.effect(async () => {
		const ids = [];
		const unmount = async () => {
			for (const id of [...ids].reverse()) {
				if (ctx.loader.store[id] === void 0) continue;
				await ctx.loader.remove(id);
			}
		};
		try {
			for (const name of [BACKEND_PACKAGES[backend], SURFACE_PACKAGES[backend]]) ids.push(await ctx.loader.create({ name }));
		} catch (cause) {
			await unmount();
			throw cause;
		}
		return unmount;
	}, "directory-picker-auto: interaction entries");
}
//#endregion
export { BACKEND_PACKAGES, SURFACE_PACKAGES, apply, canExecute, hasLinuxChooserBinary, inject, name, resolveDirectoryPickerBackend };
