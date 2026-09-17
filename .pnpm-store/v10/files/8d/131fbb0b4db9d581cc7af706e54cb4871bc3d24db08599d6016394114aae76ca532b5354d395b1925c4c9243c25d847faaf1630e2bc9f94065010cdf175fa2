// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#pragma once

#include "lib/native/base/base.hh"

#include <napi.h>

namespace K {

struct InstanceData;
struct FunctionInfo;
struct TypeInfo;
struct CallData;
struct TrampolineInfo;

struct OpData {
    void *o;
    int16_t s1 = 0;
    int16_t s2 = 0;
    union {
        int32_t i = 0;
        struct {
            int16_t s3;
            int16_t s4;
        };
    };
    const TypeInfo *type = nullptr;
};

struct ExecutionPlan {
    HeapArray<OpData> sync;
    HeapArray<OpData> async;
    HeapArray<OpData> relay;

    Size stk_size = 0;
};

enum class Opcode {
    #define PRIMITIVE(Name) Push ## Name,
    #include "primitives.inc"
    PushAggregateReg,
    PushAggregatePair,
    PushAggregateSplit,
    PushAggregateMem,
    PushPair,

    #define PRIMITIVE(Name) Run ## Name,
    #include "primitives.inc"
    RunAggregateG,
    RunAggregateF,
    RunAggregateD,
    RunAggregateGG,
    RunAggregateDD,
    RunAggregateGD,
    RunAggregateDG,
    RunAggregateHfa,
    RunAggregateMem,
    #define PRIMITIVE(Name) Run ## Name ## X,
    #include "primitives.inc"
    RunAggregateGX,
    RunAggregateFX,
    RunAggregateDX,
    RunAggregateGGX,
    RunAggregateDDX,
    RunAggregateGDX,
    RunAggregateDGX,
    RunAggregateHfaX,
    RunAggregateMemX,

    Yield,

    CallG,
    CallF,
    CallD,
    CallGG,
    CallDD,
    CallGD,
    CallDG,
    CallHfa,
    CallMem,
    CallGX,
    CallFX,
    CallDX,
    CallGGX,
    CallDDX,
    CallGDX,
    CallDGX,
    CallHfaX,
    CallMemX,

    #define PRIMITIVE(Name) Return ## Name,
    #include "primitives.inc"
    ReturnAggregateReg,
    ReturnAggregateMem
};

bool PreparePlan(InstanceData *instance, FunctionInfo *func);

static inline void *Code2Op(Opcode code) { return (void *)code; }

void FillAsyncPlan(Span<const OpData> sync, HeapArray<OpData> *out_async);

#if defined(__GNUC__) || defined(__clang__)
    #if defined(__x86_64__) || defined(__aarch64__)
        #if  __has_attribute(musttail) && __has_attribute(preserve_none)
            #define MUST_TAIL __attribute__((musttail))
            #define PRESERVE_NONE __attribute__((preserve_none))
            #define NO_STACK_PROTECTOR __attribute__((no_stack_protector))
        #endif
    #endif
#endif

#if defined(MUST_TAIL)

PRESERVE_NONE typedef napi_value ForwardFunc(CallData *call, uint8_t *base, void *native, const OpData *op);
PRESERVE_NONE typedef int RelayFunc(CallData *call, TrampolineInfo *trampoline, uint8_t *base, const OpData *op);

static K_FORCE_INLINE napi_value RunForward(CallData *call, uint8_t *base, void *native, const OpData *op)
{
    return ((ForwardFunc *)op->o)(call, base, native, op);
}

static K_FORCE_INLINE int RunRelay(CallData *call, TrampolineInfo *trampoline, uint8_t *base, const OpData *op)
{
    return ((RelayFunc *)op->o)(call, trampoline, base, op);

}

#else

napi_value RunForward(CallData *call, uint8_t *base, void *native, const OpData *op);
int RunRelay(CallData *call, TrampolineInfo *trampoline, uint8_t *base, const OpData *op);

#endif

// ABI-specific

void AnalyseFunction(InstanceData *instance, const FunctionInfo *func, ExecutionPlan *out_plan, const char **out_decorated = nullptr);

}
