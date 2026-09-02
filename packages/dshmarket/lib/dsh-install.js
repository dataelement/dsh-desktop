/** Locate the DSH host package in CLI and packaged Desktop runtimes. */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
const DSH_PACKAGE = '@deepseek-ai/dsh';
/**
 * The host package's own manifest, or null when `directory` is not it.
 * @returns the parsed manifest of `@deepseek-ai/dsh`, or null.
 */
function readDshManifest(directory) {
    try {
        const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
        return manifest.name === DSH_PACKAGE ? { name: DSH_PACKAGE, version: manifest.version } : null;
    }
    catch {
        return null;
    }
}
function isDshPackage(directory) {
    return readDshManifest(directory) !== null;
}
/**
 * The version of the DSH host this market is running inside.
 *
 * Read from the same manifest `findDshInstallDir` already parses to identify
 * the package — the version was sitting in that object and being discarded.
 *
 * Worth reporting because the host version has repeatedly been the thing
 * neither side could see. #293 turned on it (the reporter was on
 * 0.1.1-rc.2 while every attempt to reproduce had been on 0.1.0-rc.8, which
 * nobody knew until three rounds in), and #404 is entirely about a plugin
 * that requires a host newer than the Desktop build it was installed on.
 *
 * The directory comes back too, because WHERE it was found is the other half
 * of the answer: a path under Electron's resources is a Desktop-bundled host,
 * which #139 established can be older than whatever `npm ls` would report.
 * Asking the user is not a substitute — that is the number they do not have.
 * @returns the host version and the directory it was read from, or null when
 * no host package is locatable (a plain `dsh web` from a global install can
 * legitimately land here).
 */
export function dshHostInfo(entry = process.argv[1]) {
    const directory = findDshInstallDir(entry);
    if (directory === null)
        return null;
    const manifest = readDshManifest(directory);
    // Located but unversioned: report the directory anyway. "The host is here
    // and declares no version" is a fact worth carrying, and it is not the
    // same fact as "no host found".
    const version = typeof manifest?.version === 'string' && manifest.version !== ''
        ? manifest.version
        : 'unknown';
    return { version, directory };
}
/**
 * Walk up from the CLI entry first, then inspect Electron's authoritative
 * resources directory. Desktop distributions may keep node_modules outside
 * the ASAR, expose them through ASAR's virtual filesystem, or disable ASAR.
 */
export function findDshInstallDir(entry = process.argv[1]) {
    if (entry !== undefined) {
        let directory = resolve(dirname(entry));
        for (let depth = 0; depth < 10; depth += 1) {
            if (isDshPackage(directory))
                return directory;
            const parent = dirname(directory);
            if (parent === directory)
                break;
            directory = parent;
        }
    }
    const electronProcess = process;
    if (typeof electronProcess.resourcesPath !== 'string'
        || electronProcess.resourcesPath.length === 0)
        return null;
    for (const applicationRoot of ['app.asar.unpacked', 'app.asar', 'app']) {
        const candidate = join(electronProcess.resourcesPath, applicationRoot, 'node_modules', '@deepseek-ai', 'dsh');
        if (isDshPackage(candidate))
            return candidate;
    }
    return null;
}
