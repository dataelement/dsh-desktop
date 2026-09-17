; SPDX-License-Identifier: MIT
; SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

    AREA |.text|, CODE

; Forward
; ----------------------------

    ; These three are the same, but they differ (in the C side) by their return type.
    ; Unlike the three next functions, these ones don't forward XMM argument registers.
    EXPORT CallG
    EXPORT CallF
    EXPORT CallD
    EXPORT CallGG
    EXPORT CallHfa

    ; The X variants are slightly slower, and are used when XMM arguments must be forwarded.
    EXPORT CallGX
    EXPORT CallFX
    EXPORT CallDX
    EXPORT CallGGX
    EXPORT CallHfaX

    ; Copy function pointer to r9, in order to save it through argument forwarding.
    ; Save RSP in r29 (non-volatile), and use carefully assembled stack provided by caller.
    MACRO
    prologue

    stp x29, x30, [sp, -16]!
    mov x29, sp
    str x29, [x2, 0]
    mov x9, x0
    add sp, x1, #152
    MEND

    ; Call native function.
    ; Once done, restore normal stack pointer and return.
    ; The return value is passed untouched through r0, r1, v0 and/or v1.
    MACRO
    epilogue

    mov sp, x29
    ldp x29, x30, [sp], 16
    ret
    MEND

    ; Prepare general purpose argument registers from array passed by caller.
    MACRO
    forward_gpr

    ldr x8, [x1, 64]
    ldp x6, x7, [x1, 48]
    ldp x4, x5, [x1, 32]
    ldp x2, x3, [x1, 16]
    ldp x0, x1, [x1, 0]
    MEND

    ; Prepare FP argument registers from array passed by caller.
    MACRO
    forward_fpr

    ldp d6, d7, [x1, 120]
    ldp d4, d5, [x1, 104]
    ldp d2, d3, [x1, 88]
    ldp d0, d1, [x1, 72]
    MEND

CallG PROC
    prologue
    forward_gpr
    blr x9
    epilogue
    ENDP

CallF PROC
    prologue
    forward_gpr
    blr x9
    epilogue
    ENDP

CallD PROC
    prologue
    forward_gpr
    blr x9
    epilogue
    ENDP

CallGG PROC
    prologue
    forward_gpr
    blr x9
    epilogue
    ENDP

CallHfa PROC
    prologue
    forward_gpr
    blr x9
    stp d0, d1, [sp, -152]
    stp d2, d3, [sp, -136]
    epilogue
    ENDP

CallGX PROC
    prologue
    forward_fpr
    forward_gpr
    blr x9
    epilogue
    ENDP

CallFX PROC
    prologue
    forward_fpr
    forward_gpr
    blr x9
    epilogue
    ENDP

CallDX PROC
    prologue
    forward_fpr
    forward_gpr
    blr x9
    epilogue
    ENDP

CallGGX PROC
    prologue
    forward_fpr
    forward_gpr
    blr x9
    epilogue
    ENDP

CallHfaX PROC
    prologue
    forward_fpr
    forward_gpr
    blr x9
    stp d0, d1, [sp, -152]
    stp d2, d3, [sp, -136]
    epilogue
    ENDP

; Callbacks
; ----------------------------

    EXPORT RelayCallback
    EXTERN RelayCallback
    EXPORT SwitchAndRelay
    EXPORT RelayDirect
    EXTERN RelayDirect
    EXPORT FindTrampolineStart
    EXPORT FindTrampolineEnd

    ; First, make a copy of the argument registers.
    ; Then call the C function RelayCallback with the following arguments:
    ; static trampoline ID, a pointer to the saved GPR array, a pointer to the stack
    ; arguments of this call, and a pointer to a struct that will contain the result registers.
    ; After the call, simply load these registers from the output struct.
    MACRO
    trampoline $ID

    mov x9, $ID
    b RelayTrampoline
    MEND

RelayTrampoline PROC
    stp x29, x30, [sp, -16]!
    sub sp, sp, #192
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
    bl RelayCallback
    ldp x0, x1, [sp, 0]
    ldp d0, d1, [sp, 16]
    ldp d2, d3, [sp, 32]
    add sp, sp, #192
    ldp x29, x30, [sp], 16
    ret
    ENDP

; When a callback is relayed, Koffi will call into Node.js and V8 to execute Javascript.
; The problem is that we're still running on the separate Koffi stack, and V8 will
; probably misdetect this as a "stack overflow". We have to restore the old
; stack pointer, call Node.js/V8 and go back to ours.
; The first three parameters (x0, x1, x2) are passed through untouched.
SwitchAndRelay PROC
    stp x29, x30, [sp, -16]!
    mov x29, sp
    str x29, [x4]
    mov sp, x3
    bl RelayDirect
    mov sp, x29
    ldp x29, x30, [sp], 16
    ret
    ENDP

    ALIGN 16
FindTrampolineStart PROC
    adr x0, 16
    and x0, x0, #-16
    ret
    ENDP
    ALIGN 16

    INCLUDE armasm.inc

FindTrampolineEnd PROC
    adr x0, 0
    ret
    ENDP

    END
