// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#if defined(__aarch64__) || defined(_M_ARM64)

#include "lib/native/base/base.hh"
#include "../ffi.hh"
#include "../interp.hh"
#include "../type.hh"

namespace K {

struct HfaInfo {
    int count;
    bool float32;
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

    if (count < 1 || count > 4)
        return info;
    if (float32 && float64)
        return info;

    info.count = count;
    info.float32 = float32;

    return info;
}

void AnalyseFunction(InstanceData *instance, const FunctionInfo *func, ExecutionPlan *out_plan, const char **)
{
    int gpr_index = 0;
    int fpr_index = 0;
    int stack_offset = 0;

    int gpr_max = 8;
    int fpr_max = 8;

    for (const ParameterInfo &param: func->parameters) {
#if defined(__APPLE__)
        if (param.variadic) {
            gpr_index = gpr_max;
            fpr_index = fpr_max;
        }
#endif

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
            case PrimitiveKind::Int64:
            case PrimitiveKind::Int64S:
            case PrimitiveKind::UInt64:
            case PrimitiveKind::UInt64S:
            case PrimitiveKind::String:
            case PrimitiveKind::String16:
            case PrimitiveKind::String32:
            case PrimitiveKind::Pointer:
            case PrimitiveKind::Callback: {
                int offset = 0;

                if (gpr_index < gpr_max) {
                    offset = gpr_index * 8;
                    gpr_index++;
                } else {
#if defined(__APPLE__)
                    stack_offset = AlignLen(stack_offset, param.variadic ? 8 : param.type->align);
                    offset = 19 * 8 + stack_offset;
                    stack_offset += param.type->size;
#else
                    offset = 19 * 8 + stack_offset;
                    stack_offset += 8;
#endif
                }

                int delta = (int)Opcode::PushVoid - (int)PrimitiveKind::Void;
                Opcode code = (Opcode)((int)param.type->primitive + delta);

                out_plan->sync.Append({ .o = Code2Op(code), .s1 = (int16_t)param.offset, .s2 = (int16_t)param.directions, .i = offset, .type = param.type });
            } break;

            case PrimitiveKind::Record:
            case PrimitiveKind::Union: {
#if defined(__APPLE__)
                if (param.variadic) {
                    if (param.type->size <= 16) {
                        int registers = (param.type->size + 7) / 8;
                        int offset = 0;

                        if (registers <= gpr_max - gpr_index) {
                            K_ASSERT(param.type->align <= 8);

                            offset = gpr_index * 8;
                            gpr_index += registers;
                        } else {
                            gpr_index = gpr_max;

                            stack_offset = AlignLen(stack_offset, param.type->align);
                            offset = 19 * 8 + stack_offset;
                            stack_offset += registers * 8;
                        }

                        out_plan->sync.Append({ .o = Code2Op(Opcode::PushAggregateReg), .s1 = (int16_t)param.offset, .i = offset, .type = param.type });
                    } else {
                        int offset = 0;

                        if (gpr_index < gpr_max) {
                            offset = gpr_index * 8;
                            gpr_index++;
                        } else {
                            stack_offset = AlignLen(stack_offset, 8);
                            offset = 19 * 8 + stack_offset;
                            stack_offset += 8;
                        }

                        out_plan->sync.Append({ .o = Code2Op(Opcode::PushAggregateMem), .s1 = (int16_t)param.offset, .i = offset, .type = param.type });
                    }

                    break;
                }
#endif

                HfaInfo hfa = IsHFA(param.type);

#if defined(_WIN32)
                if (param.variadic) {
                    // Windows ignores HFA optimization for variadic parameters
                    hfa.count = 0;
                }
#endif

                if (hfa.count) {
                    int offset = 0;

                    if (hfa.count <= fpr_max - fpr_index) {
                        offset = 9 * 8 + fpr_index * 8;
                        fpr_index += hfa.count;

                        const TypeInfo *type = hfa.float32 ? ReshapeAggregate(instance, param.type, { .stride = 8 }) : param.type;
                        out_plan->sync.Append({ .o = Code2Op(Opcode::PushAggregateReg), .s1 = (int16_t)param.offset, .i = offset, .type = type });
                    } else {
                        fpr_index = fpr_max;

#if defined(__APPLE__)
                        stack_offset = AlignLen(stack_offset, param.type->align);
#endif
                        offset = 19 * 8 + stack_offset;
                        stack_offset += 8;

                        out_plan->sync.Append({ .o = Code2Op(Opcode::PushAggregateReg), .s1 = (int16_t)param.offset, .i = offset, .type = param.type });
                    }
                } else if (param.type->size <= 16) {
                    int registers = (param.type->size + 7) / 8;
                    int offset = 0;

                    if (registers <= gpr_max - gpr_index) {
                        K_ASSERT(param.type->align <= 8);

                        offset = gpr_index * 8;
                        gpr_index += registers;
                    } else {
                        gpr_index = gpr_max;

#if defined(__APPLE__)
                        stack_offset = AlignLen(stack_offset, 8);
#endif
                        offset = 19 * 8 + stack_offset;
                        stack_offset += registers * 8;
                    }

                    out_plan->sync.Append({ .o = Code2Op(Opcode::PushAggregateReg), .s1 = (int16_t)param.offset, .i = offset, .type = param.type });
                } else {
                    int offset = 0;

                    // Big types (more than 16 bytes) are replaced by a pointer
                    if (gpr_index < gpr_max) {
                        offset = gpr_index * 8;
                        gpr_index++;
                    } else {
#if defined(__APPLE__)
                        stack_offset = AlignLen(stack_offset, 8);
#endif
                        offset = 19 * 8 + stack_offset;
                        stack_offset += 8;
                    }

                    out_plan->sync.Append({ .o = Code2Op(Opcode::PushAggregateMem), .s1 = (int16_t)param.offset, .i = offset, .type = param.type });
                }
            } break;
            case PrimitiveKind::Array: { K_UNREACHABLE(); } break;

            case PrimitiveKind::Float32: {
                int offset = 0;

#if defined(_WIN32)
                if (param.variadic) {
                    if (gpr_index < gpr_max) {
                        offset = gpr_index * 8;
                        gpr_index++;
                    } else {
                        offset = 19 * 8 + stack_offset;
                        stack_offset += 8;
                    }

                    out_plan->sync.Append({ .o = Code2Op(Opcode::PushFloat32), .s1 = (int16_t)param.offset, .s2 = (int16_t)param.directions, .i = offset, .type = param.type });

                    break;
                }
#endif

                if (fpr_index < fpr_max) {
                    offset = 9 * 8 + fpr_index * 8;
                    fpr_index++;
                } else {
#if defined(__APPLE__)
                    stack_offset = AlignLen(stack_offset, param.variadic ? 8 : 4);
                    offset = 19 * 8 + stack_offset;
                    stack_offset += 4;
#else
                    offset = 19 * 8 + stack_offset;
                    stack_offset += 8;
#endif
                }

                out_plan->sync.Append({ .o = Code2Op(Opcode::PushFloat32), .s1 = (int16_t)param.offset, .s2 = (int16_t)param.directions, .i = offset, .type = param.type });
            } break;
            case PrimitiveKind::Float64: {
                int offset = 0;

#if defined(_WIN32)
                if (param.variadic) {
                    if (gpr_index < gpr_max) {
                        offset = gpr_index * 8;
                        gpr_index++;
                    } else {
                        offset = 19 * 8 + stack_offset;
                        stack_offset += 8;
                    }

                    out_plan->sync.Append({ .o = Code2Op(Opcode::PushFloat64), .s1 = (int16_t)param.offset, .s2 = (int16_t)param.directions, .i = offset, .type = param.type });

                    break;
                }
#endif

                if (fpr_index < fpr_max) {
                    offset = 9 * 8 + fpr_index * 8;
                    fpr_index++;
                } else {
#if defined(__APPLE__)
                    stack_offset = AlignLen(stack_offset, 8);
#endif
                    offset = 19 * 8 + stack_offset;
                    stack_offset += 8;
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

                out_plan->sync.Append({ .o = Code2Op(run), .s1 = -48, .i = (int32_t)func->parameters.len, .type = func->ret });
            } else {
                int delta = (int)Opcode::RunVoid - (int)PrimitiveKind::Void;
                Opcode run = (Opcode)((int)func->ret->primitive + delta);

                out_plan->sync.Append({ .o = Code2Op(run), .s1 = -48, .i = (int32_t)func->parameters.len, .type = func->ret });
            }
        } break;

        case PrimitiveKind::Record:
        case PrimitiveKind::Union: {
            HfaInfo hfa = IsHFA(func->ret);

            if (hfa.count) {
                Opcode run = fpr_index ? Opcode::RunAggregateHfaX : Opcode::RunAggregateHfa;

                const TypeInfo *type = hfa.float32 ? ReshapeAggregate(instance, func->ret, { .stride = 8 }) : func->ret;
                out_plan->sync.Append({ .o = Code2Op(run), .s1 = -48 + 16, .i = (int32_t)func->parameters.len, .type = type });
            } else if (func->ret->size <= 16) {
                Opcode run = fpr_index ? Opcode::RunAggregateGGX : Opcode::RunAggregateGG;
                out_plan->sync.Append({ .o = Code2Op(run), .s1 = -48, .i = (int32_t)func->parameters.len, .type = func->ret });
            } else {
                Opcode run = fpr_index ? Opcode::RunAggregateMemX : Opcode::RunAggregateMem;
                int16_t x8 = 8 * 8;

                out_plan->sync.Append({ .o = Code2Op(run), .s1 = x8, .s2 = -48, .i = (int32_t)func->parameters.len, .type = func->ret });
            }
        } break;
        case PrimitiveKind::Array: { K_UNREACHABLE(); } break;

        case PrimitiveKind::Float32: {
            Opcode run = fpr_index ? Opcode::RunFloat32X : Opcode::RunFloat32;
            out_plan->sync.Append({ .o = Code2Op(run), .s1 = -48 + 16, .i = (int32_t)func->parameters.len, .type = func->ret });
        } break;
        case PrimitiveKind::Float64: {
            Opcode run = fpr_index ? Opcode::RunFloat64X : Opcode::RunFloat64;
            out_plan->sync.Append({ .o = Code2Op(run), .s1 = -48 + 16, .i = (int32_t)func->parameters.len, .type = func->ret });
        } break;

        case PrimitiveKind::Prototype: { K_UNREACHABLE(); } break;
    }

    out_plan->stk_size = AlignLen(19 * 8 + stack_offset, 16) + 8;

    FillAsyncPlan(out_plan->sync, &out_plan->async);
    out_plan->relay = out_plan->sync;
}

}

#endif
