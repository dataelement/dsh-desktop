/**
 * The host's definition registry as this page last read it, owned by the
 * plugin's apply closure.
 *
 * The panel is a frame-wide surface, so it cannot derive this from any session:
 * the registry is global and the read is a single global call. The rows are
 * re-read rather than patched, because the wire announcements
 * (`cordis/dynamic-package` / `/retract`) carry no labels and a definition
 * can appear or disappear between them — a patch-in-place cache would drift into
 * showing definitions the host no longer holds.
 *
 * Reads are single-flight: several announcements settling at once, or a badge
 * opening while a reconnect re-reads, must not multiply the call. Single-flight
 * alone would be wrong across a reconnect, though — the in-flight read belongs to
 * the previous connection, so a reset both discards its answer and frees the slot
 * for a fresh one. Without that, a reconnect either loses its re-read to the old
 * call or has the old host's rows published on top of it.
 */
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots';
import type { CordisDynamicPort, CordisInventoryRow } from './dynamic-port.ts';
import type { CordisDynamicPluginId } from './events.ts';
/** What the panel reads: the rows, and whether the first read has happened. */
export interface CordisInventorySnapshot {
    readonly rows: readonly CordisInventoryRow[];
    /** Plugins explicitly removed through this page, retained for historical cards. */
    readonly removed: ReadonlySet<CordisDynamicPluginId>;
    /**
     * False until a read settles. The panel shows a loading line rather than an
     * empty state, so "nothing defined yet" is never claimed before it is known.
     */
    readonly read: boolean;
    /** Last read failure, so the panel can say why it is empty. */
    readonly error?: string | undefined;
}
/** Inventory source: an observable of the rows plus the read trigger. */
export interface CordisInventory extends HostObservable<CordisInventorySnapshot> {
    /** Read the registry unless a read is already in flight. */
    refresh(): void;
    /** Record an explicit remove and drop the live row immediately. */
    retire(pluginId: CordisDynamicPluginId): void;
    /** Drop what was read; the next refresh starts from nothing (a reconnect may be a new host). */
    reset(): void;
}
/**
 * Create the inventory source.
 * @param port - the RPC seam the read goes through.
 * @param onError - reporter for a failed read (console in production, captured in specs).
 * @returns the inventory observable and its read trigger.
 */
export declare function createCordisInventory(port: CordisDynamicPort, onError: (error: unknown) => void): CordisInventory;
//# sourceMappingURL=inventory.d.ts.map