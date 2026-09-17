import { a as prepareProfile, n as PROFILE_ROOT_FILENAME, r as homePatchPath } from "./profile-boot-Dk-7KqJc.js";
import { existsSync } from "node:fs";
import { loadOptionalPatches, loadOverlayPatches, renderConfigDump } from "@deepseek-ai/dsh-app-boot";
import { join, resolve } from "node:path";
//#region lib/types/dump-config.js
/**
* Config-dump entry for `dsh --profile <name> --dump-config`: compose the
* profile's patch layers through the include plugin's patch algorithm without
* booting or evaluating `!!js`, with one source layer per bundle, the
* profile's own patch file, and each `--patch` overlay.
* @module @deepseek-ai/dsh/dump-config
*/
const NAME = "dsh";
/* v8 ignore start -- built-bin acceptance drives this boot-free dispatch */
/**
* Print a profile composition with comments naming each source file and patch layer.
* @param profile - the profile name.
* @param defaultOnly - omit the profile's user layer and `--patch` overlays
* (the recovery diagnostic for a broken `cordis.patch.yml`, which is then
* never parsed).
* @param patches - `--patch` overlay paths, in argv order.
* @param fromDefaultProfile - shipped template used once to initialize a missing profile.
*/
function runDumpConfig(profile, defaultOnly, patches, fromDefaultProfile) {
	const loaded = prepareProfile(profile, !defaultOnly, fromDefaultProfile);
	const layers = loaded.layers.map((layer) => ({
		label: layer.packageName,
		patches: layer.patches
	}));
	if (!defaultOnly) {
		if (existsSync(loaded.patchPath)) layers.push({
			label: loaded.patchPath,
			patches: loaded.patches
		});
		const homePatchFile = homePatchPath();
		const homePatches = loadOptionalPatches(NAME, homePatchFile);
		if (homePatches !== void 0) layers.push({
			label: homePatchFile,
			patches: homePatches
		});
		for (const file of patches) {
			const absolute = resolve(file);
			layers.push({
				label: absolute,
				patches: loadOverlayPatches(NAME, absolute)
			});
		}
	}
	process.stdout.write(renderConfigDump(NAME, join(loaded.dir, PROFILE_ROOT_FILENAME), layers));
}
/* v8 ignore stop */
//#endregion
export { runDumpConfig };
