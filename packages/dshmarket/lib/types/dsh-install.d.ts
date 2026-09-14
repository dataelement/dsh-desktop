/** Locate the DSH host package in CLI and packaged Desktop runtimes. */
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
export declare function dshHostInfo(entry?: string): {
    version: string;
    directory: string;
} | null;
/**
 * Walk up from the CLI entry first, then inspect Electron's authoritative
 * resources directory. Desktop distributions may keep node_modules outside
 * the ASAR, expose them through ASAR's virtual filesystem, or disable ASAR.
 */
export declare function findDshInstallDir(entry?: string): string | null;
