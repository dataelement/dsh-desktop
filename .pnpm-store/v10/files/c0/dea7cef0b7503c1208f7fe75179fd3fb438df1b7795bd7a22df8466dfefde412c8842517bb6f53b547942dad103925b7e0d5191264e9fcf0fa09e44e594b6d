import * as core from "../core/index.cjs";
import type { ZodType } from "./schemas.cjs";
/** @deprecated Use `z.output<T>` instead. */
export type TypeOf<T> = core.output<T>;
/** @deprecated Use `z.output<T>` instead. */
export type Infer<T> = core.output<T>;
/** @deprecated Use `z.core.$ZodTypes` instead */
export type ZodFirstPartySchemaTypes = core.$ZodTypes;
/** @deprecated Use the raw string literal codes instead, e.g. "invalid_type". */
export declare const ZodIssueCode: {
    readonly invalid_type: "invalid_type";
    readonly too_big: "too_big";
    readonly too_small: "too_small";
    readonly invalid_format: "invalid_format";
    readonly not_multiple_of: "not_multiple_of";
    readonly unrecognized_keys: "unrecognized_keys";
    readonly invalid_union: "invalid_union";
    readonly invalid_key: "invalid_key";
    readonly invalid_element: "invalid_element";
    readonly invalid_value: "invalid_value";
    readonly custom: "custom";
};
/** @deprecated Use `z.core.$ZodFlattenedError<z.output<T>>` instead; it takes an inferred type, not a schema. */
export type inferFlattenedErrors<T extends core.$ZodType, U = string> = core.$ZodFlattenedError<core.output<T>, U>;
/** @deprecated Use `z.core.$ZodFormattedError<z.output<T>>` instead; it takes an inferred type, not a schema. */
export type inferFormattedError<T extends core.$ZodType<any, any>, U = string> = core.$ZodFormattedError<core.output<T>, U>;
/** Use `z.$brand` instead */
export type BRAND<T extends string | number | symbol = string | number | symbol> = {
    [core.$brand]: {
        [k in T]: true;
    };
};
export { $brand, config } from "../core/index.cjs";
/** @deprecated Use `z.config(params)` instead. */
export declare function setErrorMap(map: core.$ZodErrorMap): void;
/** @deprecated Use `z.config()` instead. */
export declare function getErrorMap(): core.$ZodErrorMap<core.$ZodIssue> | undefined;
/** @deprecated Use z.ZodType (without generics) instead. */
export type ZodTypeAny<Output = unknown, Input = unknown, Internals extends core.$ZodTypeInternals<Output, Input> = core.$ZodTypeInternals<Output, Input>> = ZodType<Output, Input, Internals>;
/** @deprecated Use `z.ZodType` */
export type ZodSchema<Output = unknown, Input = unknown, Internals extends core.$ZodTypeInternals<Output, Input> = core.$ZodTypeInternals<Output, Input>> = ZodType<Output, Input, Internals>;
/** @deprecated Use `z.ZodType` */
export type Schema<Output = unknown, Input = unknown, Internals extends core.$ZodTypeInternals<Output, Input> = core.$ZodTypeInternals<Output, Input>> = ZodType<Output, Input, Internals>;
/** Included for Zod 3 compatibility */
export type ZodRawShape = core.$ZodShape;
/** @deprecated Do not use. Stub definition, only included for zod-to-json-schema compatibility. */
export declare enum ZodFirstPartyTypeKind {
}
