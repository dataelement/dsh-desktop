import type * as types from "./types.gen.js";
/**
 * Request from the agent to elicit structured user input.
 *
 * The agent sends this to the client to request information from the user,
 * either via a form or by directing them to a URL.
 * Elicitations are tied to a session (optionally a tool call) or a request.
 */
export type CreateElicitationRequest = types.CreateElicitationRequest;
/**
 * Validated type guards for `CreateElicitationRequest`'s known variants.
 *
 * Each guard validates the variant's payload, not just its discriminant
 * tag: a malformed known variant (right tag, wrong payload) matches no
 * guard — mirroring wire validation, which rejects such values instead
 * of classifying them as custom.
 *
 * Guards check the value as given: fields that wire deserialization
 * salvages to a default (e.g. a malformed `_meta`) are only normalized
 * by parsing, and for ambiguous raw shapes (a known tag combined with
 * another variant's payload) guards are conservative where wire parsing
 * may still accept the value — narrow wire-parsed values when exact
 * parity matters.
 */
export declare const CreateElicitationRequest: {
    /** Narrow to the `form` variant, validating its payload. */
    readonly isForm: (value: types.CreateElicitationRequest) => value is (types.ElicitationFormMode & {
        mode: "form";
    }) & Pick<types.CreateElicitationRequest, "message" | "_meta">;
    /** Narrow to the `url` variant, validating its payload. */
    readonly isUrl: (value: types.CreateElicitationRequest) => value is (types.ElicitationUrlMode & {
        mode: "url";
    }) & Pick<types.CreateElicitationRequest, "message" | "_meta">;
    /**
     * Narrow to a custom or future variant: the `mode` tag matches no known variant, with a valid payload.
     *
     * TypeScript keeps the known variants in the narrowed union (they are
     * structural subtypes of the catch-all), so read vendor payload keys
     * via a widening cast: `(value as Record<string, unknown>).someKey`.
     */
    readonly isCustom: (value: types.CreateElicitationRequest) => value is ((types.ElicitationSessionScope | types.ElicitationRequestScope) & {
        mode: string;
        [key: string]: unknown;
    }) & Pick<types.CreateElicitationRequest, "message" | "_meta">;
};
/**
 * Property schema for elicitation form fields.
 *
 * Each variant corresponds to a JSON Schema `"type"` value.
 * Single-select enums use the `String` variant with `enum` or `oneOf` set.
 * Multi-select enums use the `Array` variant.
 */
export type ElicitationPropertySchema = types.ElicitationPropertySchema;
/**
 * Validated type guards for `ElicitationPropertySchema`'s known variants.
 *
 * Each guard validates the variant's payload, not just its discriminant
 * tag: a malformed known variant (right tag, wrong payload) matches no
 * guard — mirroring wire validation, which rejects such values instead
 * of classifying them as custom.
 *
 * Guards check the value as given: fields that wire deserialization
 * salvages to a default (e.g. a malformed `_meta`) are only normalized
 * by parsing, and for ambiguous raw shapes (a known tag combined with
 * another variant's payload) guards are conservative where wire parsing
 * may still accept the value — narrow wire-parsed values when exact
 * parity matters.
 */
export declare const ElicitationPropertySchema: {
    /** Narrow to the `string` variant, validating its payload. */
    readonly isString: (value: types.ElicitationPropertySchema) => value is types.StringPropertySchema & {
        type: "string";
    };
    /** Narrow to the `number` variant, validating its payload. */
    readonly isNumber: (value: types.ElicitationPropertySchema) => value is types.NumberPropertySchema & {
        type: "number";
    };
    /** Narrow to the `integer` variant, validating its payload. */
    readonly isInteger: (value: types.ElicitationPropertySchema) => value is types.IntegerPropertySchema & {
        type: "integer";
    };
    /** Narrow to the `boolean` variant, validating its payload. */
    readonly isBoolean: (value: types.ElicitationPropertySchema) => value is types.BooleanPropertySchema & {
        type: "boolean";
    };
    /** Narrow to the `array` variant, validating its payload. */
    readonly isArray: (value: types.ElicitationPropertySchema) => value is types.MultiSelectPropertySchema & {
        type: "array";
    };
    /**
     * Narrow to a custom or future variant: the `type` tag matches no known variant.
     *
     * TypeScript keeps the known variants in the narrowed union (they are
     * structural subtypes of the catch-all), so read vendor payload keys
     * via a widening cast: `(value as Record<string, unknown>).someKey`.
     */
    readonly isCustom: (value: types.ElicitationPropertySchema) => value is {
        type: string;
        [key: string]: unknown;
    };
};
/**
 * Items for a multi-select (array) property schema.
 */
