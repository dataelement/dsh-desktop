/**
 * OpenTelemetry Service Provider for the DeepSeek Harness telemetry capability.
 *
 * Composes the OTel JS SDK as-is — a `LoggerProvider` with a
 * `BatchLogRecordProcessor` and an OTLP/HTTP log exporter — and maps each
 * record handed over by the capture coordinator onto `logger.emit()`. After that call,
 * batching, retry, queueing, and loss policy use the SDK's documented behavior, configured
 * verbatim through the `exporter`/`processor` passthroughs. This package owns
 * capture mode and an outer shutdown deadline: the SDK's export timeout does
 * not bound its preceding `forceFlush()` wait.
 *
 * @module @deepseek-ai/dsh-session-telemetry-otel
 */
import z from '@deepseek-ai/schemastery';
import type { Context } from '@deepseek-ai/cordis';
import { SessionTelemetryBackend, type SessionTelemetryRecord, type SessionTelemetrySharingStatus } from '@deepseek-ai/dsh-session-telemetry';
import { type BatchLogRecordProcessorOptions } from '@opentelemetry/sdk-logs';
import type { OTLPExporterNodeConfigBase } from '@opentelemetry/otlp-exporter-base';
/** Session-sharing policy selected by {@link Config.mode}. */
export declare enum SessionTelemetryMode {
    FEEDBACK_ONLY = "FEEDBACK_ONLY",
    DISABLED = "DISABLED"
}
/** Default session-sharing policy for schema and direct construction. */
export declare const DEFAULT_TELEMETRY_MODE = SessionTelemetryMode.FEEDBACK_ONLY;
/**
 * Plugin configuration: one sharing policy, two verbatim SDK option objects,
 * and one DSH-owned shutdown bound. Uploading modes validate their endpoint
 * and shutdown deadline at plugin load; `DISABLED` reads neither.
 */
export interface Config {
    /** Defaults to `FEEDBACK_ONLY`: capture session history only when feedback is explicitly submitted. */
    mode?: SessionTelemetryMode;
    /**
     * Passed verbatim to the SDK's OTLP/HTTP log exporter — the complete
     * `OTLPExporterNodeConfigBase` shape (`headers`, `timeoutMillis`,
     * `compression`, `keepAlive`, …), owned and documented by the SDK. `url`
     * is the one field this package requires and validates itself.
     */
    exporter?: OTLPExporterNodeConfigBase & {
        /** Full logs endpoint (e.g. `https://collector.example.com/v1/logs`). Required outside `DISABLED`; validated at load. */
        url?: string;
    };
    /**
     * Passed verbatim to `BatchLogRecordProcessor` (minus the exporter slot,
     * which this plugin fills); the SDK owns and documents these knobs.
     */
    processor?: Omit<BatchLogRecordProcessorOptions, 'exporter'>;
    /** Maximum time spent awaiting the SDK provider's complete shutdown path. */
    shutdownTimeoutMillis?: number;
}
/**
 * Schemastery validator for {@link Config}; cordis runs it before the plugin
 * starts. It checks only the top-level fields; value checks live in the constructor
 * so their errors name the fields. Both SDK option objects pass through unchanged:
 * the SDK defines and validates their fields. Re-declaring them here would
 * silently drop every field this plugin did not repeat.
 */
export declare const Config: z<Config>;
/** Default outer allowance for the SDK's complete shutdown sequence. */
export declare const DEFAULT_SHUTDOWN_TIMEOUT_MILLIS = 3000;
/**
 * The backend plugin — the only entry a deployment loads. It always registers
 * the `sessionTelemetry` service (duplicate load throws). `FEEDBACK_ONLY` wires the SDK
 * pipeline and on-demand {@link SessionTelemetryCoordinator}; `DISABLED` constructs no
 * SDK state and listens only to warn when recorded feedback stays local.
 */
export declare class OpenTelemetrySessionBackend extends SessionTelemetryBackend {
    static inject: string[];
    static Config: z<Config>;
    private readonly provider;
    private readonly shutdownTimeoutMillis;
    readonly sharing: SessionTelemetrySharingStatus;
    constructor(ctx: Context, config: Config);
    /**
     * Drop direct records. Only a new canonical feedback submission can authorize
     * capture through the private coordinator sink, for every provider.
     * @param _record - the direct record, never uploaded.
     */
    emit(_record: SessionTelemetryRecord): void;
    /**
     * Ask the SDK to drain and quiesce, but reject after the backend-owned
     * deadline. OTel's processor export timeout wraps `exportCompleted` only;
     * shutdown awaits `exporter.forceFlush()` first, which can remain pending
     * when the transport never obtains a socket. The provider promise remains
     * observed after the deadline so a later rejection cannot become unhandled.
     * `DISABLED` has no provider and resolves immediately.
     * @returns resolves when the SDK pipeline quiesces or is disabled, or rejects at the configured deadline.
     */
    shutdown(): Promise<void>;
}
export default OpenTelemetrySessionBackend;
//# sourceMappingURL=index.d.ts.map