const sessionResourceCleanups = new Set();
export function registerSessionResourceCleanup(cleanup) {
    sessionResourceCleanups.add(cleanup);
    return () => {
        sessionResourceCleanups.delete(cleanup);
    };
}
export function cleanupSessionResources(sessionId) {
    const errors = [];
    for (const cleanup of sessionResourceCleanups) {
        try {
            cleanup(sessionId);
        }
        catch (error) {
            errors.push(error);
        }
    }
    if (errors.length > 0) {
        throw new AggregateError(errors, "Failed to cleanup session resources");
    }
}
//# sourceMappingURL=session-resources.js.map