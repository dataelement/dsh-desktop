/**
 * The sandbox POLICY home (`ctx.sandboxPolicy`): the single owner of the
 * deployment's sandbox fallbacks plus per-session resolution: the file-effect
 * {@link SandboxMode}, the `workspace-write` root, and the override kit (the
 * `sandbox/mode` event, its fold, and its write path; the fold is the
 * `sandboxMode` session-projection unit registered here, while the event and
 * write path come from `./session-mode.ts`).
 * Before each agent request, the owner also contributes the resolved policy to
 * the cache-safe runtime-context snapshot. The agent loop logs that snapshot as
 * model history, so replay reconstructs the same mode and root the enforcing
 * consumers resolve without rewriting the stable system prompt.
 *
 * Enforcing filesystem, one-shot bash, and terminal backends read the SAME
 * resolved policy here. The context describes that policy without inventorying
 * capabilities, while each backend retains its own enforcement dialect and each
 * tool owns its operation-specific denial and escalation guidance. The service
 * reads session state once at each operation boundary; executors and providers
 * remain session-free.
 *
 * @module @deepseek-ai/dsh-sandbox-policy
 */
import { Context, Service } from '@deepseek-ai/cordis';
import { z as zod } from 'zod';
import z from '@deepseek-ai/schemastery';
import { type SandboxExecutionPolicy, type SandboxMode } from '@deepseek-ai/dsh-sandbox';
import type { Session } from '@deepseek-ai/dsh-session';
export { SANDBOX_MODES, setSandboxMode } from './session-mode.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        sandboxPolicy: SandboxPolicyService;
    }
}
/**
 * Plugin config: the deployment's sandbox default. All optional — `Config`
 * supplies the defaults (`mode: 'read-only'` is the fail-safe default; a
 * deployment that wants a workspace-writable agent opts in explicitly). The
 * runner choice is NOT here (it is the `ctx.sandbox` provider's config), nor
 * is any per-family knob: this is the one shared policy home.
 */
export interface Config {
    /** File-sandbox mode a session starts from (default: `read-only`). */
    mode?: SandboxMode;
    /**
     * Fallback root for agentless calls and sessions without a cwd (default:
     * `process.cwd()`). Normal agent calls use their session cwd instead.
     */
    workspaceRoot?: string;
}
/** Inputs that select the sandbox policy for one capability call. */
export interface SandboxPolicyRequest {
    /** Calling session; its immutable cwd becomes the workspace boundary. */
    session?: Session;
    /** Explicit approved mode override, which outranks session policy. */
    mode?: SandboxMode;
}
/** The sandbox-mode projection's state schema (state equals the public shape). */
declare const sandboxModeStateSchema: zod.ZodNullable<zod.ZodUnion<readonly [zod.ZodLiteral<"read-only">, zod.ZodLiteral<"workspace-write">, zod.ZodLiteral<"danger-full-access">]>>;
type SandboxModeState = zod.infer<typeof sandboxModeStateSchema>;
declare module '@deepseek-ai/dsh-session-projection/types' {
    interface SessionProjectionStateMap {
        /** Last logged sandbox-mode override, or null before one (deployment default applies at resolve time). */
        sandboxMode: SandboxModeState;
    }
}
/**
 * The sandbox-policy service (`ctx.sandboxPolicy`). Owns the deployment
 * default mode, fallback workspace root, and current request-time policy
 * section. Tool layers call {@link resolve} for each execution so a session's
 * mode log and immutable cwd travel together to every enforcing capability.
 */
export declare class SandboxPolicyService extends Service {
    static Config: z<Config>;
    static inject: string[];
    /** The deployment default mode — the fallback beneath a session override. */
    readonly defaultMode: SandboxMode;
    /** The absolute `workspace-write` fallback root for calls without a session cwd. */
    readonly workspaceRoot: string;
    constructor(ctx: Context, config: Config);
    /**
     * Resolve the complete policy for one capability call. An approved explicit
     * mode outranks the session's last `sandbox/mode` event, which outranks the
     * deployment default. A session cwd is its workspace-write boundary; the
     * configured root is the fallback for agentless calls and sessions without a
     * cwd.
     * @param request - optional session and approved mode override.
     * @returns the fully resolved per-call mode and absolute workspace root.
     */
    resolve(request?: SandboxPolicyRequest): SandboxExecutionPolicy;
    /**
     * Read the session override without applying the deployment default.
     * @param session - session whose log supplies the override.
     * @returns the last logged mode, or `undefined` without one.
     */
    overrideOf(session: Session): SandboxMode | undefined;
}
export default SandboxPolicyService;
//# sourceMappingURL=index.d.ts.map