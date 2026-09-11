/**
 * Community bundle ordering — issue #98 (phase 2): let the user reorder the
 * community bundles of the profile's layer stack, with author-declared
 * before/after rules enforced before anything is written.
 *
 * Official in-box bundles (@deepseek-ai/dsh-base, @deepseek-ai/dsh-web-app,
 * @deepseek-ai/dsh-headless) are fixed: they keep their exact positions in
 * the stack, are never part of a user-supplied order, and are never added,
 * removed or duplicated by a reorder (#98 boundary). The profile's own
 * cordis.patch.yml and --patch overlays are not part of the bundle stack and
 * are never touched here.
 *
 * Pure functions plus one manifest write-back; no processes, no network.
 */

import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { findDshInstallDir } from './dsh-install.ts'

/** Profile bundles that ship with the dsh host and must stay put (#98). */
export const INBOX_BUNDLES = new Set([
  '@deepseek-ai/dsh-base',
  '@deepseek-ai/dsh-web-app',
  '@deepseek-ai/dsh-headless',
])

/**
 * Atomic same-directory replace (write temp + rename): a crash mid-write can
 * never leave the profile manifest truncated, which would break every later
 * pnpm run. Used for every package.json write this module makes.
 */
function writeFileAtomic(file: string, content: string): void {
  const temp = `${file}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  writeFileSync(temp, content)
  renameSync(temp, file)
}

/** The bundle stack as it appears in the profile manifest. */
export interface BundleStack {
  /** Full ordered list from dsh.profile.bundles. */
  bundles: string[]
  /** The subset that may be reordered (community bundles). */
  community: string[]
}

/** Author-declared ordering constraints of one bundle. */
export interface BundleRule {
  name: string
  /** This bundle must load after every name in this list. */
  after: string[]
  /** This bundle must load before every name in this list. */
  before: string[]
}

/** A violated before/after rule in the current or proposed order. */
export interface OrderConflict {
  name: string
  reason: string
}

/** Read the profile's bundle stack (empty when the manifest is unreadable). */
export function readBundleStack(profileDir: string): BundleStack {
  try {
    const manifest = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8')) as {
      dsh?: { profile?: { bundles?: unknown } }
    }
    const bundles = Array.isArray(manifest.dsh?.profile?.bundles)
      ? manifest.dsh.profile.bundles.filter((name): name is string => typeof name === 'string')
      : []
    return {
      bundles,
      community: bundles.filter(name => !INBOX_BUNDLES.has(name)),
    }
  } catch {
    return { bundles: [], community: [] }
  }
}

/**
 * The bundle package.json, resolved the way the dsh boot resolves bundles
 * (dsh-app-boot's resolveBundleDir, mirrored by check.ts): the dsh
 * installation anchor first — official in-box bundles live in the install's
 * node_modules, never the profile's — then the profile directory, whose
 * createRequire search paths also cover pnpm workspace-root hoisting
 * (`<profiles>/node_modules` when the profile lives under `<profiles>/<name>`).
 */
function resolveBundlePackageJson(profileDir: string, name: string): string | null {
  const dshInstall = findDshInstallDir()
  const anchors = [
    dshInstall !== null ? join(dshInstall, 'package.json') : null,
    join(profileDir, 'package.json'),
  ]
  for (const anchor of anchors) {
    if (anchor === null) continue
    let paths: string[] = []
    try {
      paths = createRequire(anchor).resolve.paths(name) ?? []
    } catch {
      continue
    }
    for (const searchPath of paths) {
      const candidate = join(searchPath, name)
      if (existsSync(join(candidate, 'package.json'))) return join(candidate, 'package.json')
    }
  }
  return null
}

/**
 * Read each bundle's declared ordering rules from its package manifest
 * (`dsh.bundle.order.{before,after}` — a list of bundle package names).
 * Unresolvable packages and missing declarations contribute nothing.
 */
export function readBundleRules(profileDir: string): BundleRule[] {
  const { bundles } = readBundleStack(profileDir)
  const rules: BundleRule[] = []
  for (const name of bundles) {
    const packageJson = resolveBundlePackageJson(profileDir, name)
    if (packageJson === null) continue
    try {
      const manifest = JSON.parse(
        readFileSync(packageJson, 'utf8'),
      ) as { dsh?: { bundle?: { order?: unknown } } }
      const order = manifest.dsh?.bundle?.order
      if (order === null || typeof order !== 'object' || Array.isArray(order)) continue
      const listOf = (value: unknown): string[] => Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : []
      const rule: BundleRule = {
        name,
        after: listOf((order as Record<string, unknown>).after),
        before: listOf((order as Record<string, unknown>).before),
      }
      if (rule.after.length > 0 || rule.before.length > 0) rules.push(rule)
    } catch { /* package unreadable — no rule */ }
  }
  return rules
}

/**
 * Check a bundle order against the declared before/after rules. Rules naming
 * bundles outside `order` are ignored (a rule for a not-yet-installed bundle
 * must not block the current stack).
 * @returns every violated rule with a readable reason; [] when all hold.
 */
export function validateOrder(bundleNames: string[], rules: BundleRule[]): OrderConflict[] {
  const position = new Map(bundleNames.map((name, index) => [name, index]))
  const conflicts: OrderConflict[] = []
  for (const rule of rules) {
    const pos = position.get(rule.name)
    if (pos === undefined) continue
    for (const other of rule.after) {
      const otherPos = position.get(other)
      if (otherPos === undefined) continue
      if (otherPos >= pos) {
        conflicts.push({
          name: rule.name,
          reason: `must load after ${other}, but ${other} is currently before/equal (position ${otherPos} vs ${pos})`,
        })
      }
    }
    for (const other of rule.before) {
      const otherPos = position.get(other)
      if (otherPos === undefined) continue
      if (otherPos <= pos) {
        conflicts.push({
          name: rule.name,
          reason: `must load before ${other}, but ${other} is currently after/equal (position ${otherPos} vs ${pos})`,
        })
      }
    }
  }
  return conflicts
}

/**
 * Merge a community-bundle permutation into the full stack. Official in-box
 * bundles keep their EXACT positions (never moved); community bundles are
 * replaced by `newOrder` in order of appearance. Pure — nothing is written.
 * @returns the merged full stack, or the rejection reason when `newOrder` is
 * not a permutation of the community bundles (duplicates, additions,
 * omissions, official names).
 */
export function mergeOrder(bundles: string[], newOrder: string[]): { ok: true; bundles: string[] } | { ok: false; error: string } {
  const communitySet = new Set(bundles.filter(name => !INBOX_BUNDLES.has(name)))
  if (new Set(newOrder).size !== newOrder.length) {
    return { ok: false, error: 'duplicate bundle names in the new order / 新顺序包含重复的 bundle' }
  }
  if (newOrder.length !== communitySet.size) {
    return { ok: false, error: 'the new order must contain exactly the current community bundles / 新顺序必须恰好包含全部社区 bundle' }
  }
  for (const name of newOrder) {
    if (!communitySet.has(name)) {
      return { ok: false, error: `${name} is not a reorderable community bundle / ${name} 不是可排序的社区 bundle` }
    }
  }
  const merged = [...bundles]
  let cursor = 0
  for (let index = 0; index < merged.length; index += 1) {
    const name = merged[index]
    if (name === undefined || INBOX_BUNDLES.has(name)) continue
    merged[index] = newOrder[cursor]
    cursor += 1
  }
  return { ok: true, bundles: merged }
}

/**
 * Topologically sort the community bundles by their before/after rules — the
 * "auto-fix" counterpart to validateOrder. Returns null when no declared rule
 * applies to the current stack (nothing to suggest). With rules, Kahn's
 * algorithm breaks ties by the CURRENT order: unconstrained bundles keep
 * their current relative order and constrained bundles move only as far as
 * the rules require — the suggestion is the minimal change that satisfies
 * every rule, never an arbitrary canonical rewrite of a hand-picked order
 * (issue #125 review).
 * @returns the suggested community order, null when there are no rules, or a
 * cycle report when the constraints cannot be satisfied (references to
 * unlisted bundles ignored).
 */
export function suggestOrder(
  bundleNames: string[],
  rules: BundleRule[],
): { ok: true; order: string[] } | { ok: false; cycle: string[] } | null {
  const names = bundleNames.filter(name => !INBOX_BUNDLES.has(name))
  const inOrder = new Set(names)
  const active = rules.filter(rule => inOrder.has(rule.name))
  // No rule applies to the current stack — nothing to suggest.
  if (active.length === 0) return null
  const position = new Map(names.map((name, index) => [name, index]))
  // Constraint: "a must load before b" (from a.before or b.after) → edge a → b.
  const beforeOf = new Map<string, Set<string>>() // name → bundles that must come after it
  const deps = new Map<string, Set<string>>() // name → bundles that must come before it
  for (const name of names) {
    beforeOf.set(name, new Set())
    deps.set(name, new Set())
  }
  const addEdge = (a: string, b: string): void => {
    if (!inOrder.has(a) || !inOrder.has(b) || a === b) return
    beforeOf.get(a)?.add(b)
    deps.get(b)?.add(a)
  }
  for (const rule of active) {
    for (const other of rule.before) addEdge(rule.name, other)
    for (const other of rule.after) addEdge(other, rule.name)
  }
  const remaining = new Map<string, Set<string>>()
  for (const [name, depsOf] of deps) remaining.set(name, new Set(depsOf))
  const ready: string[] = names.filter(name => (remaining.get(name)?.size ?? 0) === 0)
  const ordered: string[] = []
  while (ready.length > 0) {
    // Minimal-change tie-break: among the ready bundles, prefer the one that
    // comes FIRST in the current order. Bundles the rules do not constrain
    // therefore keep their current relative order; constrained bundles move
    // only as far as the rules require (issue #125 review).
    let best = 0
    for (let i = 1; i < ready.length; i += 1) {
      const a = ready[i]
      const b = ready[best]
      if (a !== undefined && b !== undefined && (position.get(a) ?? 0) < (position.get(b) ?? 0)) best = i
    }
    const name = ready.splice(best, 1)[0]
    if (name === undefined) break
    ordered.push(name)
    for (const dependent of beforeOf.get(name) ?? []) {
      const depsOf = remaining.get(dependent)
      if (depsOf === undefined) continue
      depsOf.delete(name)
      if (depsOf.size === 0 && !ordered.includes(dependent) && !ready.includes(dependent)) ready.push(dependent)
    }
  }
  if (ordered.length < names.length) {
    return { ok: false, cycle: names.filter(name => !ordered.includes(name)) }
  }
  return { ok: true, order: ordered }
}

/**
 * Apply a new community-bundle order to the profile manifest. The official
 * in-box bundles keep their exact positions; `newOrder` must be a permutation
 * of the current community bundles (no duplicates, no additions, no
 * omissions). On any failure the manifest is left untouched.
 * @returns the new full stack on success, or an error description.
 */
export function applyBundleOrder(profileDir: string, newOrder: string[]): { ok: true; bundles: string[] } | { ok: false; error: string } {
  const { bundles } = readBundleStack(profileDir)
  const merged = mergeOrder(bundles, newOrder)
  if (!merged.ok) return merged
  try {
    const manifestPath = join(profileDir, 'package.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      dsh?: { profile?: { bundles?: unknown } }
    }
    manifest.dsh ??= {}
    manifest.dsh.profile ??= {}
    manifest.dsh.profile.bundles = merged.bundles
    writeFileAtomic(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
    return merged
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
