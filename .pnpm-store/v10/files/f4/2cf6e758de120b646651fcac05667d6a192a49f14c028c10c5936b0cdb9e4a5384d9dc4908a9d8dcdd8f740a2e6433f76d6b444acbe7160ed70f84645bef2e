/** Current process range and finalized answer boundary derived from one Turn. */
export interface TurnProcessSpec {
    readonly turn: number;
    /** Stable control-node anchor source, including currently ineligible evidence. */
    readonly controlAnchorSeq: number;
    readonly processStartSeq: number;
    readonly answerAnchorSeq: number | null;
    readonly answerStep: number | null;
    readonly inlineReasoning: boolean;
    /** Reply-bearing durable Assistant messages before the final answer. */
    readonly messageCount: number;
    /** Durable non-subagent Tool calls recorded by this Turn. */
    readonly toolCallCount: number;
    /** Tool calls whose configured name identifies a subagent delegation. */
    readonly subagentCount: number;
}
/** Chat Node kinds that remain independent of a Turn's process disclosure. */
export declare const TURN_PROCESS_INDEPENDENT_KINDS: ReadonlySet<string>;
/**
 * Compare immutable Turn-process specifications by their published fields.
 * @param left - previous specification.
 * @param right - next specification.
 * @returns whether both values describe the same process presentation.
 */
export declare function sameTurnProcessSpec(left: TurnProcessSpec, right: TurnProcessSpec): boolean;
/**
 * Recognize the shipped subagent delegation name and its configured variants.
 * Control tools use distinct names such as `send_message` and `list_agents`.
 * @param name - durable Tool-call name.
 * @returns whether the call creates or forks a subagent.
 */
export declare function isSubagentDelegationTool(name: string): boolean;
//# sourceMappingURL=turn-process.d.ts.map