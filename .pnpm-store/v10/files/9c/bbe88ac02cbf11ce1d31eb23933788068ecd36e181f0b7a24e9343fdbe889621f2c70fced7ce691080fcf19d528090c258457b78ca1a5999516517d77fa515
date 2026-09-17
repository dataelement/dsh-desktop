// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#include "lib/native/base/base.hh"
#include "call.hh"
#include "ffi.hh"
#include "type.hh"

#include <napi.h>

namespace K {

Napi::Function TypeObject::InitClass(InstanceData *instance)
{
    Napi::Env env = instance->env;
    Napi::Function constructor = DefineClass(env, "TypeObject", {}, instance);

    return constructor;
}

TypeObject::TypeObject(const Napi::CallbackInfo &info)
    : Napi::ObjectWrap<TypeObject>(info)
{
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0u].IsExternal()) [[unlikely]] {
        ThrowError<Napi::Error>(env, "Type objects cannot be constructed manually");
        return;
    }

    Napi::External<TypeInfo> external = info[0u].As<Napi::External<TypeInfo>>();
    type = external.Data();
}

void TypeObject::Finalize(Napi::BasicEnv env)
{
    node_api_delete_reference(env, *this);
    SuppressDestruct();
}

static inline bool IsIdentifierStart(char c)
{
    return IsAsciiAlpha(c) || c == '_';
}

static inline bool IsIdentifierChar(char c)
{
    return IsAsciiAlphaOrDigit(c) || c == '_';
}

static inline Span<const char> SplitIdentifier(Span<const char> str)
{
    Size offset = 0;

    if (str.len && IsIdentifierStart(str[0])) {
        offset++;

        while (offset < str.len && IsIdentifierChar(str[offset])) {
            offset++;
        }
    }

    Span<const char> token = str.Take(0, offset);
    return token;
}

int ResolveDirections(Span<const char> str)
{
    if (str == "_In_") {
        return 1;
    } else if (str == "_Out_") {
        return 2;
    } else if (str == "_Inout_") {
        return 3;
    } else {
        return 0;
    }
}

const TypeInfo *ResolveType(InstanceData *instance, napi_value value, int *out_directions)
{
    Napi::Env env = instance->env;

    // String?
    {
        char str[1024];
        size_t len;

        napi_status status = napi_get_value_string_utf8(env, value, str, K_SIZE(str), &len);

        if (status == napi_ok) {
            Span<const char> remain = MakeSpan(str, (Size)len);

            // Quick path for known types (int, float *, etc.)
            const TypeInfo *type = instance->types_map.FindValue(remain.ptr, nullptr);

            if (!type) {
                if (out_directions) {
                    Span<const char> prefix = SplitIdentifier(remain);
                    int directions = ResolveDirections(prefix);

                    if (directions) {
                        remain = remain.Take(prefix.len, remain.len - prefix.len);
                        remain = TrimStrLeft(remain);

                        *out_directions = directions;
                    } else {
                        *out_directions = 1;
                    }
                }

                type = ResolveType(instance, remain.ptr);

                if (!type) {
                    if (!env.IsExceptionPending()) {
                        ThrowError<Napi::TypeError>(env, "Unknown or invalid type name '%1'", str);
                    }
                    return nullptr;
                }

                // Cache for quick future access
                bool inserted;
                auto bucket = instance->types_map.InsertOrGetDefault(remain.ptr, &inserted);

                if (inserted) {
                    bucket->key = DuplicateString(remain, &instance->str_alloc).ptr;
                    bucket->value = type;
                }
            } else if (out_directions) {
                *out_directions = 1;
            }

            return type;
        }
    }

    napi_valuetype kind = GetKindOf(env, value);

    if (kind == napi_external && CheckValueTag(env, value, &DirectionMarker)) {
        Napi::External<TypeInfo> external = Napi::External<TypeInfo>(env, value);
        const TypeInfo *raw = external.Data();

        const TypeInfo *type = AlignDown(raw, 4);
        K_ASSERT(type);

        if (out_directions) {
            Size delta = (uint8_t *)raw - (uint8_t *)type;
            *out_directions = 1 + (int)delta;
        }

        return type;
    } else if (kind == napi_object && CheckValueTag(env, value, &TypeObjectMarker)) {
        TypeObject *defn = nullptr;
        NAPI_OK(napi_unwrap(env, value, (void **)&defn));

        if (out_directions) {
            *out_directions = 1;
        }
        return defn->GetType();
    } else {
        ThrowError<Napi::TypeError>(env, "Unexpected %1 value as type specifier, expected string or type", GetValueType(instance, value));
        return nullptr;
    }
}

