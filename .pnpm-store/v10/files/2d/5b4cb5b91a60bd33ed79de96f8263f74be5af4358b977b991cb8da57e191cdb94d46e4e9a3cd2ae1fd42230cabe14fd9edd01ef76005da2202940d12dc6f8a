// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

type PrimitiveKind = 'Void' | 'Bool' | 'Int8' | 'UInt8' | 'Int16' | 'Int16S' | 'UInt16' | 'UInt16S' |
                     'Int32' | 'Int32S' | 'UInt32' | 'UInt32S' | 'Int64' | 'Int64S' | 'UInt64' | 'UInt64S' |
                     'String' | 'String16' | 'Pointer' | 'Record' | 'Union' | 'Array' | 'Float32' | 'Float64' |
                     'Prototype' | 'Callback';
type ArrayHint = 'Array' | 'Typed' | 'Buffer' | 'String';

type PrototypeInfo = {
    name: string;
    arguments: TypeObject[];
    result: TypeObject
};

interface IKoffiDirectionMarker { __brand: 'IKoffiDirectionMarker' }
interface IKoffiPointerCast { __brand: 'IKoffiPointerCast' }

export type TypeObject = {
    name: string;
    primitive: PrimitiveKind;
    size: number;
    alignment: number;
    disposable: boolean;
    length?: number;
    hint?: ArrayHint;
    ref?: TypeObject;
    members?: Record<string, { name: string, type: TypeObject, offset: number }>;
    proto?: PrototypeInfo;
    values?: Record<string, number | bigint>;
};

type TypeSpec = string | TypeObject | IKoffiDirectionMarker;
type TypeSpecWithAlignment = TypeSpec | [number, TypeSpec];

type KoffiFunction = {
    (...args: any[]) : any;
    async: (...args: any[]) => any;
    info: PrototypeInfo;
};
export type KoffiFunc<T extends (...args: any) => any> = T & {
   async: (...args: [...Parameters<T>, (err: any, result: ReturnType<T>) => void]) => void;
   info: PrototypeInfo;
};

type LoadOptions = {
    lazy?: boolean,
    global?: boolean,
    deep?: boolean
};

export type LibraryHandle = {
    func(definition: string): KoffiFunction;
    func(name: string | number, result: TypeSpec, arguments: TypeSpec[]): KoffiFunction;
    func(convention: string, name: string | number, result: TypeSpec, arguments: TypeSpec[]): KoffiFunction;

    /** @deprecated */ cdecl(definition: string): KoffiFunction;
    /** @deprecated */ cdecl(name: string | number, result: TypeSpec, arguments: TypeSpec[]): KoffiFunction;
    /** @deprecated */ stdcall(definition: string): KoffiFunction;
    /** @deprecated */ stdcall(name: string | number, result: TypeSpec, arguments: TypeSpec[]): KoffiFunction;
    /** @deprecated */ fastcall(definition: string): KoffiFunction;
    /** @deprecated */ fastcall(name: string | number, result: TypeSpec, arguments: TypeSpec[]): KoffiFunction;
    /** @deprecated */ thiscall(definition: string): KoffiFunction;
    /** @deprecated */ thiscall(name: string | number, result: TypeSpec, arguments: TypeSpec[]): KoffiFunction;

    symbol(name: string): any;
    /** @deprecated */ symbol(name: string, type: TypeSpec): any;

    unload(): void;
};

export function load(path: string | null, options?: LoadOptions): LibraryHandle;

export function struct(name: string | null | undefined, def: Record<string, TypeSpecWithAlignment>): TypeObject;
export function struct(ref: TypeObject, def: Record<string, TypeSpecWithAlignment>): TypeObject;
export function struct(def: Record<string, TypeSpecWithAlignment>): TypeObject;
export function pack(name: string | null | undefined, def: Record<string, TypeSpecWithAlignment>): TypeObject;
export function pack(ref: TypeObject, def: Record<string, TypeSpecWithAlignment>): TypeObject;
export function pack(def: Record<string, TypeSpecWithAlignment>): TypeObject;

export function union(name: string | null | undefined, def: Record<string, TypeSpecWithAlignment>): TypeObject;
export function union(ref: TypeObject, def: Record<string, TypeSpecWithAlignment>): TypeObject;
export function union(def: Record<string, TypeSpecWithAlignment>): TypeObject;

export class Union {
    constructor(type: TypeSpec);
    [s: string]: any;
}

export function enumeration(name: string | null | undefined, def: Record<string, number | bigint>, storage?: TypeSpec | null) : TypeObject;
export function enumeration(def: Record<string, number | bigint>, storage?: TypeSpec | null) : TypeObject;

