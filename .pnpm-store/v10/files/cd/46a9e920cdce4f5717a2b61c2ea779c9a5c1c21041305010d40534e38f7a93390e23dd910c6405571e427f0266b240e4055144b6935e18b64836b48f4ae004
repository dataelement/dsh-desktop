/**
 * One opened JSON unit in `per-record` layout: the unit is a directory at
 * `dir`, holding one document per record under `<dir>/<table>/<key>.json`
 * plus `global.json` for the global slot. The directory is the state — this
 * unit holds NO in-memory state of its own: `loadAll` re-reads the tree and
 * every write is one durable file operation. The domain layer owns the live
 * in-memory tables (seeded by the open-time `loadAll`) and serializes writes
 * through its write chain, so this unit never mutates memory and needs no
 * rollback — a failed write simply leaves both the file and the domain's
 * memory unchanged.
 *
 * Per-record contract: a record document that is malformed or stamped with a
 * version outside the accepted set (the descriptor's current version plus
 * its `compatibleVersions`) reads as an absent record — one bad or stale
 * file never bricks the whole unit, and an unaccepted version stamp discards
 * the record instead of migrating it. Record keys become path segments, so
 * they must be path-safe (`[a-zA-Z0-9_-]+`); an unsafe key rejects at write.
 *
 * Legacy bootstrap: when the new tree has no document path, a legacy
 * whole-unit file `<root>/<name>.json` (the pre-per-record layout) seeds
 * per-record documents, provided its stored unit version is in the accepted
 * set — a legacy file stamped with any other version is left alone and reads
 * as the empty unit. Any new document path, including one whose contents are
 * unreadable or stale, suppresses the bootstrap for the whole unit. The
 * legacy file is never changed or deleted.
 * @module @deepseek-ai/dsh-storage-json/src/per-record-unit
 */
import type { KvUnit, KvUnitDescriptor } from '@deepseek-ai/dsh-storage';
/**
 * Open one `per-record`-layout unit under `root`: the unit directory is
 * `<root>/<name>/`. Loads lazily on the first `loadAll` — this unit holds no
 * state, so opening touches nothing on the medium.
 * @param descriptor - Static identity and shape of the unit.
 * @param root - Absolute backend root directory.
 * @param onClose - Backend callback releasing the unit's open-slot.
 * @returns the opened unit.
 */
export declare function openPerRecordUnit(descriptor: KvUnitDescriptor, root: string, onClose: () => void): Promise<KvUnit>;
/**
 * One opened `per-record`-layout unit. Stateless by design: the directory is
 * the medium, the domain layer owns the live memory, and each method here is
 * a single durable file operation. Write ordering belongs to the caller (the
 * domain layer's write chain), exactly like the `single`-layout unit.
 */
export declare class PerRecordJsonUnit implements KvUnit {
    private readonly descriptor;
    private readonly dir;
    private readonly onClose;
    private closed;
    /** In-flight durable writes; close() drains them before releasing the unit. */
    private readonly inFlight;
    constructor(descriptor: KvUnitDescriptor, dir: string, onClose: () => void);
    /** Re-read the tree: the directory is the authoritative state. */
    loadAll(): Promise<{
        tables: Record<string, Record<string, unknown>>;
        global: unknown;
    }>;
    /** Durably replace one record: its own document, atomically. */
    putRecord(table: string, key: string, value: unknown): Promise<void>;
    /** Durably delete one record. Idempotent: a missing key is a no-op. */
    deleteRecord(table: string, key: string): Promise<void>;
    /**
     * Move one record's document aside as `<key>.json.bak.<YYYYMMDDHHmm>`. The
     * moved file no longer ends in `.json`, so every later read ignores it; the
     * bytes stay on disk for inspection. A same-minute backup of the same
     * key overwrites the previous backup (the newer bytes are the ones worth
     * keeping).
     */
    backupRecord(table: string, key: string): Promise<string>;
    /** Durably replace the global singleton. Only valid when declared. */
    setGlobal(value: unknown): Promise<void>;
    /** Drain in-flight writes and release the unit. Idempotent. */
    close(): Promise<void>;
    private assertOpen;
    /** Resolve a declared table's directory; an undeclared table is a caller bug and throws. */
    private tableDir;
    /** Durably replace one document, creating its parent directory. */
    private writeDocument;
    /** Track one durable write so close() drains it. */
    private tracked;
}
//# sourceMappingURL=per-record-unit.d.ts.map