/**
 * Resolve the Harness home with the same semantics as the current
 * `@deepseek-ai/dsh-home-paths` package.
 */

import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

/** Default single-root Harness home. */
export function defaultDshHome(): string {
  return join(homedir(), '.dsh')
}

/** Expand the tilde forms supported by DSH configuration. */
export function expandHomePath(path: string): string {
  if (path === '~') return homedir()
  if (path.startsWith('~/') || path.startsWith('~\\')) return join(homedir(), path.slice(2))
  return path
}

/**
 * Resolve an explicit home, `DSH_HOME`, or the default to one normalized
 * absolute path. Blank environment values are unset, matching DSH alpha.
 */
export function resolveDshHome(
  configured?: string,
  env: Record<string, string | undefined> = process.env,
): string {
  const fromEnv = env.DSH_HOME
  const selected = configured ?? (fromEnv !== undefined && fromEnv.trim().length > 0
    ? fromEnv
    : defaultDshHome())
  return resolve(expandHomePath(selected))
}
