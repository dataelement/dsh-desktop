import type { AvailableRelease, UpdateStatus } from '../shared/contracts'

import type { DesktopLocale } from '../shared/desktop-locale'
import { updateText } from '../shared/desktop-update-messages'

export type UpdateLocale = DesktopLocale

/** Internal presentation marker: keep generic failures translatable after a locale change. */
export const UPDATE_ACTION_FAILED = 'dsh-desktop:update-action-failed'

export function shouldShowUpdate(status: UpdateStatus, allowManualPresentation = true): boolean {
  if (['available', 'downloading', 'downloaded'].includes(status.phase)) return true
  return allowManualPresentation && status.manual && ['checking', 'up-to-date', 'error', 'unsupported'].includes(status.phase)
}

export function isUpdateDismissed(
  status: UpdateStatus,
  dismissedVersion: string | null,
  dismissedTransientPhase: UpdateStatus['phase'] | null = null
): boolean {
  if (status.availableVersion) return status.availableVersion === dismissedVersion
  return status.phase === dismissedTransientPhase
}

/** A manual request may replay a cached update; progress keeps the same request ID. */
export function isNewManualPresentation(status: UpdateStatus, previous?: UpdateStatus, delivery: 'event' | 'snapshot' = 'event'): boolean {
  if (delivery === 'snapshot') return false
  if (!status.manual) return false
  if (!previous) return true
  if (status.presentationId !== undefined) return status.presentationId !== previous.presentationId
  return status.phase === 'checking' && previous.phase !== 'checking'
}

export interface UpdateHeadline {
  title: string
  description: string
}

/**
 * The card's two lines: what happened, then what it means for the user.
 *
 * The version belongs in the second line rather than the first — a release
 * number answers "which one", not "what now", and reading the state should not
 * require parsing a version string out of a sentence.
 */
export function updateHeadline(status: UpdateStatus, locale: UpdateLocale): UpdateHeadline {
  const t = (key: Parameters<typeof updateText>[1], values = {}) => updateText(locale, key, values)
  const version = status.availableVersion ? `v${status.availableVersion}` : ''
  if (status.downgrade && status.availableVersion) return { title: t('downgrading', { version }), description: t('rollingBack', { current: status.currentVersion, version }) }
  switch (status.phase) {
    case 'checking': return { title: t('checking'), description: t('currently', { version: status.currentVersion }) }
    case 'available': return { title: t('available', { version }), description: t('readyDownload', { version }) }
    case 'downloading': return { title: t('downloading'), description: `${version} · ${Math.round(status.percent ?? 0)}%` }
    case 'downloaded': return { title: t('ready'), description: t('nextLaunch', { version }) }
    case 'up-to-date': return { title: t('upToDate'), description: t('currently', { version: status.currentVersion }) }
    case 'unsupported': return { title: t('unsupported'), description: t('website') }
    case 'error': return { title: t('failed'), description: t('unable') }
    case 'idle': return { title: '', description: '' }
  }
}

export function updateMessage(status: UpdateStatus, locale: UpdateLocale): string {
  const version = status.availableVersion ? ` ${status.availableVersion}` : ''
  const percent = Math.round(status.percent ?? 0)
  if (status.downgrade && status.availableVersion) {
    const key = status.phase === 'downloaded' ? 'downgradeReady' : status.phase === 'downloading' ? 'downgrading' : 'preparingDowngrade'
    return updateText(locale, key, { version: status.availableVersion }) + (status.phase === 'downloading' ? ` (${percent}%)` : '')
  }
  switch (status.phase) {
    case 'checking': return updateText(locale, 'checking') + '…'
    case 'available': return updateText(locale, 'askUpdate', { version })
    case 'downloading': return updateText(locale, 'downloading') + ` ${percent}%`
    case 'downloaded': return updateText(locale, 'downloaded', { version })
    case 'up-to-date': return updateText(locale, 'appLatest')
    case 'unsupported': return updateText(locale, 'buildUnsupported')
    case 'error': return updateText(locale, 'unable').replace(/[。.]$/, '')
    case 'idle': return ''
  }
}

/** Compare two dotted versions; prerelease sorts below its release. Mirrors
 * `version-catalog.compareVersions` — a small duplication across the
 * main/preload boundary, kept local so the preload bundle stays standalone.
 * Keep the two implementations in lockstep, including the semver-style
 * numeric prerelease comparison below ("rc.10" > "rc.9"). */
export function comparePreloadVersions(a: string, b: string): number {
  const parse = (value: string): [number[], string] => {
    const [core = '', ...pre] = value.trim().split('-')
    const nums = core.split('.').map((part) => Number.parseInt(part, 10) || 0)
    while (nums.length < 3) nums.push(0)
    return [nums, pre.join('-')]
  }
  const [an, ap] = parse(a)
  const [bn, bp] = parse(b)
  for (let i = 0; i < 3; i += 1) {
    if ((an[i] ?? 0) !== (bn[i] ?? 0)) return (an[i] ?? 0) - (bn[i] ?? 0)
  }
  return comparePrerelease(ap, bp)
}

function comparePrerelease(left: string, right: string): number {
  if (left === right) return 0
  if (!left) return 1
  if (!right) return -1
  const l = left.split('.')
  const r = right.split('.')
  const length = Math.max(l.length, r.length)
  for (let i = 0; i < length; i += 1) {
    const x = l[i]
    const y = r[i]
    if (x === undefined) return -1
    if (y === undefined) return 1
    if (x === y) continue
    const xn = /^\d+$/.test(x)
    const yn = /^\d+$/.test(y)
    if (xn && yn) {
      const nx = x.replace(/^0+/, '') || '0'
      const ny = y.replace(/^0+/, '') || '0'
      if (nx.length !== ny.length) return nx.length < ny.length ? -1 : 1
      if (nx !== ny) return nx < ny ? -1 : 1
      continue
    }
    if (xn) return -1
    if (yn) return 1
    if (x < y) return -1
    if (x > y) return 1
  }
  return 0
}

/** The About picker only offers rollback, independent of the server catalogue shape. */
export function rollbackReleases(releases: AvailableRelease[], currentVersion: string): AvailableRelease[] {
  return releases.filter(release => comparePreloadVersions(release.version, currentVersion) < 0)
    .sort((a, b) => comparePreloadVersions(b.version, a.version))
}

export function rollbackEmptyMessage(locale: UpdateLocale): string {
  return updateText(locale, 'noOlder')
}

/** Known updater failures stay in the Desktop language instead of the English exception text. */
export function presentedUpdateMessage(message: string | undefined, locale: UpdateLocale): string | undefined {
  if (message === UPDATE_ACTION_FAILED) return updateText(locale, 'actionFailed')
  if (message === 'Desktop update service is unavailable') return updateText(locale, 'serviceUnavailable')
  if (message === 'Updates are available in installed macOS and Windows builds.' || message === 'Update checks are only available in installed macOS and Windows builds.') return updateText(locale, 'buildUnsupported')
  if (message === 'Selected version is not in the release history' || message === '在更新源未找到该版本') return updateText(locale, 'versionsError')
  if (message === 'Update archive does not match the selected version' || message === 'downloaded-version-mismatch' || message === 'downloaded-update-changed-during-install' || message === 'updater-not-initialized') return updateText(locale, 'actionFailed')
  return message
}
