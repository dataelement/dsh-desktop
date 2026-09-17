/**
 * Table of hdiutil error codes that are transient and can be retried.
 * These codes are typically related to resource availability or temporary issues.
 *
| Code    | Meaning                          | Why Retry?                                           |
| ------- | -------------------------------- | ---------------------------------------------------- |
| `1`     | Generic error                    | Can occur from brief race conditions or temp issues. |
| `16`    | **Resource busy**                | Volume is in use — wait and retry often works.       |
| `35`    | **Operation timed out**          | System delay or timeout — retry after a short delay. |
| `256`   | Volume in use or unmount failure | Same as 16 — usually resolves after retry.           |
| `49153` | Volume not mounted yet           | Attach may be too fast — retry after delay.          |
| `-5341` | Disk image too small             | Retry *after fixing* with a larger `-size`.          |
| `-5342` | Specified size too small         | Same as above — retry if size is corrected.          |
 *
 */
export declare const hdiutilTransientExitCodes: Set<number>;
export declare function explainHdiutilError(errorCode: number): string;
export declare function hdiUtil(args: string[]): Promise<string | null>;
export declare function hdiUtilWithStdin(args: string[], stdin: string): Promise<string | null>;
