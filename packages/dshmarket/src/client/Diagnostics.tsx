/**
 * Diagnostics tab — issue #98: renders the profile composition check report
 * served by the host route /dsh-market/check (see src/check.ts). Below the
 * report sit the phase 2/3 action panels: a community-bundle ordering block
 * (reorder locally with ↑/↓, POST to /dsh-market/bundle-order) and a
 * snapshots & rollback panel (snapshot-panel.tsx) — collapsible, default
 * collapsed, and lazy-fetching on first expand. The plugin presets panel
 * ships in a later stacked PR.
 *
 * Read-only view of the loading-layer stack and the conflict surface: bundle
 * order (official vs community), duplicate loader entry ids, peer dependency
 * mismatches, multi-version core packages, overrides and orphan patches. The
 * report
 * shape mirrors the CheckReport interface in src/check.ts; it is re-declared
 * here because the client bundle is built independently of the host tree.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { Button, IconChevronDownOutline14, IconChevronRightOutline14, IconLoadingOutline16, IconRefreshOutline14, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './Market.module.css'
import { api } from './market-data.ts'
import type { Translate } from './market-data.ts'
import { PresetPanel } from './preset-panel.tsx'
import { SnapshotPanel } from './snapshot-panel.tsx'

/** Mirrors BundleLayer in src/check.ts. */
interface BundleLayer {
  name: string
  source: string
  kind: 'official' | 'community'
  directory: string | null
  patchPath: string | null
  error: string | null
  entries: string[]
  parseError: string | null
}

/** Mirrors DuplicateId in src/check.ts. */
interface DuplicateId {
  id: string
  layers: string[]
  count: number
}

/** Mirrors OverrideRow in src/check.ts. */
interface OverrideRow {
  id: string
  layer: string
  overriddenLayers: string[]
}

/** Mirrors OrphanRow in src/check.ts. */
interface OrphanRow {
  id: string
  layer: string
  reason: string
}

/** Mirrors PeerVerdict in src/check.ts. */
type PeerVerdict =
  | {
      kind: 'risk'
      risk: { plugin: string; peer: string; range: string; resolved: string; direction: 'belowMin' | 'aboveMax' }
    }
  | {
      kind: 'warning'
      warning: { plugin: string; peer: string; range: string; resolved: string; reason: 'aboveMax' | 'optional' }
    }
  | { kind: 'none' }

/** Mirrors PeerMismatch in src/check.ts. */
interface PeerMismatch {
  plugin: string
  name: string
  range: string
  resolved: string | null
  satisfied: boolean | null
  optional?: boolean
  verdict?: PeerVerdict
}

/** Mirrors MultiVersion in src/check.ts. */
interface MultiVersion {
  name: string
  versions: string[]
  hoisted: string | null
}

/** Mirrors CheckSummary in src/check.ts. */
interface CheckSummary {
  ok: boolean
  errors: string[]
  warnings: string[]
}

/** Mirrors OrderConflict in src/order.ts (top-level orderConflicts in CheckReport). */
interface OrderConflict {
  name: string
  reason: string
}

/** Mirrors CheckReport in src/check.ts. */
interface CheckReport {
  profile: string
  scannedAt: number
  bundles: BundleLayer[]
  duplicates: DuplicateId[]
  overrides: OverrideRow[]
  orphans: OrphanRow[]
  peerMismatches: PeerMismatch[]
  multiVersion: MultiVersion[]
  summary: CheckSummary
  /** #98 phase 2: validateOrder result for the CURRENT bundle order, when the host emits it. */
  orderConflicts?: OrderConflict[]
  /** #98 opt: loader rows sharing one name — informational display only, never a conflict (review #109). */
  duplicateNames?: Array<{ name: string; layers: string[]; count: number }>
  /** #98 opt: LOOT-style suggested community order satisfying every rule. */
  suggestedOrder?: { ok: true; order: string[] } | { ok: false; cycle: string[] } | null
}

/**
 * A collapsible report section: header shows title + count + chevron; the
 * body stays mounted (hidden via CSS when collapsed) so every block keeps
 * its state. ALL blocks are collapsed by default — the summary strip above
 * gives the overview, and a problem block's title is highlighted and its
 * collapsed `overview` line shows the first issue, so nothing important is
 * hidden. Expand a block to see its full content.
 */
