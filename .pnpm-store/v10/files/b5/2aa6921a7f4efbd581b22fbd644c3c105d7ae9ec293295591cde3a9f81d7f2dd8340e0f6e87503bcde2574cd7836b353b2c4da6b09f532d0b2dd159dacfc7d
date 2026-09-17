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

# Copy function pointer to t7, in order to save it through argument forwarding.
# Also make a copy of the SP to CallData::old_sp because the callback system might need it.
# Save SP in FP, and use carefully assembled stack provided by caller.
.macro prologue
    addi.d $sp, $sp, -16
    st.d $ra, $sp, 0
    st.d $fp, $sp, 8
    move $fp, $sp
    st.d $fp, $a2, 0
    move $t7, $a0
    addi.d $sp, $a1, 144
.endm

# Call native function.
# Once done, restore normal stack pointer and return.
# The return value is passed untouched through registers.
.macro epilogue
    jirl $ra, $t7,0
    move $sp, $fp
    ld.d $ra, $sp, 0
    ld.d $fp, $sp, 8
    addi.d $sp, $sp, 16
    jr $ra
.endm

# Prepare general purpose argument registers from array passed by caller.
.macro forward_gpr
    ld.d $a7, $a1, 56
    ld.d $a6, $a1, 48
    ld.d $a5, $a1, 40
    ld.d $a4, $a1, 32
    ld.d $a3, $a1, 24
    ld.d $a2, $a1, 16
    ld.d $a0, $a1, 0
    ld.d $a1, $a1, 8
.endm

# Prepare FP argument registers from array passed by caller.
.macro forward_fpr
    fld.d $fa7, $a1, 120
    fld.d $fa6, $a1, 112
    fld.d $fa5, $a1, 104
    fld.d $fa4, $a1, 96
    fld.d $fa3, $a1, 88
    fld.d $fa2, $a1, 80
    fld.d $fa1, $a1, 72
    fld.d $fa0, $a1, 64
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

# First, make a copy of the argument registers.
# Then call the C function RelayCallback with the following arguments:
# static trampoline ID, a pointer to the saved GPR array, a pointer to the stack
# arguments of this call, and a pointer to a struct that will contain the result registers.
# After the call, simply load these registers from the output struct.
.macro trampoline id
    li.d $t0, \id
    b RelayTrampoline
    .balign 16
.endm

RelayTrampoline:
    addi.d $sp, $sp, -192
    st.d $ra, $sp, 0
    st.d $a0, $sp, 56
    st.d $a1, $sp, 64
    st.d $a2, $sp, 72
    st.d $a3, $sp, 80
    st.d $a4, $sp, 88
    st.d $a5, $sp, 96
    st.d $a6, $sp, 104
    st.d $a7, $sp, 112
    fst.d $fa0, $sp, 120
    fst.d $fa1, $sp, 128
    fst.d $fa2, $sp, 136
    fst.d $fa3, $sp, 144
    fst.d $fa4, $sp, 152
    fst.d $fa5, $sp, 160
    fst.d $fa6, $sp, 168
    fst.d $fa7, $sp, 176
    move $a0, $t0
    addi.d $a1, $sp, 56
    bl RelayCallback
    ld.d $ra, $sp, 0
    ld.d $a0, $sp, 16
    ld.d $a1, $sp, 24
    fld.d $fa0, $sp, 32
    fld.d $fa1, $sp, 40
    addi.d $sp, $sp, 192
    jr $ra

# When a callback is relayed, Koffi will call into Node.js and V8 to execute Javascript.
# The problem is that we're still running on the separate Koffi stack, and V8 will
# probably misdetect this as a "stack overflow". We have to restore the old
# stack pointer, call Node.js/V8 and go back to ours.
# The first three parameters (a0, a1, a2) are passed through untouched.
SwitchAndRelay:
    addi.d $sp, $sp, -16
    st.d $ra, $sp, 0
    st.d $fp, $sp, 8
    move $fp, $sp
    st.d $sp, $a4, 0
    move $sp, $a3
    bl RelayDirect
    move $sp, $fp
    ld.d $ra, $sp, 0
    ld.d $fp, $sp, 8
    addi.d $sp, $sp, 16
    jr $ra

.balign 16
#include "gnu.inc"

TrampolineEnd:
    jr $ra
