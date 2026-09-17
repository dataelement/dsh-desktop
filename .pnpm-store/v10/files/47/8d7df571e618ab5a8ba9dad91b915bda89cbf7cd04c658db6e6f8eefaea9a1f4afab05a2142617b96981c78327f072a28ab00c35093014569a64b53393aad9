// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#pragma once

#include "lib/native/base/base.hh"

#include <intrin.h>
#include <napi.h>

namespace K {

struct PE_DOS_HEADER {
    uint16_t e_magic;
    uint16_t e_cblp;
    uint16_t e_cp;
    uint16_t e_crlc;
    uint16_t e_cparhdr;
    uint16_t e_minalloc;
    uint16_t e_maxalloc;
    uint16_t e_ss;
    uint16_t e_sp;
    uint16_t e_csum;
    uint16_t e_ip;
    uint16_t e_cs;
    uint16_t e_lfarlc;
    uint16_t e_ovno;
    uint16_t e_res[4];
    uint16_t e_oemid;
    uint16_t e_oeminfo;
    uint16_t e_res2[10];
    uint32_t e_lfanew;
};

struct PE_FILE_HEADER {
    uint16_t Machine;
    uint16_t NumberOfSections;
    uint32_t TimeDateStamp;
    uint32_t PointerToSymbolTable;
    uint32_t NumberOfSymbols;
    uint16_t SizeOfOptionalHeader;
    uint16_t Characteristics;
};

struct PE_NT_HEADERS {
    uint32_t Signature;
    PE_FILE_HEADER FileHeader;

    // ... OptionalHeader;
};

#if defined(_WIN64)

struct TEB {
    void *ExceptionList;
    void *StackBase;
    void *StackLimit;
    char _pad1[32];
    void *EnvironmentPointer;
    char _pad2[40];
    unsigned long LastErrorValue;
    char _pad3[5132];
    void *DeallocationStack;
    char _pad4[712];
    uint32_t GuaranteedStackBytes;
    char _pad5[162];
    uint16_t SameTebFlags;
};
static_assert(offsetof(TEB, EnvironmentPointer) == 0x38);
static_assert(offsetof(TEB, DeallocationStack) == 0x1478);
static_assert(offsetof(TEB, GuaranteedStackBytes) == 0x1748);
static_assert(offsetof(TEB, SameTebFlags) == 0x17EE);

#else

struct TEB {
    void *ExceptionList;
    void *StackBase;
    void *StackLimit;
    char _pad1[16];
    void *EnvironmentPointer;
    char _pad2[20];
    unsigned long LastErrorValue;
    char _pad3[3540];
    void *DeallocationStack;
    char _pad4[360];
    uint32_t GuaranteedStackBytes;
    char _pad5[78];
    uint16_t SameTebFlags;
};
static_assert(offsetof(TEB, EnvironmentPointer) == 0x1C);
static_assert(offsetof(TEB, DeallocationStack) == 0xE0C);
static_assert(offsetof(TEB, GuaranteedStackBytes) == 0x0F78);
static_assert(offsetof(TEB, SameTebFlags) == 0xFCA);

#endif

static inline TEB *GetTEB()
{
#if defined(__aarch64__) || defined(_M_ARM64)
    TEB *teb = (TEB *)__getReg(18);
#elif defined(__x86_64__) || defined(_M_AMD64)
    TEB *teb = (TEB *)__readgsqword(0x30);
#else
    TEB *teb = (TEB *)__readfsdword(0x18);
#endif

    return teb;
}

#if defined(_WIN64)
    #define ADJUST_TEB(Teb, Low, High) \
        K_DEFER_C(base = (Teb)->StackBase, \
                  limit = (Teb)->StackLimit, \
                  dealloc = (Teb)->DeallocationStack) { \
            (Teb)->StackBase = base; \
            (Teb)->StackLimit = limit; \
            (Teb)->DeallocationStack = dealloc; \
        }; \
        (Teb)->StackBase = (High); \
        (Teb)->StackLimit = (Low); \
        (Teb)->DeallocationStack = (Low);
#else
    #define ADJUST_TEB(Teb, Low, High) \
        K_DEFER_C(base = (Teb)->StackBase, \
                  limit = (Teb)->StackLimit, \
                  dealloc = (Teb)->DeallocationStack, \
                  seh = (Teb)->ExceptionList) { \
            (Teb)->StackBase = base; \
            (Teb)->StackLimit = limit; \
            (Teb)->DeallocationStack = dealloc; \
            (Teb)->ExceptionList = seh; \
        }; \
        (Teb)->StackBase = (High); \
        (Teb)->StackLimit = (Low); \
        (Teb)->DeallocationStack = (Low); \
        (Teb)->ExceptionList = High - 8; \
        ((void **)(High))[-2] = (void *)-1; \
        ((void **)(High))[-1] = (void *)SehHandler;
#endif

extern const HashMap<int, const char *> WindowsMachineNames;

void *LoadWindowsLibrary(Napi::Env env, Span<const char> path); // Returns HANDLE

int GetSelfMachine();
int GetDllMachine(const wchar_t *filename);

extern "C" int __cdecl SehHandler(void *ptr, void *, void *ctx, void *);

}