const TypeInfo *ResolveType(InstanceData *instance, Span<const char> str)
{
    Napi::Env env = instance->env;

    // Each item can be > 0 for array or 0 for a pointer
    LocalArray<Size, 8> arrays;
    uint8_t disposables = 0;

    Span<const char> name;
    Span<const char> after;
    {
        Span<const char> remain = str;

        // Skip initial const qualifiers
        remain = TrimStrLeft(remain);
        while (SplitIdentifier(remain) == "const") {
            remain = remain.Take(6, remain.len - 6);
            remain = TrimStrLeft(remain);
        }
        remain = TrimStrLeft(remain);

        after = remain;

        // Consume one or more identifiers (e.g. unsigned int)
        for (;;) {
            after = TrimStrLeft(after);

            Span<const char> token = SplitIdentifier(after);
            if (!token.len)
                break;
            after = after.Take(token.len, after.len - token.len);
        }

        name = TrimStr(MakeSpan(remain.ptr, after.ptr - remain.ptr));
    }

    // Consume type indirections (pointer, array, etc.)
    while (after.len) {
        if (after[0] == '*') {
            after = after.Take(1, after.len - 1);

            if (!arrays.Available()) [[unlikely]] {
                ThrowError<Napi::Error>(env, "Too many type indirections");
                return nullptr;
            }

            arrays.Append(0);
        } else if (after[0] == '!') {
            after = after.Take(1, after.len - 1);
            disposables |= (1u << arrays.len);
        } else if (after[0] == '[') {
            after = after.Take(1, after.len - 1);

            Size len = 0;

            after = TrimStrLeft(after);
            if (!ParseInt(after, &len, 0, &after) || len < 0) [[unlikely]] {
                ThrowError<Napi::Error>(env, "Invalid array length");
                return nullptr;
            }
            after = TrimStrLeft(after);
            if (!after.len || after[0] != ']') [[unlikely]] {
                ThrowError<Napi::Error>(env, "Expected ']' after array length");
                return nullptr;
            }
            after = after.Take(1, after.len - 1);

            if (!arrays.Available()) [[unlikely]] {
                ThrowError<Napi::Error>(env, "Too many type indirections");
                return nullptr;
            }

            arrays.Append(len);
        } else if (SplitIdentifier(after) == "const") {
            after = after.Take(6, after.len - 6);
        } else {
            after = TrimStrRight(after);

            if (after.len) [[unlikely]] {
                ThrowError<Napi::Error>(env, "Unexpected character '%1' in type specifier", after[0]);
                return nullptr;
            }

            break;
        }

        after = TrimStrLeft(after);
    }

    const TypeInfo *type = instance->types_map.FindValue(name, nullptr);

    if (!type) {
        // Try with cleaned up spaces
        if (name.len < 256) {
            LocalArray<char, 256> buf;
            for (Size i = 0; i < name.len; i++) {
                char c = name[i];

                if (IsAsciiWhite(c)) {
                    buf.Append(' ');
                    while (++i < name.len && IsAsciiWhite(name[i]));
                    i--;
                } else {
                    buf.Append(c);
                }
            }

            type = instance->types_map.FindValue(buf, nullptr);
        }

        if (!type)
            return nullptr;
    }

    for (int i = 0;; i++) {
        if (disposables & (1u << i)) {
            if (type->primitive != PrimitiveKind::Pointer &&
                    type->primitive != PrimitiveKind::String &&
                    type->primitive != PrimitiveKind::String16 &&
                    type->primitive != PrimitiveKind::String32) [[unlikely]] {
                ThrowError<Napi::Error>(env, "Cannot create disposable type for non-pointer");
                return nullptr;
            }

            TypeInfo *copy = instance->types.AppendDefault();

            memcpy((void *)copy, (const void *)type, K_SIZE(*type));
            copy->name = Fmt(&instance->str_alloc, "<anonymous_%1>", instance->types.count).ptr;
            copy->defn = nullptr;
            K_ASSERT(!type->members.len);

            static_assert(!std::is_polymorphic_v<Napi::ObjectReference>);

            copy->dispose = [](InstanceData *instance, const TypeInfo *, const void *ptr) {
                free((void *)ptr);
                instance->stats.disposed++;
            };

            type = copy;
        }

        if (i >= arrays.len)
            break;
        Size len = arrays[i];

        if (len > 0) {
            if (type->primitive == PrimitiveKind::Void) [[unlikely]] {
                ThrowError<Napi::TypeError>(env, "Cannot make array of empty or incomplete type");
                return nullptr;
            }

            if (len > instance->config.max_type_size / type->size) {
                ThrowError<Napi::TypeError>(env, "Array length is too high (max = %1)", instance->config.max_type_size / type->size);
                return nullptr;
            }

            type = MakeArrayType(instance, type, len);
            K_ASSERT(type);
        } else {
            K_ASSERT(!len);

            type = MakePointerType(instance, type);
            K_ASSERT(type);
        }
    }

    return type;
}

