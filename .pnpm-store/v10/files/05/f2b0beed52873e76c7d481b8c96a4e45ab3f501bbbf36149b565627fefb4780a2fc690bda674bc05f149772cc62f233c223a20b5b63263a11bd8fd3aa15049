# SPDX-License-Identifier: MIT
# SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#if defined(__APPLE__)
    #define SYMBOL(Symbol) _ ## Symbol
#else
    #define SYMBOL(Symbol) Symbol
#endif

# Forward
# ----------------------------

# These five are the same, but they differ (in the C side) by their return type.
# Unlike the five next functions, these ones don't forward XMM argument registers.
.global SYMBOL(CallG)
.global SYMBOL(CallF)
.global SYMBOL(CallD)
.global SYMBOL(CallGG)
.global SYMBOL(CallDG)
.global SYMBOL(CallGD)
.global SYMBOL(CallDD)

# The X variants are slightly slower, and are used when XMM arguments must be forwarded.
.global SYMBOL(CallGX)
.global SYMBOL(CallFX)
.global SYMBOL(CallDX)
.global SYMBOL(CallGGX)
.global SYMBOL(CallDGX)
.global SYMBOL(CallGDX)
.global SYMBOL(CallDDX)

#define ENDBR64 .byte 0xf3, 0x0f, 0x1e, 0xfa

# Copy function pointer to R11, in order to save it through argument forwarding.
# Also make a copy of the SP to CallData::old_sp because the callback system might need it.
# Save RSP in RBX (non-volatile), and use carefully assembled stack provided by caller.
.macro prologue
    .cfi_startproc
    .cfi_def_cfa rsp, 8
    ENDBR64
    movq %rdi, %r11
    pushq %rbp
    .cfi_def_cfa rsp, 16
    movq %rsp, (%rdx)
    movq %rsp, %rbp
    .cfi_def_cfa rbp, 16
    leaq 128(%rsi), %rsp
.endm

# Call native function.
# Once done, restore normal stack pointer and return.
# The return value is passed untouched through RAX or XMM0.
.macro epilogue
    call *%r11
    movq %rbp, %rsp
    popq %rbp
    .cfi_def_cfa rsp, 8
    ret
    .cfi_endproc
.endm

# Prepare integer argument registers from array passed by caller.
.macro forward_gpr
    movq 40(%rsi), %r9
    movq 32(%rsi), %r8
    movq 24(%rsi), %rcx
    movq 16(%rsi), %rdx
    movq 0(%rsi), %rdi
    movq 8(%rsi), %rsi
.endm

# Prepare XMM argument registers from array passed by caller.
.macro forward_xmm
    movsd 104(%rsi), %xmm7
    movsd 96(%rsi), %xmm6
    movsd 88(%rsi), %xmm5
    movsd 80(%rsi), %xmm4
    movsd 72(%rsi), %xmm3
    movsd 64(%rsi), %xmm2
    movsd 56(%rsi), %xmm1
    movsd 48(%rsi), %xmm0
.endm

SYMBOL(CallG):
    prologue
    forward_gpr
    movb $0, %al
    epilogue

SYMBOL(CallF):
    prologue
    forward_gpr
    movb $0, %al
    epilogue

SYMBOL(CallD):
    prologue
    forward_gpr
    movb $0, %al
    epilogue

SYMBOL(CallGG):
    prologue
    forward_gpr
    movb $0, %al
    epilogue

SYMBOL(CallDG):
    prologue
    forward_gpr
    movb $0, %al
    epilogue

SYMBOL(CallGD):
    prologue
    forward_gpr
    movb $0, %al
    epilogue

SYMBOL(CallDD):
    prologue
    forward_gpr
    movb $0, %al
    epilogue

SYMBOL(CallGX):
    prologue
    forward_xmm
    forward_gpr
    movb $8, %al
    epilogue

SYMBOL(CallFX):
    prologue
    forward_xmm
    forward_gpr
    movb $8, %al
    epilogue

SYMBOL(CallDX):
    prologue
    forward_xmm
    forward_gpr
    movb $8, %al
    epilogue

SYMBOL(CallGGX):
    prologue
    forward_xmm
    forward_gpr
    movb $8, %al
    epilogue

SYMBOL(CallDGX):
    prologue
    forward_xmm
    forward_gpr
    movb $8, %al
    epilogue

SYMBOL(CallGDX):
    prologue
    forward_xmm
    forward_gpr
    movb $8, %al
    epilogue

SYMBOL(CallDDX):
    prologue
    forward_xmm
    forward_gpr
    movb $8, %al
    epilogue

# Callbacks
# ----------------------------

.global SYMBOL(RelayCallback)
.global SYMBOL(SwitchAndRelay)
.global SYMBOL(RelayDirect)
.global SYMBOL(TrampolineEnd)

# First, make a copy of argument registers.
# Then call the C function RelayCallback with the following arguments:
# static trampoline ID, a pointer to the saved GPR array, a pointer to the stack
# arguments of this call, and a pointer to a struct that will contain the result registers.
# After the call, simply load these registers from the output struct.
.macro trampoline id
    .cfi_startproc
    .cfi_def_cfa rsp, 8
    ENDBR64
    movq $\id, %rax
    jmp RelayTrampoline
    .cfi_endproc
.endm

RelayTrampoline:
    .cfi_startproc
    .cfi_def_cfa rsp, 8
    subq $152, %rsp
    .cfi_def_cfa rsp, 160
    movq %rdi, 32(%rsp)
    movq %rsi, 40(%rsp)
    movq %rdx, 48(%rsp)
    movq %rcx, 56(%rsp)
    movq %r8, 64(%rsp)
    movq %r9, 72(%rsp)
    movsd %xmm0, 80(%rsp)
    movsd %xmm1, 88(%rsp)
    movsd %xmm2, 96(%rsp)
    movsd %xmm3, 104(%rsp)
    movsd %xmm4, 112(%rsp)
    movsd %xmm5, 120(%rsp)
    movsd %xmm6, 128(%rsp)
    movsd %xmm7, 136(%rsp)
    movq %rax, %rdi
    leaq 32(%rsp), %rsi
    call SYMBOL(RelayCallback)
    movq 0(%rsp), %rax
    movq 8(%rsp), %rdx
    movsd 16(%rsp), %xmm0
    movsd 24(%rsp), %xmm1
    addq $152, %rsp
    .cfi_def_cfa rsp, 8
    ret
    .cfi_endproc

# When a callback is relayed, Koffi will call into Node.js and V8 to execute Javascript.
# The problem is that we're still running on the separate Koffi stack, and V8 will
# probably misdetect this as a "stack overflow". We have to restore the old
# stack pointer, call Node.js/V8 and go back to ours.
# The first three parameters (rdi, rsi, rdx) are passed through untouched.
SYMBOL(SwitchAndRelay):
    .cfi_startproc
    .cfi_def_cfa rsp, 8
    ENDBR64
    push %rbp
    .cfi_def_cfa rsp, 16
    movq %rsp, %rbp
    movq %rsp, 0(%r8)
    movq %rcx, %rsp
    .cfi_def_cfa rsp, 16
    call SYMBOL(RelayDirect)
    mov %rbp, %rsp
    .cfi_def_cfa rsp, 16
    pop %rbp
    .cfi_def_cfa rsp, 8
    ret
    .cfi_endproc

#include "gnu.inc"

SYMBOL(TrampolineEnd):
    ret
