import type { SessionFormatEvent, SessionFormatEventRun, SessionFormatMigrationContext } from './types.ts';
/** Migration output context that expands compact runs into retained events. */
export declare class SessionFormatEventCollector implements SessionFormatMigrationContext {
    /** Events retained by this collector in source order. */
    readonly values: SessionFormatEvent[];
    /**
     * Retain one settled event.
     * @param event - settled event emitted by the upstream stage.
     */
    emitEvent(event: SessionFormatEvent): void;
    /**
     * Expand one compact run directly into retained events.
     * @param run - compact event run emitted by the upstream stage.
     */
    emitRun(run: SessionFormatEventRun): void;
}
//# sourceMappingURL=context.d.ts.map