static BufferConversion SelectBufferConversion(const TypeInfo *ref)
{
    switch (ref->primitive) {
        case PrimitiveKind::Void:
        case PrimitiveKind::Bool:
        case PrimitiveKind::Int8:
        case PrimitiveKind::UInt8:
        case PrimitiveKind::Int16:
        case PrimitiveKind::UInt16:
        case PrimitiveKind::Int32:
        case PrimitiveKind::UInt32:
        case PrimitiveKind::Int64:
        case PrimitiveKind::UInt64:
        case PrimitiveKind::String:
        case PrimitiveKind::String16:
        case PrimitiveKind::String32:
        case PrimitiveKind::Float32:
        case PrimitiveKind::Float64:
        case PrimitiveKind::Array:
        case PrimitiveKind::Pointer:
        case PrimitiveKind::Record:
        case PrimitiveKind::Union:
        case PrimitiveKind::Prototype:
        case PrimitiveKind::Callback: return BufferConversion::None;

        case PrimitiveKind::Int16S:
        case PrimitiveKind::UInt16S: return BufferConversion::Swap16;

        case PrimitiveKind::Int32S:
        case PrimitiveKind::UInt32S: return BufferConversion::Swap32;

        case PrimitiveKind::Int64S:
        case PrimitiveKind::UInt64S: return BufferConversion::Swap64;
    }

    K_UNREACHABLE();
}

TypeInfo *MakePointerType(InstanceData *instance, const TypeInfo *ref, int count)
{
    K_ASSERT(count >= 1);

    for (int i = 0; i < count; i++) {
        char name_buf[256];
        Fmt(name_buf, "%1%2*", ref->name, EndsWith(ref->name, "*") ? "" : " ");

        bool inserted;
        auto bucket = instance->types_map.InsertOrGetDefault(name_buf, &inserted);

        if (inserted) {
            TypeInfo *type = instance->types.AppendDefault();

            type->name = DuplicateString(name_buf, &instance->str_alloc).ptr;

            if (ref->primitive != PrimitiveKind::Prototype) {
                type->primitive = PrimitiveKind::Pointer;
                type->size = K_SIZE(void *);
                type->align = K_SIZE(void *);
                type->ref.type = ref;
                type->ref.stride = ref->size;
                type->ref.conversion = SelectBufferConversion(ref);
                type->hint = ref->hint;
            } else {
                type->primitive = PrimitiveKind::Callback;
                type->size = K_SIZE(void *);
                type->align = K_SIZE(void *);
                type->ref.type = instance->void_type; // Dummy
                type->proto = ref->proto;
            }

            bucket->key = type->name;
            bucket->value = type;
        }

        ref = bucket->value;
    }

    return (TypeInfo *)ref;
}

static TypeInfo *MakeArrayType(InstanceData *instance, const TypeInfo *ref, Size len, ArrayHint hint, bool insert)
{
    K_ASSERT(len >= 0);
    K_ASSERT(len <= instance->config.max_type_size / ref->size);

    TypeInfo *type = instance->types.AppendDefault();

    type->name = Fmt(&instance->str_alloc, "%1[%2]", ref->name, len).ptr;

    type->primitive = PrimitiveKind::Array;
    type->align = ref->align;
    type->size = (int32_t)(len * ref->size);
    type->ref.type = ref;
    type->ref.stride = ref->size;
    type->ref.conversion = SelectBufferConversion(ref);
    type->hint = hint;

    if (insert) {
        bool inserted;
        type = (TypeInfo *)*instance->types_map.InsertOrGet(type->name, type, &inserted);
        instance->types.RemoveLast(!inserted);
    }

    return type;
}

