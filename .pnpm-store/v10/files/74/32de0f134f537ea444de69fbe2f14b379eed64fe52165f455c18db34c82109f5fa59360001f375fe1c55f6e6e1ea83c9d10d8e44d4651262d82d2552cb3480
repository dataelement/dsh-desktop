// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#if __riscv_xlen == 64 || defined(__loongarch64)

#include "lib/native/base/base.hh"
#include "../ffi.hh"
#include "../interp.hh"
#include "../type.hh"

namespace K {

enum class AbiMethod {
    Memory,
    Gpr,
    GprGpr,
    Vec,
    VecVec,
    GprVec,
    VecGpr,
    GprStack
};

struct ClassResult {
    AbiMethod method;

    int gpr_index;
    int fpr_index;
};

class ClassAnalyser {
    int gpr_max;
    int fpr_max;
    int gpr_index; // Can go beyond gpr_max when using stack
    int fpr_index;
    int stack_start;

public:
    ClassAnalyser(int gpr_index, int gpr_max, int fpr_index, int fpr_max, int stack_start = -1)
        : gpr_max(gpr_max), fpr_max(fpr_max), gpr_index(gpr_index), fpr_index(fpr_index), stack_start(stack_start) {}

    ClassResult Analyse(const TypeInfo *type, bool variadic);

