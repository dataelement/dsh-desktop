/** Cross-platform native single-directory chooser behind the native backend's capability. */
import { type NativeCommandRunner } from '@deepseek-ai/dsh-native-command';
/** Testable command boundary; native implementations never invoke a shell. */
export type DirectoryPickerRunner = NativeCommandRunner;
/** Injectable platform facts for deterministic adapter tests. */
export interface DirectoryPickerInternals {
    platform?: NodeJS.Platform;
    run?: DirectoryPickerRunner;
    /** Replaces the in-process Win32 dialog (`pickWin32Directory`) for deterministic tests. */
    pickWin32Dialog?: (signal: AbortSignal) => Promise<string | null>;
}
/**
 * Open the platform directory picker.
 * @param signal - caller/connection lifetime; abort terminates the native command.
 * @param internals - Platform and runner hooks for deterministic tests.
 * @returns the selected path, or null when the user cancels.
 */
export declare function pickNativeDirectory(signal: AbortSignal, internals?: DirectoryPickerInternals): Promise<string | null>;
//# sourceMappingURL=native-picker.d.ts.map