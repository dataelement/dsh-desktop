/** Agent-scoped serialization for Schedule reads and durable mutations. */
import type { Agent } from '@deepseek-ai/dsh-agent';
/**
 * Run one complete Schedule transaction after its exact Agent's prior transaction.
 * @param agent - Exact Schedule owner and serialization key.
 * @param operation - Complete preflight, fold, mutation, and postflight operation.
 * @returns The operation result after exclusive execution.
 */
export declare function runScheduleTransaction<T>(agent: Agent, operation: () => Promise<T>): Promise<T>;
//# sourceMappingURL=transaction.d.ts.map