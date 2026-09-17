import { Context, Service, type Plugin } from '@deepseek-ai/cordis';
import { type ChokidarOptions } from 'chokidar';
import z from '@deepseek-ai/schemastery';
declare module '@deepseek-ai/cordis' {
    interface Context {
        hmr: Hmr;
    }
    interface Events {
        'hmr/change'(url: string): void;
        'hmr/reload'(reloads: Map<Plugin, Reload>): void;
        /**
         * A watched config-file refresh failed.
         * @param filename - Absolute path observed by HMR.
         * @param error - Normalized refresh failure.
         * @mode parallel
         */
        'hmr/config-update-failed'(filename: string, error: Error): Promise<void> | void;
    }
}
interface Reload {
    filename: string;
    runtime?: Plugin.Runtime;
}
declare class Hmr extends Service {
    config: Hmr.Config;
    static inject: string[];
    baseDir: string;
    private internal;
    private watcher;
    private readonly configs;
    private readonly configRefreshes;
    private readonly refreshTasks;
    /**
     * Changes from externals will always trigger a full reload.
     * Externals are the dependency tree of the CLI worker entry point.
     */
    private externals;
    /**
     * Files that should be reloaded (accepted changes).
     * Includes all stashed files and their dependents.
     */
    private accepted;
    /**
     * Files that should NOT be reloaded.
     * Includes externals and files whose dependents are all declined.
     */
    private declined;
    /** Stashed file changes waiting to be processed */
    private stashed;
    constructor(ctx: Context, config: Hmr.Config);
    /**
     * Watch one exact config path outside the configured module roots.
     * @param filename - Config path, resolved against the HMR base directory.
     * @param refresh - Refresh callback run serially on add, change, or unlink.
     * @returns an asynchronous disposer once the exact watch is ready.
     * @throws when HMR is inactive, the path is already registered, or watcher startup fails.
     */
    registerConfig(filename: string, refresh: () => Promise<void> | void): Promise<() => Promise<void>>;
    /**
     * Resolve a module specifier to a URL, compatible with Node 22-24.
     */
    private _resolve;
    [Service.init](): AsyncGenerator<() => Promise<void>, void, unknown>;
    private refreshConfig;
    getOuterStack: () => string[];
    getLinked(url: string): Promise<string[]>;
    /**
     * Classify changed files into accepted (should reload) and declined (should not).
     *
     * A file is accepted if it's directly changed (stashed) or if any of its
     * dependents are accepted. A file is declined if all its dependents are
     * declined or if it's an external.
     */
    private analyzeChanges;
    private partialReload;
}
declare namespace Hmr {
    interface Config extends ChokidarOptions {
        base?: string;
        root: string[];
        debounce: number;
        ignored: string[];
    }
    const Config: z<Config>;
}
export default Hmr;
//# sourceMappingURL=index.d.ts.map