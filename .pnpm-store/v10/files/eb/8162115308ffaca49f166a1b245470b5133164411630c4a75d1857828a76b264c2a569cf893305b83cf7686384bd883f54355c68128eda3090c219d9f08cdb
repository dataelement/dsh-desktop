import { Context, Service, type Fiber } from '@deepseek-ai/cordis';
import { type Dict } from '@deepseek-ai/cosmokit';
import { ModuleLoader } from './internal.ts';
import { Entry, type EntryOptions } from './config/entry.ts';
import { EntryTree } from './config/tree.ts';
/** Re-export entry node APIs. */
export * from './config/entry.ts';
/** Re-export nested entry group APIs. */
export * from './config/group.ts';
/** Re-export service isolation helpers. */
export * from './config/isolate.ts';
/** Re-export entry tree persistence APIs. */
export * from './config/tree.ts';
/** Re-export loader config expression helpers. */
export * from './config/utils.ts';
/** Re-export Node internal module loader compatibility types. */
export * from './internal.ts';
declare module '@deepseek-ai/cordis' {
    interface Events {
        'exit'(signal: NodeJS.Signals): Promise<void>;
        'loader/config-update'(): void;
        'loader/entry-init'(entry: Entry): void;
        'loader/partial-dispose'(entry: Entry, legacy: Partial<EntryOptions>, active: boolean): void;
        'loader/patch-context'(entry: Entry, next: () => void | Promise<void>): void | Promise<void>;
    }
    interface Context {
        loader: Loader;
    }
    interface EnvData {
        startTime?: number;
    }
    interface Fiber {
        entry?: Entry;
    }
}
/** Loader config and dependency intercept namespace. */
export declare namespace Loader {
    /** Root loader configuration. */
    interface Config {
        /** Base URL used to resolve relative plugin specifiers and config paths. */
        baseUrl?: string;
    }
    /** Intercept config used when other plugins depend on `loader`. */
    interface Intercept {
        /** Keep dependent plugins pending while loader entries are still loading. */
        await?: boolean;
    }
}
/**
 * Service that owns a loader entry tree and imports configured plugins.
 *
 * Subclasses provide persistence by implementing `write()` on `EntryTree`.
 */
export declare class Loader extends EntryTree {
    config: Loader.Config;
    [Service.config]: Loader.Intercept;
    envData: any;
    name: string;
    internal: ModuleLoader | undefined;
    builtins: Dict<any>;
    constructor(ctx: Context, config?: Loader.Config);
    write(): void;
    [Service.check](): boolean;
    showLog(entry: Entry, type: string): void;
    /** Return the loader entry id that owns `fiber`, if any. */
    locate(fiber?: Fiber): string | undefined;
    /** Hook for hosts that can restart the process on full-reload requests. */
    exit(): void;
    /** Normalize ESM/CJS/default export shapes before applying a plugin. */
    unwrapExports(exports: any): any;
}
export default Loader;
//# sourceMappingURL=index.d.ts.map