export function array(ref: TypeSpec, len: number, hint?: ArrayHint | null): TypeObject;
export function array(ref: TypeSpec, countedBy: string, maxLen: number, hint?: ArrayHint | null): TypeObject;

export function opaque(name: string | null | undefined): TypeObject;
export function opaque(): TypeObject;

export function pointer(ref: TypeSpec): TypeObject;
export function pointer(ref: TypeSpec, count: number): TypeObject;
export function pointer(name: string | null | undefined, ref: TypeSpec, countedBy?: string | null): TypeObject;
export function pointer(name: string | null | undefined, ref: TypeSpec, count: number): TypeObject;

export function out(type: TypeSpec): IKoffiDirectionMarker;
export function inout(type: TypeSpec): IKoffiDirectionMarker;

export function disposable(type: TypeSpec): TypeObject;
export function disposable(type: TypeSpec, freeFunction: Function): TypeObject;
export function disposable(name: string | null | undefined, type: TypeSpec): TypeObject;
export function disposable(name: string | null | undefined, type: TypeSpec, freeFunction: Function): TypeObject;

export function proto(definition: string): TypeObject;
export function proto(result: TypeSpec, arguments: TypeSpec[]): TypeObject;
export function proto(convention: string, result: TypeSpec, arguments: TypeSpec[]): TypeObject;
export function proto(name: string | null | undefined, result: TypeSpec, arguments: TypeSpec[]): TypeObject;
export function proto(convention: string, name: string | null | undefined, result: TypeSpec, arguments: TypeSpec[]): TypeObject;

export function register(callback: Function, type: TypeSpec): bigint;
/** @deprecated */ export function register(thisValue: any, callback: Function, type: TypeSpec): bigint;
export function unregister(callback: bigint): void;

export function as(value: any, type: TypeSpec): IKoffiPointerCast;
export function address(value: any): bigint;
export function call(value: any, type: TypeSpec, ...args: any[]): any;
export function view(ref: any, len: number): ArrayBuffer;

export const decode: {
    (value: any, type: TypeSpec): any;
    (value: any, type: TypeSpec, len: number): any;
    (value: any, offset: number, type: TypeSpec): any;
    (value: any, offset: number, type: TypeSpec, len: number): any;

    char(ptr: any): number;
    short(ptr: any): number;
    int(ptr: any): number;
    long(ptr: any): number | bigint;
    longlong(ptr: any): number | bigint;
    uchar(ptr: any): number;
    ushort(ptr: any): number;
    uint(ptr: any): number;
    ulong(ptr: any): number | bigint;
    ulonglong(ptr: any): number | bigint;

    int8(ptr: any): number;
    int16(ptr: any): number;
    int32(ptr: any): number;
    int64(ptr: any): number | bigint;
    uint8(ptr: any): number;
    uint16(ptr: any): number;
    uint32(ptr: any): number;
    uint64(ptr: any): number | bigint;

    int8le(ptr: any): number;
    int8be(ptr: any): number;
    int16le(ptr: any): number;
    int16be(ptr: any): number;
    int32le(ptr: any): number;
    int32be(ptr: any): number;
    int64le(ptr: any): number | bigint;
    int64be(ptr: any): number | bigint;
    uint8le(ptr: any): number;
    uint8be(ptr: any): number;
    uint16le(ptr: any): number;
    uint16be(ptr: any): number;
    uint32le(ptr: any): number;
    uint32be(ptr: any): number;
    uint64le(ptr: any): number | bigint;
    uint64be(ptr: any): number | bigint;

    float(ptr: any): number;
    double(ptr: any): number;

    string(ptr: any, length?: number | bigint): string;
    string16(ptr: any, length?: number | bigint): string;
    string32(ptr: any, length?: number | bigint): string;
    wstring(ptr: any, length?: number | bigint): string;
};

export function encode(ref: any, type: TypeSpec, value: any): void;
export function encode(ref: any, type: TypeSpec, value: any, len: number): void;
export function encode(ref: any, offset: number, type: TypeSpec): void;
export function encode(ref: any, offset: number, type: TypeSpec, value: any): void;
export function encode(ref: any, offset: number, type: TypeSpec, value: any, len: number): void;

export function type(type: TypeSpec): TypeObject;
export function sizeof(type: TypeSpec): number;
export function alignof(type: TypeSpec): number;
export function offsetof(type: TypeSpec, member_name: string): number;
/** @deprecated */ export function resolve(type: TypeSpec): TypeObject;
/** @deprecated */ export function introspect(type: TypeSpec): TypeObject;

export function alias(name: string, type: TypeSpec): TypeObject;

