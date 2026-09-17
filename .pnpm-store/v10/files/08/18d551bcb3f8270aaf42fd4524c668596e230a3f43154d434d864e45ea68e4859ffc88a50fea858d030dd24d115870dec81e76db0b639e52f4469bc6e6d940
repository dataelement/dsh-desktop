# SPDX-License-Identifier: MIT
# SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

.syntax unified

#define SYMBOL(Symbol) Symbol

# Forward
# ----------------------------

# These three are the same, but they differ (in the C side) by their return type.
# Unlike the three next functions, these ones don't forward XMM argument registers.
.global CallG
.global CallF
.global CallD
.global CallHfa

# The X variants are slightly slower, and are used when XMM arguments must be forwarded.
.global CallGX
.global CallFX
.global CallDX
.global CallHfaX

# Copy function pointer to r12, in order to save it through argument forwarding.
# Also make a copy of the SP to CallData::old_sp because the callback system might need it.
# Save RSP in fp (non-volatile), and use carefully assembled stack provided by caller.
.macro prologue
    .cfi_startproc
    push {fp, lr}
    .cfi_def_cfa sp, 8
    .cfi_offset 11, 4
    .cfi_offset 14, 8
    mov fp, sp
    .cfi_def_cfa fp, 8
    str fp, [r2, 0]
    mov r12, r0
    mov sp, r1
.endm

# Call native function.
# Once done, restore normal stack pointer and return.
# The return value is passed untouched through r0, r1, and or FP registers
.macro epilogue
    mov sp, fp
    .cfi_def_cfa sp, 8
    pop {fp, lr}
    .cfi_def_cfa sp, 0
    .cfi_restore 11
    .cfi_restore 14
    bx lr
    .cfi_endproc
.endm

CallG:
    prologue
    ldmia sp!, {r0-r3}
    add sp, sp, #80
    blx r12
    epilogue

CallF:
    prologue
    ldmia sp!, {r0-r3}
    add sp, sp, #80
    blx r12
    epilogue

CallD:
    prologue
    ldmia sp!, {r0-r3}
    add sp, sp, #80
    blx r12
    epilogue

CallHfa:
    prologue
    ldmia sp!, {r0-r3}
    add sp, sp, #80
    blx r12
    add r12, sp, -96
    vstmia r12, {d0-d3}
    epilogue

CallGX:
    prologue
    ldmia sp!, {r0-r3}
    vldmia sp!, {d0-d7}
    add sp, sp, #16
    blx r12
    epilogue

CallFX:
    prologue
    ldmia sp!, {r0-r3}
    vldmia sp!, {d0-d7}
    add sp, sp, #16
    blx r12
    epilogue

CallDX:
    prologue
    ldmia sp!, {r0-r3}
    vldmia sp!, {d0-d7}
    add sp, sp, #16
    blx r12
    epilogue

CallHfaX:
    prologue
    ldmia sp!, {r0-r3}
    vldmia sp!, {d0-d7}
    add sp, sp, #16
    blx r12
    add r12, sp, -96
    vstmia r12, {d0-d3}
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
    .cfi_startproc
    mov r12, \id
    b RelayTrampoline
    .cfi_endproc
.endm

RelayTrampoline:
    .cfi_startproc
    push {fp, lr}
    .cfi_def_cfa sp, 8
    .cfi_offset 11, 4
    .cfi_offset 14, 8
    sub sp, sp, #8
    .cfi_def_cfa sp, 16
    vstmdb sp!, {d0-d7}
    stmdb sp!, {r0-r3}
    .cfi_def_cfa sp, 96
    mov r0, r12
    mov r1, sp
    sub sp, sp, #40
    .cfi_def_cfa sp, 136
    bl RelayCallback
    .cfi_def_cfa sp, 136
    ldmia sp!, {r0-r1}
    vldmia sp!, {d0-d3}
    .cfi_def_cfa sp, 96
    add sp, sp, #88
    .cfi_def_cfa sp, 8
    pop {fp, lr}
    .cfi_def_cfa sp, 0
    .cfi_restore 11
    .cfi_restore 14
    bx lr
    .cfi_endproc

# When a callback is relayed, Koffi will call into Node.js and V8 to execute Javascript.
# The problem is that we're still running on the separate Koffi stack, and V8 will
# probably misdetect this as a "stack overflow". We have to restore the old
# stack pointer, call Node.js/V8 and go back to ours.
# The first three parameters (r0, r1, r2) are passed through untouched.
SwitchAndRelay:
    .cfi_startproc
    push {fp, lr}
    .cfi_def_cfa sp, 8
    push {r4, r5}
    .cfi_def_cfa sp, 16
    .cfi_offset 11, 4
    .cfi_offset 14, 8
    mov fp, sp
    ldr r4, [sp, 16]
    str fp, [r4, 0]
    mov sp, r3
    bl RelayDirect
    mov sp, fp
    .cfi_def_cfa sp, 16
    pop {r4, r5}
    .cfi_def_cfa sp, 8
    pop {fp, lr}
    .cfi_def_cfa sp, 0
    .cfi_restore 11
    .cfi_restore 14
    bx lr
    .cfi_endproc

#include "gnu.inc"

TrampolineEnd:
    bx lr
