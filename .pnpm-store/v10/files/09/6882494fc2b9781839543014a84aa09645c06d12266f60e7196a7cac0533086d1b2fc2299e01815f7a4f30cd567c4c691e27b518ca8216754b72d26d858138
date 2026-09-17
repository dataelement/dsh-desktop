/**
 * The sandbox-escalation API shared by the `write` and `edit` tools: the
 * per-call policy resolution, the advertised escalation fields, and the denial-marker
 * mapping — all delegating the vocabulary and the fail-closed approval
 * sequence to `@deepseek-ai/dsh-sandbox` (the same pieces `@deepseek-ai/dsh-tool-bash`
 * uses), so bash and fs escalate identically. Built ONCE per plugin from
 * `ctx.fs.sandboxMode` (the capability fact — is a confining backend mounted?)
 * and shared by both mutating tools.
 *
 * @module @deepseek-ai/dsh-tool-fs/sandbox
 */
import type { Context } from '@deepseek-ai/cordis';
import type { ToolExecution } from '@deepseek-ai/dsh-tools';
import type { SandboxExecutionPolicy, SandboxMode } from '@deepseek-ai/dsh-sandbox';
/** The two escalation arguments a mutating tool may carry (advertised only under a confining backend). */
export interface FsEscalationArgs {
    sandbox_permissions?: string;
    justification?: string;
}
/** The schema fields for the escalation arguments, spread into a tool's `parameters` when a confining backend is mounted. */
export interface EscalationSchemaFields {
    sandbox_permissions: {
        type: 'string';
        enum: string[];
        description: string;
    };
    justification: {
        type: 'string';
        description: string;
    };
}
/**
 * The filesystem escalation API: advertisement gating, per-call policy
 * resolution, the one-approved wider retry, and denial-marker mapping. A pure
 * product of `ctx` at plugin apply time.
 */
export declare class FsSandboxController {
    private readonly ctx;
    /** The escalation targets this composition advertises (`[]` when no confining backend is mounted). */
    readonly escalationModes: readonly SandboxMode[];
    /** Shared per-session policy resolver, required by a confining backend. */
    private readonly policy;
    constructor(ctx: Context);
    /**
     * The escalation schema fields for a mutating tool's `parameters`. Call it
     * only under a confining backend (guard on {@link escalationModes}); the
     * enum pins the closed target vocabulary, the strict-wider check happens per
     * call at execution.
     * @returns the two escalation parameter specs.
     */
    schemaFields(): EscalationSchemaFields;
    /**
     * The policy to stamp onto this mutation: an approved escalation grant (a
     * strictly wider retry resolved through `ctx.approval` before anything
     * executes), else the session's standing mode. The calling session's cwd is
     * always carried as the workspace root. Validates the escalation argument
     * pairing first.
     * @param toolName - the mutating tool's name, for the approval audit trail.
     * @param args - the call's escalation arguments.
     * @param exec - the tool-execution context (agent, callId, signal).
     * @returns the policy to pass to the mutation, or undefined for an
     *   unsandboxed backend.
     */
    resolvePolicy(toolName: string, args: FsEscalationArgs, exec: ToolExecution): Promise<SandboxExecutionPolicy | undefined>;
    /**
     * Map a thrown provider error for the model: a `FS_SANDBOX_DENIED` becomes a
     * `FsError` whose text is the shared `[sandbox: …]` denial marker plus the
     * same-turn escalation hint, so a policy denial reads identically to bash's
     * WHILE keeping the structured `FS_SANDBOX_DENIED` code — `ToolRuntime`
     * populates `result.error` only for `HarnessError` instances, so a plain
     * `Error` would strip the code retry/observers key off. Any other error
     * passes through unchanged. A `FS_SANDBOX_DENIED` only arises under a
     * confining backend, which always advertises the escalation fields, so the
     * hint always applies here.
     * @param error - the error thrown by the mutation.
     * @param policy - the policy stamped onto the call (names the mode in the marker).
     * @returns the error to throw — the marker `FsError` for a sandbox denial, else the original.
     */
    mapError(error: unknown, policy: SandboxExecutionPolicy | undefined): unknown;
}
//# sourceMappingURL=sandbox.d.ts.map