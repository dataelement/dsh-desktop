export function formatThrownValue(value) {
    if (value instanceof Error)
        return value.message || value.name;
    if (typeof value === "string")
        return value;
    return String(value);
}
export function extractDiagnosticError(error) {
    if (!(error instanceof Error))
        return { name: "ThrownValue", message: formatThrownValue(error) };
    const code = error.code;
    return {
        name: error.name || undefined,
        message: error.message || error.name,
        stack: error.stack,
        code: typeof code === "string" || typeof code === "number" ? code : undefined,
    };
}
export function createAssistantMessageDiagnostic(type, error, details) {
    return { type, timestamp: Date.now(), error: extractDiagnosticError(error), details };
}
export function appendAssistantMessageDiagnostic(message, diagnostic) {
    message.diagnostics = [...(message.diagnostics ?? []), diagnostic];
}
//# sourceMappingURL=diagnostics.js.map