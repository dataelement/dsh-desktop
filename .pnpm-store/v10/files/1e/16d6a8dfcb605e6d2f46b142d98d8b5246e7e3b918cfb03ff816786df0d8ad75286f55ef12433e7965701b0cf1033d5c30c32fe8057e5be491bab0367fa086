/** Lazy Koffi bindings for generic Win32 process, stdio, and Job operations. */
import koffi from 'koffi';
declare const nativePtr: unique symbol;
/** Koffi native pointer branded against accidental numeric use. */
export type NativePtr = bigint & {
    readonly [nativePtr]: true;
};
type Ptr = ReturnType<typeof koffi.pointer>;
/** Loaded Win32 libraries and the shared stdcall binder used by process extensions. */
export interface Win32BindingContext {
    /** Kernel process, handle, pipe, and Job APIs. */
    readonly kernel32: ReturnType<typeof koffi.load>;
    /** Token and security APIs. */
    readonly advapi32: ReturnType<typeof koffi.load>;
    /** Bind one stdcall function from a loaded Win32 library. */
    readonly bind: (library: ReturnType<typeof koffi.load>, name: string, result: Ptr | string, args: Array<Ptr | string>) => unknown;
}
/**
 * Return whether a Koffi pointer represents NULL.
 * @param value - pointer value returned by Koffi or a Win32 call.
 * @returns true for null, undefined, or address zero.
 */
export declare function isNullPtr(value: NativePtr | null | undefined): value is null | undefined;
/** STARTUPINFOW fields used by inherited or piped stdio launches. */
export interface StartupInfoInput {
    cb: number;
    dwFlags: number;
    hStdInput: NativePtr;
    hStdOutput: NativePtr;
    hStdError: NativePtr;
}
/** Decoded PROCESS_INFORMATION result. */
export interface ProcessInfoOutput {
    hProcess: NativePtr | null;
    hThread: NativePtr | null;
    dwProcessId: number;
    dwThreadId: number;
}
/** Generic Win32 calls consumed by restricted-token sandbox process operations. */
export interface Win32ProcessBindings {
    closeHandle(handle: NativePtr): number;
    getLastError(): number;
    formatMessageW(flags: number, source: null, messageId: number, languageId: number, buffer: Buffer, size: number, args: null): number;
    createPipe(readHandle: NativePtr, writeHandle: NativePtr, attributes: null, size: number): number;
    setHandleInformation(handle: NativePtr, mask: number, flags: number): number;
    createProcessAsUserW(token: NativePtr, applicationName: string | null, commandLine: string, processAttributes: null, threadAttributes: null, inheritHandles: number, creationFlags: number, environment: null, currentDirectory: string | null, startupInfo: NativePtr, processInfo: NativePtr): number;
    createProcessW(applicationName: string | null, commandLine: string, processAttributes: null, threadAttributes: null, inheritHandles: number, creationFlags: number, environment: Buffer | null, currentDirectory: string | null, startupInfo: NativePtr, processInfo: NativePtr): number;
    readFile(file: NativePtr, buffer: Buffer, count: number, bytesRead: NativePtr, overlapped: null): number;
    peekNamedPipe(pipe: NativePtr, buffer: null, size: number, bytesRead: NativePtr | null, totalAvail: NativePtr, leftThisMessage: NativePtr | null): number;
    waitForSingleObject(handle: NativePtr, milliseconds: number): number;
    getExitCodeProcess(process: NativePtr, exitCode: NativePtr): number;
    createJobObjectW(attributes: null, name: null): NativePtr;
    setInformationJobObject(job: NativePtr, cls: number, information: Buffer, length: number): number;
    queryInformationJobObject(job: NativePtr, cls: number, information: Buffer, length: number, returnLength: null): number;
    assignProcessToJobObject(job: NativePtr, process: NativePtr): number;
    resumeThread(thread: NativePtr): number;
    terminateProcess(process: NativePtr, exitCode: number): number;
    terminateJobObject(job: NativePtr, exitCode: number): number;
    getStdHandle(stdHandle: number): NativePtr;
}
/** Generic Win32 calls plus Node's libuv descriptor-to-handle bridge. */
export interface CurrentTokenProcessBindings extends Win32ProcessBindings {
    uvGetOsfhandle(fileDescriptor: number): NativePtr | null;
}
/** Koffi STARTUPINFOW layout. */
export declare const STARTUPINFOW: import("koffi").TypeObject;
/** Koffi PROCESS_INFORMATION layout. */
export declare const PROCESS_INFORMATION: import("koffi").TypeObject;
/**
 * Allocate a pointer-sized out-parameter slot.
 * @returns allocated native slot.
 */
