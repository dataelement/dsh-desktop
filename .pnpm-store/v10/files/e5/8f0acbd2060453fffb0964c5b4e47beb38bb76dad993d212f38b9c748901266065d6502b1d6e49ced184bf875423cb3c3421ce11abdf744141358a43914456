# SPDX-License-Identifier: MIT
# SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#if defined(_WIN32)
    #define SYMBOL(Symbol) _ ## Symbol
#else
    #define SYMBOL(Symbol) Symbol
#endif

# Forward
# ----------------------------

.global SYMBOL(CallG)
.global SYMBOL(CallF)
.global SYMBOL(CallD)
.global SYMBOL(CallGX)
.global SYMBOL(CallFX)
.global SYMBOL(CallDX)

#define ENDBR32 .byte 0xf3, 0x0f, 0x1e, 0xfb

# Copy function pointer to EAX, in order to save it through argument forwarding.
# Also make a copy of the SP to CallData::old_sp because the callback system might need it.
# Save ESP in EBX (non-volatile), and use carefully assembled stack provided by caller.
.macro prologue
    .cfi_startproc
    .cfi_def_cfa esp, 4
    ENDBR32
    push %ebp
    .cfi_def_cfa esp, 8
    movl %esp, %ebp
    .cfi_def_cfa ebp, 8
    movl 16(%esp), %eax
    movl %esp, 0(%eax)
    movl 8(%esp), %eax
    movl 12(%esp), %esp
.endm

.macro fastcall
    movl 0(%esp), %ecx
    movl 4(%esp), %edx
    addl $16, %esp
.endm

# Call native function.
# Once done, restore normal stack pointer and return.
# The return value is passed back untouched.
.macro epilogue
    call *%eax
    movl %ebp, %esp
    pop %ebp
    .cfi_def_cfa esp, 4
    ret
    .cfi_endproc
.endm

SYMBOL(CallG):
    prologue
    epilogue

SYMBOL(CallF):
    prologue
    epilogue

SYMBOL(CallD):
    prologue
    epilogue

SYMBOL(CallGX):
    prologue
    fastcall
    epilogue

SYMBOL(CallFX):
    prologue
    fastcall
    epilogue

SYMBOL(CallDX):
    prologue
    fastcall
    epilogue

# Callbacks
# ----------------------------

.global SYMBOL(RelayCallback)
.global SYMBOL(SwitchAndRelay)
.global SYMBOL(RelayDirect)
#if defined(_WIN32)
.global SYMBOL(FindTrampolineStart)
.global SYMBOL(FindTrampolineEnd)
#else
.global SYMBOL(TrampolineEnd)
#endif

# Call the C function RelayCallback with the following arguments:
# static trampoline ID, the current stack pointer, a pointer to the stack arguments of this call,
# and a pointer to a struct that will contain the result registers.
# After the call, simply load these registers from the output struct.
# Depending on ABI, call convention and return value size, we need to issue ret <something>. Since ret
# only takes an immediate value, and I prefer not to branch, the return address is moved instead according
# to BackRegisters::ret_pop before ret is issued.
# We need to branch at the end to avoid x87 stack imbalance.
.macro trampoline id
    .cfi_startproc
    ENDBR32
    movl $\id, %eax
    jmp RelayTrampoline
    .cfi_endproc
.endm

RelayTrampoline:
    .cfi_startproc
    .cfi_def_cfa esp, 4
    subl $44, %esp
    .cfi_def_cfa esp, 48
    movl %eax, 0(%esp)
    leal 48(%esp), %ecx
    movl %ecx, 4(%esp)
    movl $0, 32(%esp)
    movl $0, 36(%esp)
#if defined(_WIN32)
    call _RelayCallback
#else
    call GetEIP
    addl $_GLOBAL_OFFSET_TABLE_, %eax
    call *RelayCallback@GOT(%eax)
#endif
    movl 36(%esp), %ecx
    movl 44(%esp), %edx
    movl %edx, 44(%esp, %ecx)
    cmpl $1, 32(%esp)
    je 1f
    cmpl $2, 32(%esp)
    je 2f
0:
    movl 16(%esp), %eax
    movl 20(%esp), %edx
    leal 44(%esp, %ecx), %esp
    .cfi_def_cfa esp, 4
    ret
1:
    flds 24(%esp)
    leal 44(%esp, %ecx), %esp
    .cfi_def_cfa esp, 4
    ret
2:
    fldl 24(%esp)
    leal 44(%esp, %ecx), %esp
    .cfi_def_cfa esp, 4
    ret
    .cfi_endproc

# When a callback is relayed, Koffi will call into Node.js and V8 to execute Javascript.
# The problem is that we're still running on the separate Koffi stack, and V8 will
# probably misdetect this as a "stack overflow". We have to restore the old
# stack pointer, call Node.js/V8 and go back to ours.
SYMBOL(SwitchAndRelay):
    .cfi_startproc
    .cfi_def_cfa esp, 4
    ENDBR32
    push %ebp
    .cfi_def_cfa esp, 8
    movl %esp, %ebp
    .cfi_def_cfa ebp, 8
    movl 24(%esp), %ecx
    movl %esp, 0(%ecx)
    movl 20(%esp), %esp
    subl $24, %esp
    movl 8(%ebp), %eax
    movl %eax, 0(%esp)
    movl 12(%ebp), %eax
    movl %eax, 4(%esp)
    movl 16(%ebp), %eax
    movl %eax, 8(%esp)
#if defined(_WIN32)
    call _RelayDirect
#else
    call GetEIP
    addl $_GLOBAL_OFFSET_TABLE_, %eax
    call *RelayDirect@GOT(%eax)
#endif
    mov %ebp, %esp
    .cfi_def_cfa esp, 8
    pop %ebp
    .cfi_def_cfa esp, 4
    ret
    .cfi_endproc

#if defined(_WIN32)

.balign 16
SYMBOL(FindTrampolineStart):
    call GetEIP
    addl $16, %eax
    andl $0xFFFFFFF0, %eax
    ret
.balign 16

#include "gnu.inc"

SYMBOL(FindTrampolineEnd):
    call GetEIP
    ret

#else

#include "gnu.inc"

SYMBOL(TrampolineEnd):
    ret

#endif

GetEIP:
    movl (%esp), %eax
    ret
