// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#pragma once

#include "lib/native/base/base.hh"
#include "interp.hh"

#include <napi.h>

namespace K {

#if defined(UNITY_BUILD)
    #define INLINE_UNITY K_FORCE_INLINE
#else
    #define INLINE_UNITY
#endif

// Only napi_ok matters, but many node-api functions fail with napi_cannot_run_js during
// shutdown.
// In Koffi, this mainly happens when running an async callback, while Koffi converts the
// register and stack arguments to JS values and objects. This fails, but it does not matter
// because the situation gets detected once the calback code reaches napi_call_function(),
// which also returns napi_cannot_run_js.
// The easiest fix is to ignore napi_cannot_run_js, so debug builds don't crash during shutdown.
#define NAPI_OK(Call) \
    do { \
        napi_status _status = (Call); \
        K_ASSERT(_status == napi_ok || _status == napi_cannot_run_js); \
    } while (false)

static const Size DefaultSyncStackSize = Mebibytes(1);
static const Size DefaultSyncHeapSize = Mebibytes(2);
static const Size DefaultAsyncStackSize = Kibibytes(128);
static const Size DefaultAsyncHeapSize = Kibibytes(128);
static const int DefaultResidentAsyncPools = 4;
static const int DefaultMaxAsyncCalls = 256;
static const Size DefaultMaxTypeSize = Mebibytes(64);

static const int MaxAsyncCalls = 4096;
static const Size MaxParameters = 64;
static const Size MaxTrampolines = 8192;

enum class PrimitiveKind {
    #define PRIMITIVE(Name) Name,
    #include "primitives.inc"
};
static const char *const PrimitiveKindNames[] = {
    #define PRIMITIVE(Name) K_STRINGIFY(Name),
    #include "primitives.inc"
};

struct InstanceData;
struct TypeInfo;
struct RecordMember;
struct FunctionInfo;
struct CallData;

typedef void DisposeFunc (InstanceData *instance, const TypeInfo *type, const void *ptr);

enum class BufferConversion: int8_t {
    None,
    Swap16,
    Swap32,
    Swap64,
    FloatToDouble
};

enum class ArrayHint: int8_t {
    Array,
    Int8Array,
    Uint8Array,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    BigInt64Array,
    BigUint64Array,
    Float32Array,
    Float64Array,
    Buffer,
    String8,
    String16,
    String32,
};
static_assert((int)ArrayHint::Array == 0);

struct RecordMember {
    const char *name;
    const TypeInfo *type;
    int32_t offset;
    Size countedby;

    napi_ref key = nullptr;

#if defined(K_DEBUG)
    ~RecordMember() { K_ASSERT(!key); }
#endif
};

struct TypeInfo {
    K_DELETE_COPY(TypeInfo)

    InstanceData *instance = nullptr;

    const char *name;
    alignas(8) PrimitiveKind primitive;
    int32_t size;
    int16_t align;
    uint8_t fill; // Aggregates
    ArrayHint hint;

    DisposeFunc *dispose = nullptr;
    napi_ref dispose_ref = nullptr;

    HeapArray<RecordMember> members; // Record or Union
    struct {
        const TypeInfo *type; // Pointer or array
        int32_t stride; // Array only
        BufferConversion conversion; // Array or pointer
    } ref;
    const FunctionInfo *proto; // Callback only
    const char *countedby; // Pointer or array

    mutable napi_ref construct = nullptr; // Union only
    mutable napi_ref defn = nullptr;

    mutable const TypeInfo *reshaped = nullptr;

    TypeInfo() = default;
    ~TypeInfo();

    TypeInfo(TypeInfo &&other) = default;
    TypeInfo &operator=(TypeInfo &&other) = default;

    K_HASHTABLE_HANDLER(TypeInfo, name);
};

struct LibraryHolder {
    K_DELETE_COPY(LibraryHolder)

    void *module = nullptr; // HMODULE on Windows
    mutable int refcount = 1;

    LibraryHolder(void *module) : module(module) {}
    ~LibraryHolder() { Unload(); }

    void Unload();

    const LibraryHolder *Ref() const
    {
        refcount++;
        return this;
    }

    void Unref() const
    {
        if (--refcount)
            return;
        delete this;
    }
};

class LibraryHandle: public Napi::ObjectWrap<LibraryHandle> {
    LibraryHolder *lib = nullptr;

public:
    static Napi::Function InitClass(InstanceData *instance);

    LibraryHandle(const Napi::CallbackInfo &info);

    void Finalize(Napi::BasicEnv env) override;

private:
    Napi::Value Func(const Napi::CallbackInfo &info);
    Napi::Value Symbol(const Napi::CallbackInfo &info);
    Napi::Value Unload(const Napi::CallbackInfo &info);
};

enum class CallConvention {
    Cdecl,
    Stdcall,
    Fastcall,
    Thiscall
};
static const char *const CallConventionNames[] = {
    "Cdecl",
    "Stdcall",
    "Fastcall",
    "Thiscall"
};

struct ParameterInfo {
    const TypeInfo *type;
    int directions;
    bool variadic;
    int8_t offset;
};

// Also used for callbacks, even though many members are not used in this case
struct FunctionInfo {
    mutable int refcount = 1;

