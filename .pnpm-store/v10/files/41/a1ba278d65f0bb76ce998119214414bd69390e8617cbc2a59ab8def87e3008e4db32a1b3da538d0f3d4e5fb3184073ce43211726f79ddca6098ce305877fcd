/**
 * Surface retention selection and the shared log-recorded compaction
 * transaction for automatic open-turn and manual idle-session compaction.
 *
 * @module @deepseek-ai/dsh-compaction-basic/region
 */
import type { CompactionResult } from '@deepseek-ai/dsh-compaction';
import type { CommandId } from '@deepseek-ai/dsh-commands/brand';
import type { TokenMeasurement, TokenMeter } from '@deepseek-ai/dsh-token-meter';
import { SessionSeq, type Session } from '@deepseek-ai/dsh-session';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { SummarizationInput, SummaryResult } from './summarizer.ts';
interface RegionDependencies {
    readonly meter: TokenMeter;
    summarize(input: SummarizationInput, agent: Agent, signal?: AbortSignal): Promise<SummaryResult>;
}
interface CompactionTransactionOptions {
    /** `current-turn` derives a numbered owner; `null` writes a standalone bracket. */
    readonly owner: 'current-turn' | null;
    /** Surface relationship that must survive asynchronous summarization. */
    readonly stability: 'whole-surface' | 'selected-span';
    /** Optional durability checkpoint after a successfully closed bracket. */
    readonly flush?: () => Promise<void>;
    /** Manual command that initiated this transaction, when present. */
    readonly sourceCommandId?: CommandId;
}
/**
 * Resolve the next range starting at the first non-system surface node while
 * retaining a priced recent tail and never splitting an assistant
 * tool-call/result pair. A `system/message` at surface node 0 is never inside
 * the range; without one the range starts at node 0.
 * @param session - session supplying authoritative current surface positions.
 * @param measurement - unified pressure and surface measurement from the conversation meter.
 * @param retainTokens - minimum recent tail budget retained verbatim.
 * @returns the inclusive positional seq range to compact, or `null`.
 */
export declare function selectCompactableRange(session: Session, measurement: TokenMeasurement, retainTokens: number): {
    start: SessionSeq;
    end: SessionSeq;
} | null;
/**
 * Run the single compaction transaction over one selected positional span.
 * Selection and validation are read-only. Idle/log validation and
 * `compaction/start` are synchronously adjacent, so the durable opening marker is
 * the compaction lock before summarization yields. Every later failure makes
 * exactly one `compaction/end` attempt; a failed close deliberately leaves the
 * unmatched start detectable.
 * @param dependencies - conversation meter and dynamically dispatched summarizer hook.
 * @param session - session whose surface is mutated.
 * @param start - inclusive first surface-node seq.
 * @param end - inclusive last surface-node seq.
 * @param agent - agent used by the summarizer.
 * @param options - bracket owner, stability rule, and optional durability checkpoint.
 * @param signal - optional summarization cancellation signal.
 * @returns the successful durable compaction result.
 */
export declare function compactSurfaceRegion(dependencies: RegionDependencies, session: Session, start: SessionSeq, end: SessionSeq, agent: Agent, options: CompactionTransactionOptions, signal?: AbortSignal): Promise<CompactionResult>;
/**
 * Recheck the durable compaction lock after an asynchronous policy decision.
 * @param session - session whose latest marker state is inspected.
 * @param stage - operation label included in the busy diagnostic.
 */
export declare function assertNoActiveCompaction(session: Session, stage: string): void;
export {};
//# sourceMappingURL=region.d.ts.map