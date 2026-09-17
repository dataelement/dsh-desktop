// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#include "lib/native/base/base.hh"
#include "ffi.hh"
#include "call.hh"
#include "interp.hh"
#include "type.hh"
#include "util.hh"
#if defined(_WIN32)
    #include "win32.hh"
#endif

#include <napi.h>

namespace K {

struct RelayContext {
    CallData *call;

    Size idx;
    uint8_t *base;

    std::mutex mutex = {};
    std::condition_variable cv = {};
    bool done = false;
};

extern "C" napi_value SwitchAndRelay(CallData *call, Size idx, uint8_t *sp, uint8_t *saved_sp, uint8_t **new_stack);

#if defined(_WIN32)

extern "C" void *FindTrampolineStart();
extern "C" void *FindTrampolineEnd();

static const uint8_t *TrampolineStart = (const uint8_t *)FindTrampolineStart();
static const Size TrampolineSize = ((const uint8_t *)FindTrampolineEnd() - TrampolineStart) / MaxTrampolines;

#else

extern "C" uint8_t Trampoline0;
extern "C" uint8_t TrampolineEnd;

static const uint8_t *TrampolineStart = (const uint8_t *)&Trampoline0;
static const Size TrampolineSize = ((const uint8_t *)&TrampolineEnd - TrampolineStart) / MaxTrampolines;

#endif

static napi_value (*translate_zero_call)(napi_env env, napi_callback_info info);

#if defined(K_DEBUG)
CallData::~CallData()
{
    K_ASSERT(!out_arguments.len);
    K_ASSERT(!used_trampolines.len);
    K_ASSERT(!allocator->IsUsed());
}
#endif

napi_value CallData::Run(const FunctionInfo *func, void *native)
{
    uint8_t *base = AllocStack<uint8_t>(func->plan.stk_size);

    const OpData *first = func->plan.sync.ptr;
    return RunForward(this, base, native, first);
}

bool CallData::PrepareAsync(const FunctionInfo *func)
{
    uint8_t *base = AllocStack<uint8_t>(func->plan.stk_size);
    async_base = base;

    const OpData *first = func->plan.async.ptr;
    return !RunForward(this, base, nullptr, first); // Yield returns nullptr
}

void CallData::ExecuteAsync(void *native)
{
    const OpData *next = async_ip++;
    RunForward(this, async_base, native, next);
}

napi_value CallData::EndAsync()
{
    const OpData *next = async_ip++;
    return RunForward(this, async_base, nullptr, next);
}

void CallData::Relay(Size idx, uint8_t *base)
{
    TrampolineInfo *trampoline = &shared.trampolines[idx];
    const FunctionInfo *proto = trampoline->proto;

    const OpData *first = proto->plan.relay.ptr;
    trampoline->state = RunRelay(this, trampoline, base, first);
}

static K_FORCE_INLINE void ConvertBuffer(BufferConversion conversion, void *ptr, Size len, Size stride)
{
#define SWAP(CType) \
        do { \
            uint8_t *it = (uint8_t *)ptr; \
            uint8_t *end = (uint8_t *)ptr + len; \
             \
            while (it < end) { \
                *(CType *)it = ReverseBytes(*(CType *)it); \
                it += stride; \
            } \
        } while (false)

    switch (conversion) {
        case BufferConversion::None: {} break;

        case BufferConversion::Swap16: { SWAP(uint16_t); } break;
        case BufferConversion::Swap32: { SWAP(uint32_t); } break;
        case BufferConversion::Swap64: { SWAP(uint64_t); } break;

        case BufferConversion::FloatToDouble: {
            K_ASSERT(stride == 8);

            len /= K_SIZE(float);

            for (Size i = len - 1; i >= 0; i--) {
                const float *src = (const float *)ptr + i;
                double *dest = (double *)ptr + i;

                *dest = *src;
            }
        } break;
    }

#undef SWAP
}

void CallData::Finalize()
{
    FinalizeFast();

    if (out_arguments.len) {
        if (!env.IsExceptionPending()) {
            for (const OutArgument &out: out_arguments) {
                switch (out.kind) {
                    case OutArgument::Kind::Array: {
                        napi_value value = GetReferenceValue(env, out.ref);

                        K_ASSERT(IsArray(env, value));

                        uint32_t len = GetArrayLength(env, value);
                        DecodeElements(instance, value, (const uint8_t *)out.ptr, out.type, len);
                    } break;

                    case OutArgument::Kind::String: {
                        napi_value value = GetReferenceValue(env, out.ref);

                        K_ASSERT(IsArray(env, value));
                        K_ASSERT(GetArrayLength(env, value) == 1);

                        Size len = strnlen((const char *)out.ptr, out.len);
                        napi_value str = NewString(env, (const char *)out.ptr, len);

                        napi_set_element(env, value, 0, str);
                    } break;

                    case OutArgument::Kind::String16: {
                        napi_value value = GetReferenceValue(env, out.ref);

                        K_ASSERT(IsArray(env, value));
                        K_ASSERT(GetArrayLength(env, value) == 1);

                        Size len = NullTerminatedLength((const char16_t *)out.ptr, out.len);
                        napi_value str = NewString(env, (const char16_t *)out.ptr, len);

                        napi_set_element(env, value, 0, str);
                    } break;

                    case OutArgument::Kind::String32: {
                        napi_value value = GetReferenceValue(env, out.ref);

                        K_ASSERT(IsArray(env, value));
                        K_ASSERT(GetArrayLength(env, value) == 1);

                        Size len = NullTerminatedLength((const char32_t *)out.ptr, out.len);
                        napi_value str = NewString(env, (const char32_t *)out.ptr, len);

                        napi_set_element(env, value, 0, str);
                    } break;

                    case OutArgument::Kind::Object: {
                        napi_value value = GetReferenceValue(env, out.ref);

                        if (CheckValueTag(env, value, &UnionValueMarker)) {
                            UnionValue *u = nullptr;
                            NAPI_OK(napi_unwrap(env, value, (void **)&u));

                            u->SetRaw((const uint8_t *)out.ptr);
                        } else {
                            DecodeObject(instance, value, (const uint8_t *)out.ptr, out.type->ref.type);
                        }
                    } break;

                    case OutArgument::Kind::Convert: {
                        ConvertBuffer(out.type->ref.conversion, (uint8_t *)out.ptr, out.len, out.type->ref.stride);
                    } break;
                }
            }
        }

        for (const OutArgument &out: out_arguments) {
            node_api_delete_reference(env, out.ref);
        }
    }

    if (used_trampolines.len) {
        std::lock_guard<std::mutex> lock(shared.mutex);

        for (Size i = used_trampolines.len - 1; i >= 0; i--) {
            int16_t idx = used_trampolines[i];
            TrampolineInfo *trampoline = &shared.trampolines[idx];

            K_ASSERT(trampoline->instance == instance);
            K_ASSERT(trampoline->func);

            trampoline->state = 0;
            node_api_delete_reference(env, trampoline->func);
            trampoline->func = nullptr;

            shared.available.Append(idx);
        }
    }

#if defined(K_DEBUG)
    out_arguments.len = 0;
    used_trampolines.len = 0;
#endif
}

void CallData::FinalizeFast()
{
#if defined(K_DEBUG)
    K_ASSERT(!finalized);
    K_DEFER { finalized = true; };
#endif

    allocator->ReleaseAll();
}

void CallData::RelayAsync(Size idx, uint8_t *base)
{
    // JS/V8 is single-threaded, and runs on main_thread_id. Forward the call
    // to the JS event loop.

    RelayContext ctx = {
        .call = this,
        .idx = idx,
        .base = base
    };

    NAPI_OK(napi_call_threadsafe_function(instance->broker, &ctx, napi_tsfn_blocking));

    // Wait until it executes
    std::unique_lock<std::mutex> lock(ctx.mutex);
    while (!ctx.done) {
        ctx.cv.wait(lock);
    }
}

napi_value CallData::CallCallback(const TrampolineInfo *trampoline, const napi_value *args, Size count)
{
    napi_value recv;
    napi_value func;
    napi_value value;

    NAPI_OK(napi_get_undefined(env, &recv));
    NAPI_OK(napi_get_reference_value(env, trampoline->func, &func));

    napi_status status = napi_call_function(env, recv, func, (size_t)count, args, &value);
    if (status == napi_pending_exception || status == napi_cannot_run_js) [[unlikely]]
        return nullptr;
    K_ASSERT(status == napi_ok);

    return value;
}

bool CallData::PushString(napi_value value, int directions, const char **out_str)
{
    // Fast path
    if (PushStringValue(value, out_str) >= 0) {
        if (directions & 2) [[unlikely]] {
            ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected [string]", GetValueType(instance, value));
            return false;
        }

        return true;
    }

    return PushPointer(value, instance->str_type, directions, (void **)out_str);
}

bool CallData::PushString16(napi_value value, int directions, const char16_t **out_str16)
{
    // Fast path
    if (PushString16Value(value, out_str16) >= 0) {
        if (directions & 2) [[unlikely]] {
            ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected [string]", GetValueType(instance, value));
            return false;
        }

        return true;
    }

    return PushPointer(value, instance->str16_type, directions, (void **)out_str16);
}

bool CallData::PushString32(napi_value value, int directions, const char32_t **out_str32)
{
    // Fast path
    if (PushString32Value(value, out_str32) >= 0) {
        if (directions & 2) [[unlikely]] {
            ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected [string]", GetValueType(instance, value));
            return false;
        }

        return true;
    }

    return PushPointer(value, instance->str32_type, directions, (void **)out_str32);
}

Size CallData::PushStringValue(napi_value value, const char **out_str)
{
    size_t len;

    size_t available = (size_t)(heap.end - heap.ptr);
    char *ptr = (char *)heap.ptr;

    // Fast path for small strings
    if (available >= 4096) [[likely]] {
        napi_status status = napi_get_value_string_utf8(env, value, ptr, 4096, &len);
        if (status == napi_string_expected)
            return -1;
        K_ASSERT(status == napi_ok);

        len++;

        // UTF-8 can take up to 4 bytes for a codepoint, so truncation may
        // result in a value that is several bytes less than the buffer size.
        // So len < 4096 - 4 should be enough, but exagerate a bit "just in case" :)

        if ((Size)len < 4096 - 8) {
            heap.ptr += (Size)AlignLen(len, 16);

            *out_str = ptr;
            return (Size)len;
        }
    }

    NAPI_OK(napi_get_value_string_utf8(env, value, nullptr, 0, &len));

    len++;

    if (len <= available) {
        NAPI_OK(napi_get_value_string_utf8(env, value, ptr, len, nullptr));

        heap.ptr += (Size)AlignLen(len, 16);

        *out_str = ptr;
        return (Size)len;
    } else {
        Span<char> buf = allocator->AllocateSpan<char>((Size)len);

        NAPI_OK(napi_get_value_string_utf8(env, value, buf.ptr, len, nullptr));

        *out_str = buf.ptr;
        return (Size)len;
    }
}

Size CallData::PushString16Value(napi_value value, const char16_t **out_str16)
{
    size_t len = 0;
    Span<char16_t> buf;

    napi_status status = napi_get_value_string_utf16(env, value, nullptr, 0, &len);
    if (status == napi_string_expected)
        return -1;
    K_ASSERT(status == napi_ok);

    len++;

    buf.ptr = (char16_t *)heap.ptr;
    buf.len = (heap.end - heap.ptr) / 2;

    if (len <= (size_t)buf.len) {
        NAPI_OK(napi_get_value_string_utf16(env, value, buf.ptr, len, nullptr));

        heap.ptr += (Size)AlignLen(len * 2, 16);
    } else {
        buf = allocator->AllocateSpan<char16_t>((Size)len);

        NAPI_OK(napi_get_value_string_utf16(env, value, buf.ptr, len, nullptr));
    }

    *out_str16 = buf.ptr;
    return (Size)len;
}

Size CallData::PushString32Value(napi_value value, const char32_t **out_str32)
{
    static const char32_t ReplacementChar = 0x0000FFFD;

    Span<char32_t> buf;

    Span<const char16_t> buf16;
    buf16.len = PushString16Value(value, &buf16.ptr);
    if (buf16.len < 0) [[unlikely]]
        return -1;

    buf.ptr = (char32_t *)heap.ptr;
    buf.len = (heap.end - heap.ptr) / 4;

    if (buf16.len < buf.len) [[likely]] {
        heap.ptr += AlignLen(buf16.len * 4, 16);
    } else {
        buf = allocator->AllocateSpan<char32_t>(buf16.len);
    }

    Size j = 0;
    for (Size i = 0; i < buf16.len; i++) {
        char32_t uc = buf16[i];

        if (uc >= 0xD800 && uc <= 0xDBFF) {
            if (++i < buf16.len) {
                char16_t uc2 = buf16.ptr[i];

                if (uc2 >= 0xDC00 && uc2 <= 0xDFFF) [[likely]] {
                    uc = ((uc - 0xD800) << 10) + (uc2 - 0xDC00) + 0x10000u;
                } else {
                    uc = ReplacementChar;
                }
            } else {
                uc = ReplacementChar;
            }
        } else if (uc >= 0xDC00 && uc <= 0xDFFF) [[unlikely]] {
            uc = ReplacementChar;
        }

        buf[j++] = uc;
    }

    *out_str32 = buf.ptr;
    return j;
}

static K_FORCE_INLINE napi_value GetMemberValue(napi_env env, napi_value obj, const RecordMember &member)
{
    napi_value value;

    if (member.key) {
        napi_value key;
        NAPI_OK(napi_get_reference_value(env, member.key, &key));
        NAPI_OK(napi_get_property(env, obj, key, &value));
    } else {
        NAPI_OK(napi_get_named_property(env, obj, member.name, &value));
    }

    return value;
}

bool CallData::PushObject(napi_value obj, const TypeInfo *type, uint8_t *origin)
{
    K_ASSERT(IsAggregate(type));

    if (GetKindOf(env, obj) != napi_object) [[unlikely]] {
        ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected object", GetValueType(instance, obj));
        return false;
    }

    Span<const RecordMember> members = type->members;

    if (type->primitive == PrimitiveKind::Union) {
        if (CheckValueTag(env, obj, &UnionValueMarker)) {
            UnionValue *u = nullptr;
            napi_unwrap(env, obj, (void **)&u);

            const uint8_t *raw = u->GetRaw();

            if (u->GetType() != type) [[unlikely]] {
                ThrowError<Napi::TypeError>(env, "Expected union type %1, got %2", type->name, u->GetType()->name);
                return false;
            }

            // Fast path: encoded value already exists, just copy!
            if (raw) {
                memcpy(origin, raw, type->size);
                return true;
            }

            members.ptr = u->GetMember();
            members.len = 1;

            if (!members.ptr) [[unlikely]] {
                ThrowError<Napi::Error>(env, "Cannot use ambiguous empty union");
                return false;
            }
        } else {
            Napi::Array properties = GetOwnPropertyNames(env, obj);

            if (properties.Length() != 1 || !properties.Get(0u).IsString()) [[unlikely]] {
                ThrowError<Napi::Error>(env, "Expected object with single property name for union");
                return false;
            }

            std::string property = properties.Get(0u).As<Napi::String>();

            const RecordMember *member = std::find_if(members.begin(), members.end(),
                                                      [&](const RecordMember &member) { return TestStr(property.c_str(), member.name); });

            if (member == members.end()) [[unlikely]] {
                ThrowError<Napi::Error>(env, "Unknown member %1 in union type %2", property.c_str(), type->name);
                return false;
            }

            members.ptr = member;
            members.len = 1;
        }
    }

    MemSet(origin, type->fill, type->size);

#define PUSH_INTEGER(CType) \
        do { \
            CType v; \
            if (!TryNumber(env, value, &v)) [[unlikely]] { \
                abort(); \
                ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected number", GetValueType(instance, value)); \
                return false; \
            } \
             \
            *(CType *)dest = v; \
        } while (false)
#define PUSH_INTEGER_SWAP(CType) \
        do { \
            CType v; \
            if (!TryNumber(env, value, &v)) [[unlikely]] { \
                ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected number", GetValueType(instance, value)); \
                return false; \
            } \
             \
            *(CType *)dest = ReverseBytes(v); \
        } while (false)

    for (Size i = 0; i < members.len; i++) {
        const RecordMember &member = members[i];
        napi_value value = GetMemberValue(env, obj, member);

        if (GetKindOf(env, value) == napi_undefined)
            continue;

        if (member.countedby >= 0) {
            const char *countedby = members[member.countedby].name;

            if (!CheckDynamicLength(obj, member.type->ref.type->size, countedby, value)) [[unlikely]]
                return false;
        }

        uint8_t *dest = origin + member.offset;

        switch (member.type->primitive) {
            case PrimitiveKind::Void: { K_UNREACHABLE(); } break;

            case PrimitiveKind::Bool: {
                bool b;
                napi_status status = napi_get_value_bool(env, value, &b);

                if (status != napi_ok) [[unlikely]] {
                    ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected boolean", GetValueType(instance, value));
                    return false;
                }

                *(bool *)dest = b;
            } break;
            case PrimitiveKind::Int8: { PUSH_INTEGER(int8_t); } break;
            case PrimitiveKind::UInt8: { PUSH_INTEGER(uint8_t); } break;
            case PrimitiveKind::Int16: { PUSH_INTEGER(int16_t); } break;
            case PrimitiveKind::Int16S: { PUSH_INTEGER_SWAP(int16_t); } break;
            case PrimitiveKind::UInt16: { PUSH_INTEGER(uint16_t); } break;
            case PrimitiveKind::UInt16S: { PUSH_INTEGER_SWAP(uint16_t); } break;
            case PrimitiveKind::Int32: { PUSH_INTEGER(int32_t); } break;
            case PrimitiveKind::Int32S: { PUSH_INTEGER_SWAP(int32_t); } break;
            case PrimitiveKind::UInt32: { PUSH_INTEGER(uint32_t); } break;
            case PrimitiveKind::UInt32S: { PUSH_INTEGER_SWAP(uint32_t); } break;
            case PrimitiveKind::Int64: { PUSH_INTEGER(int64_t); } break;
            case PrimitiveKind::Int64S: { PUSH_INTEGER_SWAP(int64_t); } break;
            case PrimitiveKind::UInt64: { PUSH_INTEGER(uint64_t); } break;
            case PrimitiveKind::UInt64S: { PUSH_INTEGER_SWAP(uint64_t); } break;
            case PrimitiveKind::String: {
                const char *str;
                if (!PushString(value, 1, &str)) [[unlikely]]
                    return false;

                *(const char **)dest = str;
            } break;
            case PrimitiveKind::String16: {
                const char16_t *str16;
                if (!PushString16(value, 1, &str16)) [[unlikely]]
                    return false;

                *(const char16_t **)dest = str16;
            } break;
            case PrimitiveKind::String32: {
                const char32_t *str32;
                if (!PushString32(value, 1, &str32)) [[unlikely]]
                    return false;

                *(const char32_t **)dest = str32;
            } break;
            case PrimitiveKind::Pointer: {
                void *ptr;
                if (!PushPointer(value, member.type, 1, &ptr)) [[unlikely]]
                    return false;

                *(void **)dest = ptr;
            } break;
            case PrimitiveKind::Record:
            case PrimitiveKind::Union: {
                if (!PushObject(value, member.type, dest)) [[unlikely]]
                    return false;
            } break;
            case PrimitiveKind::Array: {
                if (IsArray(env, value)) {
                    Napi::Array array = Napi::Array(env, value);
                    if (!PushNormalArray(array, member.type, member.type->size, dest))
                        return false;
                } else if (Span<uint8_t> buffer = {}; TryBuffer(env, value, &buffer)) {
                    PushBuffer(buffer, member.type, dest);
                } else if (GetKindOf(env, value) == napi_string) {
                    if (!PushStringArray(value, member.type, dest))
                        return false;
                } else {
                    ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected array", GetValueType(instance, value));
                    return false;
                }
            } break;
            case PrimitiveKind::Float32: {
                float f;
                if (!TryNumber(env, value, &f)) [[unlikely]] {
                    ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected number", GetValueType(instance, value));
                    return false;
                }

                memcpy(dest, &f, 4);
            } break;
            case PrimitiveKind::Float64: {
                double d;
                if (!TryNumber(env, value, &d)) [[unlikely]] {
                    ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected number", GetValueType(instance, value));
                    return false;
                }

                memcpy(dest, &d, 8);
            } break;
            case PrimitiveKind::Callback: {
                void *ptr;
                if (!PushCallback(value, member.type, &ptr))
                    return false;

                *(void **)dest = ptr;
            } break;

            case PrimitiveKind::Prototype: { K_UNREACHABLE(); } break;
        }
    }

#undef PUSH_INTEGER_SWAP
#undef PUSH_INTEGER

    return true;
}

bool CallData::PushNormalArray(Napi::Array array, const TypeInfo *type, Size size, uint8_t *origin)
{
    K_ASSERT(array.IsArray());

    const TypeInfo *ref = type->ref.type;
    int32_t stride = type->ref.stride;

    // We can't rely on type->size because type might be a pointer
    Size len = (Size)array.Length();
    Size available = len * stride;

    if (available > size) {
        len = size / stride;

        if (stride != ref->size) {
            MemSet(origin, type->fill, size);
        }
    } else if (stride == ref->size) {
        MemSet(origin + available, type->fill, size - available);
    } else {
        MemSet(origin, type->fill, size);
    }

    Size offset = 0;

#define PUSH_ARRAY(SetCode) \
        do { \
            for (Size i = 0; i < len; i++) { \
                napi_value value = array[(uint32_t)i].AsValue(); \
                 \
                uint8_t *dest = origin + offset; \
                SetCode \
                offset += stride; \
            } \
        } while (false)
#define PUSH_INTEGERS(CType) \
        PUSH_ARRAY({ \
            CType v; \
             \
            if (!TryNumber(env, value, &v)) [[unlikely]] { \
                ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected number", GetValueType(instance, value)); \
                return false; \
            } \
             \
            *(CType *)dest = v; \
        })
#define PUSH_INTEGERS_SWAP(CType) \
        PUSH_ARRAY({ \
            CType v; \
             \
            if (!TryNumber(env, value, &v)) [[unlikely]] { \
                ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected number", GetValueType(instance, value)); \
                return false; \
            } \
             \
            *(CType *)dest = ReverseBytes(v); \
        })

    switch (ref->primitive) {
        case PrimitiveKind::Void: {
            ThrowError<Napi::TypeError>(env, "Ambigous parameter type %1, use koffi.as(value, type)", type->name); \
            return false;
        } break;

        case PrimitiveKind::Bool: {
            PUSH_ARRAY({
                bool b;
                napi_status status = napi_get_value_bool(env, value, &b);

                if (status != napi_ok) [[unlikely]] {
                    ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected boolean", GetValueType(instance, value));
                    return false;
                }

                *(bool *)dest = b;
            });
        } break;
        case PrimitiveKind::Int8: { PUSH_INTEGERS(int8_t); } break;
        case PrimitiveKind::UInt8: { PUSH_INTEGERS(uint8_t); } break;
        case PrimitiveKind::Int16: { PUSH_INTEGERS(int16_t); } break;
        case PrimitiveKind::Int16S: { PUSH_INTEGERS_SWAP(int16_t); } break;
        case PrimitiveKind::UInt16: { PUSH_INTEGERS(uint16_t); } break;
        case PrimitiveKind::UInt16S: { PUSH_INTEGERS_SWAP(uint16_t); } break;
        case PrimitiveKind::Int32: { PUSH_INTEGERS(int32_t); } break;
        case PrimitiveKind::Int32S: { PUSH_INTEGERS_SWAP(int32_t); } break;
        case PrimitiveKind::UInt32: { PUSH_INTEGERS(uint32_t); } break;
        case PrimitiveKind::UInt32S: { PUSH_INTEGERS_SWAP(uint32_t); } break;
        case PrimitiveKind::Int64: { PUSH_INTEGERS(int64_t); } break;
        case PrimitiveKind::Int64S: { PUSH_INTEGERS_SWAP(int64_t); } break;
        case PrimitiveKind::UInt64: { PUSH_INTEGERS(uint64_t); } break;
        case PrimitiveKind::UInt64S: { PUSH_INTEGERS_SWAP(uint64_t); } break;
        case PrimitiveKind::String: {
            PUSH_ARRAY({
                const char *str;
                if (!PushString(value, 1, &str)) [[unlikely]]
                    return false;

                *(const char **)dest = str;
            });
        } break;
        case PrimitiveKind::String16: {
            PUSH_ARRAY({
                const char16_t *str16;
                if (!PushString16(value, 1, &str16)) [[unlikely]]
                    return false;

                *(const char16_t **)dest = str16;
            });
        } break;
        case PrimitiveKind::String32: {
            PUSH_ARRAY({
                const char32_t *str32;
                if (!PushString32(value, 1, &str32)) [[unlikely]]
                    return false;

                *(const char32_t **)dest = str32;
            });
        } break;
        case PrimitiveKind::Pointer: {
            PUSH_ARRAY({
                void *ptr;
                if (!PushPointer(value, ref, 1, &ptr)) [[unlikely]]
                    return false;

                *(const void **)dest = ptr;
            });
        } break;
        case PrimitiveKind::Record:
        case PrimitiveKind::Union: {
            PUSH_ARRAY({
                if (!PushObject(value, ref, dest)) [[unlikely]]
                    return false;
            });
        } break;
        case PrimitiveKind::Array: {
            for (Size i = 0; i < len; i++) {
                napi_value value = array[(uint32_t)i].AsValue();

                uint8_t *dest = origin + offset;

                if (IsArray(env, value)) {
                    Napi::Array array = Napi::Array(env, value);
                    if (!PushNormalArray(array, ref, (Size)ref->size, dest))
                        return false;
                } else if (Span<uint8_t> buffer = {}; TryBuffer(env, value, &buffer)) {
                    PushBuffer(buffer, ref, dest);
                } else if (GetKindOf(env, value) == napi_string) {
                    if (!PushStringArray(value, ref, dest))
                        return false;
                } else {
                    ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected array", GetValueType(instance, value));
                    return false;
                }

                offset += stride;
            }
        } break;
        case PrimitiveKind::Float32: {
            PUSH_ARRAY({
                float f;
                if (!TryNumber(env, value, &f)) [[unlikely]] {
                    ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected number", GetValueType(instance, value));
                    return false;
                }

                memcpy(dest, &f, 4);
            });
        } break;
        case PrimitiveKind::Float64: {
            PUSH_ARRAY({
                double d;
                if (!TryNumber(env, value, &d)) [[unlikely]] {
                    ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected number", GetValueType(instance, value));
                    return false;
                }

                memcpy(dest, &d, 8);
            });
        } break;
        case PrimitiveKind::Callback: {
            PUSH_ARRAY({
                void *ptr;
                if (!PushCallback(value, ref, &ptr))
                    return false;

                *(const void **)dest = ptr;
            });
        } break;

        case PrimitiveKind::Prototype: { K_UNREACHABLE(); } break;
    }

#undef PUSH_INTEGERS_SWAP
#undef PUSH_INTEGERS
#undef PUSH_ARRAY

    return true;
}

void CallData::PushBuffer(Span<const uint8_t> buffer, const TypeInfo *type, uint8_t *origin)
{
    buffer.len = std::min(buffer.len, (Size)type->size);

    const TypeInfo *ref = type->ref.type;
    int32_t stride = type->ref.stride;

    // Go fast if possible brrrrrrr :)
    if (stride == ref->size) {
        MemCpy(origin, buffer.ptr, buffer.len);
        MemSet(origin + buffer.len, 0, (Size)type->size - buffer.len);

        ConvertBuffer(type->ref.conversion, origin, buffer.len, stride);
    } else {
        Size len = buffer.len / ref->size;

        for (Size i = 0; i < len; i++) {
            const uint8_t *src = buffer.ptr + i * ref->size;
            uint8_t *dest = origin + i * stride;

            memcpy(dest, src, ref->size);
        }

        ConvertBuffer(type->ref.conversion, origin, len * stride, stride);
    }
}

bool CallData::PushStringArray(napi_value value, const TypeInfo *type, uint8_t *origin)
{
    K_ASSERT(GetKindOf(env, value) == napi_string);
    K_ASSERT(type->primitive == PrimitiveKind::Array);
    K_ASSERT(type->ref.stride == type->ref.type->size);

    size_t encoded = 0;

    switch (type->ref.type->primitive) {
        case PrimitiveKind::Int8: { NAPI_OK(napi_get_value_string_utf8(env, value, (char *)origin, type->size, &encoded)); } break;
        case PrimitiveKind::Int16: {
            NAPI_OK(napi_get_value_string_utf16(env, value, (char16_t *)origin, type->size / 2, &encoded));
            encoded *= 2;
        } break;

        default: {
            ThrowError<Napi::TypeError>(env, "Strings cannot be converted to %1 array", type->ref.type->name);
            return false;
        } break;
    }

    MemSet(origin + encoded, 0, type->size - encoded);

    return true;
}

bool CallData::PushPointer(napi_value value, const TypeInfo *type, int directions, void **out_ptr)
{
    // In the past we were naively using napi_typeof() and a switch to "reduce" branching,
    // but it did not match the common types very well (so there was still various if tests),
    // and it turns out that napi_typeof() is made of successive type tests anyway so it
    // just made things worse. Oh, well.

    void *ptr = nullptr;
    Size len = 0;
    napi_valuetype kind = napi_undefined;

restart:

    if (TryPointer(env, value, &ptr, &len, &kind)) {
        if (type->ref.conversion != BufferConversion::None && kind == napi_object) [[unlikely]] {
            if (directions & 2) {
                if (directions & 1) {
                    ConvertBuffer(type->ref.conversion, ptr, len, type->ref.stride);
                }

                OutArgument *out = out_arguments.AppendDefault();

                out->kind = OutArgument::Kind::Convert;
                out->ptr = ptr;
                out->len = len;
                out->type = type;
            } else if (directions & 1) { // In
                void *copy = AllocHeap(len);

                MemCpy(copy, ptr, len);
                ConvertBuffer(type->ref.conversion, copy, len, type->ref.stride);

                ptr = copy;
            }
        }

        *out_ptr = ptr;
        return true;
    }

    if (kind == napi_external && CheckValueTag(env, value, &CastMarker)) {
        Napi::External<ValueCast> external = Napi::External<ValueCast>(env, value);
        ValueCast *cast = external.Data();

        napi_get_reference_value(env, cast->ref, &value);
        type = cast->type;

        goto restart;
    }

    return PushPointerSlow(value, kind, type, directions, out_ptr);
}

bool CallData::PushPointerSlow(napi_value value, napi_valuetype kind, const TypeInfo *type, int directions, void **out_ptr)
{
    const TypeInfo *ref = type->ref.type;

    void *ptr = nullptr;

    if (kind == napi_string) {
        K_ASSERT(type->primitive == PrimitiveKind::Pointer);

        if (directions & 2) [[unlikely]]
            goto unexpected;

        switch (ref->primitive) {
            case PrimitiveKind::Void: {
                if (ref != instance->void_type) [[unlikely]]
                    goto unexpected;

                PushStringValue(value, (const char **)out_ptr);
                return true;
            } break;

            case PrimitiveKind::Int8: {
                PushStringValue(value, (const char **)out_ptr);
                return true;
            } break;
            case PrimitiveKind::Int16: {
                PushString16Value(value, (const char16_t **)out_ptr);
                return true;
            } break;
            case PrimitiveKind::Int32: {
                PushString32Value(value, (const char32_t **)out_ptr);
                return true;
            } break;

            default: goto unexpected;
        }

        K_UNREACHABLE();
    } else if (IsArray(env, value)) {
        Napi::Array array = Napi::Array(env, value);
        Size len = PushIndirectString(array, ref, &ptr);

        OutArgument::Kind out_kind;
        Size out_len = 0;

        if (len >= 0) {
            if (!ref->size && ref != instance->void_type) [[unlikely]] {
                ThrowError<Napi::TypeError>(env, "Cannot pass [string] value to %1", type->name);
                return false;
            }

            switch (ref->size) {
                default: { out_kind = OutArgument::Kind::String; } break;
                case 2: { out_kind = OutArgument::Kind::String16; } break;
                case 4: { out_kind = OutArgument::Kind::String32; } break;
            }
            out_len = len;
        } else {
            Size size = (Size)array.Length() * ref->size;

            if (!ref->size) [[unlikely]] {
                ThrowError<Napi::TypeError>(env, "Cannot pass %1 value to %2, use koffi.as()",
                                            ref != instance->void_type ? "opaque" : "ambiguous", type->name);
                return false;
            }

            ptr = AllocHeap(size);

            if (directions & 1) {
                if (!PushNormalArray(array, type, size, (uint8_t *)ptr))
                    return false;
            } else {
                MemSet(ptr, 0, size);
            }

            out_kind = OutArgument::Kind::Array;
        }

        if (directions & 2) {
            OutArgument *out = out_arguments.AppendDefault();

            NAPI_OK(napi_create_reference(env, value, 1, &out->ref));

            out->kind = out_kind;
            out->ptr = ptr;
            out->len = out_len;
            out->type = type;
        }

        *out_ptr = ptr;
        return true;
    } else if (IsAggregate(ref)) [[likely]] {
        ptr = (void *)AllocHeap(ref->size);

        if (ref->primitive == PrimitiveKind::Union &&
                (directions & 2) && !CheckValueTag(env, value, &UnionValueMarker)) [[unlikely]] {
            ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected union value", GetValueType(instance, value));
            return false;
        }

        if (directions & 1) {
            if (!PushObject(value, ref, (uint8_t *)ptr)) [[unlikely]]
                return false;
        } else {
            if (kind != napi_object) [[unlikely]]
                return false;

            MemSet(ptr, 0, ref->size);
        }

        if (directions & 2) {
            OutArgument *out = out_arguments.AppendDefault();

            NAPI_OK(napi_create_reference(env, value, 1, &out->ref));

            out->kind = OutArgument::Kind::Object;
            out->ptr = ptr;
            out->type = type;
        }

        *out_ptr = ptr;
        return true;
    } else if (kind == napi_function) {
        if (type->primitive != PrimitiveKind::Callback) [[unlikely]] {
            ThrowError<Napi::TypeError>(env, "Cannot pass function to type %1", type->name);
            return false;
        }

        Napi::Function func = Napi::Function(env, value);

        ptr = ReserveTrampoline(type->proto, func);
        if (!ptr) [[unlikely]]
            return false;

        *out_ptr = (void *)ptr;
        return true;
    }

unexpected:
    ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected %2", GetValueType(instance, value), type->name);
    return false;
}

bool CallData::PushCallback(napi_value value, const TypeInfo *type, void **out_ptr)
{
    void *ptr = nullptr;
    Size len = 0;
    napi_valuetype kind = napi_undefined;

restart:

    if (TryPointer(env, value, &ptr, &len, &kind)) {
        *out_ptr = ptr;
        return true;
    }

    if (kind == napi_function) {
        Napi::Function func = Napi::Function(env, value);

        ptr = ReserveTrampoline(type->proto, func);
        if (!ptr) [[unlikely]]
            return false;

        *out_ptr = ptr;
        return true;
    } else if (kind == napi_external && CheckValueTag(env, value, &CastMarker)) {
        Napi::External<ValueCast> external = Napi::External<ValueCast>(env, value);
        ValueCast *cast = external.Data();

        NAPI_OK(napi_get_reference_value(env, cast->ref, &value));
        type = cast->type;

        goto restart;
    }

    ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected %2", GetValueType(instance, value), type->name);
    return false;
}

Size CallData::PushIndirectString(Napi::Array array, const TypeInfo *ref, void **out_ptr)
{
    if (array.Length() != 1)
        return -1;

    napi_value value = array[0u].AsValue();

    if (ref == instance->void_type) {
        return PushStringValue(value, (const char **)out_ptr);
    } else if (ref->primitive == PrimitiveKind::Int8) {
        return PushStringValue(value, (const char **)out_ptr);
    } else if (ref->primitive == PrimitiveKind::Int16) {
        return PushString16Value(value, (const char16_t **)out_ptr);
    } else if (ref->primitive == PrimitiveKind::Int32) {
        return PushString32Value(value, (const char32_t **)out_ptr);
    } else {
        return -1;
    }
}

void *CallData::ReserveTrampoline(const FunctionInfo *proto, Napi::Function func)
{
    if (!InitAsyncBroker(instance)) [[unlikely]]
        return nullptr;

    int16_t idx;
    {
        std::lock_guard<std::mutex> lock(shared.mutex);

        if (!shared.available.len) [[unlikely]] {
            ThrowError<Napi::Error>(env, "Too many callbacks are in use (max = %1)", MaxTrampolines);
            return env.Null();
        }
        if (!used_trampolines.Available()) [[unlikely]] {
            ThrowError<Napi::Error>(env, "This call uses too many temporary callbacks (max = %1)", K_LEN(used_trampolines.data));
            return env.Null();
        }

        idx = shared.available.data[--shared.available.len];
        used_trampolines.Append(idx);
    }

    TrampolineInfo *trampoline = &shared.trampolines[idx];

    trampoline->state = 1;
    trampoline->env = env;
    trampoline->instance = instance;
    trampoline->stack = instance->sync_memory.stack;
    trampoline->proto = proto;
    NAPI_OK(napi_create_reference(env, func, 1, &trampoline->func));

    return GetTrampolinePointer(idx);
}

bool CallData::CheckDynamicLength(napi_value obj, Size element, const char *countedby, napi_value value)
{
    int64_t expected = -1;
    int64_t size = -1;

    // Get expected size
    {
        napi_value by;
        napi_status status = napi_get_named_property(env, obj, countedby, &by);

        if (status != napi_ok || !TryNumber(env, by, &expected)) [[unlikely]] {
            ThrowError<Napi::Error>(env, "Unexpected %1 value for dynamic length, expected number", GetValueType(instance, by));
            return false;
        }

        // If we get anywhere near overflow there are other problems to worry about.
        // So let's not worry about that.
        expected *= element;
    }

    // Get actual size
    if (uint32_t len = 0; napi_get_array_length(env, value, &len) == napi_ok) {
        size = (int64_t)len * element;
    } else if (size_t len = 0; node_api_get_buffer_info(env, value, nullptr, &len) == napi_ok) {
        size = (int64_t)len;
    } else if (size_t len = 0; napi_get_arraybuffer_info(env, value, nullptr, &len) == napi_ok) {
        size = (int64_t)len;
    } else if (!IsNullOrUndefined(env, value)) {
        size = element;
    } else {
        size = 0;
    }

    if (size != expected) {
        ThrowError<Napi::Error>(env, "Mismatched dynamic length between '%1' and actual array", countedby);
        return false;
    }

    return true;
}

#if defined(K_DEBUG)

void CallData::FillMemory(void *ptr, Size len)
{
    static bool randomize = GetDebugFlag("RANDOMIZE_MEMORY");

    if (randomize) {
        FillRandomSafe(ptr, len);
    } else {
        MemSet(ptr, 0, len);
    }
}

static bool IsDebugCallsEnabled()
{
    static bool debug = GetDebugFlag("DEBUG_CALLS");
    return debug;
}

void CallData::DebugCall(const FunctionInfo *func)
{
    if (!IsDebugCallsEnabled())
        return;

    PrintLn(StdErr, "%!..+---- %1 (%2) ----%!0", func->name, CallConventionNames[(int)func->convention]);

    if (func->parameters.len) {
        PrintLn(StdErr, "Parameters:");
        for (Size i = 0; i < func->parameters.len; i++) {
            const ParameterInfo &param = func->parameters[i];
            PrintLn(StdErr, "  %1 = %2 (%3)", i, param.type->name, FmtMemSize(param.type->size));
        }
    }

    PrintLn(StdErr, "Return: %1 (%2)", func->ret->name, FmtMemSize(func->ret->size));
}

void CallData::DebugForward()
{
    if (!IsDebugCallsEnabled())
        return;

    Span<const uint8_t> stack = MakeSpan(new_stack, this->stack.end);
    Span<const uint8_t> heap = MakeSpan(prev_heap, this->heap.ptr);

    DumpMemory("Stack", stack);
    DumpMemory("Heap", heap);
}

#endif

#if defined(__GNUC__)
    #define TRANSLATE_FUNC __attribute__((no_stack_protector))
#else
    #define TRANSLATE_FUNC
#endif

static TRANSLATE_FUNC napi_value TranslateZeroCall(napi_env env, napi_callback_info info)
{
    struct CallbackBundle {
        napi_env env;
        void *data;
    };

    CallbackBundle **ptr = (CallbackBundle **)((uint8_t *)info + K_SIZE(void *));
    FunctionInfo *func = (FunctionInfo *)(*ptr)->data;

    InstanceData *instance = func->instance;
    CallData call(env, instance, &instance->sync_memory);

    K_DEFER_C(prev_call = instance->sync_call) { instance->sync_call = prev_call; };
    instance->sync_call = &call;

    call.DebugCall(func);

    napi_value ret = call.Run(func, func->native);
    call.FinalizeFast();

    return ret;
}

static TRANSLATE_FUNC napi_value TranslateFastCall(napi_env env, napi_callback_info info)
{
    static_assert(MaxParameters >= 6);

    CallData call(env);
    size_t count = 6;
    FunctionInfo *func;

    NAPI_OK(napi_get_cb_info(env, info, &count, call.args, nullptr, (void **)&func));

    if (count < (size_t)func->required_parameters) [[unlikely]] {
        ThrowError<Napi::TypeError>(env, "Expected %1 arguments, got %2", func->parameters.len, count);
        return Napi::Env(env).Null();
    }

    InstanceData *instance = func->instance;
    call.Init(instance, &instance->sync_memory);

    K_DEFER_C(prev_call = instance->sync_call) { instance->sync_call = prev_call; };
    instance->sync_call = &call;

    call.DebugCall(func);

    napi_value ret = call.Run(func, func->native);
    call.FinalizeFast();

    return ret;
}

static TRANSLATE_FUNC K_FORCE_INLINE napi_value TranslateNormalCall(CallData *call, const FunctionInfo *func, void *native, Size count)
{
    if (count < func->required_parameters) [[unlikely]] {
        ThrowError<Napi::TypeError>(call->env, "Expected %1 arguments, got %2", func->parameters.len, count);
        return call->env.Null();
    }

    InstanceData *instance = func->instance;
    call->Init(instance, &instance->sync_memory);

    K_DEFER_C(prev_call = instance->sync_call) { instance->sync_call = prev_call; };
    instance->sync_call = call;

    call->DebugCall(func);

    napi_value ret = call->Run(func, native);
    call->Finalize();

    return ret;
}

static TRANSLATE_FUNC napi_value TranslateNormalCall(napi_env env, napi_callback_info info)
{
    static_assert(MaxParameters >= 8);

    CallData call(env);
    size_t count = 8;
    FunctionInfo *func;

    NAPI_OK(napi_get_cb_info(env, info, &count, call.args, nullptr, (void **)&func));

    if (count > 8) {
        NAPI_OK(napi_get_cb_info(env, info, &count, call.args, nullptr, nullptr));
        count = std::min(count, (size_t)MaxParameters);
    }

    return TranslateNormalCall(&call, func, func->native, (Size)count);
}

static TRANSLATE_FUNC napi_value TranslateNormalCallDebugAsync(napi_env env, napi_callback_info info)
{
    static_assert(MaxParameters >= 8);

    CallData call(env);
    size_t count = 8;
    FunctionInfo *func;

    NAPI_OK(napi_get_cb_info(env, info, &count, call.args, nullptr, (void **)&func));

    if (count > 8) {
        NAPI_OK(napi_get_cb_info(env, info, &count, call.args, nullptr, nullptr));
        count = std::min(count, (size_t)MaxParameters);
    }
    if (count < (size_t)func->required_parameters) [[unlikely]] {
        ThrowError<Napi::TypeError>(env, "Expected %1 arguments, got %2", func->parameters.len, count);
        return Napi::Env(env).Null();
    }

    InstanceData *instance = func->instance;
    call.Init(instance, &instance->sync_memory);

    K_DEFER_C(prev_call = instance->sync_call) { instance->sync_call = prev_call; };
    instance->sync_call = &call;

    call.DebugCall(func);

    // The async call code partly works differently, with Yield and Return instructions which do not
    // get used for normal sync calls. To exercise them, we also run the sync tests using async
    // instructions, by setting DEBUG_ASYNC=1.

    napi_value ret;
    if (call.PrepareAsync(func)) {
        call.ExecuteAsync(func->native);
        ret = call.EndAsync();
    } else {
        ret = Napi::Env(env).Null();
    }
    call.Finalize();

    return ret;
}

static TRANSLATE_FUNC K_FORCE_INLINE napi_value TranslateVariadicCall(CallData *call, const FunctionInfo *func, void *native, Size count)
{
    InstanceData *instance = func->instance;
    call->Init(instance, &instance->sync_memory);

    FunctionInfo *variadic = nullptr;
    K_DEFER_N(err_guard) { delete variadic; };

    // Try cached function
    {
        FunctionInfo *prev = instance->variadic_func;

        if (prev && prev->native == native) {
            Size specified = (count - prev->required_parameters);
            Size processed = (prev->parameters.len - prev->required_parameters) * 2;

            if (specified == processed) {
                bool match = true;

                for (Size i = prev->required_parameters, j = prev->required_parameters; i < (Size)count; i += 2, j++) {
                    int directions;
                    const TypeInfo *type = ResolveType(instance, call->args[i], &directions);

                    if (type != prev->parameters[j].type || directions != prev->parameters[j].directions) [[unlikely]] {
                        match = false;
                        break;
                    }
                }

                if (match) [[likely]] {
                    variadic = prev;

                    // If an error happens it'll get destroyed, so don't keep it around
                    instance->variadic_func = nullptr;
                }
            }
        }
    }

    if (!variadic) {
        Napi::Env env = call->env;

        variadic = new FunctionInfo();

        memcpy((void *)variadic, func, K_SIZE(*func));
        memset((void *)&variadic->parameters, 0, K_SIZE(variadic->parameters));

        variadic->parameters = func->parameters;
        variadic->lib = nullptr;

        if (count < variadic->required_parameters) [[unlikely]] {
            ThrowError<Napi::TypeError>(env, "Expected %1 arguments or more, got %2", variadic->parameters.len, count);
            return Napi::Env(env).Null();
        }
        if ((count - variadic->required_parameters) % 2) [[unlikely]] {
            ThrowError<Napi::Error>(env, "Missing value argument for variadic call");
            return Napi::Env(env).Null();
        }

        for (Size i = variadic->required_parameters; i < count; i += 2) {
            ParameterInfo param = {};

            param.type = ResolveType(instance, call->args[i], &param.directions);

            if (!param.type) [[unlikely]]
                return Napi::Env(env).Null();
            if (!CanPassType(param.type, param.directions)) [[unlikely]] {
                ThrowError<Napi::TypeError>(env, "Type %1 cannot be used as a parameter", param.type->name);
                return Napi::Env(env).Null();
            }
            if (variadic->parameters.len >= MaxParameters) [[unlikely]] {
                ThrowError<Napi::TypeError>(env, "Functions cannot have more than %1 parameters", MaxParameters);
                return Napi::Env(env).Null();
            }

            param.variadic = true;
            param.offset = (int8_t)(i + 1);

            variadic->parameters.Append(param);
        }

        if (!PreparePlan(instance, variadic)) [[unlikely]]
            return Napi::Env(env).Null();
    }

    K_DEFER_C(prev_call = instance->sync_call) { instance->sync_call = prev_call; };
    instance->sync_call = call;

    call->DebugCall(func);

    napi_value ret = call->Run(variadic, native);
    call->Finalize();

    if (variadic != instance->variadic_func) {
        err_guard.Disable();

        delete instance->variadic_func;
        instance->variadic_func = variadic;
    }

    return ret;
}

static TRANSLATE_FUNC napi_value TranslateVariadicCall(napi_env env, napi_callback_info info)
{
    static_assert(MaxParameters >= 8);

    CallData call(env);
    size_t count = 8;
    FunctionInfo *func;

    NAPI_OK(napi_get_cb_info(env, info, &count, call.args, nullptr, (void **)&func));

    if (count > 8) {
        NAPI_OK(napi_get_cb_info(env, info, &count, call.args, nullptr, nullptr));
        count = std::min(count, (size_t)MaxParameters);
    }

    return TranslateVariadicCall(&call, func, func->native, (Size)count);
}

#undef TRANSLATE_FUNC

class AsyncCall {
    Napi::Env env;

    napi_async_work work = nullptr;
    napi_ref callback = nullptr;

    const FunctionInfo *func = nullptr;
    InstanceMemory *mem = nullptr;
    NoDestroy<CallData> call;

    bool prepared = false;

    int last_errno = 0;
#if defined(_WIN32)
    void *last_error = nullptr;
#endif

public:
    AsyncCall(Napi::Env env) : env(env), call(env) {}
    ~AsyncCall();

    napi_value *Args() { return call->args; }

    bool Prepare(InstanceData *instance, InstanceMemory *mem, const FunctionInfo *func, napi_value callback);
    void Queue();

    void Execute();
    void Complete();
    void Fail(napi_value err);

    static void HandleExecute(napi_env env, void *udata);
    static void HandleComplete(napi_env env, napi_status status, void *udata);
};

void AsyncCall::HandleExecute(napi_env, void *udata)
{
    AsyncCall *async = (AsyncCall *)udata;
    async->Execute();
}

void AsyncCall::HandleComplete(napi_env, napi_status status, void *udata)
{
    AsyncCall *async = (AsyncCall *)udata;

    K_ASSERT(status == napi_ok);
    async->Complete();

    delete async;
}

AsyncCall::~AsyncCall()
{
#if defined(K_DEBUG)
    call->~CallData();
#endif

    if (func) {
        ReleaseAsyncMemory(call->instance, mem);
        func->Unref();
    }

    node_api_delete_reference(env, callback);
    napi_delete_async_work(env, work);
}

bool AsyncCall::Prepare(InstanceData *instance, InstanceMemory *mem, const FunctionInfo *func, napi_value callback)
{
    K_ASSERT(!work);

    // Init async work
    {
        napi_value name;
        NAPI_OK(napi_create_string_utf8(env, func->name, NAPI_AUTO_LENGTH, &name));

        NAPI_OK(napi_create_async_work(env, nullptr, name, &AsyncCall::HandleExecute, &AsyncCall::HandleComplete, this, &work));
        NAPI_OK(napi_create_reference(env, callback, 1, &this->callback));
    }

    // Keep together (see destructor)
    this->func = func->Ref();
    this->mem = mem;
    call->Init(instance, mem);

    call->DebugCall(func);

    prepared = call->PrepareAsync(func);

    if (!prepared) [[unlikely]] {
        Napi::Error err = env.GetAndClearPendingException();
        Fail(err.Value());
    }

    return prepared;
}

void AsyncCall::Queue()
{
    K_ASSERT(prepared);
    NAPI_OK(napi_queue_async_work(env, work));
}

void AsyncCall::Execute()
{
    K_ASSERT(prepared);
    call->ExecuteAsync(func->native);

    last_errno = errno;

#if defined(_WIN32)
    TEB *teb = GetTEB();
    last_error = teb->EnvironmentPointer;
#endif
}

void AsyncCall::Complete()
{
    K_ASSERT(prepared);

    napi_value ret = call->EndAsync();
    call->Finalize();

    napi_value recv;
    napi_value func;
    napi_value args[] = { env.Null(), ret ? ret : env.Undefined() };

    NAPI_OK(napi_get_undefined(env, &recv));
    NAPI_OK(napi_get_reference_value(env, callback, &func));

#if defined(_WIN32)
    TEB *teb = GetTEB();

    K_DEFER_C(prev_errno = errno,
              prev_error = teb->EnvironmentPointer) {
        errno = prev_errno;
        teb->EnvironmentPointer = prev_error;
    };
    errno = last_errno;
    teb->EnvironmentPointer = last_error;
#else
    K_DEFER_C(prev_errno = errno) { errno = prev_errno; };
    errno = last_errno;
#endif

    napi_call_function(env, recv, func, K_LEN(args), args, nullptr);
}

void AsyncCall::Fail(napi_value err)
{
    call->Finalize();

    napi_value recv;
    napi_value func;
    napi_value args[] = { err, env.Undefined() };

    NAPI_OK(napi_get_undefined(env, &recv));
    NAPI_OK(napi_get_reference_value(env, callback, &func));

    napi_call_function(env, recv, func, K_LEN(args), args, nullptr);
}

static napi_value TranslateAsyncCall(napi_env env, napi_callback_info info)
{
    static_assert(MaxParameters >= 6);

    AsyncCall *async = new AsyncCall(env);
    K_DEFER_N(err_guard) { delete async; };

    napi_value *args = async->Args();
    size_t count = 6;
    FunctionInfo *func;

    NAPI_OK(napi_get_cb_info(env, info, &count, args, nullptr, (void **)&func));

    if (count > 6) {
        NAPI_OK(napi_get_cb_info(env, info, &count, args, nullptr, nullptr));
        count = std::min(count, (size_t)MaxParameters);
    }
    if (count <= (size_t)func->required_parameters) {
        ThrowError<Napi::TypeError>(env, "Expected %1 arguments, got %2", func->required_parameters + 1, count);
        return Napi::Env(env).Null();
    }

    InstanceData *instance = func->instance;

    Napi::Value callback = Napi::Value(env, args[func->required_parameters]);

    if (!callback.IsFunction()) {
        ThrowError<Napi::TypeError>(env, "Expected callback function as last argument, got %1", GetValueType(instance, callback));
        return Napi::Env(env).Null();
    }

    InstanceMemory *mem = AllocateAsyncMemory(instance);
    if (!mem) [[unlikely]] {
        ThrowError<Napi::Error>(env, "Too many asynchronous calls are running");
        return Napi::Env(env).Null();
    }

    if (!async->Prepare(instance, mem, func, callback))
        return Napi::Env(env).Null();

    async->Queue();
    err_guard.Disable();

    return Napi::Env(env).Undefined();
}

static bool DetectDeno(Napi::Env env)
{
    Napi::Value ret = env.RunScript("typeof Deno != 'undefined'");
    Napi::Boolean b = ret.ToBoolean();

    return b.Value();
}

static bool DetectBun(Napi::Env env)
{
    Napi::Value ret = env.RunScript("process.isBun");
    Napi::Boolean b = ret.ToBoolean();

    return b.Value();
}

void InitTranslateZeroCall(Napi::Env env)
{
    if (DetectDeno(env) || DetectBun(env)) {
        translate_zero_call = TranslateFastCall;
        return;
    }

    Napi::Object self = Napi::Object::New(env);

    napi_value func;
    napi_value ret;

    auto cb = [](napi_env env, napi_callback_info info) {
        napi_value self;
        NAPI_OK(napi_get_cb_info(env, info, nullptr, nullptr, &self, nullptr));

        napi_value *ptr = (napi_value *)info;

        if (ptr[0] != self && ptr[1] != self) {
            translate_zero_call = TranslateZeroCall;
        } else {
            translate_zero_call = TranslateFastCall;
        }

        return self;
    };

    NAPI_OK(napi_create_function(env, nullptr, 0, cb, nullptr, &func));
    NAPI_OK(napi_call_function(env, self, func, 0, nullptr, &ret));
}

napi_value CallPointer(Napi::Env env, const FunctionInfo *proto, void *native, napi_value *args, Size count)
{
    CallData call(env);

    Size copy = std::min(count * K_SIZE(*call.args), K_SIZE(call.args));
    MemCpy(call.args, args, copy);

    if (proto->variadic) {
        return TranslateVariadicCall(&call, proto, native, count);
    } else {
        return TranslateNormalCall(&call, proto, native, count);
    }
}

static void PerformAsyncRelay(napi_env, napi_value, void *, void *udata)
{
    RelayContext *ctx = (RelayContext *)udata;
    CallData *call = ctx->call;

    call->Relay(ctx->idx, ctx->base);
    call->Finalize();

    // We're done!
    std::lock_guard<std::mutex> lock(ctx->mutex);
    ctx->done = true;
    ctx->cv.notify_one();
}

bool InitAsyncBroker(InstanceData *instance)
{
    if (!instance->broker) {
        Napi::Env env = instance->env;

        if (napi_create_threadsafe_function(env, nullptr, nullptr,
                                            NewString(env, "Koffi Async Callback Broker"),
                                            0, 1, nullptr, nullptr, nullptr,
                                            PerformAsyncRelay, &instance->broker) != napi_ok) {
            LogError("Failed to create async callback broker");
            return false;
        }

        NAPI_OK(napi_unref_threadsafe_function(env, instance->broker));
    }

    return true;
}

void *GetTrampolinePointer(Size idx)
{
    return (void *)(TrampolineStart + TrampolineSize * idx);
}

Size GetTrampolineIndex(void *ptr)
{
    return ((uint8_t *)ptr - TrampolineStart) / TrampolineSize;
}

static bool CanTypeAcceptFunctions(const TypeInfo *type)
{
    if (type->primitive == PrimitiveKind::Pointer)
        return true;
    if (type->primitive == PrimitiveKind::Callback)
        return true;

    if (IsAggregate(type) && std::any_of(type->members.begin(), type->members.end(),
                                         [](const RecordMember &member) { return CanTypeAcceptFunctions(member.type); }))
        return true;
    if (type->primitive == PrimitiveKind::Array && CanTypeAcceptFunctions(type->ref.type))
        return true;

    return false;
}

static bool CanUseFastCall(const FunctionInfo *func)
{
    if (func->parameters.len > 6)
        return false;

    // Fast calls basically skip CallData::Finalize(), which handles output arguments and
    // temporary callback trampolines. If the function does not use any output argument
    // and cannot accept JS functions (so no pointer/callback argument), we can skip finalization!

    for (const ParameterInfo &param: func->parameters) {
        if (param.directions & 2)
            return false;
        if (CanTypeAcceptFunctions(param.type))
            return false;
    }

    return true;
}

napi_value DescribeFunction(InstanceData *instance, const FunctionInfo *func)
{
    static const char *const DirectionNames[] = {
        nullptr,
        "Input",
        "Output",
        "Input/Output"
    };

    Napi::Env env = instance->env;

    Napi::Object meta = Napi::Object::New(env);
    Napi::Array arguments = Napi::Array::New(env, func->parameters.len);

    meta.Set("name", NewString(env, func->name));
    meta.Set("arguments", arguments);
    meta.Set("result", WrapType(instance, func->ret));

    for (Size i = 0; i < func->parameters.len; i++) {
        const ParameterInfo &param = func->parameters[i];
        Napi::Object obj = Napi::Object::New(env);

        obj.Set("type", WrapType(instance, param.type));
        obj.Set("direction", NewString(env, DirectionNames[param.directions]));

        arguments.Set((uint32_t)i, obj);
    }

    meta.Freeze();

    return meta;
}

static bool IsDebugAsyncEnabled()
{
    static bool debug = GetDebugFlag("DEBUG_ASYNC");
    return debug;
}

napi_value WrapFunction(InstanceData *instance, const FunctionInfo *func)
{
    Napi::Env env = instance->env;

    Napi::Function wrapper;
    {
        napi_value value;

        if (func->variadic) {
            NAPI_OK(napi_create_function(env, func->name, NAPI_AUTO_LENGTH, TranslateVariadicCall, (void *)func->Ref(), &value));
        } else if (IsDebugAsyncEnabled()) {
            NAPI_OK(napi_create_function(env, func->name, NAPI_AUTO_LENGTH, TranslateNormalCallDebugAsync, (void *)func->Ref(), &value));
        } else if (!func->parameters.len) {
            NAPI_OK(napi_create_function(env, func->name, NAPI_AUTO_LENGTH, translate_zero_call, (void *)func->Ref(), &value));
        } else if (CanUseFastCall(func)) {
            NAPI_OK(napi_create_function(env, func->name, NAPI_AUTO_LENGTH, TranslateFastCall, (void *)func->Ref(), &value));
        } else {
            NAPI_OK(napi_create_function(env, func->name, NAPI_AUTO_LENGTH, TranslateNormalCall, (void *)func->Ref(), &value));
        }

        wrapper = Napi::Function(env, value);
        wrapper.AddFinalizer([](Napi::BasicEnv, FunctionInfo *func) { func->Unref(); }, (FunctionInfo *)func);
    }

    if (!func->variadic) {
        napi_value value;
        NAPI_OK(napi_create_function(env, func->name, NAPI_AUTO_LENGTH, TranslateAsyncCall, (void *)func->Ref(), &value));

        Napi::Function async = Napi::Function(env, value);
        async.AddFinalizer([](Napi::BasicEnv, FunctionInfo *func) { func->Unref(); }, (FunctionInfo *)func);

        wrapper.Set("async", async);
    }

    napi_value meta = DescribeFunction(instance, func);
    wrapper.Set("info", meta);

    return wrapper;
}

static K_FORCE_INLINE bool CheckTrampolineStatus(TrampolineInfo *trampoline)
{
    if (trampoline->state == 1) [[likely]]
        return true;

    Napi::Env env = trampoline->env;

    if (!trampoline->state) {
        ThrowError<Napi::Error>(env, "Cannot use non-registered callback beyond FFI call");
        trampoline->state = -1;
    }

    // We use trampoline->state < 0 as a signal than an exception has occured, because we want
    // to avoid calling IsExceptionPending() in the happy path. But trampolines get reused, so
    // there might not be an exception anymore!
    if (!env.IsExceptionPending()) {
        trampoline->state = 1;
        return true;
    }

    return false;
}

extern "C" void RelayCallback(Size idx, uint8_t *sp)
{
    TrampolineInfo *trampoline = &shared.trampolines[idx];
    InstanceData *instance = trampoline->instance;

    // Fast path: main thread and we are running a native call through Koffi.
    // But this means we are running on the custom Koffi stack, which could trip up
    // Node and V8, so we need to switch back to the normal/main stack.
    if (sp >= trampoline->stack.ptr && sp <= trampoline->stack.end) [[likely]] {
        InstanceMemory *mem0 = &instance->sync_memory;
        CallData *call = instance->sync_call;

        K_DEFER_C(prev_stack = mem0->stack.end,
                  prev_heap = mem0->heap.ptr) {
            mem0->stack.end = prev_stack;
            mem0->heap.ptr = prev_heap;
        };
        mem0->heap.ptr = call->heap.ptr;

        SwitchAndRelay(call, idx, sp, call->saved_sp, &mem0->stack.end);
        return;
    }

    if (!CheckTrampolineStatus(trampoline))
        return;

    // Otherwise, we need to allocate memory to perform the callback.
    // Since the necessary machinery live in CallData, just use a temporary instance.
    // In some cases we would reuse the existing call, but it is rare so let's ignore
    // this for simplicity.

    Napi::Env env = trampoline->env;

    InstanceMemory *mem = AllocateAsyncMemory(instance);
    if (!mem) [[unlikely]] {
        ThrowError<Napi::Error>(env, "Too many asynchronous calls are running");
        return;
    }
    K_DEFER { ReleaseAsyncMemory(instance, mem); };

    if (std::this_thread::get_id() == instance->main_thread_id) {
        CallData call(env, instance, mem);
        K_DEFER { call.Finalize(); };

        napi_handle_scope scope;
        NAPI_OK(napi_open_handle_scope(env, &scope));
        K_DEFER { napi_close_handle_scope(env, scope); };

        call.Relay(idx, sp);
    } else {
        CallData call(env, instance, mem);
        call.RelayAsync(idx, sp);
    }
}

extern "C" void RelayDirect(CallData *call, Size idx, uint8_t *sp)
{
    TrampolineInfo *trampoline = &shared.trampolines[idx];

#if defined(_WIN32)
    TEB *teb = GetTEB();
    InstanceData *instance = trampoline->instance;

    // Restore previous stack limits at the end
    K_DEFER_C(base = teb->StackBase,
              limit = teb->StackLimit,
              dealloc = teb->DeallocationStack) {
        teb->StackBase = base;
        teb->StackLimit = limit;
        teb->DeallocationStack = dealloc;
    };

    // Adjust stack limits so SEH works correctly
    teb->StackBase = instance->real_stack.end;
    teb->StackLimit = instance->real_stack.ptr;
    teb->DeallocationStack = instance->real_stack.ptr;
#endif

    if (!CheckTrampolineStatus(trampoline))
        return;

    // Relay the call
    {
        napi_handle_scope scope;
        NAPI_OK(napi_open_handle_scope(call->env, &scope));
        K_DEFER { napi_close_handle_scope(call->env, scope); };

        call->Relay(idx, sp);
    }
}

bool Encode(InstanceData *instance, uint8_t *origin, napi_value value, const TypeInfo *type)
{
    Napi::Env env = instance->env;

    InstanceMemory mem = {};
    CallData call(env, instance, &mem);

#define PUSH_INTEGER(CType) \
        do { \
            CType v; \
            if (!TryNumber(env, value, &v)) [[unlikely]] { \
                ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected number", GetValueType(instance, value)); \
                return false; \
            } \
             \
            *(CType *)origin = v; \
        } while (false)
#define PUSH_INTEGER_SWAP(CType) \
        do { \
            CType v; \
            if (!TryNumber(env, value, &v)) [[unlikely]] { \
                ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected number", GetValueType(instance, value)); \
                return false; \
            } \
             \
            *(CType *)origin = ReverseBytes(v); \
        } while (false)

    switch (type->primitive) {
        case PrimitiveKind::Void: { K_UNREACHABLE(); } break;

        case PrimitiveKind::Bool: {
            bool b;
            napi_status status = napi_get_value_bool(env, value, &b);

            if (status != napi_ok) [[unlikely]] {
                ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected boolean", GetValueType(instance, value));
                return false;
            }

            *(bool *)origin = b;
        } break;
        case PrimitiveKind::Int8: { PUSH_INTEGER(int8_t); } break;
        case PrimitiveKind::UInt8: { PUSH_INTEGER(uint8_t); } break;
        case PrimitiveKind::Int16: { PUSH_INTEGER(int16_t); } break;
        case PrimitiveKind::Int16S: { PUSH_INTEGER_SWAP(int16_t); } break;
        case PrimitiveKind::UInt16: { PUSH_INTEGER(uint16_t); } break;
        case PrimitiveKind::UInt16S: { PUSH_INTEGER_SWAP(uint16_t); } break;
        case PrimitiveKind::Int32: { PUSH_INTEGER(int32_t); } break;
        case PrimitiveKind::Int32S: { PUSH_INTEGER_SWAP(int32_t); } break;
        case PrimitiveKind::UInt32: { PUSH_INTEGER(uint32_t); } break;
        case PrimitiveKind::UInt32S: { PUSH_INTEGER_SWAP(uint32_t); } break;
        case PrimitiveKind::Int64: { PUSH_INTEGER(int64_t); } break;
        case PrimitiveKind::Int64S: { PUSH_INTEGER_SWAP(int64_t); } break;
        case PrimitiveKind::UInt64: { PUSH_INTEGER(uint64_t); } break;
        case PrimitiveKind::UInt64S: { PUSH_INTEGER_SWAP(uint64_t); } break;
        case PrimitiveKind::String: {
            const char *str;
            if (!call.PushString(value, 1, &str)) [[unlikely]]
                return false;
            *(const char **)origin = str;
        } break;
        case PrimitiveKind::String16: {
            const char16_t *str16;
            if (!call.PushString16(value, 1, &str16)) [[unlikely]]
                return false;
            *(const char16_t **)origin = str16;
        } break;
        case PrimitiveKind::String32: {
            const char32_t *str32;
            if (!call.PushString32(value, 1, &str32)) [[unlikely]]
                return false;
            *(const char32_t **)origin = str32;
        } break;
        case PrimitiveKind::Pointer: {
            void *ptr;
            if (!call.PushPointer(value, type, 1, &ptr)) [[unlikely]]
                return false;
            *(void **)origin = ptr;
        } break;
        case PrimitiveKind::Record:
        case PrimitiveKind::Union: {
            if (!call.PushObject(value, type, origin)) [[unlikely]]
                return false;
        } break;
        case PrimitiveKind::Array: {
            if (IsArray(env, value)) {
                Napi::Array array = Napi::Array(env, value);
                if (!call.PushNormalArray(array, type, type->size, origin))
                    return false;
            } else if (Span<uint8_t> buffer = {}; TryBuffer(env, value, &buffer)) {
                call.PushBuffer(buffer, type, origin);
            } else if (GetKindOf(env, value) == napi_string) {
                if (!call.PushStringArray(value, type, origin))
                    return false;
            } else {
                ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected array", GetValueType(instance, value));
                return false;
            }
        } break;
        case PrimitiveKind::Float32: {
            float f;
            if (!TryNumber(env, value, &f)) [[unlikely]] {
                ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected number", GetValueType(instance, value));
                return false;
            }

            memcpy(origin, &f, 4);
        } break;
        case PrimitiveKind::Float64: {
            double d;
            if (!TryNumber(env, value, &d)) [[unlikely]] {
                ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected number", GetValueType(instance, value));
                return false;
            }

            memcpy(origin, &d, 8);
        } break;
        case PrimitiveKind::Callback: {
            void *ptr;
            if (!TryPointer(env, value, &ptr)) [[unlikely]] {
                if (GetKindOf(env, value) == napi_function) {
                    ThrowError<Napi::Error>(env, "Cannot encode non-registered callback");
                } else {
                    ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected %2", GetValueType(instance, value), type->name);
                }
                return false;
            }

            *(void **)origin = ptr;
        } break;

        case PrimitiveKind::Prototype: { K_UNREACHABLE(); } break;
    }

#undef PUSH_INTEGER_SWAP
#undef PUSH_INTEGER

    // Keep memory around if any was allocated
    if (call.allocator->IsUsed()) {
        HeapChain *copy = instance->encode_map.FindValue(origin, nullptr);

        if (!copy) {
            copy = instance->encode_allocators.AppendDefault();
            instance->encode_map.Set(origin, copy);
        }

        std::swap(*call.allocator, *copy);
        call.allocator->ReleaseAll();
    }

    return true;
}

}
