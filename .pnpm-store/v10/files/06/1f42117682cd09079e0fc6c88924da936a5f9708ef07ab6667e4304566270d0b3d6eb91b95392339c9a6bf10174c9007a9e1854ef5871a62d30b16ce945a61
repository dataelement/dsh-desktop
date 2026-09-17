/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-storage-domain`: every
 * `domain/changed` event must agree with the emitting domain's authoritative
 * in-memory state (the owned event-stream ↔ mutable-data relationship of this
 * package). Writes emit strictly after mutating memory and the write chain
 * serializes them, so at emission time the event's snapshot equals the
 * current read — any divergence means a write path skipped the chain or
 * emitted a stale value.
 * @module @deepseek-ai/dsh-storage-domain/invariant
 */
import type { Context } from '@deepseek-ai/cordis';
/** Cordis companion plugin name. */
export declare const name = "storage-domain-invariant";
/** Service required before the companion can reserve package ownership. */
export declare const inject: string[];
/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export declare const apply: (ctx: Context) => Promise<() => void>;
//# sourceMappingURL=invariant.d.ts.map