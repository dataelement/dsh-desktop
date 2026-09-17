import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, parse } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import z from "@deepseek-ai/schemastery";
import { brandString } from "@deepseek-ai/dsh-brand";
//#region lib/types/index.js
/**
* Active Loader-backed plugin package inventory for official DeepSeek requests.
* Host entries and the requesting agent's standing preset are resolved at request time;
* installed dependencies and plugin fibers without Loader package provenance are excluded.
* @module @deepseek-ai/dsh-plugin-package-inventory-deepseek
*/
/** Cordis plugin name. */
const name = "plugin-package-inventory-deepseek";
/** Services required to locate host/requesting-agent entries and contribute the field. */
const inject = [
	"agents",
	"deepseekLlmApiExtensions",
	"loader"
];
/** Validated plugin-package request contribution configuration. */
const Config = z.object({ enabled: z.boolean().default(true) });
/** Parse a bare package or package-subpath specifier into its package name. */
function barePackageName(specifier) {
	if (specifier.startsWith(".") || specifier.includes(":") || isAbsolute(specifier)) return void 0;
	const [first = "", second = ""] = specifier.split("/");
	return first.startsWith("@") ? `${first}/${second}` : first;
}
/** Read one manifest identity, optionally treating an absent name as a loose-module marker. */
function identityFromManifest(path, allowAnonymous) {
	const manifest = JSON.parse(readFileSync(path, "utf8"));
	if (allowAnonymous && manifest.name === void 0) return void 0;
	if (typeof manifest.name !== "string" || manifest.name.length === 0 || typeof manifest.version !== "string" || manifest.version.length === 0) throw new Error(`plugin-package-inventory-deepseek: ${path} must declare non-empty name and version`);
	return {
		name: manifest.name,
		version: manifest.version
	};
}
/** Resolve a bare package without requiring it to export `./package.json`. */
function barePackageManifest(packageName, anchors) {
	for (const anchor of anchors) {
		const searchPaths = createRequire(anchor).resolve.paths(packageName);
		/* v8 ignore next -- active non-builtin package entries always have Node package search paths */
		if (searchPaths === null) continue;
		for (const searchPath of searchPaths) {
			const manifest = join(searchPath, packageName, "package.json");
			if (existsSync(manifest)) return manifest;
		}
	}
}
/** Find the nearest owning manifest for a relative or absolute plugin module. */
function nearestManifest(modulePath) {
	let current = dirname(modulePath);
	const root = parse(current).root;
	while (true) {
		const manifest = join(current, "package.json");
		if (existsSync(manifest)) return manifest;
		if (current === root) return void 0;
		current = dirname(current);
	}
}
/** Exact package identity resolver with immutable per-process manifest caching. */
var PackageIdentityResolver = class {
	hostBaseUrl;
	cache = /* @__PURE__ */ new Map();
	constructor(hostBaseUrl) {
		this.hostBaseUrl = hostBaseUrl;
	}
	/** Resolve one Loader entry's owning package, or absence for a non-package loose module. */
	resolve({ entry, bareBaseUrl }) {
		/* v8 ignore next -- Loader entry trees inherit a base URL; the fallback supports direct embedders. */
		const treeBase = entry.parent.tree.ctx.baseUrl ?? this.hostBaseUrl;
		const anchors = [...new Set([
			bareBaseUrl ?? treeBase,
			treeBase,
			this.hostBaseUrl,
			import.meta.url
		])];
		const key = `${anchors.join("\0")}\u0000${entry.options.name}`;
		if (this.cache.has(key)) return this.cache.get(key);
		const packageName = barePackageName(entry.options.name);
		let manifest;
		if (packageName !== void 0) {
			manifest = barePackageManifest(packageName, anchors);
			if (manifest === void 0) throw new Error(`plugin-package-inventory-deepseek: cannot resolve active package ${JSON.stringify(packageName)}`);
		} else if (!entry.options.name.startsWith("cordis:")) {
			const moduleUrl = isAbsolute(entry.options.name) ? pathToFileURL(entry.options.name) : new URL(entry.options.name, treeBase);
			if (moduleUrl.protocol === "file:") manifest = nearestManifest(fileURLToPath(moduleUrl));
		}
		const identity = manifest === void 0 ? void 0 : identityFromManifest(manifest, packageName === void 0);
		this.cache.set(key, identity);
		return identity;
	}
};
/** Yield active, non-structural entries from one Loader tree. */
function activeEntries(tree, rootBareBaseUrl) {
	return [...tree.entries()].filter((entry) => !entry.options.group && !entry.disabled && entry.fiber?.state === 2).map((entry) => ({
		entry,
		...entry.parent.tree === tree && rootBareBaseUrl !== void 0 ? { bareBaseUrl: rootBareBaseUrl } : {}
	}));
}
/** Deterministic text order independent of the host's ICU data and locale. */
function compareWireText(left, right) {
	return left < right ? -1 : left > right ? 1 : 0;
}
/** Collect the full active package set for one request. */
async function collectActivePluginPackages(ctx, resolver, hostBaseUrl, sessionId) {
	const entries = activeEntries(ctx.loader);
	if (sessionId !== void 0 && ctx.get("agentPresets") !== void 0) {
		const agent = ctx.agents.get(brandString(sessionId));
		if (agent !== void 0) {
			const { standingMountFor } = await import("@deepseek-ai/dsh-agent-presets");
			const presetTree = standingMountFor(agent.ctx)?.tree;
			if (presetTree !== void 0) entries.push(...activeEntries(presetTree, hostBaseUrl));
		}
	}
	const unique = /* @__PURE__ */ new Map();
	for (const activeEntry of entries) {
		const identity = resolver.resolve(activeEntry);
		if (identity === void 0) continue;
		unique.set(`${identity.name}\u0000${identity.version}`, identity);
	}
	return [...unique.values()].sort((left, right) => compareWireText(left.name, right.name) || compareWireText(left.version, right.version));
}
/**
* Register the complete `dsh_plugin_packages` request contribution when enabled.
* @param ctx - plugin context carrying Loader provenance and the DeepSeek request-extension registry.
* @param config - validated default-on configuration.
*/
function apply(ctx, config) {
	if (config.enabled === false) return;
	const hostBaseUrl = ctx.baseUrl ?? import.meta.url;
	const resolver = new PackageIdentityResolver(hostBaseUrl);
	ctx.deepseekLlmApiExtensions.register("dsh_plugin_packages", { prepare: async (request) => {
		return { value: {
			version: 1,
			packages: await collectActivePluginPackages(ctx, resolver, hostBaseUrl, request.sessionId)
		} };
	} });
}
//#endregion
export { Config, apply, inject, name };
