/**
 * Portable profile backups: configuration only, never installed packages.
 *
 * The profile directory is plain user data — aside from package.json it can
 * hold API keys (config.toml), tokens, or the WebDAV password when stored
 * server-side. Backups therefore behave like `dsh export` and carry the same
 * credential-warning disclaimer in the UI (review #63).
 */
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync, } from 'node:fs';
import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { profileDir } from "./profile.js";
export const BACKUP_FORMAT = 'dsh-profile-backup';
export const MAX_BACKUP_BYTES = 2 * 1024 * 1024;
const MAX_FILES = 256;
const SKIP_NAMES = new Set(['node_modules', '.dsh-market', '.git', 'pnpm-lock.yaml']);
/** File names that routinely contain credentials (backup exports).
 *  Values are never masked in place — the export is one-to-one for
 *  faithful restores — but presence is surfaced by the UI warning. */
export const SECRET_FILE_HINTS = /(^|\/)(config\.toml|\.env(\.\w+)?|secrets?\.\w+t?j?s?o?n|pnpm-workspace\.yaml)$/i;
/** Count of exported files whose names look like they carry credentials. */
export function secretFileCount(profile, explicitDir) {
    let count = 0;
    for (const path of profileFiles(explicitDir ?? profileDir(profile))) {
        if (SECRET_FILE_HINTS.test(path))
            count += 1;
    }
    return count;
}
function profileFiles(root, dir = root) {
    const files = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        // Any .bak marker, not just the numeric-suffixed one this codebase
        // writes. Recovery and the host's own repair paths leave other shapes —
        // `package.json.bak-asm`, `cordis.patch.yml.rp-merged.bak` — and a
        // backup that carried them restored them too, so the profile came back
        // with the wreckage that made it need repairing (#205 by @Rudyy898).
        if (SKIP_NAMES.has(entry.name) || /\.bak\b/.test(entry.name))
            continue;
        const path = resolve(dir, entry.name);
        if (entry.isSymbolicLink())
            continue;
        if (entry.isDirectory())
            files.push(...profileFiles(root, path));
        else if (entry.isFile())
            files.push(relative(root, path).split(sep).join('/'));
        if (files.length > MAX_FILES)
            throw new Error(`profile has more than ${MAX_FILES} configuration files`);
    }
    return files;
}
/**
 * Serialize every profile file except dependencies, lock state, and market
 * cache — or, with {@link BackupOptions.includeDeps}, only the manifest with
 * the selected plugins (plus, optionally, the other config files).
 */
