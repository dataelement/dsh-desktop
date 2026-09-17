/**
 * On-disk JSON unit format: the file is always the current net state, kept
 * human-readable (pretty-printed, stable key order from insertion) — that
 * legibility is this backend's reason to exist. `single`-layout units are
 * one document with a unit header; `per-record`-layout units are a directory
 * with one version-stamped document per record (`<table>/<key>.json`) plus a
 * `global.json` for the global slot, so a write rewrites one record instead
 * of the whole unit.
 * @module @deepseek-ai/dsh-storage-json/src/format
 */
import type { KvUnitDescriptor } from '@deepseek-ai/dsh-storage';
/** In-memory authoritative state of one unit; the file is its projection. `global` is `null` until first written. */
export interface UnitState {
    version: number;
    global: unknown;
    tables: Map<string, Map<string, unknown>>;
}
/**
 * Serialize a unit state to file content.
 * @param name - Unit name, stamped into the header.
 * @param state - Authoritative in-memory state.
 * @returns pretty-printed JSON document with a trailing newline.
 */
export declare function serialize(name: string, state: UnitState): string;
/**
 * Parse file content into unit state, validating shape and version.
 * @param text - Raw file content.
 * @param descriptor - Expected identity; version mismatch rejects.
 * @returns the parsed state.
 */
export declare function parse(text: string, descriptor: KvUnitDescriptor): UnitState;
/**
 * Serialize one per-record document: the unit's version stamp plus the
 * record value, pretty-printed like the whole-unit document.
 * @param version - Unit format version, stamped into the header.
 * @param value - The record value (or the global singleton value).
 * @returns pretty-printed JSON document with a trailing newline.
 */
export declare function serializeRecord(version: number, value: unknown): string;
/**
 * Parse one per-record document, validating its version stamp. A document
 * that is malformed or stamped with an unaccepted version is FOREIGN and
 * reads as absent — the per-record contract: one bad or stale record file
 * must not brick the whole unit, and an unaccepted version stamp discards the
 * record instead of migrating it (the whole-unit format rejects instead,
 * because there is exactly one document).
 * @param text - Raw per-record document content.
 * @param versions - Accepted unit versions (the current one plus the
 * descriptor's compatibleVersions); any other stamp discards the
 * document.
 * @returns the record value, or `undefined` for a foreign document.
 */
export declare function parseRecord(text: string, versions: readonly number[]): unknown;
//# sourceMappingURL=format.d.ts.map