import type { Defines } from "./Defines";
/**
 * Validates makensis stdout/stderr after a zero-exit run.
 *
 * NSIS can emit "Error:" lines on stderr and still exit 0 (e.g. disk-full
 * scenarios where the OS silently drops writes). Also checks the
 * "Install data: <written> / <expected> bytes" progress line for truncation.
 */
export declare function checkMakensisOutput(stdout: string, stderr: string): void;
/**
 * Verifies the generated installer is at least as large as the sum of the
 * embedded archive(s). An installer smaller than its payload is definitively
 * truncated regardless of the makensis exit code.
 *
 * Only runs when APP_64/APP_32/APP_ARM64 defines are present (i.e. normal,
 * non-portable installers). Skipped for the intermediate uninstaller build.
 */
export declare function verifyInstallerSize(outFile: string, defines: Defines): Promise<void>;