function Section(props: {
  title: string
  count: number
  empty: string
  defaultOpen?: boolean
  problem?: boolean
  overview?: ReactNode
  /** Render `children` even at count 0 (e.g. a zero-mismatch peer block whose
   * informational disclosure must stay reachable). */
  alwaysShowBody?: boolean
  children: ReactNode
}) {
  const { title, count, empty, defaultOpen, problem = true, overview, alwaysShowBody = false, children } = props
  const [open, setOpen] = useState(defaultOpen ?? false)
  const alert = problem && count > 0
  return (
    <section className={css.diagSection}>
      <button type="button" className={css.collapseHead} onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className={css.collapseIcon}>
          {open ? <IconChevronDownOutline14 size={14} /> : <IconChevronRightOutline14 size={14} />}
        </span>
        {alert && <span className={css.diagAlert}>⚠</span>}
        <span className={`${css.collapseTitle}${alert ? ` ${css.diagAlert}` : ''}`}>{title}</span>
        <span className={css.diagCount}>({count})</span>
        <span className={css.grow} />
      </button>
      {!open && overview !== undefined && <div className={css.sectionOverview}>{overview}</div>}
      <div className={css.collapseBody} style={open ? undefined : { display: 'none' }}>
        {count === 0 && !alwaysShowBody ? <div className={css.diagEmpty}>{empty}</div> : children}
      </div>
    </section>
  )
}

/** A collapsible section that KEEPS its children mounted (hidden via CSS when
 * collapsed) so the phase 3 panels below retain their loaded data and
 * in-progress edits across collapses. Children mount from the start, but the
 * panels only fetch when `open` first becomes true.
 */
function CollapsibleSection(props: { title: string; count?: number; open: boolean; onToggle: () => void; children: ReactNode }) {
  const { title, count, open, onToggle, children } = props
  return (
    <section className={css.diagSection}>
      <button type="button" className={css.collapseHead} onClick={onToggle} aria-expanded={open}>
        <span className={css.collapseIcon}>
          {open ? <IconChevronDownOutline14 size={14} /> : <IconChevronRightOutline14 size={14} />}
        </span>
        <span className={css.collapseTitle}>{title}</span>
        {count !== undefined && <span className={css.diagCount}>({count})</span>}
        <span className={css.grow} />
      </button>
      <div className={css.collapseBody} style={open ? undefined : { display: 'none' }}>
        {children}
      </div>
    </section>
  )
}
/** Map an orphan patch reason (src/check.ts) to a locale key for its badge. */
function orphanKindLabel(reason: string): string {
  if (reason === 'insert is not an array') return 'orphanInsertNotArray'
  if (reason === 'insert target not found') return 'orphanInsertTargetMissing'
  if (reason === 'insert target is not a group') return 'orphanInsertTargetNotGroup'
  if (reason === 'id required for non-insert patch') return 'orphanIdRequired'
  if (reason === 'patch target not found') return 'orphanPatchTargetMissing'
  if (reason.startsWith('name mismatch')) return 'orphanNameMismatch'
  return 'orphanReasonOther'
}

/** Badge label for one risk-tier peer row (#201). */
function peerRiskLabel(peer: PeerMismatch, t: Translate): string {
  return peer.verdict?.kind === 'risk' && peer.verdict.risk.direction === 'aboveMax'
    ? t('peerRiskAboveMax')
    : t('peerRiskBelowMin')
}

/** Badge label for one warning-tier peer row (optional / aboveMax / legacy). */
function peerWarningLabel(peer: PeerMismatch, t: Translate): string {
  if (peer.verdict?.kind !== 'warning') return t('checkUnsatisfied')
  return peer.verdict.warning.reason === 'optional' ? t('peerWarnOptional') : t('peerWarnAboveMax')
}

/**
 * Fetch and render the profile check report. Refetches on every mount, so
 * switching tabs away and back re-runs the (cheap, read-only) analysis; the
 * phase 3 panels below call `refresh()` after applying changes.
 */
