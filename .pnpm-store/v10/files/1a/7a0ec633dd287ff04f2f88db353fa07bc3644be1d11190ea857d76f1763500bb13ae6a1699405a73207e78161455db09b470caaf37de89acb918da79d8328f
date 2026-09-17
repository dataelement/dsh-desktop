# SPDX-License-Identifier: MIT
# SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#define SYMBOL(Symbol) Symbol

# Forward
# ----------------------------

.global CallG
.global CallF
.global CallD
.global CallGX
.global CallFX
.global CallDX

.global SehHandler

# Copy function pointer to RAX, in order to save it through argument forwarding.
# Also make a copy of the SP to CallData::old_sp because the callback system might need it.
# Save RSP in RBX (non-volatile), and use carefully assembled stack provided by caller.
.macro prologue
    endbr64
    movq %rcx, %rax
    push %rbp
    movq %rsp, %rbp
    movq %rsp, (%r8)
    leaq 80(%rdx), %rsp
.endm

# Prepare integer argument registers from array passed by caller.
.macro forward_gpr
    movq 24(%rdx), %r9
    movq 16(%rdx), %r8
    movq 0(%rdx), %rcx
    movq 8(%rdx), %rdx
.endm

# Prepare XMM argument registers from array passed by caller.
.macro forward_xmm
    movsd 56(%rdx), %xmm3
    movsd 48(%rdx), %xmm2
    movsd 40(%rdx), %xmm1
    movsd 32(%rdx), %xmm0
.endm

# CallNative is a minimal wrapper around the native function call.
# Its frame lives entirely on the custom stack, so its EstablisherFrame passes
# the TEB stack bounds check. This ensures that SehHandler is found by
# RtlDispatchException before it tries to cross back to the original stack
# (through Call*), which would fail the bounds check and terminate.
# After the native call returns, CallNative restores the original stack via
# RBP (non-volatile, preserved by native) and returns directly to the C++ caller.
CallNative:
    .seh_proc CallNative
    .seh_handler SehHandler, @except
    .seh_endprologue
    call *%rax
    movq %rbp, %rsp
    pop %rbp
    ret
    .seh_endproc

CallG:
    prologue
    forward_gpr
    jmp CallNative

CallF:
    prologue
    forward_gpr
    jmp CallNative

CallD:
    prologue
    forward_gpr
    jmp CallNative

CallGX:
    prologue
    forward_xmm
    forward_gpr
    jmp CallNative

CallFX:
    prologue
    forward_xmm
    forward_gpr
    jmp CallNative

CallDX:
    prologue
    forward_xmm
    forward_gpr
    jmp CallNative

# Callbacks
# ----------------------------

.global RelayCallback
.global SwitchAndRelay
.global RelayDirect
.global FindTrampolineStart
.global FindTrampolineEnd

# First, make a copy of argument registers.
# Then call the C function RelayCallback with the following arguments:
# static trampoline ID, a pointer to the saved GPR array, a pointer to the stack
# arguments of this call, and a pointer to a struct that will contain the result registers.
# After the call, simply load these registers from the output struct.
.macro trampoline id
    endbr64
    movq $\id, %rax
    jmp RelayTrampoline
.endm

RelayTrampoline:
    subq $136, %rsp
    movq %rcx, 64(%rsp)
    movq %rdx, 72(%rsp)
    movq %r8, 80(%rsp)
    movq %r9, 88(%rsp)
    movsd %xmm0, 96(%rsp)
    movsd %xmm1, 104(%rsp)
    movsd %xmm2, 112(%rsp)
    movsd %xmm3, 120(%rsp)
    movq %rax, %rcx
    leaq 64(%rsp), %rdx
    call RelayCallback
    movq 32(%rsp), %rax
    movsd 40(%rsp), %xmm0
    addq $136, %rsp
    ret

# When a callback is relayed, Koffi will call into Node.js and V8 to execute Javascript.
# The problem is that we're still running on the separate Koffi stack, and V8 will
# probably misdetect this as a "stack overflow". We have to restore the old
# stack pointer, call Node.js/V8 and go back to ours.
# The first three parameters (rcx, rdx, r8) are passed through untouched.
SwitchAndRelay:
    endbr64
    push %rbp
    movq %rsp, %rbp
    movq 48(%rsp), %r10
    movq %rsp, 0(%r10)
    leaq -32(%r9), %rsp
    call RelayDirect
    movq %rbp, %rsp
    pop %rbp
    ret

.balign 16
FindTrampolineStart:
    leaq 16(%rip), %rax
    andq $0xFFFFFFFFFFFFFFF0, %rax
    ret
.balign 16

#include "gnu.inc"

FindTrampolineEnd:
    leaq (%rip), %rax
    ret