export function createProfileBackup(profile, explicitDir, opts) {
    const root = resolve(explicitDir ?? profileDir(profile));
    const manifestFile = resolve(root, 'package.json');
    if (!existsSync(manifestFile))
        throw new Error('profile package.json is missing');
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
    if (opts?.includeDeps !== undefined) {
        const include = new Set(opts.includeDeps);
        if (include.size === 0)
            throw new Error('no plugins selected');
        const dependencies = manifest.dependencies === null || typeof manifest.dependencies !== 'object' || Array.isArray(manifest.dependencies)
            ? {}
            : manifest.dependencies;
        const filteredDeps = {};
        for (const [name, spec] of Object.entries(dependencies))
            if (include.has(name))
                filteredDeps[name] = spec;
        const dsh = manifest.dsh === null || typeof manifest.dsh !== 'object' || Array.isArray(manifest.dsh)
            ? undefined
            : manifest.dsh;
        const profileBlock = dsh?.profile === null || typeof dsh?.profile !== 'object' || Array.isArray(dsh?.profile)
            ? undefined
            : dsh.profile;
        const bundles = Array.isArray(profileBlock?.bundles) ? profileBlock.bundles : [];
        const filteredBundles = bundles.filter((name) => typeof name === 'string' && include.has(name));
        if (Object.keys(filteredDeps).length === 0 && filteredBundles.length === 0) {
            throw new Error('none of the selected plugins are in this profile');
        }
        const filteredManifest = { ...manifest };
        filteredManifest.dependencies = filteredDeps;
        if (dsh !== undefined) {
            filteredManifest.dsh = { ...dsh, profile: { ...(profileBlock ?? {}), bundles: filteredBundles } };
        }
        const files = [{ path: 'package.json', json: filteredManifest }];
        if (opts.includeConfig === true) {
            for (const path of profileFiles(root).sort()) {
                if (path === 'package.json')
                    continue;
                files.push({ path, lines: readFileSync(resolve(root, path), 'utf8').split(/\r?\n/) });
            }
        }
        const partial = { format: BACKUP_FORMAT, version: 0.2, createdAt: new Date().toISOString(), profile, files };
        if (Buffer.byteLength(JSON.stringify(partial)) > MAX_BACKUP_BYTES)
            throw new Error('profile configuration is too large to back up');
        return partial;
    }
    const files = profileFiles(root).sort().map((path) => {
        const content = readFileSync(resolve(root, path), 'utf8');
        return path === 'package.json'
            ? { path, json: JSON.parse(content) }
            : { path, lines: content.split(/\r?\n/) };
    });
    if (!files.some(file => file.path === 'package.json'))
        throw new Error('profile package.json is missing');
    const backup = { format: BACKUP_FORMAT, version: 0.2, createdAt: new Date().toISOString(), profile, files };
    if (Buffer.byteLength(JSON.stringify(backup)) > MAX_BACKUP_BYTES)
        throw new Error('profile configuration is too large to back up');
    return backup;
}
export function validatedBackup(value) {
    if (value === null || typeof value !== 'object')
        throw new Error('invalid backup');
    const backup = value;
    if (backup.format !== BACKUP_FORMAT || backup.version !== 0.2 || !Array.isArray(backup.files)) {
        throw new Error('unsupported backup format');
    }
    if (backup.files.length > MAX_FILES)
        throw new Error('invalid backup contents');
    const files = [];
    const paths = new Set();
    for (const value of backup.files) {
        if (value === null || typeof value !== 'object')
            throw new Error('invalid backup contents');
        const file = value;
        const path = file.path;
        if (typeof path !== 'string')
            throw new Error('invalid backup contents');
        if (path === '' || isAbsolute(path) || path.split(/[\\/]/).includes('..'))
            throw new Error(`unsafe backup path: ${path}`);
        const normalized = path.replaceAll('\\', '/');
        if (normalized.split('/').some(part => SKIP_NAMES.has(part)))
            throw new Error(`excluded backup path: ${path}`);
        if (paths.has(normalized))
            throw new Error(`duplicate backup path: ${path}`);
        paths.add(normalized);
        if (path === 'package.json') {
            if (file.json === null || typeof file.json !== 'object' || Array.isArray(file.json))
                throw new Error('backup package.json is invalid');
            files.push({ path, json: file.json });
        }
        else {
            if (!Array.isArray(file.lines) || !file.lines.every(line => typeof line === 'string'))
                throw new Error(`invalid file content: ${path}`);
            files.push({ path, lines: file.lines });
        }
    }
    if (!files.some(file => file.path === 'package.json'))
        throw new Error('invalid backup contents');
    if (Buffer.byteLength(JSON.stringify(backup)) > MAX_BACKUP_BYTES)
        throw new Error('backup is too large');
    return { ...backup, files };
}
/** Atomically overwrite backed-up files and return a rollback for install failure. */
export function restoreProfileBackup(profile, value, explicitDir) {
    const backup = validatedBackup(value);
    const root = resolve(explicitDir ?? profileDir(profile));
    const previous = new Map();
    mkdirSync(root, { recursive: true });
    const rollback = () => {
        for (const [target, content] of previous) {
            if (content === null)
                rmSync(target, { force: true });
            else
                writeFileSync(target, content);
        }
    };
    try {
        for (const file of backup.files) {
            const { path } = file;
            const target = resolve(root, path);
            if (!target.startsWith(root + sep))
                throw new Error(`unsafe backup path: ${path}`);
            ensureSafeParent(root, dirname(target), path);
            if (existsSync(target) && !lstatSync(target).isFile())
                throw new Error(`backup path is not a file: ${path}`);
            previous.set(target, existsSync(target) ? readFileSync(target) : null);
            const temp = `${target}.dsh-restore-${String(process.pid)}`;
            writeFileSync(temp, 'json' in file ? `${JSON.stringify(file.json, null, 2)}\n` : file.lines.join('\n'), 'utf8');
            renameSync(temp, target);
        }
    }
    catch (error) {
        rollback();
        throw error;
    }
    return {
        files: previous.size,
        rollback,
    };
}
/** Create missing parents one level at a time and refuse existing symlinks. */
function ensureSafeParent(root, parent, backupPath) {
    const relativeParent = relative(root, parent);
    if (relativeParent === '')
        return;
    let current = root;
    for (const part of relativeParent.split(sep)) {
        current = resolve(current, part);
        if (!existsSync(current)) {
            mkdirSync(current);
            continue;
        }
        const stat = lstatSync(current);
        if (stat.isSymbolicLink() || !stat.isDirectory())
            throw new Error(`unsafe backup path: ${backupPath}`);
    }
}
async function webdavRequest(url, username, password, method, body) {
    const parsed = new URL(url);
    // SSRF hardening (review #63): https-only by default, and always refuse
    // private/link-local targets — so a same-origin script cannot tunnel into
    // the host network. Besides the obvious metadata surfaces (169.254.169.254),
    // loopback matters because other services on this machine may expose HTTP
    // APIs of their own.
    if (parsed.protocol === 'http:')
        throw new Error('WebDAV requires an https:// URL');
    if (parsed.protocol !== 'https:')
        throw new Error('invalid WebDAV URL');
    if (parsed.username !== '' || parsed.password !== '')
        throw new Error('invalid WebDAV URL');
    const address = await resolvePublicAddress(parsed.hostname);
    const headers = { host: parsed.host };
    if (body !== undefined) {
        headers['content-type'] = 'application/json';
        headers['content-length'] = String(Buffer.byteLength(body));
    }
    if (username !== '')
        headers.authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    // Connect to the address that was checked above instead of resolving the
    // hostname a second time. This closes the DNS-rebinding window between the
    // allow/deny decision and the actual socket connection.
    return await new Promise((resolveRequest, reject) => {
        const originalHostname = unbracketedHostname(parsed.hostname);
        const request = httpsRequest({
            protocol: 'https:',
            hostname: address.address,
            family: address.family,
            port: parsed.port === '' ? 443 : Number(parsed.port),
            path: `${parsed.pathname}${parsed.search}`,
            method,
            headers,
            servername: isIP(originalHostname) === 0 ? originalHostname : undefined,
            signal: AbortSignal.timeout(30_000),
        }, (response) => {
            const chunks = [];
            let size = 0;
            const maxBytes = method === 'GET' ? MAX_BACKUP_BYTES : 64 * 1024;
            response.once('error', reject);
            const declared = Number(response.headers['content-length']);
            if (Number.isFinite(declared) && declared > maxBytes) {
                response.destroy(new Error('WebDAV response is too large'));
                return;
            }
            response.on('data', (chunk) => {
                const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                size += value.byteLength;
                if (size > maxBytes) {
                    response.destroy(new Error('WebDAV response is too large'));
                    return;
                }
                chunks.push(value);
            });
            response.once('end', () => resolveRequest({ status: response.statusCode ?? 0, body: Buffer.concat(chunks) }));
        });
        request.once('error', reject);
        request.end(body);
    });
}
/**
 * Ancestor collection URLs of a WebDAV file, outermost first.
 * `https://dav.example/a/b/x.json` → [`https://dav.example/a/`, `https://dav.example/a/b/`].
 * The server root itself is never included — it always exists, and some
 * providers reject MKCOL on it.
 */