    int GprCount() const { return gpr_index; }
    int VecCount() const { return fpr_index; }
};

ClassResult ClassAnalyser::Analyse(const TypeInfo *type, bool variadic)
{
    ClassResult ret = {};

    // Use memory for values bigger than two registers
    if (type->size > 16) {
        ret.method = AbiMethod::Memory;
        ret.gpr_index = gpr_index;

        gpr_index++;

        return ret;
    }

    int gpr_avail = std::min(2, gpr_max - gpr_index); // Can go negative
    int fpr_avail = std::min(2, fpr_max - fpr_index);

#if defined(__riscv_float_abi_double) || defined(__loongarch64)
    if (type->primitive != PrimitiveKind::Union && !variadic) {
        int gpr_count = 0;
        int fpr_count = 0;
        bool gpr_fpr = false;

        AnalyseFlat(type, [&](const TypeInfo *type, int offset, int count) {
            if (IsFloat(type)) {
                fpr_count += count;
            } else {
                gpr_count += count;
                gpr_fpr |= !fpr_count;
            }
        });

        // Pass mixed float-integer structs in one GPR and one FP register
        if (gpr_count == 1 && fpr_count == 1 && gpr_avail > 0 && fpr_avail) {
            ret.method = gpr_fpr ? AbiMethod::GprVec : AbiMethod::VecGpr;
            ret.gpr_index = gpr_index;
            ret.fpr_index = fpr_index;

            gpr_index++;
            fpr_index++;

            return ret;
        }

        // HFA rules
        if (fpr_count && !gpr_count && fpr_count <= fpr_avail) {
            ret.method = (fpr_count > 1) ? AbiMethod::VecVec : AbiMethod::Vec;
            ret.fpr_index = fpr_index;

            fpr_index += fpr_count;

            return ret;
        }
    }
#elif defined(__riscv_float_abi_single)
    #error The RISC-V single-precision float ABI (LP64F) is not supported
#elif defined(__riscv_float_abi_soft)
    // Use integer conventions
#else
    #error Unknown or unsupported floating-point ABI
#endif

    // Default case: GPR, GPR-stack or stack if no GPR is left
    if (type->size > 8 && gpr_avail == 1) {
        ret.method = AbiMethod::GprStack;
        ret.gpr_index = gpr_index;

        gpr_index = stack_start + 1;
    } else if (type->size > 8) {
        ret.method = AbiMethod::GprGpr;
        ret.gpr_index = gpr_index;

        gpr_index += 2;
    } else {
        ret.method = AbiMethod::Gpr;
        ret.gpr_index = gpr_index;

        gpr_index++;
    }

    // Switch to stack once GPRs are exhausted
    if (gpr_index >= gpr_max && gpr_index < stack_start) {
        gpr_index = stack_start;
    };

    return ret;
}

void AnalyseFunction(InstanceData *instance, const FunctionInfo *func, ExecutionPlan *out_plan, const char **)
{
    AbiMethod ret_abi = {};
    Size stk_size = 0;
    bool forward_fp = false;

    // Handle return value
    {
        ClassAnalyser analyser(0, 2, 0, 2);
        ClassResult ret = analyser.Analyse(func->ret, false);

        ret_abi = ret.method;
    }

    // Handle parameters
    {
        int gpr_result = (ret_abi == AbiMethod::Memory);
        ClassAnalyser analyser(gpr_result, 8, 0, 8, 18);

        for (const ParameterInfo &param: func->parameters) {
            ClassResult ret = analyser.Analyse(param.type, param.variadic);

            const TypeInfo *type = param.type;
            int offsets[2] = {};
            bool split = false;

            switch (ret.method) {
                case AbiMethod::Memory: { offsets[0] = 8 * (0 + ret.gpr_index); } break;
                case AbiMethod::Gpr: { offsets[0] = 8 * (0 + ret.gpr_index); } break;
                case AbiMethod::Vec: { offsets[0] = 8 * (8 + ret.fpr_index); } break;

                case AbiMethod::GprGpr: {
                    offsets[0] = 8 * (0 + ret.gpr_index);
                    offsets[1] = 8 * (1 + ret.gpr_index);
                    split = true;
                } break;
                case AbiMethod::VecVec: {
                    type = ReshapeAggregate(instance, type, { .stride = 8, .fill = 0xFF });

                    offsets[0] = 8 * (8 + ret.fpr_index);
                    offsets[1] = 8 * (9 + ret.fpr_index);
                    split = true;
                } break;
                case AbiMethod::GprVec: {
                    type = ReshapeAggregate(instance, type, { .stride = 8, .fill = 0xFF });

                    offsets[0] = 8 * (0 + ret.gpr_index);
                    offsets[1] = 8 * (8 + ret.fpr_index);
                    split = true;
                } break;
                case AbiMethod::VecGpr: {
                    type = ReshapeAggregate(instance, type, { .stride = 8, .fill = 0xFF });

                    offsets[0] = 8 * (8 + ret.fpr_index);
                    offsets[1] = 8 * (0 + ret.gpr_index);
                    split = true;
                } break;
                case AbiMethod::GprStack: {
                    offsets[0] = 8 * (0 + ret.gpr_index);
                    offsets[1] = 18 * 8;
                    split = true;
                } break;
            }

            if (IsAggregate(type)) {
                if (split) {
                    out_plan->sync.Append({ .o = Code2Op(Opcode::PushAggregatePair), .s1 = (int16_t)param.offset, .s3 = (int16_t)offsets[0], .s4 = (int16_t)offsets[1], .type = type });
                } else {
                    Opcode code = (ret.method != AbiMethod::Memory) ? Opcode::PushAggregateReg : Opcode::PushAggregateMem;
                    out_plan->sync.Append({ .o = Code2Op(code), .s1 = (int16_t)param.offset, .i = offsets[0], .type = type });
                }
            } else {
                K_ASSERT(!split);

                int delta = (int)Opcode::PushVoid - (int)PrimitiveKind::Void;
                Opcode code = (Opcode)((int)type->primitive + delta);

                out_plan->sync.Append({ .o = Code2Op(code), .s1 = (int16_t)param.offset, .s2 = (int16_t)param.directions, .i = offsets[0], .type = type });
            }
        }

        stk_size = AlignLen((10 + std::max(8, analyser.GprCount())) * 8, 16);
        forward_fp = analyser.VecCount();
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
                    Opcode run = forward_fp ? Opcode::RunAggregateMemX : Opcode::RunAggregateMem;
                    out_plan->sync.Append({ .o = Code2Op(run), .s1 = 0, .s2 = -40, .i = (int32_t)func->parameters.len, .type = func->ret });
                } break;

                case AbiMethod::Gpr:
                case AbiMethod::GprGpr:
                case AbiMethod::GprStack: {
                    Opcode run = forward_fp ? Opcode::RunAggregateGGX : Opcode::RunAggregateGG;
                    out_plan->sync.Append({ .o = Code2Op(run), .s1 = -40, .i = (int32_t)func->parameters.len, .type = func->ret });
                } break;
                case AbiMethod::Vec: {
                    Opcode run = forward_fp ? Opcode::RunAggregateDDX : Opcode::RunAggregateDD;
                    out_plan->sync.Append({ .o = Code2Op(run), .s1 = -40 + 16, .i = (int32_t)func->parameters.len, .type = func->ret });
                } break;
                case AbiMethod::VecVec: {
                    const TypeInfo *type = ReshapeAggregate(instance, func->ret, { .stride = 8, .fill = 0xFF });
                    Opcode run = forward_fp ? Opcode::RunAggregateDDX : Opcode::RunAggregateDD;

                    out_plan->sync.Append({ .o = Code2Op(run), .s1 = -40 + 16, .i = (int32_t)func->parameters.len, .type = type });
                } break;
                case AbiMethod::GprVec: {
                    const TypeInfo *type = ReshapeAggregate(instance, func->ret, { .stride = 8, .fill = 0xFF });
                    Opcode run = forward_fp ? Opcode::RunAggregateGDX : Opcode::RunAggregateGD;

                    out_plan->sync.Append({ .o = Code2Op(run), .s1 = -40, .s2 = -40 + 16, .i = (int32_t)func->parameters.len, .type = type });
                } break;
                case AbiMethod::VecGpr: {
                    const TypeInfo *type = ReshapeAggregate(instance, func->ret, { .stride = 8, .fill = 0xFF });
                    Opcode run = forward_fp ? Opcode::RunAggregateDGX : Opcode::RunAggregateDG;

                    out_plan->sync.Append({ .o = Code2Op(run), .s1 = -40 + 16, .s2 = -40, .i = (int32_t)func->parameters.len, .type = type });
                } break;
            }
        } break;
        case PrimitiveKind::Array: { K_UNREACHABLE(); } break;

        case PrimitiveKind::Float32: {
            Opcode run = forward_fp ? Opcode::RunFloat32X : Opcode::RunFloat32;
            out_plan->sync.Append({ .o = Code2Op(run), .s1 = -40 + 16, .i = (int32_t)func->parameters.len, .type = func->ret });
        } break;
        case PrimitiveKind::Float64: {
            Opcode run = forward_fp ? Opcode::RunFloat64X : Opcode::RunFloat64;
            out_plan->sync.Append({ .o = Code2Op(run), .s1 = -40 + 16, .i = (int32_t)func->parameters.len, .type = func->ret });
        } break;

        case PrimitiveKind::Prototype: { K_UNREACHABLE(); } break;
    }

    out_plan->stk_size = stk_size;

    FillAsyncPlan(out_plan->sync, &out_plan->async);
    out_plan->relay = out_plan->sync;
}

}

#endif
