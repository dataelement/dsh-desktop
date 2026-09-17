// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#pragma once

#include "lib/native/base/base.hh"
#include "ffi.hh"

#include <napi.h>

namespace K {

class UnionValue: public Napi::ObjectWrap<UnionValue> {
    InstanceData *instance;
    const TypeInfo *type;

    Size active_idx = -1;

    HeapArray<uint8_t> raw;

public:
    static Napi::Function InitClass(InstanceData *instance, const TypeInfo *type);

    UnionValue(const Napi::CallbackInfo &info);

    void Finalize(Napi::BasicEnv env) override;

    const TypeInfo *GetType() { return type; }
    const RecordMember *GetMember() const { return (active_idx >= 0) ? &type->members[active_idx] : nullptr; }

    void SetRaw(const uint8_t *ptr);
    const uint8_t *GetRaw() const { return raw.ptr; }

private:
    Napi::Value Getter(const Napi::CallbackInfo &info);
    void Setter(const Napi::CallbackInfo &info, const Napi::Value &value);
};

template <typename T, typename... Args>
void ThrowError(Napi::Env env, const char *msg, Args... args)
{
    char buf[1024];
    Fmt(buf, msg, args...);

    auto err = T::New(env, buf);
    err.ThrowAsJavaScriptException();
}

static K_FORCE_INLINE napi_valuetype GetKindOf(napi_env env, napi_value value)
{
    napi_valuetype kind = napi_undefined;
    NAPI_OK(napi_typeof(env, value, &kind));

    return kind;
}

void SetValueTag(napi_env env, napi_value value, const void *marker);
bool CheckValueTag(napi_env env, napi_value value, const void *marker);

static K_FORCE_INLINE bool IsNullOrUndefined(napi_valuetype kind)
{
    return kind == napi_null || kind == napi_undefined;
}

static K_FORCE_INLINE bool IsNullOrUndefined(napi_env env, napi_value value)
{
    napi_valuetype kind = GetKindOf(env, value);
    return IsNullOrUndefined(kind);
}

static K_FORCE_INLINE bool IsArray(napi_env env, napi_value value)
{
    bool array = false;
    napi_is_array(env, value, &array);

    return array;
}

static K_FORCE_INLINE bool IsObject(napi_env env, napi_value value)
{
    if (GetKindOf(env, value) != napi_object)
        return false;
    if (IsArray(env, value))
        return false;

    return true;
}

static K_FORCE_INLINE bool IsTypedArray(napi_env env, napi_value value)
{
    bool typedarray = false;
    napi_is_typedarray(env, value, &typedarray);
    return typedarray;
}

static K_FORCE_INLINE bool IsArrayBuffer(napi_env env, napi_value value)
{
    bool arraybuffer = false;
    napi_is_arraybuffer(env, value, &arraybuffer);
    return arraybuffer;
}

static K_FORCE_INLINE bool IsBuffer(napi_env env, napi_value value)
{
    bool buffer = false;
    napi_is_buffer(env, value, &buffer);
    return buffer;
}

static K_FORCE_INLINE napi_value GetReferenceValue(napi_env env, napi_ref ref)
{
    napi_value value;
    NAPI_OK(napi_get_reference_value(env, ref, &value));

    return value;
}

static K_FORCE_INLINE uint32_t GetArrayLength(napi_env env, napi_value array)
{
    uint32_t length = 0;
    NAPI_OK(napi_get_array_length(env, array, &length));

    return length;
}

template <typename T>
static K_FORCE_INLINE bool TryNumber(napi_env env, napi_value value, T *out_value)
{
    T v;
    napi_status status;

    // Assume number first
    if constexpr (std::is_same_v<T, double>) {
        status = napi_get_value_double(env, value, &v);
    } else if constexpr (std::is_same_v<T, float>) {
        double d;
        status = napi_get_value_double(env, value, &d);
        v = (float)d;
    } else {
        int64_t i64;
        status = napi_get_value_int64(env, value, &i64);
        v = (T)i64;
    }
    if (status == napi_ok) [[likely]] {
        *out_value = v;
        return true;
    }

    // Maybe a BigInt?
    if constexpr (std::is_signed_v<T>) {
        int64_t i64;
        bool lossless;
        status = napi_get_value_bigint_int64(env, value, &i64, &lossless);
        v = (T)i64;
    } else {
        uint64_t u64;
        bool lossless;
        status = napi_get_value_bigint_uint64(env, value, &u64, &lossless);
        v = (T)u64;
    }
    if (status == napi_ok) {
        *out_value = v;
        return true;
    }

    return false;
}

static K_FORCE_INLINE bool TryPointer(napi_env env, napi_value value, void **out_ptr)
{
    // Fast path for BigInt
    {
        uint64_t u64;
        bool lossless;
        napi_status status = napi_get_value_bigint_uint64(env, value, &u64, &lossless);

        if (status == napi_ok) {
            *out_ptr = (void *)(uintptr_t)u64;
            return true;
        }
    }

    if (node_api_get_buffer_info(env, value, out_ptr, nullptr) == napi_ok)
        return true;

    napi_valuetype kind = GetKindOf(env, value);

    if (IsNullOrUndefined(kind)) {
        *out_ptr = nullptr;
        return true;
    } else if (kind == napi_number) {
        int64_t i;
        napi_status status = napi_get_value_int64(env, value, &i);
        K_ASSERT(status == napi_ok);

        *out_ptr = (void *)(uintptr_t)i;
        return true;
    }

    if (napi_get_arraybuffer_info(env, value, out_ptr, nullptr) == napi_ok)
        return true;

    return false;
}

static K_FORCE_INLINE bool TryPointer(napi_env env, napi_value value, void **out_ptr, Size *out_len, napi_valuetype *out_kind)
{
    // Fast path for BigInt
    {
        uint64_t u64;
        bool lossless;
        napi_status status = napi_get_value_bigint_uint64(env, value, &u64, &lossless);

        if (status == napi_ok) {
            *out_ptr = (void *)(uintptr_t)u64;
            *out_len = -1;
            *out_kind = napi_bigint;

            return true;
        }
    }

    if (size_t len = 0; node_api_get_buffer_info(env, value, out_ptr, &len) == napi_ok) {
        *out_len = (Size)len;
        *out_kind = napi_object;

        return true;
    }

    napi_valuetype kind = GetKindOf(env, value);

    if (IsNullOrUndefined(kind)) {
        *out_ptr = nullptr;
        *out_len = -1;
        *out_kind = kind;

        return true;
    } else if (kind == napi_number) {
        int64_t i;
        napi_status status = napi_get_value_int64(env, value, &i);
        K_ASSERT(status == napi_ok);

        *out_ptr = (void *)(uintptr_t)i;
        *out_len = -1;
        *out_kind = napi_number;

        return true;
    }

    if (size_t len = 0; napi_get_arraybuffer_info(env, value, out_ptr, &len) == napi_ok) {
        *out_len = (Size)len;
        *out_kind = napi_object;

        return true;
    }

    *out_kind = kind;
    return false;
}

static K_FORCE_INLINE bool TryBuffer(napi_env env, napi_value value, Span<uint8_t> *out_buffer)
{
    void *ptr = nullptr;
    size_t len = 0;

    if (node_api_get_buffer_info(env, value, &ptr, &len) == napi_ok) {
        *out_buffer = MakeSpan((uint8_t *)ptr, (Size)len);
        return true;
    } else if (napi_get_arraybuffer_info(env, value, &ptr, &len) == napi_ok) {
        *out_buffer = MakeSpan((uint8_t *)ptr, (Size)len);
        return true;
    }

    return false;
}

static K_FORCE_INLINE napi_value NewBool(Napi::Env env, bool b) { napi_value value; NAPI_OK(napi_get_boolean(env, b, &value)); return value; }

static K_FORCE_INLINE napi_value NewInt(Napi::Env env, char i) { napi_value value; NAPI_OK(napi_create_int32(env, (int32_t)i, &value)); return value; }
static K_FORCE_INLINE napi_value NewInt(Napi::Env env, signed char i) { napi_value value; NAPI_OK(napi_create_int32(env, (int32_t)i, &value)); return value; }
static K_FORCE_INLINE napi_value NewInt(Napi::Env env, unsigned char i) { napi_value value; NAPI_OK(napi_create_uint32(env, (uint32_t)i, &value)); return value; }
static K_FORCE_INLINE napi_value NewInt(Napi::Env env, short i) { napi_value value; NAPI_OK(napi_create_int32(env, (int32_t)i, &value)); return value; }
static K_FORCE_INLINE napi_value NewInt(Napi::Env env, unsigned short i) { napi_value value; NAPI_OK(napi_create_uint32(env, (uint32_t)i, &value)); return value; }
static K_FORCE_INLINE napi_value NewInt(Napi::Env env, int i) { napi_value value; NAPI_OK(napi_create_int32(env, (int32_t)i, &value)); return value; }
static K_FORCE_INLINE napi_value NewInt(Napi::Env env, unsigned int i) { napi_value value; NAPI_OK(napi_create_uint32(env, (uint32_t)i, &value)); return value; }
#if LONG_MAX == INT32_MAX
static K_FORCE_INLINE napi_value NewInt(Napi::Env env, long i) { napi_value value; NAPI_OK(napi_create_int32(env, (int32_t)i, &value)); return value; }
static K_FORCE_INLINE napi_value NewInt(Napi::Env env, unsigned long i) { napi_value value; NAPI_OK(napi_create_uint32(env, (uint32_t)i, &value)); return value; }
#endif

template <typename T>
static K_FORCE_INLINE napi_value NewInt(Napi::Env env, T i)
{
    static_assert(sizeof(T) == 8);

    napi_value value;

    if constexpr (std::is_signed_v<T>) {
        if (i <= 9007199254740992ll && i >= -9007199254740992ll) {
            NAPI_OK(napi_create_int64(env, (int64_t)i, &value));
            return value;
        }

        NAPI_OK(napi_create_bigint_int64(env, (int64_t)i, &value));
        return value;
    } else {
        if (i <= 9007199254740992ull) {
            NAPI_OK(napi_create_int64(env, (int64_t)i, &value));
            return value;
        }

        NAPI_OK(napi_create_bigint_uint64(env, (uint64_t)i, &value));
        return value;
    }
}

static K_FORCE_INLINE napi_value NewFloat(Napi::Env env, float f) { napi_value value; NAPI_OK(napi_create_double(env, (double)f, &value)); return value; }
static K_FORCE_INLINE napi_value NewFloat(Napi::Env env, double d) { napi_value value; NAPI_OK(napi_create_double(env, d, &value)); return value; }

template <typename T>
static K_FORCE_INLINE Size NullTerminatedLength(const T *ptr)
{
    Size len = 0;
    while (ptr[len]) {
        len++;
    }
    return len;
}
template <typename T>
static K_FORCE_INLINE Size NullTerminatedLength(const T *ptr, Size max)
{
    Size len = 0;
    while (len < max && ptr[len]) {
        len++;
    }
    return len;
}

static K_FORCE_INLINE napi_value NewString(Napi::Env env, const char *ptr, Size len)
{
    napi_value value;
    if (ptr) {
        NAPI_OK(napi_create_string_utf8(env, ptr, (size_t)len, &value));
    } else {
        NAPI_OK(napi_get_null(env, &value));
    }
    return value;
}
static K_FORCE_INLINE napi_value NewString(Napi::Env env, const char *ptr)
{
    napi_value value;
    if (ptr) {
        NAPI_OK(napi_create_string_utf8(env, ptr, NAPI_AUTO_LENGTH, &value));
    } else {
        NAPI_OK(napi_get_null(env, &value));
    }
    return value;
}

static K_FORCE_INLINE napi_value NewString(Napi::Env env, const char16_t *ptr, Size len)
{
    napi_value value;
    if (ptr) {
        NAPI_OK(napi_create_string_utf16(env, ptr, (size_t)len, &value));
    } else {
        NAPI_OK(napi_get_null(env, &value));
    }
    return value;
}
static K_FORCE_INLINE napi_value NewString(Napi::Env env, const char16_t *ptr)
{
    napi_value value;
    if (ptr) {
        NAPI_OK(napi_create_string_utf16(env, ptr, NAPI_AUTO_LENGTH, &value));
    } else {
        NAPI_OK(napi_get_null(env, &value));
    }
    return value;
}

napi_value NewString(Napi::Env env, const char32_t *ptr, Size len);
napi_value NewString(Napi::Env env, const char32_t *ptr);

napi_value DecodeObject(InstanceData *instance, const uint8_t *origin, const TypeInfo *type);
void DecodeObject(InstanceData *instance, napi_value obj, const uint8_t *origin, const TypeInfo *type);

napi_value DecodeArray(InstanceData *instance, const uint8_t *origin, const TypeInfo *type);
napi_value DecodeArray(InstanceData *instance, const uint8_t *origin, const TypeInfo *type, uint32_t len);
void DecodeElements(InstanceData *instance, napi_value array, const uint8_t *origin, const TypeInfo *type, uint32_t len);
INLINE_UNITY void DecodeBuffer(Span<uint8_t> buffer, const uint8_t *origin, const TypeInfo *type);

napi_value Decode(InstanceData *instance, const uint8_t *ptr, const TypeInfo *type);

static K_FORCE_INLINE Napi::Array GetOwnPropertyNames(napi_env env, napi_value obj)
{
    K_ASSERT(IsObject(env, obj));

    napi_value result;
    napi_status status = napi_get_all_property_names(env, obj, napi_key_own_only,
                                                     (napi_key_filter)(napi_key_enumerable | napi_key_skip_symbols),
                                                     napi_key_numbers_to_strings, &result);
    K_ASSERT(status == napi_ok);

    return Napi::Array(env, result);
}

static K_FORCE_INLINE napi_value WrapPointer(Napi::Env env, void *ptr)
{
    napi_value value;

    if (ptr) {
        NAPI_OK(napi_create_bigint_uint64(env, (uint64_t)(uintptr_t)ptr, &value));
    } else {
        NAPI_OK(napi_get_null(env, &value));
    }

    return value;
}

void DumpMemory(const char *type, Span<const uint8_t> bytes);

}
