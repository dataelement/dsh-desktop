/**
 * File-backed credentials provider over `$DSH_HOME/.credentials.yaml`, layered
 * against the environment by how much each layer is trusted:
 *
 * ```text
 * inherited process environment      (read-only, wins)
 * > $DSH_HOME/.credentials.yaml      (provider-managed, writable)
 * > <invocation cwd>/.env            (read-only fallback)
 * > $DSH_HOME/.env                   (read-only fallback)
 * ```
 *
 * The inherited environment wins because `DEEPSEEK_API_KEY=… dsh`, a CI
 * secret, or a container `-e` is this run's explicit intent; it cannot be
 * edited from inside, so it must be *visibly* read-only rather than silently
 * shadow writes. Everything below it loses to the managed store, so a key the
 * Models page writes takes effect immediately even when an older key sits in
 * the user's `.env`.
 *
 * The invoking project may supply a key, because the product trusts the
 * project it is launched in. It ranks below the managed store, so a key stored
 * through the Models page is never displaced by one a checkout happens to carry.
 *
 * The file is the provider-managed writable source: every write re-reads the
 * document under a cross-process writer lock before patching only its own key
 * — comments and the formatting of every untouched entry survive — external
 * edits hot-publish through the seam, and each reload replaces the snapshot
 * wholesale so a deleted entry never lingers in memory.
 *
 * The document holds nothing but credentials, which is why it is a strict
 * `CredentialRef`-to-string mapping rather than a dotenv file: a store the
 * Harness owns and never materializes into the environment cannot also serve
 * as the user's environment layer; a store that doubled as the environment
 * layer would shadow non-secret entries behind its precedence, making them
 * silently unreachable.
 * @module @deepseek-ai/dsh-credentials-local
 */
import { Context, Service } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { CredentialProvider } from '@deepseek-ai/dsh-credentials';
import type { CredentialInfo, CredentialKey, CredentialRecord, CredentialRecordEntry, CredentialRecordInfo, CredentialRef, ResolvedCredential } from '@deepseek-ai/dsh-credentials';
/** Basename of the credentials document inside the harness home. */
export declare const CREDENTIALS_FILENAME = ".credentials.yaml";
/** Plugin config: file location and hot-reload behavior. */
export interface Config {
    /** Credentials document path; defaults to `.credentials.yaml` under the harness home. */
    path?: string;
    /** Harness home used when `path` is omitted; defaults to `$DSH_HOME` or `~/.dsh`. */
    dshHome?: string;
    /** Watch the document and hot-publish external edits; defaults to true. */
    watch?: boolean;
    /** Watcher write-settle window in milliseconds; defaults to 100. */
    debounceMs?: number;
}
/** Fully resolved provider parameters; defaulting happens here, never inline. */
interface ResolvedSpec {
    filename: string;
    watch: boolean;
    debounceMs: number;
}
/**
 * Resolve the runtime spec from plugin config: an explicit `path` wins,
 * otherwise the document lives at `<harness home>/.credentials.yaml`.
 * @param config - raw plugin config.
 * @returns the resolved file location and watch behavior.
 */
export declare function resolveSpec(config: Config): ResolvedSpec;
/** The document layout this build reads and writes. */
export declare const DOCUMENT_VERSION = 1;
/** One parsed credentials document: the two key spaces it stores, keyed as written. */
export interface CredentialsDocument {
    /** Reference entries, keyed by {@link CredentialRef}. */
    refs: Map<string, string>;
    /** Stored records, keyed by {@link CredentialKey}. */
    records: Map<string, CredentialRecord>;
}
/**
 * Parse one credentials document. Everything is rejected rather than skipped —
 * an unversioned root, an unknown top-level key, a key that is not addressable,
 * a wrong-typed value, an unknown record tag or field — because this file holds
 * nothing but credentials and a silently ignored entry reads as "the credential
 * I stored has no effect". Duplicate keys surface as parser errors. An empty
 * document is an empty store and needs no version.
 * @param text - the document's text.
 * @param filename - absolute path, quoted in errors.
 * @returns the parsed references and records.
 */
export declare function parseCredentialsDocument(text: string, filename: string): CredentialsDocument;
/**
 * Render the version-1 layout for a pre-release flat document, or `undefined`
 * for anything else. The flat layout is recognized exactly — a non-empty
 * top-level mapping of addressable reference names to non-empty string
 * scalars, with no `version` key and no document directives — and the rewrite
 * nests the original lines verbatim under `refs:` at two spaces' indent, so
 * comments, blank lines, and each value's spelling survive byte for byte.
 * Anything the recognizer declines keeps {@link parseCredentialsDocument}'s
 * loud rejection: a document this build cannot prove it understands is never
 * rewritten. Remove with the pre-release stance at the first tagged release.
 * @param text - the document's text.
 * @returns the migrated text, or `undefined` when the text is not the recognized flat layout.
 */
