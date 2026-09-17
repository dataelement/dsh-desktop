; SPDX-License-Identifier: MIT
; SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

; Forward
; ----------------------------

; These three are the same, but they differ (in the C side) by their return type.
; Unlike the three next functions, these ones don't forward XMM argument registers.
public CallG
public CallF
public CallD

; The X variants are slightly slower, and are used when XMM arguments must be forwarded.
public CallGX
public CallFX
public CallDX

extern SehHandler : PROC

.code

; Copy function pointer to RAX, in order to save it through argument forwarding.
; Also make a copy of the SP to CallData::old_sp because the callback system might need it.
; Save RSP in RBX (non-volatile), and use carefully assembled stack provided by caller.
prologue macro
    endbr64
    mov rax, rcx
    push rbp
    .pushreg rbp
    mov rbp, rsp
    mov qword ptr [r8+0], rsp
    .setframe rbp, 0
    .endprolog
    lea rsp, qword ptr [rdx+80]
endm

; Prepare integer argument registers from array passed by caller.
forward_gpr macro
    mov r9, qword ptr [rdx+24]
    mov r8, qword ptr [rdx+16]
    mov rcx, qword ptr [rdx+0]
    mov rdx, qword ptr [rdx+8]
endm

; Prepare XMM argument registers from array passed by caller.
forward_xmm macro
    movsd xmm3, qword ptr [rdx+56]
    movsd xmm2, qword ptr [rdx+48]
    movsd xmm1, qword ptr [rdx+40]
    movsd xmm0, qword ptr [rdx+32]
endm

; CallNative is a minimal wrapper around the native function call.
; Its frame lives entirely on the custom stack, so its EstablisherFrame passes
; the TEB stack bounds check. This ensures that SehHandler is found by
; RtlDispatchException before it tries to cross back to the original stack
; (through Call*), which would fail the bounds check and terminate.
; After the native call returns, CallNative restores the original stack via
; RBP (non-volatile, preserved by native) and returns directly to the C++ caller.
CallNative proc frame:SehHandler
    .endprolog
    call rax
    mov rsp, rbp
    pop rbp
    ret
CallNative endp

CallG proc frame
    prologue
    forward_gpr
    jmp CallNative
CallG endp

CallF proc frame
    prologue
    forward_gpr
    jmp CallNative
CallF endp

CallD proc frame
    prologue
    forward_gpr
    jmp CallNative
CallD endp

CallGX proc frame
    prologue
    forward_xmm
    forward_gpr
    jmp CallNative
CallGX endp

CallFX proc frame
    prologue
    forward_xmm
    forward_gpr
    jmp CallNative
CallFX endp

CallDX proc frame
    prologue
    forward_xmm
    forward_gpr
    jmp CallNative
CallDX endp

; Callbacks
; ----------------------------

extern RelayCallback : PROC
public SwitchAndRelay
extern RelayDirect : PROC
public FindTrampolineStart
public FindTrampolineEnd

; First, make a copy of argument registers.
; Then call the C function RelayCallback with the following arguments:
; static trampoline ID, a pointer to the saved GPR array, a pointer to the stack
; arguments of this call, and a pointer to a struct that will contain the result registers.
; After the call, simply load these registers from the output struct.
trampoline macro ID
    .endprolog
    endbr64
    mov rax, ID
    jmp RelayTrampoline
endm

RelayTrampoline proc frame
    sub rsp, 136
    .allocstack 136
    .endprolog
    mov qword ptr [rsp+64], rcx
    mov qword ptr [rsp+72], rdx
    mov qword ptr [rsp+80], r8
    mov qword ptr [rsp+88], r9
    movsd qword ptr [rsp+96], xmm0
    movsd qword ptr [rsp+104], xmm1
    movsd qword ptr [rsp+112], xmm2
    movsd qword ptr [rsp+120], xmm3
    mov rcx, rax
    lea rdx, qword ptr [rsp+64]
    call RelayCallback
    mov rax, qword ptr [rsp+32]
    movsd xmm0, qword ptr [rsp+40]
    add rsp, 136
    ret
RelayTrampoline endp

; When a callback is relayed, Koffi will call into Node.js and V8 to execute Javascript.
; The problem is that we're still running on the separate Koffi stack, and V8 will
; probably misdetect this as a "stack overflow". We have to restore the old
; stack pointer, call Node.js/V8 and go back to ours.
; The first three parameters (rcx, rdx, r8) are passed through untouched.
SwitchAndRelay proc frame
    endbr64
    push rbp
    .pushreg rbp
    mov rbp, rsp
    .setframe rbp, 0
    .endprolog
    mov r10, qword ptr [rsp+48]
    mov qword ptr [r10+0], rsp
    lea rsp, [r9-32]
    call RelayDirect
    mov rsp, rbp
    pop rbp
    ret
SwitchAndRelay endp

align 16
FindTrampolineStart:
    call GetRIP
    add rax, 16
    and rax, 0FFFFFFFFFFFFFFF0h
    ret
align 16

include masm64.inc

FindTrampolineEnd:
    call GetRIP
    ret

; I could not f*cking find how to use lea with RIP-relative addressing in MASM64. Oh well.
GetRIP:
    mov rax, qword ptr [rsp]
    ret

end
