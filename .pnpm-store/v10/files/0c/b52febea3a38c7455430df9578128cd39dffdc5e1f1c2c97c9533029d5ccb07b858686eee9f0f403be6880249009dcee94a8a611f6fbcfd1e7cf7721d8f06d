/** Windows parent-side launch and ownership for the private Job runner. */
import { spawn } from 'node:child_process';
import type { SubprocessSpawnSpec } from '@deepseek-ai/dsh-subprocess';
import { loadWin32ProcessBindings, probeCurrentTokenJobSupport } from '@deepseek-ai/dsh-win32-process';
import type { ManagedProcessLaunch } from './managed-owner.ts';
import type { RunnerInvocation } from './runner-launch.ts';
/** Test seams for runner launch and dynamic capability checks. */
export interface WindowsJobInternals {
    spawn?: typeof spawn;
    runnerInvocation?: RunnerInvocation;
    resolveRunnerInvocation?: () => RunnerInvocation;
    runnerAvailable?: (invocation: RunnerInvocation) => boolean;
    loadWin32ProcessBindings?: typeof loadWin32ProcessBindings;
    probeCurrentTokenJobSupport?: typeof probeCurrentTokenJobSupport;
}
/**
 * Re-check the runner entry, bindings, and current Job capability for every spawn.
 * @param internals - optional runner and Win32 capability seams used by tests.
 * @returns whether the Windows native containment path is currently available.
 */
export declare function probeWindowsJob(internals?: WindowsJobInternals): boolean;
/**
 * Launch one target through a runner that uniquely owns its Job handle.
 * @param spec - ordinary target request.
 * @param targetEnv - validated complete target environment.
 * @param internals - optional runner launch seams used by tests.
 * @returns direct streams, result, and runner-owned managed range.
 */
export declare function launchWindowsJob(spec: SubprocessSpawnSpec, targetEnv: Record<string, string>, internals?: WindowsJobInternals): ManagedProcessLaunch;
//# sourceMappingURL=windows-job.d.ts.map