import { registerImagesApiProvider } from "../../images-api-registry.js";
let openRouterImagesProviderModulePromise;
function createLazyLoadErrorImages(model, error) {
    return {
        api: model.api,
        provider: model.provider,
        model: model.id,
        output: [],
        stopReason: "error",
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
    };
}
function loadOpenRouterImagesProviderModule() {
    openRouterImagesProviderModulePromise ||= import("../../api/openrouter-images.js").then((module) => module);
    return openRouterImagesProviderModulePromise;
}
export const generateImagesOpenRouter = async (model, context, options) => {
    try {
        const module = await loadOpenRouterImagesProviderModule();
        return await module.generateImages(model, context, options);
    }
    catch (error) {
        return createLazyLoadErrorImages(model, error);
    }
};
export function registerBuiltInImagesApiProviders() {
    registerImagesApiProvider({
        api: "openrouter-images",
        generateImages: generateImagesOpenRouter,
    });
}
registerBuiltInImagesApiProviders();
//# sourceMappingURL=register-builtins.js.map