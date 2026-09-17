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
.global CallHfa

# The X variants are slightly slower, and are used when FA arguments must be forwarded.
.global CallGX
.global CallFX
.global CallDX
.global CallGGX
.global CallHfaX

# Copy function pointer to t0, in order to save it through argument forwarding.
# Also make a copy of the SP to CallData::old_sp because the callback system might need it.
# Save SP in s1, and use carefully assembled stack provided by caller.
.macro prologue
    mflr %r0
    std %r0, 16(%r1)
    std %r2, 24(%r1)
    std %r14, -24(%r1)
    stdu %r1, -32(%r1)
    mr %r12, %r3
    mr %r14, %r1
    std %r1, 0(%r5)
    addi %r1, %r4, 192
    mtctr %r12
.endm

# Call native function.
# Once done, restore normal stack pointer and return.
# The return value is passed untouched through registers.
.macro epilogue
    mr %r1, %r14
    ld %r14, 8(%r1)
    ld %r2, 56(%r1)
    ld %r0, 48(%r1)
    mtlr %r0
    addi %r1, %r1, 32
    blr
.endm

# Prepare general purpose argument registers from array passed by caller.
.macro forward_gpr
    ld %r10, 56(%r4)
    ld %r9, 48(%r4)
    ld %r8, 40(%r4)
    ld %r7, 32(%r4)
    ld %r6, 24(%r4)
    ld %r5, 16(%r4)
    ld %r3, 0(%r4)
    ld %r4, 8(%r4)
.endm

# Prepare FP argument registers from array passed by caller.
.macro forward_vec
    lfd %f13, 160(%r4)
    lfd %f12, 152(%r4)
    lfd %f11, 144(%r4)
    lfd %f10, 136(%r4)
    lfd %f9, 128(%r4)
    lfd %f8, 120(%r4)
    lfd %f7, 112(%r4)
    lfd %f6, 104(%r4)
    lfd %f5, 96(%r4)
    lfd %f4, 88(%r4)
    lfd %f3, 80(%r4)
    lfd %f2, 72(%r4)
    lfd %f1, 64(%r4)
.endm

CallG:
    .localentry CallG, 0
    prologue
    forward_gpr
    bctrl
    epilogue

CallF:
    .localentry CallF, 0
    prologue
    forward_gpr
    bctrl
    epilogue

CallD:
    .localentry CallD, 0
    prologue
    forward_gpr
    bctrl
    epilogue

CallGG:
    .localentry CallGG, 0
    prologue
    forward_gpr
    bctrl
    epilogue

CallHfa:
    .localentry CallHfa, 0
    prologue
    forward_gpr
    bctrl
    stfd %f1, -192(%r1)
    stfd %f2, -184(%r1)
    stfd %f3, -176(%r1)
    stfd %f4, -168(%r1)
    stfd %f5, -160(%r1)
    stfd %f6, -152(%r1)
    stfd %f7, -144(%r1)
    stfd %f8, -136(%r1)
    epilogue

CallGX:
    .localentry CallGX, 0
    prologue
    forward_vec
    forward_gpr
    bctrl
    epilogue

CallFX:
    .localentry CallFX, 0
    prologue
    forward_vec
    forward_gpr
    bctrl
    epilogue

CallDX:
    .localentry CallDX, 0
    prologue
    forward_vec
    forward_gpr
    bctrl
    epilogue

CallGGX:
    .localentry CallGGX, 0
    prologue
    forward_vec
    forward_gpr
    bctrl
    epilogue

CallHfaX:
    .localentry CallHfaX, 0
    prologue
    forward_vec
    forward_gpr
    bctrl
    stfd %f1, -192(%r1)
    stfd %f2, -184(%r1)
    stfd %f3, -176(%r1)
    stfd %f4, -168(%r1)
    stfd %f5, -160(%r1)
    stfd %f6, -152(%r1)
    stfd %f7, -144(%r1)
    stfd %f8, -136(%r1)
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
    addis %r2, %r12, .TOC.-Trampoline\id@ha
    addi %r2, %r2, .TOC.-Trampoline\id@l
    .localentry Trampoline\id, . -Trampoline\id
    mflr %r0
    std %r0, 16(%r1)
    li %r0, \id
    b RelayTrampoline
    .balign 16
.endm

RelayTrampoline:
    stdu %r1, -304(%r1)
    std %r3, 112(%r1)
    std %r4, 120(%r1)
    std %r5, 128(%r1)
    std %r6, 136(%r1)
    std %r7, 144(%r1)
    std %r8, 152(%r1)
    std %r9, 160(%r1)
    std %r10, 168(%r1)
    stfd %f1, 176(%r1)
    stfd %f2, 184(%r1)
    stfd %f3, 192(%r1)
    stfd %f4, 200(%r1)
    stfd %f5, 208(%r1)
    stfd %f6, 216(%r1)
    stfd %f7, 224(%r1)
    stfd %f8, 232(%r1)
    stfd %f9, 240(%r1)
    stfd %f10, 248(%r1)
    stfd %f11, 256(%r1)
    stfd %f12, 264(%r1)
    stfd %f13, 272(%r1)
    mr %r3, %r0
    addi %r4, %r1, 112
    bl RelayCallback
    nop
    ld %r3, 32(%r1)
    lfd %f1, 40(%r1)
    lfd %f2, 48(%r1)
    lfd %f3, 56(%r1)
    lfd %f4, 64(%r1)
    lfd %f5, 72(%r1)
    lfd %f6, 80(%r1)
    lfd %f7, 88(%r1)
    lfd %f8, 96(%r1)
    ld %r0, 320(%r1)
    mtlr %r0
    addi %r1, %r1, 304
    blr

# When a callback is relayed, Koffi will call into Node.js and V8 to execute Javascript.
# The problem is that we're still running on the separate Koffi stack, and V8 will
# probably misdetect this as a "stack overflow". We have to restore the old
# stack pointer, call Node.js/V8 and go back to ours.
# The first three parameters (r3, r4, r5) are passed through untouched.
SwitchAndRelay:
    .localentry SwitchAndRelay, 0
    mflr %r0
    std %r0, 16(%r1)
    std %r14, -24(%r1)
    stdu %r1, -32(%r1)
    mr %r14, %r1
    std %r1, 0(%r7)
    std %r1, -32(%r6)
    addi %r1, %r6, -32
    bl RelayDirect
    nop
    mr %r1, %r14
    ld %r14, 8(%r1)
    ld %r0, 48(%r1)
    mtlr %r0
    addi %r1, %r1, 32
    blr

.balign 16
#include "gnu.inc"

TrampolineEnd:
    blr
