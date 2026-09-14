/**
 * Named plugin presets — issue #98 (phase 3), the "save different plugin
 * combinations" product shape. A preset captures the community-bundle order
 * and the disabled-plugin list of the profile at save time; applying one
 * replays the composition under the candidate order (trialValidate), refuses
 * on failure, auto-snapshots the profile (createProfileSnapshot), and only
 * then writes the bundle order and disable list.
 *
 * Presets persist in `<profile>/.dsh-market/presets.json` (market-owned
 * state, like snapshots) — deliberately separate from state.json, whose
 * shape routes.ts owns.
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readMarketState, writeMarketState } from './hot.ts'
import { applyBundleOrder, mergeOrder, readBundleRules, readBundleStack, validateOrder } from './order.ts'
import { createProfileSnapshot, DEFAULT_MAX_SNAPSHOTS } from './snapshot.ts'
import { trialValidate, type TrialDiff, type TrialIssue } from './trial.ts'
import { logEvent } from './log.ts'

/** Group-style name rule: letters/digits (incl. CJK), spaces, _, -; ≤ 40 chars, at least one non-space. */
const PRESET_NAME_RE = /^[\p{L}\p{N}_ -]{1,40}$/u

/**
 * The market's own package names. The toggle route refuses to disable them;
 * a preset must never carry them in its disabled list either — otherwise
 * applying a preset (or importing one) could disable the very page doing the
 * applying (issue #98 analysis: applyPreset self-disable guard). They are
 * filtered at save/import time and again at apply time (defense in depth).
 */
const MARKET_SELF_NAMES = new Set(['dsh-market', 'dshmarket'])

/** Maximum presets stored per profile (quota — issue #98 analysis). */
export const MAX_PRESETS = 50

/**
 * Atomic same-directory replace (write temp + rename): a crash mid-write can
 * never leave presets.json truncated, which would silently drop every saved
 * preset on the next read.
 */
