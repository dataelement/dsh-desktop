import { Context, Fiber, Inject } from '@deepseek-ai/cordis';
import { Loader } from '../index.ts';
import { EntryGroup } from './group.ts';
import { EntryTree } from './tree.ts';
/** Serialized plugin entry options stored in loader config files. */
export interface EntryOptions {
    /** Stable id inside the containing entry tree. */
    id: string;
    /** Module specifier imported by the entry tree. */
    name: string;
    /** Config passed to the plugin. */
    config?: any;
    /** Marks this entry as a nested group. */
    group?: boolean | null;
    /** Prevents this entry and descendants from running. */
    disabled?: boolean | null;
    /** Required services or service intercept config for this entry. */
    inject?: Inject | null;
}
/** One configured plugin node inside an `EntryTree`. */
export declare class Entry {
    loader: Loader;
    static readonly key: unique symbol;
    ctx: Context;
    fiber?: Fiber;
    parent: EntryGroup;
    options: EntryOptions;
    subgroup?: EntryGroup;
    subtree?: EntryTree;
    _initTask?: Promise<void>;
    _disposing: number;
    constructor(loader: Loader);
    get context(): Context;
    get id(): string;
    /** True when this entry or any owning parent entry is disabled. */
    get disabled(): boolean;
    private _disabled;
    /**
     * Effective disabled state: a `!!js` expression evaluates against the loader
     * context. The raw node stays in the options, so write-back keeps the form.
     */
    private disabledOf;
    evaluate(expr: string): any;
    private _patchContext;
    refresh(): Promise<void>;
    _dispose(fiber?: Fiber | undefined): Promise<void>;
    /** Merge new options, restart as needed, and persist through the parent tree. */
    update(options: Partial<EntryOptions>, create?: boolean, force?: boolean): Promise<void>;
    getOuterStack: () => string[];
    /** Import and start the configured plugin if it is not already running. */
    init(): Promise<void>;
    _await(): Promise<void>;
    private _init;
    private _start;
}
//# sourceMappingURL=entry.d.ts.map