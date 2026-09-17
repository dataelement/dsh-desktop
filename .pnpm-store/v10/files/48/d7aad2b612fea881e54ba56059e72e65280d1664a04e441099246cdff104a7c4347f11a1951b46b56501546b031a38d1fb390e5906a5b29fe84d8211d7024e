import { type ImagesProvider, type MutableImagesModels } from "../images-models.ts";
import { MODELS } from "../models.generated.ts";
import { type CreateModelsOptions, type MutableModels, type Provider } from "../models.ts";
import type { Api, Model } from "../types.ts";
import { radiusProvider } from "./radius.ts";
export { radiusProvider };
/** Providers present in the generated catalog. `KnownProvider` additionally
 * includes purely dynamic providers (e.g. "radius") that have no static
 * catalog entry. */
export type BuiltinProvider = keyof typeof MODELS;
type BuiltinModelApi<TProvider extends BuiltinProvider, TModelId extends keyof (typeof MODELS)[TProvider]> = (typeof MODELS)[TProvider][TModelId] extends {
    api: infer TApi;
} ? (TApi extends Api ? TApi : never) : never;
/** Typed read of the generated built-in catalog. */
export declare function getBuiltinModel<TProvider extends BuiltinProvider, TModelId extends keyof (typeof MODELS)[TProvider]>(provider: TProvider, modelId: TModelId): Model<BuiltinModelApi<TProvider, TModelId>>;
export declare function getBuiltinProviders(): BuiltinProvider[];
/** Generation timestamp shared by all built-in provider catalogs. */
export declare function getBuiltinModelDataGeneratedAt(): number | undefined;
export declare function getBuiltinModels<TProvider extends BuiltinProvider>(provider: TProvider): Model<BuiltinModelApi<TProvider, keyof (typeof MODELS)[TProvider]>>[];
/** All built-in providers, freshly constructed. */
export declare function builtinProviders(): Provider[];
/** A `Models` collection with every built-in provider registered. */
export declare function builtinModels(options?: CreateModelsOptions): MutableModels;
/** All built-in image-generation providers, freshly constructed. */
export declare function builtinImagesProviders(): ImagesProvider[];
/** An `ImagesModels` collection with every built-in image-generation provider registered. */
export declare function builtinImagesModels(options?: CreateModelsOptions): MutableImagesModels;
//# sourceMappingURL=all.d.ts.map