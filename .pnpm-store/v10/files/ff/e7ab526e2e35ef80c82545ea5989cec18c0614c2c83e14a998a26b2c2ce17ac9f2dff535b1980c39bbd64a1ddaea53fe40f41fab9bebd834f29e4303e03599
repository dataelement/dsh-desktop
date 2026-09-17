import type { TurnTailOwnerProps } from '@deepseek-ai/dsh-client-ui-chat/client';
import type { ConversationNodeDefinition } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { MarkdownFileMentions } from '@deepseek-ai/dsh-client-ui-primitives';
import type { PresentedFile } from '@deepseek-ai/dsh-tool-present/types';
/** A declared file with its authorized open coordinates. */
export interface PresentedPath extends PresentedFile {
    readonly seq: number;
    readonly index: number;
}
interface ProducedPath {
    readonly seq: number;
    readonly path: string;
}
/** Immutable produced-file facts published against one Turn. */
export interface DeliverablesTurnData {
    readonly produced: readonly ProducedPath[];
    readonly presented?: readonly PresentedPath[];
}
declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
    interface ConversationTurnDataMap {
        /** Successful mutation paths accumulated in this Turn. */
        deliverables: DeliverablesTurnData;
    }
}
interface DeliverablesState extends DeliverablesTurnData {
    readonly turn: number;
    readonly calls: ReadonlyMap<string, string | null>;
}
/**
 * Files produced by one Turn data value.
 *
 * The source is the arguments of successful `write`, `edit`, and mutating
 * `str_replace_editor` calls, not the closing prose: a produced file must be
 * listed whether or not the model remembered to name it. Reads, unsupported
 * tools, malformed calls, and failed results contribute nothing. Paths keep
 * first-seen order and appear once, so a file written and then edited in the
 * same turn is one entry.
 *
 * The Conversation Location index owns turn membership before this function
 * runs, so paths cannot spill across turns and this derivation does not infer
 * boundaries from neighboring presentation Nodes.
 * @param data - engine-published Deliverables data for one Turn.
 * @param seq - closing Assistant seq; later Tool settlements are excluded.
 * @returns Produced paths in first-seen order; empty when the turn wrote nothing.
 */
export declare function producedForClosing(data: Readonly<DeliverablesTurnData> | undefined, seq?: number): readonly string[];
/**
 * Claim the turn-tail chain only when its closing turn produced files.
 * @param owner - Turn-tail owner currency for the closing assistant.
 * @returns Produced paths as the component's match, or null to decline before mount.
 */
export declare function selectProducedFiles(owner: TurnTailOwnerProps): readonly string[] | null;
/** Turn-local successful mutation accumulator; it publishes no view Node. */
export declare const deliverablesDefinition: ConversationNodeDefinition<DeliverablesState>;
/**
 * Select the latest declaration of each path before the closing reply.
 * @param owner - closing turn and sequence.
 * @returns replayable deliveries in first-seen path order.
 */
export declare function presentedForClosing(owner: TurnTailOwnerProps): PresentedPath[];
export { basename } from '../presented.ts';
/**
 * File-mention vocabulary over one turn's produced paths, for the closing
 * message's prose: an inline-code token opens the file it names. A token
 * resolves by exact path, or by being exactly the basename of exactly one
 * produced path — a basename two paths share stays inert rather than
 * guessing, so a mention link can never open the wrong file or 404.
 * @param paths - The turn's produced paths (tool order, already deduped).
 * @param openFile - The chat view's file opener.
 * @param label - Localizes the accessible open-label for a resolved path.
 * @returns The resolver MarkdownText consumes; the full path rides `title`,
 * the same disambiguator the row's chips carry.
 */
export declare function producedFileMentions(paths: readonly string[], openFile: (path: string) => void, label: (path: string) => string): MarkdownFileMentions;
//# sourceMappingURL=turn-deliverables.d.ts.map