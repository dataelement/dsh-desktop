// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#include "lib/native/base/base.hh"
#include "call.hh"
#include "ffi.hh"
#include "parser.hh"
#include "type.hh"

#include <napi.h>

namespace K {

bool PrototypeParser::Parse(const char *str, bool concrete, FunctionInfo *out_func)
{
    tokens.Clear();
    offset = 0;
    valid = true;

    Tokenize(str);

    out_func->ret = ParseType(nullptr);
    if (!CanReturnType(out_func->ret)) {
        MarkError("You are not allowed to directly return %1 values (maybe try %1 *)", out_func->ret->name);
        return false;
    }
    offset += (offset < tokens.len && DetectCallConvention(tokens[offset], &out_func->convention));

    if (offset >= tokens.len) {
        MarkError("Unexpected end of prototype, expected identifier");
        return false;
    }
    if (IsIdentifier(tokens[offset])) {
        Span<const char> tok = tokens[offset++];
        out_func->name = DuplicateString(tok, &instance->str_alloc).ptr;
    } else if (!concrete) {
        // Leave anonymous naming responsibility to caller
        out_func->name = nullptr;
    } else {
        MarkError("Unexpected token '%1', expected identifier", tokens[offset]);
        return false;
    }

    Consume("(");
    offset += (offset + 1 < tokens.len && tokens[offset] == "void" && tokens[offset + 1] == ")");
    if (offset < tokens.len && tokens[offset] != ")") {
        for (;;) {
            ParameterInfo param = {};

            if (Match("...")) {
                out_func->variadic = true;
                break;
            }

            param.type = ParseType(&param.directions);

            if (!CanPassType(param.type, param.directions)) {
                MarkError("Type %1 cannot be used as a parameter", param.type->name);
                return false;
            }
            if (out_func->parameters.len >= MaxParameters) {
                MarkError("Functions cannot have more than %1 parameters", MaxParameters);
                return false;
            }

            param.offset = (int8_t)out_func->parameters.len;

            out_func->parameters.Append(param);

            offset += (offset < tokens.len && IsIdentifier(tokens[offset]));
            if (offset >= tokens.len || tokens[offset] != ",")
                break;
            offset++;
        }
    }
    Consume(")");

    out_func->required_parameters = (int8_t)out_func->parameters.len;

    Match(";");
    if (offset < tokens.len) {
        MarkError("Unexpected token '%1' after prototype", tokens[offset]);
    }

    return valid;
}

void PrototypeParser::Tokenize(const char *str)
{
    for (Size i = 0; str[i]; i++) {
        char c = str[i];

        if (IsAsciiWhite(c)) {
            continue;
        } else if (IsXidStart(c)) {
            Size j = i;
            while (str[++j] && IsXidContinue(str[j]));

            Span<const char> tok = MakeSpan(str + i, j - i);
            tokens.Append(tok);

            i = j - 1;
        } else if (IsAsciiDigit(c)) {
            Size j = i;
            while (str[++j] && IsAsciiDigit(str[j]));
            if (str[j] == '.') {
                while (str[++j] && IsAsciiDigit(str[j]));
            }

            Span<const char> tok = MakeSpan(str + i, j - i);
            tokens.Append(tok);

            i = j - 1;
        } else if (c == '.' && str[i + 1] == '.' && str[i + 2] == '.') {
            tokens.Append("...");
            i += 2;
        } else {
            Span<const char> tok = MakeSpan(str + i, 1);
            tokens.Append(tok);
        }
    }
}

const TypeInfo *PrototypeParser::ParseType(int *out_directions)
{
    Size start = offset;

    if (offset >= tokens.len) {
        MarkError("Unexpected end of prototype, expected type");
        return instance->void_type;
    } else if (!IsIdentifier(tokens[offset])) {
        MarkError("Unexpected token '%1', expected type", tokens[offset]);
        return instance->void_type;
    }

    while (++offset < tokens.len && IsIdentifier(tokens[offset]));
    offset--;
    while (++offset < tokens.len && (tokens[offset] == '*' ||
                                     tokens[offset] == '!' ||
                                     tokens[offset] == "const"));
    if (offset < tokens.len && tokens[offset] == "[") [[unlikely]] {
        MarkError("Array types decay to pointers in prototypes (C standard), use pointers");
        return instance->void_type;
    }
    offset--;

    if (out_directions) {
        if (offset > start) {
            int directions = ResolveDirections(tokens[start]);

            if (directions) {
                *out_directions = directions;
                start++;
            } else {
                *out_directions = 1;
            }
        } else {
            *out_directions = 1;
        }
    }

    while (offset >= start) {
        Span<const char> str = MakeSpan(tokens[start].ptr, tokens[offset].end() - tokens[start].ptr);
        const TypeInfo *type = ResolveType(instance, str);

        if (type) {
            offset++;
            return type;
        }
        if (env.IsExceptionPending()) [[unlikely]]
            return instance->void_type;

        offset--;
    }
    offset = start;

    MarkError("Unknown or invalid type name '%1'", tokens[offset]);
    return instance->void_type;
}

bool PrototypeParser::Consume(const char *expect)
{
    if (offset >= tokens.len) {
        MarkError("Unexpected end of prototype, expected '%1'", expect);
        return false;
    }
    if (tokens[offset] != expect) {
        MarkError("Unexpected token '%1', expected '%2'", tokens[offset], expect);
        return false;
    }

    offset++;
    return true;
}

bool PrototypeParser::Match(const char *expect)
{
    if (offset < tokens.len && tokens[offset] == expect) {
        offset++;
        return true;
    } else {
        return false;
    }
}

bool PrototypeParser::IsIdentifier(Span<const char> tok) const
{
    K_ASSERT(tok.len);
    return IsAsciiAlpha(tok[0]) || tok[0] == '_';
}

bool ParsePrototype(InstanceData *instance, const char *str, bool concrete, FunctionInfo *out_func)
{
    PrototypeParser parser(instance);
    return parser.Parse(str, concrete, out_func);
}

}
