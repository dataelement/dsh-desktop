// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#pragma once

#include "lib/native/base/base.hh"
#include "util.hh"

#include <napi.h>

namespace K {

struct InstanceData;
struct TypeInfo;
struct FunctionInfo;

class PrototypeParser {
    Napi::Env env;
    InstanceData *instance;

    // All these members are relevant to the current parse only, and get resetted each time
    HeapArray<Span<const char>> tokens;
    Size offset;
    bool valid;

public:
    PrototypeParser(InstanceData *instance) : env(instance->env), instance(instance) {}

    bool Parse(const char *str, bool concrete, FunctionInfo *out_func);

private:
    void Tokenize(const char *str);

    const TypeInfo *ParseType(int *out_directions);

    bool Consume(const char *expect);
    bool Match(const char *expect);

    bool IsIdentifier(Span<const char> tok) const;

    template <typename... Args>
    void MarkError(const char *fmt, Args... args)
    {
        if (valid) {
            ThrowError<Napi::Error>(env, fmt, args...);
            valid = false;
        }
        valid = false;
    }
};

bool ParsePrototype(InstanceData *instance, const char *str, bool concrete, FunctionInfo *out_func);

}
