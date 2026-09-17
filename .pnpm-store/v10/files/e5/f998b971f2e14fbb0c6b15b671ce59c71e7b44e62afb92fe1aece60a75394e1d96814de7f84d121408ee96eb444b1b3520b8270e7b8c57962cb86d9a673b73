/**
 * PATH probe for the native backend's Linux chooser binaries: one boot-time
 * sampled fact for the resolver, so an attended Linux host without
 * zenity/kdialog keeps the working `browse` interaction instead of a backend
 * whose every pick fails.
 * @module @deepseek-ai/dsh-host-directory-picker-auto/probe
 */
/**
 * Whether the current process may execute the candidate path.
 * @param candidate - absolute or PATH-joined file path.
 * @returns true only for an existing executable file.
 */
export declare function canExecute(candidate: string): boolean;
/**
 * Scan a PATH value for one of the native backend's Linux chooser binaries.
 * @param pathValue - the `PATH` environment value (absent or empty scans nothing).
 * @param isExecutable - executability predicate ({@link canExecute} in production; injected for deterministic tests).
 * @returns whether any PATH directory holds an executable chooser binary.
 */
export declare function hasLinuxChooserBinary(pathValue: string | undefined, isExecutable: (candidate: string) => boolean): boolean;
//# sourceMappingURL=probe.d.ts.map