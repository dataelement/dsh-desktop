/**
 * The escalation vocabulary and choreography shared by every sandbox-enforcing
 * tool family (`@deepseek-ai/dsh-tool-bash`, `@deepseek-ai/dsh-tool-fs`): the
 * strictly-wider ladder, the argument-pairing validation, the model-facing
 * denial/hint markers, and {@link approveEscalation} — the ordered fail-closed
 * sequence that resolves a `sandbox_permissions` request through a
 * user-approval channel BEFORE anything executes. One home keeps the two
 * families' approval ordering and verbatim error texts from drifting apart.
 *
 * The channel is a minimal STRUCTURAL function shape ({@link EscalationAsk}),
 * not the approval service type: the tool layer — which owns the agent, the
 * call id, and the tool name — closes over `ctx.approval.request(...)` and
 * hands the closure down, so this package never depends on the approval or
 * agent packages.
 *
 * @module dsh-sandbox/escalation
 */
import type { SandboxMode } from './index.ts';
/**
 * The strictly-wider table: what a call whose effective mode is the key may
 * escalate TO. Checked at EXECUTION, never baked into a tool schema — the
 * schema's enum is {@link ESCALATION_TARGETS}, because schemas are
 * registry-global while the effective mode is per-call truth.
 */
export declare const WIDER_MODES: Record<string, readonly SandboxMode[]>;
/**
 * The closed escalation-target vocabulary — every mode a call could ever
 * escalate TO (`read-only` is the floor; nothing escalates to it). Advertised
 * whenever the mounted capability confines: cutting the enum down to the modes
 * wider than the composition's DEFAULT would strand a session whose effective
 * mode sits below it (a `danger-full-access` default would advertise nothing
 * while a narrower-switched session stays confined with no lever).
 */
export declare const ESCALATION_TARGETS: readonly SandboxMode[];
/**
 * Validate the escalation argument pairing a tool schema cannot express:
 * `sandbox_permissions` and `justification` travel together — an approval
 * prompt without a reason, or a reason driving nothing, is a malformed ask —
 * and the justification must be a non-empty sentence.
 * @param sandboxPermissions - the raw `sandbox_permissions` argument, if given.
 * @param justification - the raw `justification` argument, if given.
 */
export declare function validateEscalationArgs(sandboxPermissions: string | undefined, justification: string | undefined): void;
/**
 * The model-facing denial marker — the one vocabulary both enforcing families
 * teach and report, so the model recognizes a policy denial identically
 * whether the kernel refused a bash file effect or the filesystem provider's
 * fence refused a mutation.
 * @param mode - the mode the denied call ran under.
 * @returns the marker line, exactly as the model sees it.
 */
export declare function sandboxDenialMarker(mode: SandboxMode): string;
/**
 * The same-turn escalation hint that rides a denial when the composition
 * advertises the escalation fields — the nudge lives at the decision point so
 * the sanctioned retry does not depend on the model recalling the tool
 * description.
 * @param subject - the family's noun for the denied action (`command` for
 *   bash, `operation` for a filesystem mutation).
 * @returns the hint line, exactly as the model sees it.
 */
export declare function escalationHintMarker(subject: string): string;
/**
 * The closed outcome vocabulary of one escalation ask — structurally identical
 * to the approval seam's `ApprovalOutcome` so an `ApprovalService.request`
 * return is assignable without this package importing it.
 */
export type EscalationOutcome = 'allowed-once' | 'rejected' | 'cancelled' | 'unavailable';
/**
 * The minimal approval-request shape {@link approveEscalation} needs —
 * structurally the approval seam's `ApprovalService`, generic over the agent
 * type `A` and call-id type `C` so this package resolves escalations through
 * `ctx.approval` without importing the approval or agent packages (the tool
 * layer infers `A`/`C` as its own `Agent`/`ToolCallId`).
 */
export interface EscalationApprover<A = object, C = string> {
    /**
     * Ask the human to approve one action, resolving to a closed outcome.
     * @param req - the audit-self-contained request (agent, tool, call id, reason, optional signal).
     * @returns the human's decision as a closed {@link EscalationOutcome}.
     */
    request(req: {
        agent: A;
        toolName: string;
        callId: C;
        reason: string;
        signal?: AbortSignal;
    }): Promise<EscalationOutcome>;
}
/**
 * The approval ingredients an escalating tool hands {@link approveEscalation}:
 * the approval requester (`ctx.approval`, or `undefined` when none is
 * composed), the calling agent (or `undefined` for an agent-less execution),
 * and the call's identity. The tool layer holds all of these; this package
 * only judges them.
 */
export interface EscalationApproval<A = object, C = string> {
    /** The approval requester (`ctx.approval`), or `undefined` when none is composed. */
    approver: EscalationApprover<A, C> | undefined;
    /** The calling agent, or `undefined` for an agent-less execution (fails closed). */
    agent: A | undefined;
    /** The tool-call id the approval prompt attaches to. */
    callId: C;
    /** The tool name recorded on the approval request. */
    toolName: string;
    /** The tool-execution abort signal the approval request rides, when present. */
    signal?: AbortSignal;
}
/** One escalation request, as {@link approveEscalation} judges it. */
export interface EscalationRequest {
    /** The requested target mode (schema-pinned to {@link ESCALATION_TARGETS} when advertised). */
    requestedMode: string;
    /** The model's one-sentence reason, shown verbatim to the user inside the audit reason. */
    justification: string;
    /** The call's effective mode (session override ?? composition default) the request must strictly widen. */
    effectiveMode: SandboxMode;
    /** The family's noun for the escalated action in user-facing texts (`command` for bash, `operation` for fs). */
    subject: string;
}
/**
 * Resolve a sandbox-escalation request BEFORE anything executes: check strict
 * widening against the call's effective mode, then resolve the approval
 * channel, then map every outcome — the ordered fail-closed sequence both
 * enforcing families share. Returns the granted mode to stamp onto exactly
 * this call; throws the distinct verbatim text for every other path (a
 * non-widening request, a missing approval service, an agent-less execution,
 * a rejection, a cancellation, an unanswerable ask) — the tool registry turns
 * the throw into the call's isError result, and nothing has run. A
 * non-widening request never prompts a human.
 * @param request - the escalation to judge (see {@link EscalationRequest}).
 * @param approval - the approval ingredients the tool holds (see {@link EscalationApproval}).
 * @returns the granted mode, consumed by the one call that asked.
 */
export declare function approveEscalation<A, C>(request: EscalationRequest, approval: EscalationApproval<A, C>): Promise<SandboxMode>;
//# sourceMappingURL=escalation.d.ts.map