    napi_env env;
    InstanceData *instance;
    const LibraryHolder *lib = nullptr;

    const char *name;
    const char *decorated_name; // Only set for some platforms/calling conventions
#if defined(_WIN32)
    int ordinal_name = -1;
#endif

    void *native;
    CallConvention convention;

    const TypeInfo *ret;
    HeapArray<ParameterInfo> parameters;
    int8_t required_parameters;
    bool variadic;

    ExecutionPlan plan;

    ~FunctionInfo();

    const FunctionInfo *Ref() const
    {
        refcount++;
        return this;
    }

    void Unref() const
    {
        if (--refcount)
            return;
        delete this;
    }
};

template <typename T>
struct MemoryRange {
    T *ptr;
    T *end;
};

struct InstanceMemory {
    MemoryRange<uint8_t> stack;
    MemoryRange<uint8_t> heap;

    bool busy;
    bool temporary;

    ~InstanceMemory();

    void Allocate(Size stack_size, Size heap_size);
    bool IsAllocated() const { return stack.ptr; }
};

struct InstanceData {
    napi_env env;

    BucketList<TypeInfo> types;
    HashMap<const char *, const TypeInfo *> types_map;
    BucketList<FunctionInfo> callbacks;
    Size base_types_count;

    const TypeInfo *void_type;
    const TypeInfo *char_type;
    const TypeInfo *char16_type;
    const TypeInfo *char32_type;
    const TypeInfo *str_type;
    const TypeInfo *str16_type;
    const TypeInfo *str32_type;
    const TypeInfo *double_type;

    Napi::ObjectReference object_constructor;
    Napi::FunctionReference construct_lib;
    Napi::FunctionReference construct_type;
    Napi::FunctionReference construct_poll;
    Napi::Reference<Napi::Symbol> active_symbol;

    std::mutex mem_mutex;
    InstanceMemory sync_memory;
    LocalArray<InstanceMemory *, 16> memories;
    int temporaries = 0;

    // Variadic cache
    FunctionInfo *variadic_func = nullptr;

    std::thread::id main_thread_id;
    napi_threadsafe_function broker = nullptr;

    CallData *sync_call = nullptr;

#if defined(_WIN32)
    MemoryRange<void> real_stack;
#endif

    BucketList<HeapChain> encode_allocators;
    HashMap<void *, HeapChain *> encode_map;

    BlockAllocator str_alloc;

    struct {
        Size sync_stack_size = DefaultSyncStackSize;
        Size sync_heap_size = DefaultSyncHeapSize;
        Size async_stack_size = DefaultAsyncStackSize;
        Size async_heap_size = DefaultAsyncHeapSize;
        int resident_async_pools = DefaultResidentAsyncPools;
        int max_temporaries = DefaultMaxAsyncCalls - DefaultResidentAsyncPools;
        Size max_type_size = DefaultMaxTypeSize;
    } config;

    struct {
        int64_t disposed = 0;
    } stats;

    ~InstanceData();
};
static_assert(DefaultResidentAsyncPools <= K_LEN(InstanceData::memories.data));
static_assert(DefaultMaxAsyncCalls >= DefaultResidentAsyncPools);
static_assert(MaxAsyncCalls >= DefaultMaxAsyncCalls);

struct ValueCast {
    napi_env env;
    napi_ref ref;
    const TypeInfo *type;

    ~ValueCast();
};

struct TrampolineInfo {
    int state;

    napi_env env;
    InstanceData *instance;
    MemoryRange<uint8_t> stack;

    const FunctionInfo *proto;
    napi_ref func;
};

struct SharedData {
    std::mutex mutex;

    TrampolineInfo trampolines[MaxTrampolines];
    LocalArray<int16_t, MaxTrampolines> available;

    SharedData()
    {
        available.len = MaxTrampolines;

        for (int16_t i = 0; i < MaxTrampolines; i++) {
            available[i] = i;
        }
    }
};
static_assert(MaxTrampolines <= INT16_MAX);

extern const napi_type_tag LibraryHandleMarker;
extern const napi_type_tag TypeObjectMarker;
extern const napi_type_tag DirectionMarker;
extern const napi_type_tag UnionValueMarker;
extern const napi_type_tag CastMarker;

extern SharedData shared;

// Some Node-API functions are loaded dynamically to work around bugs or because they are recent
extern napi_status (NAPI_CDECL *node_api_delete_reference)(node_api_basic_env env, napi_ref ref);
extern napi_status (NAPI_CDECL *node_api_get_buffer_info)(napi_env env, napi_value value, void **data, size_t *length);
extern napi_status (NAPI_CDECL *node_api_create_property_key_utf8)(napi_env env, const char* str, size_t length, napi_value* result);
extern napi_status (NAPI_CDECL *node_api_post_finalizer)(node_api_basic_env env, napi_finalize finalize_cb, void* finalize_data, void* finalize_hint);
extern napi_status (NAPI_CDECL *node_api_create_object_with_properties)(napi_env env, napi_value prototype_or_null, const napi_value *property_names,
                                                                        const napi_value *property_values, size_t property_count, napi_value *result);

InstanceMemory *AllocateAsyncMemory(InstanceData *instance);
void ReleaseAsyncMemory(InstanceData *instance, InstanceMemory *mem);

}
