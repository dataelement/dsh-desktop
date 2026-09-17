/**
 * Strict Schedule decoding, replay, time validation, and framing.
 * @module @deepseek-ai/dsh-schedule
 */
import type { SessionEvent, SessionLogOffset as SessionLogOffsetType } from '@deepseek-ai/dsh-session';
import type { AfterScheduleRecord, AtInput, AtScheduleRecord, EveryScheduleRecord, OneShotScheduleRecord, ScheduleChange, ScheduleId as ScheduleIdType, ScheduleRecord, ScheduleView } from './types.ts';
/** Durable Schedule protocol version implemented by this package. */
export declare const SCHEDULE_CHANGE_VERSION: 1;
/** Fixed v1 lower bound for a fixed-rate reminder. */
export declare const MIN_EVERY_INTERVAL_SECONDS = 300;
/** Error from malformed or transition-invalid durable Schedule data. */
export declare class ScheduleLogError extends Error {
    /** Stable machine-readable error code. */
    readonly code: "corrupt_schedule_log";
    /**
     * Construct a durable-log failure.
     * @param message - Package-specific violated invariant.
     */
    constructor(message: string);
}
/** Error from a model-supplied Schedule rule that cannot become a record. */
export declare class ScheduleInputError extends Error {
    /** Stable public Schedule input code. */
    readonly code: 'invalid_prompt' | 'invalid_rule' | 'invalid_time_zone' | 'not_future' | 'time_out_of_range' | 'frequency_too_high';
    /**
     * Construct a stable input failure.
     * @param code - Public Schedule error discriminator.
     * @param message - Stable public diagnostic.
     * @param options - Optional contained implementation cause.
     */
    constructor(code: 'invalid_prompt' | 'invalid_rule' | 'invalid_time_zone' | 'not_future' | 'time_out_of_range' | 'frequency_too_high', message: string, options?: ErrorOptions);
}
/** Pure replay result, retaining active create order and every used id. */
export interface FoldedSchedules {
    /** Active records in their original create order. */
    readonly active: readonly ScheduleRecord[];
    /** Every id ever created in this session-local suffix. */
    readonly seenIds: readonly ScheduleIdType[];
}
/** One latest-only fixed-rate decision derived without enumerating a backlog. */
export interface EveryOccurrence {
    /** Latest anchor-aligned occurrence due at the decision time. */
    readonly occurrenceAt: string;
    /** First anchor-aligned target after the decision, or exhaustion. */
    readonly nextScheduledAt?: string;
}
/**
 * Brand a raw session-local id without changing its runtime value.
 * @param value - Raw session-local id.
 * @returns The same string with the Schedule brand.
 */
export declare function ScheduleId(value: string): ScheduleIdType;
/**
 * Validate and canonicalize one raw IANA time-zone selector.
 * @param value - Candidate `UTC` or IANA Area/Location name.
 * @returns The runtime's canonical IANA name.
 */
export declare function canonicalizeTimeZone(value: string): string;
/**
 * Decode one strict version-1 `schedule/change` payload.
 * @param value - Untrusted durable JSON value.
 * @returns Detached, frozen Schedule change.
 */
export declare function decodeScheduleChange(value: unknown): ScheduleChange;
/**
 * Resolve one fixed-rate decision without enumerating missed occurrences.
 * @param record - Active record whose target is the earliest unaccepted occurrence.
 * @param acceptedAt - Wall-clock decision time in epoch milliseconds.
 * @returns The latest due occurrence and first strictly future target, if representable.
 */
export declare function resolveEveryOccurrence(record: EveryScheduleRecord, acceptedAt: number): EveryOccurrence;
/**
 * Apply already-decoded Schedule changes to one complete fold value.
 *
 * This is the single transition authority shared by full-log replay and the
 * incremental Session projection. One mutable Map/Set pair spans the whole
 * batch; the returned arrays are materialized and frozen once.
 * @param folded - complete active records and used-id history before the changes.
 * @param changes - strictly decoded durable mutations in log order.
 * @returns the complete fold value after every mutation.
 */
export declare function applyScheduleChanges(folded: FoldedSchedules, changes: Iterable<ScheduleChange>): FoldedSchedules;
/**
 * Fold the package-owned stream after the durable fork seed boundary.
 * @param events - Complete ordered session log or candidate-extended log.
 * @param inheritedEventCount - Inherited prefix length excluded from child ownership.
 * @returns Active records and all previously used ids.
 */
export declare function foldScheduleEvents(events: readonly SessionEvent[], inheritedEventCount?: SessionLogOffsetType): FoldedSchedules;
/**
 * Allocate the next readable id without reusing any prior session-local id.
 * @param folded - Fold containing every previously created id.
 * @returns A fresh `schedule-N` identity.
 */
export declare function allocateScheduleId(folded: FoldedSchedules): ScheduleIdType;
/**
 * Validate a model after rule and compute its durable target.
 * @param id - Already allocated session-local id.
 * @param prompt - Reminder content supplied at creation.
 * @param afterSeconds - Requested positive delay.
 * @param now - Single creation-time wall-clock sample in epoch milliseconds.
 * @returns Frozen durable after record.
 */
export declare function createAfterScheduleRecord(id: ScheduleIdType, prompt: string, afterSeconds: number, now: number): AfterScheduleRecord;
/**
 * Validate an absolute selector and compute its sole durable UTC target.
 * @param id - Already allocated session-local id.
 * @param prompt - Reminder content supplied at creation.
 * @param at - Explicit-offset instant or structured local calendar value.
 * @param now - Single creation-time wall-clock sample in epoch milliseconds.
 * @returns Frozen durable absolute one-shot record.
 */
export declare function createAtScheduleRecord(id: ScheduleIdType, prompt: string, at: AtInput, now: number): AtScheduleRecord;
/**
 * Validate a fixed-rate selector and compute its first creation-aligned target.
 * @param id - Already allocated session-local id.
 * @param prompt - Reminder content supplied at creation.
 * @param everySeconds - Requested fixed safe-integer interval.
 * @param now - Single creation-time wall-clock sample in epoch milliseconds.
 * @returns Frozen durable fixed-rate record.
 */
export declare function createEveryScheduleRecord(id: ScheduleIdType, prompt: string, everySeconds: number, now: number): EveryScheduleRecord;
/**
 * Derive one execution-local management view.
 * @param record - Active durable record.
 * @param now - Wall-clock sample used for its timing state.
 * @returns Complete session-local view.
 */
export declare function scheduleView(record: ScheduleRecord, now: number): ScheduleView;
/**
 * Render the fixed injection-resistant model framing for a due reminder.
 * @param record - Due active record.
 * @returns Stable model-visible text with JSON-escaped dynamic fields.
 */
export declare function renderReminderFraming(record: OneShotScheduleRecord): string;
/**
 * Render one injection-resistant fixed-rate batch in target and create order.
 * @param reminders - Complete admitted batch with one latest occurrence per record.
 * @returns Stable model-visible text whose dynamic payload is canonical JSON.
 */
export declare function renderEveryReminderBatchFraming(reminders: readonly {
    readonly record: EveryScheduleRecord;
    readonly occurrenceAt: string;
}[]): string;
//# sourceMappingURL=domain.d.ts.map