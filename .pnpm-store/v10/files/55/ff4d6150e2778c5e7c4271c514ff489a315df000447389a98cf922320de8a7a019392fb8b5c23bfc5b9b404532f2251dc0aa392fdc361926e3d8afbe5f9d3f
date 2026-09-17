import { ErrorObject } from "ajv";
export type PostFormatter = (formattedError: string, error: ErrorObject) => string;
export interface ValidationConfig {
    name?: string;
    postFormatter?: PostFormatter;
}
export declare function validateSchema(schema: unknown, data: unknown, config?: ValidationConfig): void;