type KoffiConfig = {
    sync_stack_size?: number;
    sync_heap_size?: number;
    async_stack_size?: number;
    async_heap_size?: number;
    resident_async_pools?: number;
    max_async_calls?: number;
    max_type_size?: number;
};
type KoffiStats = {
    disposed: number,
    callbacks: number
};

export function config(): KoffiConfig;
export function config(cfg: KoffiConfig): KoffiConfig;
export function stats(): KoffiStats;

export function alloc(type: TypeSpec, length: number): any;
export function free(value: any): void;

export function errno(): number;
export function errno(value: number): number;

export function reset(): void;

export const internal: boolean;
export const extension: string;

export const os: {
    errno: Record<string, number>
};

// https://koffi.dev/input#standard-types
type PrimitiveTypes =
    | 'bool'
    | 'char'
    | 'char16_t'
    | 'char16'
    | 'char32_t'
    | 'char32'
    | 'double'
    | 'float'
    | 'float32'
    | 'float64'
    | 'int'
    | 'int8_t'
    | 'int8'
    | 'int16_be_t'
    | 'int16_be'
    | 'int16_le_t'
    | 'int16_le'
    | 'int16_t'
    | 'int16'
    | 'int32_be_t'
    | 'int32_be'
    | 'int32_le_t'
    | 'int32_le'
    | 'int32_t'
    | 'int32'
    | 'int64_be_t'
    | 'int64_be'
    | 'int64_le_t'
    | 'int64_le'
    | 'int64_t'
    | 'int64'
    | 'intptr_t'
    | 'intptr'
    | 'long long'
    | 'long'
    | 'longlong'
    | 'short'
    | 'size_t'
    | 'str'
    | 'str16'
    | 'str32'
    | 'string'
    | 'string16'
    | 'string32'
    | 'uchar'
    | 'uint'
    | 'uint8_t'
    | 'uint8'
    | 'uint16_be_t'
    | 'uint16_be'
    | 'uint16_le_t'
    | 'uint16_le'
    | 'uint16_t'
    | 'uint16'
    | 'uint32_be_t'
    | 'uint32_be'
    | 'uint32_le_t'
    | 'uint32_le'
    | 'uint32_t'
    | 'uint32'
    | 'uint64_be_t'
    | 'uint64_be'
    | 'uint64_le_t'
    | 'uint64_le'
    | 'uint64_t'
    | 'uint64'
    | 'uintptr_t'
    | 'uintptr'
    | 'ulong'
    | 'ulonglong'
    | 'unsigned char'
    | 'unsigned int'
    | 'unsigned long long'
    | 'unsigned long'
    | 'unsigned short'
    | 'ushort'
    | 'void'
    | 'wchar'
    | 'wchar_t';
export const types: Record<PrimitiveTypes, TypeObject>;

export namespace node {
    export const env: { __brand: 'IKoffiNodeEnv' };

    type PollOptions = {
        readable?: boolean;
        writable?: boolean;
        disconnect?: boolean;
    };

    type PollEvents = {
        readable: boolean;
        writable: boolean;
        disconnect: boolean;
    };

    export class PollHandle {
        start(opts: PollOptions, callback: (ev: PollEvents) => void): void;
        start(callback: (ev: PollEvents) => void): void;
        stop(): void;

        close(): void;

        unref(): void;
        ref(): void;
    }

    export function poll(fd: number, opts: PollOptions, callback: (ev: PollEvents) => void): PollHandle;
    export function poll(fd: number, callback: (ev: PollEvents) => void): PollHandle;
}

export const version: string;

// We want the same module with a default export and named exports.
// If someone knows a better way, feel free to help ;)

declare const DefaultObject: {
    LibraryHandle: LibraryHandle;
    TypeObject: TypeObject;
    Union: Union;

    address: typeof address;
    alias: typeof alias;
    alignof: typeof alignof;
    alloc: typeof alloc;
    array: typeof array;
    as: typeof as;
    call: typeof call;
    config: typeof config;
    decode: typeof decode;
    disposable: typeof disposable;
    encode: typeof encode;
    enumeration: typeof enumeration;
    errno: typeof errno;
    extension: typeof extension;
    free: typeof free;
    inout: typeof inout;
    introspect: typeof introspect;
    load: typeof load;
    node: typeof node;
    offsetof: typeof offsetof;
    opaque: typeof opaque;
    os: typeof os;
    out: typeof out;
    pack: typeof pack;
    pointer: typeof pointer;
    proto: typeof proto;
    register: typeof register;
    reset: typeof reset;
    resolve: typeof resolve;
    sizeof: typeof sizeof;
    stats: typeof stats;
    struct: typeof struct;
    type: typeof type;
    types: typeof types;
    union: typeof union;
    unregister: typeof unregister;
    version: typeof version;
    view: typeof view;
}

export default DefaultObject;
