import { createRequire } from "node:module";
import z from "@deepseek-ai/schemastery";
import { Session } from "@deepseek-ai/dsh-session";
import { SessionTelemetryBackend, SessionTelemetryCoordinator } from "@deepseek-ai/dsh-session-telemetry";
import { APP_IDENTITY } from "@deepseek-ai/dsh-llm";
import { getOrCreateAnonymousUserId } from "@deepseek-ai/dsh-anonymous-user-id";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { resourceFromAttributes } from "@opentelemetry/resources";
//#region lib/types/index.js
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
const { version } = createRequire(import.meta.url)("../package.json");
/** Session-sharing policy selected by {@link Config.mode}. */
var SessionTelemetryMode;
(function(SessionTelemetryMode) {
	SessionTelemetryMode["FEEDBACK_ONLY"] = "FEEDBACK_ONLY";
	SessionTelemetryMode["DISABLED"] = "DISABLED";
})(SessionTelemetryMode || (SessionTelemetryMode = {}));
/** Default session-sharing policy for schema and direct construction. */
const DEFAULT_TELEMETRY_MODE = SessionTelemetryMode.FEEDBACK_ONLY;
const DISABLED_FEEDBACK_WARNING = "OpenTelemetry session upload is DISABLED; this feedback is not uploaded through OpenTelemetry";
const NON_CANONICAL_EVENT_WARNING = "session telemetry ignored an event absent from the canonical session log";
/** Only this Session's explicit feedback authorizes replay; fork seeds do not. */
function isFeedback(session, event) {
	if (event.seq < session.inheritedEventCount) return false;
	switch (event.type) {
		case "feedback/record": return true;
		case "feedback/message-put":
		case "feedback/message-delete": return event.data.sessionId === session.id;
		default: return false;
	}
}
/** Resolve the default and reject unknown runtime values before transport setup. */
function resolveMode(mode) {
	const resolved = mode ?? DEFAULT_TELEMETRY_MODE;
	switch (resolved) {
		case SessionTelemetryMode.FEEDBACK_ONLY:
		case SessionTelemetryMode.DISABLED: return resolved;
		default: return assertNever(resolved);
	}
}
/** Fail closed when direct construction bypasses the runtime config schema. */
function assertNever(value) {
	throw new Error(`session-telemetry-otel: unsupported mode ${JSON.stringify(value)}`);
}
/** Map the serialized mode onto the seam's backend-independent sharing vocabulary. */
function sharingStatusFor(mode) {
	switch (mode) {
		case SessionTelemetryMode.FEEDBACK_ONLY: return "feedback-only";
		case SessionTelemetryMode.DISABLED: return "disabled";
		/* v8 ignore next 2 -- resolveMode already rejected unknown values before this switch; the closed enum cannot reach the default. */
		default: return assertNever(mode);
	}
}
/**
* Schemastery validator for {@link Config}; cordis runs it before the plugin
* starts. It checks only the top-level fields; value checks live in the constructor
* so their errors name the fields. Both SDK option objects pass through unchanged:
* the SDK defines and validates their fields. Re-declaring them here would
* silently drop every field this plugin did not repeat.
*/
const Config = z.object({
	mode: z.union(Object.values(SessionTelemetryMode)).default(DEFAULT_TELEMETRY_MODE),
	exporter: z.any(),
	processor: z.any(),
	shutdownTimeoutMillis: z.number()
});
/** Default outer allowance for the SDK's complete shutdown sequence. */
const DEFAULT_SHUTDOWN_TIMEOUT_MILLIS = 3e3;
const MAX_TIMER_DELAY_MILLIS = 2147483647;
/** Severity mapping from the Service Definition's three-level vocabulary to OTel severity numbers. */
const SEVERITY = {
	info: {
		severityNumber: SeverityNumber.INFO,
		severityText: "INFO"
	},
	warn: {
		severityNumber: SeverityNumber.WARN,
		severityText: "WARN"
	},
	error: {
		severityNumber: SeverityNumber.ERROR,
		severityText: "ERROR"
	}
};
/**
* The backend plugin — the only entry a deployment loads. It always registers
* the `sessionTelemetry` service (duplicate load throws). `FEEDBACK_ONLY` wires the SDK
* pipeline and on-demand {@link SessionTelemetryCoordinator}; `DISABLED` constructs no
* SDK state and listens only to warn when recorded feedback stays local.
*/
var OpenTelemetrySessionBackend = class extends SessionTelemetryBackend {
	static inject = ["sessions"];
	static Config = Config;
	provider;
	shutdownTimeoutMillis;
	sharing;
	constructor(ctx, config) {
		const mode = resolveMode(config.mode);
		super(ctx);
		this.sharing = sharingStatusFor(mode);
		if (mode === SessionTelemetryMode.DISABLED) {
			this.provider = void 0;
			this.shutdownTimeoutMillis = DEFAULT_SHUTDOWN_TIMEOUT_MILLIS;
			ctx.on("session/event", (session, event) => {
				if (isFeedback(session, event)) ctx.logger.warn(DISABLED_FEEDBACK_WARNING);
			});
			return;
		}
		const url = config.exporter?.url;
		if (url === void 0 || url.length === 0) throw new Error("session-telemetry-otel: exporter.url is required (the full OTLP logs endpoint)");
		let parsed;
		try {
			parsed = new URL(url);
		} catch {
			throw new Error(`session-telemetry-otel: exporter.url is not a valid URL: ${JSON.stringify(url)}`);
		}
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error(`session-telemetry-otel: exporter.url must be http(s), got ${parsed.protocol}`);
		const batchSize = config.processor?.maxExportBatchSize;
		if (batchSize !== void 0 && (!Number.isInteger(batchSize) || batchSize < 1)) throw new Error(`session-telemetry-otel: processor.maxExportBatchSize must be a positive integer, got ${String(batchSize)}`);
		const shutdownTimeoutMillis = config.shutdownTimeoutMillis ?? 3e3;
		if (!Number.isFinite(shutdownTimeoutMillis) || shutdownTimeoutMillis <= 0 || shutdownTimeoutMillis > MAX_TIMER_DELAY_MILLIS) throw new Error(`session-telemetry-otel: shutdownTimeoutMillis must be a positive finite number no greater than ${MAX_TIMER_DELAY_MILLIS}, got ${String(shutdownTimeoutMillis)}`);
		this.shutdownTimeoutMillis = shutdownTimeoutMillis;
		this.provider = new LoggerProvider({
			resource: resourceFromAttributes({
				"service.name": APP_IDENTITY.product,
				"service.version": APP_IDENTITY.version,
				"user.id": getOrCreateAnonymousUserId()
			}),
			processors: [new BatchLogRecordProcessor({
				...config.processor,
				exporter: new OTLPLogExporter(config.exporter)
			})]
		});
		const ledger = this.provider.getLogger("@deepseek-ai/dsh-session-telemetry-otel", version);
		const enqueue = (record) => {
			ledger.emit({
				timestamp: record.time,
				observedTimestamp: record.time,
				...SEVERITY[record.severity],
				body: record.body,
				attributes: record.attributes
			});
		};
		const coordinator = new SessionTelemetryCoordinator(ctx, {
			emit: enqueue,
			shutdown: () => this.shutdown()
		}, {
			capture: "on-demand",
			includeHistory: true
		});
		ctx.on("session/event", (session, event) => {
			if (!isFeedback(session, event)) return;
			if (session.eventAt(event.seq) !== event) {
				ctx.logger.warn(NON_CANONICAL_EVENT_WARNING);
				return;
			}
			coordinator.captureSession(session, event.seq);
		});
		ctx.on("feedback/committed", (inspection) => {
			const snapshot = structuredClone(inspection);
			const committed = snapshot.events.at(-1);
			if (committed === void 0) return;
			const session = Session.fromRestore(snapshot.meta.id, snapshot.events, snapshot.meta, snapshot.inheritedEventCount, "detached");
			if (isFeedback(session, committed)) coordinator.captureSession(session, committed.seq);
		});
	}
	/**
	* Drop direct records. Only a new canonical feedback submission can authorize
	* capture through the private coordinator sink, for every provider.
	* @param _record - the direct record, never uploaded.
	*/
	emit(_record) {}
	/**
	* Ask the SDK to drain and quiesce, but reject after the backend-owned
	* deadline. OTel's processor export timeout wraps `exportCompleted` only;
	* shutdown awaits `exporter.forceFlush()` first, which can remain pending
	* when the transport never obtains a socket. The provider promise remains
	* observed after the deadline so a later rejection cannot become unhandled.
	* `DISABLED` has no provider and resolves immediately.
	* @returns resolves when the SDK pipeline quiesces or is disabled, or rejects at the configured deadline.
	*/
	async shutdown() {
		if (this.provider === void 0) return;
		const providerShutdown = this.provider.shutdown();
		let timer;
		const deadline = new Promise((_resolve, reject) => {
			timer = setTimeout(() => {
				reject(/* @__PURE__ */ new Error(`session-telemetry-otel: provider shutdown exceeded ${this.shutdownTimeoutMillis}ms`));
			}, this.shutdownTimeoutMillis);
		});
		try {
			await Promise.race([providerShutdown, deadline]);
		} finally {
			/* v8 ignore else -- the Promise executor assigns timer synchronously before this race starts. */
			if (timer !== void 0) clearTimeout(timer);
		}
	}
};
//#endregion
export { Config, DEFAULT_SHUTDOWN_TIMEOUT_MILLIS, DEFAULT_TELEMETRY_MODE, OpenTelemetrySessionBackend, OpenTelemetrySessionBackend as default, SessionTelemetryMode };