TypeInfo *MakeArrayType(InstanceData *instance, const TypeInfo *ref, Size len)
{
    return MakeArrayType(instance, ref, len, ref->hint, true);
}

TypeInfo *MakeArrayType(InstanceData *instance, const TypeInfo *ref, Size len, ArrayHint hint)
{
    return MakeArrayType(instance, ref, len, hint, false);
}

static const char *NameArrayHint(ArrayHint hint)
{
    switch (hint) {
        case ArrayHint::Array: return "Array";

        case ArrayHint::Int8Array:
        case ArrayHint::Uint8Array:
        case ArrayHint::Int16Array:
        case ArrayHint::Uint16Array:
        case ArrayHint::Int32Array:
        case ArrayHint::Uint32Array:
        case ArrayHint::BigInt64Array:
        case ArrayHint::BigUint64Array:
        case ArrayHint::Float32Array:
        case ArrayHint::Float64Array: return "Typed";

        case ArrayHint::Buffer: return "Buffer";

        case ArrayHint::String8:
        case ArrayHint::String16:
        case ArrayHint::String32: return "String";
    }

    K_UNREACHABLE();
}

napi_value WrapType(InstanceData *instance, const TypeInfo *type, bool freeze)
{
    Napi::Env env = instance->env;

    if (!type->defn) {
        Napi::External<TypeInfo> external = Napi::External<TypeInfo>::New(env, (TypeInfo *)type);
        Napi::Object defn = instance->construct_type.New({ external });
        SetValueTag(env, defn, &TypeObjectMarker);

        defn.Set("name", NewString(env, type->name));
        defn.Set("primitive", PrimitiveKindNames[(int)type->primitive]);
        defn.Set("size", NewInt(env, type->size));
        defn.Set("alignment", NewInt(env, type->align));
        defn.Set("disposable", NewBool(env, !!type->dispose));

        // Assign before to avoid possible recursion crash
        NAPI_OK(napi_create_reference(env, defn, 1, &type->defn));

        switch (type->primitive) {
            case PrimitiveKind::Void:
            case PrimitiveKind::Bool:
            case PrimitiveKind::Int8:
            case PrimitiveKind::UInt8:
            case PrimitiveKind::Int16:
            case PrimitiveKind::Int16S:
            case PrimitiveKind::UInt16:
            case PrimitiveKind::UInt16S:
            case PrimitiveKind::Int32:
            case PrimitiveKind::Int32S:
            case PrimitiveKind::UInt32:
            case PrimitiveKind::UInt32S:
            case PrimitiveKind::Int64:
            case PrimitiveKind::Int64S:
            case PrimitiveKind::UInt64:
            case PrimitiveKind::UInt64S:
            case PrimitiveKind::String:
            case PrimitiveKind::String16:
            case PrimitiveKind::String32:
            case PrimitiveKind::Float32:
            case PrimitiveKind::Float64: {} break;

            case PrimitiveKind::Array: {
                uint32_t len = type->size / type->ref.type->size;
                defn.Set("length", NewInt(env, len));
                defn.Set("hint", NameArrayHint(type->hint));
            } [[fallthrough]];
            case PrimitiveKind::Pointer: {
                napi_value ref = WrapType(instance, type->ref.type);
                defn.Set("ref", ref);
            } break;
            case PrimitiveKind::Record:
            case PrimitiveKind::Union: {
                Napi::Object members = Napi::Object::New(env);

                for (const RecordMember &member: type->members) {
                    Napi::Object obj = Napi::Object::New(env);

                    obj.Set("name", member.name);
                    obj.Set("type", WrapType(instance, member.type));
                    obj.Set("offset", member.offset);

                    members.Set(member.name, obj);
                }

                members.Freeze();
                defn.Set("members", members);
            } break;

            case PrimitiveKind::Prototype:
            case PrimitiveKind::Callback: {
                napi_value meta = DescribeFunction(instance, type->proto);
                defn.Set("proto", meta);
            } break;
        }

        if (freeze) {
            defn.Freeze();
        }
    }

    napi_value defn;
    NAPI_OK(napi_get_reference_value(env, type->defn, &defn));

    return defn;
}

