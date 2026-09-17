/**
 * Local Service Provider for the subprocess capability seam. Each spawn owns a
 * platform-selected managed range with the spec's per-stream stdio dispositions.
 * Normal disposal terminates and joins live ranges; Node's synchronous exit
 * phase force-stops any ranges the service still owns. It has no config: every
 * disposition and limit arrives on the spec, so deployment-varying choices
 * stay with the caller's config (the bash executor's, the LSP host's, …).
 * @module @deepseek-ai/dsh-subprocess-local
 */
import { Context } from '@deepseek-ai/cordis';
import { SubprocessRuntime } from '@deepseek-ai/dsh-subprocess';
import type { SubprocessHandle, SubprocessSpawnSpec, SubprocessTerminalHandle, SubprocessTerminalSpawnSpec } from '@deepseek-ai/dsh-subprocess';
import type { SpawnInternals } from './spawn.ts';
import type { ProcessInspector } from './process-inspector.ts';
/**
 * Local subprocess service: platform-selected managed ranges, Node-shaped stdio
 * dispositions (raw pipes, inherit, bounded tail-keep collection with spill
 * files), credential-scrubbed environment, and provider-owned range signalling.
 * POSIX paths stage TERM before KILL; Windows paths terminate immediately.
 * JavaScript-observable host exit also performs synchronous final termination.
 */
export declare class LocalSubprocessRuntime extends SubprocessRuntime {
    /** Live handles retained for normal disposal and synchronous host-exit finalization. */
    private live;
    /** Live terminals retained through normal quiescence or host-exit finalization. */
    private terminals;
    /** Test hook: process, spill, and platform operations forwarded to spawnSubprocess. */
    internals: SpawnInternals;
    /** Provider-lifetime latch suppressing repeated weaker-containment warnings. */
    private fallbackWarningIssued;
    /** Positive-only cache for the expensive Linux bootstrap and scope probe. */
    private linuxDeepProbePassed;
    /** Test hook for platform process inspection; production resolves lazily on terminal spawn. */
    terminalInspector: ProcessInspector | undefined;
    constructor(ctx: Context);
    private terminateForHostExit;
    private disposeManagedProcesses;
    resolveExecutable(command: string, env?: Readonly<Record<string, string>>, signal?: AbortSignal): Promise<string>;
    private executableCandidates;
    spawn(spec: SubprocessSpawnSpec): SubprocessHandle;
    private selectContainmentMode;
    private warnFallback;
    spawnTerminal(spec: SubprocessTerminalSpawnSpec): Promise<SubprocessTerminalHandle>;
}
export default LocalSubprocessRuntime;
//# sourceMappingURL=index.d.ts.map