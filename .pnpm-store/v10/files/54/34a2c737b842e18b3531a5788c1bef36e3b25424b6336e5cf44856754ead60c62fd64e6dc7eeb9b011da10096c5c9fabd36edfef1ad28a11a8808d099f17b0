import { Context } from '@deepseek-ai/cordis';
import { type Dict } from '@deepseek-ai/cosmokit';
import { Entry, type EntryOptions } from './entry.ts';
import { EntryGroup } from './group.ts';
/** Mutable tree of loader entries. Persistence is supplied by subclasses. */
export declare abstract class EntryTree {
    static readonly sep = ":";
    ctx: Context;
    enableLogs?: boolean;
    root: EntryGroup;
    store: Dict<Entry>;
    constructor(ctx: Context);
    get context(): Context;
    /** Iterate entries in this tree and any nested subtrees. */
    entries(): Generator<Entry, void, void>;
    /** Return pending import and lifecycle tasks owned by this tree. */
    getTasks(): Promise<void>[];
    /**
     * Wait until this tree has no active import or lifecycle tasks.
     * @throws a settled fiber failure, or an aggregate when several fibers failed.
     */
    await(): Promise<void>;
    ensureId(options: Partial<EntryOptions>): string;
    /** Resolve an entry by id, including nested ids separated by `EntryTree.sep`. */
    resolve(id: string): Entry;
    resolveGroup(id: string | null): EntryGroup;
    /** Create an entry in the root group or a nested group. */
    create(options: Omit<EntryOptions, 'id'>, parent?: string | null, position?: number): Promise<string>;
    /** Stop and remove an entry from its parent group. */
    remove(id: string): Promise<void>;
    /** Update an entry and optionally move it to another group. */
    update(id: string, options: Omit<EntryOptions, 'id' | 'name'>, parent?: string | null, position?: number): Promise<void>;
    /** Import a plugin module from a specifier or `cordis:` builtin. */
    import(name: string, getOuterStack?: () => string[]): any;
    /** Persist current tree state. In-memory trees may implement this as a no-op. */
    abstract write(): void;
}
//# sourceMappingURL=tree.d.ts.map