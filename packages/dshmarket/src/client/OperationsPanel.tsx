/**
 * The activity entry and its panel: every install, update and uninstall the
 * user started, with the action each outcome calls for.
 *
 * The entry lives in the tab row rather than above the plugin grid, so
 * paginating, searching or switching tab cannot take a record — or a pending
 * decision — off screen. It reports the batch as one aggregate ("installing
 * 3 / 7") instead of one line per plugin.
 */

import {
  Button,
  IconCheckOutline16,
  IconLoadingOutline16,
  IconWarningOutline16,
  IconChevronDownOutline14,
  IconChevronUpOutline14,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import css from './Market.module.css'
import type { Translate } from './market-data.ts'
import type { ConflictGroup, OperationRecord } from './operations.ts'
import { bucketOf, isSettled, needsUser, queuePosition, sortForPanel, summarize } from './operations.ts'

/** What the two clash outcomes are, in the order they are offered. */
const CHOICES = [
  { id: 'keep' as const, label: 'conflictKeep', note: 'conflictKeepNote' },
  { id: 'swap' as const, label: 'conflictSwap', note: 'conflictSwapNote' },
]

/**
 * How the panel renders a plugin it only knows by package name: the catalog
 * (or the installed list) supplies the author and avatar a card would show.
 */
export type DescribePlugin = (name: string) => {
  title: string
  author?: string | undefined
  avatar?: ReactNode
}

export interface OperationsPanelProps {
  t: Translate
  /** Resolves a package name to the identity a card would show for it. */
  describe: DescribePlugin
  records: readonly OperationRecord[]
  open: boolean
  /** Owned by the parent: a card's "cannot install" marker raises the panel. */
  onOpenChange: (open: boolean) => void
  /** True while a swap is running, which disables both clash outcomes. */
  replacing: boolean
  /** Blocks the destructive outcome when pnpm is not usable yet. */
  envReady: boolean
  onClearSettled: () => void
  onCancel: (record: OperationRecord) => void
  onDismiss: (record: OperationRecord) => void
  onRefresh: () => void
  /** Resolve a clash: keep what is installed, or uninstall it and retry. */
  onResolveConflict: (record: OperationRecord, choice: 'keep' | 'swap') => void
  /** Retry an operation the host refused for a fixable reason. */
  onRetry?: ((record: OperationRecord) => void) | undefined
  /** Approve the build scripts pnpm blocked, then retry — replaces the plain
   * retry on a record that failed for that reason, so the fix sits next to
   * the sentence describing the problem. */
  onApproveBuilds?: ((record: OperationRecord) => void) | undefined
}

/**
 * What each plugin ends up as under the selected outcome.
 *
 * The consequence is drawn ON the plugins rather than described beside them:
 * pick "keep what I have" and the installed rows tick while the candidate
 * crosses out; pick the other and they swap. The candidate is in this list
 * for the same reason — a decision about which plugin survives has to show
 * what happens to the one being installed, not only to the others.
 */
function OutcomePreview(props: {
  t: Translate
  record: OperationRecord
  choice: 'keep' | 'swap'
  describe: DescribePlugin
}) {
  const { t, record, choice } = props
  const swap = choice === 'swap'
  const candidate = props.describe(record.name)
  const row = (key: string, info: ReturnType<DescribePlugin>, kept: boolean, tag: string) => (
    <div key={key} className={kept ? css.rosterRow : `${css.rosterRow} ${css.rosterRowOut}`}>
      {info.avatar}
      <span className={css.rosterMain}>
        <span className={css.rosterName} title={key}>{info.title}</span>
        {info.author !== undefined && <span className={css.rosterAuthor}>{info.author}</span>}
      </span>
      <span className={kept ? `${css.rosterTag} ${css.rosterTagKeep}` : `${css.rosterTag} ${css.rosterTagDrop}`}>
        {kept ? '✓' : '✕'} {tag}
      </span>
    </div>
  )
  return (
    <div className={css.roster}>
      {row(record.name, candidate, swap, t(swap ? 'conflictOutcomeInstall' : 'conflictOutcomeSkip'))}
      <div className={css.rosterSplit} />
      {(record.conflicts ?? []).map(group =>
        row(group.owner, props.describe(group.owner), !swap, t(swap ? 'conflictOutcomeRemove' : 'conflictOutcomeKeep')))}
    </div>
  )
}

/**
 * The decision attached to a clash. Two outcomes rather than an error plus a
 * destructive button: the default changes nothing, and selecting the other
 * one is itself the consent step, so its cost is stated here.
 */
function ConflictChoice(props: {
  t: Translate
  record: OperationRecord
  replacing: boolean
  envReady: boolean
  describe: DescribePlugin
  onResolve: (choice: 'keep' | 'swap') => void
}) {
  const { t, record, replacing, envReady } = props
  const [choice, setChoice] = useState<'keep' | 'swap'>('keep')
  const [whyOpen, setWhyOpen] = useState(false)
  return (
    <div className={css.opDecision}>
      <p className={css.conflictBody}>{t('conflictBody')}</p>
      <OutcomePreview t={t} record={record} choice={choice} describe={props.describe} />
      {/* Native radios: the platform already draws the control, groups it by
          `name`, and gives arrow-key navigation. A hand-rolled ring gets the
          look wrong and the keyboard behaviour with it. */}
      <div className={css.choices}>
        {CHOICES.map(({ id, label, note }) => (
          <label
            key={id}
            className={choice === id ? `${css.choice} ${css.choiceOn}` : css.choice}
          >
            <input
              type="radio"
              className={css.choiceRadio}
              name={`dshm-conflict-${record.id}`}
              checked={choice === id}
              disabled={replacing}
              onChange={() => setChoice(id)}
            />
            <span className={css.choiceMain}>
              <span className={css.choiceTitle}>{t(label)}</span>
              {t(note) !== '' && <span className={css.choiceNote}>{t(note)}</span>}
            </span>
          </label>
        ))}
      </div>
      {/* Both ways out of the decision share one row: the quiet one that
          reveals evidence, and the one that commits. */}
      <div className={css.opDecisionFoot}>
        <button
          type="button"
          className={css.conflictDetailsToggle}
          aria-expanded={whyOpen}
          onClick={() => setWhyOpen(open => !open)}
        >
          {t('conflictDetails')}
          {whyOpen ? <IconChevronUpOutline14 size={12} /> : <IconChevronDownOutline14 size={12} />}
        </button>
        <span className={css.grow} />
        <Button
          variant={choice === 'swap' ? 'outline' : 'primary'}
          size="sm"
          className={choice === 'swap' ? css.dangerBtn : undefined}
          disabled={replacing || (choice === 'swap' && !envReady)}
          onClick={() => props.onResolve(choice)}
        >{replacing ? t('conflictReplacing') : t('confirm')}</Button>
      </div>
      {whyOpen && (
        <div className={css.conflictWhy}>
          {(record.conflicts ?? []).map(group => (
            <div key={group.owner}>{group.owner}: {group.ids.join(', ')}</div>
          ))}
          <div className={css.conflictWhyText}>{t('conflictWhy')}</div>
        </div>
      )}
    </div>
  )
}

/** Icon for a record's visual bucket — three, not one per state. */
function BucketIcon(props: { record: OperationRecord }) {
  const bucket = bucketOf(props.record.state)
  if (bucket === 'busy') {
    return props.record.state === 'running'
      ? <span className={css.spin}><IconLoadingOutline16 size={13} /></span>
      : <span className={css.opQueuedIcon}>⋯</span>
  }
  if (bucket === 'ok') return <IconCheckOutline16 size={13} className={css.reassureOk} />
  return <IconWarningOutline16 size={14} className={css.conflictIcon} />
}

/** The one-line status under a record's name; the bucket carries the rest. */
function statusLine(t: Translate, record: OperationRecord, ahead: number | null): string {
  switch (record.state) {
    case 'queued':
      return ahead === null || ahead === 0 ? t('opQueued') : `${t('opQueued')} · ${t('opQueuedAhead')} ${String(ahead)}`
    case 'running':
      return record.detail ?? t('opRunning')
    case 'input':
      return t('opNeedsChoice')
    case 'failed':
      return record.reason ?? t('installFail')
    case 'warned':
      return record.reason ?? t('opDone')
    case 'done':
      return record.needsRefresh === true ? t('opDoneRefresh') : t('opDone')
  }
}

export function OperationsPanel(props: OperationsPanelProps) {
  const { t, records, open } = props
  const setOpen = props.onOpenChange
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const summary = summarize(records)
  const busy = summary.running + summary.queued > 0

  // Dismissing a popover by pressing the control that opened it is the one
  // route nobody looks for. Escape and an outside click are; the header also
  // carries an explicit collapse for anyone who wants a target to aim at.
  // The listener covers the whole wrapper, button included, so the button's
  // own toggle is not undone by this closing first.
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    const onPointer = (event: MouseEvent) => {
      const wrap = wrapRef.current
      if (wrap !== null && !wrap.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [open, setOpen])

  // The entry label is the batch, not a verb with no object: a bare "3" says
  // nothing about what is happening to the profile.
  const label = busy
    ? `${t('opInstalling')} ${String(summary.progressed)}/${String(summary.total)}`
    : summary.attention > 0
      ? `${String(summary.attention)} ${t('opNeedsYou')}`
      : t('opTitle')

  // Always render inside .opWrap so the tab-row bottom margin is stable —
  // the old idle-only <button> skipped the wrapper and jumped on first open.
  const quiet = records.length === 0 && !open

  return (
    <div className={css.opWrap} ref={wrapRef}>
      <button
        type="button"
        className={quiet
          ? `${css.opEntry} ${css.opEntryQuiet}`
          : summary.attention > 0
            ? `${css.opEntry} ${css.opEntryAlert}`
            : css.opEntry}
        aria-expanded={open}
        onClick={() => setOpen(quiet ? true : !open)}
      >
        {!quiet && busy && <span className={css.spin}><IconLoadingOutline16 size={12} /></span>}
        {quiet ? t('opTitle') : label}
        {!quiet && summary.attention > 0 && <span className={css.opDot} />}
      </button>
      {open && (
        <div className={css.opPanel}>
          <div className={css.opHead}>
            <span className={css.opPanelTitle}>{t('opTitle')}</span>
            <span className={css.grow} />
            {summary.settled > 0 && (
              <Button variant="ghost" size="sm" onClick={props.onClearSettled}>{t('opClear')}</Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              aria-label={t('opClose')}
              title={t('opClose')}
              className={css.opCloseBtn}
              onClick={() => setOpen(false)}
            ><IconChevronUpOutline14 size={14} /></Button>
          </div>
          {busy && (
            <div className={css.opAggregate}>
              <div className={css.opAggregateTop}>
                <span>{t('opInstalling')} {summary.progressed}/{summary.total}</span>
              </div>
              <div className={css.bar}>
                <div
                  className={css.barFill}
                  style={{ width: `${String(Math.round(summary.progressed / Math.max(1, summary.total) * 100))}%` }}
                />
              </div>
              {/* Long installs are the norm; saying so is what makes leaving
                  the page an option rather than a gamble. */}
              <div className={css.opAggregateHint}>{t('opLeaveHint')}</div>
            </div>
          )}
          {records.length === 0 && (
            <div className={css.opEmpty}>
              {t('opEmpty')}
              <div className={css.opEmptyHint}>{t('opEmptyHint')}</div>
            </div>
          )}
          {sortForPanel(records).map((record) => {
            const ahead = queuePosition(records, record.id)
            return (
              <div key={record.id} className={needsUser(record) ? `${css.opRow} ${css.opRowAlert}` : css.opRow}>
                <span className={css.opIcon}><BucketIcon record={record} /></span>
                <div className={css.opMain}>
                  <div className={css.opTop}>
                    <span className={css.opVerb}>{t(`opKind_${record.kind}`)}</span>
                    <span className={css.opName} title={record.name}>{record.name}</span>
                  </div>
                  {record.state === 'running' && typeof record.percent === 'number' && (
                    <div className={css.bar}>
                      <div className={css.barFill} style={{ width: `${String(record.percent)}%` }} />
                    </div>
                  )}
                  <div className={bucketOf(record.state) === 'attention' ? `${css.opStatus} ${css.opStatusBad}` : css.opStatus}>
                    {statusLine(t, record, ahead)}
                  </div>
                  {needsUser(record) && (
                    <ConflictChoice
                      t={t}
                      record={record}
                      replacing={props.replacing}
                      envReady={props.envReady}
                      describe={props.describe}
                      onResolve={choice => props.onResolveConflict(record, choice)}
                    />
                  )}
                </div>
                <div className={css.opActions}>
                  {record.state === 'running' && (
                    <Button variant="outline" size="sm" onClick={() => props.onCancel(record)}>{t('cancelOp')}</Button>
                  )}
                  {record.state === 'queued' && (
                    <Button variant="ghost" size="sm" onClick={() => props.onDismiss(record)}>{t('opDequeue')}</Button>
                  )}
                  {record.state === 'done' && record.needsRefresh === true && (
                    <Button variant="primary" size="sm" onClick={props.onRefresh}>{t('refresh')}</Button>
                  )}
                  {record.state === 'failed' && (record.blockedBuilds ?? []).length > 0 && props.onApproveBuilds !== undefined && (
                    <Button variant="primary" size="sm" onClick={() => props.onApproveBuilds?.(record)}>{t('approveBuilds')}</Button>
                  )}
                  {record.state === 'failed' && (record.blockedBuilds ?? []).length === 0 && props.onRetry !== undefined && (
                    <Button variant="outline" size="sm" onClick={() => props.onRetry?.(record)}>{t('opRetry')}</Button>
                  )}
                  {isSettled(record) && (
                    <Button variant="ghost" size="sm" onClick={() => props.onDismiss(record)}>{t('dismissNotice')}</Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
