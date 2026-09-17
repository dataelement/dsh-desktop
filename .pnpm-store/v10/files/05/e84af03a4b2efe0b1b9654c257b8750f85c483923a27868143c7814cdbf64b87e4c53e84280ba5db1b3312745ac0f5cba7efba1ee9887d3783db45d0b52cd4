// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#if defined(__PPC64__)

#include "lib/native/base/base.hh"
#include "../ffi.hh"
#include "../interp.hh"
#include "../type.hh"

namespace K {

struct HfaInfo {
    int count;
    bool float32;
};

enum class AbiMethod {
    Memory,
    Gpr,
    Hfa32,
    Hfa64
};

static HfaInfo IsHFA(const TypeInfo *type)
{
    bool float32 = false;
    bool float64 = false;
    int count = 0;

    count = AnalyseFlat(type, [&](const TypeInfo *type, int, int) {
        if (type->primitive == PrimitiveKind::Float32) {
            float32 = true;
        } else if (type->primitive == PrimitiveKind::Float64) {
            float64 = true;
        } else {
            float32 = true;
            float64 = true;
        }
    });

    HfaInfo info = {};

    if (count < 1 || count > 8)
        return info;
    if (float32 && float64)
        return info;

    info.count = count;
    info.float32 = float32;

    return info;
}

void AnalyseFunction(InstanceData *instance, const FunctionInfo *func, ExecutionPlan *out_plan, const char **)
{
    int gpr_max = 8;
    int vec_max = 13;
    int gpr_index = 0;
    int vec_index = 0;

    AbiMethod ret_abi = {};

    if (HfaInfo hfa = IsHFA(func->ret); hfa.count) {
        ret_abi = hfa.float32 ? AbiMethod::Hfa32 : AbiMethod::Hfa64;
    } else if (IsAggregate(func->ret) && func->ret->size > 16) {
        ret_abi = AbiMethod::Memory;
        gpr_index++;
    } else {
        ret_abi = AbiMethod::Gpr;
    }

    for (const ParameterInfo &param: func->parameters) {
        if (IsAggregate(param.type)) {
            HfaInfo hfa = IsHFA(param.type);
            const TypeInfo *type = hfa.float32 ? ReshapeAggregate(instance, param.type, { .stride = 8, .f2d = true }) : param.type;
            int gprs = AlignLen(param.type->size, 8) / 8;

            if (hfa.count && vec_index < vec_max) {
                if (vec_index + hfa.count > vec_max) {
                    int split = 8 * (vec_max - vec_index);
                    int offsets[2] = { 8 * vec_index, 36 * 8 };

                    vec_index = vec_max;
                    gpr_index = 36 + AlignLen(param.type->size - split, 8) / 8;

                    // This is probably broken if there are unused GPRs
                    out_plan->sync.Append({ .o = Code2Op(Opcode::PushAggregateSplit), .s1 = (int16_t)param.offset, .s2 = (int16_t)split, .s3 = (int16_t)offsets[0], .s4 = (int16_t)offsets[1], .type = type });
                } else {
                    int offset = 8 * 8 + 8 * vec_index;

                    vec_index += hfa.count;

                    if (gpr_index < gpr_max && gpr_index + gprs >= gpr_max) {
                        int split = 8 * (gpr_max - gpr_index);
                        gpr_index = 36 + AlignLen(param.type->size - split, 8) / 8;
                    } else {
                        gpr_index += gprs;
                    }

                    out_plan->sync.Append({ .o = Code2Op(Opcode::PushAggregateReg), .s1 = (int16_t)param.offset, .i = offset, .type = type });
                }
            } else {
                int gprs = AlignLen(param.type->size, 8) / 8;

                if (gpr_index < gpr_max && gpr_index + gprs > gpr_max) {
                    int split = 8 * (gpr_max - gpr_index);
                    int offsets[2] = { 8 * gpr_index, 36 * 8 };

                    gpr_index = 36 + AlignLen(param.type->size - split, 8) / 8;

                    out_plan->sync.Append({ .o = Code2Op(Opcode::PushAggregateSplit), .s1 = (int16_t)param.offset, .s2 = (int16_t)split, .s3 = (int16_t)offsets[0], .s4 = (int16_t)offsets[1], .type = param.type });
                } else {
                    int offset = 8 * gpr_index;

                    gpr_index += gprs;
                    gpr_index = (gpr_index == gpr_max) ? 36 : gpr_index;

                    out_plan->sync.Append({ .o = Code2Op(Opcode::PushAggregateReg), .s1 = (int16_t)param.offset, .i = offset, .type = param.type });
                }
            }
        } else {
            int delta = (int)Opcode::PushVoid - (int)PrimitiveKind::Void;
            Opcode code = (Opcode)((int)param.type->primitive + delta);
            int offset = 0;

            if (IsFloat(param.type) && !param.variadic && vec_index < vec_max) {
                code = Opcode::PushFloat64;

                offset = 8 * 8 + 8 * vec_index;
                vec_index++;
            } else {
                offset = 8 * gpr_index;
            }

            gpr_index++;
            gpr_index = (gpr_index == gpr_max) ? 36 : gpr_index;

            out_plan->sync.Append({ .o = Code2Op(code), .s1 = (int16_t)param.offset, .s2 = (int16_t)param.directions, .i = offset, .type = param.type });
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
            if (vec_index) {
                int delta = (int)Opcode::RunVoidX - (int)PrimitiveKind::Void;
                Opcode run = (Opcode)((int)func->ret->primitive + delta);

                out_plan->sync.Append({ .o = Code2Op(run), .s1 = -80, .i = (int32_t)func->parameters.len, .type = func->ret });
            } else {
                int delta = (int)Opcode::RunVoid - (int)PrimitiveKind::Void;
                Opcode run = (Opcode)((int)func->ret->primitive + delta);

                out_plan->sync.Append({ .o = Code2Op(run), .s1 = -80, .i = (int32_t)func->parameters.len, .type = func->ret });
            }
        } break;

        case PrimitiveKind::Record:
        case PrimitiveKind::Union: {
            switch (ret_abi) {
                case AbiMethod::Memory: {
                    Opcode run = vec_index ? Opcode::RunAggregateMemX : Opcode::RunAggregateMem;
                    out_plan->sync.Append({ .o = Code2Op(run), .s1 = 0, .s2 = -80, .i = (int32_t)func->parameters.len, .type = func->ret });
                } break;
                case AbiMethod::Gpr: {
                    Opcode run = vec_index ? Opcode::RunAggregateGGX : Opcode::RunAggregateGG;
                    out_plan->sync.Append({ .o = Code2Op(run), .s1 = -80, .i = (int32_t)func->parameters.len, .type = func->ret });
                } break;
                case AbiMethod::Hfa32: {
                    Opcode run = vec_index ? Opcode::RunAggregateHfaX : Opcode::RunAggregateHfa;
                    const TypeInfo *type = ReshapeAggregate(instance, func->ret, { .stride = 8, .f2d = true });

                    out_plan->sync.Append({ .o = Code2Op(run), .s1 = -80 + 8, .i = (int32_t)func->parameters.len, .type = type });
                } break;
                case AbiMethod::Hfa64: {
                    Opcode run = vec_index ? Opcode::RunAggregateHfaX : Opcode::RunAggregateHfa;
                    out_plan->sync.Append({ .o = Code2Op(run), .s1 = -80 + 8, .i = (int32_t)func->parameters.len, .type = func->ret });
                } break;
            }
        } break;
        case PrimitiveKind::Array: { K_UNREACHABLE(); } break;

        case PrimitiveKind::Float32:
        case PrimitiveKind::Float64: {
            Opcode run = vec_index ? Opcode::RunFloat64X : Opcode::RunFloat64;
            out_plan->sync.Append({ .o = Code2Op(run), .s1 = -80 + 8, .i = (int32_t)func->parameters.len, .type = func->ret });
        } break;

        case PrimitiveKind::Prototype: { K_UNREACHABLE(); } break;
    }

    // Compute required stack size
    Size needed = 8 * std::max(36, gpr_index);
    out_plan->stk_size = AlignLen(needed, 16);

    FillAsyncPlan(out_plan->sync, &out_plan->async);
    out_plan->relay = out_plan->sync;
}

}

#endif
