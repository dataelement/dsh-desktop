/**
 * JSON storage backend: one human-readable document per unit under a
 * configured root — a whole-unit file (`single` layout) or one document per
 * record (`per-record` layout), published by atomic rewrite. Registers as
 * backend `json` on the storage hub.
 * @module @deepseek-ai/dsh-storage-json
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { KvFacet, StorageBackend } from '@deepseek-ai/dsh-storage';
/** Cordis plugin name. */
export declare const name = "storage-json";
/** The hub must exist before the backend can register. */
export declare const inject: string[];
/**
 * Plugin configuration.
 * `root` has NO default on purpose: a `process.cwd()` fallback would scatter
 * unit files wherever the process happens to start; assemblies state the
 * location explicitly.
 */
export interface Config {
    /** Directory holding one `<unit>.json` file (or `<unit>/` tree) per unit. */
    root: string;
}
/** Config schema. */
export declare const Config: z<Config>;
/** JSON backend: owns the file-tree root and serves the `kv` facet. */
export declare class JsonStorageBackend implements StorageBackend {
    private readonly root;
    private readonly open;
    private readonly opening;
    private closed;
    constructor(root: string);
    readonly kv: KvFacet;
    private openUnit;
    close(): Promise<void>;
}
/**
 * Register the `json` backend on the storage hub.
 * @param ctx - Plugin context.
 * @param config - Validated configuration.
 */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map