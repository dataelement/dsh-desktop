/** Chat-owned approval detail resolving a correlated Tool call's command. */
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
interface ApprovalToolCall {
    readonly callId: string;
    readonly argsRaw: string;
}
/**
 * Extract a shell command from a correlated Tool call when its arguments carry one.
 * @param call - Tool call arguments, when a correlated call exists.
 * @returns command text, or undefined for absent, malformed, or unrelated arguments.
 */
export declare function commandOf(call: ApprovalToolCall | undefined): string | undefined;
/**
 * Render the command of the Chat Tool node correlated with an approval.
 * @param props - Approval identity and Session-standard Chat selector hook.
 * @returns command text when the correlated call carries one.
 */
export declare function ApprovalCommand({ callId, useChat }: PropsRuntime<'conversation.approval.detail'>): string | null;
export {};
//# sourceMappingURL=ApprovalCommand.d.ts.map