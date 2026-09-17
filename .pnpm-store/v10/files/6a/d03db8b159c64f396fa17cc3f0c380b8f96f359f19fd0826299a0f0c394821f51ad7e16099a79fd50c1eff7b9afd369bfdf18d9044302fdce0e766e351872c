# SPDX-License-Identifier: MIT
# SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#define SYMBOL(Symbol) Symbol

# Forward
# ----------------------------

# These three are the same, but they differ (in the C side) by their return type.
# Unlike the three next functions, these ones don't forward FA argument registers.
.global CallG
.global CallF
.global CallD
.global CallGG
.global CallDG
.global CallGD
.global CallDD

# The X variants are slightly slower, and are used when FA arguments must be forwarded.
.global CallGX
.global CallFX
.global CallDX
.global CallGGX
.global CallDGX
.global CallGDX
.global CallDDX

# Copy function pointer to t0, in order to save it through argument forwarding.
# Also make a copy of the SP to CallData::old_sp because the callback system might need it.
# Save SP in s1, and use carefully assembled stack provided by caller.
.macro prologue
    addi sp, sp, -16
    mv t0, a0
    sd ra, 0(sp)
    sd s1, 8(sp)
    mv s1, sp
    sd sp, 0(a2)
    addi sp, a1, 144
.endm

# Call native function.
# Once done, restore normal stack pointer and return.
# The return value is passed untouched through registers.
.macro epilogue
    jalr t0
    mv sp, s1
    ld ra, 0(sp)
    ld s1, 8(sp)
    addi sp, sp, 16
    ret
.endm

# Prepare general purpose argument registers from array passed by caller.
.macro forward_gpr
    ld a7, 56(a1)
    ld a6, 48(a1)
    ld a5, 40(a1)
    ld a4, 32(a1)
    ld a3, 24(a1)
    ld a2, 16(a1)
    ld a0, 0(a1)
    ld a1, 8(a1)
.endm

# Prepare FP argument registers from array passed by caller.
.macro forward_fpr
    fld fa7, 120(a1)
    fld fa6, 112(a1)
    fld fa5, 104(a1)
    fld fa4, 96(a1)
    fld fa3, 88(a1)
    fld fa2, 80(a1)
    fld fa1, 72(a1)
    fld fa0, 64(a1)
.endm

CallG:
    prologue
    forward_gpr
    epilogue

CallF:
    prologue
    forward_gpr
    epilogue

CallD:
    prologue
    forward_gpr
    epilogue

CallGG:
    prologue
    forward_gpr
    epilogue

CallDG:
    prologue
    forward_gpr
    epilogue

CallGD:
    prologue
    forward_gpr
    epilogue

CallDD:
    prologue
    forward_gpr
    epilogue

CallGX:
    prologue
    forward_fpr
    forward_gpr
    epilogue

CallFX:
    prologue
    forward_fpr
    forward_gpr
    epilogue

CallDX:
    prologue
    forward_fpr
    forward_gpr
    epilogue

CallGGX:
    prologue
    forward_fpr
    forward_gpr
    epilogue

CallDGX:
    prologue
    forward_fpr
    forward_gpr
    epilogue

CallGDX:
    prologue
    forward_fpr
    forward_gpr
    epilogue

CallDDX:
    prologue
    forward_fpr
    forward_gpr
    epilogue

# Callbacks
# ----------------------------

.global RelayCallback
.global SwitchAndRelay
.global RelayDirect
.global TrampolineEnd

# First, make a copy of argument registers.
# Then call the C function RelayCallback with the following arguments:
# static trampoline ID, a pointer to the saved GPR array, a pointer to the stack
# arguments of this call, and a pointer to a struct that will contain the result registers.
# After the call, simply load these registers from the output struct.
.macro trampoline id
    li t0, \id
    j RelayTrampoline
    .balign 16
.endm

RelayTrampoline:
    addi sp, sp, -192
    sd ra, 0(sp)
    sd a0, 56(sp)
    sd a1, 64(sp)
    sd a2, 72(sp)
    sd a3, 80(sp)
    sd a4, 88(sp)
    sd a5, 96(sp)
    sd a6, 104(sp)
    sd a7, 112(sp)
    fsd fa0, 120(sp)
    fsd fa1, 128(sp)
    fsd fa2, 136(sp)
    fsd fa3, 144(sp)
    fsd fa4, 152(sp)
    fsd fa5, 160(sp)
    fsd fa6, 168(sp)
    fsd fa7, 176(sp)
    mv a0, t0
    addi a1, sp, 56
    call RelayCallback
    ld ra, 0(sp)
    ld a0, 16(sp)
    ld a1, 24(sp)
    fld fa0, 32(sp)
    fld fa1, 40(sp)
    addi sp, sp, 192
    ret

# When a callback is relayed, Koffi will call into Node.js and V8 to execute Javascript.
# The problem is that we're still running on the separate Koffi stack, and V8 will
# probably misdetect this as a "stack overflow". We have to restore the old
# stack pointer, call Node.js/V8 and go back to ours.
# The first three parameters (a0, a1, a2) are passed through untouched.
SwitchAndRelay:
    addi sp, sp, -16
    sd ra, 0(sp)
    sd s1, 8(sp)
    mv s1, sp
    sd sp, 0(a4)
    mv sp, a3
    call RelayDirect
    mv sp, s1
    ld ra, 0(sp)
    ld s1, 8(sp)
    addi sp, sp, 16
    ret

.balign 16
#include "gnu.inc"

TrampolineEnd:
    ret
