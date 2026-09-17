/** One-shot Linux exec bootstrap and Windows Job-owning subprocess runner. */
import { closeHandleChecked, isJobEmpty, pollProcessExit, spawnCurrentTokenJobProcess, terminateJob } from '@deepseek-ai/dsh-win32-process';
import type { CurrentTokenProcessBindings } from '@deepseek-ai/dsh-win32-process';
import { resolveWindowsExecutable } from './runner-launch.ts';
type RunnerHost = Pick<NodeJS.Process, 'env' | 'exitCode' | 'connected' | 'cwd' | 'chdir' | 'on' | 'off' | 'once' | 'disconnect'> & {
    send?: NodeJS.Process['send'];
};
/** Injectable operations used by the protocol-owner tests. */
export interface SpawnRunnerInternals {
    execve(file: string, argv: string[], env: Record<string, string>): never;
    loadWin32ProcessBindings(): CurrentTokenProcessBindings;
    spawnCurrentTokenJobProcess: typeof spawnCurrentTokenJobProcess;
    closeFileDescriptor(fileDescriptor: number): void;
    resolveWindowsExecutable: typeof resolveWindowsExecutable;
    pollProcessExit: typeof pollProcessExit;
    isJobEmpty: typeof isJobEmpty;
    terminateJob: typeof terminateJob;
    closeHandleChecked: typeof closeHandleChecked;
}
/**
 * Execute the selected Linux bootstrap or Windows Job runner.
 * @param selection - Windows sentinel or Linux launch-request locator.
 * @param argv - private runner arguments beginning with the target delimiter.
 * @param host - process transport and lifecycle host.
 * @param internals - native and filesystem operations used by the runner.
 */
export declare function runSpawnRunner(selection: string, argv: readonly string[], host?: RunnerHost, internals?: SpawnRunnerInternals): Promise<void>;
/**
 * Best-effort reporting for failures before the selected runner established its owner.
 * @param selection - Windows sentinel, Linux launch-request locator, or no selection.
 * @param error - failure raised before normal runner settlement.
 * @param host - process transport and lifecycle host.
 */
export declare function reportSpawnRunnerFailure(selection: string | undefined, error: unknown, host?: RunnerHost): Promise<void>;
export {};
//# sourceMappingURL=spawn-runner.d.ts.map