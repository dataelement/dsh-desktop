/**
 * The Market settings section: Discover / Themes / Installed tabs over the
 * /dsh-market/* host routes, with install/update/uninstall flows and the
 * pending-restart bookkeeping in sessionStorage.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Button,
  DisclosureRow,
  IconChevronDownOutline14,
  IconChevronLeftOutline14,
  IconChevronRightOutline14,
  IconChevronUpOutline14,
  IconCheckOutline16,
  IconCodeOutline16,
  IconCordisPluginOutline14,
  IconDownloadOutline16,
  IconFolderOpen16,
  IconFullscreenOutline16,
  IconLinkOutline14,
  IconLoadingOutline16,
  IconQuestionOutline14,
  IconRefreshOutline14,
  IconSearchOutline16,
  IconSparkle16,
  IconWarningOutline16,
  Input,
  Menu,
  Modal,
  Pill,
  StateDot,
  Toast,
  Tooltip,
  type MenuEntry,
} from '@deepseek-ai/dsh-client-ui-primitives'
import css from './Market.module.css'
import { CommentsModal } from './CommentsModal.tsx'
import { OperationsPanel } from './OperationsPanel.tsx'
import { clearSettled, drop, enqueue, patch as patchRecord, recordForUrl } from './operations.ts'
import type { OperationRecord } from './operations.ts'
import { Diagnostics } from './Diagnostics.tsx'
import { clientDiagnostics } from './self-check.ts'
import {
  api, avatarColor, entryForDep, githubProxyInUse, githubUrl, groupSwitchState, humanOutput, installedForCatalog, isInstalled, looksTerminal, matchInstalledName, orderedCategories, pluginCategories,
  formatCount, pageItems, pluginName, pluginScreenshotCandidates, pluginScreenshots, rankThemeScreenshots, readSession, safeScreenshots, setGithubProxy, themePlugins as themePluginsOf, themeSwatch, TIME_RANGE_DAYS, visiblePlugins,
} from './market-data.ts'
import type {
ActivationInfo, ActivationState, GistExportResult, InstalledMap, InstalledRepoHints, InstalledRepoIdentities, MarketStatus, Registry, RegistryPlugin,
  ScreenshotCandidate, ScreenshotMeasurement, SharedHostPackageDependencyFinding, SortDir, SortField, ThemeSnapshot, TimeRange, Translate, UpdateStatus,
} from './market-data.ts'

function isHostDependencyFinding(value: unknown): value is SharedHostPackageDependencyFinding {
  if (value === null || typeof value !== 'object') return false
  const finding = value as Partial<SharedHostPackageDependencyFinding>
  return finding.code === 'shared-host-package-dependency'
    && finding.severity === 'warning'
    && finding.subject?.kind === 'package'
    && typeof finding.subject.name === 'string'
    && finding.evidence?.basis === 'manifest-declaration'
    && typeof finding.evidence?.dependency === 'string'
    && typeof finding.evidence.declaredRange === 'string'
    && finding.evidence.declaredIn === 'dependencies'
}

const HOST_DEPENDENCY_PREVIEW_LIMIT = 5
const IGNORED_UPDATES_SESSION_KEY = 'dshm-updates-ignored'

/**
 * Read the update reminders dismissed for this host process. The boot id is
 * part of the value rather than the key so sessionStorage never accumulates
 * one orphaned entry per process. Invalid and stale records fail open: an
 * update reminder is safer than silently hiding one we cannot account for.
 */
function ignoredUpdatesForBoot(boot: string): string[] {
  const saved = readSession(IGNORED_UPDATES_SESSION_KEY)
  const valid = saved !== null
    && typeof saved === 'object'
    && !Array.isArray(saved)
    && saved.boot === boot
    && Array.isArray(saved.names)
    && saved.names.every((name: unknown) => typeof name === 'string' && name !== '')
  if (!valid) {
    try { sessionStorage.removeItem(IGNORED_UPDATES_SESSION_KEY) } catch { /* storage unavailable */ }
    return []
  }
  return [...new Set(saved.names as string[])]
}

function HostDependencyDiagnostics({
  findings,
  t,
}: {
  findings: SharedHostPackageDependencyFinding[]
  t: Translate
}) {
  if (findings.length === 0) return null
  const preview = findings.slice(0, HOST_DEPENDENCY_PREVIEW_LIMIT)
  const remaining = findings.length - preview.length
  return (
    <div className={css.banner}>
      <IconWarningOutline16 size={14} className={css.bannerIcon} />
      <span className={css.grow}>
        <div>{t('hostDependencyWarning')}</div>
        {preview.map(finding => (
          <div
            key={`${finding.subject.name}:${finding.evidence.dependency}`}
            className={css.spec}
          >
            {finding.subject.name} → {finding.evidence.dependency}@{finding.evidence.declaredRange}
          </div>
        ))}
        {remaining > 0 && (
          <div className={css.spec}>{t('hostDependencyMore').replace('{0}', String(remaining))}</div>
        )}
      </span>
    </div>
  )
}

/** The state label + dot for one activation result (P0-2). */
function activationMeta(state: ActivationState, t: Translate): { label: string; dot: 'done' | 'warning' | 'error' } {
  if (state === 'live') return { label: t('stateLive'), dot: 'done' }
  if (state === 'restart') return { label: t('stateRestart'), dot: 'warning' }
  if (state === 'inert') return { label: t('stateInert'), dot: 'warning' }
  if (state === 'broken') return { label: t('stateBroken'), dot: 'error' }
  if (state === 'disabled') return { label: t('stateDisabled'), dot: 'warning' }
  return { label: '—', dot: 'warning' }
}

function phaseLabel(phase: NonNullable<MarketStatus['phase']>, t: Translate): string {
  if (phase === 'resolving') return t('phaseResolving')
  if (phase === 'downloading') return t('phaseDownloading')
  if (phase === 'linking') return t('phaseLinking')
  return t('phaseBuilding')
}

/**
 * Page/page-size state shared by every paged list in this file (Discover,
 * Themes) — each caller owns its OWN instance (their filters are
 * independent, a search in one tab has no business resetting the other's
 * page), but the mechanics (clamp against a shrinking list, reset to page 1
 * when the filters that produced `count` change, scroll back to the top of
 * the shared body on any page move) are one implementation, not two.
 */
function usePagination(count: number, resetDeps: readonly unknown[], scrollToTop: () => void): {
  currentPage: number
  totalPages: number
  pageSize: number
  goToPage: (next: number) => void
  changePageSize: (size: number) => void
} {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- resetDeps IS the intended dependency list, supplied by the caller.
  useEffect(() => { setPage(1) }, resetDeps)
  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  // Clamp in case the list shrank while the user was on a later page.
  const currentPage = Math.min(page, totalPages)
  const goToPage = (next: number) => {
    setPage(Math.max(1, Math.min(next, totalPages)))
    scrollToTop()
  }
  const changePageSize = (size: number) => {
    setPageSize(size)
    setPage(1)
    scrollToTop()
  }
  return { currentPage, totalPages, pageSize, goToPage, changePageSize }
}

/**
 * The sort/time-range dropdown (primitives Menu): three independent option
 * groups, ids namespaced so one onSelect routes by prefix. Owns its own
 * open state — a caller wires only the sort VALUES, not the dropdown's UI
 * state, so Discover and Themes can each mount one without threading an
 * extra `filterOpen`/`setFilterOpen` pair through their own state.
 */
function FilterMenu({ sortField, sortDir, timeRange, onSortField, onSortDir, onTimeRange, t }: {
  sortField: SortField
  sortDir: SortDir
  timeRange: TimeRange
  onSortField: (field: SortField) => void
  onSortDir: (dir: SortDir) => void
  onTimeRange: (range: TimeRange) => void
  t: Translate
}) {
  const [open, setOpen] = useState(false)
  // Direction labels adapt to the field: stars → asc/desc, added → oldest/newest.
  const sortDirLabel = (dir: SortDir): string =>
    sortField === 'added'
      ? dir === 'desc' ? 'sortNewest' : 'sortOldest'
      : dir === 'desc' ? 'sortDesc' : 'sortAsc'
  const items = useMemo<MenuEntry[]>(() => [
    { type: 'label', id: 'f-sort', text: t('filterSort') },
    ...SORT_FIELD_OPTIONS.map(opt => ({ id: 'field:' + opt.key, label: t(opt.label) })),
    { type: 'separator', id: 'f-sep1' },
    { type: 'label', id: 'f-dir', text: t('filterDir') },
    ...SORT_DIR_OPTIONS.map(dir => ({ id: 'dir:' + dir, label: t(sortDirLabel(dir)) })),
    { type: 'separator', id: 'f-sep2' },
    { type: 'label', id: 'f-time', text: t('filterTime') },
    ...TIME_OPTIONS.map(opt => ({ id: 'time:' + opt.key, label: t(opt.label) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sortDirLabel closes only over sortField, already a dep.
  ], [t, sortField])
  const selectedIds = useMemo(
    () => ['field:' + sortField, 'dir:' + sortDir, 'time:' + timeRange],
    [sortField, sortDir, timeRange])
  const onSelect = (id: string) => {
    if (id.startsWith('field:')) onSortField(id.slice(6) as SortField)
    else if (id.startsWith('dir:')) onSortDir(id.slice(4) as SortDir)
    else if (id.startsWith('time:')) onTimeRange(id.slice(5) as TimeRange)
  }
  return (
    <Menu
      open={open}
      onClose={() => setOpen(false)}
      onSelect={onSelect}
      selectedIds={selectedIds}
      align="end"
      portal
      anchor={(
        <Button
          variant="outline"
          size="sm"
          icon={open ? <IconChevronUpOutline14 size={14} /> : <IconChevronDownOutline14 size={14} />}
          onClick={() => setOpen(o => !o)}
        >{t('filter')}</Button>
      )}
      items={items}
    />
  )
}

/** First/prev/numbered/next/last controls plus a per-page-size menu — one
 * implementation for every paged list, driven entirely by `usePagination`'s
 * return value. Owns its own page-size dropdown open state for the same
 * reason `FilterMenu` owns its own. */
function Pager({ currentPage, totalPages, pageSize, onGoToPage, onChangePageSize, t }: {
  currentPage: number
  totalPages: number
  pageSize: number
  onGoToPage: (page: number) => void
  onChangePageSize: (size: number) => void
  t: Translate
}) {
  const [sizeOpen, setSizeOpen] = useState(false)
  return (
    <div className={css.pager}>
      <div className={css.pagerPages}>
        {totalPages > 1 && (
          <>
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => onGoToPage(1)} aria-label={t('firstPage')}>«</Button>
            <Button
              variant="outline"
              size="sm"
              icon={<IconChevronLeftOutline14 size={14} />}
              disabled={currentPage === 1}
              onClick={() => onGoToPage(currentPage - 1)}
            >{t('prevPage')}</Button>
            {pageItems(currentPage, totalPages).map((item, i) => (
              item === '…'
                ? <span key={'e' + i} className={css.pageEllipsis}>…</span>
                : (
                    <Button
                      key={item}
                      variant={item === currentPage ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => onGoToPage(item)}
                    >{item}</Button>
                  )
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => onGoToPage(currentPage + 1)}
            >{t('nextPage')}<IconChevronRightOutline14 size={14} /></Button>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => onGoToPage(totalPages)} aria-label={t('lastPage')}>»</Button>
            <span className={css.pageInfo}>{t('pageInfo').replace('{0}', String(currentPage)).replace('{1}', String(totalPages))}</span>
          </>
        )}
      </div>
      <Menu
        open={sizeOpen}
        onClose={() => setSizeOpen(false)}
        onSelect={id => onChangePageSize(Number(id))}
        selectedId={String(pageSize)}
        align="end"
        portal
        anchor={(
          <Button
            variant="outline"
            size="sm"
            icon={<IconChevronDownOutline14 size={14} />}
            onClick={() => setSizeOpen(o => !o)}
          >{t('perPage') + ' ' + pageSize}</Button>
        )}
        items={PAGE_SIZES.map(size => ({ id: String(size), label: String(size) }))}
      />
    </div>
  )
}

/**
 * Card avatar: the plugin owner's GitHub avatar (no API, browser-cached),
 * falling back to the initial-letter tile when it can't load.
 */
/** Inline pass: `code` spans and **bold**, everything else plain text. */
function mdInline(text: string): Array<string | JSX.Element> {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <code key={i} className={css.notesCode}>{part.slice(1, -1)}</code>
    }
    return part
  })
}

/**
 * Release-body markdown, reduced to what a reading dialog needs: headings,
 * bullets, paragraphs, bold, inline code. Every character arrives as a React
 * text child (auto-escaped) — nothing from the repo is ever interpreted as
 * markup, so this stays free of the HTML surface real markdown parsers open.
 */
function renderMarkdown(md: string): Array<JSX.Element | string> {
  const out: Array<JSX.Element | string> = []
  let bullets: string[] | null = null
  const flushList = (): void => {
    if (bullets === null) return
    const items = bullets
    out.push(<ul key={`l${out.length}`} className={css.notesList}>{items.map((item, i) => <li key={i}>{mdInline(item)}</li>)}</ul>)
    bullets = null
  }
  for (const line of md.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') { flushList(); continue }
    const heading = /^#{1,6}\s+(.*)$/.exec(trimmed)
    if (heading !== null) {
      flushList()
      out.push(<div key={`h${out.length}`} className={css.notesH}>{mdInline(heading[1])}</div>)
      continue
    }
    const bullet = /^[-*]\s+(.*)$/.exec(trimmed)
    if (bullet !== null) {
      ;(bullets ??= []).push(bullet[1])
      continue
    }
    flushList()
    out.push(<div key={`p${out.length}`} className={css.notesP}>{mdInline(line)}</div>)
  }
  flushList()
  return out
}

function OwnerAvatar({ name, owner }: { name: string; owner: string }) {
  const [failed, setFailed] = useState(false)
  if (failed || owner === '') {
    return (
      <div className={css.av} style={{ background: avatarColor(name) }}>
        {name.replace(/^dsh[-_]/i, '').charAt(0).toUpperCase() || 'P'}
      </div>
    )
  }
  return (
    <img
      className={css.av}
      src={avatarUrl(owner)}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

/**
 * AppStore-style screenshot strip in the install detail dialog (#61).
 * Curated registry screenshots win; otherwise images are extracted from the
 * repo README. Requests start only once the dialog opens; failures — no
 * README, no images, broken links — degrade to rendering nothing at all.
 */
function ScreenshotStrip({ plugin, onOpen }: { plugin: RegistryPlugin; onOpen: (shots: string[], index: number) => void }) {
  const [shots, setShots] = useState<string[]>([])
  const [broken, setBroken] = useState<string[]>([])
  useEffect(() => {
    let live = true
    setShots([])
    setBroken([])
    pluginScreenshots(plugin).then((list) => { if (live) setShots(list) })
    return () => { live = false }
  }, [plugin])
  const visible = shots.filter(src => !broken.includes(src))
  if (visible.length === 0) return null
  return (
    <div className={css.shots}>
      {visible.map((src, i) => (
        <img
          key={src}
          className={css.shot}
          src={thumbUrl(src, 300)}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onClick={() => onOpen(visible, i)}
          onError={() => setBroken(prev => prev.includes(src) ? prev : prev.concat(src))}
        />
      ))}
    </div>
  )
}

/**
 * Advances an index every `intervalMs` while `count > 1` — the shared clock
 * behind both a card's auto-cycling thumbnail and the lightbox. A manual
 * jump (clicking a dot, an arrow, opening on a specific shot) restarts the
 * clock instead of letting it fire again moments later: without that, a
 * deliberate "go back one" reads as broken when it auto-advances right past
 * where the user just navigated to.
 *
 * `intervalMs <= 0` disables the timer entirely (no auto-advance at all);
 * manual jumps still work. The lightbox uses this: a full-bleed image needs
 * to stay put until the viewer moves on, so it must never page itself.
 */
function useAutoCarousel(count: number, initial: number, intervalMs = 3500): [number, (i: number) => void] {
  const [index, setIndexState] = useState(initial)
  const [resetTick, setResetTick] = useState(0)
  useEffect(() => {
    if (count <= 1 || intervalMs <= 0) return
    const timer = setInterval(() => { setIndexState(i => (i + 1) % count) }, intervalMs)
    return () => clearInterval(timer)
  }, [count, intervalMs, resetTick])
  const setIndex = (i: number): void => {
    if (count <= 0) return
    setIndexState(((i % count) + count) % count)
    setResetTick(t => t + 1)
  }
  return [index, setIndex]
}

/**
 * A card thumbnail (or dialog strip image) renders at well under 150px on
 * screen; the curated screenshot behind it can be a full-resolution PNG
 * several hundred KB to a few MB — GitHub's own hosts offer no resized
 * variant, so rendering the original meant downloading full-size images for
 * a strip nobody asked to see full-size. images.weserv.nl resizes
 * server-side (by decoded HEIGHT, `fit=inside` so it never crops, `we=1` so
 * it never upscales something already smaller) before the bytes reach the
 * browser. The lightbox — an explicit "show me this big" — still requests
 * the ORIGINAL directly: proxying that one too would add a hop with nothing
 * left to save, and once the thumbnail is genuinely smaller it can no longer
 * share a cache entry with the full-size open anyway.
 */
function thumbUrl(src: string, height: number): string {
  // The resizer stays in every region, including China.
  //
  // It was briefly bypassed there on the assumption that a service in the
  // Netherlands would be one more far-away host in the way. Measured from an
  // unproxied mainland connection, that was wrong twice over: weserv answers
  // in 1.39s, and it answers with 23KB where the original is 41KB. Routing
  // around it would have traded a working request for a bigger one, on a
  // page that makes dozens of them.
  return `https://images.weserv.nl/?url=${encodeURIComponent(src.replace(/^https?:\/\//, ''))}&h=${String(height)}&fit=inside&we=1`
}

/**
 * The owner's GitHub avatar, addressed so the region's proxy can serve it.
 *
 * `github.com/<owner>.png` is a redirect to the avatar host, and gh-proxy
 * does not follow it — measured from an unproxied mainland connection, that
 * URL hangs until the client gives up (60s), while naming the avatar host
 * directly through the same proxy answers in 1.07s. So a proxied region
 * addresses the destination itself.
 *
 * The redirect is left in place when there is no proxy: it is the form that
 * has always worked, and this is not the release to change it on a path
 * nobody has reported a problem with.
 */
function avatarUrl(owner: string): string {
  const name = encodeURIComponent(owner)
  return githubProxyInUse() === null
    ? `https://github.com/${name}.png?size=96`
    : githubUrl(`https://avatars.githubusercontent.com/${name}?size=96`)
}

/**
 * True once the wrapped element has scrolled within `rootMargin` of the
 * viewport. Falls back to true immediately where IntersectionObserver is
 * unavailable (old browsers, jsdom without a stub) — a missing observer
 * should degrade to eager loading, not a permanently empty thumbnail.
 * Native `img loading="lazy"` already defers the network fetch on its own,
 * but its trigger distance isn't ours to tune, and scrolling a 400+ entry
 * catalog queues every off-screen card's request the instant the browser
 * decides to start prefetching — this hook is what lets CardShot not even
 * SET `src` until a card is actually close.
 */
function useNearViewport<T extends Element>(rootMargin = '200px'): [(node: T | null) => void, boolean] {
  const [near, setNear] = useState(typeof IntersectionObserver === 'undefined')
  const [node, setNode] = useState<T | null>(null)
  useEffect(() => {
    if (near || node === null) return
    const obs = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) setNear(true)
    }, { rootMargin })
    obs.observe(node)
    return () => obs.disconnect()
  }, [near, node, rootMargin])
  return [setNode, near]
}

/**
 * A card's own thumbnail strip — curated screenshots only (#61 supplement):
 * this data already rode along with the catalog fetch that drew the grid,
 * so showing it costs nothing extra. README-scraped fallback images stay
 * dialog-only, where fetching one repo's README on click is a single
 * request instead of one per visible card.
 *
 * Horizontal scroll at each image's own aspect ratio, not an auto-cycling
 * single crop: cropping every shot into one fixed box hid most of a tall
 * screenshot, and cycling on a timer meant the card you were looking at
 * kept changing under you. Scrolling is a gesture the user drives.
 */
/** Thumbnails per card. The dialog shows every screenshot; a grid of cards
 * pulling six full-size PNGs each is what makes the first paint crawl. */
const CARD_SHOT_LIMIT = 3

function CardShot({ plugin, onOpen }: { plugin: RegistryPlugin; onOpen: (shots: string[], index: number) => void }) {
  const shots = safeScreenshots(plugin.screenshots)
  const [broken, setBroken] = useState<string[]>([])
  const visible = shots.filter(src => !broken.includes(src)).slice(0, CARD_SHOT_LIMIT)
  const [setStripRef, near] = useNearViewport<HTMLDivElement>()
  if (visible.length === 0) return null
  return (
    <div ref={setStripRef} className={css.cardShots}>
      {visible.map((src, i) => (
        <img
          key={src}
          className={css.cardShot}
          src={near ? thumbUrl(src, 200) : undefined}
          alt=""
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          referrerPolicy="no-referrer"
          onClick={(e) => { e.stopPropagation(); onOpen(visible, i) }}
          onError={() => setBroken(prev => prev.includes(src) ? prev : prev.concat(src))}
        />
      ))}
    </div>
  )
}

/**
 * Read dimensions through the same low-resolution, no-upscale route used by
 * card thumbnails. Large originals therefore stay off the wire, while a
 * genuinely tiny image remains tiny and can be rejected by the scorer.
 */
function measureThemeCandidates(candidates: ScreenshotCandidate[]): Promise<ScreenshotMeasurement[]> {
  if (typeof Image === 'undefined') return Promise.resolve([])
  return Promise.all(candidates.map(candidate => new Promise<ScreenshotMeasurement | null>((resolve) => {
    const probe = new Image()
    let settled = false
    const finish = (measurement: ScreenshotMeasurement | null) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      probe.onload = null
      probe.onerror = null
      resolve(measurement)
    }
    const timer = window.setTimeout(() => finish(null), 6_000)
    probe.onload = () => finish({ src: candidate.src, width: probe.naturalWidth, height: probe.naturalHeight })
    probe.onerror = () => finish(null)
    probe.referrerPolicy = 'no-referrer'
    probe.decoding = 'async'
    probe.src = thumbUrl(candidate.src, 240)
  }))).then(results => results.filter((result): result is ScreenshotMeasurement => result !== null))
}

const measuredThemePreviewTasks = new Map<string, Promise<string[]>>()
const measuredThemePreviewResults = new Map<string, string[]>()

/** Test hook and an explicit boundary for this page-lifetime media cache. */
export function resetThemePreviewCache(): void {
  measuredThemePreviewTasks.clear()
  measuredThemePreviewResults.clear()
}

/** README fetch + geometry probes, shared across search/page remounts. */
function measuredThemePreview(plugin: RegistryPlugin): Promise<string[]> {
  const cached = measuredThemePreviewTasks.get(plugin.url)
  if (cached !== undefined) return cached
  const task = pluginScreenshotCandidates(plugin).then(async (candidates) => {
    const measurements = await measureThemeCandidates(candidates)
    const ranked = rankThemeScreenshots(candidates, measurements)
    measuredThemePreviewResults.set(plugin.url, ranked)
    return ranked
  }).catch(() => {
    measuredThemePreviewResults.set(plugin.url, [])
    return []
  })
  measuredThemePreviewTasks.set(plugin.url, task)
  return task
}

/**
 * Themes are chosen visually, so their catalog card gets one stable, large
 * preview instead of the generic plugin card's horizontal thumbnail strip.
 * Curated screenshots keep their declared order. A missing curated set is
 * filled lazily from README only when the card nears the viewport, then
 * ranked by both README semantics and measured image geometry.
 */
