export function headersToRecord(headers) {
    const result = {};
    for (const [key, value] of headers.entries()) {
        result[key] = value;
    }
    return result;
}
export function providerHeadersToRecord(headers) {
    if (!headers)
        return undefined;
    const result = {};
    for (const [key, value] of Object.entries(headers)) {
        if (value !== null)
            result[key] = value;
    }
    return Object.keys(result).length > 0 ? result : undefined;
}
//# sourceMappingURL=headers.js.map