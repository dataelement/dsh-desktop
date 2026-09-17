/**
 * Safe discovery for legacy Git -> verified npm source migrations (#461).
 *
 * This intentionally does less than the normal catalog matcher. A migration
 * changes package name/publisher and build provenance, so only repository
 * evidence carried by the installed Git spec may authorize it:
 *
 * - bare github:owner/repo matches only the catalog root for that repo;
 * - #path:/subdir matches only that exact catalog subpath;
 * - branch/tag/commit/semver selectors are not migrated in v1;
 * - more than one matching verified npm entry is ambiguous and fails closed.
 */
import { NPM_NAME_RE, parseSourceUrl, repoOfTarget } from './sources.ts'

export interface GitToNpmMigration {
  kind: 'git-to-npm'
  /** Normalized owner/repo or owner/repo#path:/subdir identity. */
  repo: string
  /** Verified npm package declared by the same catalog entry. */
  target: string
}

function migratableGitIdentity(spec: string): string | null {
  if (!spec.startsWith('github:')) return null
  const hash = spec.indexOf('#')
  if (hash !== -1) {
    const selector = spec.slice(hash + 1)
    // A path selector identifies which package inside a monorepo. Any
    // other selector expresses an explicit version/ref choice and is
    // deliberately preserved rather than silently discarded.
    if (!selector.startsWith('path:/') || selector.includes('&')) return null
  }
  return repoOfTarget(spec)
}

export function findGitToNpmMigration<T extends { url: string; npm?: unknown }>(
  plugins: readonly T[],
  spec: string,
): GitToNpmMigration | null {
  const identity = migratableGitIdentity(spec)
  if (identity === null) return null
  const pathAt = identity.indexOf('#path:/')
  const wantedRepo = pathAt === -1 ? identity : identity.slice(0, pathAt)
  const wantedPath = pathAt === -1 ? null : identity.slice(pathAt + '#path:/'.length)

  const candidates = plugins.flatMap((plugin) => {
    if (typeof plugin.npm !== 'string' || !NPM_NAME_RE.test(plugin.npm)) return []
    const source = parseSourceUrl(plugin.url)
    if (source === null || source.repo.toLowerCase() !== wantedRepo) return []
    if (wantedPath === null) {
      // A collection root must not guess which /tree/ child was meant.
      if (source.subpath !== null) return []
    } else if (source.subpath?.toLowerCase() !== wantedPath) {
      return []
    }
    return [plugin.npm]
  })

  if (candidates.length !== 1) return null
  return { kind: 'git-to-npm', repo: identity, target: candidates[0]! }
}