function ThemeCover({ plugin, onOpen, t }: {
  plugin: RegistryPlugin
  onOpen: (shots: string[], index: number) => void
  t: Translate
}) {
  const curated = safeScreenshots(plugin.screenshots)
  const curatedKey = curated.join('\n')
  const cachedFallback = curated.length === 0 ? measuredThemePreviewResults.get(plugin.url) : undefined
  const [fallback, setFallback] = useState<{ loading: boolean; shots: string[] }>({
    loading: curated.length === 0 && cachedFallback === undefined,
    shots: cachedFallback ?? [],
  })
  const [broken, setBroken] = useState<string[]>([])
  const [setCoverRef, near] = useNearViewport<HTMLButtonElement>()
  useEffect(() => {
    setBroken([])
    if (curated.length > 0) {
      setFallback({ loading: false, shots: [] })
      return
    }
    const cached = measuredThemePreviewResults.get(plugin.url)
    if (cached !== undefined) {
      setFallback({ loading: false, shots: cached })
      return
    }
    setFallback({ loading: true, shots: [] })
    if (!near) return
    let live = true
    void measuredThemePreview(plugin).then(shots => { if (live) setFallback({ loading: false, shots }) })
    return () => { live = false }
  // `plugin.url` identifies a card; registry objects are deliberately not a
  // dependency because polling may recreate one without changing its media.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curatedKey, near, plugin.url])
  const shots = curated.length > 0 ? curated : fallback.shots
  const visible = shots.filter(src => !broken.includes(src))
  const name = pluginName(plugin.name)

  if (visible.length === 0) {
    return (
      <button
        ref={setCoverRef}
        type="button"
        className={`${css.themeCover} ${css.themeCoverEmpty}`}
        aria-label={`${name}: ${fallback.loading ? t('themePreviewLoading') : t('themePreviewMissing')}`}
        disabled
      >
        {fallback.loading
          ? <span className={css.spin}><IconLoadingOutline16 size={20} /></span>
          : <IconSparkle16 size={20} />}
        <span>{fallback.loading ? t('themePreviewLoading') : t('themePreviewMissing')}</span>
      </button>
    )
  }

  const src = visible[0]!
  return (
    <button
      ref={setCoverRef}
      type="button"
      className={css.themeCover}
      aria-label={`${t('themePreview')} ${name}`}
      onClick={() => onOpen(visible, 0)}
    >
      <img
        src={near ? thumbUrl(src, 520) : undefined}
        alt=""
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        referrerPolicy="no-referrer"
        onError={() => setBroken(prev => prev.includes(src) ? prev : prev.concat(src))}
      />
      <span className={css.themePreviewAction}>
        <IconSearchOutline16 size={14} />
        {t('themePreview')}
      </span>
      {visible.length > 1 && (
        <span className={css.themePreviewCount}>
          {t('themePreviewCount').replace('{0}', String(visible.length))}
        </span>
      )}
    </button>
  )
}

/**
 * Masonry columns holding items in their input order.
 *
 * Items are dealt alternately (0,2,4… left; 1,3,5… right) rather than split
 * down the middle, so the sort order still reads left-to-right then down —
 * the ranking is the whole point of the sort menu above it. Each column is
 * its own flex stack, so a tall item only pushes down the items beneath IT
 * instead of leaving a hole beside its shorter neighbour.
 *
 * Below the two-up breakpoint the CSS collapses to one column, and dealing
 * alternately would then interleave the list wrongly — so at one column the
 * items stay in a single stack in their original order.
 */
function Masonry<T>({ items, render, columns = 2 }: {
  items: T[]
  render: (item: T) => ReactNode
  columns?: number
}) {
  const wide = useMediaWide()
  if (!wide || columns < 2) {
    return <div className={css.masonry}><div className={css.masonryCol}>{items.map(render)}</div></div>
  }
  const buckets: T[][] = Array.from({ length: columns }, () => [])
  items.forEach((item, index) => { buckets[index % columns]!.push(item) })
  return (
    <div className={css.masonry}>
      {buckets.map((bucket, index) => (
        <div key={index} className={css.masonryCol}>{bucket.map(render)}</div>
      ))}
    </div>
  )
}

/**
 * Whether the layout is at its two-up width. Matches the CSS breakpoint
 * exactly: the column split is decided in JS but rendered by CSS, and the
 * two disagreeing would deal cards into columns the stylesheet has already
 * stacked.
 */
function useMediaWide(): boolean {
  const query = '(min-width: 681px)'
  const subscribe = useCallback((notify: () => void) => {
    if (typeof matchMedia !== 'function') return () => {}
    const list = matchMedia(query)
    list.addEventListener('change', notify)
    return () => list.removeEventListener('change', notify)
  }, [])
  return useSyncExternalStore(
    subscribe,
    () => (typeof matchMedia === 'function' ? matchMedia(query).matches : true),
    // Server/jsdom without matchMedia: assume the two-up layout, which is
    // what the stylesheet defaults to before any media query applies.
    () => true,
  )
}

/**
 * A card's description, clamped to 5 lines so one wordy entry doesn't blow
 * the two-up grid's row height out for whatever sits beside it — the grid
 * already tolerates SOME height variance by design (`.card`'s `align-self:
 * start`), just not an unbounded one. The toggle only renders when the text
 * actually overflows the clamp: a two-line description has nothing to
 * "expand", so no button beats a button that does nothing.
 */
function CardDesc({ text, t }: { text: string; t: Translate }) {
  const ref = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [canExpand, setCanExpand] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (el === null) return
    setCanExpand(el.scrollHeight > el.clientHeight + 1)
  }, [text])
  return (
    <div>
      <div ref={ref} className={expanded ? css.desc : `${css.desc} ${css.descClamp}`}>{text}</div>
      {canExpand && (
        <button
          type="button"
          className={css.descToggle}
          aria-label={expanded ? t('descCollapse') : t('descExpand')}
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? <IconChevronUpOutline14 size={14} /> : <IconChevronDownOutline14 size={14} />}
        </button>
      )}
    </div>
  )
}

/**
 * Full-bleed image preview, opened from a card thumbnail or a dialog's
 * screenshot strip. Not the shared Modal primitive: Modal is chrome for a
 * decision (title, description, footer actions); this is just the same
 * already-downloaded image shown bigger — there is no separate "thumbnail"
 * vs "full size" asset to fetch.
 */
