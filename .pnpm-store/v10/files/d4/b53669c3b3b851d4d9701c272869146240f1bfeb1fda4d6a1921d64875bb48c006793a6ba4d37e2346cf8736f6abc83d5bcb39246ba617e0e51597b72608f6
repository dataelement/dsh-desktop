/**
 * Parent-owned durable subagent catalog events and their chunked projection.
 *
 * @module @deepseek-ai/dsh-subagent/catalog
 */
import { z } from 'zod';
import type { ChunkedList } from '@deepseek-ai/dsh-chunked-list';
import type { Session, SessionEvent, SessionHeader, SessionId, SessionLogOffset } from '@deepseek-ai/dsh-session';
import type { SubagentCatalogEntry } from './projection-types.ts';
/** Current payload version for `subagent/catalog` events. */
export declare const SUBAGENT_CATALOG_VERSION = 0;
/** One complete parent-owned catalog fact. */
export type SubagentCatalogEvent = {
    readonly version: 0;
    readonly childId: SessionId;
    readonly childCreatedAt: number;
} & ({
    readonly mode: 'one-shot';
    readonly label?: string;
} | {
    readonly mode: 'continuable';
    readonly label: string;
});
declare module '@deepseek-ai/dsh-session/types' {
    interface SessionEventMap {
        /**
         * A direct child's complete discovery fact.
         * @param data - versioned parent-owned catalog entry.
         */
        'subagent/catalog': SubagentCatalogEvent;
    }
}
/** Host fold state for one parent catalog. */
export interface SubagentCatalogState {
    readonly inheritedEventCount: SessionLogOffset;
    readonly head?: ChunkedList<SubagentCatalogEvent> | undefined;
}
declare module '@deepseek-ai/dsh-session-projection/types' {
    interface SessionProjectionStateMap {
        subagentCatalog: SubagentCatalogState;
    }
}
/**
 * Materialize direct children from their parent's successful creation facts.
 * @param state - parent catalog fold state.
 * @returns current direct-child rows in parent catalog event order.
 */
declare function subagentCatalogEntries(state: SubagentCatalogState): SubagentCatalogEntry[];
/** Parent-owned direct-child catalog projection; invalid own facts reject restoration. */
export declare const subagentCatalogProjectionDefinition: {
    key: "subagentCatalog";
    stateSchema: z.ZodType<SubagentCatalogState, unknown, z.core.$ZodTypeInternals<SubagentCatalogState, unknown>>;
    init: (_header: SessionHeader, inheritedEventCount: SessionLogOffset) => {
        inheritedEventCount: SessionLogOffset;
    };
    apply: (state: NoInfer<SubagentCatalogState>, event: SessionEvent) => SubagentCatalogState;
    stateVersion: number;
    wire: {
        viewSchema: z.ZodType<SubagentCatalogEntry[], unknown, z.core.$ZodTypeInternals<SubagentCatalogEntry[], unknown>>;
        view: typeof subagentCatalogEntries;
    };
};
/**
 * Append a complete direct-child discovery fact to its parent Session.
 * @param parent - durable direct parent receiving the discovery fact.
 * @param child - established child's immutable Session metadata.
 * @param descriptor - mode-discriminated creation label frozen with the child.
 */
export declare function establishCatalogChild(parent: Session, child: SessionHeader, descriptor: {
    readonly mode: 'one-shot';
    readonly label?: string;
} | {
    readonly mode: 'continuable';
    readonly label: string;
}): void;
export {};
//# sourceMappingURL=catalog.d.ts.map