export type MultiSelectItems = types.MultiSelectItems;
/**
 * Validated type guards for `MultiSelectItems`'s known variants.
 *
 * Each guard validates the variant's payload, not just its discriminant
 * tag: a malformed known variant (right tag, wrong payload) matches no
 * guard — mirroring wire validation, which rejects such values instead
 * of classifying them as custom.
 *
 * Guards check the value as given: fields that wire deserialization
 * salvages to a default (e.g. a malformed `_meta`) are only normalized
 * by parsing, and for ambiguous raw shapes (a known tag combined with
 * another variant's payload) guards are conservative where wire parsing
 * may still accept the value — narrow wire-parsed values when exact
 * parity matters.
 */
export declare const MultiSelectItems: {
    /** Narrow to the `string` variant, validating its payload. */
    readonly isString: (value: types.MultiSelectItems) => value is types.StringMultiSelectItems & {
        type: "string";
    };
    /** Narrow to the `titled` variant, validating its payload. */
    readonly isTitled: (value: types.MultiSelectItems) => value is types.TitledMultiSelectItems;
    /**
     * Narrow to a custom or future variant: the `type` tag matches no known variant.
     *
     * TypeScript keeps the known variants in the narrowed union (they are
     * structural subtypes of the catch-all), so read vendor payload keys
     * via a widening cast: `(value as Record<string, unknown>).someKey`.
     */
    readonly isCustom: (value: types.MultiSelectItems) => value is {
        type: string;
        [key: string]: unknown;
    };
};
/**
 * Response from the client to an elicitation request.
 */
export type CreateElicitationResponse = types.CreateElicitationResponse;
/**
 * Validated type guards for `CreateElicitationResponse`'s known variants.
 *
 * Each guard validates the variant's payload, not just its discriminant
 * tag: a malformed known variant (right tag, wrong payload) matches no
 * guard — mirroring wire validation, which rejects such values instead
 * of classifying them as custom.
 *
 * Guards check the value as given: fields that wire deserialization
 * salvages to a default (e.g. a malformed `_meta`) are only normalized
 * by parsing, and for ambiguous raw shapes (a known tag combined with
 * another variant's payload) guards are conservative where wire parsing
 * may still accept the value — narrow wire-parsed values when exact
 * parity matters.
 */
export declare const CreateElicitationResponse: {
    /** Narrow to the `accept` variant, validating its payload. */
    readonly isAccept: (value: types.CreateElicitationResponse) => value is (types.ElicitationAcceptAction & {
        action: "accept";
    }) & Pick<types.CreateElicitationResponse, "_meta">;
    /** Narrow to the `decline` variant, validating its payload. */
    readonly isDecline: (value: types.CreateElicitationResponse) => value is {
        action: "decline";
    } & Pick<types.CreateElicitationResponse, "_meta">;
    /** Narrow to the `cancel` variant, validating its payload. */
    readonly isCancel: (value: types.CreateElicitationResponse) => value is {
        action: "cancel";
    } & Pick<types.CreateElicitationResponse, "_meta">;
    /**
     * Narrow to a custom or future variant: the `action` tag matches no known variant.
     *
     * TypeScript keeps the known variants in the narrowed union (they are
     * structural subtypes of the catch-all), so read vendor payload keys
     * via a widening cast: `(value as Record<string, unknown>).someKey`.
     */
    readonly isCustom: (value: types.CreateElicitationResponse) => value is {
        action: string;
        [key: string]: unknown;
    } & Pick<types.CreateElicitationResponse, "_meta">;
};