function ScreenshotLightbox({ shots, startIndex, onClose, t }: { shots: string[]; startIndex: number; onClose: () => void; t: Translate }) {
  // Full-bleed previews must not auto-advance: a chart or a screenshot needs
  // to stay readable until the viewer moves on, so the carousel timer is
  // disabled with intervalMs = 0. Arrows, dots, and the keyboard still
  // navigate manually.
  const [index, setIndex] = useAutoCarousel(shots.length, startIndex, 0)
  const host = useMarketPortalHost()
  useEffect(() => {
    // Capture phase + stopPropagation: the Settings dialog underneath is a
    // Modal with its own Escape-to-close handling, also on window/document.
    // Without this, one Escape press closed both layers at once — verified
    // on a real host — because the modal's bubble-phase listener still fired
    // after this one. Capture runs first and this stops it from reaching
    // bubble phase at all, so only the top layer responds to one press.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
      else if (e.key === 'ArrowLeft') { e.stopPropagation(); setIndex(index - 1) }
      else if (e.key === 'ArrowRight') { e.stopPropagation(); setIndex(index + 1) }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])
  // Into a container this package owns, never into document.body itself.
  //
  // In-tree rendering is not an option: the primitives' own Modal (the
  // settings dialog underneath) portals itself to document.body, so the
  // lightbox rendered in place sat BEHIND it whatever the z-index — a portal
  // only wins a stacking tie against another portal by mounting later.
  // Reported on a real host: "大的预览图层级不对，现在在弹窗的后面".
  //
  // But sharing document.body with the host was the other half of a trap.
  // The host's settings dialog and this package are separate React roots,
  // and two roots appending and removing children of the SAME container
  // interleave in an order neither one models. The host's root then calls
  // removeChild for a node this one had already moved, React throws
  // `NotFoundError: The node to be removed is not a child of this node`, the
  // `settings.section` slot catches it, and the whole market panel goes
  // blank (#293 by @Tianhao-1017, #286, #241 — the reporter of #293 traced
  // this to the line, with the stack and a clean-reinstall check).
  //
  // Owning one container fixes that structurally: the host's root sees a
  // single opaque child it never touches, and everything this package
  // mounts or unmounts happens inside it.
  return createPortal(
    <div className={css.lightbox} onClick={onClose}>
      {/* A literal "×" rather than IconCloseOutline16: the primitives
          package's own Modal uses that icon at runtime, but this package
          version's public type surface doesn't resolve it — `tsc` reports
          "no exported member" even though icons/index.d.ts declares it.
          Not worth a type-check suppression for one close glyph. */}
      <button className={css.lightboxClose} aria-label={t('lightboxClose')} onClick={onClose}>×</button>
      <img className={css.lightboxImg} src={shots[index]} alt="" onClick={e => e.stopPropagation()} />
      {shots.length > 1 && (
        <>
          <button
            className={`${css.lightboxNav} ${css.lightboxPrev}`}
            aria-label={t('lightboxPrev')}
            onClick={(e) => { e.stopPropagation(); setIndex(index - 1) }}
          ><IconChevronLeftOutline14 size={18} /></button>
          <button
            className={`${css.lightboxNav} ${css.lightboxNext}`}
            aria-label={t('lightboxNext')}
            onClick={(e) => { e.stopPropagation(); setIndex(index + 1) }}
          ><IconChevronRightOutline14 size={18} /></button>
          <div className={css.lightboxDots} onClick={e => e.stopPropagation()}>
            {shots.map((src, i) => (
              <span
                key={src}
                className={i === index ? `${css.lightboxDot} ${css.lightboxDotOn}` : css.lightboxDot}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>,
    host,
  )
}

/**
 * The one DOM node this package portals into, created on first use and kept
 * for the life of the page.
 *
 * Created imperatively rather than rendered, and never removed: the point is
 * that `document.body`'s child list stops being shared state between two
 * React roots. A container that came and went would put the same churn back
 * into body, just less often — and "less often" is what made this bug
 * intermittent and hard to believe in the first place.
 *
 * Re-appended on every open so it stays last among body's children. That is
 * what keeps the lightbox above the host's own portalled dialog, which is
 * why the portal exists at all; moving a node we own is not something the
 * host's root tracks, so it cannot disturb it.
 */
let portalHost: HTMLElement | null = null

function marketPortalHost(): HTMLElement {
  if (portalHost === null) {
    portalHost = document.createElement('div')
    // Named so anyone inspecting the DOM, or a future host wanting to give
    // plugins a real portal slot, can see who owns it.
    portalHost.setAttribute('data-dsh-market-portal', '')
  }
  return portalHost
}

/**
 * Move the container to the end of `document.body`, which is what keeps this
 * package's layers above the host's own portalled dialog.
 *
 * In a layout effect, NOT during render. `createPortal` needs the element
 * while rendering, but appending it does not belong there: React may start a
 * render, abandon it and start again, so a mutation in the render body runs
 * for passes that never commit — and this particular mutation reorders
 * `document.body`, the one container this package shares with the host's
 * separate React root. That is the same shared-child-list hazard #293 was
 * about, just arrived at from the other side. Committing it in an effect
 * means it happens once, after React is done, in the order React expects.
 */
function useMarketPortalHost(): HTMLElement {
  const host = marketPortalHost()
  useLayoutEffect(() => {
    // appendChild on an existing child MOVES it to the end — the stacking
    // guarantee, refreshed on open without ever creating a second container.
    document.body.appendChild(host)
  }, [host])
  return host
}

/** Test hook: the container is module state and outlives a component unmount. */
export function resetMarketPortalHost(): void {
  portalHost?.remove()
  portalHost = null
}

/**
 * Official-style market glyph: the shared block-grid brand mark converted to
 * the official monochrome icon form (16×16, fill="currentColor") so it
 * follows the active theme. Mirrors the settings-nav glyph used for the
 * "market" section id.
 */
function MarketLogo({ size = 16, style, animated = false }: { size?: number; style?: CSSProperties; animated?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={style}>
      <g fill="currentColor">
        <rect x="1.96" y="3.36" width="3.3" height="3.3" rx="0.53" />
        <rect x="5.71" y="3.36" width="3.3" height="3.3" rx="0.53" />
        <rect x="1.96" y="7.11" width="3.3" height="3.3" rx="0.53" />
        <rect x="5.71" y="7.11" width="3.3" height="3.3" rx="0.53" />
        <rect x="9.46" y="7.11" width="3.3" height="3.3" rx="0.53" />
        <rect x="1.96" y="10.86" width="3.3" height="3.3" rx="0.53" />
        <rect x="5.71" y="10.86" width="3.3" height="3.3" rx="0.53" />
        <rect x="9.46" y="10.86" width="3.3" height="3.3" rx="0.53" />
      </g>
      {/* The block being plugged in: OUTSIDE the grid's empty corner, offset
          (+1.28, -1.27) and tilted 9deg, exactly as in assets/logo.svg. The
          earlier icon sat it neatly in the empty slot, which reads as one
          crooked tile rather than a block arriving — the whole idea of the
          mark, and the reason it no longer matched the GitHub logo. */}
      <rect
        className={animated ? css.logoPlug : undefined}
        x="10.74" y="2.09" width="3.3" height="3.3" rx="0.53" fill="currentColor"
        transform={animated ? undefined : 'rotate(9 12.39 3.74)'}
      />
    </svg>
  )
}

/**
 * GitHub mark beside catalog card titles (#256, #365). Catalog intake in
 * awesome-dsh-plugin rejects any entry whose `url` is not
 * `https://github.com/owner/repo` (scripts/lib/entries.mjs), so this renders
 * unconditionally — not a bet that today's snapshot happens to be all
 * GitHub. The generic outbound arrow did not say so until hover. This rides
 * the title's own line — no second link, no extra row.
 */
function GithubRepoMark({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  )
}

/**
 * Module-scope caches so re-entering the section renders instantly instead
 * of refetching and rebuilding from a spinner (#30 by @StarsTom). Module
 * state survives section switches; a background refetch keeps it current.
 */
let cachedRegistry: Registry | null = null
let cachedInstalled: InstalledMap | null = null
let cachedRepoIdentities: InstalledRepoIdentities | null = null
let cachedRepoHints: InstalledRepoHints | null = null

/** Discover grid page-size choices — the catalog grows daily, so cap each page. */
const PAGE_SIZES = [24, 48, 96]
const DEFAULT_PAGE_SIZE = 24
const WEBDAV_STORAGE_KEY = 'dshm-webdav'

function savedWebdav(): { url: string; username: string; password: string; auto: boolean } {
  try {
    const value = JSON.parse(localStorage.getItem(WEBDAV_STORAGE_KEY) ?? '{}') as Record<string, unknown>
    return {
      url: typeof value.url === 'string' ? value.url : '',
      username: typeof value.username === 'string' ? value.username : '',
      // The password never persists in the browser: plugins run same-origin
      // with dshmarket, so a stored password would be readable by any plugin
      // client on this host and become the weakest credential in the profile
      // (review #63). It lives in server config / memory only.
      password: '',
      auto: value.auto === true,
    }
  } catch {
    return { url: '', username: '', password: '', auto: false }
  }
}

function backupDependencies(value: unknown): InstalledMap {
  if (value === null || typeof value !== 'object') throw new Error('invalid backup')
  const backup = value as { format?: unknown; version?: unknown; files?: unknown }
  if (backup.format !== 'dsh-profile-backup' || backup.version !== 0.2) throw new Error('unsupported backup format')
  const files = backup.files
  if (!Array.isArray(files)) throw new Error('unsupported backup format')
  const manifest = files.find(file => file !== null && typeof file === 'object' && (file as { path?: unknown }).path === 'package.json') as { json?: unknown } | undefined
  if (manifest?.json === null || typeof manifest?.json !== 'object' || Array.isArray(manifest.json)) throw new Error('backup package.json is invalid')
  const dependencies = (manifest.json as { dependencies?: unknown }).dependencies
  if (dependencies === null || typeof dependencies !== 'object' || Array.isArray(dependencies)) return {}
  if (!Object.values(dependencies).every(spec => typeof spec === 'string')) throw new Error('backup dependencies are invalid')
  return dependencies as InstalledMap
}

function installedRepoIdentities(value: unknown): InstalledRepoIdentities {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {}
  const identities: InstalledRepoIdentities = {}
  for (const [name, ids] of Object.entries(value)) {
    if (!Array.isArray(ids)) continue
    const strings = ids.filter((id): id is string => typeof id === 'string')
    if (strings.length > 0) identities[name] = strings
  }
  return identities
}

function installedRepoHints(value: unknown): InstalledRepoHints {
  return installedRepoIdentities(value)
}

function installedMap(value: unknown): InstalledMap {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {}
  const installed: InstalledMap = {}
  for (const [name, spec] of Object.entries(value)) {
    if (typeof spec === 'string') installed[name] = spec
  }
  return installed
}

function sameInstalledMap(left: InstalledMap, right: InstalledMap): boolean {
  const names = Object.keys(left)
  return names.length === Object.keys(right).length && names.every(name => left[name] === right[name])
}

/** Sort field choices in the filter panel. */
const SORT_FIELD_OPTIONS: ReadonlyArray<{ key: SortField; label: string }> = [
  { key: 'downloads', label: 'sortDownloads' },
  { key: 'stars', label: 'sortStars' },
  { key: 'added', label: 'sortAdded' },
]

/** Sort direction choices in the filter panel (labels depend on the field). */
const SORT_DIR_OPTIONS: ReadonlyArray<SortDir> = ['desc', 'asc']

/** Published-within choices in the filter panel. */
const TIME_OPTIONS: ReadonlyArray<{ key: TimeRange; label: string }> = [
  { key: 'all', label: 'timeAll' },
  { key: 'day', label: 'timeDay' },
  { key: 'week', label: 'timeWeek' },
  { key: 'month', label: 'timeMonth' },
  { key: 'quarter', label: 'timeQuarter' },
  { key: 'year', label: 'timeYear' },
]


export interface MarketSectionProps {
  t: Translate
  locale: {
    subscribe(callback: () => void): () => void
    getSnapshot(): { active: string }
  }
  theme: { setTheme(id: string): void }
  themeStore: {
    subscribe(callback: () => void): () => void
    getSnapshot(): ThemeSnapshot | null
  }
  /** Optional host-provided destination: `discover:<query>` or `installed:<query>`. */
  preferredSubsectionId?: string
}

export function MarketSection(props: MarketSectionProps) {
  const t = props.t
  const initialWebdav = useMemo(savedWebdav, [])
  const localeSnap = useSyncExternalStore(
    cb => props.locale.subscribe(cb),
    () => props.locale.getSnapshot(),
  )
  const lang = String(localeSnap.active).toLowerCase().startsWith('zh') ? 'zh' : 'en'
  // null when the composition has no theme service — the Themes tab hides.
  const themeSnap = useSyncExternalStore(
    props.themeStore.subscribe,
    props.themeStore.getSnapshot,
  )
  const [data, setData] = useState<Registry | null>(cachedRegistry)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [installed, setInstalledState] = useState<InstalledMap>(cachedInstalled ?? {})
  const setInstalled = useCallback((value: InstalledMap) => { cachedInstalled = value; setInstalledState(value) }, [])
  const [repoIdentities, setRepoIdentitiesState] = useState<InstalledRepoIdentities>(cachedRepoIdentities ?? {})
  const setRepoIdentities = useCallback((value: InstalledRepoIdentities) => {
    cachedRepoIdentities = value
    setRepoIdentitiesState(value)
  }, [])
  const [repoHints, setRepoHintsState] = useState<InstalledRepoHints>(cachedRepoHints ?? {})
  const setRepoHints = useCallback((value: InstalledRepoHints) => {
    cachedRepoHints = value
    setRepoHintsState(value)
  }, [])
  const [installedFiles, setInstalledFiles] = useState<string[]>([])
  const [skins, setSkins] = useState<string[]>([])
  const [tab, setTab] = useState(() => {
    const saved = sessionStorage.getItem('dshm-tab')
    if (saved !== null) sessionStorage.removeItem('dshm-tab')
    return saved || 'discover'
  })
  const [q, setQ] = useState('')
  /** Per-tab searches stay independent: discover / themes / installed. */
  const [qThemes, setQThemes] = useState('')
  const [qInstalled, setQInstalled] = useState('')
  const [cat, setCat] = useState('all')
  // FLAQ Desktop supplies this for onboarding/feature navigation; upstream dsh web omits it, so ordinary web opens intentionally leave this effect idle.
  useEffect(() => {
    const target = props.preferredSubsectionId
    if (target === undefined) return
    const separator = target.indexOf(':')
    const kind = separator === -1 ? target : target.slice(0, separator)
    const value = separator === -1 ? '' : target.slice(separator + 1)
    if (kind === 'installed') {
      setTab('installed')
      setQInstalled(value)
    } else if (kind === 'discover') {
      setTab('discover')
      setCat('all')
      setQ(value)
    }
  }, [props.preferredSubsectionId])
  const [confirming, setConfirming] = useState<RegistryPlugin | null>(null)
  /** The plugin whose comment thread is open, or null. */
  const [commentsFor, setCommentsFor] = useState<RegistryPlugin | null>(null)
  /** A rejected install and the installed plugins it clashed with, one entry
   * per owner as grouped by the host. */
  interface ConflictNotice {
    plugin: RegistryPlugin
    groups: Array<{ owner: string; ids: string[] }>
  }
  /**
   * Every mutating operation the user started. Records outlive the card that
   * started them, so paginating or searching cannot take a pending decision
   * off screen.
   */
  const [records, setRecords] = useState<OperationRecord[]>([])
  const recordSeq = useRef(0)
  /** The synthetic install task rebuilt from dshm-pending after a remount. */
  const recoveredInstall = useRef<{ id: string; url: string; name?: string } | null>(null)
  /** The synthetic task rebuilt from dshm-updating after this section remounts. */
  const recoveredUpdateRecordId = useRef<string | null>(null)
  /** Raised by the card marker, so "查看详情" lands on the record itself. */
  const [operationsOpen, setOperationsOpen] = useState(false)
  const openOperations = useCallback(() => setOperationsOpen(true), [])
  /**
   * Two plugins can ship under one name from different authors, so a roster
   * row that shows only the package name cannot tell the user which of their
   * plugins a swap would uninstall. Resolve through the catalog for the
   * author and avatar a card would show, and fall back to the bare name for
   * anything installed outside it.
   */
  const describePlugin = useCallback((name: string) => {
    const entry = data?.plugins.find(plugin => plugin.npm === name || plugin.name === name)
    if (entry === undefined) return { title: name }
    return {
      title: pluginName(entry.name),
      author: entry.owner === '' ? undefined : entry.owner,
      avatar: <OwnerAvatar name={entry.name} owner={entry.owner || ''} />,
    }
  }, [data])
  /** Ids are sequential rather than random so a replayed session is stable. */
  const nextRecordId = useCallback(() => {
    recordSeq.current += 1
    return `op-${String(recordSeq.current)}`
  }, [])
  const [replacing, setReplacing] = useState(false)
  /** Shared by every screenshot source (card thumbnail, dialog strip). */
  const [lightbox, setLightbox] = useState<{ shots: string[]; index: number } | null>(null)
  const openLightbox = (shots: string[], index: number): void => setLightbox({ shots, index })
  const [themesFullscreen, setThemesFullscreen] = useState(false)
  const [busyUrl, setBusyUrl] = useState<string | null>(null)
  /** Consecutive idle polls with a pending install that never landed (#32). */
  const idleStrikes = useRef(0)
  /** Same idle-strike bookkeeping for an update whose response was lost. */
  const updateIdleStrikes = useRef(0)
  const [doneUrls, setDoneUrls] = useState<string[]>([])
  const [installError, setInstallError] = useState<string | null>(null)
  /** The notes payload the server answers with, verbatim (see /changelog). */
  type NoteRelease = { tag: string | null; name: string | null; publishedAt: string | null; url: string | null; body: string }
  type NoteCommit = { sha: string; message: string; date: string | null }
  interface UpdateNotes {
    kind: 'release' | 'commits' | 'npm' | 'none'
    release?: NoteRelease
    commits?: { items: NoteCommit[]; found: boolean }
    npmTimes?: Array<{ version: string; date: string }>
  }
  type ResolvedNotes =
    | { kind: 'release'; release: NoteRelease }
    | { kind: 'commits'; commits: { items: NoteCommit[]; found: boolean } }
    | { kind: 'npm'; npmTimes: Array<{ version: string; date: string }> }
    | { kind: 'none' }
  interface CompatibilityNotice {
    code: 'soft-incompatible'
    risks: Array<{ plugin: string; peer: string; range: string; resolved: string; direction: string }>
    /** Cross-layer loader-name collisions this operation introduced (#230). */
    shadowedNames?: Array<{ name: string; layers: string[]; count: number }>
    /** Client bundles that no longer parse after the operation (#222). */
    brokenBundles?: Array<{ name: string; reason: string }>
    rollbackId?: string
    rollbackUnavailable?: string
  }
  const [compatibilityNotice, setCompatibilityNotice] = useState<CompatibilityNotice | null>(null)
  const [rollingBack, setRollingBack] = useState(false)
  /** Log export lifecycle for visible feedback (#84): idle → busy → done/fail. */
  const [exportState, setExportState] = useState<'idle' | 'busy' | 'done' | 'fail'>('idle')

  /**
   * Programmatic log download with explicit feedback (#84) — the plain
   * `<a download>` gave no sign anything happened, and the error banner's
   * "export the log" wording pointed at text that was not clickable at all.
   * Success/failure surface as a primitives Toast (body portal, no layout
   * impact) instead of inline text.
   */
  const doExportLog = useCallback(() => {
    setExportState('busy')
    fetch(api('/dsh-market/logs'))
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
        // The server half describes the server. Everything it reports was
        // already true on machines where the reported bug does not happen,
        // which is why #293 and #384 both stalled on "please open a console
        // and paste this". The browser appends what only it can see — see
        // self-check.ts. Done here rather than sent to the route so this
        // adds no endpoint, no request body, and no new trust boundary.
        const serverText = await res.text()
        const browser = clientDiagnostics()
        const blob = new Blob(
          [serverText, ...(browser.length > 0 ? ['## browser\n', browser.join('\n'), '\n'] : [])],
          { type: 'text/plain;charset=utf-8' },
        )
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = 'dsh-market-log.txt'
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        URL.revokeObjectURL(url)
        setExportState('done')
      })
      .catch(() => setExportState('fail'))
  }, [])
  /** Stable onDone for the export Toast — a fresh closure per render would
   * reset the Toast's auto-dismiss timer on every parent re-render. */
  const exportToastDone = useCallback(() => setExportState('idle'), [])
  const [updates, setUpdates] = useState<Record<string, UpdateStatus>>({})
  /** Update reminders dismissed for this host boot. The Installed tab still
   * shows these plugins and their update actions; only proactive prompts use
   * this set. */
  const [ignoredUpdateNames, setIgnoredUpdateNames] = useState<string[]>([])
  const [updatingName, setUpdatingName] = useState<string | null>(null)
  /** Update-notes dialog (#294): which row opened it, and what it resolved to. */
  const [notesFor, setNotesFor] = useState<{ name: string; current: string | null; latest: string | null; repoUrl: string | null } | null>(null)
  const [updateNotes, setUpdateNotes] = useState<ResolvedNotes | null>(null)
  const [notesState, setNotesState] = useState<'loading' | 'ready' | 'fail'>('loading')
  // Plugin blocked by pnpm's fresh-release safety wait; arms the update-now button.
  const [staleName, setStaleName] = useState<string | null>(null)
  // Local link:/file: restore: the red banner asks before swapping to the catalog.
  const [restoreName, setRestoreName] = useState<string | null>(null)

  /** Determinate percent parsed from pnpm's Progress line, when available. */
  const [progressPct, setProgressPct] = useState<number | null>(null)
  /**
   * Blocked build scripts from the last install or update: enables
   * approve-and-retry (#6; updates in #69). Exactly one of `plugin`
   * (retry installs it) / `updateName` (retry re-runs the update) is set.
   */
  const [buildsSkipped, setBuildsSkipped] = useState<{ plugin?: RegistryPlugin; updateName?: string; names: string[]; restore?: boolean } | null>(null)
  const [updatingAll, setUpdatingAll] = useState(false)
  const [updatedNames, setUpdatedNames] = useState<string[]>([])
  const [hotUrls, setHotUrls] = useState<string[]>([])
  const [hotNames, setHotNames] = useState<string[]>([])
  const [progressLine, setProgressLine] = useState<string | null>(null)
  /** Per-package activation states from /dsh-market/installed + operations. */
  const [activations, setActivations] = useState<Record<string, ActivationInfo>>({})
  /** #60: persisted disable list + custom groups, straight from /installed. */
  const [disabledNames, setDisabledNames] = useState<string[]>([])
  /** The user's own note per plugin (#347): package name → text. */
  const [notes, setNotes] = useState<Record<string, string>>({})
  /** Rows the user asked to show the AUTHOR's description on, despite a note. */
  const [showTheirs, setShowTheirs] = useState<string[]>([])
  /** The row whose note is being edited, and the text in the box. */
  const [notingName, setNotingName] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  /** The disable set as of the first load; null until it arrives. */
  const loadedDisabled = useRef<Set<string> | null>(null)
  /**
   * Patch-layer flags (port of dsh-plugin-hub): packages whose bundle rows
   * the user patch layer disables / force-enables. The UI treats them as the
   * real switch state so hand-edited cordis.patch.yml toggles are visible.
   */
  const [patchDisabledNames, setPatchDisabledNames] = useState<string[]>([])
  const [groups, setGroups] = useState<Record<string, string[]>>({})
  const [groupOrder, setGroupOrder] = useState<string[]>([])
  /** Installed-tab sub-view: flat list or groups (All-plugins was removed —
   * it duplicated the Discover tab). */
  const [installedView, setInstalledView] = useState<'list' | 'groups'>('list')
  const [togglingName, setTogglingName] = useState<string | null>(null)
  // Group editor state (create / rename / delete / assign).
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null)
  const [renamingValue, setRenamingValue] = useState('')
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null)
  /** Open group picker: which group and whether it adds plugins or themes. */
  const [addPanel, setAddPanel] = useState<{ group: string; kind: 'plugin' | 'theme' } | null>(null)
  const [assignFor, setAssignFor] = useState<string | null>(null)
  const [assignTarget, setAssignTarget] = useState('')
  /** Structured progress from pnpm ndjson (P1-6). */
  const [progressPhase, setProgressPhase] = useState<MarketStatus['phase']>(null)
  const [progressCurrent, setProgressCurrent] = useState<string | null>(null)
  const [progressDone, setProgressDone] = useState(0)
  const [cancelling, setCancelling] = useState(false)
  /** Server-side operation lock from /dsh-market/status (#91). */
  const [hostBusy, setHostBusy] = useState(false)
  /**
   * The market's own version, shown beside the heading. Most bug reports
   * arrive as a photo of the screen, and without a version in frame the
   * first reply always has to ask which one it was.
   */
  const [version, setVersion] = useState<string | null>(null)
  /** Non-live activation results from the last operation, shown as a banner. */
  const [activationWarnings, setActivationWarnings] = useState<{ name: string; info: ActivationInfo }[]>([])
  const [hostDependencyFindings, setHostDependencyFindings] = useState<SharedHostPackageDependencyFinding[]>([])
  /** Plugin name awaiting uninstall confirmation (Modal). */
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null)
  const [removingName, setRemovingName] = useState<string | null>(null)
  const [removedCount, setRemovedCount] = useState(0)
  /** Toggles whose live fiber did not follow the switch — restart to apply. */
  const [toggleRestart, setToggleRestart] = useState(0)
  /** Last completed toggle, shown as a toast (#299). The switch and the row
   * tag already say the new state, but both live in a row the user may have
   * scrolled past — a mis-click there goes unnoticed. The toast is fixed on
   * screen, so it is the part that actually catches an accident. */
  const [toggled, setToggled] = useState<{ name: string; enabled: boolean } | null>(null)
  const toggledDone = useCallback(() => setToggled(null), [])
  /**
   * Dismissal of the host-reported restart notice, keyed to the current boot
   * so it reappears after a restart that did not happen and after any new
   * change. sessionStorage, not local: closing the tab is a fresh start.
   */
  const [restartNoticeDismissed, setRestartNoticeDismissed] = useState(false)
  /** Client-part plugins toggled this session — their UI needs a refresh. */
  const [refreshNames, setRefreshNames] = useState<string[]>([])
  const [envReady, setEnvReady] = useState(true)
  const [envFixing, setEnvFixing] = useState(false)
  const [envFailed, setEnvFailed] = useState(false)
  const [bootId, setBootId] = useState<string | null>(null)
  /** One-click restart (#14 by @ysyyhhh): server capability + in-flight state. */
  const [restartEnabled, setRestartEnabled] = useState(false)
  /** Supervisor the host detected around itself, when it named one (#229). */
  const [supervisor, setSupervisor] = useState<string | null>(null)
  /** Debugger latch when one-click restart must not kill the host (#447). */
  const [debuggerLatch, setDebuggerLatch] = useState<string | null>(null)
  const [restarting, setRestarting] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const [backupBusy, setBackupBusy] = useState(false)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)
  const [backupRestored, setBackupRestored] = useState(false)
  const [pendingBackup, setPendingBackup] = useState<unknown>(null)
  const [pendingDependencies, setPendingDependencies] = useState<InstalledMap>({})
  const [webdavUrl, setWebdavUrl] = useState(initialWebdav.url)
  const [webdavUser, setWebdavUser] = useState(initialWebdav.username)
  const [webdavPassword, setWebdavPassword] = useState(initialWebdav.password)
  const [autoBackup, setAutoBackup] = useState(initialWebdav.auto)
  /** GitHub token — session memory only, never written to any storage. */
  const [gistToken, setGistToken] = useState('')
  /** Gist id — persisted across reloads (non-sensitive: the Gist itself is private). */
  const [gistId, setGistId] = useState(() => {
    try { return localStorage.getItem('dshm-gist-id') ?? '' } catch { return '' }
  })
  /** Export mode: 'update' PATCHes the Gist in the field, 'create' makes a new one. */
  const [gistMode, setGistMode] = useState<'update' | 'create'>(() => {
    try { return localStorage.getItem('dshm-gist-id') ? 'update' : 'create' } catch { return 'create' }
  })
  const [gistBusy, setGistBusy] = useState(false)
  const [gistMessage, setGistMessage] = useState<string | null>(null)
  const [gistOk, setGistOk] = useState(false)
  const [gistResult, setGistResult] = useState<GistExportResult | null>(null)
  /** Export picker: open state, selected plugin names, include-config flag. */
  const [exportOpen, setExportOpen] = useState(false)
  const [exportSelection, setExportSelection] = useState<Set<string>>(new Set())
  const [exportIncludeConfig, setExportIncludeConfig] = useState(false)
  /** Export failure shown INSIDE the picker so it is never hidden behind it. */
  const [exportError, setExportError] = useState<string | null>(null)
  /** Bundle-only plugin names from /dsh-market/installed (picker list). */
  const [installedBundles, setInstalledBundles] = useState<string[]>([])
  const bodyRef = useRef<HTMLDivElement | null>(null)
  /** Hidden file input behind the Import button (a Button can't host an <input>). */
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [sortField, setSortField] = useState<SortField>('downloads')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [catsOpen, setCatsOpen] = useState(false)
  /** Themes tab: independent from Discover's sort/time state above — a
   * search or sort choice in one tab has no business resetting the other. */
  const [themeSortField, setThemeSortField] = useState<SortField>('downloads')
  const [themeSortDir, setThemeSortDir] = useState<SortDir>('desc')
  const [themeTimeRange, setThemeTimeRange] = useState<TimeRange>('all')
  /** WebDAV provider-preset dropdown (primitives Menu). */
  const [presetOpen, setPresetOpen] = useState(false)
  /** Install-command disclosure inside the confirm dialog. */
  const [cmdOpen, setCmdOpen] = useState(false)
  /** Per-row "why is it not live" disclosure (installed tab). */
  const [whyOpen, setWhyOpen] = useState<string | null>(null)
  /** Restore-confirm dialog (replaces window.confirm). */
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false)
  /** Plugins that failed to install during a restore (replaces window.alert). */
  const [restoreErrors, setRestoreErrors] = useState<string[]>([])
  // How many category pills fit in the two collapsed rows (measured once —
  // the settings panel width is fixed); null = measuring render with all
  // pills clamped, then slice so the chevron flows inline after the last one.
  const [visibleCats, setVisibleCats] = useState<number | null>(null)
  /** Same idea as `visibleCats`, but how many fit in a single row — used to
   *  shrink an expanded (2+ row) category list while the sticky header is
   *  pinned during scroll, distinct from the two-row collapsed default. */
  const [visibleCatsOneRow, setVisibleCatsOneRow] = useState<number | null>(null)
  const catsWrapRef = useRef<HTMLDivElement | null>(null)
  // Whether the sticky header is currently pinned to the top of the scroll
  // area. Tracked via a sentinel just above it rather than a scrollTop
  // threshold: the threshold would have to hard-code the header's offset
  // (padding, sticky `top`), which drifts silently whenever that CSS
  // changes. The sentinel just reports what's actually true on screen.
  const [catsStuck, setCatsStuck] = useState(false)
  const [catsSentinel, setCatsSentinel] = useState<HTMLDivElement | null>(null)

  const refreshInstalled = useCallback((force?: boolean) => {
    fetch(api('/dsh-market/installed'), { cache: 'no-store' })
      .then(res => res.json())
      .then(body => {
        setInstalled(body.installed || {})
        setRepoIdentities(installedRepoIdentities(body.repoIdentities))
        setRepoHints(installedRepoHints(body.repoHints))
        setInstalledFiles(Array.isArray(body.present) ? body.present : Object.keys(body.installed || {}))
        setSkins(body.live || [])
        if (Array.isArray(body.disabled)) {
          setDisabledNames(body.disabled)
          // The switch positions this page was BUILT with. A toggle away from
          // them needs a refresh; a toggle back to them does not, and the
          // banner has to be able to say so (#340).
          if (loadedDisabled.current === null) loadedDisabled.current = new Set(body.disabled as string[])
        }
        if (body.notes !== null && typeof body.notes === 'object' && !Array.isArray(body.notes)) {
          setNotes(body.notes as Record<string, string>)
        }
        if (Array.isArray(body.patchDisabled)) setPatchDisabledNames(body.patchDisabled)
        if (body.groups && typeof body.groups === 'object') setGroups(body.groups)
        if (Array.isArray(body.groupOrder)) setGroupOrder(body.groupOrder)
        setInstalledBundles(Array.isArray(body.bundles) ? body.bundles.filter((name: unknown): name is string => typeof name === 'string') : [])
        if (body.activation && typeof body.activation === 'object') setActivations(body.activation)
        const findings = body.diagnostics?.schema === 'dsh-market/diagnostics/v1'
          && Array.isArray(body.diagnostics.findings)
          ? body.diagnostics.findings.filter(isHostDependencyFinding)
          : []
        setHostDependencyFindings(findings)
      })
      .catch(() => {})
    fetch(api('/dsh-market/updates') + (force === true ? '?force=1' : ''), { cache: 'no-store' })
      .then(res => res.json())
      .then(body => setUpdates(body.updates || {}))
      .catch(() => {})
  }, [])

  /** Active Bundles count as installed in Discover without becoming package-manager targets. */
  const catalogInstalled = useMemo(
    () => installedForCatalog(installed, installedBundles),
    [installed, installedBundles],
  )
  /** Lookup set for the persisted disable list (#60). */
  const disabledSet = useMemo(() => new Set(disabledNames), [disabledNames])
  /** Effective switch state: market disable list ∪ user-patch-layer disables. */
  const effectiveDisabledSet = useMemo(
    () => new Set([...disabledNames, ...patchDisabledNames]),
    [disabledNames, patchDisabledNames],
  )

  useEffect(() => {
    if (tab !== 'themes' && themesFullscreen) setThemesFullscreen(false)
  }, [tab, themesFullscreen])

  useEffect(() => {
    if (!themesFullscreen || lightbox !== null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      setThemesFullscreen(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [lightbox, themesFullscreen])

  const loadCatalog = useCallback(() => {
    setLoadError(null)
    return fetch(api('/dsh-market/registry'), { cache: 'no-store' })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as { registry?: Registry; error?: string }
        if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : `HTTP ${String(res.status)}`)
        return body
      })
      .then((body) => {
        if (body.registry === undefined) throw new Error('the catalog response carried no data')
        cachedRegistry = body.registry
        setData(body.registry)
        setLoadError(null)
      })
      // Report WHY. An unreachable catalog used to be answered with a
      // bundled copy, so "cannot reach the registry" and "the catalog is
      // smaller today" looked identical on screen — and the second reading
      // is the one users reached.
      .catch((error: unknown) => { setLoadError(error instanceof Error ? error.message : String(error)) })
  }, [])

  useEffect(() => {
    void loadCatalog()
    fetch(api('/dsh-market/status'), { cache: 'no-store' })
      .then(res => res.json())
      .then(status => {
        setEnvReady(status.pnpm !== false)
        // Applied before anything renders a github.com URL. The catalog this
        // page draws from is a larger request through the same server, so it
        // lands later; and if it ever did not, the status poll re-renders
        // within seconds and the images correct themselves.
        setGithubProxy(typeof status.githubProxy === 'string' ? status.githubProxy : null)
        if (typeof status.boot === 'string') {
          setBootId(status.boot)
          setIgnoredUpdateNames(ignoredUpdatesForBoot(status.boot))
          // A dismissal only silences the notice for the boot it was made
          // in: if the user dismissed instead of restarting, the next boot
          // (or a stale dismissal from a previous one) shows it again.
          try {
            setRestartNoticeDismissed(sessionStorage.getItem('dshm-restart-dismissed') === status.boot)
          } catch { /* storage unavailable */ }
        }
        setRestartEnabled(status.restart === true)
        setSupervisor(typeof status.supervisor === 'string' ? status.supervisor : null)
        setDebuggerLatch(typeof status.debugger === 'string' ? status.debugger : null)
        if (typeof status.version === 'string' && status.version !== '') setVersion(status.version)
      })
      .catch(() => {})
    refreshInstalled()
  }, [refreshInstalled, loadCatalog])

  // Pending-restart flags survive tab switches and page reloads, scoped to
  // one host process: a different boot id means the restart happened and the
  // stale banner must not resurrect.
  useEffect(() => {
    if (bootId === null) return
    const saved = readSession('dshm-restart')
    if (saved === null) return
    if (saved.boot !== bootId) {
      sessionStorage.removeItem('dshm-restart')
      return
    }
    if (Array.isArray(saved.doneUrls) && saved.doneUrls.length > 0) setDoneUrls(saved.doneUrls)
    if (Array.isArray(saved.updated) && saved.updated.length > 0) setUpdatedNames(saved.updated)
    if (typeof saved.removed === 'number' && saved.removed > 0) setRemovedCount(saved.removed)
    if (typeof saved.toggled === 'number' && saved.toggled > 0) setToggleRestart(saved.toggled)
  }, [bootId])

  useEffect(() => {
    if (bootId === null) return
    if (doneUrls.length === 0 && updatedNames.length === 0 && removedCount === 0 && toggleRestart === 0) {
      // Nothing pending: drop any stale entry (e.g. a hot mount cleared the
      // only doneUrl) so a same-boot remount cannot resurrect the banner (#73).
      sessionStorage.removeItem('dshm-restart')
      return
    }
    sessionStorage.setItem('dshm-restart', JSON.stringify({
      boot: bootId,
      doneUrls,
      updated: updatedNames,
      removed: removedCount,
      toggled: toggleRestart,
    }))
  }, [bootId, doneUrls, updatedNames, removedCount, toggleRestart])

  const fixEnv = useCallback(() => {
    setEnvFixing(true)
    setEnvFailed(false)
    fetch(api('/dsh-market/setup-pnpm'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
      .then(res => res.json())
      .then(body => {
        if (body.ok) {
          setEnvReady(true)
        } else {
          setEnvFailed(true)
          if (typeof body.error === 'string') setInstallError(body.error)
        }
      })
      .catch(() => setEnvFailed(true))
      .finally(() => setEnvFixing(false))
  }, [])

  // Recover an install whose HTTP response was lost (page navigated away or
  // the connection dropped): the pending marker survives in sessionStorage and
  // the poll below converges the button state from the host's ground truth.
  useEffect(() => {
    const pending = readSession('dshm-pending')
    if (pending !== null && typeof pending.url === 'string') {
      setBusyUrl(pending.url)
      recoveredInstall.current = {
        id: `recovered-install:${pending.url}`,
        url: pending.url,
        ...(typeof pending.name === 'string' && pending.name !== '' ? { name: pending.name } : {}),
      }
    }
    // Same recovery for an update in flight: closing the config page unmounts
    // this section and drops `updatingName` with it, so the running row's
    // progress vanished on reopen. The marker restores the row and the poll
    // below converges it from the host's ground truth.
    const updating = readSession('dshm-updating')
    if (updating !== null && typeof updating.name === 'string' && updating.name !== '') {
      setUpdatingName(updating.name)
      const id = `recovered-update:${updating.name}`
      recoveredUpdateRecordId.current = id
      setRecords(list => list.some(record =>
        record.kind === 'update' && record.name === updating.name && record.state === 'running')
        ? list
        : enqueue(list, { id, kind: 'update', name: updating.name, state: 'running' }))
    }
  }, [])

  // New markers carry the name and recover immediately. Older markers only
  // carried the URL, so wait for the catalog and resolve the same task from it.
  useEffect(() => {
    const recovered = recoveredInstall.current
    if (recovered === null) return
    const name = recovered.name ?? data?.plugins.find(plugin => plugin.url === recovered.url)?.name
    if (name === undefined) return
    recovered.name = name
    setRecords(list => list.some(record => record.id === recovered.id)
      ? list
      : enqueue(list, {
          id: recovered.id, kind: 'install', name, url: recovered.url, state: 'running',
        }))
  }, [data])

  useEffect(() => {
    if (busyUrl === null && updatingName === null) {
      // `hostBusy` is sampled by the progress poll. A normal update response
      // can settle the local operation before the next poll observes the
      // route lock released, leaving the restart button disabled until this
      // section remounts (#440). With no tracked install/update left, discard
      // that stale sample; the guarded restart route still handles the small
      // post-response lock-release window with its existing 409 retry.
      setHostBusy(false)
      setProgressLine(null)
      setProgressPhase(null)
      setProgressCurrent(null)
      setProgressDone(0)
      setCancelling(false)
      return
    }
    const timer = setInterval(() => {
      fetch(api('/dsh-market/status'), { cache: 'no-store' })
        .then(res => res.json())
        .then(status => {
          setHostBusy(status.busy === true)
          setDebuggerLatch(typeof status.debugger === 'string' ? status.debugger : null)
          if (status.active) {
            setCancelling(status.cancelling === true)
            if (status.phase !== null && status.phase !== undefined) {
              // Structured pnpm progress: stage + current package + count.
              setProgressPhase(status.phase)
              setProgressCurrent(status.currentPackage ?? null)
              setProgressDone(status.done ?? 0)
              setProgressLine(null)
              if (typeof status.size === 'number' && status.size > 0 && typeof status.downloaded === 'number') {
                setProgressPct(Math.max(4, Math.min(96, Math.round(status.downloaded / status.size * 100))))
              }
            } else {
              setProgressLine((status.lastLine || '…') + '  (' + status.seconds + 's)')
              setProgressPhase(null)
              setProgressCurrent(null)
              setProgressDone(0)
              const m = /resolved (\d+), reused (\d+), downloaded (\d+), added (\d+)/.exec(status.lastLine || '')
              if (m !== null && Number(m[1]) > 0) {
                const done = Number(m[2]) + Number(m[3]) + Number(m[4])
                setProgressPct(Math.max(4, Math.min(96, Math.round(done / Number(m[1]) * 100))))
              }
            }
          } else {
            setProgressLine(null)
            setProgressPct(null)
            setProgressPhase(null)
            setProgressCurrent(null)
            setProgressDone(0)
            setCancelling(false)
            const statusInstalled = installedMap(status.installed)
            if (!sameInstalledMap(installed, statusInstalled)) refreshInstalled()
            const pending = readSession('dshm-pending')
            // status.busy (#91): pnpm exited but the install route still
            // holds the operation lock (validation, hot-mount). Neither
            // declare the install done nor count an idle strike yet — a
            // premature banner here invited a restart click into a 409.
            if (pending !== null && busyUrl !== null && status.busy !== true) {
              const nowInstalled = data !== null && data.plugins.some(p =>
                p.url === busyUrl && isInstalled(p, statusInstalled, repoIdentities, data.plugins, repoHints))
              if (nowInstalled) {
                idleStrikes.current = 0
                sessionStorage.removeItem('dshm-pending')
                const recovered = recoveredInstall.current
                if (recovered !== null) {
                  setRecords(list => drop(list, recovered.id))
                  recoveredInstall.current = null
                }
                setDoneUrls(urls => urls.includes(busyUrl) ? urls : urls.concat(busyUrl))
                setBusyUrl(null)
              } else if (++idleStrikes.current >= 2) {
                // Host is idle and the plugin never landed: the install died
                // (e.g. exit 127) with its response lost. Without this the
                // button says "installing" forever — across reloads (#32).
                idleStrikes.current = 0
                sessionStorage.removeItem('dshm-pending')
                const recovered = recoveredInstall.current
                if (recovered !== null) {
                  setRecords(list => drop(list, recovered.id))
                  recoveredInstall.current = null
                }
                setBusyUrl(null)
                setInstallError(t('installFail') + ' — ' + t('exportLog'))
              }
            }
            // An update whose response was lost — the page was closed mid-run
            // and reopened via the dshm-updating marker — converges the same
            // way. Once the host reports the operation fully settled (pnpm
            // exited AND the mutation lock released), hand the running row
            // back to the refreshed listing instead of showing "updating"
            // forever. Two idle polls guard the brief window before the host
            // has actually started the command.
            if (updatingName !== null && status.busy !== true) {
              if (++updateIdleStrikes.current >= 2) {
                updateIdleStrikes.current = 0
                sessionStorage.removeItem('dshm-updating')
                const recoveredId = recoveredUpdateRecordId.current
                if (recoveredId !== null) {
                  setRecords(list => drop(list, recoveredId))
                  recoveredUpdateRecordId.current = null
                }
                setUpdatingName(null)
                refreshInstalled()
              }
            } else {
              updateIdleStrikes.current = 0
            }
          }
        })
        .catch(() => {})
    }, 2000)
    return () => clearInterval(timer)
  }, [busyUrl, updatingName, data, installed, repoIdentities, repoHints, refreshInstalled])

  const scrollToTop = () => {
    const el = bodyRef.current
    if (el) {
      // jsdom (tests) lacks Element.scrollTo — fall back to the assignment.
      if (typeof el.scrollTo === 'function') el.scrollTo({ top: 0, behavior: 'smooth' })
      else el.scrollTop = 0
    }
  }

  // The .body scroller is shared across top tabs AND in-tab list replacements
  // (Discover/Themes category, search, sort; Installed search and list/groups).
  // Leaving scrollTop in place opens the next list mid-page — or, when it is
  // shorter, at its clamped bottom. Instant (not the smooth scrollToTop used
  // for pagination) so the jump happens before paint.
  useLayoutEffect(() => {
    const el = bodyRef.current
    if (el !== null) el.scrollTop = 0
    setShowTop(false)
  }, [tab, q, cat, sortField, sortDir, timeRange, qThemes, themeSortField, themeSortDir, themeTimeRange, qInstalled, installedView])

  const plugins = useMemo(
    () => (data === null ? [] : visiblePlugins(data.plugins, {
      category: cat, query: q, lang, categories: data.categories,
      sort: `${sortField}-${sortDir}`,
      sinceDays: timeRange === 'all' ? undefined : TIME_RANGE_DAYS[timeRange],
    })),
    [data, q, cat, lang, sortField, sortDir, timeRange])
  const { currentPage, totalPages, pageSize, goToPage, changePageSize } =
    usePagination(plugins.length, [q, cat, sortField, sortDir, timeRange], scrollToTop)
  const pagePlugins = plugins.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const themePlugins = useMemo(
    () => (data === null ? [] : visiblePlugins(data.plugins, {
      category: 'theme', query: qThemes, lang, categories: data.categories,
      sort: `${themeSortField}-${themeSortDir}`,
      sinceDays: themeTimeRange === 'all' ? undefined : TIME_RANGE_DAYS[themeTimeRange],
    })),
    [data, qThemes, lang, themeSortField, themeSortDir, themeTimeRange])
  const themePagination = usePagination(
    themePlugins.length, [qThemes, themeSortField, themeSortDir, themeTimeRange], scrollToTop)
  const themePagePlugins = themePlugins.slice(
    (themePagination.currentPage - 1) * themePagination.pageSize, themePagination.currentPage * themePagination.pageSize)

  /** Download a host endpoint as a file — primitives Button can't be an <a download>.
   * Prefers the server's Content-Disposition filename (e.g. the timestamped
   * backup export) and falls back to the caller's name. */
  const downloadFile = useCallback((url: string, filename: string) => {
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status)
        const disposition = res.headers.get('content-disposition')
        if (disposition !== null) {
          const match = /filename="?([^";]+)"?/.exec(disposition)
          if (match !== null && match[1] !== undefined && match[1] !== '') filename = match[1]
        }
        return res.blob()
      })
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = filename
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 2000)
      })
      .catch(error => setInstallError(String(error)))
  }, [])

  const doRollback = useCallback((rollbackId: string) => {
    setRollingBack(true)
    setInstallError(null)
    fetch(api('/dsh-market/rollback'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rollbackId }),
    })
      .then(res => res.json().then(body => ({ status: res.status, body })))
      .then(({ status, body }) => {
        if (status === 200 && body.ok) {
          setCompatibilityNotice(null)
          refreshInstalled()
        } else {
          setInstallError(String(body.error || body.detail || 'rollback failed'))
        }
      })
      .catch(error => setInstallError(String(error)))
      .finally(() => setRollingBack(false))
  }, [refreshInstalled])

  const compatibilitySummary = (risks: CompatibilityNotice['risks']): string => {
    if (risks.length === 0) return ''
    const first = risks[0]
    return `${first.plugin}: ${first.peer} ${first.range} vs ${first.resolved}`
  }

  /** Which name now resolves from two layers, and which layers those are. */
  const shadowSummary = (entries: NonNullable<CompatibilityNotice['shadowedNames']>): string => {
    if (entries.length === 0) return ''
    const first = entries[0]
    const rest = entries.length > 1 ? ` (+${entries.length - 1})` : ''
    return `${first.name} — ${first.layers.join(' / ')}${rest}`
  }

  const doInstall = useCallback((plugin: RegistryPlugin) => {
    setBuildsSkipped(null)
    setConfirming(null)
    setInstallError(null)
    setActivationWarnings([])
    setBusyUrl(plugin.url)
    // One record per attempt. A retry appends rather than reusing the old
    // one, so the card resolves to the newest and its Install button returns.
    const recordId = nextRecordId()
    setRecords(list => enqueue(list, {
      id: recordId, kind: 'install', name: plugin.name, url: plugin.url, state: 'running',
    }))
    sessionStorage.setItem('dshm-pending', JSON.stringify({ url: plugin.url, name: plugin.name }))
    fetch(api('/dsh-market/install'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: plugin.url }),
    })
      .then(res => res.json().then(body => ({ status: res.status, body })))
      .then(({ status, body }) => {
        setBusyUrl(null)
        sessionStorage.removeItem('dshm-pending')
        if (status === 200 && body.ok && body.hot && pluginCategories(plugin).includes('theme')) {
          // Themes auto-activate on install; reload straight into the Themes
          // tab so the new look is on screen immediately.
          sessionStorage.setItem('dshm-toast', JSON.stringify([plugin.name]))
          sessionStorage.setItem('dshm-tab', 'themes')
          location.reload()
          return
        }
        if (body.cancelled === true) {
          // User-cancelled: quiet reset, nothing to report.
          setRecords(list => drop(list, recordId))
          refreshInstalled()
          if (body.partial === true) setInstallError(t('partialNote'))
          return
        }
        if (status === 200 && body.ok) {
          sessionStorage.setItem('dshm-tab', 'installed')
          if (body.activation && typeof body.activation === 'object') {
            setActivations(prev => ({ ...prev, ...body.activation }))
            const warns = Object.entries(body.activation as Record<string, ActivationInfo>)
              .filter(([, info]) => info.state !== 'live' && info.state !== 'missing')
              .map(([name, info]) => ({ name, info }))
            setActivationWarnings(warns)
          }
          if (body.hot) {
            // The status-poll recovery path may have already counted this URL
            // as pending-restart before the install response confirmed a hot
            // mount; a hot plugin must not stay in doneUrls (#73).
            setDoneUrls(urls => urls.filter(url => url !== plugin.url))
            setHotUrls(urls => urls.includes(plugin.url) ? urls : urls.concat(plugin.url))
            setHotNames(names => names.includes(plugin.name) ? names : names.concat(plugin.name))
          } else {
            setDoneUrls(urls => urls.includes(plugin.url) ? urls : urls.concat(plugin.url))
          }
          if (body.compatibility?.code === 'soft-incompatible') {
            setCompatibilityNotice(body.compatibility as CompatibilityNotice)
          }
          // `warned` keeps the ✓: the plugin IS installed, so calling a
          // compatibility risk a failure would misreport what happened.
          setRecords(list => patchRecord(list, recordId, body.compatibility?.code === 'soft-incompatible'
            ? { state: 'warned', reason: t('compatRiskBanner') }
            : { state: 'done', needsRefresh: body.hot !== true }))
          refreshInstalled()
        } else {
          if (status === 409) {
            const busyReason = body.agentsBusy === true
              ? t('agentBusyInstall') + (Array.isArray(body.runningAgents) && body.runningAgents.length > 0 ? ` (${body.runningAgents.join(', ')})` : '')
              : t('busyWait')
            setRecords(list => patchRecord(list, recordId, { state: 'failed', reason: busyReason }))
            setOperationsOpen(true)
            return
          }
          // A clash is not a failure to report and forget: the host already
          // reverted it, so what remains is a decision. `input` keeps the
          // record in the panel until the user answers it.
          if (Array.isArray(body.conflictGroups) && body.conflictGroups.length > 0) {
            setRecords(list => patchRecord(list, recordId, {
              state: 'input', conflicts: body.conflictGroups as ConflictNotice['groups'],
            }))
            // Raise the panel for anything that needs an answer. A red dot on
            // a closed panel is not a report; out of sight is out of mind.
            setOperationsOpen(true)
            return
          }
          const blocked = Array.isArray(body.ignoredBuilds) ? body.ignoredBuilds.map(String) : []
          if (blocked.length > 0) setBuildsSkipped({ plugin, names: blocked })
          const text = (v: unknown) => typeof v === 'string' ? v : (v && typeof (v as any).text === 'string') ? (v as any).text : v == null ? '' : JSON.stringify(v)
          const orphans = Array.isArray(body.orphanBundles) ? body.orphanBundles.map(String) : []
          const failure = text(body.error) || humanOutput([text(body.stderr), text(body.stdout)].filter(Boolean).join('\n')) || ('exit ' + body.exitCode)
          // The profile will not boot as it stands (#339). Said FIRST, because
          // it outranks whatever else went wrong: a plugin that failed to
          // install is recoverable, a profile that cannot start is not — and
          // the user would otherwise meet it as a Node stack trace after the
          // next restart, with nothing linking it to this operation.
          // A stale catalog entry (#346) is said before pnpm's own wording,
          // which for that failure reads like the user broke something.
          const staleEntry = typeof body.staleEntry === 'string' ? body.staleEntry : null
          const detail = [
            orphans.length > 0 ? `${t('orphanBundle')} ${orphans.join(', ')}` : null,
            staleEntry,
            failure,
          ].filter(Boolean).join('\n')
          // Carry the blocked names onto the record too: the panel is where
          // this failure is read, so it is where the one-click way out has to
          // be (#314).
          setRecords(list => patchRecord(list, recordId, {
            state: 'failed', reason: detail.trim().slice(-600),
            ...(blocked.length > 0 ? { blockedBuilds: blocked } : {}),
          }))
          setOperationsOpen(true)
        }
      })
      .catch(() => {
        // #100: a long install can outlive its HTTP response (loopback
        // stacks and proxies reset idle connections) while pnpm keeps
        // working server-side — declaring failure here produced a false
        // "install failed, export the log" with an EMPTY log (the route
        // only logs when it finishes), followed by the plugin quietly
        // appearing minutes later. Keep dshm-pending and the busy button
        // instead, and let the status poll decide: its recovery path marks
        // success once the plugin lands (busy-aware since #91) and strikes
        // out genuinely dead installs (#32).
      })
  }, [nextRecordId, refreshInstalled, t])

  /**
   * Resolve a loader-id clash the only way one profile allows: uninstall the
   * plugins holding the ids, then retry the install. Sequential because each
   * route takes the host's mutation lock, so a parallel burst would 409.
   *
   * A failure part-way leaves plugins already gone. Nothing reinstalls them
   * automatically (a rollback would itself be an install that can fail), so
   * the message names them — reporting only "failed" would leave the user
   * guessing which of their plugins survived.
   */
  const doReplace = useCallback(async (record: OperationRecord, plugin: RegistryPlugin) => {
    setInstallError(null)
    setReplacing(true)
    const removed: string[] = []
    try {
      for (const group of record.conflicts ?? []) {
        const response = await fetch(api('/dsh-market/uninstall'), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: group.owner }),
        })
        const body = await response.json() as { ok?: boolean; error?: unknown; stderr?: unknown }
        if (response.status !== 200 || body.ok !== true) {
          const text = (v: unknown) => typeof v === 'string' ? v : v == null ? '' : JSON.stringify(v)
          const detail = (text(body.error) || humanOutput(text(body.stderr)) || 'error').trim().slice(-400)
          const reason = removed.length === 0
            ? `${t('installFail')}: ${group.owner} — ${detail}`
            : `${t('conflictReplaceFailed')} ${removed.join(', ')} — ${detail}`
          setRecords(list => patchRecord(list, record.id, { state: 'failed', conflicts: undefined, reason }))
          setOperationsOpen(true)
          refreshInstalled()
          return
        }
        removed.push(group.owner)
      }
    } finally {
      setReplacing(false)
    }
    // The clash record is done with; the retry opens its own, so the card
    // resolves to the new attempt rather than the answered decision.
    setRecords(list => drop(list, record.id))
    refreshInstalled()
    doInstall(plugin)
  }, [doInstall, refreshInstalled, t])

  /**
   * Answer a clash. `keep` is not a no-op to skip: it is the user declining
   * the install, so the record retires rather than lingering as unanswered.
   */
  const resolveConflict = useCallback((record: OperationRecord, choice: 'keep' | 'swap') => {
    if (choice === 'keep') {
      setRecords(list => patchRecord(list, record.id, {
        state: 'failed', conflicts: undefined, reason: t('conflictDeclined'),
      }))
      return
    }
    const plugin = data?.plugins.find(candidate => candidate.url === record.url)
    if (plugin === undefined) return
    void doReplace(record, plugin)
  }, [data, doReplace, t])

  /**
   * Restart the host and reload once the boot id changes (#14 by @ysyyhhh).
   * The 202 races the process's SIGTERM, so network errors on the initial
   * request are expected and treated as "restart under way".
   */
  const doRestart = useCallback(() => {
    if (bootId === null || restarting) return
    const previousBoot = bootId
    setRestarting(true)
    setInstallError(null)
    const awaitNewBoot = () => {
      const deadline = Date.now() + 60000
      const poll = () => {
        fetch(api('/dsh-market/status'), { cache: 'no-store' })
          .then(res => res.json())
          .then((next) => {
            if (typeof next.boot === 'string' && next.boot !== previousBoot) {
              location.reload()
              return
            }
            retry()
          })
          .catch(retry)
      }
      const retry = () => {
        if (Date.now() > deadline) {
          setRestarting(false)
          setInstallError(t('restartTimeout'))
          return
        }
        setTimeout(poll, 1500)
      }
      poll()
    }
    const requestRestart = (attemptsLeft: number) => {
      fetch(api('/dsh-market/restart'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
        .then(res => res.json().then(body => ({ status: res.status, body })))
        .then(({ status, body }) => {
          if (status === 202 && body.ok === true) {
            awaitNewBoot()
            return
          }
          // 409 = the install route still holds the operation lock for its
          // post-processing (#91) — a short quiet retry beats surfacing
          // "cannot restart while a plugin operation is running" to a user
          // who just followed our own banner.
          if (status === 409 && attemptsLeft > 0) {
            setTimeout(() => requestRestart(attemptsLeft - 1), 1500)
            return
          }
          setRestarting(false)
          setInstallError(t('restartFail') + ': ' + String(body.error || ('HTTP ' + String(status))))
        })
        .catch(awaitNewBoot) // the host may die mid-response; keep polling
    }
    requestRestart(10)
  }, [bootId, restarting, t])

  /** Cancel the running plugin command (#6 by @qichuang321). */
  const doCancel = useCallback(() => {
    fetch(api('/dsh-market/cancel'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
      .catch(() => {})
  }, [])

  const doUpdate = useCallback((name: string, force = false, restore = false) => {
    setInstallError(null)
    setActivationWarnings([])
    // Only THIS row's stale marker is cleared. "Update all" walks the list
    // calling straight into here, so an unconditional reset meant every
    // earlier release-age failure lost its retry button and only the last
    // one kept it — the rest failed silently with no way forward (#255).
    setStaleName(prev => (prev === name ? null : prev))
    setRestoreName(prev => (prev === name ? null : prev))
    setUpdatingName(name)
    updateIdleStrikes.current = 0
    // Mirror the install flow's dshm-pending marker: closing the config page
    // unmounts this section and drops `updatingName`, so the running row's
    // progress was lost on reopen. The marker survives the unmount and lets a
    // reopen restore the row while the status poll converges the outcome.
    sessionStorage.setItem('dshm-updating', JSON.stringify({ name }))
    // The Tasks panel exists to answer "what is running right now", and an
    // update is one of the things that runs. `OperationKind` has carried
    // 'update' since the panel was written; only the enqueue was missing, so
    // "update all" left the panel empty while several plugins were mid-flight
    // (#295 by @sanyecao88). One record per attempt, like the install flow.
    const updateRecordId = nextRecordId()
    setRecords(list => enqueue(list, { id: updateRecordId, kind: 'update', name, state: 'running' }))
    return fetch(api('/dsh-market/update'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, ...(force ? { force: true } : {}), ...(restore ? { restore: true } : {}) }),
    })
      .then(res => res.json().then(body => ({ status: res.status, body })))
      .then(({ status, body }) => {
        // A response means the host settled the request (even a 4xx/5xx), so
        // the running row can hand back now. Only a lost response keeps the
        // marker + row for the poll to converge.
        sessionStorage.removeItem('dshm-updating')
        setUpdatingName(null)
        if (body.cancelled === true) {
          setRecords(list => drop(list, updateRecordId))
          refreshInstalled()
          if (body.partial === true) setInstallError(t('partialNote'))
          return
        }
        if (status === 200 && body.ok) {
          setRecords(list => patchRecord(list, updateRecordId, { state: 'done' }))
          setUpdatedNames(names => names.concat(name))
          if (body.activation && typeof body.activation === 'object') {
            setActivations(prev => ({ ...prev, ...body.activation }))
          }
          if (body.compatibility?.code === 'soft-incompatible') {
            setCompatibilityNotice(body.compatibility as CompatibilityNotice)
          }
          refreshInstalled()
        } else {
          if (status === 409) {
            if (body.agentsBusy === true) {
              const running = Array.isArray(body.runningAgents) && body.runningAgents.length > 0 ? ` (${body.runningAgents.join(', ')})` : ''
              setRecords(list => patchRecord(list, updateRecordId, { state: 'failed', reason: t('agentBusyUpdate') + running }))
              setInstallError(t('agentBusyUpdate') + running)
              return
            }
            setRecords(list => patchRecord(list, updateRecordId, { state: 'failed', reason: t('busyWait') }))
            setInstallError(t('busyWait'))
            return
          }
          if (body.stale === true) setStaleName(name)
          // Blocked build scripts during an update (#69): same
          // approve-and-retry banner as the install flow, retrying the update.
          if (Array.isArray(body.ignoredBuilds) && body.ignoredBuilds.length > 0) {
            setBuildsSkipped({ updateName: name, names: body.ignoredBuilds.map(String), restore })
          }
          const text = (v: unknown) => typeof v === 'string' ? v : (v && typeof (v as any).text === 'string') ? (v as any).text : v == null ? '' : JSON.stringify(v)
          const orphans = Array.isArray(body.orphanBundles) ? body.orphanBundles.map(String) : []
          const failure = text(body.error) || humanOutput([text(body.stderr), text(body.stdout)].filter(Boolean).join('\n')) || ('exit ' + body.exitCode)
          // The profile will not boot as it stands (#339). Said FIRST, because
          // it outranks whatever else went wrong: a plugin that failed to
          // install is recoverable, a profile that cannot start is not — and
          // the user would otherwise meet it as a Node stack trace after the
          // next restart, with nothing linking it to this operation.
          // A stale catalog entry (#346) is said before pnpm's own wording,
          // which for that failure reads like the user broke something.
          const staleEntry = typeof body.staleEntry === 'string' ? body.staleEntry : null
          const detail = [
            orphans.length > 0 ? `${t('orphanBundle')} ${orphans.join(', ')}` : null,
            staleEntry,
            failure,
          ].filter(Boolean).join('\n')
          setRecords(list => patchRecord(list, updateRecordId, { state: 'failed', reason: detail.trim().slice(-600) }))
          setInstallError((restore ? t('restoreFail') : t('updateFail')) + ': ' + name + ' — ' + detail.trim().slice(-600))
        }
      })
      .catch(() => {
        // A lost response does not mean the update stopped (the route holds
        // its reply until pnpm finishes, #100): keep the marker AND the
        // running row, and let the status poll converge the outcome instead
        // of declaring a false failure — mirroring the install flow's catch.
      })
  }, [refreshInstalled, t])

  const askRestore = useCallback((name: string) => {
    const spec = installed[name]
    const entry = data === null || spec === undefined
      ? undefined
      : entryForDep(data.plugins, name, String(spec), repoIdentities[name], repoHints[name])
    setStaleName(null)
    if (entry === undefined) {
      setRestoreName(null)
      setInstallError(t('restoreNoCatalog'))
      return
    }
    setRestoreName(name)
    setInstallError(t('restoreHint'))
  }, [data, installed, repoHints, repoIdentities, t])

  /** Open the update-notes dialog and start its fetch. Lazy: the request only
      exists while a user is actually looking at one plugin's notes, and
      closing the dialog abandons the render — the server side caches the
      payload, so reopening is cheap. */
  const openNotes = useCallback((name: string, current: string | null, latest: string | null, repoUrl: string | null) => {
    setNotesFor({ name, current, latest, repoUrl })
    setUpdateNotes(null)
    setNotesState('loading')
    fetch(`${api('/dsh-market/changelog')}?name=${encodeURIComponent(name)}`)
      .then(res => res.json())
      .then(body => { setUpdateNotes(body as ResolvedNotes); setNotesState('ready') })
      .catch(() => setNotesState('fail'))
  }, [])

  const doUseSkin = useCallback((name: string) => {    setInstallError(null)
    fetch(api('/dsh-market/use-skin'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    })
      .then(res => res.json().then(body => ({ status: res.status, body })))
      .then(({ status, body }) => {
        if (status === 200 && body.ok) {
          sessionStorage.setItem('dshm-toast', JSON.stringify([name]))
          sessionStorage.setItem('dshm-toast-mode', 'theme')
          sessionStorage.setItem('dshm-tab', 'themes')
          location.reload()
        } else {
          setInstallError(String(body.error || 'failed'))
        }
      })
      .catch(error => setInstallError(String(error)))
  }, [])

  /**
   * Forget a pending page-refresh for a plugin that is no longer here.
   *
   * The banner counts what the page has not caught up with. Install then
   * uninstall and the page is level again — there is nothing left to load —
   * but both sets were append-only, so it kept asking for a refresh that
   * would show nothing (#340). It conflated "something needs doing" with
   * "something happened in this session".
   */
  /** Write (or clear, when empty) this plugin's note. */
  const saveNote = useCallback((name: string, text: string) => {
    setNotingName(null)
    fetch(api('/dsh-market/note'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, text }),
    })
      .then(res => res.json())
      .then((body) => {
        if (body.ok && body.notes !== null && typeof body.notes === 'object') {
          setNotes(body.notes as Record<string, string>)
        } else setInstallError(String(body.error || 'note failed'))
      })
      .catch(error => setInstallError(String(error)))
  }, [])

  const clearPendingRefresh = useCallback((name: string) => {
    setHotNames(names => names.filter(entry => entry !== name))
    setRefreshNames(names => names.filter(entry => entry !== name))
  }, [])

  const doUninstall = useCallback((name: string) => {
    setRemoveConfirm(null)
    setInstallError(null)
    setActivationWarnings([])
    setRemovingName(name)
    return fetch(api('/dsh-market/uninstall'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    })
      .then(res => res.json().then(body => ({ status: res.status, body })))
      .then(({ status, body }) => {
        if (status === 200 && body.ok) {
          if (!body.hot) setRemovedCount(n => n + 1)
          // A client-part plugin stays injected until a page reload — the same
          // pending-refresh banner as enable/disable tells the user to reload,
          // instead of silently leaving the uninstalled plugin's UI running.
          //
          // But only when it was live in THIS page. A plugin installed during
          // this session was never injected: the banner was asking the user to
          // reload in order to GET it, so undoing the install nets to zero and
          // the banner must go (#340 — "it was reporting session history, not
          // pending work"). Being already pending is exactly what distinguishes
          // the two, and the server cannot see it: `refresh` says the package
          // HAD a client part, not that this page ever loaded it.
          const neverLoadedHere = hotNames.includes(name) || refreshNames.includes(name)
          if (body.refresh === true && !neverLoadedHere) {
            setRefreshNames(names => names.includes(name) ? names : names.concat(name))
          } else clearPendingRefresh(name)
          refreshInstalled()
        } else {
          if (body.cancelled === true) {
            refreshInstalled()
            if (body.partial === true) setInstallError(t('partialNote'))
            return
          }
          // Half-uninstall reconcile: the package is gone and the server has
          // already converged the manifest to disk truth. Refresh so the card
          // leaves the list instead of luring the user into a retry that
          // would 400 on "not installed"; the note separates the outcome
          // (removed, profile synced) from the process (pnpm errored).
          if (body.reconciled === true) {
            if (!body.hot) setRemovedCount(n => n + 1)
            clearPendingRefresh(name)
            refreshInstalled()
            setInstallError(t('reconciledNote'))
            return
          }
          const text = (v: unknown) => typeof v === 'string' ? v : (v && typeof (v as any).text === 'string') ? (v as any).text : v == null ? '' : JSON.stringify(v)
          setInstallError((text(body.error) || humanOutput(text(body.stderr)) || 'error').trim().slice(-600))
        }
      })
      .catch(error => setInstallError(String(error)))
      .finally(() => setRemovingName(null))
    // hotNames/refreshNames are read above to tell a plugin this page loaded
    // from one installed inside it, so they belong in the closure.
  }, [refreshInstalled, hotNames, refreshNames])

  /** Live enable/disable of one installed plugin (#60). `reload` opts the
   * card-level theme flow into a page refresh so the visual result lands
   * immediately (mirrors the use-skin reload on activate). */
  const doToggle = useCallback((name: string, enabled: boolean, reload = false) => {
    setTogglingName(name)
    setInstallError(null)
    return fetch(api('/dsh-market/toggle'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, enabled }),
    })
      .then(res => res.json().then(body => ({ status: res.status, body })))
      .then(({ status, body }) => {
        if (status === 200 && body.ok) {
          if (Array.isArray(body.disabled)) setDisabledNames(body.disabled)
          if (Array.isArray(body.live)) setSkins(body.live)
          if (body.activation && typeof body.activation === 'object') {
            setActivations(prev => ({ ...prev, ...body.activation }))
          }
          // A toggle whose fiber did not follow the switch joins the
          // pending-restart banner (same path as installs/updates/removals).
          if (body.restart === true) setToggleRestart(n => n + 1)
          // A client-part plugin's UI is already in the page — refresh to
          // show the change (mirrors the install hot banner).
          // Back to the position the page was rendered with means there is
          // nothing left for a refresh to show, so the banner drops it
          // instead of counting the round trip as a pending change (#340).
          if (body.refresh === true) {
            const wasDisabled = loadedDisabled.current?.has(name) ?? false
            if (wasDisabled === !enabled) clearPendingRefresh(name)
            else setRefreshNames(names => names.includes(name) ? names : names.concat(name))
          }
          // Not on the reload path: the page is about to go away, and the
          // theme flow lands its own toast on the other side.
          if (!reload) setToggled({ name, enabled })
          refreshInstalled()
          if (reload) {
            // Land back in the Themes tab with the stock look on screen.
            // Drop a stale install/switch toast so it cannot resurrect.
            sessionStorage.removeItem('dshm-toast')
            sessionStorage.removeItem('dshm-toast-mode')
            sessionStorage.setItem('dshm-tab', 'themes')
            location.reload()
          }
        } else {
          const text = (v: unknown) => typeof v === 'string' ? v : v == null ? '' : JSON.stringify(v)
          // The server's bilingual reason (e.g. host cannot hot-mount —
          // restart required) beats the generic failure line.
          setInstallError(text(body.reason) || text(body.error) || t('toggleFail'))
          // The durable state (state.json + patch layer) was still written,
          // so a restart applies it even though the live drive failed.
          if (body.restart === true) setToggleRestart(n => n + 1)
          if (body.refresh === true) setRefreshNames(names => names.includes(name) ? names : names.concat(name))
        }
      })
      .catch(error => setInstallError(String(error)))
      .finally(() => setTogglingName(null))
  }, [clearPendingRefresh, refreshInstalled, t])

  /** Adopt the groups payload returned by POST /dsh-market/groups. */
  const setGroupPayload = useCallback((body: {
    groups?: Record<string, string[]>
    groupOrder?: string[]
    disabled?: string[]
  }) => {
    if (body.groups && typeof body.groups === 'object') setGroups(body.groups)
    if (Array.isArray(body.groupOrder)) setGroupOrder(body.groupOrder)
    if (Array.isArray(body.disabled)) setDisabledNames(body.disabled)
  }, [])

  /** One POST /dsh-market/groups round trip (create/rename/delete/members/toggle). */
  const doGroupAction = useCallback((payload: Record<string, unknown>): Promise<boolean> => {
    setInstallError(null)
    return fetch(api('/dsh-market/groups'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => res.json().then(body => ({ status: res.status, body })))
      .then(({ status, body }) => {
        if (status === 200 && body.ok) {
          setGroupPayload(body)
          // Batch toggles whose members did not follow the switch join the
          // pending-restart banner too.
          if (Array.isArray(body.restartMembers) && body.restartMembers.length > 0) {
            setToggleRestart(n => n + body.restartMembers.length)
          }
          if (Array.isArray(body.refreshMembers) && body.refreshMembers.length > 0) {
            setRefreshNames(names => [...new Set([...names, ...body.refreshMembers])])
          }
          refreshInstalled()
          return true
        }
        const text = (v: unknown) => typeof v === 'string' ? v : v == null ? '' : JSON.stringify(v)
        setInstallError(text(body.error) || t('toggleFail'))
        if (Array.isArray(body.restartMembers) && body.restartMembers.length > 0) {
          setToggleRestart(n => n + body.restartMembers.length)
        }
        if (Array.isArray(body.refreshMembers) && body.refreshMembers.length > 0) {
          setRefreshNames(names => [...new Set([...names, ...body.refreshMembers])])
        }
        return false
      })
      .catch(error => { setInstallError(String(error)); return false })
  }, [refreshInstalled, setGroupPayload, t])

  /** Approve the build scripts pnpm refused, then rerun what was blocked. */
  const approveAndRetry = useCallback((
    names: string[],
    resume: () => void,
  ) => {
    fetch(api('/dsh-market/approve-builds'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ packages: names }),
    })
      .then(res => res.json())
      .then((body) => {
        if (!body.ok) setInstallError(String(body.error || 'approve failed'))
        else resume()
      })
      .catch(error => setInstallError(String(error)))
  }, [])

  const doGroupToggle = useCallback((name: string, enabled: boolean) => {
    return doGroupAction({ action: 'toggle', name, enabled })
  }, [doGroupAction])

  const doCreateGroup = useCallback(() => {
    const name = newGroupName.trim()
    if (name === '') return
    void doGroupAction({ action: 'create', name }).then(ok => {
      if (ok) {
        setCreatingGroup(false)
        setNewGroupName('')
      }
    })
  }, [doGroupAction, newGroupName])

  const doRenameGroup = useCallback((name: string) => {
    const newName = renamingValue.trim()
    if (newName === '' || newName === name) {
      setRenamingGroup(null)
      return
    }
    void doGroupAction({ action: 'rename', name, newName }).then(ok => {
      if (ok) {
        setRenamingGroup(null)
        setRenamingValue('')
      }
    })
  }, [doGroupAction, renamingValue])

  const doDeleteGroup = useCallback((name: string) => {
    void doGroupAction({ action: 'delete', name }).then(ok => {
      if (ok) setDeletingGroup(null)
    })
  }, [doGroupAction])

  const doAssign = useCallback((name: string) => {
    const group = assignTarget
    if (group === '') return
    const members = groups[group] ?? []
    void doGroupAction({ action: 'set-members', name: group, members: [...members, name] }).then(ok => {
      if (ok) {
        setAssignFor(null)
        setAssignTarget('')
      }
    })
  }, [assignTarget, doGroupAction, groups])

  const doRemoveMember = useCallback((group: string, name: string) => {
    const members = (groups[group] ?? []).filter(member => member !== name)
    void doGroupAction({ action: 'set-members', name: group, members })
  }, [doGroupAction, groups])

  /** Add one installed plugin to a group (picker stays open for batch adds). */
  const doAddMember = useCallback((group: string, name: string) => {
    const members = groups[group] ?? []
    void doGroupAction({ action: 'set-members', name: group, members: [...members, name] })
  }, [doGroupAction, groups])

  // The market itself stays out of the batch: its update reloads this page
  // mid-run, which would strand the remaining items.
  const selfName = installed['dshmarket'] !== undefined ? 'dshmarket' : 'dsh-market'
  const updatableNames = Object.keys(installed).filter(
    name => name !== selfName && !updatedNames.includes(name) && updates[name] && updates[name].updateAvailable,
  )
  // Replacing a local source with its catalog source is deliberately not a
  // batch update: every such plugin has an existing, explicit confirmation
  // gate because the source switch cannot be rolled back.
  const batchUpdatableNames = updatableNames.filter(name => updates[name]?.restoreRequired !== true)
  const ignoredUpdateSet = useMemo(() => new Set(ignoredUpdateNames), [ignoredUpdateNames])
  const reminderUpdatableNames = updatableNames.filter(name => !ignoredUpdateSet.has(name))
  const reminderBatchUpdatableNames = batchUpdatableNames.filter(name => !ignoredUpdateSet.has(name))
  const selfUpdateAvailable = updates[selfName]?.updateAvailable === true && !updatedNames.includes(selfName)
  const reminderUpdateNames = [
    ...(selfUpdateAvailable ? [selfName] : []),
    ...updatableNames,
  ].filter(name => !ignoredUpdateSet.has(name))
  // The market manages itself from its own settings card (Settings → Plugins
  // → Plugin configuration), not as a row here — listing it in both places
  // read as two different controls for the same thing.
  const installedOtherCount = Object.keys(installed).filter(name => name !== selfName).length

  const ignoreUpdateNotices = useCallback((names: string[]) => {
    if (bootId === null || names.length === 0) return
    setIgnoredUpdateNames(current => {
      const next = [...new Set([...current, ...names])]
      try {
        sessionStorage.setItem(IGNORED_UPDATES_SESSION_KEY, JSON.stringify({ boot: bootId, names: next }))
      } catch { /* storage unavailable: keep the dismissal for this mount */ }
      return next
    })
  }, [bootId])

  const doUpdateAll = useCallback(() => {
    const names = reminderBatchUpdatableNames.slice()
    setUpdatingAll(true)
    const next = () => {
      const name = names.shift()
      if (name === undefined) {
        setUpdatingAll(false)
        return
      }
      doUpdate(name).then(next, next)
    }
    next()
  }, [reminderBatchUpdatableNames, doUpdate])

  const finishRestore = useCallback((body: { errors?: unknown; unportable?: unknown; bootErrors?: unknown }) => {
    const errors = Array.isArray(body.errors) ? body.errors as { name?: unknown; error?: unknown }[] : []
    // Machine-specific dependency paths (#205): a `link:/Users/…` spec from
    // the machine that wrote the backup names a directory that does not
    // exist here, so pnpm cannot satisfy it. Listed with the other restore
    // problems rather than in a banner of its own — from the operator's
    // side it is one question ("what went wrong with my restore?").
    const unportable = Array.isArray(body.unportable) ? body.unportable as { name?: unknown; spec?: unknown }[] : []
    // Partial failures surface inline in the Backup tab (previously a
    // window.alert); the restore itself still completes.
    // What the profile analysis says about the composition that just landed
    // (#205). The restore itself succeeded; these are the packages the
    // composition still needs, which otherwise surfaced only at the NEXT
    // boot, as a Loader error with nothing tying it back to the restore.
    const bootErrors = Array.isArray(body.bootErrors) ? body.bootErrors.map(String) : []
    setRestoreErrors([
      ...errors.map(item => `${String(item.name)}: ${String(item.error)}`),
      ...unportable.map(item => `${String(item.name)}: ${t('restoreUnportable')} (${String(item.spec)})`),
      ...bootErrors.map(line => `${t('restoreBootError')} ${line}`),
    ])
    setBackupRestored(true)
    setBackupMessage(t('restoreDone'))
    if (errors.length === 0) {
      setPendingBackup(null)
      setPendingDependencies({})
    }
    refreshInstalled(true)
  }, [refreshInstalled, t])

  const previewBackup = useCallback((backup: unknown) => {
    const dependencies = backupDependencies(backup)
    setPendingBackup(backup)
    setPendingDependencies(dependencies)
    setBackupMessage(t('restorePreviewDone'))
    setRestoreErrors([])
    setTab('installed')
  }, [t])

  /** Actually run the restore; the confirm dialog gates this (previously window.confirm). */
  const doRestore = useCallback(() => {
    if (pendingBackup === null) return Promise.resolve()
    setRestoreConfirmOpen(false)
    setBackupBusy(true)
    setBackupMessage(null)
    setRestoreErrors([])
    return fetch(api('/dsh-market/restore'), {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ backup: pendingBackup }),
    }).then(async response => {
      const body = await response.json()
      if (!response.ok) throw new Error(String(body.error || 'restore failed'))
      finishRestore(body)
    }).catch(error => setBackupMessage(String(error))).finally(() => setBackupBusy(false))
  }, [finishRestore, pendingBackup])

  const runWebdav = useCallback((action: 'backup' | 'restore') => {
    if (webdavUrl.trim() === '') return
    setBackupBusy(true)
    setBackupMessage(null)
    setRestoreErrors([])
    fetch(api('/dsh-market/webdav'), {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, url: webdavUrl.trim(), username: webdavUser, password: webdavPassword }),
    }).then(async response => {
      const body = await response.json()
      if (!response.ok) throw new Error(String(body.error || 'WebDAV failed'))
      if (action === 'restore') {
        previewBackup(body.backup)
      }
      if (action === 'backup') {
        try { localStorage.setItem('dshm-webdav-last', String(Date.now())) } catch { /* storage unavailable */ }
        setBackupMessage(t('backupDone'))
      }
    }).catch(error => setBackupMessage(String(error))).finally(() => setBackupBusy(false))
  }, [previewBackup, t, webdavPassword, webdavUrl, webdavUser])

  /** Map the server's token-source string to a localized label. */
  const gistSourceLabel = (source: string): string => {
    if (source === 'token') return t('gistSrcToken')
    if (source === 'env') return t('gistSrcEnv')
    if (source === 'gh') return t('gistSrcGh')
    return source
  }

  /** Turn any failure (server error, network error, timeout) into a friendly message. */
  const gistErrorMessage = (error: unknown): string => {
    const err = error as { name?: unknown; code?: unknown }
    const name = typeof err?.name === 'string' ? err.name : ''
    const code = typeof err?.code === 'string' ? err.code : ''
    if (code === 'timeout' || name === 'TimeoutError' || name === 'AbortError') return t('gistErrTimeout')
    if (code === 'network') return t('gistErrNetwork')
    if (code === 'auth') return t('gistErrAuth')
    if (code === 'notfound') return t('gistErrNotFound')
    if (code === 'rate-limit') return t('gistErrRateLimit')
    if (code === 'invalid') return t('gistErrInvalid')
    // Network-level fetch failures surface as TypeError("Failed to fetch").
    if (error instanceof TypeError) return t('gistErrNetwork')
    return String(error)
  }

  const runGist = useCallback((action: 'export' | 'import' | 'verify') => {
    setGistBusy(true)
    setGistMessage(null)
    setGistOk(false)
    setGistResult(null)
    setRestoreErrors([])
    setExportError(null)
    const body: Record<string, unknown> = { action, token: gistToken.trim() }
    // Import always targets the field; export targets it only in update mode
    // (create mode deliberately ignores the field and makes a new Gist).
    if (action === 'import') body.gistId = gistId.trim()
    if (action === 'export' && gistMode === 'update') {
      if (gistId.trim() === '') {
        setGistBusy(false)
        setGistMessage(t('gistErrNoId'))
        setGistOk(false)
        return
      }
      body.gistId = gistId.trim()
    }
    if (action === 'export') {
      // All plugins selected → full backup (with config); partial → only
      // the checked plugins, config optional via the picker flag.
      const allNames = new Set([...Object.keys(installed), ...installedBundles])
      const allSelected = exportSelection.size === allNames.size && exportSelection.size > 0
      if (!allSelected) {
        body.includeDeps = [...exportSelection]
        if (exportIncludeConfig) body.includeConfig = true
      }
    }
    fetch(api('/dsh-market/gist'), {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      // Fallback ceiling only — the server answers structured errors (with a
      // code) within 25 s, so a wedged host cannot leave the user staring at
      // "working…" forever.
      signal: AbortSignal.timeout(30_000),
    }).then(async response => {
      let body: Record<string, unknown> = {}
      try { body = await response.json() as Record<string, unknown> } catch { /* non-JSON response */ }
      if (!response.ok) {
        const error = new Error(String(body.error || 'Gist failed'))
        if (typeof body.code === 'string') (error as { code?: string }).code = body.code
        throw error
      }
      if (action === 'export') {
        setGistResult(body as unknown as GistExportResult)
        // Backfill the id so the next export updates this Gist instead of
        // creating yet another one.
        const ref = body as unknown as GistExportResult
        if (typeof ref.gistId === 'string' && ref.gistId !== '') {
          setGistId(ref.gistId)
          // A fresh export flips the mode to update so the next export
          // PATCHes the same Gist instead of creating yet another one.
          setGistMode('update')
          try { localStorage.setItem('dshm-gist-id', ref.gistId) } catch { /* storage unavailable */ }
        }
        setGistMessage(t('gistExportDone'))
        setGistOk(true)
        setExportOpen(false)
      } else if (action === 'import') {
        previewBackup(body.backup)
      } else {
        // verify: tell the user which token source actually served the request.
        const source = typeof body.source === 'string' ? body.source : ''
        setGistMessage(t('gistVerifySource').replace('{0}', gistSourceLabel(source)))
        setGistOk(true)
      }
    }).catch(error => {
      const message = gistErrorMessage(error)
      setGistMessage(message)
      setGistOk(false)
      // Keep the picker open (selection preserved) and show the failure
      // inside it — never hidden behind the dialog.
      if (action === 'export') setExportError(message)
    }).finally(() => setGistBusy(false))
  }, [exportIncludeConfig, exportSelection, gistId, gistToken, installed, installedBundles, previewBackup, t])

  /** The picker list: dependency plugins + bundle-only plugins, deduplicated. */
  const exportOptions = useMemo(() => {
    const names = new Set([...Object.keys(installed), ...installedBundles])
    return [...names].sort()
  }, [installed, installedBundles])

  /** Classify an install spec for the export picker badge. */
  const specKind = (spec: string | undefined): 'npm' | 'git' | 'file' | 'bundle' => {
    if (spec === undefined) return 'bundle'
    if (/^file:/i.test(spec)) return 'file'
    if (/^(github:|git\+|git:)/i.test(spec)) return 'git'
    return 'npm'
  }

  const openExportPicker = useCallback(() => {
    const names = new Set([...Object.keys(installed), ...installedBundles])
    setExportSelection(new Set(names))
    setExportIncludeConfig(false)
    setExportOpen(true)
  }, [installed, installedBundles])

  useEffect(() => {
    // Persist only the non-secret WebDAV settings; the password stays
    // server-side/in-memory (see savedWebdav). Storage itself may be
    // unavailable (e.g. the client test env), so never let it crash the UI.
    try {
      localStorage.setItem(WEBDAV_STORAGE_KEY, JSON.stringify({ url: webdavUrl, username: webdavUser, auto: autoBackup }))
    } catch { /* storage unavailable — config just won't survive reload */ }
    if (!autoBackup || webdavUrl.trim() === '') return
    let last = 0
    try {
      last = Number(localStorage.getItem('dshm-webdav-last')) || 0
    } catch { /* ignore */ }
    if (Date.now() - last >= 24 * 60 * 60 * 1000) runWebdav('backup')
  }, [autoBackup, runWebdav, webdavUrl, webdavUser])

  const sessionPendingRestart = doneUrls.length + updatedNames.length + removedCount + toggleRestart + (backupRestored ? 1 : 0)
  /**
   * Plugins the HOST reports as restart-pending, independent of what this
   * browser session happens to remember. Installing and then reloading the
   * page used to leave no restart affordance at all: the banner is built
   * from session state, while the Installed tab only says "activates on
   * restart" in passing — so the user was told a restart was needed and
   * given nothing to press. Dismissible, because a standing banner nobody
   * wants to act on right now is just noise (it returns next session, or
   * as soon as another change lands).
   */
  const hostPendingNames = Object.keys(activations).filter(name => activations[name]?.state === 'restart')
  const showHostPending = hostPendingNames.length > 0 && !restartNoticeDismissed && sessionPendingRestart === 0
  const pendingRestart = sessionPendingRestart > 0 ? sessionPendingRestart : (showHostPending ? hostPendingNames.length : 0)
  const displayedInstalled = pendingBackup === null ? installed : { ...pendingDependencies, ...installed }
  const missingRestoreCount = Object.keys(pendingDependencies).filter(name => !installedFiles.includes(name)).length
  // Self-update lives in the header button and the settings card, not this
  // tab's row list (the market itself is filtered out below) — so a pending
  // self-update alone must not light up a dot pointing at an empty-looking tab.
  const hasUpdates = reminderUpdatableNames.length > 0

  /** Live status line: structured phase, or the human-line fallback. */
  const phasePart = progressPhase != null
    ? phaseLabel(progressPhase, t)
      + (progressCurrent !== null ? ' · ' + progressCurrent : '')
      + (progressDone > 0 ? ' · ' + t('packagesDone').replace('{0}', String(progressDone)) : '')
    : progressLine || t('progressHint')
  const progressText = cancelling ? t('cancelling') + ' · ' + phasePart : phasePart

  /** Whether the catalog carries ANY theme-category entry at all — distinct
   * from `themePlugins.length === 0` above (which also fires the instant a
   * search/sort/time filter matches nothing) so the two empty states read
   * differently: "there's nothing here yet" vs "nothing matches your filter". */
  const anyThemePlugins = data === null ? [] : themePluginsOf(data.plugins)

  /** The catalog entry a deprecated plugin's `replacement` names, if any. */
  const replacementOf = (p: RegistryPlugin): RegistryPlugin | undefined =>
    p.deprecated === true && p.replacement !== undefined
      ? data?.plugins.find(r => r.name === p.replacement)
      : undefined

  const pluginCard = (p: RegistryPlugin) => {
    const desc = (p.description && (p.description[lang] || p.description.en)) || ''
    const done = doneUrls.includes(p.url) || hotUrls.includes(p.url)
    const already = isInstalled(p, catalogInstalled, repoIdentities, data?.plugins, repoHints)
    const busy = busyUrl === p.url
    const replacement = replacementOf(p)
    // The card reflects its own latest operation. Without this a rejected
    // install leaves the card looking untouched, and pressing Install again
    // is the obvious next move — which is how the same clash gets hit twice.
    const record = recordForUrl(records, p.url)
    const blocked = record !== null && (record.state === 'input' || record.state === 'failed')
    return (
      <div key={p.url} className={blocked ? `${css.card} ${css.cardBlocked}` : css.card}>
        <div className={css.row1}>
          {/* The avatar belongs to the AUTHOR, not to the title. Beside the
              name it reads as one signature, which is what frees the title
              to be just the plugin — and lets two authors ship a plugin of
              the same name without either card needing a qualifier. */}
          <div style={{ minWidth: 0 }}>
            <a className={`${css.nm} ${css.nmLink}`} href={p.url} target="_blank" rel="noreferrer" title={p.name} aria-label={`${p.name} — ${t('repoLink')}`}>
              {pluginName(p.name)}
              <GithubRepoMark className={css.repoMark} />
              {p.deprecated === true && <span className={css.depBadge}>{t('deprecatedBadge')}</span>}
            </a>
            <div className={css.byline}>
              <OwnerAvatar name={p.name} owner={p.owner || ''} />
              <span className={css.owner} title={p.owner}>{p.owner}</span>
              {typeof p.downloads === 'number' && (
                <Tooltip label={String(p.downloads)} side="top">
                  <span className={css.star}>{'· ↓ ' + formatCount(p.downloads)}</span>
                </Tooltip>
              )}
              {typeof p.stars === 'number' && (
                <Tooltip label={String(p.stars)} side="top">
                  <span className={css.star}>{'· ★ ' + formatCount(p.stars)}</span>
                </Tooltip>
              )}
            </div>
          </div>
          {/* Top right, at its natural size: in the footer it needed a row of
              its own once the cards went two-up, which cost every card that
              height whether or not it had anything else to say. */}
          <span className={css.grow} />
          <div className={css.cardAction}>
            {done
              ? <span className={css.okState}>{t('installedBadge')}</span>
              : already
                ? <span className={css.okState}>{t('alreadyInstalled')}</span>
                : busy
                  ? <Button variant="primary" size="sm" className={css.installBtn} disabled>{t('installing')}</Button>
                  : blocked
                    ? (
                        <button type="button" className={css.cardBlockedMark} onClick={openOperations}>
                          <IconWarningOutline16 size={13} />
                          {t('opBlockedCard')}
                        </button>
                      )
                    : (
                        <Button
                          variant="primary"
                          size="sm"
                          className={css.installBtn}
                          disabled={busyUrl !== null || !envReady}
                          onClick={() => setConfirming(p)}
                        >{t('install')}</Button>
                      )}
          </div>
        </div>
        <CardDesc text={desc} t={t} />
        <CardShot plugin={p} onOpen={openLightbox} />
        {p.deprecated === true && (
          <div className={css.deprecate}>
            <div className={css.depLine}>
              <span>⚠️ {t('deprecatedWarn')}</span>
              {replacement !== undefined && (
                <a className={css.src} href={replacement.url} target="_blank" rel="noreferrer">
                  {t('replacementHint') + ' ' + replacement.name}
                </a>
              )}
            </div>
          </div>
        )}
        <div className={css.foot}>
          {pluginCategories(p).map(category => (
            <span key={category} className={css.tag}>
              {(data!.categories[category] && (data!.categories[category]![lang] || data!.categories[category]!.en)) || category}
            </span>
          ))}
          {/* Published date and a source link used to live here too — both
              redundant now that the title itself opens the repo, and the
              date/tag pair alone was long enough in English to wrap onto its
              own line, splitting one card's footer into two visual rows. */}
          <span className={css.grow} />
          {/* No comment count here. Showing one would mean asking giscus about
              every card on the page just to render a number, and a row of
              zeroes reads as "nobody uses these" on a catalog where almost
              nothing has been commented on yet. */}
          <button type="button" className={css.commentsLink} onClick={() => setCommentsFor(p)}>
            {t('comments')}
          </button>
        </div>
        {busy && (
          <div className={css.progress}>
            <span className={css.spin}><IconLoadingOutline16 size={14} /></span>
            <code className={css.grow}>{progressText}</code>
            {progressPct !== null && <span className={css.pct}>{progressPct}%</span>}
            <Button variant="outline" size="sm" disabled={cancelling} onClick={doCancel}>
              {cancelling ? t('cancelling') : t('cancelOp')}
            </Button>
            <div className={css.bar}>
              <div
                className={progressPct !== null ? css.barFill : `${css.barFill} ${css.barWave}`}
                style={progressPct !== null ? { width: `${progressPct}%` } : undefined}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  const installedNameOf = (p: RegistryPlugin) => matchInstalledName(p, installed, repoIdentities, data?.plugins, repoHints)

  // Plugins loaded at boot (bundle-layer skins) aren't in the shim list but
  // are just as live; the boot manifest is the page's own record of them.
  const bootEntries = (typeof window !== 'undefined' && window.__DSH_BOOT__ && Array.isArray(window.__DSH_BOOT__.entries))
    ? window.__DSH_BOOT__.entries
    : []

  // Theme-native card: visual preview first, then identity and lifecycle.
  // This deliberately does not reuse pluginCard; repository metadata is
  // useful context here, but it must not outrank the theme itself.
  const themePluginCard = (p: RegistryPlugin) => {
    const instName = installedNameOf(p)
    const desc = (p.description && (p.description[lang] || p.description.en)) || ''
    const replacement = replacementOf(p)
    const done = doneUrls.includes(p.url) || hotUrls.includes(p.url)
    const busy = busyUrl === p.url
    const record = recordForUrl(records, p.url)
    const blocked = record !== null && (record.state === 'input' || record.state === 'failed')
    // A theme switched off via the Installed-tab toggle (or a group switch)
    // stays in the boot manifest, so the disabled set must veto the badge.
    const mounted = instName !== null
      && (skins.includes(instName) || bootEntries.some(e => e.id === instName))
      && !effectiveDisabledSet.has(instName)

    return (
      <article key={p.url} className={blocked ? `${css.themeCard} ${css.cardBlocked}` : css.themeCard}>
        <ThemeCover plugin={p} onOpen={openLightbox} t={t} />
        <div className={css.themeCardBody}>
          <div className={css.themeCardHead}>
            <div className={css.themeIdentity}>
              <a className={`${css.nm} ${css.nmLink}`} href={p.url} target="_blank" rel="noreferrer" title={p.name} aria-label={`${p.name} — ${t('repoLink')}`}>
                {pluginName(p.name)}
                <GithubRepoMark className={css.repoMark} />
              </a>
              <div className={css.byline}>
                <OwnerAvatar name={p.name} owner={p.owner || ''} />
                <span className={css.owner} title={p.owner}>{p.owner}</span>
                {typeof p.downloads === 'number' && (
                  <Tooltip label={String(p.downloads)} side="top">
                    <span className={css.star}>{'· ↓ ' + formatCount(p.downloads)}</span>
                  </Tooltip>
                )}
                {typeof p.stars === 'number' && (
                  <Tooltip label={String(p.stars)} side="top">
                    <span className={css.star}>{'· ★ ' + formatCount(p.stars)}</span>
                  </Tooltip>
                )}
              </div>
            </div>
            {p.deprecated === true && <span className={css.depBadge}>{t('deprecatedBadge')}</span>}
            {mounted && <span className={css.themeStatus}>{t('themeActive')}</span>}
            {instName !== null && !mounted && (
              <span className={css.themeStatusMuted}>
                {effectiveDisabledSet.has(instName) ? t('disabledState') : t('alreadyInstalled')}
              </span>
            )}
          </div>

          <p className={css.themeDescription} title={desc}>{desc}</p>

          {p.deprecated === true && (
            <div className={css.deprecate}>
              <div className={css.depLine}>
                <span>⚠️ {t('deprecatedWarn')}</span>
                {replacement !== undefined && (
                  <a className={css.src} href={replacement.url} target="_blank" rel="noreferrer">
                    {t('replacementHint') + ' ' + replacement.name}
                  </a>
                )}
              </div>
            </div>
          )}

          <div className={css.themeCardFooter}>
            {instName === null && (
              <span className={css.themeLifecycle}>{done ? t('installedBadge') : t('notInstalled')}</span>
            )}
            <div className={css.themeActions}>
              {instName === null
                ? done
                  ? <span className={css.okState}>{t('installedBadge')}</span>
                  : busy
                    ? <Button variant="primary" size="sm" className={css.installBtn} disabled>{t('installing')}</Button>
                    : blocked
                      ? (
                          <button type="button" className={css.cardBlockedMark} onClick={openOperations}>
                            <IconWarningOutline16 size={13} />
                            {t('opBlockedCard')}
                          </button>
                        )
                      : (
                          <Button
                            variant="primary"
                            size="sm"
                            className={css.installBtn}
                            disabled={busyUrl !== null || !envReady}
                            onClick={() => setConfirming(p)}
                          >{t('install')}</Button>
                        )
                : (
                    <>
                      {removingName === instName
                        ? <Button variant="outline" size="sm" disabled>{t('uninstalling')}</Button>
                        : <Button variant="ghost" size="sm" onClick={() => setRemoveConfirm(instName)}>{t('uninstall')}</Button>}
                      {mounted
                        ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={togglingName !== null}
                              onClick={() => doToggle(instName, false, true)}
                            >{t('themeDeactivate')}</Button>
                          )
                        : <Button variant="primary" size="sm" onClick={() => doUseSkin(instName)}>{t('themeApply')}</Button>}
                    </>
                  )}
            </div>
          </div>

          {busy && (
            <div className={css.progress}>
              <span className={css.spin}><IconLoadingOutline16 size={14} /></span>
              <code className={css.grow}>{progressText}</code>
              {progressPct !== null && <span className={css.pct}>{progressPct}%</span>}
              <Button variant="outline" size="sm" disabled={cancelling} onClick={doCancel}>
                {cancelling ? t('cancelling') : t('cancelOp')}
              </Button>
              <div className={css.bar}>
                <div
                  className={progressPct !== null ? css.barFill : `${css.barFill} ${css.barWave}`}
                  style={progressPct !== null ? { width: `${progressPct}%` } : undefined}
                />
              </div>
            </div>
          )}
        </div>
      </article>
    )
  }

  const themeCard = (id: string, label: string, swatch: string[]) => {
    const active = themeSnap !== null && themeSnap.preference === id
    return (
      <div key={'th-' + id} className={css.card}>
        <div className={css.swatches}>{swatch.map((c, i) => <i key={i} style={{ background: c }} />)}</div>
        <div className={css.foot}>
          <span className={css.nm}>{label}</span>
          <span className={css.grow} />
          {active
            ? <span className={css.okState}>{t('themeActive')}</span>
            : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => { try { props.theme.setTheme(id) } catch (error) { setInstallError(String(error)) } }}
                >{t('themeApply')}</Button>
              )}
        </div>
      </div>
    )
  }

  const categories = data === null ? [] : Object.keys(data.categories)

  useLayoutEffect(() => { setVisibleCats(null); setVisibleCatsOneRow(null) }, [lang, categories.length])
  useLayoutEffect(() => {
    if (catsOpen || visibleCats !== null) return
    const el = catsWrapRef.current
    if (el === null) return
    const chips = [...el.children].filter((c): c is HTMLElement => (c as HTMLElement).dataset?.chip === '1')
    if (chips.length === 0) return
    const first = chips[0]!
    const rowThreeTop = first.offsetTop + (first.offsetHeight + 6) * 2 - 3
    let fits = 0
    for (const chip of chips) { if (chip.offsetTop < rowThreeTop) fits += 1 }
    // Reserve the tail slot of row two for the chevron itself.
    setVisibleCats(fits >= chips.length ? fits : Math.max(1, fits - 1))
    // Same measuring pass, one row's worth instead of two — used only while
    // the sticky header is pinned during scroll (#188-adjacent request), to
    // shrink an OPEN multi-row category list down to its first row without
    // touching the user's actual open/closed choice.
    const rowTwoTop = first.offsetTop + first.offsetHeight + 6 - 3
    let fitsOneRow = 0
    for (const chip of chips) { if (chip.offsetTop < rowTwoTop) fitsOneRow += 1 }
    setVisibleCatsOneRow(fitsOneRow >= chips.length ? fitsOneRow : Math.max(1, fitsOneRow - 1))
  }, [catsOpen, visibleCats, data])

  useEffect(() => {
    if (catsSentinel === null || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => {
        const leftView = entry !== undefined && !entry.isIntersecting
        // Collapsing shrinks the sticky header, which shrinks the scrollable
        // content. When there is barely more content than viewport, that
        // makes scrollHeight drop below the current scroll position, the
        // browser CLAMPS scrollTop, the sentinel slides back into view, and
        // the row expands again — which grows the content, restores the
        // scroll, and starts over. Reported as the category bar flapping and
        // the list refusing to scroll (#266 by @hidge123), and reproduced
        // here: a filtered list went scrollTop 78 → 0 and snapped straight
        // back from one row to four.
        //
        // The guard is not a tuning constant, it is the feature's own
        // precondition: collapsing exists to reclaim vertical space while
        // scrolling a LONG list. If the scroller has less overflow than the
        // category row could give back, collapsing buys nothing and can only
        // start the loop, so it does not happen. Long lists — the case this
        // was built for — are unaffected.
        const root = bodyRef.current
        const wrap = catsWrapRef.current
        if (leftView && root !== null && wrap !== null) {
          const overflow = root.scrollHeight - root.clientHeight
          if (overflow <= wrap.offsetHeight) return
        }
        setCatsStuck(leftView)
      },
      { root: bodyRef.current, threshold: 0 },
    )
    observer.observe(catsSentinel)
    return () => observer.disconnect()
  }, [catsSentinel])
  /**
   * Becoming stuck auto-collapses an open row — a REAL `catsOpen` flip, not
   * a display-only override. An earlier version faked this by computing a
   * separate "effectively open" value for rendering while leaving `catsOpen`
   * itself true; the chevron's own click handler only ever toggled the real
   * `catsOpen`, so while stuck it flipped a value the render path had
   * already stopped consulting — clicking "expand" did nothing visible
   * (reported: "吸顶滚动了之后，展开没反应了"). Driving the same state the
   * chevron drives means the chevron always works, stuck or not.
   */
  const catsAutoCollapsedRef = useRef(false)
  useLayoutEffect(() => {
    if (catsStuck) {
      if (catsOpen) { setCatsOpen(false); catsAutoCollapsedRef.current = true }
    } else if (catsAutoCollapsedRef.current) {
      setCatsOpen(true)
      catsAutoCollapsedRef.current = false
    }
  }, [catsStuck])

  /**
   * A fresh install (hotUrls/hotNames) and a toggle/group action
   * (refreshNames) both end in the same place — "reload the page" — and
   * used to render as two near-identical banners stacked on top of each
   * other when both happened in one session (reported as "为啥有三个状态横幅
   * 啊，太奇怪了"). They're merged into one count and one banner; only the
   * restart banner (a full host restart, a different action entirely) stays
   * separate.
   */
  const pendingRefreshNames = useMemo(
    () => [...new Set([...hotNames, ...refreshNames])],
    [hotNames, refreshNames],
  )

  /** Installed plugins the market itself cannot group (#60). */
  const groupableNames = Object.keys(installed).filter(name => name !== 'dsh-market' && name !== 'dshmarket')
  /** Names already inside some group; everything else shows under "ungrouped". */
  const groupedNames = useMemo(() => new Set(Object.values(groups).flat()), [groups])
  const ungroupedNames = groupableNames.filter(name => !groupedNames.has(name))
  /** Installed package names the catalog classifies as themes (client-side
   * mirror of the server's classification; themes are exclusive per group). */
  const installedThemeNames = useMemo(() => {
    const names = new Set<string>()
    if (data === null) return names
    for (const [name, spec] of Object.entries(installed)) {
      const entry = entryForDep(data.plugins, name, String(spec), repoIdentities[name], repoHints[name])
      if (entry !== undefined && pluginCategories(entry).includes('theme')) names.add(name)
    }
    return names
  }, [data, installed, repoIdentities, repoHints])

  return (
    <div
      className={css.root}
      data-dsh-market-root
      data-dsh-market-tab={tab}
      data-dsh-market-fullscreen={tab === 'themes' && themesFullscreen ? 'true' : undefined}
    >
      <div className={css.head}>
        <div className={css.titleRow}>
          <MarketLogo size={22} style={{ flexShrink: 0 }} />
          <h2 className={css.title}>{t('nav')}</h2>
          {/* A quiet pointer back to the project — most visitors reach the
              market through a client that embeds it, with no other way to
              find the repo it came from. */}
          <a className={css.repoLink} href="https://github.com/dsh-market/dsh-market" target="_blank" rel="noreferrer" title="dsh-market · GitHub">dsh-market</a>
          {version !== null && <span className={css.version} title={t('versionHint')}>v{version}</span>}
          {(() => {
            const self = installed['dshmarket'] !== undefined ? 'dshmarket' : 'dsh-market'
            const status = updates[self]
            return status && status.updateAvailable && !updatedNames.includes(self)
              && !ignoredUpdateSet.has(self)
              && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={updatingName !== null || busyUrl !== null}
                  onClick={() => {
                    setTab('installed')
                    if (status.restoreRequired === true) askRestore(self)
                    else doUpdate(self)
                  }}
                >{updatingName === self ? t('updating') : status.restoreRequired === true ? t('restoreOnline') : t('marketUpdate')}</Button>
              )
          })()}
          {reminderBatchUpdatableNames.length >= 2 && (
            <Button
              variant="primary"
              size="sm"
              disabled={updatingAll || updatingName !== null || busyUrl !== null || removingName !== null}
              onClick={() => { setTab('installed'); doUpdateAll() }}
            >{updatingAll ? t('updating') : t('updateAll') + ' (' + reminderBatchUpdatableNames.length + ')'}</Button>
          )}
          {bootId !== null && reminderUpdateNames.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => ignoreUpdateNotices(reminderUpdateNames)}
            >{t('ignoreAllUpdateNotices')}</Button>
          )}
        </div>
        <div className={css.sub}>
          <span>{t('subtitle')}</span>
          <a className={css.submitLink} href="https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md" target="_blank" rel="noreferrer">{t('submitPlugin')}</a>
          <span className={css.grow} />
          <Button
            variant="outline"
            size="sm"
            className={css.exportLogBtn}
            icon={<IconDownloadOutline16 size={14} />}
            disabled={exportState === 'busy'}
            onClick={doExportLog}
          >{exportState === 'busy' ? t('exportingLog') : t('exportLog')}</Button>
        </div>
        <div className={css.tabs}>
          <button className={tab === 'discover' ? `${css.tab} ${css.on}` : css.tab} onClick={() => setTab('discover')}>{t('tabDiscover')}</button>
          {themeSnap !== null && <button className={tab === 'themes' ? `${css.tab} ${css.on}` : css.tab} onClick={() => setTab('themes')}>{t('tabThemes')}</button>}
          <button className={tab === 'installed' ? `${css.tab} ${css.on}` : css.tab} onClick={() => { setTab('installed'); refreshInstalled(true) }}>
            {t('tabInstalled') + (installedOtherCount > 0 ? ' (' + installedOtherCount + ')' : '')}
            {hasUpdates && <StateDot state="error" size={7} className={css.dot} />}
          </button>
          <button
            className={(tab === 'backup' || tab === 'diagnostics') ? `${css.tab} ${css.on}` : css.tab}
            onClick={() => { if (tab !== 'backup' && tab !== 'diagnostics') setTab('backup') }}
          >{t('tabAdvanced')}</button>
          <span className={css.grow} />
          {/* In the tab row, not above the grid: paginating, searching and
              switching tab all leave it — and any pending decision — in place. */}
          <OperationsPanel
            t={t}
            describe={describePlugin}
            records={records}
            open={operationsOpen}
            onOpenChange={setOperationsOpen}
            replacing={replacing}
            envReady={envReady}
            onClearSettled={() => setRecords(list => clearSettled(list))}
            onCancel={() => doCancel()}
            onDismiss={record => setRecords(list => drop(list, record.id))}
            onRefresh={() => location.reload()}
            onResolveConflict={resolveConflict}
            onApproveBuilds={(record) => {
              const names = record.blockedBuilds ?? []
              if (names.length === 0) return
              setRecords(list => drop(list, record.id))
              const plugin = record.url === undefined ? undefined : data?.plugins.find(p => p.url === record.url)
              approveAndRetry(names, () => {
                if (plugin !== undefined) doInstall(plugin)
                else doUpdate(record.name, false, false)
              })
            }}
          />
        </div>
        {/* Backup & Restore and Diagnostics sit under Advanced rather than as
            their own top-level tabs — most users never need either, and having
            five peers up top buried the ones people actually reach for. */}
        {(tab === 'backup' || tab === 'diagnostics') && (
          <div className={css.subTabs}>
            <button className={tab === 'backup' ? `${css.tab} ${css.on}` : css.tab} onClick={() => setTab('backup')}>{t('tabBackup')}</button>
            <button className={tab === 'diagnostics' ? `${css.tab} ${css.on}` : css.tab} onClick={() => setTab('diagnostics')}>{t('tabDiagnostics')}</button>
            <span className={css.grow} />
          </div>
        )}
        {!envReady && (
          <div className={css.banner}>
            <IconCordisPluginOutline14 size={14} className={css.bannerIcon} />
            <span className={css.grow}>{envFailed ? t('envFixFail') : t('envMissing')}</span>
            {!envFailed && (
              <Button variant="primary" size="sm" disabled={envFixing} onClick={fixEnv}>
                {envFixing ? t('envFixing') : t('envFix')}
              </Button>
            )}
          </div>
        )}
        {backupMessage !== null && <div className={css.backupMessage}>{backupMessage}</div>}
        {restoreErrors.length > 0 && (
          <div className={css.banner}>
            <IconWarningOutline16 size={14} className={css.bannerIcon} />
            <span className={css.grow}>
              <div><b>{t('restorePartial')}</b></div>
              {restoreErrors.map(error => <div key={error} className={css.spec}>{error}</div>)}
            </span>
          </div>
        )}
        {tab === 'installed' && pendingBackup !== null && (
          <div className={css.banner}>
            <IconRefreshOutline14 size={14} className={css.bannerIcon} />
            <span className={css.grow}>{t('restoreMissing').replace('{0}', String(missingRestoreCount))}</span>
            <Button variant="primary" size="sm" disabled={backupBusy} onClick={() => setRestoreConfirmOpen(true)}>
              {backupBusy ? t('backupWorking') : t('restoreStart')}
            </Button>
          </div>
        )}
        {pendingRefreshNames.length > 0 && (
          <div className={css.banner}>
            <IconSparkle16 size={14} className={css.bannerIcon} />
            <span className={css.grow}><b>{pendingRefreshNames.length}</b> {t('refreshBanner')}</span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (hotNames.length > 0) sessionStorage.setItem('dshm-toast', JSON.stringify(hotNames))
                sessionStorage.setItem('dshm-tab', 'installed')
                location.reload()
              }}
            >{t('refresh')}</Button>
          </div>
        )}
        {pendingRestart > 0 && (
          <div className={css.banner}>
            <IconRefreshOutline14 size={14} className={css.bannerIcon} />
            <span className={css.grow}><b>{pendingRestart}</b> {t('restartBanner')}</span>
            <Tooltip
              label={
                debuggerLatch !== null
                  ? t('restartHintDebugged')
                  : supervisor === null
                    ? t('restartHint')
                    : t('restartHintSupervised').replace('{0}', supervisor)
              }
              side="bottom"
            >
              <span className={css.bannerHint}><IconQuestionOutline14 size={14} /></span>
            </Tooltip>
            {restartEnabled && debuggerLatch === null && (
              <Button
                variant="primary"
                size="sm"
                disabled={restarting || hostBusy || busyUrl !== null || updatingName !== null || removingName !== null}
                onClick={doRestart}
              >{restarting ? t('restarting') : t('restartNow')}</Button>
            )}
            {/* Only the standing host-reported notice is dismissible: a
                banner for something you just did in this session should not
                be swipeable away mid-flow. */}
            {showHostPending && (
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('dismissNotice')}
                onClick={() => {
                  setRestartNoticeDismissed(true)
                  try { sessionStorage.setItem('dshm-restart-dismissed', String(bootId ?? '')) } catch { /* storage unavailable */ }
                }}
              >{t('dismiss')}</Button>
            )}
          </div>
        )}
        {activationWarnings.length > 0 && (
          <div className={css.banner}>
            <IconWarningOutline16 size={14} className={css.bannerIcon} />
            <span className={css.grow}>
              {activationWarnings.map(({ name, info }) => (
                <div key={name}>
                  <b>{name}</b> — {activationMeta(info.state, t).label}
                  {info.reasons.length > 0 && <span className={css.spec}>（{info.reasons.join(' / ')}）</span>}
                </div>
              ))}
            </span>
          </div>
        )}
        {tab === 'installed' && <HostDependencyDiagnostics findings={hostDependencyFindings} t={t} />}
      </div>
      {buildsSkipped !== null && (
        <div className={css.banner}>
          <IconWarningOutline16 size={14} className={css.bannerIcon} />
          <span className={css.grow}>{t('buildsSkipped')} {buildsSkipped.names.join(', ')}</span>
          <Button
            size="sm"
            disabled={busyUrl !== null}
            onClick={() => {
              const { plugin, updateName, names, restore } = buildsSkipped
              setBuildsSkipped(null)
              approveAndRetry(names, () => {
                if (plugin !== undefined) doInstall(plugin)
                else if (updateName !== undefined) doUpdate(updateName, false, restore === true)
              })
            }}
          >{t('approveBuilds')}</Button>
        </div>
      )}
      {compatibilityNotice !== null && (
        <div className={css.banner}>
          <span className={css.grow}>
            {/* Two independent findings share one banner and one rollback,
                because they came from one operation. Each is named for what
                it actually is: a peer-version risk and a loader-name
                collision are not the same problem and must not read as one. */}
            {compatibilityNotice.risks.length > 0 && (
              <><b>{t(compatibilityNotice.rollbackId === undefined ? 'compatRiskBannerNoRollback' : 'compatRiskBanner')}</b> {compatibilitySummary(compatibilityNotice.risks)}</>
            )}
            {compatibilityNotice.shadowedNames !== undefined && compatibilityNotice.shadowedNames.length > 0 && (
              <>
                {compatibilityNotice.risks.length > 0 && ' · '}
                <b>{t('shadowNameBanner')}</b> {shadowSummary(compatibilityNotice.shadowedNames)}
              </>
            )}
            {compatibilityNotice.brokenBundles !== undefined && compatibilityNotice.brokenBundles.length > 0 && (
              <>
                {(compatibilityNotice.risks.length > 0
                  || (compatibilityNotice.shadowedNames?.length ?? 0) > 0) && ' · '}
                <b>{t('brokenBundleBanner')}</b>{' '}
                {compatibilityNotice.brokenBundles.map(entry => entry.name).join(', ')}
              </>
            )}
          </span>
          <Button variant="outline" size="sm" onClick={() => setTab('diagnostics')}>{t('goDiagnose')}</Button>
          {compatibilityNotice.rollbackId === undefined
            ? <span>{compatibilityNotice.rollbackUnavailable ?? t('rollbackUnavailable')}</span>
            : (
                <Button variant="primary" size="sm" disabled={rollingBack} onClick={() => void doRollback(compatibilityNotice.rollbackId!)}>
                  {rollingBack ? t('rollingBack') : t('rollbackNow')}
                </Button>
              )}
        </div>
      )}
      {installError !== null && (
        <div className={css.err}>
          {installError}
          <div className={css.staleAction}>
            {staleName !== null && (
              <Button size="sm" onClick={() => doUpdate(staleName, true)}>{t('updateNow')}</Button>
            )}
            {restoreName !== null && (
              <Button size="sm" onClick={() => doUpdate(restoreName, false, true)}>{t('restoreContinue')}</Button>
            )}
            {/* The banner text told users to export the log; now it IS the button (#84). */}
            <Button
              size="sm"
              variant="outline"
              icon={<IconDownloadOutline16 size={14} />}
              disabled={exportState === 'busy'}
              onClick={doExportLog}
            >
              {exportState === 'busy' ? t('exportingLog') : t('exportLog')}
            </Button>
          </div>
        </div>
      )}
      <div
        className={css.body}
        ref={bodyRef}
        onScroll={e => setShowTop(e.currentTarget.scrollTop > 400)}
      >
        {tab === 'backup'
          ? (
              <div className={css.backupGrid}>
                <section className={css.backupCard}>
                  <h3>{t('backupLocal')}</h3>
                  <p>{t('backupHint')}</p>
                  <p className={css.backupWarn}>{t('credsWarning')}</p>
                  <div className={css.backupActions}>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<IconDownloadOutline16 size={14} />}
                      disabled={backupBusy}
                      onClick={() => downloadFile(api('/dsh-market/backup'), 'dsh-profile-backup.json')}
                    >{backupBusy ? t('backupWorking') : t('backupDownload')}</Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<IconFolderOpen16 size={14} />}
                      disabled={backupBusy}
                      onClick={() => fileInputRef.current?.click()}
                    >{backupBusy ? t('backupWorking') : t('backupImport')}</Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/json,.json"
                      className={css.hiddenFile}
                      tabIndex={-1}
                      aria-hidden="true"
                      disabled={backupBusy}
                      onChange={event => {
                        const file = event.currentTarget.files?.[0]
                        event.currentTarget.value = ''
                        if (file !== undefined) file.text().then(text => previewBackup(JSON.parse(text))).catch(error => setBackupMessage(String(error)))
                      }}
                    />
                  </div>
                </section>
                <section className={css.backupCard}>
                  <h3>{t('webdav')}</h3>
                  <Menu
                    open={presetOpen}
                    onClose={() => setPresetOpen(false)}
                    onSelect={id => {
                      const urls: Record<string, string> = {
                        jianguoyun: 'https://dav.jianguoyun.com/dav/dsh-profile-backup.json',
                        koofr: 'https://app.koofr.net/dav/Koofr/dsh-profile-backup.json',
                        nextcloud: 'https://nextcloud.example/remote.php/dav/files/USERNAME/dsh-profile-backup.json',
                      }
                      if (urls[id] !== undefined) setWebdavUrl(urls[id]!)
                    }}
                    align="start"
                    anchor={(
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<IconChevronDownOutline14 size={14} />}
                        onClick={() => setPresetOpen(o => !o)}
                      >{t('webdavPreset')}</Button>
                    )}
                    items={[
                      { id: 'custom', label: t('webdavPreset') },
                      { id: 'jianguoyun', label: '坚果云 / Nutstore' },
                      { id: 'koofr', label: 'Koofr' },
                      { id: 'nextcloud', label: 'Nextcloud' },
                    ]}
                  />
                  <Input className={css.backupInput} icon={<IconLinkOutline14 size={14} />} type="url" value={webdavUrl} placeholder={t('webdavUrl')} onChange={e => setWebdavUrl(e.target.value)} />
                  <Input className={css.backupInput} autoComplete="username" value={webdavUser} placeholder={t('webdavUser')} onChange={e => setWebdavUser(e.target.value)} />
                  <Input className={css.backupInput} type="password" autoComplete="current-password" value={webdavPassword} placeholder={t('webdavPassword')} onChange={e => setWebdavPassword(e.target.value)} />
                  <div className={css.backupActions}>
                    <Button variant="primary" size="sm" disabled={backupBusy || webdavUrl.trim() === ''} onClick={() => runWebdav('backup')}>{backupBusy ? t('backupWorking') : t('webdavUpload')}</Button>
                    <Button variant="outline" size="sm" disabled={backupBusy || webdavUrl.trim() === ''} onClick={() => runWebdav('restore')}>{t('webdavRestore')}</Button>
                  </div>
                  <label className={css.backupCheck}><input type="checkbox" checked={autoBackup} onChange={e => setAutoBackup(e.target.checked)} />{t('autoBackup')}</label>
                  <p>{t('webdavNote')}</p>
                  <p className={css.backupWarn}>{t('credsWarning')}</p>
                </section>
                <section className={css.backupCard}>
                  <h3>{t('gist')}</h3>
                  <Input
                    className={css.backupInput}
                    type="password"
                    autoComplete="off"
                    value={gistToken}
                    placeholder={t('gistToken')}
                    onChange={e => setGistToken(e.target.value)}
                  />
                  <Input
                    className={css.backupInput}
                    icon={<IconLinkOutline14 size={14} />}
                    value={gistId}
                    placeholder={t('gistId')}
                    onChange={e => setGistId(e.target.value)}
                  />
                  <div className={css.backupActions}>
                    <label className={css.backupCheck}>
                      <input type="radio" name="gist-mode" checked={gistMode === 'update'} onChange={() => setGistMode('update')} />
                      {t('gistModeUpdate')}
                    </label>
                    <label className={css.backupCheck}>
                      <input type="radio" name="gist-mode" checked={gistMode === 'create'} onChange={() => setGistMode('create')} />
                      {t('gistModeCreate')}
                    </label>
                  </div>
                  <div className={css.backupActions}>
                    <Button variant="outline" size="sm" disabled={gistBusy} onClick={() => runGist('verify')}>{gistBusy ? t('backupWorking') : t('gistVerify')}</Button>
                    <Button variant="primary" size="sm" disabled={gistBusy || (gistMode === 'update' && gistId.trim() === '')} onClick={openExportPicker}>{gistBusy ? t('backupWorking') : t('gistExport')}</Button>
                    <Button variant="outline" size="sm" disabled={gistBusy || gistId.trim() === ''} onClick={() => runGist('import')}>{t('gistImport')}</Button>
                  </div>
                  {gistResult !== null && (
                    <p className={css.backupCheck}>
                      <span>{t('gistCreated')}</span>{' '}
                      <a className={css.src} href={gistResult.gistUrl} target="_blank" rel="noreferrer">{gistResult.gistUrl}</a>
                    </p>
                  )}
                  {gistMessage !== null && (
                    <div className={gistOk ? css.backupMessage : css.backupWarn}>{gistMessage}</div>
                  )}
                  <p>{t('gistNote')}</p>
                </section>
              </div>
            )
          : tab === 'discover'
          ? loadError !== null
            ? <div className={css.empty}>
                <div>{t('loadFail')}</div>
                <div className={css.err}>{loadError}</div>
                <Button variant="outline" size="sm" className={css.retryBtn} onClick={() => { void loadCatalog() }}>
                  {t('loadRetry')}
                </Button>
              </div>
            : data === null
              ? <div className={css.loading}><span className={css.logoMark}><MarketLogo size={26} animated /></span>{t('loading')}</div>
              : (
                  <>
                    <div ref={setCatsSentinel} />
                    <div className={css.stickyHead}>
                    <div className={css.tabSearchRow}>
                      <Input className={css.tabSearch} icon={<IconSearchOutline16 size={14} />} placeholder={t('searchPh')} value={q} onChange={e => setQ(e.target.value)} />
                    </div>
                    <div className={css.cats}>
                      <div className={css.catsRow}>
                      {/* The height cap belongs to the MEASURING pass only: that pass
                          renders every chip so their offsets can be counted, and
                          clipping hides the tall row from the user for the frame it
                          exists. Applying it while OPEN clipped the very rows the
                          user had just asked to see — with 20 categories, expanding
                          revealed two rows out of six and read as "nothing
                          happened". Collapsed after measuring needs no cap: the list
                          is already sliced to what fits. */}
                      <div ref={catsWrapRef} className={visibleCats === null ? `${css.catsWrap} ${css.catsCollapsed}` : css.catsWrap}>
                        {(() => {
                          // Collapsed, the selected category is pulled to the front so it never hides.
                          // Whenever collapsed (default, or auto-collapsed by the sticky
                          // header going stuck — see catsAutoCollapsedRef above), a stuck
                          // header uses the one-row budget instead of the two-row one so an
                          // already-open list that just got pinned shrinks further.
                          const budget = catsStuck ? visibleCatsOneRow : visibleCats
                          const ordered = orderedCategories(categories, cat, catsOpen, budget)
                          const shown = catsOpen || budget === null ? ordered : ordered.slice(0, Math.max(0, budget - 1))
                          return (
                            <>
                              <Pill data-chip="1" active={cat === 'all'} onClick={() => setCat('all')}>{t('all') + ' (' + formatCount(data!.count) + ')'}</Pill>
                              {shown.map(id => (
                                <Pill
                                  key={id}
                                  data-chip="1"
                                  active={cat === id}
                                  onClick={() => setCat(id)}
                                >{(data.categories[id] && (data.categories[id]![lang] || data.categories[id]!.en)) || id}</Pill>
                              ))}
                              <Button
                                variant="ghost"
                                size="sm"
                                className={css.catsToggle}
                                icon={catsOpen ? <IconChevronUpOutline14 size={14} /> : <IconChevronDownOutline14 size={14} />}
                                aria-label={catsOpen ? t('catsLess') : t('catsMore')}
                                onClick={() => {
                                  // An explicit click always wins — don't let the next
                                  // stuck/unstuck transition second-guess it.
                                  catsAutoCollapsedRef.current = false
                                  setCatsOpen(o => !o)
                                }}
                              />
                            </>
                          )
                        })()}
                      </div>
                      <FilterMenu
                        sortField={sortField}
                        sortDir={sortDir}
                        timeRange={timeRange}
                        onSortField={setSortField}
                        onSortDir={setSortDir}
                        onTimeRange={setTimeRange}
                        t={t}
                      />
                      </div>
                    </div>
                    </div>
                    {plugins.length === 0
                      ? <div className={css.empty}>{t('empty')}</div>
                      : (
                          <>
                            <Masonry items={pagePlugins} render={pluginCard} />
                            <Pager
                              currentPage={currentPage}
                              totalPages={totalPages}
                              pageSize={pageSize}
                              onGoToPage={goToPage}
                              onChangePageSize={changePageSize}
                              t={t}
                            />
                          </>
                        )}
                  </>
                )
          : tab === 'themes' && themeSnap !== null
            ? (
                <>
                  <div className={css.themeToolbar}>
                    <Input className={css.themeSearch} icon={<IconSearchOutline16 size={14} />} placeholder={t('searchPh')} value={qThemes} onChange={e => setQThemes(e.target.value)} />
                    <div className={css.themeToolbarActions}>
                      <FilterMenu
                        sortField={themeSortField}
                        sortDir={themeSortDir}
                        timeRange={themeTimeRange}
                        onSortField={setThemeSortField}
                        onSortDir={setThemeSortDir}
                        onTimeRange={setThemeTimeRange}
                        t={t}
                      />
                      <Tooltip label={themesFullscreen ? t('themeExitFullscreen') : t('themeFullscreen')} side="top">
                        <Button
                          variant="outline"
                          size="sm"
                          className={css.themeFullscreenBtn}
                          icon={<IconFullscreenOutline16 size={16} />}
                          aria-label={themesFullscreen ? t('themeExitFullscreen') : t('themeFullscreen')}
                          aria-pressed={themesFullscreen}
                          onClick={() => setThemesFullscreen(value => !value)}
                        />
                      </Tooltip>
                    </div>
                  </div>
                  {/* Light/dark/system live in the official Appearance setting; this
                    tab only shows what that setting can't: registered third-party
                    palettes (none in the wild yet) and installable theme plugins. */}
                  {(() => {
                    const extra = themeSnap.themes.filter(def => def.id !== 'light' && def.id !== 'dark')
                    return extra.length > 0 && (
                      <div className={`${css.grid} ${css.themesGrid}`}>
                        {extra.map(def => themeCard(def.id, def.id, themeSwatch(def)))}
                      </div>
                    )
                  })()}
                  {data === null
                    ? <div className={css.loading}><span className={css.logoMark}><MarketLogo size={26} animated /></span>{t('loading')}</div>
                    : anyThemePlugins.length === 0
                      ? <div className={css.empty}>{t('themeEmpty')}</div>
                      : themePlugins.length === 0
                        ? <div className={css.empty}>{t('empty')}</div>
                        : (
                            <>
                              <div className={css.themeResultBar}>
                                <span>{t('themeResultCount').replace('{0}', String(themePlugins.length))}</span>
                              </div>
                              <div className={css.themeGallery}>
                                {themePagePlugins.map(themePluginCard)}
                              </div>
                              <Pager
                                currentPage={themePagination.currentPage}
                                totalPages={themePagination.totalPages}
                                pageSize={themePagination.pageSize}
                                onGoToPage={themePagination.goToPage}
                                onChangePageSize={themePagination.changePageSize}
                                t={t}
                              />
                            </>
                          )}
                </>
              )
            : tab === 'diagnostics'
            ? <Diagnostics t={t} />
            : (
                <>
                  <div className={css.viewBar}>
                    <button type="button" className={installedView === 'list' ? `${css.viewBtn} ${css.viewOn}` : css.viewBtn} onClick={() => setInstalledView('list')}>{t('tabList')}</button>
                    <button type="button" className={installedView === 'groups' ? `${css.viewBtn} ${css.viewOn}` : css.viewBtn} onClick={() => setInstalledView('groups')}>{t('tabGroups')}</button>
                  </div>
                  <div className={css.tabSearchRow}>
                    <Input className={css.tabSearch} icon={<IconSearchOutline16 size={14} />} placeholder={t('searchPh')} value={qInstalled} onChange={e => setQInstalled(e.target.value)} />
                  </div>
                  {installedView === 'groups'
                      ? (
                          <>
                            <div className={css.groupCreate}>
                              {creatingGroup
                                ? (
                                    <>
                                      <Input className={css.inlineInput} placeholder={t('groupNamePh')} value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') doCreateGroup() }} autoFocus />
                                      <Button variant="primary" size="sm" onClick={doCreateGroup}>{t('groupCreate')}</Button>
                                      <Button variant="ghost" size="sm" onClick={() => { setCreatingGroup(false); setNewGroupName('') }}>{t('cancel')}</Button>
                                    </>
                                  )
                                : <Button variant="outline" size="sm" onClick={() => setCreatingGroup(true)}>{t('groupNew')}</Button>}
                            </div>
                            {groupOrder.length === 0
                              ? <div className={css.empty}>{t('noGroups')}</div>
                              : groupOrder.map(gid => {
                                  const members = groups[gid] ?? []
                                  const sw = groupSwitchState(members, effectiveDisabledSet)
                                  return (
                                    <div className={css.groupRow} key={gid}>
                                      <div className={css.groupHead}>
                                        <button
                                          type="button"
                                          role="switch"
                                          aria-checked={sw === 'on' ? true : sw === 'off' ? false : 'mixed'}
                                          aria-label={(sw !== 'on' ? t('enable') : t('disable')) + ' ' + gid}
                                          className={sw === 'on' ? `${css.switch} ${css.switchOn}` : sw === 'mixed' ? `${css.switch} ${css.switchMixed}` : css.switch}
                                          disabled={togglingName !== null || sw === 'empty'}
                                          onClick={() => doGroupToggle(gid, sw !== 'on')}
                                        >
                                          <span className={css.switchKnob} />
                                        </button>
                                        <span className={css.groupName}>{gid}</span>
                                        {sw === 'mixed' && <span className={css.groupHint}>{t('groupMixed')}</span>}
                                        <span className={css.grow} />
                                        <div className={css.groupActions}>
                                          {renamingGroup === gid
                                            ? (
                                                <>
                                                  <Input className={css.inlineInput} placeholder={t('groupNamePh')} value={renamingValue} onChange={e => setRenamingValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') doRenameGroup(gid) }} autoFocus />
                                                  <Button variant="primary" size="sm" onClick={() => doRenameGroup(gid)}>{t('groupRename')}</Button>
                                                  <Button variant="ghost" size="sm" onClick={() => { setRenamingGroup(null); setRenamingValue('') }}>{t('cancel')}</Button>
                                                </>
                                              )
                                            : <Button variant="ghost" size="sm" onClick={() => { setRenamingGroup(gid); setRenamingValue(gid) }}>{t('groupRename')}</Button>}
                                          {deletingGroup === gid
                                            ? <Button variant="primary" size="sm" className={css.dangerArmed} onClick={() => doDeleteGroup(gid)}>{t('groupConfirmDelete')}</Button>
                                            : <Button variant="outline" size="sm" className={css.dangerBtn} onClick={() => setDeletingGroup(gid)}>{t('groupDelete')}</Button>}
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setAddPanel(
                                              addPanel !== null && addPanel.group === gid && addPanel.kind === 'plugin'
                                                ? null
                                                : { group: gid, kind: 'plugin' },
                                            )}
                                          >{t('groupAdd')}</Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={members.some(member => installedThemeNames.has(member))}
                                            onClick={() => setAddPanel(
                                              addPanel !== null && addPanel.group === gid && addPanel.kind === 'theme'
                                                ? null
                                                : { group: gid, kind: 'theme' },
                                            )}
                                          >{t('groupAddTheme')}</Button>
                                        </div>
                                      </div>
                                      {addPanel !== null && addPanel.group === gid && (() => {
                                        const candidates = addPanel.kind === 'theme'
                                          ? [...installedThemeNames].filter(name => !members.includes(name))
                                          : groupableNames.filter(name => !members.includes(name) && !installedThemeNames.has(name))
                                        return (
                                          <div className={css.groupAddPanel}>
                                            {candidates.length === 0
                                              ? <div className={css.groupHint}>{t('groupAddEmpty')}</div>
                                              : candidates.map(name => (
                                                  <div className={css.groupMember} key={name}>
                                                    <span className={css.nm}>{name}</span>
                                                    {effectiveDisabledSet.has(name) && <span className={css.spec}>{t('disabledState')}</span>}
                                                    <span className={css.grow} />
                                                    <Button variant="outline" size="sm" onClick={() => doAddMember(gid, name)}>
                                                      {addPanel.kind === 'theme' ? t('groupAddTheme') : t('groupAdd')}
                                                    </Button>
                                                  </div>
                                                ))}
                                          </div>
                                        )
                                      })()}
                                      <div className={css.groupMembers}>
                                        {members.length === 0 && <div className={css.groupHint}>{t('groupEmpty')}</div>}
                                        {members.map(member => (
                                          <div className={css.groupMember} key={member}>
                                            <span className={css.nm}>{member}</span>
                                            {effectiveDisabledSet.has(member) && <span className={css.spec}>{t('disabledState')}</span>}
                                            <span className={css.grow} />
                                            <button
                                              type="button"
                                              role="switch"
                                              aria-checked={!effectiveDisabledSet.has(member)}
                                              aria-label={(effectiveDisabledSet.has(member) ? t('enable') : t('disable')) + ' ' + member}
                                              className={effectiveDisabledSet.has(member) ? css.switch : `${css.switch} ${css.switchOn}`}
                                              disabled={togglingName !== null}
                                              onClick={() => doToggle(member, effectiveDisabledSet.has(member))}
                                            >
                                              <span className={css.switchKnob} />
                                            </button>
                                            <Button variant="ghost" size="sm" onClick={() => doRemoveMember(gid, member)}>{t('groupRemove')}</Button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                })}
                            <div className={css.sect}>{t('ungrouped')}</div>
                            {ungroupedNames.length === 0
                              ? <div className={css.empty}>{t('installedEmpty')}</div>
                              : ungroupedNames.map(name => {
                                  const entry = data === null ? undefined : entryForDep(data.plugins, name, String(installed[name]), repoIdentities[name], repoHints[name])
                                  const off = effectiveDisabledSet.has(name)
                                  return (
                                    <div className={css.irow} key={'ug-' + name}>
                                      <div style={{ minWidth: 0 }}>
                                        <div className={css.nm}>
                                          {name}
                                          {entry?.deprecated === true && <span className={css.depBadge}>{t('deprecatedBadge')}</span>}
                                        </div>
                                        <div className={css.act}>
                                          {off
                                            ? <span className={css.actWarn}><StateDot state="warning" size={7} />{t('disabledState')}</span>
                                            : <span className={css.actLive}><StateDot state="done" size={7} />{t('stateLive')}</span>}
                                        </div>
                                      </div>
                                      <span className={css.grow} />
                                      {assignFor === name
                                        ? (
                                            <div className={css.assignRow}>
                                              <select className={css.assignSelect} value={assignTarget} onChange={e => setAssignTarget(e.target.value)}>
                                                <option value="">{t('groupNamePh')}</option>
                                                {groupOrder.map(gid => <option key={gid} value={gid}>{gid}</option>)}
                                              </select>
                                              <Button variant="primary" size="sm" disabled={assignTarget === ''} onClick={() => doAssign(name)}>{t('groupAssign')}</Button>
                                              <Button variant="ghost" size="sm" onClick={() => { setAssignFor(null); setAssignTarget('') }}>{t('cancel')}</Button>
                                            </div>
                                          )
                                        : <Button variant="outline" size="sm" disabled={groupOrder.length === 0} onClick={() => { setAssignFor(name); setAssignTarget('') }}>{t('groupAssign')}</Button>}
                                    </div>
                                  )
                                })}
                          </>
                        )
                      : Object.keys(displayedInstalled).filter(name => name !== selfName).length === 0
                        ? <div className={css.empty}>{t('installedEmpty')}</div>
                        : (
                          <Masonry
                            items={Object.entries(displayedInstalled)
                            .filter(([name, spec]) => {
                              // The market manages itself from its own settings
                              // card, not as a row in this list (#188-adjacent).
                              if (name === selfName) return false
                              const needle = qInstalled.trim().toLowerCase()
                              if (needle === '') return true
                              if (name.toLowerCase().includes(needle)) return true
                              if (String(spec).toLowerCase().includes(needle)) return true
                              const entry = data === null ? undefined : entryForDep(data.plugins, name, String(spec), repoIdentities[name], repoHints[name])
                              if (entry !== undefined) {
                                const desc = (entry.description && (entry.description[lang] || entry.description.en)) || ''
                                if (desc.toLowerCase().includes(needle)) return true
                                if ((entry.owner || '').toLowerCase().includes(needle)) return true
                              }
                              return false
                            })}
                            render={([name, spec]) => {
                            const missing = pendingBackup !== null && !installedFiles.includes(name)
                            const entry = data === null ? undefined : entryForDep(data.plugins, name, String(spec), repoIdentities[name], repoHints[name])
                            const status = updates[name]
                            const localDev = /^(?:link|file):/i.test(String(spec)) || status?.kind === 'linked'
                            const act = activations[name]
                            const meta = act !== undefined ? activationMeta(act.state, t) : null
                            const version = status && status.version ? 'v' + status.version : ''
                            const specText = String(spec)
                            // A plain range beside the resolved version says the
                            // same thing twice. Every other spec — github:, file:,
                            // link:, a tag — is the only place the row says where
                            // the plugin came from, so it stays.
                            const specRedundant = version !== '' && /^[\^~]?\d/.test(specText)
                            const ghSpec = /^github:([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:#|$)/.exec(specText)
                            const repoUrl = entry !== undefined ? entry.url : ghSpec !== null ? 'https://github.com/' + ghSpec[1] : null
                            const off = effectiveDisabledSet.has(name)
                            // Switches only where they make sense: everything in
                            // the disable list (to re-enable), plus live/restart
                            // states. inert/broken rows keep their diagnosis
                            // without a misleading toggle (#60).
                            const toggleable = off || (act !== undefined && (act.state === 'live' || act.state === 'restart'))
                            return (
                              <div key={name} className={missing ? `${css.irow} ${css.irowMissing}` : css.irow}>
                                <div style={{ minWidth: 0 }}>
                                  {/* Row-scoped, NOT `.nm` alone: `.nm` clips with
                                      overflow+ellipsis as one block, so with the name and
                                      the version as inline siblings the ellipsis landed at
                                      the end of the LINE and ate the version — a long
                                      scoped package name hid the one fact this row exists
                                      to state (#257 by @HualuozhE). Laying the row out as
                                      flex lets the name be the only thing that truncates.
                                      `.nm` is shared by six other places (discover titles,
                                      group rows, theme cards); changing it there would
                                      reflow all of them. */}
                                  <div className={`${css.nm} ${css.irowName}`}>
                                    {/* The name is the link to the README. A separate button
                                        beside it pointed at the same page. */}
                                    <span className={css.irowNameText}>
                                      {repoUrl !== null
                                        ? <a className={css.nameLink} href={repoUrl + '#readme'} target="_blank" rel="noreferrer" title={name} aria-label={`${name} — ${t('readme')}`}>{name}</a>
                                        : name}
                                    </span>
                                    {entry?.deprecated === true && <span className={css.depBadge}>{t('deprecatedBadge')}</span>}
                                    {version && <span className={css.owner} title={version}>{version}</span>}
                                  </div>
                                  {specRedundant
                                    ? null
                                    : repoUrl !== null
                                      ? <a className={`${css.spec} ${css.src}`} href={repoUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block' }}>{specText}</a>
                                      : <div className={css.spec}>{specText}</div>}
                                  {/* The user's own note REPLACES the author's
                                      description (#347): a catalog blurb answers
                                      "what is this", written for strangers and
                                      often not in the reader's language, and
                                      cannot answer "why did I install this" —
                                      which is what someone with forty plugins
                                      is asking. The original stays one click
                                      away rather than being lost. */}
                                  {notingName === name
                                    ? (
                                        <div className={css.noteEdit}>
                                          <Input
                                            className={css.noteInput}
                                            value={noteDraft}
                                            maxLength={200}
                                            autoFocus
                                            placeholder={t('notePlaceholder')}
                                            onChange={e => setNoteDraft(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') saveNote(name, noteDraft)
                                              if (e.key === 'Escape') setNotingName(null)
                                            }}
                                          />
                                          <Button variant="outline" size="sm" onClick={() => saveNote(name, noteDraft)}>{t('noteSave')}</Button>
                                          <Button variant="ghost" size="sm" onClick={() => setNotingName(null)}>{t('cancel')}</Button>
                                        </div>
                                      )
                                    : (() => {
                                        const note = notes[name]
                                        const authored = (entry?.description && (entry.description[lang] || entry.description.en)) || ''
                                        const theirs = showTheirs.includes(name)
                                        const shown = note !== undefined && !theirs ? note : authored
                                        if (shown === '' && note === undefined) return null
                                        return (
                                          <div className={`${css.desc} ${css.descTight} ${css.noteRow}`}>
                                            <span className={note !== undefined && !theirs ? css.noteMine : undefined}>{shown}</span>
                                            {note !== undefined && authored !== '' && (
                                              <button
                                                type="button"
                                                className={css.noteToggle}
                                                title={theirs ? t('noteSeeMine') : t('noteSeeTheirs')}
                                                aria-label={theirs ? t('noteSeeMine') : t('noteSeeTheirs')}
                                                onClick={() => setShowTheirs(list => theirs ? list.filter(n => n !== name) : list.concat(name))}
                                              >{theirs ? t('noteMine') : t('noteTheirs')}</button>
                                            )}
                                            <button
                                              type="button"
                                              className={`${css.noteToggle} ${css.noteAction}`}
                                              title={note === undefined ? t('noteAdd') : t('noteEdit')}
                                              aria-label={note === undefined ? t('noteAdd') : t('noteEdit')}
                                              onClick={() => { setNoteDraft(note ?? ''); setNotingName(name) }}
                                            >{note === undefined ? t('noteAdd') : t('noteEdit')}</button>
                                          </div>
                                        )
                                      })()}
                                  {/* Update-notes entry (#294). Only a row with an
                                      update pending renders it — a plugin that is
                                      up to date has nothing to preview — and it is
                                      one quiet line in the flow the row already
                                      reserves for conditional content, so rows
                                      without it are pixel-identical to before. */}
                                  {status !== undefined && status.updateAvailable && (
                                    <div className={css.noteRow}>
                                      <button
                                        type="button"
                                        className={css.notesLink}
                                        onClick={() => openNotes(name, status.current ?? null, status.latest ?? null, repoUrl)}
                                      >{`▸ ${t('notesLink')}`}</button>
                                      {bootId !== null && (
                                        ignoredUpdateSet.has(name)
                                          ? <span className={css.metaInline}>{t('updateNoticeIgnored')}</span>
                                          : (
                                              <button
                                                type="button"
                                                className={css.noteToggle}
                                                aria-label={`${t('ignoreUpdateNotice')} ${name}`}
                                                onClick={() => ignoreUpdateNotices([name])}
                                              >{t('ignoreUpdateNotice')}</button>
                                            )
                                      )}
                                    </div>
                                  )}
                                  {!off && act !== undefined && meta !== null && (
                                        <div className={css.act}>
                                          {/* Only a state the switch does NOT already show earns a
                                              line here: "installed but not active" is news, "live"
                                              is what the switch is for. */}
                                          {meta.dot !== 'done' && (
                                            <span className={meta.dot === 'error' ? css.actBroken : css.actWarn}>
                                              <StateDot state={meta.dot} size={7} />
                                              {meta.label}
                                            </span>
                                          )}
                                          {act.state !== 'live' && act.reasons.length > 0 && (
                                            <DisclosureRow
                                              icon={<IconQuestionOutline14 size={14} />}
                                              title={t('actWhy')}
                                              open={whyOpen === name}
                                              expandable
                                              expandOnRowClick
                                              onToggle={() => setWhyOpen(whyOpen === name ? null : name)}
                                              className={css.actWhy}
                                            >
                                              <div className={css.spec}>{act.reasons.join(' / ')}</div>
                                            </DisclosureRow>
                                          )}
                                        </div>
                                      )}
                                  {entry !== undefined && entry.deprecated === true && (
                                    <div className={css.deprecate} style={{ marginTop: 8 }}>
                                      <div className={css.depLine}>
                                        <span>⚠️ {t('deprecatedWarn')}</span>
                                        {entry.replacement !== undefined && (
                                          <span className={css.src}>{t('replacementHint') + ' ' + entry.replacement}</span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  {updatingName === name && (
                                    <div className={css.progress}>
                                      <span className={css.spin}><IconLoadingOutline16 size={14} /></span>
                                      <code className={css.grow}>{progressText}</code>
                                      {progressPct !== null && <span className={css.pct}>{progressPct}%</span>}
                                      <Button variant="outline" size="sm" disabled={cancelling} onClick={doCancel}>
                                        {cancelling ? t('cancelling') : t('cancelOp')}
                                      </Button>
                                      <div className={css.bar}>
                                        <div
                                          className={progressPct !== null ? css.barFill : `${css.barFill} ${css.barWave}`}
                                          style={progressPct !== null ? { width: `${progressPct}%` } : undefined}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {/* At half width the identity and the controls cannot
                                    share a line, so the row is two stacked bands. Left
                                    as one wrapping line, neighbouring cards broke at
                                    different points and stopped lining up.
                                    The market itself never reaches this row (filtered
                                    out above — it manages itself from its own settings
                                    card), so no self-toggle special case is needed. */}
                                <div className={css.irowActions}>
                                {/* Dot + tag, the pairing the host's own plugin
                                    inventory uses for exactly this state. */}
                                {!missing && (
                                  <span className={css.stateTag} data-on={off ? 'false' : 'true'}>
                                    <span className={css.stateDot} data-on={off ? 'false' : 'true'} />
                                    {off ? t('disabledState') : t('switchOnLabel')}
                                  </span>
                                )}
                                {toggleable && (
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={!off}
                                    aria-label={(off ? t('enable') : t('disable')) + ' ' + name}
                                    className={off ? css.switch : `${css.switch} ${css.switchOn}`}
                                    disabled={togglingName !== null || busyUrl !== null || updatingName !== null || removingName !== null}
                                    onClick={() => doToggle(name, off)}
                                  >
                                    <span className={css.switchKnob} />
                                  </button>
                                )}
                                {/* State and switch pack left, the operations
                                    pack right: with everything in one flow the
                                    switch's x depended on whether the update
                                    slot rendered a button or a tag. */}
                                <span className={css.grow} />
                                {entry !== undefined && entry.deprecated === true && entry.replacement !== undefined && (() => {
                                  const replacement = data?.plugins.find(r => r.name === entry.replacement)
                                  if (replacement === undefined) return null
                                  return (
                                    <>
                                      <Button variant="outline" size="sm" onClick={() => { setCat('all'); setQ(entry.replacement!); setTab('discover') }}>{t('viewReplacement')}</Button>
                                      {!isInstalled(replacement, catalogInstalled, repoIdentities, data?.plugins, repoHints) && (
                                        <Button variant="outline" size="sm" onClick={() => setConfirming(replacement)}>{t('installReplacement')}</Button>
                                      )}
                                    </>
                                  )
                                })()}
                                {/* Status slot and Uninstall wrap as ONE unit. As
                                    sibling children of a wrapping flex row they broke
                                    apart independently, leaving the tag on one line and
                                    the button on the next (#242 by @Ztyss). Nested,
                                    the pair either fits or moves together, and the tag
                                    — already ellipsizing since #234 — is what gives up
                                    width first. */}
                                <span className={css.irowTrailing}>
                                {missing
                                  ? <span className={css.metaTag}>{t('notInstalled')}</span>
                                  : updatedNames.includes(name)
                                    ? <span className={`${css.metaTag} ${css.metaTagOk}`}>{act?.state === 'live' ? t('updatedLive') : t('updated')}</span>
                                    : updatingName === name
                                      ? <Button variant="primary" size="sm" className={css.warnBtn} disabled>{t('updating')}</Button>
                                      : status && status.updateAvailable
                                        ? (
                                            <Button
                                              variant="primary"
                                              size="sm"
                                              className={css.warnBtn}
                                              disabled={updatingName !== null}
                                              onClick={() => {
                                                if (status.restoreRequired === true) askRestore(name)
                                                else doUpdate(name)
                                              }}
                                            >{status.restoreRequired === true ? t('restoreOnline') : t('update')}</Button>
                                          )
                                        : localDev
                                          ? <span className={css.metaTag} title={t('linkedDev')}>{t('linkedDev')}</span>
                                          : <span className={css.metaTag} title={t('upToDate')}>{t('upToDate')}</span>}
                                {!missing && name !== 'dsh-market' && name !== 'dshmarket' && (
                                  removingName === name
                                    ? <Button variant="outline" size="sm" className={css.dangerBtn} disabled>{t('uninstalling')}</Button>
                                    : (
                                        <>
                                          {localDev && status?.restoreRequired !== true && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              disabled={removingName !== null || busyUrl !== null || updatingName !== null}
                                              onClick={() => askRestore(name)}
                                            >{t('restore')}</Button>
                                          )}
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className={css.dangerBtn}
                                            disabled={removingName !== null || busyUrl !== null || updatingName !== null}
                                            onClick={() => setRemoveConfirm(name)}
                                          >{t('uninstall')}</Button>
                                        </>
                                      )
                                )}
                                </span>
                                </div>
                              </div>
                            )
                          }}
                          />
                        )}
                </>
              )}
      </div>
      {showTop && (
        <Tooltip label={t('backTop')} side="top">
          <span className={css.top}>
            <Button
              variant="outline"
              className={css.topBtn}
              aria-label={t('backTop')}
              onClick={() => { const el = bodyRef.current; if (el) el.scrollTo({ top: 0, behavior: 'smooth' }) }}
            ><IconChevronUpOutline14 size={16} /></Button>
          </span>
        </Tooltip>
      )}
      {confirming !== null && (
        <Modal
          open
          onClose={() => { setConfirming(null); setCmdOpen(false) }}
          title={t('confirmTitle') + ' ' + confirming.name + '?'}
          footer={(
            <>
              <Button variant="ghost" onClick={() => { setConfirming(null); setCmdOpen(false) }}>{t('cancel')}</Button>
              <Button variant="primary" onClick={() => doInstall(confirming)}>{t('confirmInstall')}</Button>
            </>
          )}
        >
          {/* The detail dialog has to show at LEAST what the card already
              does — owner, downloads, stars, published date, category — a
              "detail" view that shows less than the summary it opened from
              is backwards. */}
          <div className={css.byline}>
            <OwnerAvatar name={confirming.name} owner={confirming.owner || ''} />
            <span className={css.owner} title={confirming.owner}>{confirming.owner}</span>
            {typeof confirming.downloads === 'number' && (
              <Tooltip label={String(confirming.downloads)} side="top">
                <span className={css.star}>{'· ↓ ' + formatCount(confirming.downloads)}</span>
              </Tooltip>
            )}
            {typeof confirming.stars === 'number' && (
              <Tooltip label={String(confirming.stars)} side="top">
                <span className={css.star}>{'· ★ ' + formatCount(confirming.stars)}</span>
              </Tooltip>
            )}
            <span className={css.grow} />
            {pluginCategories(confirming).map(category => (
              <span key={category} className={css.tag}>
                {(data!.categories[category] && (data!.categories[category]![lang] || data!.categories[category]!.en)) || category}
              </span>
            ))}
          </div>
          {confirming.added && <div className={css.metaInline}>{t('published') + ' ' + confirming.added}</div>}
          {/* The Modal primitive's own `description` prop is sized for a
              one-line subtitle under the title — a full plugin description
              rendered there read as an oversized heading, not body text
              (reported on a real host). Rendering it here, at the card's own
              size, also matches the card's own reading order: name, byline,
              description, then screenshots. */}
          <CardDesc text={(confirming.description && (confirming.description[lang] || confirming.description.en)) || ''} t={t} />
          <ScreenshotStrip plugin={confirming} onOpen={openLightbox} />
          <DisclosureRow
            icon={<IconCodeOutline16 size={16} />}
            title={t('cmdDetails')}
            open={cmdOpen}
            expandable
            expandOnRowClick
            onToggle={() => setCmdOpen(o => !o)}
          >
            <div className={css.cmd}>{confirming.install}</div>
          </DisclosureRow>
          {looksTerminal(confirming, lang) && (
            <p className={css.warnLine}>
              <IconWarningOutline16 size={14} className={css.bannerIcon} />
              {' ' + t('terminalWarn') + ' '}
              <a className={css.src} href={confirming.url + '#readme'} target="_blank" rel="noreferrer">{t('readme')}</a>
            </p>
          )}
          {confirming.deprecated === true && (() => {
            const replacement = replacementOf(confirming)
            return (
              <div className={css.deprecate}>
                <div className={css.depLine}>
                  <span>⚠️ {t('deprecatedWarn')}</span>
                  {replacement !== undefined && (
                    <a className={css.src} href={replacement.url} target="_blank" rel="noreferrer">
                      {t('replacementHint') + ' ' + replacement.name}
                    </a>
                  )}
                </div>
              </div>
            )
          })()}
          <p className={css.modalNote}><IconWarningOutline16 size={14} className={css.bannerIcon} />{' ' + t('confirmWarn')}</p>
        </Modal>
      )}
      {commentsFor !== null && (
        <CommentsModal
          key={commentsFor.url}
          name={pluginName(commentsFor.name)}
          url={commentsFor.url}
          lang={lang}
          onClose={() => setCommentsFor(null)}
          t={t}
        />
      )}
      {lightbox !== null && (
        <ScreenshotLightbox
          shots={lightbox.shots}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
          t={t}
        />
      )}
      {removeConfirm !== null && (
        <Modal
          open
          onClose={() => setRemoveConfirm(null)}
          title={t('uninstall') + ' ' + removeConfirm + '?'}
          description={t('uninstallConfirmDesc')}
          footer={(
            <>
              <Button variant="ghost" onClick={() => setRemoveConfirm(null)}>{t('cancel')}</Button>
              <Button variant="primary" disabled={removingName !== null} onClick={() => doUninstall(removeConfirm)}>{t('uninstall')}</Button>
            </>
          )}
        />
      )}
      {notesFor !== null && (
        <Modal
          open
          onClose={() => setNotesFor(null)}
          /* The host's Modal renders its title node verbatim; the hand-written
             primitives.d.ts narrows the prop to string, so this cast documents
             intent rather than defeating a runtime check. */
          title={(notesFor.repoUrl !== null
            ? <a className={css.nameLink} href={notesFor.repoUrl + '#readme'} target="_blank" rel="noreferrer">{notesFor.name}</a>
            : notesFor.name) as unknown as string}
          footer={(
            <Button variant="ghost" onClick={() => setNotesFor(null)}>{t('cancel')}</Button>
          )}
        >
          {/* The version line reads as versions when both ends are semver and
              as short shas when the plugin updates from git — a 40-char sha
              pair wraps the dialog into nonsense. */}
          {(notesFor.current !== null || notesFor.latest !== null) && (
            <div className={css.notesRange}>
              <span className={css.spec}>{notesFor.current !== null && notesFor.current.length === 40
                ? notesFor.current.slice(0, 7)
                : notesFor.current}</span>
              <span className={css.notesArrow}>→</span>
              <span className={css.spec}>{notesFor.latest !== null && notesFor.latest.length === 40
                ? notesFor.latest.slice(0, 7)
                : notesFor.latest}</span>
            </div>
          )}
          {notesState === 'loading' && <div className={css.spec}>{t('loading')}</div>}
          {notesState === 'fail' && <div className={css.spec}>{t('notesLoadFail')}</div>}
          {notesState === 'ready' && updateNotes !== null && (
            updateNotes.kind === 'release' ? (
              <div className={css.notesBody}>
                <div className={css.notesMeta}>
                  <strong>{t('notesRelease')}</strong>
                  {updateNotes.release.tag !== null && <span>{' ' + updateNotes.release.tag}</span>}
                  {updateNotes.release.publishedAt !== null && <span>{' · ' + updateNotes.release.publishedAt.slice(0, 10)}</span>}
                </div>
                {/* Author-written markdown, rendered through a deliberately
                    tiny converter: everything lands as React text children
                    (auto-escaped), so no HTML from the repo can ever become
                    markup — headings, bullets, bold and inline code only. */}
                <div className={css.notesRendered}>{renderMarkdown(updateNotes.release.body || t('notesNone'))}</div>
              </div>
            )
            : updateNotes.kind === 'commits' ? (
              <div className={css.notesBody}>
                <div className={css.notesMeta}><strong>{t('notesCommits')}</strong></div>
                {!updateNotes.commits.found && <div className={css.notesMeta}>{t('notesCommitsRecent')}</div>}
                <ul className={css.notesList}>
                  {updateNotes.commits.items.map(c => (
                    <li key={c.sha} className={css.notesRow}>
                      <span className={css.notesDate}>{c.date !== null ? c.date.slice(0, 10) : ''}</span>
                      <span className={css.notesMsg}>{mdInline(c.message)}</span>
                      {notesFor.repoUrl !== null && (
                        /* The commit itself on GitHub — the escape hatch when
                           two lines of clamp hide exactly the detail wanted. */
                        <a className={css.notesSha}
                          href={notesFor.repoUrl + '/commit/' + c.sha}
                          target="_blank" rel="noreferrer"
                          title={c.message}>{c.sha.slice(0, 7)}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
            : updateNotes.kind === 'npm' ? (
              <div className={css.notesBody}>
                <div className={css.notesMeta}><strong>{t('notesNpm')}</strong></div>
                <ul className={css.notesList}>
                  {updateNotes.npmTimes.map(v => (
                    <li key={v.version} className={css.notesRow}>
                      <span className={css.notesDate}>{v.date.slice(0, 10)}</span>
                      <a className={css.notesVer}
                        href={`https://www.npmjs.com/package/${encodeURIComponent(notesFor.name)}/v/${encodeURIComponent(v.version)}`}
                        target="_blank" rel="noreferrer">{v.version}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )
            : <div className={css.spec}>{t('notesNone')}</div>
          )}
        </Modal>
      )}
      {restoreConfirmOpen && pendingBackup !== null && (
        <Modal
          open
          onClose={() => setRestoreConfirmOpen(false)}
          title={t('restoreConfirm')}
          footer={(
            <>
              <Button variant="ghost" onClick={() => setRestoreConfirmOpen(false)}>{t('cancel')}</Button>
              <Button variant="primary" disabled={backupBusy} onClick={doRestore}>{t('confirm')}</Button>
            </>
          )}
        />
      )}
      {exportOpen && (
        <Modal
          open
          onClose={() => setExportOpen(false)}
          title={t('gistExportSelect')}
          description={t('gistExportHint')}
          footer={(
            <>
              <Button variant="ghost" onClick={() => setExportOpen(false)}>{t('cancel')}</Button>
              <Button variant="primary" disabled={gistBusy || exportSelection.size === 0} onClick={() => runGist('export')}>
                {gistBusy ? t('backupWorking') : t('gistExportGo')}
              </Button>
            </>
          )}
        >
          {exportOptions.length === 0 && <p>{t('gistNoPlugins')}</p>}
          {exportOptions.length > 0 && (
            <>
              <div className={css.backupActions}>
                <Button size="sm" variant="outline" onClick={() => setExportSelection(new Set(exportOptions))}>{t('gistSelectAll')}</Button>
                <Button size="sm" variant="outline" onClick={() => setExportSelection(new Set())}>{t('gistSelectNone')}</Button>
              </div>
              <div className={css.backupCheckList}>
                {exportOptions.map(name => (
                  <label key={name} className={css.backupCheck}>
                    <input
                      type="checkbox"
                      checked={exportSelection.has(name)}
                      onChange={e => {
                        const next = new Set(exportSelection)
                        if (e.currentTarget.checked) next.add(name)
                        else next.delete(name)
                        setExportSelection(next)
                      }}
                    />
                    <span className={css.grow}>{name}</span>
                    {specKind(installed[name]) === 'git' && <span className={`${css.specTag} ${css.specTagGit}`}>git</span>}
                    {specKind(installed[name]) === 'file' && <span className={`${css.specTag} ${css.specTagFile}`}>{t('gistSpecLocal')}</span>}
                    <span className={css.spec} title={installed[name]}>{installed[name] ?? t('bundleTag')}</span>
                  </label>
                ))}
              </div>
              <label className={css.backupCheck}>
                <input type="checkbox" checked={exportIncludeConfig} onChange={e => setExportIncludeConfig(e.target.checked)} />
                {t('gistIncludeConfig')}
              </label>
              {exportIncludeConfig && <p className={css.backupWarn}>{t('credsWarning')}</p>}
              {exportError !== null && <p className={css.backupWarn}>{exportError}</p>}
            </>
          )}
        </Modal>
      )}
      {/* Log-export feedback via the Toast primitive — body portal, so it
        never squeezes the subtitle row or the error banner. */}
      {exportState === 'done' && (
        <Toast text={t('exportedLog')} icon={<IconCheckOutline16 size={14} />} onDone={exportToastDone} />
      )}
      {exportState === 'fail' && (
        <Toast text={t('exportLogFail')} icon={<IconWarningOutline16 size={14} />} onDone={exportToastDone} />
      )}
      {toggled !== null && (
        <Toast
          text={toggled.name + ' ' + t(toggled.enabled ? 'toastToggledOn' : 'toastToggledOff')}
          icon={toggled.enabled ? <IconCheckOutline16 size={14} /> : <IconWarningOutline16 size={14} />}
          onDone={toggledDone}
        />
      )}
    </div>
  )
}
