/**
 * Runtime of one open domain: authoritative in-memory state, the single
 * per-domain write chain, and change-event emission. Reads are synchronous
 * from memory; every write queues on the chain, awaits backend durability
 * FIRST, then mutates memory, then emits `domain/changed` — a rejected
 * backend write leaves memory untouched (no divergence between reads and the
 * medium), and events carry values that equal the in-memory state at
 * emission, in write order.
 * @module @deepseek-ai/dsh-storage-domain/src/domain
 */
import type { Context } from '@deepseek-ai/cordis';
import type { KvUnit } from '@deepseek-ai/dsh-storage';
import type { DomainSpec, DomainGlobalSpec, TableKeyOf, TableValueOf } from './spec.ts';
/** Handle on a domain's global singleton. */
export interface DomainGlobal<G> {
    /**
     * Current value, synchronously from the authoritative in-memory state.
     * Before the first `set` this is the spec's `initial`.
     * @returns the current global value.
     */
    get(): G;
    /**
     * Replace the value durably. Queued on the domain's write chain; the first
     * `set` is what materializes the global on the medium.
     * @param value - New value; must satisfy the spec's schema (not re-checked
     * here — validation happens at the durable read boundary).
     * @returns resolution after durability and event emission.
     */
    set(value: G): Promise<void>;
}
/**
 * Handle on one declared table. Records are plain immutable data: returned
 * values are the stored objects themselves (no defensive copies) and must not
 * be mutated in place — replace via `put`/`update`.
 */
export interface KvTable<K extends string, V> {
    /**
     * Read one record, synchronously from memory.
     * @param key - Record key.
     * @returns the record, or `undefined` when absent.
     */
    get(key: K): V | undefined;
    /**
     * Snapshot iterator over `[key, record]` pairs. A snapshot, not a live
     * view: iteration stays stable while queued writes land.
     * @returns the pair iterator.
     */
    entries(): IterableIterator<[K, V]>;
    /**
     * Snapshot iterator over keys.
     * @returns the key iterator.
     */
    keys(): IterableIterator<K>;
    /** Current record count. */
    readonly size: number;
    /**
     * Insert or overwrite one record durably.
     * @param key - Record key.
     * @param value - The full new record (no partial merge).
     * @returns resolution after durability and event emission.
     */
    put(key: K, value: V): Promise<void>;
    /**
     * Delete one record durably.
     * @param key - Record key.
     * @returns `true` when the record existed, `false` when it was already
     * absent (no write and no event in that case).
     */
    delete(key: K): Promise<boolean>;
    /**
     * Atomic read-modify-write on the domain's write chain: `fn` sees the
     * value current at its queue slot, so concurrent updates never interleave.
     * @param key - Record key; a missing key rejects with `missing-key`.
     * @param fn - Synchronous pure transform from current to next record.
     * @returns the stored next record.
     */
    update(key: K, fn: (current: V) => V): Promise<V>;
}
/** Global handle of a spec: typed when declared, `never` (inaccessible) when not. */
export type DomainGlobalHandleOf<S extends DomainSpec> = S extends {
    readonly global: DomainGlobalSpec<infer G>;
} ? DomainGlobal<G> : never;
/** One open domain, typed by its spec. */
export interface Domain<S extends DomainSpec> {
    /** Domain name from the spec. */
    readonly name: string;
    /** Global singleton handle; a spec without `global` has no usable handle (`never`). */
    readonly global: DomainGlobalHandleOf<S>;
    /**
     * Resolve one declared table handle. Handles are stable — repeated calls
     * return the same instance.
     * @param name - Declared table name.
     * @returns the typed table handle.
     */
    table<N extends keyof S['tables'] & string>(name: N): KvTable<TableKeyOf<S, N>, TableValueOf<S, N>>;
    /**
     * Close this domain: reject new writes immediately, drain already-queued
     * writes (their events still emit), release the backend unit, then free
     * the domain name for a later open. Idempotent — repeated calls share one
     * teardown. The consumer owns this call (typically as its own `ctx.effect`
     * disposer); the facility closes any domain left open when it unmounts.
     * @returns resolution after the unit is released.
     */
    close(): Promise<void>;
}
/**
 * The single domain implementation behind the {@link Domain} interface. The
 * facility constructs it from a validated `loadAll` snapshot and erases it to
 * `Domain<S>`; nothing outside this package constructs one.
 */
export declare class DomainImpl {
    private readonly ctx;
    private readonly unit;
    private readonly onClosed;
    /** Domain name from the spec. */
    readonly name: string;
    private readonly tables;
    private globalValue;
    private readonly globalHandle?;
    /** Tail of the write chain; every link settles (rejections are observed by the caller's slice). */
    private chain;
    /** Set when close begins: new writes reject while already-queued writes drain. */
    private disposing;
    /** Set when close finishes (chain drained, unit closed): reads reject from here on. */
    private closed;
    private disposal?;
    /**
     * @param ctx - Context that carries `domain/changed` emissions.
     * @param spec - The domain declaration.
     * @param unit - The opened backend unit; this instance owns its lifecycle.
     * @param records - Validated records from the unit's `loadAll`, one entry
     * per declared table (empty maps included) — the facility builds it from
     * the spec, so the entry set IS the table set.
     * @param globalValue - Validated stored global, or the spec's `initial`
     * when the medium held none; `undefined` when the spec declares no global.
     * @param onClosed - Facility hook run once after teardown completes; frees
     * the domain name for a later open.
     */
    constructor(ctx: Context, spec: DomainSpec, unit: KvUnit, records: Map<string, Map<string, unknown>>, globalValue: unknown, onClosed: () => void);
    /** Global singleton handle; accessing it on a spec that declares no global is a caller bug and throws. */
    get global(): DomainGlobal<unknown>;
    /**
     * Resolve one declared table handle; an undeclared name is a caller bug
     * and throws.
     * @param name - Declared table name.
     * @returns the stable table handle.
     */
    table(name: string): KvTable<string, unknown>;
    /**
     * Close this domain: reject new writes immediately, drain already-queued
     * writes (their events still emit), close the unit, then free the name via
     * the facility hook. Idempotent — repeated calls share one teardown.
     * @returns resolution after the unit is released.
     */
    close(): Promise<void>;
    private runClose;
    /**
     * Dispatch one post-durability change notification, containing observer
     * failures: the write is already committed (medium and memory both hold
     * the new state), so a throwing listener must not retroactively reject it.
     */
    private emitChanged;
    private enqueue;
    private assertReadable;
}
//# sourceMappingURL=domain.d.ts.map