static int AnalyseFlatRec(const TypeInfo *type, int offset, int count, FunctionRef<void(const TypeInfo *type, int offset, int count)> func)
{
    if (type->primitive == PrimitiveKind::Record) {
        for (int i = 0; i < count; i++) {
            for (const RecordMember &member: type->members) {
                offset = AnalyseFlatRec(member.type, offset, 1, func);
            }
        }
    } else if (type->primitive == PrimitiveKind::Union) {
        for (int i = 0; i < count; i++) {
            for (const RecordMember &member: type->members) {
                AnalyseFlatRec(member.type, offset, 1, func);
            }
        }
        offset += count;
    } else if (type->primitive == PrimitiveKind::Array) {
        count *= type->size / type->ref.type->size;
        offset = AnalyseFlatRec(type->ref.type, offset, count, func);
    } else {
        func(type, offset, count);
        offset += count;
    }

    return offset;
}

int AnalyseFlat(const TypeInfo *type, FunctionRef<void(const TypeInfo *type, int offset, int count)> func)
{
    return AnalyseFlatRec(type, 0, 1, func);
}

const TypeInfo *ReshapeAggregate(InstanceData *instance, const TypeInfo *type, const ReshapeConfig &config)
{
    K_ASSERT(type->defn);
    K_ASSERT(config.stride);

    if (!type->reshaped) {
        Napi::Env env = instance->env;

        TypeInfo *reshaped = nullptr;

        switch (type->primitive) {
            case PrimitiveKind::Record: {
                napi_value defn;
                NAPI_OK(napi_get_reference_value(env, type->defn, &defn));

                reshaped = instance->types.AppendDefault();

                memcpy((void *)reshaped, (const void *)type, K_SIZE(*type));
                memset((void *)&reshaped->members, 0, K_SIZE(reshaped->members));
                reshaped->members.Reserve(type->members.len);
                reshaped->size = 0;
                reshaped->fill = config.fill;
                NAPI_OK(napi_create_reference(env, defn, 1, &reshaped->defn));

                for (RecordMember member: type->members) {
                    member.offset = reshaped->size;
                    member.type = ReshapeAggregate(instance, member.type, config);

                    if (member.key) {
                        napi_value key;
                        NAPI_OK(napi_get_reference_value(env, member.key, &key));
                        NAPI_OK(napi_create_reference(env, key, 1, &member.key));
                    }

                    reshaped->members.Append(member);
                    reshaped->size += (int)AlignLen(member.type->size, config.stride);

                    member.key = nullptr;
                }
            } break;

            case PrimitiveKind::Union: {
                napi_value defn;
                NAPI_OK(napi_get_reference_value(env, type->defn, &defn));

                reshaped = instance->types.AppendDefault();

                memcpy((void *)reshaped, (const void *)type, K_SIZE(*type));
                memset((void *)&reshaped->members, 0, K_SIZE(reshaped->members));
                reshaped->members.Reserve(type->members.len);
                reshaped->size = 0;
                reshaped->fill = config.fill;
                NAPI_OK(napi_create_reference(env, defn, 1, &reshaped->defn));

                for (RecordMember member: type->members) {
                    member.type = ReshapeAggregate(instance, member.type, config);

                    if (member.key) {
                        napi_value key;
                        NAPI_OK(napi_get_reference_value(env, member.key, &key));
                        NAPI_OK(napi_create_reference(env, key, 1, &member.key));
                    }

                    reshaped->members.Append(member);
                    reshaped->size = std::max(reshaped->size, member.type->size);

                    member.key = nullptr;
                }

                Napi::Object construct = UnionValue::InitClass(instance, reshaped);
                NAPI_OK(napi_create_reference(env, construct, 1, &reshaped->construct));
            } break;

            case PrimitiveKind::Array: {
                reshaped = instance->types.AppendDefault();

                napi_value defn;
                NAPI_OK(napi_get_reference_value(env, type->defn, &defn));

                memcpy((void *)reshaped, (const void *)type, K_SIZE(*type));
                reshaped->ref.type = ReshapeAggregate(instance, reshaped->ref.type, config);
                reshaped->ref.stride = config.stride;
                reshaped->ref.conversion = config.f2d ? BufferConversion::FloatToDouble : reshaped->ref.conversion;
                reshaped->size = (type->size / type->ref.stride) * config.stride;
                reshaped->fill = config.fill;
                NAPI_OK(napi_create_reference(env, defn, 1, &reshaped->defn));
            } break;

            default: { reshaped = (TypeInfo *)(config.f2d ? instance->double_type : type); } break;
        }

        type->reshaped = reshaped;
    }

    return type->reshaped;
}

