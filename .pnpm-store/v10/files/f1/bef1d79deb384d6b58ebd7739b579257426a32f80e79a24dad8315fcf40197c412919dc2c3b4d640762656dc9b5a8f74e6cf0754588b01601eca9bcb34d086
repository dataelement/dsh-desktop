import type { SimpleStreamOptions, StreamFunction, StreamOptions } from "../types.ts";
import type { GoogleApiThinkingLevel } from "./google-shared.ts";
export interface GoogleOptions extends StreamOptions {
    toolChoice?: "auto" | "none" | "any";
    thinking?: {
        enabled: boolean;
        budgetTokens?: number;
        level?: GoogleApiThinkingLevel;
    };
}
export declare const stream: StreamFunction<"google-generative-ai", GoogleOptions>;
export declare const streamSimple: StreamFunction<"google-generative-ai", SimpleStreamOptions>;
//# sourceMappingURL=google-generative-ai.d.ts.map