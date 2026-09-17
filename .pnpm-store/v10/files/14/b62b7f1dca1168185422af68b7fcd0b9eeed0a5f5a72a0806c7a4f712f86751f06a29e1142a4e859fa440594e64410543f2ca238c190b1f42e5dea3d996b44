// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#if defined(__i386__) || defined(_M_IX86)

#include "lib/native/base/base.hh"
#include "../ffi.hh"
#include "../interp.hh"
#include "../type.hh"

namespace K {

struct BackRegisters {
    uint32_t eax;
    uint32_t edx;

    union {
        double d;
        float f;
    } x87;

    int ret_type;
    int ret_pop;
};

void AnalyseFunction(InstanceData *instance, const FunctionInfo *func, ExecutionPlan *out_plan, const char **out_decorated)
{
#if defined(__linux__)
    bool regular_ret = IsRegularSize(func->ret->size, 8) && !IsAggregate(func->ret);
#else
    bool regular_ret = IsRegularSize(func->ret->size, 8);
#endif

    int fast_regs = (func->convention == CallConvention::Fastcall) ? 2 :
                    (func->convention == CallConvention::Thiscall) ? 1 : 0;
    bool fast = fast_regs;

    Size fast_offset = 0;
    Size stk_offset = fast ? 4 : 0;

    if (!regular_ret) {
#if defined(_WIN32)
        stk_offset++;
#else
        if (fast_regs) {
            fast_offset++;
            fast_regs--;
        } else {
            stk_offset++;
        }
#endif
    }

    for (const ParameterInfo &param: func->parameters) {
        int16_t offset = 0;

        if (fast_regs && param.type->size <= 4) {
            offset = (int16_t)fast_offset++;
            fast_regs--;
        } else {
            offset = (int16_t)stk_offset;
            stk_offset += (param.type->size + 3) / 4;
        }

        if (IsAggregate(param.type)) {
            out_plan->sync.Append({ .o = Code2Op(Opcode::PushAggregateReg), .s1 = (int16_t)param.offset, .i = offset * 4, .type = param.type });
            out_plan->relay.Append({ .o = Code2Op(Opcode::PushAggregateReg), .s1 = (int16_t)param.offset, .i = offset * 4, .type = param.type });
        } else {
            int delta = (int)Opcode::PushVoid - (int)PrimitiveKind::Void;
            Opcode code = (Opcode)((int)param.type->primitive + delta);

            out_plan->sync.Append({ .o = Code2Op(code), .s1 = (int16_t)param.offset, .s2 = (int16_t)param.directions, .i = offset * 4, .type = param.type });
            out_plan->relay.Append({ .o = Code2Op(code), .s1 = (int16_t)param.offset, .s2 = (int16_t)param.directions, .i = offset * 4, .type = param.type });
        }
    }

    // Some x86 callbacks need additional help
    {
        int type = 0;
        int pop = 0;

        if (func->ret->primitive == PrimitiveKind::Float32) {
            type = 1;
        } else if (func->ret->primitive == PrimitiveKind::Float64) {
            type = 2;
        }

        if (func->convention == CallConvention::Stdcall) {
            pop = (int)(4 * stk_offset);
#if !defined(_WIN32)
        } else if (!regular_ret) {
            pop = 4;
#endif
        }

        if (pop || type) {
            // The x86 relay assembly needs to perform a "ret <pop>" and/or manage the x87 FPU stack.
            out_plan->relay.Append({ .o = Code2Op(Opcode::PushPair), .s1 = (int16_t)type, .s2 = (int16_t)pop, .i = -32 + 16 });
        }
    }

    switch (func->ret->primitive) {
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
        case PrimitiveKind::Pointer:
        case PrimitiveKind::Callback: {
            if (fast) {
                int delta = (int)Opcode::RunVoidX - (int)PrimitiveKind::Void;
                Opcode run = (Opcode)((int)func->ret->primitive + delta);

                out_plan->sync.Append({ .o = Code2Op(run), .s1 = -32, .i = (int32_t)func->parameters.len, .type = func->ret });
                out_plan->relay.Append({ .o = Code2Op(run), .s1 = -32, .i = (int32_t)func->parameters.len, .type = func->ret });
            } else {
                int delta = (int)Opcode::RunVoid - (int)PrimitiveKind::Void;
                Opcode run = (Opcode)((int)func->ret->primitive + delta);

                out_plan->sync.Append({ .o = Code2Op(run), .s1 = -32, .i = (int32_t)func->parameters.len, .type = func->ret });
                out_plan->relay.Append({ .o = Code2Op(run), .s1 = -32, .i = (int32_t)func->parameters.len, .type = func->ret });
            }
        } break;

        case PrimitiveKind::Record:
        case PrimitiveKind::Union: {
#if defined(__FreeBSD__) || defined(__OpenBSD__) || defined(__DragonFly__)
            if (func->ret->members.len == 1) {
                const RecordMember &member = func->ret->members[0];

                if (member.type->primitive == PrimitiveKind::Float32) {
                    Opcode run = fast ? Opcode::RunAggregateFX : Opcode::RunAggregateF;

                    out_plan->sync.Append({ .o = Code2Op(run), .s1 = -32 + 8, .i = (int32_t)func->parameters.len, .type = func->ret });
                    out_plan->relay.Append({ .o = Code2Op(run), .s1 = -32 + 8, .i = (int32_t)func->parameters.len, .type = func->ret });

                    break;
                } else if (member.type->primitive == PrimitiveKind::Float64) {
                    Opcode run = fast ? Opcode::RunAggregateDX : Opcode::RunAggregateD;

                    out_plan->sync.Append({ .o = Code2Op(run), .s1 = -32 + 8, .i = (int32_t)func->parameters.len, .type = func->ret });
                    out_plan->relay.Append({ .o = Code2Op(run), .s1 = -32 + 8, .i = (int32_t)func->parameters.len, .type = func->ret });

                    break;
                }
            }
#endif

            if (regular_ret) {
                Opcode run = fast ? Opcode::RunAggregateGX : Opcode::RunAggregateG;

                out_plan->sync.Append({ .o = Code2Op(run), .s1 = -32, .i = (int32_t)func->parameters.len, .type = func->ret });
                out_plan->relay.Append({ .o = Code2Op(run), .s1 = -32, .i = (int32_t)func->parameters.len, .type = func->ret });
            } else {
                Opcode run = fast ? Opcode::RunAggregateMemX : Opcode::RunAggregateMem;

#if defined(_WIN32)
                int16_t offset = fast ? 16 : 0;
#else
                int16_t offset = 0;
#endif

                out_plan->sync.Append({ .o = Code2Op(run), .s1 = offset, .s2 = -32, .i = (int32_t)func->parameters.len, .type = func->ret });
                out_plan->relay.Append({ .o = Code2Op(run), .s1 = offset, .s2 = -32, .i = (int32_t)func->parameters.len, .type = func->ret });
            }
        } break;
        case PrimitiveKind::Array: { K_UNREACHABLE(); } break;

        case PrimitiveKind::Float32: {
            Opcode run = fast ? Opcode::RunFloat32X : Opcode::RunFloat32;

            out_plan->sync.Append({ .o = Code2Op(run), .s1 = -32 + 8, .i = (int32_t)func->parameters.len, .type = func->ret });
            out_plan->relay.Append({ .o = Code2Op(run), .s1 = -32 + 8, .i = (int32_t)func->parameters.len, .type = func->ret });
        } break;
        case PrimitiveKind::Float64: {
            Opcode run = fast ? Opcode::RunFloat64X : Opcode::RunFloat64;

            out_plan->sync.Append({ .o = Code2Op(run), .s1 = -32 + 8, .i = (int32_t)func->parameters.len, .type = func->ret });
            out_plan->relay.Append({ .o = Code2Op(run), .s1 = -32 + 8, .i = (int32_t)func->parameters.len, .type = func->ret });
        } break;

        case PrimitiveKind::Prototype: { K_UNREACHABLE(); } break;
    }

    // We need enough space to memcpy result in CallX instructions
    out_plan->stk_size = stk_offset ? AlignLen(4 * stk_offset, 16) : 16;

#if defined(_WIN32)
    // Account for SEH frame record
    out_plan->stk_size += 16;
#endif

    FillAsyncPlan(out_plan->sync, &out_plan->async);

    if (out_decorated) {
        switch (func->convention) {
            case CallConvention::Cdecl: {
                *out_decorated = Fmt(&instance->str_alloc, "_%1", func->name).ptr;
            } break;
            case CallConvention::Stdcall: {
                K_ASSERT(!func->variadic);

                Size suffix = (stk_offset - !regular_ret) * 4;
                *out_decorated = Fmt(&instance->str_alloc, "_%1@%2", func->name, suffix).ptr;
            } break;
            case CallConvention::Fastcall: {
                K_ASSERT(!func->variadic);

                Size suffix = (fast_offset + stk_offset - 4 - !regular_ret) * 4;
                *out_decorated = Fmt(&instance->str_alloc, "@%1@%2", func->name, suffix).ptr;
            } break;
            case CallConvention::Thiscall: {
                K_ASSERT(!func->variadic);
                // Name does not change
            } break;
        }
    }
}

}

#endif
