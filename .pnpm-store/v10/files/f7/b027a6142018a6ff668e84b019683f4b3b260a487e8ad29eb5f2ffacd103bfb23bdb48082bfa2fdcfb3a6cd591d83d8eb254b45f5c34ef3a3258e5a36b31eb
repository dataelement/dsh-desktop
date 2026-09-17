import { IMAGE_MODELS } from "./image-models.generated.js";
const imageModelRegistry = new Map();
for (const [provider, models] of Object.entries(IMAGE_MODELS)) {
    const providerModels = new Map();
    for (const [id, model] of Object.entries(models)) {
        providerModels.set(id, model);
    }
    imageModelRegistry.set(provider, providerModels);
}
export function getImageModel(provider, modelId) {
    const providerModels = imageModelRegistry.get(provider);
    return providerModels?.get(modelId);
}
export function getImageProviders() {
    return Array.from(imageModelRegistry.keys());
}
export function getImageModels(provider) {
    const models = imageModelRegistry.get(provider);
    return models
        ? Array.from(models.values())
        : [];
}
//# sourceMappingURL=image-models.js.map