export function Diagnostics(props: { t: Translate }) {
  const { t } = props
  const [report, setReport] = useState<CheckReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [orderOpen, setOrderOpen] = useState(false)
  const [explainOpen, setExplainOpen] = useState(false)
  const [snapOpen, setSnapOpen] = useState(false)
  const [presetOpen, setPresetOpen] = useState(false)
  const [fixMsg, setFixMsg] = useState<string | null>(null)
  /** The built AI-fix prompt when the clipboard path failed — rendered as a
   * selectable text block so the user can still copy it manually. */
  const [fixFallback, setFixFallback] = useState<string | null>(null)
  /** Bump to re-run the /dsh-market/check fetch after an order/snapshot-restore apply. */
  const [version, setVersion] = useState(0)
  const refresh = useCallback(() => setVersion(v => v + 1), [])

  // --- issue #98 phase 2 (step 1): community-bundle ordering ---------------
  /** Community bundle names from the report, in declared order. */
  const communityNames = useMemo(
    () => report === null ? [] : report.bundles.filter(bundle => bundle.kind === 'community').map(bundle => bundle.name),
    [report],
  )
  /** Local editing state: re-synced whenever the report (re)loads. */
  const [order, setOrder] = useState<string[]>(communityNames)
  const [orderMsg, setOrderMsg] = useState<string | null>(null)
  const [orderErr, setOrderErr] = useState<string | null>(null)
  const [orderBusy, setOrderBusy] = useState(false)
  /** Current-vs-candidate composition diff from a rejected static-composition
   * validation (#125 review): what the candidate would change, shown as a hint. */
  const [orderDiff, setOrderDiff] = useState<{ overrides: number; orphans: number; duplicates: number } | null>(null)
  /**
   * Content identity of the last community order this draft synced to. A
   * refresh() refetch returns a NEW array even when the order is unchanged,
   * so a naive `setOrder(communityNames)` effect would wipe the user's
   * in-progress drag/↑↓ edits on every unrelated re-check. Only resync when
   * the report's community order actually CHANGED (apply order / snapshot
   * restore) — an identical refetch keeps the draft (review M2).
   */
  const syncedOrderRef = useRef<string[] | null>(null)
  useEffect(() => {
    const synced = syncedOrderRef.current
    const same = synced !== null
      && synced.length === communityNames.length
      && communityNames.every((name, i) => name === synced[i])
    if (same) return
    syncedOrderRef.current = communityNames
    setOrder(communityNames)
  }, [communityNames])

  /** Swap one community bundle with its neighbour (-1 up, +1 down). */
  const moveBundle = (index: number, delta: -1 | 1) => {
    setOrder(prev => {
      const next = [...prev]
      const target = index + delta
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target]!, next[index]!]
      return next
    })
  }

  // --- drag & drop reordering (draft only — saved by 应用顺序 / Apply order) ---
  /** Row being dragged (index into the local `order` draft). */
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  /** Row currently under the pointer, highlighted as the drop target. */
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const onRowDragStart = (index: number) => (event: DragEvent<HTMLDivElement>) => {
    if (orderBusy) {
      event.preventDefault()
      return
    }
    setDragIndex(index)
    event.dataTransfer?.setData?.('text/plain', order[index] ?? '')
    if (event.dataTransfer !== undefined) event.dataTransfer.effectAllowed = 'move'
  }

  const onRowDragOver = (index: number) => (event: DragEvent<HTMLDivElement>) => {
    if (dragIndex === null || dragIndex === index) return
    // preventDefault marks the row as a valid drop target (no auto-scroll).
    event.preventDefault()
    if (event.dataTransfer !== undefined) event.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const onRowDragLeave = (index: number) => () => {
    setDragOverIndex(prev => prev === index ? null : prev)
  }

  const onRowDrop = (index: number) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const from = dragIndex
    setDragIndex(null)
    setDragOverIndex(null)
    if (from === null || from === index) return
    // Reorder the LOCAL draft only; the host is told via 应用顺序 / Apply order.
    setOrder(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(index, 0, moved!)
      return next
    })
  }

  const onRowDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  /** POST the current community order; the host statically validates the
   * candidate composition (dry-run replay) before writing. */
  const applyOrder = (target?: string[]) => {
    if (orderBusy) return
    setOrderBusy(true)
    setOrderMsg(null)
    setOrderErr(null)
    setOrderDiff(null)
    fetch(api('/dsh-market/bundle-order'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ order: target ?? order }),
    })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as {
          ok?: unknown
          error?: unknown
          trial?: {
            errors?: Array<{ layer?: unknown; message?: unknown }>
            warnings?: unknown[]
            diff?: { overrides?: unknown[]; orphans?: unknown[]; duplicates?: unknown[] }
          }
        } | null
        if (!res.ok || body?.ok !== true) {
          // A rejected static-composition validation (422) carries the
          // current-vs-candidate diff — surface what the candidate would
          // change as an informational hint (issue #125 review).
          const diff = body?.trial?.diff
          const overrides = diff?.overrides?.length ?? 0
          const orphans = diff?.orphans?.length ?? 0
          const duplicates = diff?.duplicates?.length ?? 0
          setOrderDiff(overrides + orphans + duplicates > 0 ? { overrides, orphans, duplicates } : null)
          const firstMessage = body?.trial?.errors?.[0]?.message
          setOrderErr(body?.trial !== undefined
            ? t('orderTrialFail').replace('{0}', firstMessage !== undefined ? String(firstMessage) : '')
            : String(body?.error ?? `HTTP ${String(res.status)}`))
          return
        }
        setOrderDiff(null)
        setOrderMsg(t('orderApplied'))
        // Refetch the report so communityNames / the ordering draft reflect
        // the applied order.
        refresh()
      })
      .catch((err: unknown) => setOrderErr(err instanceof Error ? err.message : String(err)))
      .finally(() => setOrderBusy(false))
  }

  useEffect(() => {
    let live = true
    // Do NOT null the report here: a refresh() (manual re-check, or after an
    // order/snapshot-restore apply) must keep the previous data visible and
    // must not clobber the in-progress ordering draft, which re-syncs from
    // communityNames only when the report actually changes (review M2).
    setError(null)
    fetch(api('/dsh-market/check'), { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
        const body = (await res.json()) as CheckReport
        if (live) setReport(body)
      })
      .catch((err: unknown) => {
        if (live) setError(err instanceof Error ? err.message : String(err))
      })
    return () => { live = false }
  }, [version])

  if (error !== null) {
    return <div className={css.err}>{t('checkLoadFail')}{error}</div>
  }
  if (report === null) {
    return (
      <div className={css.loading}>
        <span className={css.spin}><IconLoadingOutline16 size={22} /></span>
        {t('checkLoading')}
      </div>
    )
  }

  const summary = report.summary
  const suggested = report.suggestedOrder ?? null
  // #201: confirmed mismatches are tiered by the server-side classifyPeer
  // verdict instead of the old binary `satisfied === false` split. A missing
  // verdict (older host) keeps the legacy behavior: confirmed = warning tier.
  const peerRisk = report.peerMismatches.filter(peer => peer.satisfied === false && peer.verdict?.kind === 'risk')
  const peerWarning = report.peerMismatches.filter(peer => peer.satisfied === false && (peer.verdict === undefined || peer.verdict.kind === 'warning'))
  // Classifier `none` (unparseable / * prerelease artifacts) and unevaluable
  // rows share the informational display tier; true rows stay satisfied.
  const peerInfo = report.peerMismatches.filter(peer =>
    (peer.satisfied === false && peer.verdict?.kind === 'none') || peer.satisfied === null)
  const peerSatisfied = report.peerMismatches.filter(peer => peer.satisfied === true)
  // Category counts for the overview strip: conflicts / peer tiers / order.
  // Conflicts = HARD duplicate loader entries only; same-name rows are
  // informational and stay out of the conflict count (review #109).
  const catConflict = report.duplicates.length
  const catRisk = peerRisk.length
  const catWarn = peerWarning.length
  const catInfo = peerInfo.length
  const catMulti = report.multiVersion.length
  const catOrder = report.orderConflicts?.length ?? 0
  const anyIssue = catConflict + catRisk + catWarn + catInfo + catMulti + catOrder > 0
  // AI-fix only shows for HARD issues — boot errors, duplicate entries, or a
  // directional peer RISK. Optional peers, aboveMax without an explicit
  // bound, and unknown rows are warning/info and never nudge an agent into
  // risky changes without a clear problem (#201, conservative UX).
  const hasHardIssues = summary.errors.length > 0
    || report.duplicates.length > 0
    || catRisk > 0

  /**
   * Build the AI-fix prompt (structured errors / duplicates / peer risks /
   * order conflicts + scope) and copy it to the clipboard. The user pastes it
   * into a new conversation and decides whether to send — the agent never runs
   * automatically.
   * (A previous auto-open/prefill attempt was dropped: it was unreliable
   * across host versions, so plain copy + toast is the contract.)
   */
  const startAgentFix = () => {
    const lines: string[] = []
    lines.push(t('aiFixIntro').replace('{0}', report.profile))
    lines.push('')
    // Self-identification guard FIRST: the prompt must make the receiving
    // agent detect whether it is itself the harness running this profile.
    // If it is, mutating the live composition — or upgrading/restarting the
    // harness or core packages, or reinstalling deps — would kill the very
    // session doing the fix, so those actions are forbidden and only a plan
    // to run externally is produced. When the agent is NOT the target harness
    // (a separate process), the conservative in-place scope below applies.
    lines.push(t('aiFixDetect'))
    lines.push('')
    lines.push(t('aiFixIfSelf'))
    lines.push('')
    // Structured prompt only (#201): boot errors, duplicate loader ids and
    // directional peer RISK rows. summary.warnings is no longer dumped — its
    // peer lines contain the whole 30+ warning/info noise this issue untangles.
    const errorLines = summary.errors.filter(line => !line.startsWith('duplicate loader entry id'))
    if (errorLines.length > 0) {
      lines.push(`${t('checkErrors')}:`)
      for (const e of errorLines) lines.push(`- ${e}`)
      lines.push('')
    }
    if (report.duplicates.length > 0) {
      lines.push(`${t('checkDuplicates')}:`)
      for (const dup of report.duplicates) lines.push(`- ${dup.id} × ${dup.count} (${dup.layers.join(' / ')})`)
      lines.push('')
    }
    if (peerRisk.length > 0) {
      lines.push(`${t('checkPeerRisk')}:`)
      for (const peer of peerRisk) {
        const direction = peer.verdict?.kind === 'risk' && peer.verdict.risk.direction === 'aboveMax'
          ? t('peerRiskAboveMax')
          : t('peerRiskBelowMin')
        lines.push(`- ${peer.plugin} → ${peer.name}@${peer.range} (${t('checkResolved')}: ${peer.resolved ?? '—'}, ${direction})`)
      }
      lines.push('')
    }
    if ((report.orderConflicts ?? []).length > 0) {
      lines.push(`${t('catOrder')}:`)
      for (const c of report.orderConflicts ?? []) lines.push(`- ${c.name}: ${c.reason}`)
      lines.push('')
    }
    lines.push(t('aiFixScope'))
    lines.push('')
    lines.push(t('aiFixConservative'))
    const prompt = lines.join('\n')

    // Clipboard-first; on any failure (missing API or a rejected promise) show
    // the prompt in a selectable block so the user can still copy it by hand —
    // a bare "clipboard unavailable" message left nothing to copy.
    setFixMsg(null)
    setFixFallback(null)
    const fallback = () => setFixFallback(prompt)
    if (typeof navigator.clipboard?.writeText === 'function') {
      navigator.clipboard.writeText(prompt)
        .then(() => setFixMsg(t('aiFixCopied')))
        .catch(fallback)
    } else {
      fallback()
    }
  }

  return (
    <div className={css.diagPage}>
      <div className={css.diagSummary}>
        <span className={summary.ok ? css.okState : css.err}>
          <StateDot state={summary.ok ? 'done' : 'error'} size={8} />
          {summary.ok ? (anyIssue ? t('checkIssues') : t('diagOkAll')) : t('checkIssues')}
        </span>
        <span className={css.diagSummaryItem} title={t('checkDuplicates')}>
          <StateDot state="error" size={8} />{t('catConflict')}: {catConflict}
        </span>
        <span className={css.diagSummaryItem} title={t('checkPeerRisk')}>
          <StateDot state="error" size={8} />{t('catRisk')}: {catRisk}
        </span>
        <span className={css.diagSummaryItem} title={t('checkPeerWarning')}>
          <StateDot state="warning" size={8} />{t('catWarn')}: {catWarn}
        </span>
        <span className={css.diagSummaryItem} title={t('checkPeerInfoTier')}>
          <StateDot state="ongoing" size={8} />{t('catInfo')}: {catInfo}
        </span>
        <span className={css.diagSummaryItem} title={t('checkMultiVersion')}>
          <StateDot state="warning" size={8} />{t('checkMultiVersion')}: {catMulti}
        </span>
        <span className={css.diagSummaryItem} title={t('checkOrderTip')}>
          <StateDot state="warning" size={8} />{t('catOrder')}: {catOrder}
        </span>
        <span className={css.grow} />
        {hasHardIssues && (
          <Button variant="outline" size="sm" onClick={startAgentFix} title={t('aiFixHint')}>
            {t('aiFix')}
          </Button>
        )}
        <Button variant="ghost" size="sm" aria-label={t('checkRefresh')} onClick={refresh}>
          <IconRefreshOutline14 size={14} />
        </Button>
        <span className={css.diagSummaryMeta} title={report.profile}>{t('checkProfile')}: {report.profile}</span>
        <span className={css.diagSummaryMeta}>{new Date(report.scannedAt).toLocaleString()}</span>
      </div>
      {fixMsg !== null && <div className={css.okState}>{fixMsg}</div>}
      {fixFallback !== null && (
        <div className={css.fixFallback}>
          <p className={css.panelNote}>{t('aiFixFail')}</p>
          <textarea
            readOnly
            rows={10}
            className={css.fixFallbackText}
            value={fixFallback}
            onFocus={e => e.currentTarget.select()}
          />
        </div>
      )}

      <CollapsibleSection title={t('diagExplain')} open={explainOpen} onToggle={() => setExplainOpen(o => !o)}>
        <p className={css.panelNote}>{t('diagExplainText')}</p>
        <div className={css.diagList}>
          <div className={css.spec}>{t('diagTermBundle')}</div>
          <div className={css.spec}>{t('diagTermEntry')}</div>
          <div className={css.spec}>{t('diagTermPeer')}</div>
          <div className={css.spec}>{t('diagTermShadow')}</div>
          <div className={css.spec}>{t('diagTermOrphan')}</div>
          <div className={css.spec}>{t('diagTermOrder')}</div>
        </div>
      </CollapsibleSection>

      <Section
        title={t('checkErrors')}
        count={summary.errors.length}
        empty={t('checkErrorsEmpty')}
        overview={summary.errors.length > 0 ? summary.errors[0] : undefined}
      >
        <div className={css.diagList}>
          {summary.errors.map((line, i) => (
            <div key={i} className={css.err}>{line}</div>
          ))}
        </div>
      </Section>

      <Section
        title={t('checkWarnings')}
        count={summary.warnings.length}
        empty={t('checkWarningsEmpty')}
        overview={summary.warnings.length > 0 ? summary.warnings[0] : undefined}
      >
        <div className={css.diagList}>
          {summary.warnings.map((line, i) => (
            <div key={i} className={css.warnLine}><span>{line}</span></div>
          ))}
        </div>
      </Section>

      <Section
        title={t('checkBundles')}
        count={report.bundles.length}
        empty={t('checkBundlesEmpty')}
        problem={false}
        overview={
          <span>
            {t('checkOfficial')} × {report.bundles.filter(b => b.kind === 'official').length}
            {' · '}
            {t('checkCommunity')} × {report.bundles.filter(b => b.kind === 'community').length}
          </span>
        }
      >
        {report.bundles.map((bundle, i) => (
          <div key={bundle.name} className={css.diagBundle}>
            <div className={css.diagRow}>
              <span className={css.diagIndex}>{i + 1}</span>
              <span className={css.diagArrow}>→</span>
              <span className={css.nm}>{bundle.name}</span>
              <span className={bundle.kind === 'official' ? css.diagBadgeOfficial : css.diagBadgeCommunity}>
                {bundle.kind === 'official' ? t('checkOfficial') : t('checkCommunity')}
              </span>
              {bundle.error !== null && <span className={css.err}>{bundle.error}</span>}
              {bundle.parseError !== null && <span className={css.err}>{t('checkPatch')}: {bundle.parseError}</span>}
            </div>
            <div className={css.diagMeta}>
              <span className={css.diagKey}>{t('checkSource')}</span>
              <code className={css.spec}>{bundle.source}</code>
            </div>
            <div className={css.diagMeta}>
              <span className={css.diagKey}>{t('checkEntries')}</span>
              <code className={css.spec}>{bundle.entries.length > 0 ? bundle.entries.join(', ') : '—'}</code>
            </div>
            {bundle.directory !== null && (
              <div className={css.diagMeta}>
                <span className={css.diagKey}>{t('checkDir')}</span>
                <code className={css.spec}>{bundle.directory}</code>
              </div>
            )}
            {bundle.patchPath !== null && (
              <div className={css.diagMeta}>
                <span className={css.diagKey}>{t('checkPatch')}</span>
                <code className={css.spec}>{bundle.patchPath}</code>
              </div>
            )}
          </div>
        ))}
      </Section>

      <Section
        title={t('checkDuplicates')}
        count={report.duplicates.length}
        empty={t('checkDuplicatesEmpty')}
        overview={report.duplicates.length > 0 ? `${report.duplicates[0]?.id} × ${report.duplicates[0]?.count}` : undefined}
      >
        <div className={css.diagList}>
          {report.duplicates.map(dup => (
            <div key={dup.id} className={css.diagRow}>
              <code className={css.diagVal}>{dup.id}</code>
              <span className={css.err}>× {dup.count}</span>
              <span className={css.spec}>{dup.layers.join(' / ')}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title={t('checkPeerRisk')}
        count={peerRisk.length}
        empty={t('checkPeerRiskEmpty')}
        overview={peerRisk.length > 0
          ? `${peerRisk[0].plugin} → ${peerRisk[0].name}@${peerRisk[0].range}（${t('checkResolved')}: ${peerRisk[0].resolved ?? '—'}）`
          : undefined}
      >
        <div className={css.diagList}>
          {peerRisk.map((peer, i) => (
            <div key={i} className={css.diagRow}>
              <code className={css.diagVal}>{peer.name}</code>
              <span className={css.nm}>{peer.plugin}</span>
              <span className={css.spec}>{t('checkRange')}: {peer.range}</span>
              <span className={css.spec}>{t('checkResolved')}: {peer.resolved ?? '—'}</span>
              <span className={css.diagBadgeShadow}>{peerRiskLabel(peer, t)}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title={t('checkPeerWarning')}
        count={peerWarning.length}
        empty={t('checkPeerWarningEmpty')}
        overview={peerWarning.length > 0
          ? `${peerWarning[0].plugin} → ${peerWarning[0].name}@${peerWarning[0].range}（${peerWarningLabel(peerWarning[0], t)}）`
          : undefined}
      >
        <div className={css.diagList}>
          {peerWarning.map((peer, i) => (
            <div key={i} className={css.diagRow}>
              <code className={css.diagVal}>{peer.name}</code>
              <span className={css.nm}>{peer.plugin}</span>
              <span className={css.spec}>{t('checkRange')}: {peer.range}</span>
              <span className={css.spec}>{t('checkResolved')}: {peer.resolved ?? '—'}</span>
              <span className={css.diagBadgeWarn}>{peerWarningLabel(peer, t)}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title={t('checkPeerInfoTier')}
        count={peerInfo.length}
        empty={t('checkPeerInfoTierEmpty')}
        problem={false}
        overview={peerInfo.length > 0
          ? `${peerInfo[0].plugin} → ${peerInfo[0].name}@${peerInfo[0].range}`
          : undefined}
      >
        <div className={css.diagList}>
          {peerInfo.map((peer, i) => (
            <div key={i} className={css.diagRow}>
              <code className={css.diagVal}>{peer.name}</code>
              <span className={css.nm}>{peer.plugin}</span>
              <span className={css.spec}>{t('checkRange')}: {peer.range}</span>
              <span className={css.spec}>{t('checkResolved')}: {peer.resolved ?? '—'}</span>
              {peer.satisfied === null
                ? <span className={css.diagBadgeInfo}>{t('checkUnknown')}</span>
                : <span className={css.diagBadgeInfo}>{t('peerInfoUnverified')}</span>}
            </div>
          ))}
        </div>
      </Section>

      <Section
        title={t('checkPeerSatisfied')}
        count={peerSatisfied.length}
        empty={t('checkPeerSatisfiedEmpty')}
        problem={false}
        overview={peerSatisfied.length > 0
          ? `${peerSatisfied[0].plugin} → ${peerSatisfied[0].name}@${peerSatisfied[0].range}`
          : undefined}
      >
        <div className={css.diagList}>
          {peerSatisfied.map((peer, i) => (
            <div key={i} className={css.diagRow}>
              <code className={css.diagVal}>{peer.name}</code>
              <span className={css.nm}>{peer.plugin}</span>
              <span className={css.spec}>{t('checkRange')}: {peer.range}</span>
              <span className={css.spec}>{t('checkResolved')}: {peer.resolved ?? '—'}</span>
              <span className={css.okState}>{t('checkSatisfied')}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title={t('checkMultiVersion')}
        count={report.multiVersion.length}
        empty={t('checkMultiEmpty')}
        overview={report.multiVersion.length > 0 ? `${report.multiVersion[0]?.name}: ${report.multiVersion[0]?.versions.join(' / ')}` : undefined}
      >
        <div className={css.diagList}>
          {report.multiVersion.map(mv => (
            <div key={mv.name} className={css.diagRow}>
              <code className={css.diagVal}>{mv.name}</code>
              <span className={css.spec}>{mv.versions.join(' / ')}</span>
              {mv.hoisted !== null && <span className={css.spec}>{t('checkHoisted')}: {mv.hoisted}</span>}
            </div>
          ))}
        </div>
      </Section>

      <Section
        title={t('checkOverrides')}
        count={report.overrides.length}
        empty={t('checkOverridesEmpty')}
        overview={report.overrides.length > 0 ? `${report.overrides[0]?.id} ← ${report.overrides[0]?.layer}` : undefined}
      >
        <div className={css.diagList}>
          {report.overrides.map((ov, i) => (
            <div key={i} className={css.ovRow}>
              <code className={css.diagVal}>{ov.id}</code>
              <span className={css.ovArrow}>←</span>
              <span className={css.ovByTag}>{ov.layer}</span>
              <span className={css.spec}>{t('checkOverridden')}</span>
              <span className={css.ovFrom}>{ov.overriddenLayers.join(', ')}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title={t('checkOrphans')}
        count={report.orphans.length}
        empty={t('checkOrphansEmpty')}
        overview={report.orphans.length > 0 ? `${report.orphans[0]?.id}（${t(orphanKindLabel(report.orphans[0]?.reason ?? ''))}）` : undefined}
      >
        <div className={css.diagList}>
          {report.orphans.map((orphan, i) => (
            <div key={i} className={css.orphRow}>
              <span className={css.orphBadge}>{t(orphanKindLabel(orphan.reason))}</span>
              <code className={css.diagVal}>{orphan.id}</code>
              <span className={css.nm}>{orphan.layer}</span>
              <span className={css.spec}>{orphan.reason}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* issue #98 phase 2 (step 1): community-bundle ordering */}
      <CollapsibleSection title={t('orderSection')} count={order.length} open={orderOpen} onToggle={() => setOrderOpen(o => !o)}>
        <p className={css.panelNote}>{t('orderDragHint')}</p>
        {report.orderConflicts !== undefined && report.orderConflicts.length > 0 && (
          <div className={css.diagList}>
            <span className={css.diagKey}>{t('orderConflicts')}</span>
            {report.orderConflicts.map((conflict, i) => (
              <div key={i} className={css.warnLine}>{conflict.name} — {conflict.reason}</div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="primary" size="sm" disabled={order.length === 0 || orderBusy} onClick={() => applyOrder()}>
            {orderBusy ? '…' : t('orderApply')}
          </Button>
          {suggested !== null && suggested.ok === true
            && suggested.order.join('\u0000') !== communityNames.join('\u0000')
            && (
              <Button variant="outline" size="sm" disabled={orderBusy} onClick={() => applyOrder(suggested.order)}>
                {t('orderSuggestApply')}
              </Button>
            )}
          {suggested !== null && suggested.ok === true
            && suggested.order.join('\u0000') === communityNames.join('\u0000')
            && <span className={css.okState}>{t('orderAlreadyOptimal')}</span>}
          {order.join('\u0000') !== communityNames.join('\u0000') && (
            <Button variant="ghost" size="sm" disabled={orderBusy} onClick={() => setOrder(communityNames)}>
              {t('orderReset')}
            </Button>
          )}
          {orderMsg !== null && <span className={css.okState}>{orderMsg}</span>}
          {orderErr !== null && <span className={css.err}>{orderErr}</span>}
        </div>
        {orderDiff !== null && (
          <div className={css.panelNote}>
            {t('orderDiffHint').replace('{0}', String(orderDiff.overrides)).replace('{1}', String(orderDiff.orphans)).replace('{2}', String(orderDiff.duplicates))}
          </div>
        )}
        {suggested !== null && suggested.ok === false && (
          <div className={css.warnLine}>{t('orderSuggestHint')} ⚠ {suggested.cycle.join(' → ')}</div>
        )}
        {report.duplicateNames !== undefined && report.duplicateNames.length > 0 && (
          <div className={css.diagList}>
            <span className={css.diagKey}>{t('duplicateNames')}</span>
            {report.duplicateNames.map((dup, i) => (
              <div key={i} className={css.panelNote}>{dup.name} × {dup.count} — {dup.layers.join(' / ')}</div>
            ))}
          </div>
        )}
        {order.length === 0
          ? <div className={css.diagEmpty}>—</div>
          : (
              <div className={css.diagList}>
                {order.map((name, i) => (
                  <div
                    key={name}
                    draggable={!orderBusy}
                    className={[
                      css.diagRow,
                      dragIndex === i ? css.dragging : '',
                      dragOverIndex === i ? css.dragOver : '',
                    ].filter(Boolean).join(' ')}
                    onDragStart={onRowDragStart(i)}
                    onDragOver={onRowDragOver(i)}
                    onDragLeave={onRowDragLeave(i)}
                    onDrop={onRowDrop(i)}
                    onDragEnd={onRowDragEnd}
                  >
                    <span className={css.dragHandle} aria-label={t('orderDrag')} title={t('orderDrag')}>⠿</span>
                    <span className={css.diagIndex}>{i + 1}</span>
                    <span className={css.nm}>{name}</span>
                    <span className={css.grow} />
                    <Button
                      variant="ghost"
                      size="sm"
                      draggable={false}
                      aria-label={t('orderUp')}
                      disabled={i === 0 || orderBusy}
                      onClick={() => moveBundle(i, -1)}
                    >{t('orderUp')}</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      draggable={false}
                      aria-label={t('orderDown')}
                      disabled={i >= order.length - 1 || orderBusy}
                      onClick={() => moveBundle(i, 1)}
                    >{t('orderDown')}</Button>
                  </div>
                ))}
              </div>
            )}
      </CollapsibleSection>

      {/* issue #98 phase 3: snapshots & rollback */}
      <CollapsibleSection title={t('presetSection')} open={presetOpen} onToggle={() => setPresetOpen(o => !o)}>
        {/* The ordering DRAFT, not the last-reported order: a preset must
            capture the arrangement on screen, or saving right after a reorder
            stores the composition the user just moved away from. */}
        <PresetPanel t={t} open={presetOpen} bundleOrder={order} onRefresh={refresh} />
      </CollapsibleSection>

      <CollapsibleSection title={t('snapSection')} open={snapOpen} onToggle={() => setSnapOpen(o => !o)}>
        <SnapshotPanel t={t} open={snapOpen} onRefresh={refresh} />
      </CollapsibleSection>
    </div>
  )
}