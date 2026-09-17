/**
 * File-backed settings provider. One YAML or JSON document under the user's
 * harness home carries every namespace section; external edits hot-publish
 * through the seam, and every write re-reads the document under a
 * cross-process writer lock before patching it as a comment-preserving
 * leaf-level diff.
 * @module @deepseek-ai/dsh-settings-file
 */
import { Context, Service } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { SettingsProvider, type SettingsNamespace } from '@deepseek-ai/dsh-settings';
/** Plugin config: file location and hot-reload behavior. */
export interface Config {
    /** Settings document path; defaults to `settings.yaml` under the harness home. */
    path?: string;
    /** Harness home used when `path` is omitted; defaults to `$DSH_HOME` or `~/.dsh`. */
    dshHome?: string;
    /** Watch the document and hot-publish external edits; defaults to true. */
    watch?: boolean;
    /** Watcher write-settle window in milliseconds; defaults to 100. */
    debounceMs?: number;
}
/** Document format derived from the configured file extension. */
type SettingsFormat = 'yaml' | 'json';
/** Fully resolved provider parameters; defaulting happens here, never inline. */
interface ResolvedSpec {
    filename: string;
    format: SettingsFormat;
    watch: boolean;
    debounceMs: number;
}
/**
 * Resolve the runtime spec from plugin config: an explicit `path` wins,
 * otherwise the document lives at `<harness home>/settings.yaml`.
 * @param config - raw plugin config.
 * @returns the resolved file location, format, and watch behavior.
 */
export declare function resolveSpec(config: Config): ResolvedSpec;
/** File-backed settings provider (`settings.yaml`/`.json`). */
export declare class FileSettingsProvider extends SettingsProvider {
    config: Config;
    static Config: z<Config>;
    private readonly spec;
    /**
     * Raw text of the last successfully parsed or persisted document;
     * `undefined` while the file is absent. Watcher events whose content equals
     * this cache are no-ops, which is also the self-write suppression.
     */
    private text;
    /**
     * Single exclusive operation chain: watcher reloads and document writes run
     * one at a time in queue order (settled tail), so a write can never render
     * from text a concurrent reload is busy replacing, and a reload can never
     * read a half-committed write.
     */
    private operations;
    /** Set at dispose: refuse new watcher events and let in-flight work no-op. */
    private closed;
    /** Opaque read of {@link closed}: control flow cannot narrow it across awaits. */
    private isClosed;
    constructor(ctx: Context, config: Config);
    /** The local document is always writable through {@link SettingsProvider.update}. */
    get writable(): boolean;
    /** The resolved YAML/JSON document path exposed to local configuration surfaces. */
    get documentPath(): string;
    /** Materialize an absent owner-only document, then return its resolved path. */
    prepareDocument(): Promise<string>;
    protected load(): Promise<Record<string, unknown>>;
    protected persist(ns: SettingsNamespace, section: Record<string, unknown>): Promise<void>;
    /** Queue one exclusive document operation behind every earlier one. */
    private enqueue;
    /** Queue a reload; only an invariant violation escaping a commit can reject it. */
    private queueRefresh;
    private persistSection;
    [Service.init](): AsyncGenerator<() => Promise<void> | void, void, void>;
    /** Parse one document text into raw sections, failing on a non-map root. */
    private parse;
    /**
     * Re-read the document after a watcher event. Unchanged content (including
     * this provider's own writes) is a no-op; an unreadable or unparsable
     * document keeps the last good sections and warns — a live hot-reload must
     * never take the process down. An invariant violation escaping a commit is
     * not a reload failure and propagates to the queue's error surface.
     */
    private refresh;
    /**
     * Compare the on-disk text against the cache and publish any difference
     * into the seam. Absence publishes the empty document; an unreadable or
     * unparsable file throws, so each caller picks its policy — a reload warns
     * and keeps the last good document, a write fails loud.
     */
    private reconcileFromDisk;
    /**
     * Render the next YAML text by patching one namespace in the
     * comment-preserving document. The next section lands as a leaf-level diff
     * against the stored one — only changed values set, only removed keys
     * delete — so comments inside the section survive edits to their siblings,
     * not just comments outside it.
     */
    private renderYaml;
    /** Render the next JSON text by replacing one namespace key. */
    private renderJson;
}
export default FileSettingsProvider;
//# sourceMappingURL=index.d.ts.map