bool CanPassType(const TypeInfo *type, int directions)
{
    if (type->countedby)
        return false;

    if (directions & 2) {
        if (type->primitive == PrimitiveKind::Pointer)
            return true;
        if (type->primitive == PrimitiveKind::String)
            return true;
        if (type->primitive == PrimitiveKind::String16)
            return true;
        if (type->primitive == PrimitiveKind::String32)
            return true;

        return false;
    } else {
        if (!type->size)
            return false;
        if (type->primitive == PrimitiveKind::Array)
            return false;
        if (type->primitive == PrimitiveKind::Prototype)
            return false;
        if (type->primitive == PrimitiveKind::Callback && type->proto->variadic)
            return false;

        return true;
    }
}

bool CanReturnType(const TypeInfo *type)
{
    if (type->countedby)
        return false;

    if (!type->size && type != type->instance->void_type)
        return false;
    if (type->primitive == PrimitiveKind::Array)
        return false;
    if (type->primitive == PrimitiveKind::Prototype)
        return false;

    return true;
}

bool CanStoreType(const TypeInfo *type)
{
    if (!type->size)
        return false;
    if (type->primitive == PrimitiveKind::Prototype)
        return false;
    if (type->primitive == PrimitiveKind::Callback && type->proto->variadic)
        return false;

    return true;
}

const char *GetValueType(const InstanceData *instance, napi_value value)
{
    Napi::Env env = instance->env;
    napi_valuetype kind = GetKindOf(env, value);

    if (kind == napi_external) {
        if (CheckValueTag(env, value, &CastMarker)) {
            Napi::External<ValueCast> external = Napi::External<ValueCast>(env, value);
            ValueCast *cast = external.Data();

            return cast->type->name;
        }

        if (CheckValueTag(env, value, &LibraryHandleMarker))
            return "LibraryHandle";
        if (CheckValueTag(env, value, &TypeObjectMarker))
            return "TypeObject";

        if (CheckValueTag(env, value, &UnionValueMarker)) {
            UnionValue *u = nullptr;
            napi_unwrap(env, value, (void **)&u);

            return u->GetType()->name;
        }

        for (const TypeInfo &type: instance->types) {
            if (type.ref.type && CheckValueTag(env, value, type.ref.type))
                return type.name;
        }
    }

    if (IsArray(env, value)) {
        return "Array";
    } else if (IsTypedArray(env, value)) {
        Napi::TypedArray array = Napi::TypedArray(env, value);

        switch (array.TypedArrayType()) {
            case napi_int8_array: return "Int8Array";
            case napi_uint8_array: return "Uint8Array";
            case napi_uint8_clamped_array: return "Uint8ClampedArray";
            case napi_int16_array: return "Int16Array";
            case napi_uint16_array: return "Uint16Array";
            case napi_int32_array: return "Int32Array";
            case napi_uint32_array: return "Uint32Array";
            case napi_float16_array: return "Float16Array";
            case napi_float32_array: return "Float32Array";
            case napi_float64_array: return "Float64Array";
            case napi_bigint64_array: return "BigInt64Array";
            case napi_biguint64_array: return "BigUint64Array";
        }
    } else if (IsArrayBuffer(env, value)) {
        return "ArrayBuffer";
    } else if (IsBuffer(env, value)) {
        return "Buffer";
    }

    switch (kind) {
        case napi_undefined: return "Undefined";
        case napi_null: return "Null";
        case napi_boolean: return "Boolean";
        case napi_number: return "Number";
        case napi_string: return "String";
        case napi_symbol: return "Symbol";
        case napi_object: return "Object";
        case napi_function: return "Function";
        case napi_external: return "External";
        case napi_bigint: return "BigInt";
    }

    // This should not be possible, but who knows...
    return "Unknown";
}

}
