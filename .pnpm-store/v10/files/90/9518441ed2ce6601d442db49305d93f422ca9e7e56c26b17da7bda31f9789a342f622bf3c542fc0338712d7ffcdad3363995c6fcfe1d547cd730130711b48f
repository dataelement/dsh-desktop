/** Model-visible wrap-up instruction for a terminal autonomous goal update. */
import type { ContentBlock } from '@deepseek-ai/dsh-llm';
/**
 * Render the closing-message instruction injected after an autonomous goal
 * round reports `complete` or `blocked`, replacing the former hard turn stop
 * so the model still addresses the user once before the turn ends.
 * @param objective - the terminal goal's objective, echoed for grounding.
 * @param blockedReason - the validated report for `blocked`; omitted for `complete`.
 * @returns a fresh one-block context for `ToolRunContext.deferContext()`.
 */
export declare function renderWrapupContext(objective: string, blockedReason?: string): ContentBlock[];
//# sourceMappingURL=wrapup.d.ts.map