/** Parent-side invocation and bootstrap state for the private native runner. */
import type { StdioOptions } from 'node:child_process';
import type { SubprocessSpawnSpec } from '@deepseek-ai/dsh-subprocess';
/** The one private environment variable consumed before target state is restored. */
export declare const SUBPROCESS_RUNNER_ENV: "DSH_SUBPROCESS_RUNNER";
/** Sentinel used by the packaged bootstrap for the Windows IPC runner. */
export declare const WINDOWS_RUNNER_SELECTION: "windows";
/** Non-empty command tuple used to launch the private runner entry. */
export type RunnerInvocation = [string, ...string[]];
/**
 * Resolve the source, built, or packaged entry that calls the same runner core.
 * @returns executable and arguments for the active runtime form.
 */
export declare function spawnRunnerInvocation(): RunnerInvocation;
/**
 * Check the concrete runner executable and entry paths without executing a probe mode.
 * @param invocation - resolved executable and runner-entry arguments.
 * @returns whether every concrete executable or entry path is accessible.
 */
export declare function runnerInvocationAvailable(invocation?: RunnerInvocation): boolean;
/**
 * Build the bootstrap-safe environment; target overrides arrive through request/IPC.
 * @param selection - private runner selector or Linux launch-request locator.
 * @param invocation - resolved runner invocation whose source form needs the workspace paths map.
 * @returns environment for the runner before target state is restored.
 */
export declare function runnerEnvironment(selection: string, invocation?: RunnerInvocation): NodeJS.ProcessEnv;
/**
 * Read and delete the private selector before importing or restoring target state.
 * @param env - mutable environment containing the private selector.
 * @returns the consumed selector, or undefined when no runner was requested.
 */
export declare function consumeRunnerSelection(env?: NodeJS.ProcessEnv): string | undefined;
/**
 * Require the private argv delimiter and at least one target argv entry.
 * @param argv - private runner arguments.
 * @returns copied target argv after the private delimiter.
 */
export declare function parseRunnerTargetArgv(argv: readonly string[]): string[];
/**
 * Build direct Linux target stdio, or isolated Windows runner stdio with IPC
 * on fd 3 and target carriers on fd 4 through fd 6.
 * @param spec - ordinary subprocess request whose stdio modes are preserved.
 * @param ipc - whether to isolate the runner and add its private Node IPC descriptor.
 * @param stdinCarrier - runner fd 4 carrier; Windows ignore passes an opened null-device fd.
 * @returns child-process stdio options for the runner.
 */
export declare function runnerStdio(spec: SubprocessSpawnSpec, ipc: boolean, stdinCarrier?: 'pipe' | number): StdioOptions;
/**
 * Resolve the executable path with libuv/Node Windows spawn search order while
 * preserving the caller's original command-line argv entry separately.
 * @param command - original target argv[0].
 * @param cwd - final target working directory used for relative search roots.
 * @param env - final target environment containing the child PATH.
 * @param exists - injectable non-directory candidate probe used by tests.
 * @param currentEnv - runner environment supplying PATH fallback and cwd-search policy.
 * @returns a resolved application name suitable for `CreateProcessW`, or undefined when no candidate exists.
 */
export declare function resolveWindowsExecutable(command: string, cwd: string, env: Readonly<Record<string, string>>, exists?: (candidate: string) => boolean, currentEnv?: Readonly<Record<string, string | undefined>>): string | undefined;
/**
 * Materialize and synchronously validate the final target environment.
 * @param spec - final target argv, cwd, and environment overrides.
 * @returns complete target environment after Node-equivalent validation.
 */
export declare function targetEnvironment(spec: Pick<SubprocessSpawnSpec, 'argv' | 'cwd' | 'env'>): Record<string, string>;
//# sourceMappingURL=runner-launch.d.ts.map