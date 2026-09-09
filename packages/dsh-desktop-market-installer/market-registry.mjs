import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * The registry a generation install must fetch from.
 *
 * The market decides WHICH version to install by reading metadata from its
 * region's registry, and the install boundary then fetches the package with
 * pnpm. Those were two different registries: the boundary takes no registry
 * argument, drops every flag but the package spec, and writes a staging
 * `.npmrc` with no registry line — so pnpm fell back to the user's
 * `~/.npmrc`. A mirror that lags the one the market read (the normal state of
 * affairs for minutes to hours after a publish) then makes every update fail
 * with ERR_PNPM_NO_MATCHING_VERSION, or silently resolve `@latest` to the
 * older build (#337 by @youxia-2025).
 *
 * This resolves the registry the market itself is using so the two halves
 * agree. It duplicates dshmarket's region table on purpose: the market is
 * installed from npm and upgrades on its own schedule, so the fix cannot
 * depend on a new dshmarket release to pass the value in — but the
 * `--registry=` argument below is the channel for it to do exactly that once
 * it can, and it wins over everything here.
 *
 * Keep in step with dshmarket's `src/regions.ts`.
 */
export const DEFAULT_NPM_REGISTRY = 'https://registry.npmjs.org'

const REGION_REGISTRY = {
  global: DEFAULT_NPM_REGISTRY,
  china: 'https://mirrors.cloud.tencent.com/npm'
}

/** A usable registry URL, without its trailing slash, or null when blank. */
function asRegistry(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().replace(/\/+$/u, '')
  return trimmed === '' ? null : trimmed
}

/**
 * A registry named on the command line: `--registry <url>`,
 * `--registry=<url>`, or pnpm's `--config.registry=<url>`.
 *
 * The install boundary keeps only the package spec out of its arguments, so
 * today nothing sends this. Reading it is what lets a later dshmarket state
 * its registry outright instead of having it inferred.
 */
export function registryFromArguments(args = []) {
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (typeof argument !== 'string') continue
    const inline = /^--(?:config\.)?registry=(.*)$/u.exec(argument)
    if (inline !== null) return asRegistry(inline[1])
    if (argument === '--registry') return asRegistry(args[index + 1])
  }
  return null
}

/** The market's persisted download region, or null when it has not chosen. */
export async function readMarketRegion(profileDir) {
  try {
    const state = JSON.parse(await readFile(join(profileDir, '.dsh-market', 'state.json'), 'utf8'))
    const region = state?.region
    return region === 'global' || region === 'china' ? region : null
  } catch {
    return null
  }
}

/**
 * The registry to pin a staging install to, or null to leave it unpinned.
 *
 * Null in three cases, all deliberate:
 *
 * - `npm_config_registry` is set. The caller has named a registry, and the
 *   env var already reaches pnpm; writing our own line would overrule them.
 *   Same rule dshmarket's own environment builder follows — fill silence,
 *   do not overwrite speech.
 * - The market's region is the default registry. Then the user's `~/.npmrc`
 *   is the only registry statement anyone has made, and honouring it is not
 *   what broke: pinning npmjs.org over a private or corporate registry would
 *   break installs that work today.
 * - No region has been chosen yet, so there is nothing to agree with.
 */
export async function resolveMarketRegistry(options) {
  const { profileDir, args = [], environment = process.env } = options
  const explicit = registryFromArguments(args)
  if (explicit !== null) return explicit
  if (asRegistry(environment.npm_config_registry) !== null) return null
  const override = asRegistry(environment.DSHM_NPM_MIRROR)
  if (override !== null) return override
  const region = await readMarketRegion(profileDir)
  const registry = region === null ? null : REGION_REGISTRY[region] ?? null
  return registry === DEFAULT_NPM_REGISTRY ? null : registry
}