export declare function allocPtrSlot(): NativePtr;
/**
 * Allocate a uint32 out-parameter slot.
 * @returns allocated native slot.
 */
export declare function allocUint32(): NativePtr;
/**
 * Decode a pointer out-parameter.
 * @param slot - pointer-sized slot filled by Win32.
 * @returns decoded pointer, or null for address zero.
 */
export declare function decodePtr(slot: NativePtr): NativePtr | null;
/**
 * Decode a uint32 out-parameter.
 * @param slot - uint32 slot filled by Win32.
 * @returns decoded unsigned value.
 */
export declare function decodeUint32(slot: NativePtr): number;
/**
 * Allocate a zeroed STARTUPINFOW.
 * @returns allocated struct pointer.
 */
export declare function allocStartupInfo(): NativePtr;
/**
 * Encode the stdio-bearing STARTUPINFOW fields.
 * @param startupInfo - allocated STARTUPINFOW pointer.
 * @param fields - fields required for inherited stdio.
 */
export declare function encodeStartupInfo(startupInfo: NativePtr, fields: StartupInfoInput): void;
/**
 * Allocate a zeroed PROCESS_INFORMATION.
 * @returns allocated struct pointer.
 */
export declare function allocProcessInfo(): NativePtr;
/**
 * Decode PROCESS_INFORMATION.
 * @param processInfo - struct pointer filled by CreateProcess.
 * @returns process/thread handles and ids.
 */
export declare function decodeProcessInfo(processInfo: NativePtr): ProcessInfoOutput;
/**
 * Extend the shared process table with caller-owned Win32 API families.
 * @param create - binds only the caller-specific operations from the shared libraries.
 * @returns generic process bindings combined with the caller-specific operations.
 */
export declare function extendWin32ProcessBindings<Extension extends object>(create: (context: Win32BindingContext) => Extension): CurrentTokenProcessBindings & Extension;
/**
 * Load the generic process binding table without policy-specific extensions.
 * @returns shared Win32 process, stdio, and Job operations.
 */
export declare function loadWin32ProcessBindings(): CurrentTokenProcessBindings;
/**
 * Format a Win32 error code through FormatMessageW.
 * @param api - active binding table.
 * @param win32Code - captured GetLastError value.
 * @returns trimmed system message, or an empty string when unavailable.
 */
export declare function errorText(api: Win32ProcessBindings, win32Code: number): string;
/**
 * Throw the current GetLastError value.
 * @param api - active binding table.
 * @param name - failing Win32 operation.
 * @param detail - optional operation context.
 * @returns never; always throws Win32Error.
 */
export declare function throwLastError(api: Win32ProcessBindings, name: string, detail?: string): never;
/**
 * Throw an explicitly captured Win32 error code.
 * @param api - active binding table.
 * @param name - failing Win32 operation.
 * @param win32Code - error captured before cleanup.
 * @param detail - optional operation context.
 * @returns never; always throws Win32Error.
 */
export declare function throwWin32(api: Win32ProcessBindings, name: string, win32Code: number, detail?: string): never;
export {};
//# sourceMappingURL=ffi.d.ts.map