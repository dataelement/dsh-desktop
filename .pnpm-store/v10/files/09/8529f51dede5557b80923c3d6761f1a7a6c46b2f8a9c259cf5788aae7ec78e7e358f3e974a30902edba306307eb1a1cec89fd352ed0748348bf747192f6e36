/**
 * Capture coordinator for the telemetry capability. Live capture subscribes to
 * the session firehose plus the one live-bus relay (`agent/error`). Both
 * capture paths build one logical record per canonical Session event and run
 * each through the
 * `session-telemetry/record` waterfall (deployment-mounted redaction rules;
 * pass-through when none), then hands the result to the backend. Live capture
 * follows the session firehose; on-demand capture replays the canonical log
 * only when requested. Every synchronous handler is self-contained so a
 * failing backend can never starve other subscribers (cordis `emit` is
 * stop-on-throw) or touch the agent loop. Composed by a backend in its
 * constructor.
 *
 * @module @deepseek-ai/dsh-session-telemetry/coordinator
 */
import type { Context } from '@deepseek-ai/cordis';
import { type Session, type SessionSeq as SessionSeqType } from '@deepseek-ai/dsh-session';
import type { SessionTelemetrySink } from './index.ts';
/** Whether capture follows live events or reads the canonical log only when requested. */
export type SessionTelemetryCapture = 'live' | 'on-demand';
/** Backend-selected capture mode and history policy. */
export interface SessionTelemetryCaptureOptions {
    /** Follow live events, or wait for explicit capture; defaults to live. */
    capture?: SessionTelemetryCapture;
    /** Include stored history before this lifecycle; defaults to false. */
    includeHistory?: boolean;
}
/**
 * Install the telemetry capture side onto a context for one backend.
 *
 * Live capture registers its own `session/created` / `session/event` /
 * `session/disposed` listener set plus the `agent/error` relay, all through
 * `ctx.effect()`/`ctx.on()` on the composing fiber, and sweeps already-live
 * sessions (a hot reload does not replay `session/created`). A `session/disposed` captures the session's `shutdown`
 * operational record at its own termination edge and retires it from the
 * adopted set. On-demand capture registers none of those continuous listeners;
 * {@link captureSession} reads the canonical log explicitly and never creates
 * operational records. Disposal captures shutdown markers for live-adopted
 * sessions, then awaits the backend's `shutdown()`; a failure there warns
 * instead of throwing — best-effort reporting must not fail application
 * teardown.
 */
export declare class SessionTelemetryCoordinator {
    private readonly ctx;
    private readonly backend;
    private readonly options;
    /**
     * Sessions adopted by THIS fiber and still live, for double-adoption
     * protection and the teardown sweep of unmarked sessions;
     * `session/disposed` marks and retires entries.
     */
    private readonly adopted;
    /**
     * @param ctx - the composing backend's context; listeners bind to its fiber.
     * @param backend - the backend receiving records; owned elsewhere, never disposed here beyond `shutdown()` forwarding.
     * @param options - capture mode and history policy.
     */
    constructor(ctx: Context, backend: SessionTelemetrySink, options?: SessionTelemetryCaptureOptions);
    /**
     * Copy, redact, and hand over the canonical session-log suffix after the handoff
     * cursor, optionally stopping at an inclusive sequence boundary. Redaction
     * runs during this call, so an on-demand caller retains no copied records
     * before requesting capture and uses the policy mounted at that time.
     * Backend and policy failures remain contained per event and do not starve
     * later events in the same replay.
     * @param session - session whose current canonical-log prefix may be handed over.
     * @param throughSeq - optional last sequence included in this capture.
     */
    captureSession(session: Session, throughSeq?: SessionSeqType): void;
    /**
     * Adopt a session and replay after its handoff cursor, then follow live events.
     * New objects include inherited and restored history only with includeHistory;
     * otherwise replay starts at the constructor boundary. Re-adopting the same
     * object resumes after its cursor.
     * @param session - the live session to adopt; a second adoption is a no-op.
     */
    private adopt;
    /** Copy, redact, and hand one canonical event to the backend. */
    private captureEvent;
    /**
     * Run the `session-telemetry/record` waterfall at capture time. The innermost `next`
     * passes the record through unchanged — this package ships no rules; exported
     * data is as clean as the listeners a deployment mounts. Callers run inside
     * {@link contain}, so a throwing rule withholds the record instead of
     * reaching the loop (fail-closed). On-demand capture invokes this waterfall
     * while reading the canonical session log, not when the event was appended.
     */
    private redact;
    /** Hand one redacted record to the backend, then advance its ledger cursor. */
    private deliver;
    /** Forward the turn-end boundary to the backend's optional flush hint. */
    private hintFlush;
    /** Relay one `agent/error` bus emission as an `agent-error` operational record. */
    private relayAgentError;
    /**
     * Run one capture-side step with its exception contained: cordis `emit`
     * is stop-on-throw, so a throwing listener would starve every subscriber
     * registered after this plugin — nothing from the backend may escape.
     */
    private contain;
}
//# sourceMappingURL=coordinator.d.ts.map