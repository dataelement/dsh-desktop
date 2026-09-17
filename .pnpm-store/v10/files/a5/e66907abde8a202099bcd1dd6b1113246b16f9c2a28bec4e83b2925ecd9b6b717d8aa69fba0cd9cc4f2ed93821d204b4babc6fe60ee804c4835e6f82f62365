import type * as checks from "./checks.js";
import type { $ZodConfig } from "./core.js";
import type * as errors from "./errors.js";
import type * as schemas from "./schemas.js";
export type JSONType = string | number | boolean | null | JSONType[] | {
    [key: string]: JSONType;
};
export type JWTAlgorithm = "HS256" | "HS384" | "HS512" | "RS256" | "RS384" | "RS512" | "ES256" | "ES384" | "ES512" | "PS256" | "PS384" | "PS512" | "EdDSA" | (string & {});
export type HashAlgorithm = "md5" | "sha1" | "sha256" | "sha384" | "sha512";
export type HashEncoding = "hex" | "base64" | "base64url";
export type HashFormat = `${HashAlgorithm}_${HashEncoding}`;
export type IPVersion = "v4" | "v6";
export type MimeTypes = "application/json" | "application/xml" | "application/x-www-form-urlencoded" | "application/javascript" | "application/pdf" | "application/zip" | "application/vnd.ms-excel" | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" | "application/msword" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "application/vnd.ms-powerpoint" | "application/vnd.openxmlformats-officedocument.presentationml.presentation" | "application/octet-stream" | "application/graphql" | "text/html" | "text/plain" | "text/css" | "text/javascript" | "text/csv" | "image/png" | "image/jpeg" | "image/gif" | "image/svg+xml" | "image/webp" | "audio/mpeg" | "audio/ogg" | "audio/wav" | "audio/webm" | "video/mp4" | "video/webm" | "video/ogg" | "font/woff" | "font/woff2" | "font/ttf" | "font/otf" | "multipart/form-data" | (string & {});
export type ParsedTypes = "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function" | "file" | "date" | "array" | "map" | "set" | "nan" | "null" | "promise";
export type AssertEqual<T, U> = (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
export type AssertNotEqual<T, U> = (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? false : true;
export type AssertExtends<T, U> = T extends U ? T : never;
type ToZodMismatch<T, S extends schemas.$ZodType> = {
    "types do not match": {
        expected: T;
        received: S["_zod"]["output"];
    };
};
type ToZodKeyMismatch<Expected, Received> = schemas.$ZodType & {
    "types do not match": {
        expected: Expected;
        received: Received;
    };
};
declare const toZodDummy: unique symbol;
type ToZodNormalize<T> = [T] extends [(...args: any[]) => any] ? T : [T] extends [object] ? {
    [K in keyof T]: ToZodNormalize<T[K]>;
} : T | typeof toZodDummy;
type ToZodEqual<Output, T> = AssertEqual<Output, T> extends true ? true : IsAny<Output> extends true ? false : IsAny<T> extends true ? false : AssertEqual<ToZodNormalize<Output>, ToZodNormalize<T>>;
type ToZodShape<Shape, T> = {
    [K in keyof Shape]: Shape[K] extends schemas.$ZodType ? K extends keyof T ? ToZodEqual<Shape[K]["_zod"]["output"], T[K]> extends true ? Shape[K] : ToZodKeyMismatch<T[K], Shape[K]["_zod"]["output"]> : ToZodKeyMismatch<never, Shape[K]["_zod"]["output"]> : Shape[K];
} & {
    [K in Exclude<keyof T, keyof Shape>]: ToZodKeyMismatch<T[K], never>;
};
type ToZodExpand<X> = {
    [K in keyof X]: X[K];
} & {};
type ToZodTarget<S extends schemas.$ZodType, T> = S extends schemas.$ZodObject<infer Shape, infer Config> ? T extends object ? AssertEqual<ToZodExpand<ToZodShape<Shape, T>>, ToZodExpand<Shape>> extends true ? S & ToZodMismatch<T, S> : schemas.$ZodObject<ToZodExpand<ToZodShape<Shape, T>>, Config> : S & ToZodMismatch<T, S> : S & ToZodMismatch<T, S>;
export type IsAny<T> = 0 extends 1 & T ? true : false;
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type OmitKeys<T, K extends string> = Pick<T, Exclude<keyof T, K>>;
export type MakePartial<T, K extends keyof T> = Omit<T, K> & InexactPartial<Pick<T, K>>;
export type MakeRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
export type Exactly<T, X> = T & Record<Exclude<keyof X, keyof T>, never>;
export type NoUndefined<T> = T extends undefined ? never : T;
export type Whatever = {} | undefined | null;
export type Widen<T> = T extends string ? string : T extends number ? number : T extends boolean ? boolean : T extends bigint ? bigint : T;
export type LoosePartial<T extends object> = InexactPartial<T> & {
    [k: string]: unknown;
};
export type Mask<Keys extends PropertyKey> = {
    [K in Keys]?: true;
};
export type Writeable<T> = {
    -readonly [P in keyof T]: T[P];
} & {};
export type InexactPartial<T> = {
    [P in keyof T]?: T[P] | undefined;
};
export type EmptyObject = Record<string, never>;
export type BuiltIn = (((...args: any[]) => any) | (new (...args: any[]) => any)) | {
    readonly [Symbol.toStringTag]: string;
} | Date | Error | Generator | Promise<unknown> | RegExp;
export type MakeReadonly<T> = T extends Map<infer K, infer V> ? ReadonlyMap<K, V> : T extends Set<infer V> ? ReadonlySet<V> : T extends [infer Head, ...infer Tail] ? readonly [Head, ...Tail] : T extends Array<infer V> ? ReadonlyArray<V> : T extends BuiltIn ? T : Readonly<T>;
export type SomeObject = Record<PropertyKey, any>;
export type Identity<T> = T;
export type Flatten<T> = Identity<{
    [k in keyof T]: T[k];
}>;
export type Mapped<T> = {
    [k in keyof T]: T[k];
};
export type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
export type NoNeverKeys<T> = {
    [k in keyof T]: [T[k]] extends [never] ? never : k;
}[keyof T];
export type NoNever<T> = Identity<{
    [k in NoNeverKeys<T>]: k extends keyof T ? T[k] : never;
}>;
export type Extend<A extends SomeObject, B extends SomeObject> = Flatten<keyof A & keyof B extends never ? A & B : {
    [K in keyof A as K extends keyof B ? never : K]: A[K];
} & {
    [K in keyof B]: B[K];
}>;
export type TupleItems = ReadonlyArray<schemas.SomeType>;
export type AnyFunc = (...args: any[]) => any;
export type IsProp<T, K extends keyof T> = T[K] extends AnyFunc ? never : K;
export type MaybeAsync<T> = T | Promise<T>;
export type KeyOf<T> = keyof OmitIndexSignature<T>;
export type OmitIndexSignature<T> = {
    [K in keyof T as string extends K ? never : K extends string ? K : never]: T[K];
};
export type ExtractIndexSignature<T> = {
    [K in keyof T as string extends K ? K : K extends string ? never : K]: T[K];
};
export type Keys<T extends object> = keyof OmitIndexSignature<T>;
export type SchemaClass<T extends schemas.SomeType> = {
    new (def: T["_zod"]["def"]): T;
};
export type EnumValue = string | number;
export type EnumLike = Readonly<Record<string, EnumValue>>;
export type ToEnum<T extends EnumValue> = Flatten<{
    [k in T]: k;
}>;
export type KeysEnum<T extends object> = ToEnum<Exclude<keyof T, symbol>>;
export type KeysArray<T extends object> = Flatten<(keyof T & string)[]>;
export type Literal = string | number | bigint | boolean | null | undefined;
export type LiteralArray = Array<Literal>;
export type Primitive = string | number | symbol | bigint | boolean | null | undefined;
export type PrimitiveArray = Array<Primitive>;
export type HasSize = {
    size: number;
};
export type HasLength = {
    length: number;
};
export type Numeric = number | bigint | Date;
export type SafeParseResult<T> = SafeParseSuccess<T> | SafeParseError<T>;
export type SafeParseSuccess<T> = {
    success: true;
    data: T;
    error?: never;
};
export type SafeParseError<T> = {
    success: false;
    data?: never;
    error: errors.$ZodError<T>;
};
export type PropValues = Record<string, Set<Primitive>>;
export type PrimitiveSet = Set<Primitive>;
export declare function assertEqual<A, B>(val: AssertEqual<A, B>): AssertEqual<A, B>;
export declare function assertNotEqual<A, B>(val: AssertNotEqual<A, B>): AssertNotEqual<A, B>;
export declare function toZod<T>(): <S extends schemas.$ZodType>(schema: ToZodEqual<S["_zod"]["output"], T> extends true ? S : ToZodTarget<S, T>) => S;
export declare function assertIs<T>(_arg: T): void;
export declare function assertNever(_x: never): never;
export declare function assert<T>(_: any): asserts _ is T;
export declare function getEnumValues(entries: EnumLike): EnumValue[];
export declare function joinValues<T extends Primitive[]>(array: T, separator?: string): string;
export declare function jsonStringifyReplacer(_: string, value: any): any;
export declare function cached<T>(getter: () => T): {
    value: T;
};
export declare function nullish(input: any): boolean;
export declare function cleanRegex(source: string): string;
export declare function floatSafeRemainder(val: number, step: number): number;
export declare function defineLazy<T, K extends keyof T>(object: T, key: K, getter: () => T[K]): void;
export declare function objectClone(obj: object): any;
export declare function assignProp<T extends object, K extends PropertyKey>(target: T, prop: K, value: K extends keyof T ? T[K] : any): void;
/** A def's `shape` accessor, carrying whichever object it currently answers from. */
export interface ShapeGetter {
    (): Record<PropertyKey, any>;
    raw: Record<PropertyKey, any>;
}
/**
 * Whichever object a def's `shape` currently answers from: the one the caller passed until the first read, the frozen copy after it.
 *
 * Its keys and descriptors read without invoking anything, which is what lets a discriminated union check its discriminator, and the cycle walk read a shape, without resolving a getter that references the schema being constructed. A def that answers `shape` from an accessor of its own has none.
 */
export declare function rawShape(def: any): Record<PropertyKey, any> | undefined;
export declare function mergeDefs(...defs: Record<string, any>[]): any;
export declare function cloneDef(schema: schemas.$ZodType): any;
export declare function getElementAtPath(obj: any, path: (string | number)[] | null | undefined): any;
export declare function promiseAllObject<T extends object>(promisesObj: T): Promise<{
    [k in keyof T]: Awaited<T[k]>;
}>;
export declare function randomString(length?: number): string;
export declare function esc(str: string): string;
export declare function slugify(input: string): string;
export declare const captureStackTrace: (targetObject: object, constructorOpt?: Function) => void;
export declare function isObject(data: any): data is Record<PropertyKey, unknown>;
export declare const allowsEval: {
    value: boolean;
};
export declare function isPlainObject(o: any): o is Record<PropertyKey, unknown>;
export declare function shallowClone(o: any): any;
export declare function numKeys(data: any): number;
export declare const getParsedType: (data: any) => ParsedTypes;
export declare const propertyKeyTypes: Set<string>;
export declare const primitiveTypes: Set<string>;
export declare function escapeRegex(str: string): string;
export declare function clone<T extends schemas.$ZodType>(inst: T, def?: T["_zod"]["def"], params?: {
    parent: boolean;
}): T;
export type EmptyToNever<T> = keyof T extends never ? never : T;
export type Normalize<T> = T extends undefined ? never : T extends Record<any, any> ? Flatten<{
    [k in keyof Omit<T, "error" | "message">]: T[k];
} & ("error" extends keyof T ? {
    error?: Exclude<T["error"], string>;
} : unknown)> : never;
export declare function normalizeParams<T>(_params: T): Normalize<T>;
export declare function createTransparentProxy<T extends object>(getter: () => T): T;
export declare function stringifyPrimitive(value: any): string;
export declare function optionalKeys(shape: schemas.$ZodShape): string[];
export type CleanKey<T extends PropertyKey> = T extends `?${infer K}` ? K : T extends `${infer K}?` ? K : T;
export type ToCleanMap<T extends schemas.$ZodLooseShape> = {
    [k in keyof T]: k extends `?${infer K}` ? K : k extends `${infer K}?` ? K : k;
};
export type FromCleanMap<T extends schemas.$ZodLooseShape> = {
    [k in keyof T as k extends `?${infer K}` ? K : k extends `${infer K}?` ? K : k]: k;
};
export declare const NUMBER_FORMAT_RANGES: Record<checks.$ZodNumberFormats, [number, number]>;
export declare const BIGINT_FORMAT_RANGES: Record<checks.$ZodBigIntFormats, [bigint, bigint]>;
export declare function pick(schema: schemas.$ZodObject, mask: Record<string, unknown>): any;
export declare function omit(schema: schemas.$ZodObject, mask: object): any;
export declare function extend(schema: schemas.$ZodObject, shape: schemas.$ZodShape): any;
export declare function safeExtend(schema: schemas.$ZodObject, shape: schemas.$ZodShape): any;
export declare function merge(a: schemas.$ZodObject, b: schemas.$ZodObject): any;
export declare function partial(Class: SchemaClass<schemas.$ZodOptional> | null, schema: schemas.$ZodObject, mask: object | undefined, name?: string): any;
export declare function required(Class: SchemaClass<schemas.$ZodNonOptional>, schema: schemas.$ZodObject, mask: object | undefined): any;
export type Constructor<T, Def extends any[] = any[]> = new (...args: Def) => T;
export declare function aborted(x: schemas.ParsePayload, startIndex?: number): boolean;
export declare function explicitlyAborted(x: schemas.ParsePayload, startIndex?: number): boolean;
export declare function prefixIssues(path: PropertyKey, issues: errors.$ZodRawIssue[]): errors.$ZodRawIssue[];
export declare function unwrapMessage(message: string | {
    message: string;
} | undefined | null): string | undefined;
export declare function attachSchema(issues: errors.$ZodRawIssue[], start: number, inst: schemas.$ZodType): void;
export declare function finalizeIssue(iss: errors.$ZodRawIssue, ctx: schemas.ParseContextInternal | undefined, config: $ZodConfig): errors.$ZodIssue;
export declare function getSizableOrigin(input: any): "set" | "map" | "file" | "unknown";
export declare function codePointLength(str: string): number;
export declare function getLengthableOrigin(input: any): "array" | "string" | "unknown";
export declare function parsedType(data: unknown): errors.$ZodInvalidTypeExpected;
export declare function issue(_iss: string, input: any, inst: any): errors.$ZodRawIssue;
export declare function issue(_iss: errors.$ZodRawIssue): errors.$ZodRawIssue;
export declare function cleanEnum(obj: Record<string, EnumValue>): EnumValue[];
export declare function base64ToUint8Array(base64: string): InstanceType<typeof Uint8Array>;
export declare function uint8ArrayToBase64(bytes: Uint8Array): string;
export declare function base64urlToUint8Array(base64url: string): InstanceType<typeof Uint8Array>;
export declare function uint8ArrayToBase64url(bytes: Uint8Array): string;
export declare function hexToUint8Array(hex: string): InstanceType<typeof Uint8Array>;
export declare function uint8ArrayToHex(bytes: Uint8Array): string;
export declare abstract class Class {
    constructor(..._args: any[]);
}
/**
 * Installs a trait's members on its prototype. Each value builds that member for the instance on first read; the built value shadows the accessor as an own property, so a detached `const { parse } = schema` keeps working.
 *
 * Call this from a `proto` initializer, which runs once per prototype — never per instance.
 */
export declare function members(proto: object, table: object): void;
/** Shadows a prototype member with an own value, so a getter that builds from the instance runs once. */
export declare function own<T>(inst: object, key: PropertyKey, value: T, enumerable?: boolean): T;
/** Like {@link own}, for a member that was never an own data property and has to stay out of `Object.keys`. */
export declare function hide<T>(inst: object, key: PropertyKey, value: T): T;
/** Adds members a table derives from the instance: each builds on first read and shadows as own data, and assignment shadows the same way, as when these were own properties. */
export declare function derived<T>(computes: {
    [K in keyof T]?: (inst: T) => T[K];
}, table: ProtoOf<T>): ProtoOf<T>;
/** A trait's prototype members: a partial view of its own interface, with `this` typed as the instance. */
export type ProtoOf<T> = {
    [K in keyof T]?: (T[K] extends (...args: infer A) => infer R ? (...args: A) => R : T[K]) | undefined;
} & ThisType<T>;
/**
 * Installs a lazily-derived internal on the `_zod` prototype of `inst`'s
 * constructor, computed from the internals object itself and cached there on
 * first read. One accessor per constructor rather than one per instance.
 */
export declare function defineLazyInternal<T extends {
    _zod: any;
}>(inst: T, key: string, compute: (zod: T["_zod"]) => unknown): void;
/**
 * Installs `key` on `inst`'s prototype, computed by `make` on first read and cached there as an own
 * data property. One accessor per constructor rather than one per instance, because an own accessor
 * puts every instance after the first into v8 dictionary mode. The key doubles as the sentinel.
 */
export declare function installLazyProp(inst: object, key: string, make: (self: any) => unknown, enumerable: boolean): void;
/** Marks the thunk `_catch` synthesises for a constant catch value. `Function.length` cannot tell that thunk from a user callback — rest and defaulted parameters both report arity 0 — and a user callback reads `ctx.error`, whose issues only finalize correctly against the caller's per-parse error map. Provenance can say what arity cannot. A plain string key rather than `Symbol.for`, whose call at module scope no bundler can prove pure — the same shape that anchored `urlCanParse` into every build. */
export declare const CONSTANT_CATCH = "~constantCatch";
/** Wraps a constant catch value in a thunk tagged with {@link CONSTANT_CATCH}. */
export declare function constantCatch<T>(value: T): () => T;
export {};
