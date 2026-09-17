import type { SessionEvent } from '@deepseek-ai/dsh-session/types';
import type { CommandId } from '@deepseek-ai/dsh-commands/brand';
import type { ConversationNodeDefinition } from '@deepseek-ai/dsh-client-ui-conversation/client';
/** The command name whose runs this projection owns. */
export declare const GOAL_COMMAND = "goal";
/** Goal-owned human command input projected independently of model messages. */
export interface GoalCommandInputData {
    readonly commandId: CommandId;
    readonly text: string;
    readonly time: number;
}
declare module '@deepseek-ai/dsh-client-ui-chat/client' {
    interface ChatNodeDataMap {
        /** Human-entered `/goal` command input. */
        'command-input': GoalCommandInputData;
    }
}
interface GoalCommandInputState extends GoalCommandInputData {
    readonly seq: number;
}
/**
 * Derive the visible command line from its structured durable run.
 * @param event - `/goal` command run.
 * @returns command text with trailing parser whitespace removed.
 */
export declare function goalCommandText(event: SessionEvent<'command/run'>): string;
/** Goal-owned command input projection; the generic command Definition retains the result row. */
export declare const goalCommandInputDefinition: ConversationNodeDefinition<GoalCommandInputState>;
export {};
//# sourceMappingURL=goal-command-input.d.ts.map