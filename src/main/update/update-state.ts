import type { UpdateStatus } from '../../shared/contracts'

export type UpdateStateEvent =
  | { type: 'check'; manual: boolean; source?: UpdateStatus['source'] }
  | { type: 'available'; version: string; releaseNotes?: string }
  | { type: 'progress'; percent: number }
  | { type: 'downloaded'; version: string }
  | { type: 'not-available' }
  | { type: 'error'; message: string }
  | { type: 'unsupported'; message: string }
  | { type: 'present-manual' }
  | { type: 'reset' }

export function initialUpdateStatus(currentVersion: string): UpdateStatus {
  return { phase: 'idle', currentVersion, manual: false }
}

export function reduceUpdateStatus(
  current: UpdateStatus,
  event: UpdateStateEvent
): UpdateStatus {
  const base = {
    currentVersion: current.currentVersion,
    manual: current.manual,
    source: current.source,
    presentationId: current.presentationId,
    locale: current.locale,
    downgrade: current.downgrade
  }

  switch (event.type) {
    case 'check':
      return { ...base, phase: 'checking', manual: event.manual, source: event.source ?? (event.manual ? 'manual' : 'runtime') }
    case 'available':
      return { ...base, phase: 'available', availableVersion: event.version, releaseNotes: event.releaseNotes }
    case 'progress':
      return { ...current, phase: 'downloading', percent: clampPercent(event.percent) }
    case 'downloaded':
      return { ...base, phase: 'downloaded', availableVersion: event.version, releaseNotes: current.releaseNotes }
    case 'not-available':
      return { ...base, phase: 'up-to-date' }
    case 'error':
      return { ...base, phase: 'error', message: event.message }
    case 'unsupported':
      return { ...base, phase: 'unsupported', message: event.message }
    case 'present-manual':
      return { ...current, manual: true, source: 'manual' }
    case 'reset':
      return initialUpdateStatus(current.currentVersion)
  }
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(Math.min(100, Math.max(0, value)) * 10) / 10
}

/** Adapt untrusted updater metadata to a bounded, serializable plain-text value. */
export function normalizeReleaseNotes(value: unknown): string | undefined {
  const notes = typeof value === 'string' ? [value] : Array.isArray(value)
    ? value.flatMap((entry: unknown) => {
      if (!entry || typeof entry !== 'object' || !('note' in entry)) return []
      return typeof entry.note === 'string' ? [entry.note] : []
    }) : []
  const text = notes.join('\n\n').replace(/\r\n?/g, '\n').trim().slice(0, 20_000)
  return text || undefined
}
