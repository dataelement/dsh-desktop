/**
 * Trial validation for composition changes — issue #98 (phase 3), the
 * "trial boot" half of #19 reduced to what is safe and offline: before any
 * bundle-order or preset change is written to the profile, replay the
 * composition with the CANDIDATE order using the same entry-list machinery
 * the real boot uses (src/check.ts's buildBundleLayers + composeLayers), and
 * refuse the change when the composed tree would fail to boot (duplicate
 * loader entry ids, unresolvable bundle layers, unparseable patches).
 *
 * No process, no network, no writes to the profile: the real profile is only
 * read; if the candidate is bad, the failure is reported and nothing is
 * applied (the caller then skips the write-back entirely).
 *
 * Issue #125 review: the CURRENT composition is replayed alongside the
 * candidate, so the response also carries a current-vs-candidate diff
 * (overrides / orphans / duplicates the reorder introduces) — not just
 * whether it boots.
 *
 * Bundle resolution is deliberately SHARED with the check report
 * (check.ts's buildBundleLayers): the dsh installation anchor first, then
 * Node's module search from the profile (workspace-root hoisting) — so the
 * trial can never disagree with the diagnostics about what a bundle is or
 * where it lives, and official bundles resolve even when they are only
 * hoisted to the workspace root.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  buildBundleLayers, composeLayers, findDshInstallDir, parsePatchFile,
  type DuplicateId, type LayerInput, type OrphanRow, type OverrideRow,
} from './check.ts'
import { resolveDshHome } from './home-paths.ts'
import { mergeOrder, readBundleStack } from './order.ts'

export interface TrialIssue {
  layer: string
  message: string
}

/** Current-vs-candidate composition diff (issue #125 review). */
export interface TrialDiff {
  /** Override relationships introduced by the candidate (not present in the current composition). */
  overrides: OverrideRow[]
  /** Orphan rows introduced by the candidate. */
  orphans: OrphanRow[]
  /** Duplicate loader entry ids introduced by the candidate. */
  duplicates: DuplicateId[]
}

export interface TrialResult {
  ok: boolean
  errors: TrialIssue[]
  warnings: TrialIssue[]
  duplicates: DuplicateId[]
  /** The composed loader rows under the candidate order. */
  rows: { id: string; layer: string }[]
  /** What the reorder would change vs the current composition (issue #125 review). */
  diff: TrialDiff
}

/**
 * Replay the profile composition with `newCommunityOrder` (the candidate
 * community-bundle order; official bundles keep their exact positions) and
 * report anything that would break the boot. Pure read.
 */
export function trialValidate(
  profileDir: string,
  newCommunityOrder: string[],
  options: { dshInstallDir?: string | null; homeDir?: string } = {},
): TrialResult {
  const errors: TrialIssue[] = []
  const warnings: TrialIssue[] = []
  const current = readBundleStack(profileDir)
  // Same merge the apply path uses (order.ts mergeOrder): the trial replays
  // EXACTLY the stack a successful apply would write.
  const merged = mergeOrder(current.bundles, newCommunityOrder)
  if (!merged.ok) {
    return {
      ok: false, errors: [{ layer: '(order)', message: merged.error }], warnings,
      duplicates: [], rows: [],
      diff: { overrides: [], orphans: [], duplicates: [] },
    }
  }
  const candidate = merged.bundles

  // Shared bundle-layer build — identical resolution to analyzeProfile
  // (dsh install anchor first, then Node module search from the profile).
  let specs: Record<string, string> = {}
  try {
    const manifest = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
    }
    specs = manifest.dependencies ?? {}
  } catch { /* specs stay empty — sources read as '(not a direct dependency)' */ }
  const dshInstall = options.dshInstallDir !== undefined ? options.dshInstallDir : findDshInstallDir()

  // Same user/home patch layers as the boot (and the check report) — shared
  // by BOTH compositions.
  const patchLayers: LayerInput[] = []
  const userPatchPath = join(profileDir, 'cordis.patch.yml')
  if (existsSync(userPatchPath)) {
    const patches = parsePatchFile(userPatchPath)
    patchLayers.push({ label: 'user-patch', kind: 'user', patches: patches ?? [], parseError: null })
    if (patches === null) errors.push({ layer: 'user-patch', message: 'cordis.patch.yml is not a valid entry list / cordis.patch.yml 不是合法的条目列表' })
  }
  const home = resolveDshHome(options.homeDir)
  const homePatchPath = join(home, 'cordis.patch.yml')
  if (existsSync(homePatchPath)) {
    const patches = parsePatchFile(homePatchPath)
    patchLayers.push({ label: 'home-patch', kind: 'home', patches: patches ?? [], parseError: null })
    if (patches === null) errors.push({ layer: 'home-patch', message: 'home cordis.patch.yml is not a valid entry list / 全局 cordis.patch.yml 不是合法的条目列表' })
  }

  /** Compose the loader tree for one bundle order (current or candidate). */
  const compose = (bundleOrder: string[]): { built: ReturnType<typeof buildBundleLayers>; composed: ReturnType<typeof composeLayers> } => {
    const built = buildBundleLayers(profileDir, bundleOrder, specs, dshInstall)
    return { built, composed: composeLayers([...built.layers, ...patchLayers]) }
  }

  const currentState = compose(current.bundles)
  const candidateState = compose(candidate)
  const composed = candidateState.composed

  for (const bundle of candidateState.built.bundles) {
    if (bundle.error !== null) errors.push({ layer: bundle.name, message: bundle.error })
    if (bundle.parseError !== null) errors.push({ layer: bundle.name, message: bundle.parseError })
  }
  for (const dup of composed.duplicates) {
    errors.push({ layer: dup.layers.join(' / '), message: `duplicate loader entry id ${JSON.stringify(dup.id)} (${dup.count} rows) / 重复的 loader 条目 id ${JSON.stringify(dup.id)}` })
  }
  for (const orphan of composed.orphans) {
    warnings.push({ layer: orphan.layer, message: `${orphan.id}: ${orphan.reason}` })
  }

  // Issue #125 review: what does the reorder CHANGE? Compare the candidate
  // composition against the current one — only candidate-introduced
  // overrides / orphans / duplicates are reported.
  const currentDupIds = new Set(currentState.composed.duplicates.map(d => d.id))
  const sameOverride = (a: OverrideRow, b: OverrideRow): boolean =>
    a.id === b.id && a.layer === b.layer && a.overriddenLayers.join('\u0000') === b.overriddenLayers.join('\u0000')
  const diff: TrialDiff = {
    overrides: composed.overrides.filter(o => !currentState.composed.overrides.some(c => sameOverride(o, c))),
    orphans: composed.orphans.filter(o => !currentState.composed.orphans.some(c => c.id === o.id && c.layer === o.layer)),
    duplicates: composed.duplicates.filter(d => !currentDupIds.has(d.id)),
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    duplicates: composed.duplicates,
    rows: composed.rows.map(row => ({ id: row.id, layer: row.layer })),
    diff,
  }
}
