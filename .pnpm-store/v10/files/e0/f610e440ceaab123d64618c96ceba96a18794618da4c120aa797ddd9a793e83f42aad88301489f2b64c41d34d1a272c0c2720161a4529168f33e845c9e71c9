/** ACL/token bindings layered on the shared Win32 process owner. */
import type { NativePtr, Win32ProcessBindings } from '@deepseek-ai/dsh-win32-process';
export { allocPtrSlot, allocUint32, decodePtr, decodeUint32, isNullPtr, throwLastError, throwWin32, } from '@deepseek-ai/dsh-win32-process';
export type { NativePtr } from '@deepseek-ai/dsh-win32-process';
/** ACL/token calls composed with the generic Win32 process binding table. */
export interface Win32Bindings extends Win32ProcessBindings {
    openProcess(desiredAccess: number, inheritHandle: number, pid: number): NativePtr;
    openProcessToken(process: NativePtr, desiredAccess: number, tokenHandle: NativePtr): number;
    localAlloc(flags: number, bytes: number): NativePtr;
    localFree(memory: NativePtr): NativePtr;
    convertStringSidToSidW(stringSid: string, sid: NativePtr): number;
    createWellKnownSid(type: number, domainSid: null, sid: NativePtr, size: NativePtr): number;
    isValidSid(sid: NativePtr): number;
    getLengthSid(sid: NativePtr): number;
    copySid(length: number, destination: NativePtr, source: NativePtr): number;
    getTokenInformation(token: NativePtr, cls: number, info: Buffer | null, length: number, needed: NativePtr): number;
    setTokenInformation(token: NativePtr, cls: number, info: Buffer, length: number): number;
    createRestrictedToken(existing: NativePtr, flags: number, disableCount: number, disableSids: null, deletePrivilegeCount: number, privilegesToDelete: null, restrictCount: number, restrictingSids: Buffer, newToken: NativePtr): number;
    setEntriesInAclW(count: number, entries: Buffer, oldAcl: NativePtr | null, newAcl: NativePtr): number;
    setNamedSecurityInfoW(path: string, objectType: number, information: number, owner: null, group: null, dacl: NativePtr | null, sacl: null): number;
    getNamedSecurityInfoW(path: string, objectType: number, information: number, owner: NativePtr, group: NativePtr, dacl: NativePtr, sacl: NativePtr, descriptor: NativePtr): number;
    getTempPathW(length: number, buffer: Buffer): number;
    setEnvironmentVariableW(name: string, value: string): number;
    setConsoleCtrlHandler(handler: null, add: number): number;
    createFileW(fileName: string, desiredAccess: number, shareMode: number, attributes: null, creationDisposition: number, flagsAndAttributes: number, templateFile: null): NativePtr;
    lockFileEx(file: NativePtr, flags: number, reserved: number, bytesLow: number, bytesHigh: number, overlapped: NativePtr): number;
    unlockFileEx(file: NativePtr, reserved: number, bytesLow: number, bytesHigh: number, overlapped: NativePtr): number;
}
/**
 * Return whether CreateFileW produced INVALID_HANDLE_VALUE.
 * @param handle - handle returned by CreateFileW.
 * @returns true for null, zero, or the all-bits-one sentinel.
 */
export declare function isInvalidHandle(handle: NativePtr | null | undefined): boolean;
/**
 * Encode a uint32 into an allocated slot.
 * @param slot - slot allocated by allocUint32.
 * @param value - unsigned value to store.
 */
export declare function encodeUint32(slot: NativePtr, value: number): void;
/**
 * Return a Koffi pointer's numeric address for struct packing.
 * @param ptr - native pointer.
 * @returns pointer address.
 */
export declare function ptrAddress(ptr: NativePtr): bigint;
/**
 * Allocate a raw byte block.
 * @param length - byte count.
 * @returns allocated pointer.
 */
export declare function allocBytes(length: number): NativePtr;
/**
 * Allocate one zeroed x64 OVERLAPPED record.
 * @returns allocated pointer.
 * @remarks Koffi 3.1.1 crashes when LockFileEx or UnlockFileEx receives NULL;
 * a zeroed OVERLAPPED is equivalent for the synchronous lock-file handle.
 */
export declare function allocOverlapped(): NativePtr;
/**
 * Decode a pointer value from a Buffer field.
 * @param buffer - encoded native record.
 * @param offset - pointer field byte offset.
 * @returns decoded pointer, or null for address zero.
 */
export declare function decodePtrAt(buffer: Buffer, offset: number): NativePtr | null;
/**
 * Decode a uint8 field at a native pointer offset.
 * @param ptr - native record pointer.
 * @param offset - field byte offset.
 * @returns decoded value.
 */
export declare function decodeUint8At(ptr: NativePtr, offset: number): number;
/**
 * Decode a uint16 field at a native pointer offset.
 * @param ptr - native record pointer.
 * @param offset - field byte offset.
 * @returns decoded value.
 */
export declare function decodeUint16At(ptr: NativePtr, offset: number): number;
/**
 * Decode a uint32 field at a native pointer offset.
 * @param ptr - native record pointer.
 * @param offset - field byte offset.
 * @returns decoded value.
 */
export declare function decodeUint32At(ptr: NativePtr, offset: number): number;
/**
 * Compare two in-memory SID records without allocating strings.
 * @param left - first native buffer.
 * @param leftOffset - first SID byte offset.
 * @param right - second native buffer.
 * @param rightOffset - second SID byte offset.
 * @returns true when revision, authority, and every sub-authority match.
 */
export declare function sameSidAt(left: NativePtr, leftOffset: number, right: NativePtr, rightOffset: number): boolean;
/**
 * Resolve the cached ACL/token binding table asynchronously.
 * @returns generic process plus ACL/token bindings.
 */
export declare function win32(): Promise<Win32Bindings>;
/**
 * Resolve the cached ACL/token binding table synchronously.
 * @returns generic process plus ACL/token bindings.
 */
export declare function win32Sync(): Win32Bindings;
/**
 * Resolve the current Windows temporary directory.
 * @param api - active ACL/token binding table.
 * @returns UTF-16 path reported by GetTempPathW.
 */
export declare function getTempPath(api: Win32Bindings): string;
//# sourceMappingURL=ffi.d.ts.map