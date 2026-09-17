// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#if defined(__arm__) || (defined(__M_ARM) && !defined(_M_ARM64))

#include "lib/native/base/base.hh"
#include "../ffi.hh"
#include "../interp.hh"
#include "../type.hh"

namespace K {

static int IsHFA(const TypeInfo *type)
{
#if defined(__ARM_PCS_VFP)
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

    if (count < 1 || count > 4)
        return 0;
    if (float32 && float64)
        return 0;

    return count;
#else
    return 0;
#endif
}

enum class AbiMethod {
    Memory,
    Gpr,
    Hfa
};

void AnalyseFunction(InstanceData *instance, const FunctionInfo *func, ExecutionPlan *out_plan, const char **)
{
    int gpr_max = 4;
    int fpr_max = 16;
    int gpr_index = 0;
    int fpr_index = 0;
    int stack_offset = 0;

    AbiMethod ret_abi = {};

    if (IsHFA(func->ret)) {
        ret_abi = AbiMethod::Hfa;
    } else if (IsAggregate(func->ret) && func->ret->size > 4) {
        ret_abi = AbiMethod::Memory;
        gpr_index++;
    } else {
        ret_abi = AbiMethod::Gpr;
    }

    for (const ParameterInfo &param: func->parameters) {
        switch (param.type->primitive) {
            case PrimitiveKind::Void: { K_UNREACHABLE(); } break;

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
            case PrimitiveKind::String:
            case PrimitiveKind::String16:
            case PrimitiveKind::String32:
            case PrimitiveKind::Pointer:
            case PrimitiveKind::Callback: {
                int delta = (int)Opcode::PushVoid - (int)PrimitiveKind::Void;
                Opcode code = (Opcode)((int)param.type->primitive + delta);

                int offset = 0;

                if (gpr_index < gpr_max) {
                    offset = 4 * gpr_index;
                    gpr_index++;
                } else {
                    offset = 24 * 4 + stack_offset;
                    stack_offset += 4;
                }

                out_plan->sync.Append({ .o = Code2Op(code), .s1 = (int16_t)param.offset, .s2 = (int16_t)param.directions, .i = offset, .type = param.type });
            } break;

            case PrimitiveKind::Int64:
            case PrimitiveKind::Int64S:
            case PrimitiveKind::UInt64:
            case PrimitiveKind::UInt64S: {
                int delta = (int)Opcode::PushVoid - (int)PrimitiveKind::Void;
                Opcode code = (Opcode)((int)param.type->primitive + delta);
                int gpr0 = AlignLen(gpr_index, 2);

                int offset = 0;

                if (gpr0 + 2 <= gpr_max) {
                    offset = 4 * gpr0;
                    gpr_index = gpr0 + 2;
                } else {
                    stack_offset = AlignLen(stack_offset, 8);
                    offset = 24 * 4 + stack_offset;
                    stack_offset += 8;
                }

                out_plan->sync.Append({ .o = Code2Op(code), .s1 = (int16_t)param.offset, .i = offset, .type = param.type });
            } break;

            case PrimitiveKind::Record:
            case PrimitiveKind::Union: {
                int hfa = IsHFA(param.type);
                int gpr0 = AlignLen(gpr_index, param.type->align == 8 ? 2 : 1);
                int gprs = AlignLen(param.type->size, 4) / 4;

                if (hfa && fpr_index + hfa <= fpr_max) {
                    int offset = 4 * 4 + 4 * fpr_index;
                    fpr_index += hfa;

                    out_plan->sync.Append({ .o = Code2Op(Opcode::PushAggregateReg), .s1 = (int16_t)param.offset, .i = offset, .type = param.type });
                } else if (!hfa && gpr0 + gprs <= gpr_max) {
                    int offset = 4 * gpr0;
                    gpr_index = gpr0 + gprs;

                    out_plan->sync.Append({ .o = Code2Op(Opcode::PushAggregateReg), .s1 = (int16_t)param.offset, .i = offset, .type = param.type });
                } else if (!hfa && gpr0 < gpr_max && !stack_offset) {
                    int split = 4 * (gpr_max - gpr0);
                    int offsets[2] = { 4 * gpr0, 24 * 4 };

                    gpr_index = gpr_max;
                    stack_offset = AlignLen(param.type->size - split, 4);

                    out_plan->sync.Append({ .o = Code2Op(Opcode::PushAggregateSplit), .s1 = (int16_t)param.offset, .s2 = (int16_t)split, .s3 = (int16_t)offsets[0], .s4 = (int16_t)offsets[1], .type = param.type });
                } else {
                    stack_offset = AlignLen(stack_offset, param.type->align == 8 ? 8 : 4);

                    int offset = 24 * 4 + stack_offset;
                    stack_offset += AlignLen(param.type->size, 4);

                    out_plan->sync.Append({ .o = Code2Op(Opcode::PushAggregateReg), .s1 = (int16_t)param.offset, .i = offset, .type = param.type });
                }
            } break;
            case PrimitiveKind::Array: { K_UNREACHABLE(); } break;

            case PrimitiveKind::Float32: {
#if defined(__ARM_PCS_VFP)
                bool vfp = !param.variadic;
                int offset = 0;
#else
                bool vfp = false;
                int offset = 0;
#endif

                if (vfp) {
                    if (fpr_index < fpr_max) {
                        offset = 4 * 4 + 4 * fpr_index;
                        fpr_index++;
                    } else {
                        offset = 24 * 4 + stack_offset;
                        stack_offset += 4;
                    }
                } else {
                    if (gpr_index < gpr_max) {
                        offset = 4 * gpr_index;
                        gpr_index++;
                    } else {
                        offset = 24 * 4 + stack_offset;
                        stack_offset += 4;
                    }
                }

                out_plan->sync.Append({ .o = Code2Op(Opcode::PushFloat32), .s1 = (int16_t)param.offset, .s2 = (int16_t)param.directions, .i = offset, .type = param.type });
            } break;
            case PrimitiveKind::Float64: {
#if defined(__ARM_PCS_VFP)
                bool vfp = !param.variadic;
                int offset = 0;
#else
                bool vfp = false;
                int offset = 0;
#endif

                if (vfp) {
                    int fpr0 = AlignLen(fpr_index, 2);

                    if (fpr0 + 2 <= fpr_max) {
                        offset = 4 * 4 + 4 * fpr0;
                        fpr_index = fpr0 + 2;
                    } else {
                        offset = 24 * 4 + stack_offset;
                        stack_offset += 4;
                    }
                } else {
                    int gpr0 = AlignLen(gpr_index, 2);

                    if (gpr0 + 2 <= gpr_max) {
                        offset = 4 * gpr0;
                        gpr_index = gpr0 + 2;
                    } else {
                        stack_offset = AlignLen(stack_offset, 8);
                        offset = 24 * 4 + stack_offset;
                        stack_offset += 8;
                    }
                }

                out_plan->sync.Append({ .o = Code2Op(Opcode::PushFloat64), .s1 = (int16_t)param.offset, .s2 = (int16_t)param.directions, .i = offset, .type = param.type });
            } break;

            case PrimitiveKind::Prototype: { K_UNREACHABLE(); } break;
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
            if (fpr_index) {
                int delta = (int)Opcode::RunVoidX - (int)PrimitiveKind::Void;
                Opcode run = (Opcode)((int)func->ret->primitive + delta);

                out_plan->sync.Append({ .o = Code2Op(run), .s1 = -40, .i = (int32_t)func->parameters.len, .type = func->ret });
            } else {
                int delta = (int)Opcode::RunVoid - (int)PrimitiveKind::Void;
                Opcode run = (Opcode)((int)func->ret->primitive + delta);

                out_plan->sync.Append({ .o = Code2Op(run), .s1 = -40, .i = (int32_t)func->parameters.len, .type = func->ret });
            }
        } break;

        case PrimitiveKind::Record:
        case PrimitiveKind::Union: {
            switch (ret_abi) {
                case AbiMethod::Memory: {
                    Opcode run = fpr_index ? Opcode::RunAggregateMemX : Opcode::RunAggregateMem;
                    out_plan->sync.Append({ .o = Code2Op(run), .s1 = 0, .s2 = -40, .i = (int32_t)func->parameters.len, .type = func->ret });
                } break;
                case AbiMethod::Gpr: {
                    Opcode run = fpr_index ? Opcode::RunAggregateGX : Opcode::RunAggregateG;
                    out_plan->sync.Append({ .o = Code2Op(run), .s1 = -40, .i = (int32_t)func->parameters.len, .type = func->ret });
                } break;
                case AbiMethod::Hfa: {
                    Opcode run = fpr_index ? Opcode::RunAggregateHfaX : Opcode::RunAggregateHfa;
                    out_plan->sync.Append({ .o = Code2Op(run), .s1 = -40 + 8, .i = (int32_t)func->parameters.len, .type = func->ret });
                } break;
            }
        } break;
        case PrimitiveKind::Array: { K_UNREACHABLE(); } break;

        case PrimitiveKind::Float32: {
            Opcode run = fpr_index ? Opcode::RunFloat32X : Opcode::RunFloat32;
            out_plan->sync.Append({ .o = Code2Op(run), .s1 = -40 + 8, .i = (int32_t)func->parameters.len, .type = func->ret });
        } break;
        case PrimitiveKind::Float64: {
            Opcode run = fpr_index ? Opcode::RunFloat64X : Opcode::RunFloat64;
            out_plan->sync.Append({ .o = Code2Op(run), .s1 = -40 + 8, .i = (int32_t)func->parameters.len, .type = func->ret });
        } break;

        case PrimitiveKind::Prototype: { K_UNREACHABLE(); } break;
    }

    out_plan->stk_size = AlignLen(24 * 4 + stack_offset, 16);

    FillAsyncPlan(out_plan->sync, &out_plan->async);
    out_plan->relay = out_plan->sync;
}

}

#endif
