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
import { gunzipSync } from 'node:zlib';
import { marketFetch } from "./net.js";
/** Long enough for a multi-megabyte tarball on a slow link, short enough to fall back. */
const TIMEOUT_MS = 20_000;
/**
 * A tar entry header, as far as this needs to read one.
 *
 * Written out rather than pulled from a dependency: the format is 512-byte
 * headers with the name at offset 0 and an octal size at 124, and a reader
 * for one known filename is shorter than the argument for adding a package
 * to a plugin's runtime.
 */
const NAME_OFFSET = 0;
const NAME_LENGTH = 100;
const SIZE_OFFSET = 124;
const SIZE_LENGTH = 12;
const TYPE_OFFSET = 156;
const BLOCK = 512;
/**
 * One file's bytes from a gzipped tar, or null when it is not in there.
 *
 * @param gz - the gzipped tarball.
 * @param wanted - the exact entry name, npm-style (`package/plugins.json`).
 */
export function fileFromTarball(gz, wanted) {
    const buf = gunzipSync(gz);
    let offset = 0;
    while (offset + BLOCK <= buf.length) {
        const name = buf.toString('utf8', offset + NAME_OFFSET, offset + NAME_OFFSET + NAME_LENGTH).replace(/\0.*$/s, '');
        // Two consecutive empty headers end a tar; one is enough to stop here.
        if (name === '')
            break;
        const rawSize = buf.toString('ascii', offset + SIZE_OFFSET, offset + SIZE_OFFSET + SIZE_LENGTH).replace(/\0.*$/s, '').trim();
        const size = Number.parseInt(rawSize, 8);
        if (!Number.isFinite(size) || size < 0)
            break;
        const type = String.fromCharCode(buf[offset + TYPE_OFFSET] ?? 0);
        offset += BLOCK;
        // '0' and NUL both mean a regular file; anything else (directories,
        // links, pax headers) is skipped rather than mistaken for content.
        if ((type === '0' || type === '\0') && name === wanted) {
            return buf.subarray(offset, offset + size);
        }
        offset += Math.ceil(size / BLOCK) * BLOCK;
    }
    return null;
}
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
export async function catalogFromPackage(registry, pkg, known, 
/** The entry to extract; the catalog package carries `plugins.json`, companions theirs. */
file = 'package/plugins.json') {
    const metaRes = await marketFetch(`${registry}/${encodeURIComponent(pkg)}/latest`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { accept: 'application/json', 'user-agent': 'dsh-market' },
    });
    if (!metaRes.ok)
        throw new Error(`HTTP ${String(metaRes.status)} reading ${pkg} metadata`);
    const meta = (await metaRes.json());
    const version = typeof meta.version === 'string' ? meta.version : null;
    const tarball = typeof meta.dist?.tarball === 'string' ? meta.dist.tarball : null;
    if (version === null || tarball === null)
        throw new Error(`${pkg} metadata names no version or tarball`);
    // Nothing changed, so nothing to download. The whole point of putting the
    // catalog on a mirror is the bytes it saves; re-fetching a package we
    // already hold would give most of them back.
    if (known !== undefined && known === version)
        return { version, data: null };
    // Follow `dist.tarball` rather than composing a URL. A mirror rewrites
    // this field to its own host, and composing one would send the download
    // back to the origin registry the region exists to avoid.
    const tarRes = await marketFetch(tarball, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!tarRes.ok)
        throw new Error(`HTTP ${String(tarRes.status)} reading ${pkg} tarball`);
    const bytes = fileFromTarball(Buffer.from(await tarRes.arrayBuffer()), file);
    if (bytes === null)
        throw new Error(`${pkg}@${version} carries no ${file}`);
    return { version, data: JSON.parse(bytes.toString('utf8')) };
}
