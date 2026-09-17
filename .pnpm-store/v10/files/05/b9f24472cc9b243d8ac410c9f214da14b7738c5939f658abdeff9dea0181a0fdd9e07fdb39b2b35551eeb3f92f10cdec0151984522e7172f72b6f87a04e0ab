; SPDX-License-Identifier: MIT
; SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

; Forward
; ----------------------------

public CallG
public CallF
public CallD
public CallGX
public CallFX
public CallDX

.model flat, C
.code

; Copy function pointer to EAX, in order to save it through argument forwarding.
; Also make a copy of the SP to CallData::old_sp because the callback system might need it.
; Save ESP in EBX (non-volatile), and use carefully assembled stack provided by caller.
prologue macro
    endbr32
    push ebp
    mov ebp, esp
    mov eax, dword ptr [esp+16]
    mov dword ptr [eax+0], esp
    mov eax, dword ptr [esp+8]
    mov esp, dword ptr [esp+12]
endm

fastcall macro
    mov ecx, dword ptr [esp+0]
    mov edx, dword ptr [esp+4]
    add esp, 16
endm

; Call native function.
; Once done, restore normal stack pointer and return.
; The return value is passed back untouched.
epilogue macro
    call eax
    mov esp, ebp
    pop ebp
    ret
endm

CallG proc
    prologue
    epilogue
CallG endp

CallF proc
    prologue
    epilogue
CallF endp

CallD proc
    prologue
    epilogue
CallD endp

CallGX proc
    prologue
    fastcall
    epilogue
CallGX endp

CallFX proc
    prologue
    fastcall
    epilogue
CallFX endp

CallDX proc
    prologue
    fastcall
    epilogue
CallDX endp

; Callbacks
; ----------------------------

extern RelayCallback : PROC
public SwitchAndRelay
extern RelayDirect : PROC

; Call the C function RelayCallback with the following arguments:
; static trampoline ID, the current stack pointer, a pointer to the stack arguments of this call,
; and a pointer to a struct that will contain the result registers.
; After the call, simply load these registers from the output struct.
; Depending on ABI, call convention and return value size, we need to issue ret <something>. Since ret
; only takes an immediate value, and I prefer not to branch, the return address is moved instead according
; to BackRegisters::ret_pop before ret is issued.
; We need to branch at the end to avoid x87 stack imbalance.
trampoline macro ID
    endbr32
    mov eax, ID
    jmp RelayTrampoline
endm

RelayTrampoline proc
    sub esp, 44
    mov dword ptr [esp+0], eax
    lea ecx, dword ptr [esp+48]
    mov dword ptr [esp+4], ecx
    mov dword ptr [esp+32], 0
    mov dword ptr [esp+36], 0
    call RelayCallback
    mov ecx, dword ptr [esp+36]
    mov edx, dword ptr [esp+44]
    mov dword ptr [esp+ecx+44], edx
    cmp dword ptr [esp+32], 1
    je l1
    cmp dword ptr [esp+32], 2
    je l2
l0:
    mov eax, dword ptr [esp+16]
    mov edx, dword ptr [esp+20]
    lea esp, dword ptr [esp+ecx+44]
    ret
l1:
    fld dword ptr [esp+24]
    lea esp, dword ptr [esp+ecx+44]
    ret
l2:
    fld qword ptr [esp+24]
    lea esp, dword ptr [esp+ecx+44]
    ret
RelayTrampoline endp

; When a callback is relayed, Koffi will call into Node.js and V8 to execute Javascript.
; The problem is that we're still running on the separate Koffi stack, and V8 will
; probably misdetect this as a "stack overflow". We have to restore the old
; stack pointer, call Node.js/V8 and go back to ours.
SwitchAndRelay proc
    endbr32
    push ebp
    mov ebp, esp
    mov ecx, dword ptr [esp+24]
    mov dword ptr [ecx+0], esp
    mov esp, dword ptr [esp+20]
    sub esp, 24
    mov eax, dword ptr [ebp+8]
    mov dword ptr [esp+0], eax
    mov eax, dword ptr [ebp+12]
    mov dword ptr [esp+4], eax
    mov eax, dword ptr [ebp+16]
    mov dword ptr [esp+8], eax
    call RelayDirect
    mov esp, ebp
    pop ebp
    ret
SwitchAndRelay endp

align 16
FindTrampolineStart proc
    call GetEIP
    add eax, 16
    and eax, 0FFFFFFF0h
    ret
FindTrampolineStart endp
align 16

include masm32.inc

FindTrampolineEnd proc
    call GetEIP
    ret
FindTrampolineEnd endp

GetEIP proc
    mov eax, dword ptr [esp]
    ret
GetEIP endp

end
