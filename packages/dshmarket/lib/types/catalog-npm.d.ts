/**
 * Reading the plugin catalog out of a published npm package.
 *
 * The catalog's own host is the thing being worked around. `plugins.json` is
 * served from GitHub Pages, and the public GitHub proxies that make GitHub
 * usable from mainland China refuse any hostname that is not github.com's
 * own — measured: the project domain comes back 403. So the file cannot be
 * carried through the same route as everything else while it lives there.
 *
 * Published to npm it can be. Every China npm mirror already carries it, it
 * is the same infrastructure the plugins themselves arrive on, and it needs
 * no service that did not already have to work. It also gains a version
 * number, which the origin never had: a catalog build that ships bad data
 * can be rolled back instead of only being fixed forwards.
 *
 * Mirrors rewrite `dist.tarball` to point at themselves, so following that
 * field is what keeps the download on the mirror rather than bouncing back
 * to the origin registry — verified against the Tencent mirror, which serves
 * its own host in that field.
 */
/**
 * One file's bytes from a gzipped tar, or null when it is not in there.
 *
 * @param gz - the gzipped tarball.
 * @param wanted - the exact entry name, npm-style (`package/plugins.json`).
 */
export declare function fileFromTarball(gz: Buffer, wanted: string): Buffer | null;
/**
 * The catalog carried by a published package, and the version it came from.
 *
 * The version doubles as the cache validator — a better one than an ETag,
 * because it is meaningful to a human reading a log and it is the thing a
 * rollback would change.
 *
 * @param registry - registry base, no trailing slash.
 * @param pkg - package name.
 * @param known - a version already held, to skip re-downloading.
 * @returns the parsed JSON and its version, or `{ version, data: null }` when
 *   the published version is the one already held.
 * @throws when the package, the tarball or the file inside it cannot be read.
 */
export declare function catalogFromPackage(registry: string, pkg: string, known?: string, 
/** The entry to extract; the catalog package carries `plugins.json`, companions theirs. */
file?: string): Promise<{
    version: string;
    data: unknown | null;
}>;