function writeFileAtomic(file: string, content: string): void {
  const temp = `${file}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  writeFileSync(temp, content)
  renameSync(temp, file)
}

/** Drop the market's own names from a raw disabled list (strings only). */
function sanitizeDisabled(disabled: unknown): string[] {
  if (!Array.isArray(disabled)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of disabled) {
    if (typeof item !== 'string' || item === '') continue
    if (MARKET_SELF_NAMES.has(item)) continue
    if (seen.has(item)) continue
    seen.add(item)
    out.push(item)
  }
  return out
}

export interface Preset {
  name: string
  /** Community-bundle order this preset restores. */
  bundleOrder: string[]
  /** Disabled plugin names this preset restores. */
  disabled: string[]
  createdAt: number
}

export interface PresetResult {
  ok: boolean
  error?: string
  /** Set when applyPreset auto-created a pre-change snapshot. */
  snapshot?: string
}

function presetsFile(profileDir: string): string {
  return join(profileDir, '.dsh-market', 'presets.json')
}

function readPresets(profileDir: string): Preset[] {
  try {
    const value = JSON.parse(readFileSync(presetsFile(profileDir), 'utf8')) as { presets?: unknown }
    if (!Array.isArray(value.presets)) return []
    return value.presets.filter((preset): preset is Preset =>
      preset !== null && typeof preset === 'object'
      && typeof (preset as Preset).name === 'string'
      && Array.isArray((preset as Preset).bundleOrder)
      && Array.isArray((preset as Preset).disabled),
    )
  } catch {
    return []
  }
}

function writePresets(profileDir: string, presets: Preset[]): void {
  mkdirSync(join(profileDir, '.dsh-market'), { recursive: true, mode: 0o700 })
  writeFileAtomic(presetsFile(profileDir), `${JSON.stringify({ presets }, null, 2)}\n`)
}

/** All saved presets, newest first. */
export function listPresets(profileDir: string): Preset[] {
  return readPresets(profileDir).sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * Save the current composition state as a named preset. The bundle order is
 * validated against the current community bundles so a stale snapshot can
 * never be stored.
 */
export function savePreset(
  profileDir: string,
  name: unknown,
  bundleOrder: unknown,
  disabled: unknown,
): PresetResult {
  if (typeof name !== 'string' || !PRESET_NAME_RE.test(name) || name.trim() === '') {
    return { ok: false, error: 'invalid preset name / 组合名称无效' }
  }
  if (!Array.isArray(bundleOrder) || !bundleOrder.every(item => typeof item === 'string')) {
    return { ok: false, error: 'bundle order must be an array of names / bundle 顺序必须是名称数组' }
  }
  // The stored order must be a permutation of the CURRENT community bundles:
  // a stale snapshot is refused here instead of failing later at apply time
  // (issue #98 review M3 — the comment now matches the implementation).
  const { community } = readBundleStack(profileDir)
  const order = bundleOrder as string[]
  if (new Set(order).size !== order.length || order.length !== community.length || order.some(name => !community.includes(name))) {
    return { ok: false, error: 'bundle order must be a permutation of the current community bundles / bundle 顺序必须是当前社区 bundle 的排列' }
  }
  const normalizedDisabled = sanitizeDisabled(disabled)
  const presets = readPresets(profileDir)
  if (presets.some(preset => preset.name === name)) {
    return { ok: false, error: 'a preset with this name already exists / 同名组合已存在' }
  }
  // Quota (issue #98 analysis): a bounded store keeps the file small and the
  // list usable; refuse instead of silently trimming.
  if (presets.length >= MAX_PRESETS) {
    return { ok: false, error: `preset quota reached (${MAX_PRESETS}) — delete one first / 组合数量已达上限（${MAX_PRESETS}），请先删除一个` }
  }
  presets.push({
    name,
    bundleOrder: order,
    disabled: normalizedDisabled,
    createdAt: Date.now(),
  })
  writePresets(profileDir, presets)
  logEvent('info', 'preset', `saved "${name}" (${order.length} bundles, ${normalizedDisabled.length} disabled)`)
  return { ok: true }
}

/** Delete a named preset. */
export function deletePreset(profileDir: string, name: unknown): PresetResult {
  if (typeof name !== 'string') return { ok: false, error: 'invalid preset name / 组合名称无效' }
  const presets = readPresets(profileDir)
  const next = presets.filter(preset => preset.name !== name)
  if (next.length === presets.length) return { ok: false, error: 'preset not found / 组合不存在' }
  writePresets(profileDir, next)
  logEvent('info', 'preset', `deleted "${name}"`)
  return { ok: true }
}

/** The concrete change a preset apply would make — computed BEFORE writing. */
export interface PresetChange {
  /** Bundles whose position changes under the preset order. */
  reordered: string[]
  /** Plugins the preset would ENABLE (currently disabled, enabled by the preset). */
  enabled: string[]
  /** Plugins the preset would DISABLE (currently enabled, disabled by the preset). */
  disabled: string[]
  /** True when nothing would change. */
  noop: boolean
}

export interface PresetApplyResult extends PresetResult {
  changes?: PresetChange
  /** Set when the preset order fails trial validation — errors + current-vs-candidate diff (issue #125 review). */
  trial?: { errors: TrialIssue[]; warnings: TrialIssue[]; diff: TrialDiff }
}

/**
 * The preset's bundle set vs the profile's current community bundles —
 * a stale preset (saved before a plugin was installed/uninstalled) can no
 * longer be applied as-is, but its intent (enabled/disabled plugins,
 * relative order) is still previewable.
 */
export interface PresetMismatch {
  /** Bundles in the current profile that the preset does not mention. */
  missing: string[]
  /** Bundles the preset mentions that are not installed anymore. */
  extra: string[]
  /** True when the preset's bundle set differs from the current one. */
  stale: boolean
}

/** Compare a preset's order against the current community bundle set. */
function presetMismatch(profileDir: string, bundleOrder: string[]): PresetMismatch {
  const { community } = readBundleStack(profileDir)
  const current = new Set(community)
  const preset = new Set(bundleOrder)
  const missing = community.filter(name => !preset.has(name))
  const extra = bundleOrder.filter(name => !current.has(name))
  return { missing, extra, stale: missing.length > 0 || extra.length > 0 }
}

/**
 * Preview what applying a preset would change, WITHOUT writing anything.
 * A stale preset (bundle set mismatch) is NOT a hard failure: the preview
 * reports the mismatch alongside the still-computable changes (relative
 * order + enabled/disabled diffs over the intersection).
 */
export function previewPreset(profileDir: string, name: unknown): PresetResult & { changes?: PresetChange; mismatch?: PresetMismatch } {
  if (typeof name !== 'string') return { ok: false, error: 'invalid preset name / 组合名称无效' }
  const preset = readPresets(profileDir).find(item => item.name === name)
  if (preset === undefined) return { ok: false, error: 'preset not found / 组合不存在' }

  // Full composition replay only makes sense when the bundle SET matches;
  // otherwise report the mismatch (and keep the apply path's hard refusal).
  const mismatch = presetMismatch(profileDir, preset.bundleOrder)
  if (mismatch.stale) {
    const detail = [...mismatch.missing.map(n => `+${n}`), ...mismatch.extra.map(n => `-${n}`)].join(' ')
    return {
      ok: false,
      mismatch,
      error: `preset is out of date — current profile differs: ${detail} / 组合已过期——当前 profile 的插件列表已变化：${detail}`,
    }
  }

  const trial = trialValidate(profileDir, preset.bundleOrder)
  if (!trial.ok) {
    const first = trial.errors[0]
    return {
      ok: false,
      error: `trial validation failed — ${first?.message ?? 'composition would not boot'} / 试启动校验失败：${first?.message ?? '组合无法启动'}`,
    }
  }

  const { community } = readBundleStack(profileDir)
  const reordered = community.filter((name, index) => name !== preset.bundleOrder[index])
  const currentDisabled = readMarketState(profileDir).disabled
  // The market's own names are never applied (self-disable guard) — exclude
  // them from the diff too, so the preview matches what apply will actually do.
  const presetDisabled = new Set(preset.disabled.filter(name => !MARKET_SELF_NAMES.has(name)))
  const enabled = [...currentDisabled].filter(name => !presetDisabled.has(name))
  const disabled = [...presetDisabled].filter(name => !currentDisabled.has(name))
  return {
    ok: true,
    changes: {
      reordered,
      enabled,
      disabled,
      noop: reordered.length === 0 && enabled.length === 0 && disabled.length === 0,
    },
  }
}

/**
 * Apply a saved preset: trial-validate the candidate order first (refuse
 * without writing on any boot-breaking issue), auto-snapshot the profile,
 * then write the bundle order and the disable list. The response carries the
 * change preview so the UI can report exactly what moved.
 */
export function applyPreset(profileDir: string, name: unknown, maxSnapshots: number = DEFAULT_MAX_SNAPSHOTS): PresetApplyResult {
  if (typeof name !== 'string') return { ok: false, error: 'invalid preset name / 组合名称无效' }
  const preset = readPresets(profileDir).find(item => item.name === name)
  if (preset === undefined) return { ok: false, error: 'preset not found / 组合不存在' }

  // A stale preset (bundle set differs) cannot be applied as-is; say exactly
  // what differs instead of the raw trial-merge error (issue #98 report).
  const mismatch = presetMismatch(profileDir, preset.bundleOrder)
  if (mismatch.stale) {
    const detail = [...mismatch.missing.map(n => `+${n}`), ...mismatch.extra.map(n => `-${n}`)].join(' ')
    logEvent('warn', 'preset', `apply "${name}" rejected: preset out of date — ${detail}`)
    return {
      ok: false,
      error: `preset is out of date — current profile differs: ${detail} / 组合已过期——当前 profile 的插件列表已变化：${detail}`,
    }
  }

  const trial = trialValidate(profileDir, preset.bundleOrder)
  if (!trial.ok) {
    const first = trial.errors[0]
    logEvent('warn', 'preset', `apply "${name}" rejected by trial validation: ${first?.message ?? 'unknown'}`)
    return {
      ok: false,
      error: `trial validation failed — ${first?.message ?? 'composition would not boot'} / 试启动校验失败：${first?.message ?? '组合无法启动'}`,
      trial: { errors: trial.errors, warnings: trial.warnings, diff: trial.diff },
    }
  }
  // Before/after rules (review B5): the reorder endpoint refuses rule-violating
  // stacks; the preset path must enforce the same gate before writing.
  const { bundles } = readBundleStack(profileDir)
  const merged = mergeOrder(bundles, preset.bundleOrder)
  if (merged.ok) {
    const conflicts = validateOrder(merged.bundles, readBundleRules(profileDir))
    if (conflicts.length > 0) {
      logEvent('warn', 'preset', `apply "${name}" rejected by before/after rules: ${conflicts.map(c => c.reason).join('; ')}`)
      return {
        ok: false,
        error: 'the preset order violates declared before/after rules / 组合顺序违反了插件声明的 before/after 规则',
      }
    }
  }

  const preview = previewPreset(profileDir, name)
  const captured = createProfileSnapshot(profileDir, maxSnapshots)
  if (!captured.ok) {
    logEvent('error', 'preset', `apply "${name}" refused: ${captured.error}`)
    return { ok: false, error: captured.error }
  }
  const snapshot = captured.snapshot
  const ordered = applyBundleOrder(profileDir, preset.bundleOrder)
  if (!ordered.ok) {
    return { ok: false, error: ordered.error }
  }
  const state = readMarketState(profileDir)
  // Self-disable guard (issue #98 analysis): a preset (possibly imported)
  // carrying the market's own name must never switch this page off — drop
  // those names from the applied disabled list.
  const filtered = preset.disabled.filter(name => !MARKET_SELF_NAMES.has(name))
  if (filtered.length !== preset.disabled.length) {
    logEvent('warn', 'preset', `apply "${name}": dropped market self-names from the disabled list`)
  }
  state.disabled = new Set(filtered)
  writeMarketState(profileDir, state)
  logEvent('info', 'preset', `applied "${name}" (snapshot ${snapshot.id})`)
  return { ok: true, snapshot: snapshot.id, changes: preview.ok ? preview.changes : undefined }
}

/*
 * Presets deliberately have NO import/export of their own.
 *
 * They had one on the branch this came from, and it was fine code — but
 * the market already answers "take this configuration elsewhere" under
 * Advanced -> Backup & Restore, which carries the whole profile rather
 * than one slice of it. Two export buttons in two tabs, writing two file
 * formats that overlap, is a question the user has to stop and answer
 * before they can do the thing they came to do.
 *
 * Presets stay the local answer to "switch between combinations I have
 * saved". Moving them to another machine is the backup's job.
 */
