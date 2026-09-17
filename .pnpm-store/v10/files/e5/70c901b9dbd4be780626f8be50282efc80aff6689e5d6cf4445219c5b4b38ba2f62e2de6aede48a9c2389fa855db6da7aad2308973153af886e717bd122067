/** Synchronous schema introspection and immutable settings-draft edits. */
import { Service } from '@deepseek-ai/cordis';
import type { Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
/** Live schemastery node used for settings introspection and validation. */
export type SchemaNode = Schema;
/**
 * Settings-owned synchronous schema service. Dynamic client plugins receive
 * this Cordis entity instead of importing executable helpers from one another.
 */
export declare class SettingsSchemaService extends Service {
    /** @param ctx - providing ui-settings context. */
    constructor(ctx: Context);
    /**
     * Rehydrate one serialized `schema.toJSON()` envelope.
     * @param serialized - serialized Schemastery node.
     * @returns live schema node.
     */
    rehydrate(serialized: unknown): SchemaNode;
    /**
     * Validate a settings draft.
     * @param schema - live schema node.
     * @param draft - candidate settings value.
     * @returns validation failure text, or `undefined` when valid.
     */
    validate(schema: SchemaNode, draft: unknown): string | undefined;
    /**
     * Resolve an object, dict, or array schema node at a settings path.
     * @param root - schema node to traverse.
     * @param path - object keys or array indexes.
     * @returns the resolved node, or `undefined` when the path is absent.
     */
    nodeAtPath(root: SchemaNode, path: readonly string[]): SchemaNode | undefined;
    /**
     * Read a nested value by a string-key or array-index path.
     * @param value - value to traverse.
     * @param path - object keys or array indexes.
     * @returns the resolved value, or `undefined` when the path is absent.
     */
    getPath(value: unknown, path: readonly string[]): unknown;
    /**
     * Report whether the final path key exists independently of its value.
     * @param value - value to traverse.
     * @param path - object keys or array indexes.
     * @returns whether the path exists.
     */
    hasPath(value: unknown, path: readonly string[]): boolean;
    /**
     * Immutably set a nested value, materializing missing containers.
     * @param root - settings object to copy.
     * @param path - non-empty object-key or array-index path.
     * @param value - replacement value.
     * @returns copied root containing the replacement.
     * @throws when `path` is empty.
     */
    setPath(root: Record<string, unknown>, path: readonly string[], value: unknown): Record<string, unknown>;
    /**
     * Immutably remove a nested key, preserving an unchanged missing root.
     * @param root - settings object to copy.
     * @param path - non-empty object-key or array-index path.
     * @returns copied root without the key, or `root` when the path is absent.
     * @throws when `path` is empty.
     */
    deletePath(root: Record<string, unknown>, path: readonly string[]): Record<string, unknown>;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Settings-owned synchronous schema and immutable path operations. */
        settingsSchema: SettingsSchemaService;
    }
}
//# sourceMappingURL=schema.d.ts.map