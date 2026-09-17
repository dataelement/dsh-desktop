// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#pragma once

#include "lib/native/base/base.hh"
#include "ffi.hh"
#include "util.hh"

#include <napi.h>

namespace K {

struct BackRegisters;

// I'm not sure why the alignas(8), because alignof(CallData) is 8 without it.
// But on Windows i386, without it, the alignment may not be correct (compiler bug?).
struct alignas(8) CallData {
    struct OutArgument {
        enum class Kind {
            Array,
            String,
            String16,
            String32,
            Object,
            Convert
        };

        Kind kind;

        napi_ref ref;
        void *ptr;
        Size len;
        const TypeInfo *type;
    };

    Napi::Env env;
    InstanceData *instance;

    MemoryRange<uint8_t> stack;
    MemoryRange<uint8_t> heap;
#if defined(K_DEBUG)
    uint8_t *new_stack;
    uint8_t *prev_heap;
#endif

    // For big allocations
    NoDestroy<HeapChain> allocator;

    napi_value args[MaxParameters];

    uint8_t *saved_sp;

    uint8_t *async_base;
    const OpData *async_ip;

    LocalArray<int16_t, 16> used_trampolines;
    LocalArray<OutArgument, MaxParameters> out_arguments;

#if defined(K_DEBUG)
    bool finalized = false;
#endif

#if defined(K_DEBUG)
    CallData(napi_env env)
        : env(env), instance(nullptr), stack({}), heap({}),
          new_stack(nullptr), prev_heap(nullptr) {} // Partial initialization, use Init()
    CallData(napi_env env, InstanceData *instance, InstanceMemory *mem)
        : env(env), instance(instance), stack(mem->stack), heap(mem->heap),
          new_stack(mem->stack.end), prev_heap(mem->heap.ptr) {}
    ~CallData();
#else
    CallData(napi_env env) : env(env) {} // Partial initialization, use Init()
    CallData(napi_env env, InstanceData *instance, InstanceMemory *mem)
        : env(env), instance(instance), stack(mem->stack), heap(mem->heap) {}
#endif

    K_FORCE_INLINE void Init(InstanceData *instance, InstanceMemory *mem)
    {
        K_ASSERT(!this->instance);

        this->instance = instance;
        this->stack = mem->stack;
        this->heap = mem->heap;

#if defined(K_DEBUG)
        new_stack = mem->stack.end;
        prev_heap = mem->heap.ptr;
#endif
    }

    INLINE_UNITY napi_value Run(const FunctionInfo *func, void *native);

    bool PrepareAsync(const FunctionInfo *func);
    void ExecuteAsync(void *native);
    napi_value EndAsync();

    INLINE_UNITY void Finalize();
    INLINE_UNITY void FinalizeFast();

    INLINE_UNITY void Relay(Size idx, uint8_t *base);
    void RelayAsync(Size idx, uint8_t *base);

    INLINE_UNITY napi_value CallCallback(const TrampolineInfo *trampoline, const napi_value *args, Size count);

    INLINE_UNITY bool PushString(napi_value value, int directions, const char **out_str);
    INLINE_UNITY bool PushString16(napi_value value, int directions, const char16_t **out_str16);
    INLINE_UNITY bool PushString32(napi_value value, int directions, const char32_t **out_str32);
    INLINE_UNITY Size PushStringValue(napi_value value, const char **out_str);
    INLINE_UNITY Size PushString16Value(napi_value value, const char16_t **out_str16);
    INLINE_UNITY Size PushString32Value(napi_value value, const char32_t **out_str32);

    bool PushObject(napi_value value, const TypeInfo *type, uint8_t *origin);

    bool PushNormalArray(Napi::Array array, const TypeInfo *type, Size size, uint8_t *origin);
    INLINE_UNITY void PushBuffer(Span<const uint8_t> buffer, const TypeInfo *type, uint8_t *origin);
    bool PushStringArray(napi_value value, const TypeInfo *type, uint8_t *origin);

    INLINE_UNITY bool PushPointer(napi_value value, const TypeInfo *type, int directions, void **out_ptr);
    bool PushPointerSlow(napi_value value, napi_valuetype kind, const TypeInfo *type, int directions, void **out_ptr);
    INLINE_UNITY bool PushCallback(napi_value value, const TypeInfo *type, void **out_ptr);
    Size PushIndirectString(Napi::Array array, const TypeInfo *ref, void **out_ptr);

    void *ReserveTrampoline(const FunctionInfo *proto, Napi::Function func);

    template <typename T>
    T *AllocStack(Size size);
    template <typename T = uint8_t>
    T *AllocHeap(Size size);

    bool CheckDynamicLength(napi_value obj, Size element, const char *countedby, napi_value value);

#if defined(K_DEBUG)
    void FillMemory(void *ptr, Size len);

    void DebugCall(const FunctionInfo *func);
    void DebugForward();
#else
    K_FORCE_INLINE void FillMemory(void *, Size) {}

    K_FORCE_INLINE void DebugCall(const FunctionInfo *) {}
    K_FORCE_INLINE void DebugForward() {}
#endif
};

template <typename T>
inline T *CallData::AllocStack(Size size)
{
    K_ASSERT(AlignDown(stack.end, 16) == stack.end);
    K_ASSERT(AlignLen(size, 16) == size);

    uint8_t *ptr = stack.end - size;
    FillMemory(ptr, stack.end - ptr);

#if defined(K_DEBUG)
    new_stack = ptr;
#endif

    return (T *)ptr;
}

template <typename T>
inline T *CallData::AllocHeap(Size size)
{
    K_ASSERT(AlignUp(heap.ptr, 16) == heap.ptr);

    uint8_t *ptr = heap.ptr;
    uint8_t *end = AlignUp(ptr + size, 16);

    if (end <= heap.end) [[likely]] {
        FillMemory(ptr, size);

        heap.ptr = end;

        return ptr;
    } else {
        ptr = (uint8_t *)allocator->Allocate(size);
        K_ASSERT(ptr == AlignUp(ptr, 16));

        FillMemory(ptr, size);

        return ptr;
    }
}

void InitTranslateZeroCall(Napi::Env env);

napi_value DescribeFunction(InstanceData *instance, const FunctionInfo *func);
napi_value WrapFunction(InstanceData *instance, const FunctionInfo *func);
bool DetectCallConvention(Span<const char> name, CallConvention *out_convention);

napi_value CallPointer(Napi::Env env, const FunctionInfo *proto, void *native, napi_value *args, Size count);

bool InitAsyncBroker(InstanceData *instance);

void *GetTrampolinePointer(Size idx);
Size GetTrampolineIndex(void *ptr);

bool Encode(InstanceData *instance, uint8_t *ptr, napi_value value, const TypeInfo *type);

}
