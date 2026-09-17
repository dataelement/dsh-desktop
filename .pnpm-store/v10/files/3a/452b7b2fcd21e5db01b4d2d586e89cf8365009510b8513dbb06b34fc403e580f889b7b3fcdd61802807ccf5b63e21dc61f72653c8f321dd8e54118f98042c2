/**
 * One opened JSON unit in `single` layout: the whole unit is one document at
 * `<root>/<name>.json`. The in-memory state is authoritative; every write
 * primitive mutates it and republishes the whole file atomically. Writes are
 * NOT queued here — per the backend contract, write ordering belongs to the
 * caller (the domain layer's write chain); this unit only guarantees that
 * each single call publishes a complete, durable file. The `per-record`
 * layout is a separate unit class in `per-record-unit.ts`.
 * @module @deepseek-ai/dsh-storage-json/src/single-unit
 */
import type { KvUnit, KvUnitDescriptor } from '@deepseek-ai/dsh-storage';
/**
 * Open (load or lazily create) one `single`-layout unit under `root`: the
 * unit file is `<root>/<name>.json`.
 * @param descriptor - Static identity and shape of the unit.
 * @param root - Absolute backend root directory.
 * @param onClose - Backend callback releasing the unit's open-slot.
 * @returns the opened unit.
 */
export declare function openSingleUnit(descriptor: KvUnitDescriptor, root: string, onClose: () => void): Promise<KvUnit>;
//# sourceMappingURL=single-unit.d.ts.map