export function webdavParentCollections(url) {
    let parsed;
    try {
        parsed = new URL(url);
    }
    catch {
        return [];
    }
    const parts = parsed.pathname.split('/').filter(part => part !== '');
    parts.pop(); // the file itself
    const collections = [];
    let path = '';
    for (const part of parts) {
        path += `/${part}`;
        collections.push(`${parsed.origin}${path}/`);
    }
    return collections;
}
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
export async function uploadWebdav(url, username, password, backup) {
    for (const collection of webdavParentCollections(url)) {
        try {
            await webdavRequest(collection, username, password, 'MKCOL');
        }
        catch { /* fall through: the PUT below reports the real problem */ }
    }
    const response = await webdavRequest(url, username, password, 'PUT', JSON.stringify(backup));
    if (response.status < 200 || response.status >= 300) {
        throw new Error(response.status === 404
            ? `WebDAV upload failed: HTTP 404 — the target folder does not exist and could not be created. Some providers (e.g. Jianguoyun) refuse files at the root: use a path inside a folder, e.g. https://dav.example.com/dsh/backup.json / 目标目录不存在且无法自动创建；部分服务商（如坚果云）不允许在根目录放文件，请使用形如 https://dav.example.com/dsh/backup.json 的子目录路径`
            : `WebDAV upload failed: HTTP ${response.status}`);
    }
}
/** Refuse non-global IPv4 targets, including metadata and carrier NAT ranges. */
export function isPublicIpv4(ip) {
    const octets = ip.split('.').map(Number);
    if (octets.length !== 4 || octets.some(part => !Number.isInteger(part) || part < 0 || part > 255))
        return false;
    const [a, b] = octets;
    if (a === 0 || a === 10 || a === 127 || a >= 224)
        return false;
    if (a === 100 && b >= 64 && b <= 127)
        return false;
    if (a === 169 && b === 254)
        return false;
    if (a === 172 && b >= 16 && b <= 31)
        return false;
    if (a === 192 && (b === 0 || b === 168))
        return false;
    if (a === 198 && (b === 18 || b === 19))
        return false;
    return true;
}
/** Only public internet target hostnames are reachable for WebDAV. */
export function isPublicHostname(hostname) {
    const lower = unbracketedHostname(hostname).toLowerCase();
    const bare = lower.endsWith('.') ? lower.slice(0, -1) : lower;
    return bare !== '' && bare !== 'localhost' && bare !== 'metadata.google.internal'
        && !bare.endsWith('.localhost') && !bare.endsWith('.internal') && !bare.endsWith('.local');
}
/**
 * Whether a WebDAV hostname may be fetched: public https targets only.
 * Exported for tests.
 */
