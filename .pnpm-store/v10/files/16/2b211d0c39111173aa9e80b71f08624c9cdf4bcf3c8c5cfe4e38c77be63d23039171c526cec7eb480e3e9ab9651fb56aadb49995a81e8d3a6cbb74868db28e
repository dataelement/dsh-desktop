// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#if defined(_WIN32) && (defined(__x86_64__) || defined(_M_AMD64))

#include "lib/native/base/base.hh"
#include "../ffi.hh"
#include "../interp.hh"
#include "../type.hh"

namespace K {

void AnalyseFunction(InstanceData *, const FunctionInfo *func, ExecutionPlan *out_plan, const char **)
{
    bool regular_ret = IsRegularSize(func->ret->size, 8);
    bool forward_fp = false;

    for (Size i = 0; i < func->parameters.len; i++) {
        const ParameterInfo &param = func->parameters[i];
        int arg = (int)(!regular_ret + i);

        if (IsAggregate(param.type)) {
            Opcode code = IsRegularSize(param.type->size, 8) ? Opcode::PushAggregateReg : Opcode::PushAggregateMem;
            int offset = 8 * arg + (arg >= 4 ? 80 : 0);

            out_plan->sync.Append({ .o = Code2Op(code), .s1 = (int16_t)param.offset, .i = offset, .type = param.type });
        } else if (IsFloat(param.type) && !param.variadic) {
            int delta = (int)Opcode::PushVoid - (int)PrimitiveKind::Void;
            Opcode code = (Opcode)((int)param.type->primitive + delta);
            int offset = 32 + 8 * arg + (arg >= 4 ? 48 : 0);

            out_plan->sync.Append({ .o = Code2Op(code), .s1 = (int16_t)param.offset, .s2 = (int16_t)param.directions, .i = offset, .type = param.type });
        } else {
            int delta = (int)Opcode::PushVoid - (int)PrimitiveKind::Void;
            Opcode code = (Opcode)((int)param.type->primitive + delta);
            int offset = 8 * arg + (arg >= 4 ? 80 : 0);

            out_plan->sync.Append({ .o = Code2Op(code), .s1 = (int16_t)param.offset, .s2 = (int16_t)param.directions, .i = offset, .type = param.type });
        }

        forward_fp |= IsFloat(param.type);
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
            if (forward_fp) {
                int delta = (int)Opcode::RunVoidX - (int)PrimitiveKind::Void;
                Opcode run = (Opcode)((int)func->ret->primitive + delta);

                out_plan->sync.Append({ .o = Code2Op(run), .s1 = -32, .i = (int32_t)func->parameters.len, .type = func->ret });
            } else {
                int delta = (int)Opcode::RunVoid - (int)PrimitiveKind::Void;
                Opcode run = (Opcode)((int)func->ret->primitive + delta);

                out_plan->sync.Append({ .o = Code2Op(run), .s1 = -32, .i = (int32_t)func->parameters.len, .type = func->ret });
            }
        } break;

        case PrimitiveKind::Record:
        case PrimitiveKind::Union: {
            if (regular_ret) {
                Opcode run = forward_fp ? Opcode::RunAggregateGX : Opcode::RunAggregateG;
                out_plan->sync.Append({ .o = Code2Op(run), .s1 = -32, .i = (int32_t)func->parameters.len, .type = func->ret });
            } else {
                Opcode run = forward_fp ? Opcode::RunAggregateMemX : Opcode::RunAggregateMem;
                out_plan->sync.Append({ .o = Code2Op(run), .s1 = 0, .s2 = -32, .i = (int32_t)func->parameters.len, .type = func->ret });
            }
        } break;
        case PrimitiveKind::Array: { K_UNREACHABLE(); } break;

        case PrimitiveKind::Float32: {
            Opcode run = forward_fp ? Opcode::RunFloat32X : Opcode::RunFloat32;
            out_plan->sync.Append({ .o = Code2Op(run), .s1 = -32 + 8, .i = (int32_t)func->parameters.len, .type = func->ret });
        } break;
        case PrimitiveKind::Float64: {
            Opcode run = forward_fp ? Opcode::RunFloat64X : Opcode::RunFloat64;
            out_plan->sync.Append({ .o = Code2Op(run), .s1 = -32 + 8, .i = (int32_t)func->parameters.len, .type = func->ret });
        } break;

        case PrimitiveKind::Prototype: { K_UNREACHABLE(); } break;
    }

    // Compute required stack size
    {
        Size slots = func->parameters.len + !regular_ret;
        Size needed = std::max((Size)112, 80 + 8 * slots);

        out_plan->stk_size = AlignLen(needed, 16);
    }

    FillAsyncPlan(out_plan->sync, &out_plan->async);
    out_plan->relay = out_plan->sync;
}

}

#endif