export declare function renderFlatLayoutMigration(text: string): string | undefined;
/** File-backed credentials provider (`$DSH_HOME/.credentials.yaml`). */
export declare class LocalCredentialProvider extends CredentialProvider {
    config: Config;
    static Config: z<Config>;
    private readonly spec;
    /**
     * Raw text of the last read or persisted document; `undefined` while the
     * file is absent. Watcher events whose content equals this cache are no-ops,
     * which is also the self-write suppression.
     */
    private text;
    /** Parsed reference snapshot; replaced wholesale on every reload. */
    private values;
    /** Parsed record snapshot; replaced wholesale on every reload. */
    private records;
    /**
     * Single exclusive operation chain: watcher reloads and line edits run one
     * at a time in queue order (settled tail), so an edit can never render from
     * text a concurrent reload is busy replacing.
     */
    private operations;
    /** Set at dispose: refuse new writes and let in-flight work no-op. */
    private closed;
    /** Opaque read of {@link closed}: control flow cannot narrow it across awaits. */
    private isClosed;
    constructor(ctx: Context, config: Config);
    /** The inherited-environment value for a reference, or `undefined` when empty or unset. */
    private inherited;
    /**
     * The `.env` fallback for a reference — below the managed store, never above
     * it. The invoking project ranks over the user's home file, matching the
     * environment layering: the more specific location wins.
     */
    private dotenvFallback;
    [Service.init](): AsyncGenerator<() => Promise<void> | void, void, void>;
    resolve(ref: CredentialRef): Promise<ResolvedCredential | undefined>;
    describe(ref: CredentialRef): Promise<CredentialInfo>;
    set(ref: CredentialRef, value: string): Promise<void>;
    unset(ref: CredentialRef): Promise<void>;
    readRecord(key: CredentialKey): Promise<CredentialRecord | undefined>;
    describeRecord(key: CredentialKey): Promise<CredentialRecordInfo>;
    listRecords(): Promise<readonly CredentialRecordEntry[]>;
    modifyRecord(key: CredentialKey, mutate: (current: CredentialRecord | undefined) => Promise<CredentialRecord | undefined>): Promise<CredentialRecord | undefined>;
    deleteRecord(key: CredentialKey): Promise<void>;
    /** Queue one exclusive document operation behind every earlier one. */
    private enqueue;
    /** Queue a reload; only an invariant violation escaping the fan-out can reject it. */
    private queueRefresh;
    /** Queue one line edit; entry checks reject early, the queue re-judges them at run time. */
    private write;
    /**
     * Reject a write the inherited environment would shadow into apparent
     * no-effect. Only that layer can shadow a write: everything else this
     * provider resolves ranks below the document being written.
     */
    private assertUnshadowed;
    /**
     * Boot read: an absent file is an empty store; an invalid one fails the
     * plugin's activation, because a credentials document that exists but
     * cannot be trusted must never be treated as "no credentials stored". The
     * one exception is the recognized pre-release flat layout, which is
     * upgraded in place first — a key stored by an earlier build must survive
     * the layout change without a hand edit.
     */
    private loadInitial;
    /**
     * One-shot upgrade of the recognized pre-release flat layout, before the
     * watcher exists. The rewrite runs under the document's writer lock and
     * re-reads first — a concurrent boot may have migrated already — and
     * whatever the re-read finds that is not the flat layout is returned
     * untouched for the ordinary parse. Values are carried verbatim; only the
     * enclosing layout changes. Remove with the pre-release stance at the
     * first tagged release.
     * @returns the document text this boot should parse.
     */
    private migrateFlatDocument;
    /**
     * Re-read the document after a watcher event. Unchanged content (including
     * this provider's own writes) is a no-op; an unreadable document keeps the
     * last good snapshot and warns — a live hot-reload must never take the
     * process down. An invariant violation escaping the fan-out is not a reload
     * failure and propagates to the queue's error surface.
     */
    private refresh;
    /**
     * Compare the on-disk text against the cache and publish any difference
     * into the seam. Absence publishes the empty store; an unreadable or
     * invalid document throws, so each caller picks its policy — a reload warns
     * and keeps the last good snapshot, a write fails loud rather than
     * overwriting a document it could not understand.
     */
    private reconcileFromDisk;
    /** Entries whose stored value changed; the parser has already proven every key addressable. */
    private changedRefs;
    /** Records whose stored value changed; the parser has already proven every key addressable. */
    private changedRecords;
}
export default LocalCredentialProvider;
//# sourceMappingURL=index.d.ts.map