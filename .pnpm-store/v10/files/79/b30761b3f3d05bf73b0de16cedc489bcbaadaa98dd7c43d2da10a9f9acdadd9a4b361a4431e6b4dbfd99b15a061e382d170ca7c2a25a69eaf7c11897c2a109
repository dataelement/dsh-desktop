/** Agent-scoped serialization for Schedule reads and durable mutations. */
const tails = new WeakMap();
/**
 * Run one complete Schedule transaction after its exact Agent's prior transaction.
 * @param agent - Exact Schedule owner and serialization key.
 * @param operation - Complete preflight, fold, mutation, and postflight operation.
 * @returns The operation result after exclusive execution.
 */
export async function runScheduleTransaction(agent, operation) {
    const prior = tails.get(agent) ?? Promise.resolve();
    const run = prior.then(operation);
    const tail = run.then(() => undefined, () => undefined);
    tails.set(agent, tail);
    try {
        return await run;
    }
    finally {
        if (tails.get(agent) === tail)
            tails.delete(agent);
    }
}
//# sourceMappingURL=transaction.js.map