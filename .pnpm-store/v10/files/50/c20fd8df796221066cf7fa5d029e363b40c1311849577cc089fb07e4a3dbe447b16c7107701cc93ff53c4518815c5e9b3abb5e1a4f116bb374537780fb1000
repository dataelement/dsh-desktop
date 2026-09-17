import { IMAGE_MODELS } from "./image-models.generated.ts";
import type { ImagesApi, ImagesModel, KnownImagesProvider } from "./types.ts";
type ImageModelApi<TProvider extends KnownImagesProvider, TModelId extends keyof (typeof IMAGE_MODELS)[TProvider]> = (typeof IMAGE_MODELS)[TProvider][TModelId] extends {
    api: infer TApi;
} ? TApi extends ImagesApi ? TApi : never : never;
export declare function getImageModel<TProvider extends KnownImagesProvider, TModelId extends keyof (typeof IMAGE_MODELS)[TProvider]>(provider: TProvider, modelId: TModelId): ImagesModel<ImageModelApi<TProvider, TModelId>>;
export declare function getImageProviders(): KnownImagesProvider[];
export declare function getImageModels<TProvider extends KnownImagesProvider>(provider: TProvider): ImagesModel<ImageModelApi<TProvider, keyof (typeof IMAGE_MODELS)[TProvider]>>[];
export {};
//# sourceMappingURL=image-models.d.ts.map