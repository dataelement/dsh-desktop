var __rewriteRelativeImportExtension = (this && this.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
import { lazyApi } from "./lazy.js";
/**
 * Loads the bedrock implementation through a variable specifier so bundlers
 * (browser smoke, Bun compile) cannot follow the import into the Node-only
 * AWS SDK. The `.ts`/`.js` rewrite keeps the trick working from both source
 * and built output.
 */
const importNodeOnlyApi = (specifier) => {
    const runtimeSpecifier = import.meta.url.endsWith(".js") ? specifier.replace(/\.ts$/, ".js") : specifier;
    return import(__rewriteRelativeImportExtension(runtimeSpecifier));
};
let bedrockModuleOverride;
/**
 * Overrides the dynamically imported bedrock implementation. Used by the Bun
 * binary build, where the variable-specifier import cannot be bundled; the
 * build registers a statically imported module instead.
 */
export function setBedrockProviderModule(module) {
    bedrockModuleOverride = module;
}
export const bedrockConverseStreamApi = () => lazyApi(async () => bedrockModuleOverride ?? (await importNodeOnlyApi("./bedrock-converse-stream.ts")));
//# sourceMappingURL=bedrock-converse-stream.lazy.js.map