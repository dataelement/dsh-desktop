import { EntryGroup, EntryTree, type EntryOptions } from '@deepseek-ai/cordis-plugin-loader';
import { Context, Service } from '@deepseek-ai/cordis';
import * as yaml from 'js-yaml';
/**
 * The entry-list YAML dialect: `!!js` scalars round-trip as expression nodes
 * the Loader evaluates at entry activation. Exported so config tooling
 * (`dsh --dump-config`) parses and prints exactly the dialect this include
 * mounts.
 */
export declare const entryListSchema: yaml.Schema;
/**
 * Apply patch lists to an entry list — THE patch semantics of this include,
 * shared by mounting (`applyPatches`) and offline config tooling
 * (`dsh --dump-config`) so a dump can never drift from what boots. The input
 * is never mutated and the result is always detached from it (even with no
 * patches): patching or mounting shared entry objects would bake earlier
 * values into the cached parse, so repeated application (config hot-reloads)
 * could never revert a removed or changed patch. Inserted entries are indexed
 * as they are added, so a later patch in the same list can target a row an
 * earlier patch inserted. A patch that matches nothing warns and is skipped.
 * @param data - the parsed entry list (JSON-safe plain data).
 * @param patches - the patch list to apply, in order.
 * @param warn - sink for skipped-patch diagnostics (printf-style, `%C` = code).
 * @returns a detached entry list with every applicable patch applied.
 */
export declare function applyEntryPatches(data: EntryOptions[], patches: PatchOptions[] | undefined, warn: (message: string, ...args: any[]) => void): EntryOptions[];
/** Runtime patch applied to entries loaded from an included config file. */
export interface PatchOptions {
    id?: string;
    insert?: EntryOptions[];
    name?: string;
    config?: any;
    group?: boolean | null;
    disabled?: boolean | null;
    inject?: any;
    intercept?: any;
    isolate?: any;
    [key: string]: any;
}
/** Config namespace for the file-backed include loader. */
export declare namespace Include {
    /** Config for a file-backed loader subtree. */
    interface Config {
        /** YAML or JSON path resolved from `ctx.baseUrl`. */
        path: string;
        /** Entry list written when the file does not already exist. */
        initial?: any[];
        /** Runtime patches applied after reading the file. */
        patches?: PatchOptions[];
        /** Enables loader apply/reload/unload logs for this subtree. */
        enableLogs?: boolean;
    }
}
/** Loader entry tree backed by a YAML or JSON file. */
export declare class Include extends EntryTree {
    config: Include.Config;
    static inject: string[];
    static readonly [EntryGroup.key] = true;
    filename: string;
    private type?;
    private readonly;
    private content?;
    private data?;
    private writeTask?;
    private pendingWrite?;
    private writeQueue;
    private applyQueue;
    constructor(ctx: Context, config: Include.Config);
    /**
     * Serialize one child-tree mutation behind every earlier one. The group's
     * transactional `update` is not reentrant: two concurrent applies (the init
     * apply racing an HMR-triggered refresh from the watcher's initial scan)
     * interleave create and rollback on the same entries and strand the include
     * fiber without settling, so every apply path funnels through this queue.
     * A predecessor's failure is its own caller's outcome and never gates the
     * next task.
     */
    private enqueue;
    private checkAccess;
    private read;
    private applyPatches;
    [Service.init](): AsyncGenerator<() => Promise<void>, void, unknown>;
    stop(): Promise<void>;
    /**
     * Re-read the file and transactionally refresh child entries when content changed.
     * @returns a promise resolving after the new tree commits, or immediately when unchanged.
     * @throws when reading, parsing, validation, application, or rollback fails; the last good tree remains active when rollback succeeds.
     */
    refresh(): Promise<void>;
    private apply;
    private _apply;
    private _writeFile;
    private writeFile;
    private flushWrite;
    /** Schedule a write of the current root entry data. */
    write(): void;
}
export default Include;
//# sourceMappingURL=index.d.ts.map