export function isPublicTarget(hostname) {
    const bare = unbracketedHostname(hostname);
    const family = isIP(bare);
    if (family === 4)
        return isPublicIpv4(bare);
    if (family === 6)
        return isPublicIpv6(bare);
    return isPublicHostname(bare);
}
/** Only global-unicast IPv6 is usable for a server-side WebDAV connection. */
export function isPublicIpv6(ip) {
    const bare = unbracketedHostname(ip);
    if (isIP(bare) !== 6)
        return false;
    const first = Number.parseInt(bare.split(':', 1)[0] || '0', 16);
    return Number.isFinite(first) && first >= 0x2000 && first <= 0x3fff;
}
function unbracketedHostname(hostname) {
    return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
}
/** Resolve once, reject every unsafe answer, and return the address to pin. */
export async function resolvePublicAddress(hostname) {
    const bare = unbracketedHostname(hostname);
    const family = isIP(bare);
    if (family === 4 || family === 6) {
        if (!isPublicTarget(bare))
            throw new Error('invalid WebDAV URL');
        return { address: bare, family };
    }
    if (!isPublicHostname(bare))
        throw new Error('invalid WebDAV URL');
    const addresses = await lookup(bare, { all: true, verbatim: true });
    if (addresses.length === 0 || addresses.some(({ address }) => !isPublicTarget(address))) {
        throw new Error('invalid WebDAV URL');
    }
    const selected = addresses[0];
    if (selected.family !== 4 && selected.family !== 6)
        throw new Error('invalid WebDAV URL');
    return { address: selected.address, family: selected.family };
}
export async function downloadWebdav(url, username, password) {
    const response = await webdavRequest(url, username, password, 'GET');
    if (response.status < 200 || response.status >= 300) {
        throw new Error(response.status === 404
            ? 'WebDAV download failed: HTTP 404 — no backup at that path yet. Upload one first, and check the URL points at the backup FILE (…/dsh/backup.json), not its folder / 该路径下还没有备份文件。请先执行一次上传，并确认地址指向备份文件本身（…/dsh/backup.json）而不是目录'
            : `WebDAV download failed: HTTP ${response.status}`);
    }
    // Validate strictly server-side so the fetch result is never a generic
    // echo of an internal response: restore only accepts real backups.
    const body = JSON.parse(response.body.toString('utf8'));
    validatedBackup(body);
    return body;
}
/**
 * The selected plugins' dependency specs and bundle entries from a backup's
 * manifest. Only string specs survive — everything else in the manifest is
 * untrusted and ignored (partial restore touches nothing but these).
 */
