import type { Tool } from "../types.ts";
/** Convert a tool schema to the strict subset expected by provider constrained sampling. */
export declare function makeStrictJsonSchema(schema: Tool["parameters"]): Record<string, unknown>;
export declare function getJsonSchemaToolParameters(tool: Tool, strict: boolean | undefined): Tool["parameters"];
export interface GrammarConstrainedSampling {
    format: "lark" | "regex";
    definition: string;
    inputProperty: string;
}
export interface GrammarToolInputJsonBuffer {
    input: string;
    started: boolean;
    closed: boolean;
}
export declare function getGrammarToolInput(toolName: string, arguments_: Record<string, unknown>, inputProperty: string): string;
export declare function appendGrammarToolInputJsonDelta(buffer: GrammarToolInputJsonBuffer, inputProperty: string, nextInput: string, close: boolean): string | undefined;
export declare function resolveJsonSchemaStrictSampling(tool: Tool, supportsStrictMode: boolean): boolean | undefined;
export declare function resolveGrammarConstrainedSampling(tool: Tool, supportsOpenAIGrammarTools: boolean): GrammarConstrainedSampling | undefined;
export declare function createGrammarToolInputProperties(tools: Tool[] | undefined, supportsOpenAIGrammarTools: boolean): ReadonlyMap<string, string>;
//# sourceMappingURL=constrained-sampling.d.ts.map