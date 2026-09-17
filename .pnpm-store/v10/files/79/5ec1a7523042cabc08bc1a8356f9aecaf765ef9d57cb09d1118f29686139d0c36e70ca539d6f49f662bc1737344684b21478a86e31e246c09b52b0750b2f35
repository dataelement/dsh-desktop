/**
 * `LocalSpillStore`: the host-filesystem implementation of the
 * `@deepseek-ai/dsh-spill` storage seam. Persists oversized text to a
 * private, session-scoped file (see `./store.ts` for the traversal-safe naming
 * and exclusive owner-only write) and returns a path locator plus local
 * read/grep retrieval guidance. After activation it runs one best-effort
 * startup sweep that reclaims spill files older than `cleanupPeriodDays`.
 *
 * @module @deepseek-ai/dsh-spill-local
 */
import { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { SpillStore } from '@deepseek-ai/dsh-spill';
import type { SaveTextSpill, SpillRef } from '@deepseek-ai/dsh-spill';
import type { SweepRoot, WarnFn } from './cleanup.ts';
export { discoverDefaultRoots, sweepSpillRoots } from './cleanup.ts';
export type { SweepOptions, SweepRoot, WarnFn } from './cleanup.ts';
export { DEFAULT_ROOT_PREFIX, encodeSegment, isErrno, privateRoot, saveTextFile, sessionDir } from './store.ts';
export type { SavedText, SaveTextOptions } from './store.ts';
/** Plugin config (all optional — `static Config` supplies the defaults). */
export interface Config {
    /**
     * Root directory for spill files. Omitted uses a lazily-created private
     * (0700) per-process directory under the OS temp dir — the safe default for
     * a local deployment. Set it to keep spill files under a known location.
     */
    root?: string;
    /**
     * Age in days after which a spill file is eligible for the one-shot startup
     * cleanup sweep. Defaults to `30`; `0` disables cleanup entirely. Files whose
     * `mtime` is strictly older than the cutoff are deleted and emptied
     * directories are pruned; fresh files, symlinks, and unrelated entries are
     * left untouched. On POSIX, cleanup skips roots and session directories that
     * another local user could modify or replace. Retention is deliberate — a
     * resumed or forked session may still reference an older locator until it
     * ages out.
     */
    cleanupPeriodDays?: number;
}
/** The shape after schemastery applied the defaults. */
type ResolvedConfig = Required<Omit<Config, 'root'>> & Pick<Config, 'root'>;
/**
 * Local-filesystem spill backend. Files land under `<root>/session-<hash>/…`
 * with unpredictable names, an exclusive owner-only (0600) write, and a private
 * (0700) root — a spilled tool result must not be readable by other local users
 * or redirectable via a planted symlink.
 *
 * After activation it launches ONE best-effort cleanup sweep (see
 * {@link cleanupPeriodDays}) that reclaims expired spill files without delaying
 * service availability; the sweep is owned by the plugin fiber and awaited
 * during disposal, so a fiber unload never returns before it quiesces.
 */
export declare class LocalSpillStore extends SpillStore {
    static Config: z<Config>;
    /** Resolved absolute spill root (config `root`, else the private default), fixed at construction. */
    readonly root: string;
    /** Validated config (schemastery applied the `cleanupPeriodDays` default before construction). */
    readonly config: ResolvedConfig;
    /**
     * The in-flight (or settled) startup cleanup sweep. Held so disposal can await
     * it; `undefined` when cleanup is disabled (`cleanupPeriodDays === 0`).
     */
    private cleanup;
    constructor(ctx: Context, config: Config);
    /**
     * Run the one-shot cleanup: gather the roots to sweep (see {@link gatherRoots})
     * and sweep all of them at the age cutoff. Best-effort —
     * {@link sweepSpillRoots} contains every filesystem failure, so this never
     * rejects and cannot fail activation or a concurrent spill write.
     *
     * @param warn - sink for a contained filesystem failure.
     * @returns Resolves when the sweep finishes (never rejects).
     */
    private runCleanup;
    /**
     * The roots the startup sweep covers: each discovered prior-default
     * `dsh-spill-*` temp root (see {@link discoverDefaultRoots}), pruned when
     * emptied, plus the active/configured root, which is never itself pruned while
     * the live process may write into it. Empty session directories are pruned in
     * every root. Filesystem identity de-duplicates aliases before the active root
     * overrides a discovered match as non-prunable. A test overrides this to
     * inject an isolated root set — and, being the sweep's one async gather point,
     * to hold the sweep open across a disposal for the quiescence check; it is a
     * test seam, not a deployment knob.
     *
     * @param warn - sink for a contained discovery failure.
     * @returns The roots to sweep, each flagged for prune-when-empty.
     */
    protected gatherRoots(warn: WarnFn): Promise<SweepRoot[]>;
    /**
     * The directory scanned for prior default `dsh-spill-*` roots — the OS tmpdir,
     * where {@link privateRoot} creates them (accumulation only happens there). A
     * test overrides this to point discovery at an isolated fixture instead of the
     * real tmpdir; it is a test seam, not a deployment knob.
     *
     * @returns The base directory to scan for default spill roots.
     */
    protected defaultRootsBase(): string;
    saveText(input: SaveTextSpill): Promise<SpillRef>;
}
export default LocalSpillStore;
//# sourceMappingURL=index.d.ts.map