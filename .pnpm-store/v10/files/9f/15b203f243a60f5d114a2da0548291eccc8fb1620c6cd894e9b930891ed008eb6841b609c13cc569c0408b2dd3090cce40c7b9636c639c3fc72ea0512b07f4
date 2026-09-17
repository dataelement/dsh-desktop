/**
 * Shared no-shell `execFile` runner for host-native OS integrations.
 * @module @deepseek-ai/dsh-native-command/runner
 */
/** Testable command boundary; native implementations never invoke a shell. */
export type NativeCommandRunner = (command: string, args: readonly string[], signal: AbortSignal) => Promise<{
    stdout: string;
    stderr: string;
}>;
/**
 * Run a host command with utf8 stdio, abort propagation, and Windows hide.
 * @param command - executable path or PATH name.
 * @param args - argv (never a shell string).
 * @param signal - caller/connection lifetime; abort terminates the child.
 * @returns captured stdout/stderr on exit 0.
 */
export declare const runNativeCommand: NativeCommandRunner;
//# sourceMappingURL=runner.d.ts.map