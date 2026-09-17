// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#if defined(__x86_64__) && !defined(_WIN32)

#include "lib/native/base/base.hh"
#include "../ffi.hh"
#include "../interp.hh"
#include "../type.hh"

namespace K {

enum class AbiMethod {
    Stack,
    Gpr,
    Xmm,
    GprGpr,
    XmmXmm,
    GprXmm,
    XmmGpr
};

struct ClassResult {
    AbiMethod method;

    int gpr_index;
    int xmm_index;
    Size stack_offset;
};

class ClassAnalyser {
    enum class RegisterClass {
        NoClass = 0, // Explicitly 0
        Integer,
        SSE,
        Memory
    };

    int gpr_max;
    int xmm_max;
    int gpr_avail;
    int xmm_avail;

    Size stack_offset = 0;

public:
    ClassAnalyser(int gpr_index, int gpr_max, int xmm_index, int xmm_max)
        : gpr_max(gpr_max), xmm_max(xmm_max), gpr_avail(gpr_max - gpr_index), xmm_avail(xmm_max - xmm_index) {}

    ClassResult Analyse(const TypeInfo *type);

    Size Classify(Span<RegisterClass> classes, const TypeInfo *type, Size offset);
    RegisterClass MergeClasses(RegisterClass cls1, RegisterClass cls2);

    int GprCount() const { return gpr_max - gpr_avail; }
    int XmmCount() const { return xmm_max - xmm_avail; }
    Size StackOffset() const { return stack_offset; }
};

ClassResult ClassAnalyser::Analyse(const TypeInfo *type)
{
    ClassResult ret = {};

    LocalArray<RegisterClass, 8> classes = {};
    classes.len = Classify(classes.data, type, 0);

    if (classes.len <= 2) {
        int gpr_count = 0;
        int xmm_count = 0;

        for (RegisterClass cls: classes) {
            switch (cls) {
                case RegisterClass::NoClass: { K_UNREACHABLE(); } break;
                case RegisterClass::Integer: { gpr_count++; } break;
                case RegisterClass::SSE: { xmm_count++; } break;
                case RegisterClass::Memory: goto stack;
            }
        }

        if (gpr_count > gpr_avail || xmm_count > xmm_avail)
            goto stack;

        if (gpr_count && xmm_count) {
            bool gpr_xmm = (classes.len && classes[0] == RegisterClass::Integer);
            ret.method = gpr_xmm ? AbiMethod::GprXmm : AbiMethod::XmmGpr;
        } else if (xmm_count == 2) {
            ret.method = AbiMethod::XmmXmm;
        } else if (xmm_count == 1) {
            ret.method = AbiMethod::Xmm;
        } else if (gpr_count == 2) {
            ret.method = AbiMethod::GprGpr;
        } else {
            K_ASSERT(gpr_count <= 1 && !xmm_count);
            ret.method = AbiMethod::Gpr;
        }

        ret.gpr_index = (gpr_max - gpr_avail);
        ret.xmm_index = (xmm_max - xmm_avail);

        gpr_avail -= gpr_count;
        xmm_avail -= xmm_count;

        return ret;
    }

stack:
    {
        ret.method = AbiMethod::Stack;
        ret.stack_offset = stack_offset;

        stack_offset += AlignLen(type->size, 8);
    }

    return ret;
}

Size ClassAnalyser::Classify(Span<RegisterClass> classes, const TypeInfo *type, Size offset)
{
    K_ASSERT(classes.len > 0);

    switch (type->primitive) {
        case PrimitiveKind::Void: { return 0; } break;

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
            classes[0] = MergeClasses(classes[0], RegisterClass::Integer);
            return 1;
        } break;
        case PrimitiveKind::Record: {
            if (type->size > 64) {
                classes[0] = MergeClasses(classes[0], RegisterClass::Memory);
                return 1;
            }

            for (const RecordMember &member: type->members) {
                Size member_offset = offset + member.offset;
                Size start = member_offset / 8;
                Classify(classes.Take(start, classes.len - start), member.type, member_offset % 8);
            }
            offset += type->size;

            return (offset + 7) / 8;
        } break;
        case PrimitiveKind::Union: {
            if (type->size > 64) {
                classes[0] = MergeClasses(classes[0], RegisterClass::Memory);
                return 1;
            }

            for (const RecordMember &member: type->members) {
                Size start = offset / 8;
                Classify(classes.Take(start, classes.len - start), member.type, offset % 8);
            }
            offset += type->size;

            return (offset + 7) / 8;
        } break;
        case PrimitiveKind::Array: {
            if (type->size > 64) {
                classes[0] = MergeClasses(classes[0], RegisterClass::Memory);
                return 1;
            }

            Size len = type->size / type->ref.type->size;

            for (Size i = 0; i < len; i++) {
                Size start = offset / 8;
                Classify(classes.Take(start, classes.len - start), type->ref.type, offset % 8);
                offset += type->ref.type->size;
            }

            return (offset + 7) / 8;
        } break;
        case PrimitiveKind::Float32:
        case PrimitiveKind::Float64: {
            classes[0] = MergeClasses(classes[0], RegisterClass::SSE);
            return 1;
        } break;

        case PrimitiveKind::Prototype: { K_UNREACHABLE(); } break;
    }

