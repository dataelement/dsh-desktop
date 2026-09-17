import type { AssistantImages, ImagesApi, ImagesContext, ImagesFunction, ImagesModel, ImagesOptions } from "./types.ts";
export type ImagesApiFunction = (model: ImagesModel<ImagesApi>, context: ImagesContext, options?: ImagesOptions) => Promise<AssistantImages>;
export interface ImagesApiProvider<TApi extends ImagesApi = ImagesApi, TOptions extends ImagesOptions = ImagesOptions> {
    api: TApi;
    generateImages: ImagesFunction<TApi, TOptions>;
}
interface ImagesApiProviderInternal {
    api: ImagesApi;
    generateImages: ImagesApiFunction;
}
export declare function registerImagesApiProvider<TApi extends ImagesApi, TOptions extends ImagesOptions>(provider: ImagesApiProvider<TApi, TOptions>, sourceId?: string): void;
export declare function getImagesApiProvider(api: ImagesApi): ImagesApiProviderInternal | undefined;
export {};
//# sourceMappingURL=images-api-registry.d.ts.map