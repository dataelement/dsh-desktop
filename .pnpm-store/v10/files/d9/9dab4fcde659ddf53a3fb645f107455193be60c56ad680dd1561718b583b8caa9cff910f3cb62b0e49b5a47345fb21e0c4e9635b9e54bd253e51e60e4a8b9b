import * as schemas from "./schemas.cjs";
type AnyZod = schemas.$ZodType;
type Kind = schemas.$ZodTypeDef["type"];
/** The concrete schema class for a `def.type`, or `$ZodType` for kinds with no dedicated class. */
type SchemaOfKind<K extends Kind> = [Extract<schemas.$ZodTypes, {
    _zod: {
        def: {
            type: K;
        };
    };
}>] extends [never] ? AnyZod : Extract<schemas.$ZodTypes, {
    _zod: {
        def: {
            type: K;
        };
    };
}>;
export type VisitFn = (node: AnyZod, rewritten: boolean) => AnyZod;
export type VisitHandlers = {
    [K in Kind]?: (node: SchemaOfKind<K>, rewritten: boolean) => AnyZod;
};
/**
 * @internal Bottom-up rewrite of a schema tree. Unhandled kinds and unchanged branches keep their
 * identity. Returns `$ZodType`: a visitor can swap in a schema of any type, so callers declare
 * their own return type. `rewritten` tells a handler whether the traversal replaced anything
 * below the node it is looking at.
 */
export declare function visit(schema: schemas.SomeType, fn: VisitFn): AnyZod;
export declare function visit(schema: schemas.SomeType, handlers: VisitHandlers): AnyZod;
export {};
