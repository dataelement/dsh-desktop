/**
 * Portable profile backups: configuration only, never installed packages.
 *
 * The profile directory is plain user data — aside from package.json it can
 * hold API keys (config.toml), tokens, or the WebDAV password when stored
 * server-side. Backups therefore behave like `dsh export` and carry the same
 * credential-warning disclaimer in the UI (review #63).
 */
export declare const BACKUP_FORMAT = "dsh-profile-backup";
export declare const MAX_BACKUP_BYTES: number;
/** File names that routinely contain credentials (backup exports).
 *  Values are never masked in place — the export is one-to-one for
 *  faithful restores — but presence is surfaced by the UI warning. */
export declare const SECRET_FILE_HINTS: RegExp;
/** Count of exported files whose names look like they carry credentials. */
export declare function secretFileCount(profile: string, explicitDir?: string): number;
export type BackupFile = {
    path: 'package.json';
    json: Record<string, unknown>;
} | {
    path: string;
    lines: string[];
};
export interface ProfileBackup {
    format: typeof BACKUP_FORMAT;
    version: 0.2;
    createdAt: string;
    profile: string;
    files: BackupFile[];
}
/** Serialize every profile file except dependencies, lock state, and market cache. */
export interface BackupOptions {
    /** Partial export: only these plugins (dependency names) are kept. */
    includeDeps?: string[];
    /**
     * With includeDeps, also carry the profile's other configuration files.
     * Config files are profile-scoped and cannot be attributed to individual
     * plugins, so this is all-or-nothing — the UI warns about secrets before
     * enabling it (the backup itself is one-to-one, never masked).
     */
    includeConfig?: boolean;
}
/**
 * Serialize every profile file except dependencies, lock state, and market
 * cache — or, with {@link BackupOptions.includeDeps}, only the manifest with
 * the selected plugins (plus, optionally, the other config files).
 */
export declare function createProfileBackup(profile: string, explicitDir?: string, opts?: BackupOptions): ProfileBackup;
export declare function validatedBackup(value: unknown): ProfileBackup;
/** Atomically overwrite backed-up files and return a rollback for install failure. */
export declare function restoreProfileBackup(profile: string, value: unknown, explicitDir?: string): {
    files: number;
    rollback(): void;
};
interface PublicAddress {
    address: string;
    family: 4 | 6;
}
/**
 * Ancestor collection URLs of a WebDAV file, outermost first.
 * `https://dav.example/a/b/x.json` → [`https://dav.example/a/`, `https://dav.example/a/b/`].
 * The server root itself is never included — it always exists, and some
 * providers reject MKCOL on it.
 */
export declare function webdavParentCollections(url: string): string[];
/**
 * Upload the backup, creating missing parent collections first (#102).
 *
 * WebDAV servers do not create intermediate collections implicitly, so a PUT
 * into a folder that does not exist yet fails — Jianguoyun answers 404, which
 * read as "sync is broken" rather than "make the folder first". MKCOL on an
 * existing collection answers 405, which is success for our purposes; any
 * other failure is left to the PUT to report, since some providers restrict
 * MKCOL while still accepting the upload.
 */
export declare function uploadWebdav(url: string, username: string, password: string, backup: ProfileBackup): Promise<void>;
/** Refuse non-global IPv4 targets, including metadata and carrier NAT ranges. */
export declare function isPublicIpv4(ip: string): boolean;
/** Only public internet target hostnames are reachable for WebDAV. */
export declare function isPublicHostname(hostname: string): boolean;
/**
 * Whether a WebDAV hostname may be fetched: public https targets only.
 * Exported for tests.
 */
export declare function isPublicTarget(hostname: string): boolean;
/** Only global-unicast IPv6 is usable for a server-side WebDAV connection. */
export declare function isPublicIpv6(ip: string): boolean;
/** Resolve once, reject every unsafe answer, and return the address to pin. */
export declare function resolvePublicAddress(hostname: string): Promise<PublicAddress>;
export declare function downloadWebdav(url: string, username: string, password: string): Promise<unknown>;
export interface PluginSelection {
    deps: Record<string, string>;
    bundles: string[];
}
/**
 * The selected plugins' dependency specs and bundle entries from a backup's
 * manifest. Only string specs survive — everything else in the manifest is
 * untrusted and ignored (partial restore touches nothing but these).
 */
export declare function extractPluginSelection(backup: ProfileBackup, includeDeps: string[]): PluginSelection;
/**
 * Merge a backup's manifest into the profile's current manifest so a restore
 * never deletes plugins the target machine already has: current deps stay,
 * backup specs win on name conflicts; bundle lists are unioned. When
 * `selection` is given, only the selected plugins are merged in.
 */
/**
 * Dependencies whose spec points at an absolute local path — `link:/Users/…`
 * or `file:/home/…` (#205 by @Rudyy898).
 *
 * These are perfectly valid on the machine that wrote them and meaningless
 * anywhere else, so a backup carrying one restores a manifest that `pnpm
 * install` cannot satisfy: the path does not exist on the new machine and
 * the whole restore fails on it.
 *
 * Reported, NOT rewritten. Turning `link:/Users/me/dev/plugin` into
 * something portable means deciding where those files should live and
 * whether to carry them at all, which is a design question and not
 * something a restore should answer on the user's behalf. Naming them lets
 * the operator decide before the install runs — which is the part that was
 * missing.
 *
 * Relative `file:./vendor/x` specs are left alone: they resolve against the
 * profile directory, which the restore recreates, so they travel fine.
 */
export declare function unportableDeps(dependencies: unknown): Array<{
    name: string;
    spec: string;
}>;
export declare function mergeRestoreManifest(backupManifest: Record<string, unknown>, current: Record<string, unknown>, selection?: PluginSelection): Record<string, unknown>;
export {};
