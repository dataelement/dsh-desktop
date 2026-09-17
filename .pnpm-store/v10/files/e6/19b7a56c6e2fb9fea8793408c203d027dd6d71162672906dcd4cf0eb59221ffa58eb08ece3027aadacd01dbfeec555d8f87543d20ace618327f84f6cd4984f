# SPDX-License-Identifier: MIT
# SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#if defined(__APPLE__)
    #define SYMBOL(Symbol) _ ## Symbol
#else
    #define SYMBOL(Symbol) Symbol
#endif

# Forward
# ----------------------------

#if defined(__APPLE__)
# Fix "arm64 function not 4-byte aligned" linker warnings
.p2align 2
#endif

# These three are the same, but they differ (in the C side) by their return type.
# Unlike the three next functions, these ones don't forward XMM argument registers.
.global SYMBOL(CallG)
.global SYMBOL(CallF)
.global SYMBOL(CallD)
.global SYMBOL(CallGG)
.global SYMBOL(CallHfa)

# The X variants are slightly slower, and are used when XMM arguments must be forwarded.
.global SYMBOL(CallGX)
.global SYMBOL(CallFX)
.global SYMBOL(CallDX)
.global SYMBOL(CallGGX)
.global SYMBOL(CallHfaX)

# Copy function pointer to r9, in order to save it through argument forwarding.
# Also make a copy of the SP to CallData::old_sp because the callback system might need it.
# Save RSP in r29 (non-volatile), and use carefully assembled stack provided by caller.
.macro prologue
    .cfi_startproc
    hint #34
    stp x29, x30, [sp, -16]!
    .cfi_def_cfa sp, 16
    .cfi_offset 29, 16
    .cfi_offset 30, 8
    mov x29, sp
    .cfi_def_cfa x29, 16
    str x29, [x2, 0]
    mov x9, x0
    add sp, x1, #152
.endm

# Call native function.
# Once done, restore normal stack pointer and return.
# The return value is passed untouched through r0, r1, v0 and/or v1.
.macro epilogue
    mov sp, x29
    .cfi_def_cfa sp, 16
    ldp x29, x30, [sp], 16
    .cfi_def_cfa sp, 0
    .cfi_restore 30
    .cfi_restore 29
    ret
    .cfi_endproc
.endm

# Prepare general purpose argument registers from array passed by caller.
.macro forward_gpr
    ldr x8, [x1, 64]
    ldp x6, x7, [x1, 48]
    ldp x4, x5, [x1, 32]
    ldp x2, x3, [x1, 16]
    ldp x0, x1, [x1, 0]
.endm

# Prepare vector argument registers from array passed by caller.
.macro forward_vec
    ldp d6, d7, [x1, 120]
    ldp d4, d5, [x1, 104]
    ldp d2, d3, [x1, 88]
    ldp d0, d1, [x1, 72]
.endm

SYMBOL(CallG):
    prologue
    forward_gpr
    blr x9
    epilogue

SYMBOL(CallF):
    prologue
    forward_gpr
    blr x9
    epilogue

SYMBOL(CallD):
    prologue
    forward_gpr
    blr x9
    epilogue

SYMBOL(CallGG):
    prologue
    forward_gpr
    blr x9
    epilogue

SYMBOL(CallHfa):
    prologue
    forward_gpr
    blr x9
    stp d0, d1, [sp, -152]
    stp d2, d3, [sp, -136]
    epilogue

SYMBOL(CallGX):
    prologue
    forward_vec
    forward_gpr
    blr x9
    epilogue

SYMBOL(CallFX):
    prologue
    forward_vec
    forward_gpr
    blr x9
    epilogue

SYMBOL(CallDX):
    prologue
    forward_vec
    forward_gpr
    blr x9
    epilogue

SYMBOL(CallGGX):
    prologue
    forward_vec
    forward_gpr
    blr x9
    epilogue

SYMBOL(CallHfaX):
    prologue
    forward_vec
    forward_gpr
    blr x9
    stp d0, d1, [sp, -152]
    stp d2, d3, [sp, -136]
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

# First, make a copy of the argument registers.
# Then call the C function RelayCallback with the following arguments:
# static trampoline ID, a pointer to the saved GPR array, a pointer to the stack
# arguments of this call, and a pointer to a struct that will contain the result registers.
# After the call, simply load these registers from the output struct.
.macro trampoline id
    .cfi_startproc
    hint #34
    mov x9, \id
    b RelayTrampoline
    .cfi_endproc
.endm

RelayTrampoline:
    .cfi_startproc
    stp x29, x30, [sp, -16]!
    .cfi_def_cfa sp, 16
    .cfi_offset 29, 16
    .cfi_offset 30, 8
    sub sp, sp, #192
    .cfi_def_cfa sp, 208
    stp x0, x1, [sp, 48]
    stp x2, x3, [sp, 64]
    stp x4, x5, [sp, 80]
    stp x6, x7, [sp, 96]
    str x8, [sp, 112]
    stp d0, d1, [sp, 120]
    stp d2, d3, [sp, 136]
    stp d4, d5, [sp, 152]
    stp d6, d7, [sp, 168]
    mov x0, x9
    add x1, sp, #48
    bl SYMBOL(RelayCallback)
    ldp x0, x1, [sp, 0]
    ldp d0, d1, [sp, 16]
    ldp d2, d3, [sp, 32]
    add sp, sp, #192
    .cfi_def_cfa sp, 16
    ldp x29, x30, [sp], 16
    .cfi_def_cfa sp, 0
    .cfi_restore 30
    .cfi_restore 29
    ret
    .cfi_endproc

# When a callback is relayed, Koffi will call into Node.js and V8 to execute Javascript.
# The problem is that we're still running on the separate Koffi stack, and V8 will
# probably misdetect this as a "stack overflow". We have to restore the old
# stack pointer, call Node.js/V8 and go back to ours.
# The first three parameters (x0, x1, x2) are passed through untouched.
SYMBOL(SwitchAndRelay):
    .cfi_startproc
    hint #34
    stp x29, x30, [sp, -16]!
    .cfi_def_cfa sp, 16
    .cfi_offset 29, 16
    .cfi_offset 30, 8
    mov x29, sp
    str x29, [x4]
    mov sp, x3
    bl SYMBOL(RelayDirect)
    mov sp, x29
    .cfi_def_cfa sp, 16
    ldp x29, x30, [sp], 16
    .cfi_def_cfa sp, 0
    .cfi_restore 30
    .cfi_restore 29
    ret
    .cfi_endproc

#if defined(_WIN32)

.balign 16
SYMBOL(FindTrampolineStart):
    adr x0, 16
    and x0, x0, #-16
    ret
.balign 16

#include "gnu.inc"

SYMBOL(FindTrampolineEnd):
    adr x0, 0
    ret

#else

#include "gnu.inc"

SYMBOL(TrampolineEnd):
    ret

#endif
