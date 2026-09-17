import type { ChatNode } from '../contract/chat-nodes.ts';
import type { ChatLocationNodeIndex, ChatNodeStore, ChatTurnProcessPresentation } from '../contract/snapshot.ts';
/** Mutable projection of cross-Node process layout facts by Turn. */
export declare class ChatTurnProcessProjector {
    private presentations;
    /**
     * Read the retained process presentation for a Node's Turn.
     * @param node - Current Chat Node.
     * @returns The Turn's process presentation, when present.
     */
    get(node: ChatNode | undefined): ChatTurnProcessPresentation | undefined;
    /**
     * Replace every projected Turn.
     * @param order - visible Chat Node order.
     * @param locations - current Chat Location index.
     * @param nodes - current Chat Node store.
     * @returns Turns whose process presentation changed.
     */
    replace(order: readonly string[], locations: ChatLocationNodeIndex, nodes: ChatNodeStore): ReadonlySet<number>;
    /**
     * Recompute selected Turns after incremental Node changes.
     * @param turns - affected Turn numbers.
     * @param locations - current Chat Location index.
     * @param nodes - current Chat Node store.
     * @returns Turns whose process presentation changed.
     */
    update(turns: ReadonlySet<number>, locations: ChatLocationNodeIndex, nodes: ChatNodeStore): ReadonlySet<number>;
    private set;
}
//# sourceMappingURL=turn-process-presentation.d.ts.map