export function extractPluginSelection(backup, includeDeps) {
    const manifest = backup.files.find(file => file.path === 'package.json' && 'json' in file);
    if (manifest === undefined || !('json' in manifest))
        throw new Error('backup has no package.json');
    const include = new Set(includeDeps);
    const json = manifest.json;
    const dependencies = json.dependencies === null || typeof json.dependencies !== 'object' || Array.isArray(json.dependencies)
        ? {}
        : json.dependencies;
    const deps = {};
    for (const [name, spec] of Object.entries(dependencies)) {
        if (typeof spec === 'string' && include.has(name))
            deps[name] = spec;
    }
    const dsh = json.dsh === null || typeof json.dsh !== 'object' || Array.isArray(json.dsh)
        ? undefined
        : json.dsh;
    const profileBlock = dsh?.profile === null || typeof dsh?.profile !== 'object' || Array.isArray(dsh?.profile)
        ? undefined
        : dsh.profile;
    const bundles = Array.isArray(profileBlock?.bundles) ? profileBlock.bundles : [];
    return {
        deps,
        bundles: bundles.filter((name) => typeof name === 'string' && include.has(name)),
    };
}
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
export function unportableDeps(dependencies) {
    if (dependencies === null || typeof dependencies !== 'object' || Array.isArray(dependencies))
        return [];
    const found = [];
    for (const [name, raw] of Object.entries(dependencies)) {
        if (typeof raw !== 'string')
            continue;
        const match = /^(?:link|file):(.+)$/i.exec(raw);
        if (match === null)
            continue;
        let path = match[1];
        try {
            path = decodeURIComponent(path);
        }
        catch { /* keep the literal spec */ }
        // POSIX absolute, Windows drive-letter, or UNC — every shape that names
        // a location outside this profile.
        if (/^\//.test(path) || /^[A-Za-z]:[\\/]/.test(path) || /^\\\\/.test(path))
            found.push({ name, spec: raw });
    }
    return found;
}
export function mergeRestoreManifest(backupManifest, current, selection) {
    const merged = { ...backupManifest };
    const backupDeps = backupManifest.dependencies === null || typeof backupManifest.dependencies !== 'object' || Array.isArray(backupManifest.dependencies)
        ? {}
        : backupManifest.dependencies;
    const backupBundles = Array.isArray(backupManifest.dsh?.profile?.bundles)
        ? (backupManifest.dsh.profile.bundles)
        : [];
    const currentDeps = current.dependencies === null || typeof current.dependencies !== 'object' || Array.isArray(current.dependencies)
        ? {}
        : current.dependencies;
    const currentBundles = Array.isArray(current.dsh?.profile?.bundles)
        ? (current.dsh.profile.bundles)
        : [];
    // Deps: keep the target's, overlay the backup's (or only the selection).
    const deps = { ...currentDeps };
    const sourceDeps = selection !== undefined ? selection.deps : backupDeps;
    for (const [name, spec] of Object.entries(sourceDeps))
        deps[name] = spec;
    merged.dependencies = deps;
    // Bundles: union of target and backup (or selection), de-duplicated.
    const bundles = new Set();
    for (const name of currentBundles)
        if (typeof name === 'string')
            bundles.add(name);
    const sourceBundles = selection !== undefined ? selection.bundles : backupBundles;
    for (const name of sourceBundles)
        if (typeof name === 'string')
            bundles.add(name);
    const currentDsh = current.dsh === null || typeof current.dsh !== 'object' || Array.isArray(current.dsh)
        ? undefined
        : current.dsh;
    const currentProfile = currentDsh?.profile === null || typeof currentDsh?.profile !== 'object' || Array.isArray(currentDsh?.profile)
        ? undefined
        : currentDsh.profile;
    const backupDsh = merged.dsh === null || typeof merged.dsh !== 'object' || Array.isArray(merged.dsh)
        ? undefined
        : merged.dsh;
    const backupProfile = backupDsh?.profile === null || typeof backupDsh?.profile !== 'object' || Array.isArray(backupDsh?.profile)
        ? undefined
        : backupDsh.profile;
    const profileMerged = { ...(backupProfile ?? {}), ...(currentProfile ?? {}), bundles: [...bundles] };
    const dshMerged = { ...(backupDsh ?? {}), ...(currentDsh ?? {}), profile: profileMerged };
    merged.dsh = dshMerged;
    return merged;
}
