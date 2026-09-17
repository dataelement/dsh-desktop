import type { ChatLocationNodeIndex, ChatNodeStore, TurnNavigationItem } from '../contract/snapshot.ts';
/**
 * Whether two items carry the same rail state, so the reader can keep its array.
 * @param left - previously published item, when the Turn had one.
 * @param right - freshly derived item, when the Turn still has one.
 * @returns whether both sides describe the same mark.
 */
export declare function sameTurnNavigationItem(left: TurnNavigationItem | undefined, right: TurnNavigationItem | undefined): boolean;
/**
 * Project one loaded Turn into its rail item.
 * @param turn - Turn number the item addresses.
 * @param locations - live Location index supplying the Turn's node keys.
 * @param nodes - live Chat node store.
 * @returns the item, or undefined when the Turn has no visible loaded node.
 */
export declare function turnNavigationItem(turn: number, locations: ChatLocationNodeIndex, nodes: ChatNodeStore): TurnNavigationItem | undefined;
//# sourceMappingURL=turn-navigation.d.ts.map