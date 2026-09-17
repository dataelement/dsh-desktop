var __rewriteRelativeImportExtension = (this && this.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
/**
 * Loads an OAuth flow module through a variable specifier so bundlers cannot
 * follow the import into Node-only flow code (`node:http` callback servers,
 * `node:crypto` PKCE). The `.ts`/`.js` rewrite keeps the trick working from
 * both source and built output.
 */
const importOAuthModule = (specifier) => {
    const runtimeSpecifier = import.meta.url.endsWith(".js") ? specifier.replace(/\.ts$/, ".js") : specifier;
    return import(__rewriteRelativeImportExtension(runtimeSpecifier));
};
let bundledLoaders;
/** Registers statically bundled OAuth flows for standalone Bun binaries. */
export function registerBundledOAuthFlowLoaders(loaders) {
    bundledLoaders = loaders;
}
export const loadAnthropicOAuth = async () => {
    if (bundledLoaders)
        return bundledLoaders.anthropic();
    return (await importOAuthModule("./anthropic.ts")).anthropicOAuth;
};
export const loadOpenAICodexOAuth = async () => {
    if (bundledLoaders)
        return bundledLoaders.openaiCodex();
    return (await importOAuthModule("./openai-codex.ts")).openaiCodexOAuth;
};
export const loadGitHubCopilotOAuth = async () => {
    if (bundledLoaders)
        return bundledLoaders.githubCopilot();
    return (await importOAuthModule("./github-copilot.ts")).githubCopilotOAuth;
};
export const loadOpenRouterOAuth = async () => {
    if (bundledLoaders)
        return bundledLoaders.openrouter();
    return (await importOAuthModule("./openrouter.ts")).openRouterOAuth;
};
export const loadKimiCodingOAuth = async () => {
    if (bundledLoaders)
        return bundledLoaders.kimiCoding();
    return (await importOAuthModule("./kimi-coding.ts")).kimiCodingOAuth;
};
export const loadXaiOAuth = async () => {
    if (bundledLoaders)
        return bundledLoaders.xai();
    return (await importOAuthModule("./xai.ts")).xaiOAuth;
};
export const loadRadiusOAuth = async (options) => {
    if (bundledLoaders)
        return bundledLoaders.radius(options);
    return (await importOAuthModule("./radius.ts")).createRadiusOAuth(options);
};
//# sourceMappingURL=load.js.map