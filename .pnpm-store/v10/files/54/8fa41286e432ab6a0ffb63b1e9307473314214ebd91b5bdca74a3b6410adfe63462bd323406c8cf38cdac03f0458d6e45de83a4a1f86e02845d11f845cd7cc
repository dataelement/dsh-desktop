import type { OAuthCredential } from "../auth/types.ts";
import type { Model, ThinkingLevelMap } from "../types.ts";
export declare const DEFAULT_RADIUS_GATEWAY = "https://radius.pi.dev";
export type RadiusGatewayModel = {
    id: string;
    name: string;
    reasoning: boolean;
    thinkingLevelMap?: ThinkingLevelMap;
    input: ("text" | "image")[];
    cost: Model<"pi-messages">["cost"];
    contextWindow: number;
    maxTokens: number;
};
export type RadiusGatewayConfig = {
    baseUrl: string;
    models: RadiusGatewayModel[];
};
export type RadiusOAuthCredential = OAuthCredential & {
    gatewayConfig?: RadiusGatewayConfig;
};
export declare function normalizeRadiusGatewayUrl(value: string): string;
export declare function getRadiusCredentialConfig(credential: OAuthCredential | undefined): RadiusGatewayConfig | undefined;
export declare function getRadiusModelsFromConfig(providerId: string, config: RadiusGatewayConfig): Model<"pi-messages">[];
export declare function getRadiusModels(providerId: string, credential: OAuthCredential | undefined): Model<"pi-messages">[];
export declare function loadRadiusGatewayConfig(gateway: string, apiKey?: string, signal?: AbortSignal): Promise<RadiusGatewayConfig>;
//# sourceMappingURL=radius-config.d.ts.map