// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#include "lib/native/base/base.hh"
#include "call.hh"
#include "ffi.hh"
#include "type.hh"
#include "util.hh"

#include <napi.h>

namespace K {

Napi::Function UnionValue::InitClass(InstanceData *instance, const TypeInfo *type)
{
    K_ASSERT(type->primitive == PrimitiveKind::Union);

    Napi::Env env = instance->env;

    // node-addon-api wants std::vector
    std::vector<Napi::ClassPropertyDescriptor<UnionValue>> properties;
    properties.reserve(type->members.len);

    for (Size i = 0; i < type->members.len; i++) {
        const RecordMember &member = type->members[i];

        napi_property_attributes attr = (napi_property_attributes)(napi_writable | napi_enumerable);
        Napi::ClassPropertyDescriptor<UnionValue> prop = InstanceAccessor(member.name, &UnionValue::Getter,
                                                                          &UnionValue::Setter, attr, (void *)i);

        properties.push_back(prop);
    }

    Napi::Function constructor = DefineClass(env, type->name, properties, (void *)type);
    return constructor;
}

UnionValue::UnionValue(const Napi::CallbackInfo &info)
    : Napi::ObjectWrap<UnionValue>(info), type((const TypeInfo *)info.Data())
{
    Napi::Env env = info.Env();

    K_ASSERT(type->instance);
    instance = type->instance;

    if (info.Length() >= 1) {
        if (!info[0].IsExternal()) [[unlikely]] {
            ThrowError<Napi::Error>(env, "Union objects cannot be constructed manually");
            return;
        }

        Napi::External<void> external = info[0].As<Napi::External<void>>();
        const uint8_t *ptr = (const uint8_t *)external.Data();

        SetRaw(ptr);
    }
}

void UnionValue::Finalize(Napi::BasicEnv env)
{
    node_api_delete_reference(env, *this);
    SuppressDestruct();
}

void UnionValue::SetRaw(const uint8_t *ptr)
{
    raw.RemoveFrom(0);
    raw.Append(MakeSpan(ptr, type->size));

    Value().Set(instance->active_symbol.Value(), Env().Undefined());
    active_idx = -1;
}

Napi::Value UnionValue::Getter(const Napi::CallbackInfo &info)
{
    Size idx = (Size)info.Data();
    const RecordMember &member = type->members[idx];

    napi_value value = nullptr;

    if (idx == active_idx) {
        value = Value().Get(instance->active_symbol.Value());
    } else {
        Napi::Env env = info.Env();

        if (!raw.len) [[unlikely]] {
            ThrowError<Napi::Error>(env, "Cannont convert %1 union value", active_idx < 0 ? "empty" : "assigned");
            return env.Null();
        }

        value = Decode(instance, raw.ptr, member.type);

        Value().Set(instance->active_symbol.Value(), value);
        active_idx = idx;
    }

    K_ASSERT(value);
    return Napi::Value(info.Env(), value);
}

void UnionValue::Setter(const Napi::CallbackInfo &info, const Napi::Value &value)
{
    Size idx = (Size)info.Data();

    Value().Set(instance->active_symbol.Value(), value);
    active_idx = idx;

    raw.Clear();
}

void SetValueTag(napi_env env, napi_value value, const void *marker)
{
    static_assert(K_SIZE(TypeInfo) >= 16);

    // We used to make a temporary tag on the stack with lower set to a constant value and
    // upper to the pointer address, but this broke in Node 20.12 and Node 21.6 due to ExternalWrapper
    // storing a pointer to the tag and not the tag value itself (which seems wrong, but anyway).
    //
    // Since this is no longer an option, we just type alias whatever marker points to to napi_type_tag.
    // This may seem gross, but we disable strict aliasing anyway, so as long as what marker points
    // to is bigger than 16 bytes and does not change, it works!
    // Which holds true for us: the main thing pointed to is TypeInfo, which is constant and big enough,
    // and the few other markers we use, such as CastMarker, are actual const napi_type_tag structs.
    const napi_type_tag *tag = (const napi_type_tag *)marker;

    NAPI_OK(napi_type_tag_object(env, value, tag));
}

bool CheckValueTag(napi_env env, napi_value value, const void *marker)
{
    K_ASSERT(IsObject(env, value) || GetKindOf(env, value) == napi_external);

    bool match = false;

    const napi_type_tag *tag = (const napi_type_tag *)marker;
    napi_check_object_type_tag(env, value, tag, &match);

    return match;
}

static K_FORCE_INLINE napi_value NewStringUTF32(Napi::Env env, const char32_t *ptr, Size len)
{
    static const char16_t ReplacementChar = 0xFFFD;

    HeapArray<char16_t> buf;
    buf.Reserve(len * 2);

    for (Size i = 0; i < len; i++) {
        char32_t uc = ptr[i];

        if (uc <= 0xFFFF) {
            if (uc < 0xD800 || uc > 0xDFFF) {
                buf.Append((char16_t)uc);
            } else {
                buf.Append(ReplacementChar);
            }
        } else if (uc <= 0x10FFFF) {
            uc -= 0x0010000UL;

            buf.Append((char16_t)((uc >> 10) + 0xD800));
            buf.Append((char16_t)((uc & 0x3FFul) + 0xDC00));
        } else {
            buf.Append(ReplacementChar);
        }
    }

    return NewString(env, buf.ptr, buf.len);
}

napi_value NewString(Napi::Env env, const char32_t *ptr, Size len)
{
    if (ptr) {
        return NewStringUTF32(env, ptr, len);
    } else {
        napi_value value;
        NAPI_OK(napi_get_null(env, &value));
        return value;
    }
}

napi_value NewString(Napi::Env env, const char32_t *ptr)
{
    if (ptr) {
        Size len =  NullTerminatedLength(ptr);
        return NewStringUTF32(env, ptr, len);
    } else {
        napi_value value;
        NAPI_OK(napi_get_null(env, &value));
        return value;
    }
}

static uint32_t DecodeDynamicLength(const uint8_t *origin, const RecordMember &by)
{
    const uint8_t *src = origin + by.offset;

    switch (by.type->primitive) {
        case PrimitiveKind::Int8: {
            int8_t i = *(int8_t *)src;
            return (uint32_t)i;
        } break;
        case PrimitiveKind::UInt8: {
            uint8_t u = *(uint8_t *)src;
            return (uint32_t)u;
        } break;
        case PrimitiveKind::Int16: {
            int16_t i;
            memcpy(&i, src, 2);
            return (uint32_t)i;
        } break;
        case PrimitiveKind::Int16S: {
            int16_t i;
            memcpy(&i, src, 2);
            return (uint32_t)ReverseBytes(i);
        } break;
        case PrimitiveKind::UInt16: {
            uint16_t u;
            memcpy(&u, src, 2);
            return (uint32_t)u;
        } break;
        case PrimitiveKind::UInt16S: {
            uint16_t u;
            memcpy(&u, src, 2);
            return (uint32_t)ReverseBytes(u);
        } break;
        case PrimitiveKind::Int32: {
            int32_t i;
            memcpy(&i, src, 4);
            return (uint32_t)i;
        } break;
        case PrimitiveKind::Int32S: {
            int32_t i;
            memcpy(&i, src, 4);
            return (uint32_t)ReverseBytes(i);
        } break;
        case PrimitiveKind::UInt32: {
            uint32_t u;
            memcpy(&u, src, 4);
            return (uint32_t)u;
        } break;
        case PrimitiveKind::UInt32S: {
            uint32_t u;
            memcpy(&u, src, 4);
            return (uint32_t)ReverseBytes(u);
        } break;
        case PrimitiveKind::Int64: {
            int64_t i;
            memcpy(&i, src, 8);
            return (uint32_t)i;
        } break;
        case PrimitiveKind::Int64S: {
            int64_t i;
            memcpy(&i, src, 8);
            return (uint32_t)ReverseBytes(i);
        } break;
        case PrimitiveKind::UInt64: {
            uint64_t u;
            memcpy(&u, src, 8);
            return (uint32_t)u;
        } break;
        case PrimitiveKind::UInt64S: {
            uint64_t u;
            memcpy(&u, src, 8);
            return (uint32_t)ReverseBytes(u);
        } break;

        case PrimitiveKind::Void:
        case PrimitiveKind::Bool:
        case PrimitiveKind::String:
        case PrimitiveKind::String16:
        case PrimitiveKind::String32:
        case PrimitiveKind::Pointer:
        case PrimitiveKind::Callback:
        case PrimitiveKind::Record:
        case PrimitiveKind::Union:
        case PrimitiveKind::Array:
        case PrimitiveKind::Float32:
        case PrimitiveKind::Float64:
        case PrimitiveKind::Prototype: { K_UNREACHABLE(); } break;
    }

    K_UNREACHABLE();
}

template <typename SetFunc>
static K_FORCE_INLINE void DecodeObject(InstanceData *instance, const uint8_t *origin, const TypeInfo *type, SetFunc set)
{
    K_ASSERT(type->primitive == PrimitiveKind::Record);

    Napi::Env env = instance->env;
    Span<const RecordMember> members = type->members;

    for (Size i = 0; i < members.len; i++) {
        const RecordMember &member = members[i];
        const uint8_t *src = origin + member.offset;

        switch (member.type->primitive) {
            case PrimitiveKind::Void: { K_UNREACHABLE(); } break;

            case PrimitiveKind::Bool: {
                bool b = *(bool *)src;
                set(i, member, NewBool(env, b));
            } break;
            case PrimitiveKind::Int8: {
                int8_t v = *(int8_t *)src;
                set(i, member, NewInt(env, v));
            } break;
            case PrimitiveKind::UInt8: {
                uint8_t v = *(uint8_t *)src;
                set(i, member, NewInt(env, v));
            } break;
            case PrimitiveKind::Int16: {
                int16_t v;
                memcpy(&v, src, 2);
                set(i, member, NewInt(env, v));
            } break;
            case PrimitiveKind::Int16S: {
                int16_t v;
                memcpy(&v, src, 2);
                set(i, member, NewInt(env, ReverseBytes(v)));
            } break;
            case PrimitiveKind::UInt16: {
                uint16_t v;
                memcpy(&v, src, 2);
                set(i, member, NewInt(env, v));
            } break;
            case PrimitiveKind::UInt16S: {
                uint16_t v;
                memcpy(&v, src, 2);
                set(i, member, NewInt(env, ReverseBytes(v)));
            } break;
            case PrimitiveKind::Int32: {
                int32_t v;
                memcpy(&v, src, 4);
                set(i, member, NewInt(env, v));
            } break;
            case PrimitiveKind::Int32S: {
                int32_t v;
                memcpy(&v, src, 4);
                set(i, member, NewInt(env, ReverseBytes(v)));
            } break;
            case PrimitiveKind::UInt32: {
                uint32_t v;
                memcpy(&v, src, 4);
                set(i, member, NewInt(env, v));
            } break;
            case PrimitiveKind::UInt32S: {
                uint32_t v;
                memcpy(&v, src, 4);
                set(i, member, NewInt(env, ReverseBytes(v)));
            } break;
            case PrimitiveKind::Int64: {
                int64_t v;
                memcpy(&v, src, 8);
                set(i, member, NewInt(env, v));
            } break;
            case PrimitiveKind::Int64S: {
                int64_t v;
                memcpy(&v, src, 8);
                set(i, member, NewInt(env, ReverseBytes(v)));
            } break;
            case PrimitiveKind::UInt64: {
                uint64_t v;
                memcpy(&v, src, 8);
                set(i, member, NewInt(env, v));
            } break;
            case PrimitiveKind::UInt64S: {
                uint64_t v;
                memcpy(&v, src, 8);
                set(i, member, NewInt(env, ReverseBytes(v)));
            } break;
            case PrimitiveKind::String: {
                const char *str;
                memcpy(&str, src, K_SIZE(void *));
                set(i, member, NewString(env, str));

                if (member.type->dispose) {
                    member.type->dispose(instance, member.type, str);
                }
            } break;
            case PrimitiveKind::String16: {
                const char16_t *str16;
                memcpy(&str16, src, K_SIZE(void *));
                set(i, member, NewString(env, str16));

                if (member.type->dispose) {
                    member.type->dispose(instance, member.type, str16);
                }
            } break;
            case PrimitiveKind::String32: {
                const char32_t *str32;
                memcpy(&str32, src, K_SIZE(void *));
                set(i, member, NewString(env, str32));
            } break;
            case PrimitiveKind::Pointer: {
                void *ptr2;
                memcpy(&ptr2, src, K_SIZE(void *));

                if (member.countedby >= 0) {
                    const RecordMember &by = members[member.countedby];
                    uint32_t len = DecodeDynamicLength(origin, by);

                    napi_value value = DecodeArray(instance, (const uint8_t *)ptr2, member.type, len);
                    set(i, member, value);
                } else {
                    napi_value p = WrapPointer(env, ptr2);
                    set(i, member, p);
                }

                if (member.type->dispose) {
                    member.type->dispose(instance, member.type, ptr2);
                }
            } break;
            case PrimitiveKind::Callback: {
                void *ptr2;
                memcpy(&ptr2, src, K_SIZE(void *));

                napi_value p = WrapPointer(env, ptr2);
                set(i, member, p);

                if (member.type->dispose) {
                    member.type->dispose(instance, member.type, ptr2);
                }
            } break;
            case PrimitiveKind::Record:
            case PrimitiveKind::Union: {
                napi_value obj2 = DecodeObject(instance, src, member.type);
                set(i, member, obj2);
            } break;
            case PrimitiveKind::Array: {
                if (member.countedby >= 0) {
                    const RecordMember &by = members[member.countedby];

                    uint32_t len = DecodeDynamicLength(origin, by);
                    uint32_t max = member.type->size / member.type->ref.type->size;

                    // Silently truncate result
                    len = std::min(len, max);

                    napi_value value = DecodeArray(instance, src, member.type, len);
                    set(i, member, value);
                } else {
                    napi_value value = DecodeArray(instance, src, member.type);
                    set(i, member, value);
                }
            } break;
            case PrimitiveKind::Float32: {
                float f;
                memcpy(&f, src, 4);
                set(i, member, NewFloat(env, f));
            } break;
            case PrimitiveKind::Float64: {
                double d;
                memcpy(&d, src, 8);
                set(i, member, NewFloat(env, d));
            } break;

            case PrimitiveKind::Prototype: { K_UNREACHABLE(); } break;
        }
    }
}

napi_value DecodeObject(InstanceData *instance, const uint8_t *origin, const TypeInfo *type)
{
    Napi::Env env = instance->env;

    // We can't decode unions because we don't know which member is valid
    if (type->primitive == PrimitiveKind::Union) {
        Napi::Function construct;
        {
            napi_value value;
            NAPI_OK(napi_get_reference_value(env, type->construct, &value));

            construct = Napi::Function(env, value);
        }

        Napi::External<void> external = Napi::External<void>::New(env, (void *)origin);
        Napi::Object wrapper = construct.New({ external }).As<Napi::Object>();
        SetValueTag(env, wrapper, &UnionValueMarker);

        return wrapper;
    }

    // Only supported in recent Node versions, and still experimental at this time
    if (node_api_create_object_with_properties && type->members.len <= 256) {
        napi_value properties[256];
        napi_value values[256];

        DecodeObject(instance, origin, type, [&](Size i, const RecordMember &member, napi_value value) {
            NAPI_OK(napi_get_reference_value(env, member.key, &properties[i]));
            values[i] = value;
        });

        napi_value obj;
        NAPI_OK(node_api_create_object_with_properties(env, instance->object_constructor.Value(), properties, values, type->members.len, &obj));

        return obj;
    }

    Napi::Object obj = Napi::Object::New(env);
    DecodeObject(instance, obj, origin, type);

    return obj;
}

void DecodeObject(InstanceData *instance, napi_value obj, const uint8_t *origin, const TypeInfo *type)
{
    Napi::Env env = instance->env;

    if (node_api_create_property_key_utf8) {
        DecodeObject(instance, origin, type, [&](Size, const RecordMember &member, napi_value value) {
            napi_value key = nullptr;
            napi_get_reference_value(env, member.key, &key);

            NAPI_OK(napi_set_property(env, obj, key, value));
        });
    } else {
        DecodeObject(instance, origin, type, [&](Size, const RecordMember &member, napi_value value) {
            NAPI_OK(napi_set_named_property(env, obj, member.name, value));
        });
    }
}

napi_value DecodeArray(InstanceData *instance, const uint8_t *origin, const TypeInfo *type)
{
    K_ASSERT(type->primitive == PrimitiveKind::Array);

    uint32_t len = type->size / type->ref.stride;
    return DecodeArray(instance, origin, type, len);
}

napi_value DecodeArray(InstanceData *instance, const uint8_t *origin, const TypeInfo *type, uint32_t len)
{
    K_ASSERT(type->primitive == PrimitiveKind::Array || type->primitive == PrimitiveKind::Pointer);

    Napi::Env env = instance->env;
    const TypeInfo *ref = type->ref.type;
    int32_t stride = type->ref.stride;

#define POP_TYPEDARRAY(TypedArrayType) \
            do { \
                napi_value buffer = nullptr; \
                napi_value array = nullptr; \
                void *data; \
                 \
                NAPI_OK(napi_create_arraybuffer(env, (size_t)len * ref->size, &data, &buffer)); \
                NAPI_OK(napi_create_typedarray(env, (TypedArrayType), (size_t)len, buffer, 0, &array)); \
                 \
                Span<uint8_t> view = MakeSpan((uint8_t *)data, (Size)len * ref->size); \
                DecodeBuffer(view, origin, type); \
                 \
                return array; \
            } while (false)

    switch (type->hint) {
        case ArrayHint::Array: {
            Napi::Array array = Napi::Array::New(env);
            DecodeElements(instance, array, origin, type, len);

            return array;
        } break;

        case ArrayHint::Int8Array: { POP_TYPEDARRAY(napi_int8_array); } break;
        case ArrayHint::Uint8Array: { POP_TYPEDARRAY(napi_uint8_array); } break;
        case ArrayHint::Int16Array: { POP_TYPEDARRAY(napi_int16_array); } break;
        case ArrayHint::Uint16Array: { POP_TYPEDARRAY(napi_uint16_array); } break;
        case ArrayHint::Int32Array: { POP_TYPEDARRAY(napi_int32_array); } break;
        case ArrayHint::Uint32Array: { POP_TYPEDARRAY(napi_uint32_array); } break;
        case ArrayHint::BigInt64Array: { POP_TYPEDARRAY(napi_bigint64_array); } break;
        case ArrayHint::BigUint64Array: { POP_TYPEDARRAY(napi_biguint64_array); } break;
        case ArrayHint::Float32Array: { POP_TYPEDARRAY(napi_float32_array); } break;
        case ArrayHint::Float64Array: { POP_TYPEDARRAY(napi_float64_array); } break;

        case ArrayHint::Buffer: {
            napi_value buffer;
            void *data;

            NAPI_OK(napi_create_buffer(env, (size_t)len * ref->size, &data, &buffer));

            Span<uint8_t> view = MakeSpan((uint8_t *)data, (Size)len * ref->size);
            DecodeBuffer(view, origin, type);

            return buffer;
        } break;

        case ArrayHint::String8: {
            K_ASSERT(stride == ref->size);

            const char *ptr = (const char *)origin;
            size_t count = strnlen(ptr, (size_t)len);

            return NewString(env, ptr, count);
        } break;

        case ArrayHint::String16: {
            K_ASSERT(stride == ref->size);

            const char16_t *ptr = (const char16_t *)origin;
            Size count = NullTerminatedLength(ptr, len);

            return NewString(env, ptr, count);
        } break;

        case ArrayHint::String32: {
            K_ASSERT(stride == ref->size);

            const char32_t *ptr = (const char32_t *)origin;
            Size count = NullTerminatedLength(ptr, len);

            return NewString(env, ptr, count);
        } break;
    }

    K_UNREACHABLE();
}

void DecodeElements(InstanceData *instance, napi_value array, const uint8_t *origin, const TypeInfo *type, uint32_t len)
{
    K_ASSERT(IsArray(instance->env, array));

    Napi::Env env = instance->env;
    const TypeInfo *ref = type->ref.type;
    int32_t stride = type->ref.stride;

    Size offset = 0;

#define POP_ARRAY(SetCode) \
        do { \
            for (uint32_t i = 0; i < len; i++) { \
                const uint8_t *src = origin + offset; \
                SetCode \
                offset += stride; \
            } \
        } while (false)

#define POP_INTEGERS(CType) \
        do { \
            POP_ARRAY({ \
                CType v = *(CType *)src; \
                napi_set_element(env, array, i, NewInt(env, v)); \
            }); \
        } while (false)
#define POP_INTEGERS_SWAP(CType) \
        do { \
            POP_ARRAY({ \
                CType v = *(CType *)src; \
                napi_set_element(env, array, i, NewInt(env, ReverseBytes(v))); \
            }); \
        } while (false)

    switch (ref->primitive) {
        case PrimitiveKind::Void: { K_UNREACHABLE(); } break;

        case PrimitiveKind::Bool: {
            POP_ARRAY({
                bool b = *(bool *)src;
                napi_set_element(env, array, i, NewBool(env, b));
            });
        } break;
        case PrimitiveKind::Int8: { POP_INTEGERS(int8_t); } break;
        case PrimitiveKind::UInt8: { POP_INTEGERS(uint8_t); } break;
        case PrimitiveKind::Int16: { POP_INTEGERS(int16_t); } break;
        case PrimitiveKind::Int16S: { POP_INTEGERS_SWAP(int16_t); } break;
        case PrimitiveKind::UInt16: { POP_INTEGERS(uint16_t); } break;
        case PrimitiveKind::UInt16S: { POP_INTEGERS_SWAP(uint16_t); } break;
        case PrimitiveKind::Int32: { POP_INTEGERS(int32_t); } break;
        case PrimitiveKind::Int32S: { POP_INTEGERS_SWAP(int32_t); } break;
        case PrimitiveKind::UInt32: { POP_INTEGERS(uint32_t); } break;
        case PrimitiveKind::UInt32S: { POP_INTEGERS_SWAP(uint32_t); } break;
        case PrimitiveKind::Int64: { POP_INTEGERS(int64_t); } break;
        case PrimitiveKind::Int64S: { POP_INTEGERS_SWAP(int64_t); } break;
        case PrimitiveKind::UInt64: { POP_INTEGERS(uint64_t); } break;
        case PrimitiveKind::UInt64S: { POP_INTEGERS_SWAP(uint64_t); } break;
        case PrimitiveKind::String: {
            POP_ARRAY({
                const char *str = *(const char **)src;
                napi_set_element(env, array, i, NewString(env, str));

                if (ref->dispose) {
                    ref->dispose(instance, ref, str);
                }
            });
        } break;
        case PrimitiveKind::String16: {
            POP_ARRAY({
                const char16_t *str16 = *(const char16_t **)src;
                napi_set_element(env, array, i, NewString(env, str16));

                if (ref->dispose) {
                    ref->dispose(instance, ref, str16);
                }
            });
        } break;
        case PrimitiveKind::String32: {
            POP_ARRAY({
                const char32_t *str32 = *(const char32_t **)src;
                napi_set_element(env, array, i, NewString(env, str32));

                if (ref->dispose) {
                    ref->dispose(instance, ref, str32);
                }
            });
        } break;
        case PrimitiveKind::Pointer: {
            POP_ARRAY({
                void *ptr2 = *(void **)src;

                napi_value p = WrapPointer(env, ptr2);
                napi_set_element(env, array, i, p);

                if (ref->dispose) {
                    ref->dispose(instance, ref, ptr2);
                }
            });
        } break;
        case PrimitiveKind::Callback: {
            POP_ARRAY({
                void *ptr2 = *(void **)src;

                napi_value p = WrapPointer(env, ptr2);
                napi_set_element(env, array, i, p);

                if (ref->dispose) {
                    ref->dispose(instance, ref, ptr2);
                }
            });
        } break;
        case PrimitiveKind::Record:
        case PrimitiveKind::Union: {
            POP_ARRAY({
                napi_value obj = DecodeObject(instance, src, ref);
                napi_set_element(env, array, i, obj);
            });
        } break;
        case PrimitiveKind::Array: {
            POP_ARRAY({
                napi_value value = DecodeArray(instance, src, ref);
                napi_set_element(env, array, i, value);
            });
        } break;
        case PrimitiveKind::Float32: {
            POP_ARRAY({
                float f;
                memcpy(&f, src, 4);

                napi_set_element(env, array, i, NewFloat(env, f));
            });
        } break;
        case PrimitiveKind::Float64: {
            POP_ARRAY({
                double d;
                memcpy(&d, src, 8);

                napi_set_element(env, array, i, NewFloat(env, d));
            });
        } break;

        case PrimitiveKind::Prototype: { K_UNREACHABLE(); } break;
    }

#undef POP_INTEGERS_SWAP
#undef POP_INTEGERS

#undef POP_ARRAY
}

void DecodeBuffer(Span<uint8_t> buffer, const uint8_t *origin, const TypeInfo *type)
{
    const TypeInfo *ref = type->ref.type;
    int32_t stride = type->ref.stride;

#define SWAP(CType) \
        do { \
            const uint8_t *src = origin; \
            uint8_t *dest = buffer.ptr; \
            uint8_t *end = buffer.end(); \
             \
            while (dest < end) { \
                *(CType *)dest = ReverseBytes(*(CType *)src); \
                 \
                src += stride; \
                dest += K_SIZE(CType); \
            } \
        } while (false)

    switch (type->ref.conversion) {
        case BufferConversion::None: {
            if (stride == ref->size) {
                // Go fast if possible. Brrrrr!
                MemCpy(buffer.ptr, origin, (size_t)buffer.len);
            } else {
                const uint8_t *src = origin;
                uint8_t *dest = buffer.ptr;
                uint8_t *end = buffer.end();

                while (dest < end) {
                    memcpy(dest, src, ref->size);

                    src += stride;
                    dest += ref->size;
                }
            }
        } break;

        case BufferConversion::Swap16: { SWAP(uint16_t); } break;
        case BufferConversion::Swap32: { SWAP(uint32_t); } break;
        case BufferConversion::Swap64: { SWAP(uint64_t); } break;

        case BufferConversion::FloatToDouble: {
            K_ASSERT(stride == 8);

            const uint8_t *src = origin;
            uint8_t *dest = buffer.ptr;
            uint8_t *end = buffer.end();

            while (dest < end) {
                *(float *)dest = *(double *)src;

                src += 8;
                dest += 4;
            }
        } break;
    }

#undef SWAP
}

napi_value Decode(InstanceData *instance, const uint8_t *ptr, const TypeInfo *type)
{
    Napi::Env env = instance->env;

#define RETURN_INT(Type, NewCall) \
        do { \
            Type v = *(Type *)ptr; \
            return NewCall(env, v); \
        } while (false)
#define RETURN_INT_SWAP(Type, NewCall) \
        do { \
            Type v = ReverseBytes(*(Type *)ptr); \
            return NewCall(env, v); \
        } while (false)

    switch (type->primitive) {
        case PrimitiveKind::Void: {
            ThrowError<Napi::TypeError>(env, "Cannot decode value of type %1", type->name);
            return env.Null();
        } break;

        case PrimitiveKind::Bool: {
            bool v = *(bool *)ptr;
            return NewBool(env, v);
        } break;
        case PrimitiveKind::Int8: { RETURN_INT(int8_t, NewInt); } break;
        case PrimitiveKind::UInt8: { RETURN_INT(uint8_t, NewInt); } break;
        case PrimitiveKind::Int16: { RETURN_INT(int16_t, NewInt); } break;
        case PrimitiveKind::Int16S: { RETURN_INT_SWAP(int16_t, NewInt); } break;
        case PrimitiveKind::UInt16: { RETURN_INT(uint16_t, NewInt); } break;
        case PrimitiveKind::UInt16S: { RETURN_INT_SWAP(uint16_t, NewInt); } break;
        case PrimitiveKind::Int32: { RETURN_INT(int32_t, NewInt); } break;
        case PrimitiveKind::Int32S: { RETURN_INT_SWAP(int32_t, NewInt); } break;
        case PrimitiveKind::UInt32: { RETURN_INT(uint32_t, NewInt); } break;
        case PrimitiveKind::UInt32S: { RETURN_INT_SWAP(uint32_t, NewInt); } break;
        case PrimitiveKind::Int64: { RETURN_INT(int64_t, NewInt); } break;
        case PrimitiveKind::Int64S: { RETURN_INT_SWAP(int64_t, NewInt); } break;
        case PrimitiveKind::UInt64: { RETURN_INT(uint64_t, NewInt); } break;
        case PrimitiveKind::UInt64S: { RETURN_INT_SWAP(uint64_t, NewInt); } break;
        case PrimitiveKind::String: {
            const char *str = *(const char **)ptr;
            return NewString(env, str);
        } break;
        case PrimitiveKind::String16: {
            const char16_t *str16 = *(const char16_t **)ptr;
            return NewString(env, str16);
        } break;
        case PrimitiveKind::String32: {
            const char32_t *str32 = *(const char32_t **)ptr;
            return NewString(env, str32);
        } break;
        case PrimitiveKind::Pointer: {
            void *ptr2 = *(void **)ptr;
            return WrapPointer(env, ptr2);
        } break;
        case PrimitiveKind::Callback: {
            void *ptr2 = *(void **)ptr;
            return WrapPointer(env, ptr2);
        } break;
        case PrimitiveKind::Record:
        case PrimitiveKind::Union: { return DecodeObject(instance, ptr, type); } break;
        case PrimitiveKind::Array: {
            napi_value array = DecodeArray(instance, ptr, type);
            return array;
        } break;
        case PrimitiveKind::Float32: {
            float f;
            memcpy(&f, ptr, 4);

            return NewFloat(env, f);
        } break;
        case PrimitiveKind::Float64: {
            double d;
            memcpy(&d, ptr, 8);

            return NewFloat(env, d);
        } break;

        case PrimitiveKind::Prototype: {
            const FunctionInfo *proto = type->proto;
            K_ASSERT(!proto->variadic);
            K_ASSERT(!proto->lib);

            FunctionInfo *func = new FunctionInfo();
            K_DEFER { func->Unref(); };

            memcpy((void *)func, proto, K_SIZE(*proto));
            memset((void *)&func->parameters, 0, K_SIZE(func->parameters));
            memset((void *)&func->plan, 0, K_SIZE(func->plan));

            func->name = "<anonymous>";
            func->native = (void *)ptr;
            func->parameters = proto->parameters;
            func->plan = proto->plan;

            return WrapFunction(instance, func);
        } break;
    }

#undef RETURN_INT_SWAP
#undef RETURN_INT

    return env.Null();
}

bool DetectCallConvention(Span<const char> name, CallConvention *out_convention)
{
    if (name == "__cdecl") {
        *out_convention = CallConvention::Cdecl;
        return true;
    } else if (name == "__stdcall") {
        *out_convention = CallConvention::Stdcall;
        return true;
    } else if (name == "__fastcall") {
        *out_convention = CallConvention::Fastcall;
        return true;
    } else if (name == "__thiscall") {
        *out_convention = CallConvention::Thiscall;
        return true;
    } else {
        return false;
    }
}

void DumpMemory(const char *type, Span<const uint8_t> bytes)
{
    if (bytes.len) {
        PrintLn(StdErr, "%1 at 0x%2 (%3):", type, bytes.ptr, FmtMemSize(bytes.len));

        for (const uint8_t *ptr = bytes.begin(); ptr < bytes.end();) {
            Print(StdErr, "  [0x%1 %2 %3]  ", FmtHex((uintptr_t)ptr, 16),
                                              FmtInt((ptr - bytes.begin()) / sizeof(void *), 4, ' '),
                                              FmtInt(ptr - bytes.begin(), 4, ' '));
            for (int i = 0; ptr < bytes.end() && i < (int)sizeof(void *); i++, ptr++) {
                Print(StdErr, " %1", FmtHex(*ptr, 2));
            }
            PrintLn(StdErr);
        }
    }
}

}
