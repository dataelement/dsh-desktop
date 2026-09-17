/**
 * Windows security-descriptor helpers for atomic local-file replacement. Koffi loads lazily so
 * non-Windows processes never open Win32 libraries.
 * @module @deepseek-ai/dsh-fs-local/win32
 */
/**
 * Read a file's self-relative DACL security descriptor.
 * @param path - existing file whose DACL is read.
 * @returns a descriptor buffer accepted by `SetFileSecurityW`.
 */
export declare function readFileDaclWin32(path: string): Promise<Buffer>;
/**
 * Copy an existing file's DACL onto another file and protect it from staging-parent inheritance.
 * The destination must still be empty when confidentiality depends on this call.
 * @param source - existing file whose DACL is copied.
 * @param destination - existing file that receives the protected DACL.
 */
export declare function copyFileDaclWin32(source: string, destination: string): Promise<void>;
/**
 * Replace a Windows file while preserving the replaced file's ACL and other replace metadata.
 * @param replaced - existing destination file.
 * @param replacement - closed staging file on the same volume.
 */
export declare function replaceFileWin32(replaced: string, replacement: string): Promise<void>;
//# sourceMappingURL=win32.d.ts.map