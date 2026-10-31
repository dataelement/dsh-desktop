import { join } from 'node:path'

/**
 * The physical copy of a bundled runtime path.
 *
 * The packaged app keeps its node_modules inside app.asar; the Electron
 * runtime reads the archive, but pnpm is executed by node-mode children (the
 * Harness hand-off and the `.desktop-bin` shims) that cannot read archive
 * members — the OS answers `spawn ENOTDIR` because `app.asar` is a regular
 * file. The build therefore unpacks pnpm (asarUnpack) and every executable
 * entry must resolve to the sibling `app.asar.unpacked` copy, the rule
 * node-pty, ripgrep, and the Office engine already follow. Paths outside an
 * archive (development installs) are returned unchanged.
 */
export function unpackedBundledPath(path: string): string {
  const separator = path.includes('\\') && !path.includes('/') ? '\\' : '/'
  const segments = path.split(/[\\/]/u)
  const archiveAt = segments.lastIndexOf('app.asar')
  if (archiveAt === -1) return path
  segments[archiveAt] = 'app.asar.unpacked'
  return segments.join(separator)
}

/**
 * The packaged pnpm entry for a runtime root (`app.getAppPath()` when
 * packaged). The entry must be the unpacked physical copy — its consumers
 * spawn it in node mode — so candidates are tested against the physical
 * filesystem; when nothing exists there the unpacked spelling is still
 * returned, which downstream resolution reports as a missing entry instead
 * of a cryptic spawn failure.
 */
export function bundledPnpmEntryFrom(
  runtimeRoot: string,
  exists: (path: string) => boolean = () => true
): string {
  const bin = unpackedBundledPath(join(runtimeRoot, 'node_modules', 'pnpm', 'bin'))
  const candidates = [join(bin, 'pnpm.cjs'), join(bin, 'pnpm.mjs')]
  return candidates.find((candidate) => exists(candidate)) ?? join(bin, 'pnpm.cjs')
}
