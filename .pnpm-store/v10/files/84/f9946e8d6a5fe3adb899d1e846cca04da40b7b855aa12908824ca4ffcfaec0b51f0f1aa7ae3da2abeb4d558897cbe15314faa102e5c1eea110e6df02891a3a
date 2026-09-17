import type { Logger as ILogger, LogRecord } from '@opentelemetry/api-logs';
import { SeverityNumber } from '@opentelemetry/api-logs';
import type { Context } from '@opentelemetry/api';
import type { LoggerProviderSharedState } from './internal/LoggerProviderSharedState';
import type { LogInstrumentationScope } from './internal/utils';
export declare class Logger implements ILogger {
    private readonly _instrumentationScope;
    private readonly _sharedState;
    private readonly _loggerConfig;
    constructor(instrumentationScope: LogInstrumentationScope, sharedState: LoggerProviderSharedState);
    emit(logRecord: LogRecord): void;
    enabled(options?: {
        context?: Context;
        severityNumber?: SeverityNumber;
        eventName?: string;
    }): boolean;
}
//# sourceMappingURL=Logger.d.ts.map