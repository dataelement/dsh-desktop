// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#pragma once

#include "lib/native/base/base.hh"
#include "ffi.hh"

#include <napi.h>

namespace K {

class TypeObject: public Napi::ObjectWrap<TypeObject> {
    const TypeInfo *type;

    mutable Napi::Object members;

public:
    static Napi::Function InitClass(InstanceData *instance);

    TypeObject(const Napi::CallbackInfo &info);

    void Finalize(Napi::BasicEnv env) override;

    const TypeInfo *GetType() { return type; }
};

static K_FORCE_INLINE bool IsInteger(const TypeInfo *type)
{
    bool integer = ((int)type->primitive >= (int)PrimitiveKind::Int8 &&
                    (int)type->primitive <= (int)PrimitiveKind::UInt64);
    return integer;
}

static K_FORCE_INLINE bool IsFloat(const TypeInfo *type)
{
    bool fp = (type->primitive == PrimitiveKind::Float32 ||
               type->primitive == PrimitiveKind::Float64);
    return fp;
}

static K_FORCE_INLINE bool IsAggregate(const TypeInfo *type)
{
    bool aggregate = (type->primitive == PrimitiveKind::Record ||
                      type->primitive == PrimitiveKind::Union);
    return aggregate;
}

static K_FORCE_INLINE bool IsRegularSize(Size size, Size max)
{
    bool regular = (size <= max && !(size & (size - 1)));
    return regular;
}

int ResolveDirections(Span<const char> str);
const TypeInfo *ResolveType(InstanceData *instance, napi_value value, int *out_directions = nullptr);
const TypeInfo *ResolveType(InstanceData *instance, Span<const char> str);

TypeInfo *MakePointerType(InstanceData *instance, const TypeInfo *ref, int count = 1);
TypeInfo *MakeArrayType(InstanceData *instance, const TypeInfo *ref, Size len);
TypeInfo *MakeArrayType(InstanceData *instance, const TypeInfo *ref, Size len, ArrayHint hint);

napi_value WrapType(InstanceData *instance, const TypeInfo *type, bool freeze = true);

int AnalyseFlat(const TypeInfo *type, FunctionRef<void(const TypeInfo *type, int offset, int count)> func);

struct ReshapeConfig {
    int stride = 0; // Mandatory
    int fill = 0;
    bool f2d = false;
};

const TypeInfo *ReshapeAggregate(InstanceData *instance, const TypeInfo *type, const ReshapeConfig &config);

bool CanPassType(const TypeInfo *type, int directions);
bool CanReturnType(const TypeInfo *type);
bool CanStoreType(const TypeInfo *type);

// Can be slow, only use for error messages
const char *GetValueType(const InstanceData *instance, napi_value value);

}
