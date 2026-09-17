export interface DiagnosticErrorInfo {
    name?: string;
    message: string;
    stack?: string;
    code?: string | number;
}
export interface AssistantMessageDiagnostic {
    type: string;
    timestamp: number;
    error?: DiagnosticErrorInfo;
    details?: Record<string, unknown>;
}
export declare function formatThrownValue(value: unknown): string;
export declare function extractDiagnosticError(error: unknown): DiagnosticErrorInfo;
export declare function createAssistantMessageDiagnostic(type: string, error: unknown, details?: Record<string, unknown>): AssistantMessageDiagnostic;
export declare function appendAssistantMessageDiagnostic<T extends {
    diagnostics?: AssistantMessageDiagnostic[];
}>(message: T, diagnostic: AssistantMessageDiagnostic): void;
//# sourceMappingURL=diagnostics.d.ts.map