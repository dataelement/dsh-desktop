import { t as INSTALL_ANCHOR } from "./profile-boot-Dk-7KqJc.js";
import { existsSync } from "node:fs";
import { DEFAULT_PROFILE_BUNDLES, PROFILE_TEMPLATES, initProfile, readProfileManifest, resolveBundleDir, resolveProfileDir, writeProfileManifest } from "@deepseek-ai/dsh-app-boot";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
//#region lib/types/plugin.js
/**
* `dsh plugin --profile <name> <args...>` — profile plugin management as a
* thin pnpm forwarder: initialize the profile on first use, run
* `pnpm <args...>` in the profile directory, then reconcile the
* `dsh.profile.bundles` layer list against the installed state (a dependency
* resolving to a package that declares `dsh.bundle` joins the layer stack; a
* removed or bundle-less dependency leaves it). Reconciling by installed
* state, not by dependency diff, means `update` activates a package that
* gained its `dsh.bundle` declaration in a newer version.
* @module @deepseek-ai/dsh/plugin
*/
const NAME = "dsh";
/**
* Whether a resolved dependency exports a profile patch, i.e. is a bundle.
* @param packageName - the dependency's package name.
* @param profileDir - the profile directory (resolution anchor).
* @returns true when the package manifest declares `dsh.bundle`.
*/
function exportsPatch(packageName, profileDir) {
	let dir;
	try {
		dir = resolveBundleDir(NAME, packageName, INSTALL_ANCHOR, profileDir);
	} catch {
		return false;
	}
	return readProfileManifest(NAME, dir).dsh?.bundle?.patch !== void 0;
}
/**
* Reconcile `dsh.profile.bundles` against the installed state: pnpm has
* already written the real installed names (so a git/path/tarball/alias spec
* on the command line reconciles by its true package name) and materialized
* the packages. A dependency that resolves to a `dsh.bundle`-declaring
* package joins the layer stack (appended in dependency order); a
* dependency-listed name that no longer does — removed, or the installed
* version dropped the declaration — leaves it. In-box bundles from the
* profile template are not dependencies and are never touched. Warns once
* per newly-added bundle-less dependency (a plain library is fine; the
* warning is orientation).
*/
function reconcilePlugins(before, profileDir) {
	const after = readProfileManifest(NAME, profileDir);
	const beforeDeps = new Set(Object.keys(before.dependencies ?? {}));
	const dependencies = Object.keys(after.dependencies ?? {});
	const plugins = after.dsh?.profile?.bundles ?? [];
	let changed = false;
	for (const packageName of dependencies) {
		const isBundle = exportsPatch(packageName, profileDir);
		if (isBundle && !plugins.includes(packageName)) {
			plugins.push(packageName);
			changed = true;
		} else if (!isBundle && !beforeDeps.has(packageName)) process.stderr.write(`${NAME}: warning: ${packageName} declares no dsh.bundle — installed as a plain dependency, not a profile layer (a later update that gains one activates it automatically)
`);
	}
	const dependencySet = new Set(dependencies);
	for (const packageName of [...plugins]) {
		const wasDependency = beforeDeps.has(packageName) || dependencySet.has(packageName);
		const stillBundle = dependencySet.has(packageName) && exportsPatch(packageName, profileDir);
		if (wasDependency && !stillBundle) {
			plugins.splice(plugins.indexOf(packageName), 1);
			changed = true;
		}
	}
	if (!changed) return;
	after.dsh = {
		...after.dsh,
		profile: {
			...after.dsh?.profile,
			bundles: plugins
		}
	};
	writeProfileManifest(profileDir, after);
}
/**
* Rewrite relative filesystem specs against the user's invoking directory.
* pnpm runs with cwd = the profile directory, so a bare `.` or `../plugin`
* (or their `file:`/`link:` forms) would silently resolve inside the profile
* — `add .` from a plugin checkout would self-link the profile. Absolute
* specs, registry names, and every other pnpm argument pass through
* untouched.
* @param argument - one pnpm argument, verbatim from argv.
* @param cwd - the directory `dsh` was invoked from.
* @returns the argument with a relative path spec anchored to `cwd`.
*/
function anchorPathSpec(argument, cwd) {
	const match = /^(?<prefix>(?:file|link):)?(?<path>\.{1,2}(?:[/\\].*)?)$/.exec(argument);
	if (match?.groups?.path === void 0) return argument;
	return `${match.groups.prefix ?? ""}${resolve(cwd, match.groups.path)}`;
}
/**
* Run one `dsh plugin` invocation: init if needed, forward to pnpm, reconcile.
* @param profile - the profile name.
* @param args - pnpm arguments with relative path specs anchored to the invoking directory.
* @returns the pnpm exit code.
*/
function runPlugin(profile, args) {
	const dir = resolveProfileDir(profile);
	if (!existsSync(join(dir, "package.json"))) {
		const template = PROFILE_TEMPLATES[profile];
		initProfile(dir, template?.bundles ?? DEFAULT_PROFILE_BUNDLES, template?.patchReload);
		process.stderr.write(`${NAME}: initialized profile ${profile} at ${dir}\n`);
	}
	const before = readProfileManifest(NAME, dir);
	const result = spawnSync("pnpm", args.map((argument) => anchorPathSpec(argument, process.cwd())), {
		cwd: dir,
		stdio: "inherit",
		shell: process.platform === "win32"
	});
	if (result.error !== void 0) {
		if (result.error.code === "ENOENT") {
			process.stderr.write(`${NAME}: pnpm not found on PATH — install pnpm to manage profile plugins\n`);
			return 127;
		}
		throw result.error;
	}
	const exitCode = result.status ?? 1;
	if (exitCode === 0) reconcilePlugins(before, dir);
	else {
		process.stderr.write(`${NAME}: pnpm failed in profile directory ${dir}\n`);
		if (args.some((argument) => /^git\+|^github:|\.git(?:#|$)/.test(argument))) process.stderr.write(`${NAME}: git-hosted plugins build on install via their prepare script, which pnpm blocks until allowed — add the exact key pnpm printed above under allowBuilds in ${join(dir, "pnpm-workspace.yaml")}, then re-run\n`);
	}
	return exitCode;
}
//#endregion
export { runPlugin };