    K_UNREACHABLE();
}

ClassAnalyser::RegisterClass ClassAnalyser::MergeClasses(RegisterClass cls1, RegisterClass cls2)
{
    if (cls1 == cls2)
        return cls1;

    if (cls1 == RegisterClass::NoClass)
        return cls2;
    if (cls2 == RegisterClass::NoClass)
        return cls1;

    if (cls1 == RegisterClass::Memory || cls2 == RegisterClass::Memory)
        return RegisterClass::Memory;
    if (cls1 == RegisterClass::Integer || cls2 == RegisterClass::Integer)
        return RegisterClass::Integer;

    return RegisterClass::SSE;
}

void AnalyseFunction(InstanceData *, const FunctionInfo *func, ExecutionPlan *out_plan, const char **)
{
    AbiMethod ret_abi = {};
    Size stk_size = 0;
    bool forward_fp = false;

    // Handle return value
    {
        ClassAnalyser analyser(0, 2, 0, 2);
        ClassResult ret = analyser.Analyse(func->ret);

        ret_abi = ret.method;
    }

    // Handle parameters
    {
        int gpr_result = (ret_abi == AbiMethod::Stack);
        ClassAnalyser analyser(gpr_result, 6, 0, 8);

        for (const ParameterInfo &param: func->parameters) {
            ClassResult ret = analyser.Analyse(param.type);

            int offsets[2] = {};
            bool split = false;

            switch (ret.method) {
                case AbiMethod::Stack: { offsets[0] = 16 * 8 + ret.stack_offset; } break;
                case AbiMethod::Gpr: { offsets[0] = (0 + ret.gpr_index) * 8; } break;
                case AbiMethod::Xmm: { offsets[0] = (6 + ret.xmm_index) * 8; } break;

                case AbiMethod::GprGpr: {
                    offsets[0] = (0 + ret.gpr_index) * 8;
                    offsets[1] = offsets[0] + 8;
                    split = true;
                } break;
                case AbiMethod::XmmXmm: {
                    offsets[0] = (6 + ret.xmm_index) * 8;
                    offsets[1] = offsets[0] + 8;
                    split = true;
                } break;
                case AbiMethod::GprXmm: {
                    offsets[0] = (0 + ret.gpr_index) * 8;
                    offsets[1] = (6 + ret.xmm_index) * 8;
                    split = true;
                } break;
                case AbiMethod::XmmGpr: {
                    offsets[0] = (6 + ret.xmm_index) * 8;
                    offsets[1] = (0 + ret.gpr_index) * 8;
                    split = true;
                } break;
            }

            if (IsAggregate(param.type)) {
                if (split) {
                    out_plan->sync.Append({ .o = Code2Op(Opcode::PushAggregatePair), .s1 = (int16_t)param.offset, .s3 = (int16_t)offsets[0], .s4 = (int16_t)offsets[1], .type = param.type });
                } else {
                    out_plan->sync.Append({ .o = Code2Op(Opcode::PushAggregateReg), .s1 = (int16_t)param.offset, .i = offsets[0], .type = param.type });
                }
            } else {
                K_ASSERT(!split);

                int delta = (int)Opcode::PushVoid - (int)PrimitiveKind::Void;
                Opcode code = (Opcode)((int)param.type->primitive + delta);
                out_plan->sync.Append({ .o = Code2Op(code), .s1 = (int16_t)param.offset, .s2 = (int16_t)param.directions, .i = offsets[0], .type = param.type });
            }
        }

        stk_size = AlignLen(16 * 8 + analyser.StackOffset(), 16);
        forward_fp = analyser.XmmCount();
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
            switch (ret_abi) {
                case AbiMethod::Stack: {
                    Opcode run = forward_fp ? Opcode::RunAggregateMemX : Opcode::RunAggregateMem;
                    out_plan->sync.Append({ .o = Code2Op(run), .s1 = 0, .s2 = -32, .i = (int32_t)func->parameters.len, .type = func->ret });

                    // Allocate stack space for return value
                    stk_size += AlignLen(func->ret->size, 16);
                } break;
                case AbiMethod::Gpr: {
                    Opcode run = forward_fp ? Opcode::RunAggregateGX : Opcode::RunAggregateG;
                    out_plan->sync.Append({ .o = Code2Op(run), .s1 = -32, .i = (int32_t)func->parameters.len, .type = func->ret });
                } break;
                case AbiMethod::GprGpr: {
                    Opcode run = forward_fp ? Opcode::RunAggregateGGX : Opcode::RunAggregateGG;
                    out_plan->sync.Append({ .o = Code2Op(run), .s1 = -32, .i = (int32_t)func->parameters.len, .type = func->ret });
                } break;
                case AbiMethod::Xmm: {
                    Opcode run = forward_fp ? Opcode::RunAggregateDX : Opcode::RunAggregateD;
                    out_plan->sync.Append({ .o = Code2Op(run), .s1 = -32 + 16, .i = (int32_t)func->parameters.len, .type = func->ret });
                } break;
                case AbiMethod::XmmXmm: {
                    Opcode run = forward_fp ? Opcode::RunAggregateDDX : Opcode::RunAggregateDD;
                    out_plan->sync.Append({ .o = Code2Op(run), .s1 = -32 + 16, .i = (int32_t)func->parameters.len, .type = func->ret });
                } break;
                case AbiMethod::GprXmm: {
                    Opcode run = forward_fp ? Opcode::RunAggregateGDX : Opcode::RunAggregateGD;
                    out_plan->sync.Append({ .o = Code2Op(run), .s1 = -32, .s2 = -32 + 16, .i = (int32_t)func->parameters.len, .type = func->ret });
                } break;
                case AbiMethod::XmmGpr: {
                    Opcode run = forward_fp ? Opcode::RunAggregateDGX : Opcode::RunAggregateDG;
                    out_plan->sync.Append({ .o = Code2Op(run), .s1 = -32 + 16, .s2 = -32, .i = (int32_t)func->parameters.len, .type = func->ret });
                } break;
            }
        } break;
        case PrimitiveKind::Array: { K_UNREACHABLE(); } break;

        case PrimitiveKind::Float32: {
            Opcode run = forward_fp ? Opcode::RunFloat32X : Opcode::RunFloat32;
            out_plan->sync.Append({ .o = Code2Op(run), .s1 = -32 + 16, .i = (int32_t)func->parameters.len, .type = func->ret });
        } break;
        case PrimitiveKind::Float64: {
            Opcode run = forward_fp ? Opcode::RunFloat64X : Opcode::RunFloat64;
            out_plan->sync.Append({ .o = Code2Op(run), .s1 = -32 + 16, .i = (int32_t)func->parameters.len, .type = func->ret });
        } break;

        case PrimitiveKind::Prototype: { K_UNREACHABLE(); } break;
    }

    out_plan->stk_size = stk_size;

    FillAsyncPlan(out_plan->sync, &out_plan->async);
    out_plan->relay = out_plan->sync;
}

}

#endif
