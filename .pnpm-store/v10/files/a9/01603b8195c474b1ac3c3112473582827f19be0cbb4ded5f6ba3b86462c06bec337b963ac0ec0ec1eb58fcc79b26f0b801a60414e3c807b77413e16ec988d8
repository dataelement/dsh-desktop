import { Type } from "typebox";
/**
 * Creates a string enum schema compatible with Google's API and other providers
 * that don't support anyOf/const patterns.
 *
 * @example
 * const OperationSchema = StringEnum(["add", "subtract", "multiply", "divide"], {
 *   description: "The operation to perform"
 * });
 *
 * type Operation = Static<typeof OperationSchema>; // "add" | "subtract" | "multiply" | "divide"
 */
export function StringEnum(values, options) {
    return Type.Unsafe({
        type: "string",
        enum: values,
        ...(options?.description && { description: options.description }),
        ...(options?.default && { default: options.default }),
    });
}
//# sourceMappingURL=typebox-helpers.js.map