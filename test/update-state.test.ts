import { describe, expect, it } from 'vitest'
import {
  initialUpdateStatus,
  normalizeReleaseNotes,
  reduceUpdateStatus
} from '../src/main/update/update-state'

describe('desktop update state', () => {
  it('tracks an automatic download from discovery through completion', () => {
    let status = initialUpdateStatus('1.0.0')
    status = reduceUpdateStatus(status, { type: 'check', manual: false })
    status = reduceUpdateStatus(status, { type: 'available', version: '1.1.0' })
    status = reduceUpdateStatus(status, { type: 'progress', percent: 52.37 })

    expect(status).toEqual({
      phase: 'downloading',
      currentVersion: '1.0.0',
      availableVersion: '1.1.0',
      percent: 52.4,
      manual: false,
      source: 'runtime'
    })

    status = reduceUpdateStatus(status, { type: 'downloaded', version: '1.1.0' })
    expect(status).toEqual({
      phase: 'downloaded',
      currentVersion: '1.0.0',
      availableVersion: '1.1.0',
      manual: false,
      source: 'runtime'
    })
  })

  it('preserves whether a check was initiated from the application menu', () => {
    let status = initialUpdateStatus('1.0.0')
    status = reduceUpdateStatus(status, { type: 'check', manual: true })
    status = reduceUpdateStatus(status, { type: 'not-available' })

    expect(status.phase).toBe('up-to-date')
    expect(status.manual).toBe(true)
  })

  it('carries downgrade through transient events and clears it on reset', () => {
    const base = { ...initialUpdateStatus('1.5.0'), downgrade: true }
    expect(reduceUpdateStatus(base, { type: 'available', version: '1.2.0' }).downgrade).toBe(true)
    expect(reduceUpdateStatus(base, { type: 'progress', percent: 40 }).downgrade).toBe(true)
    expect(reduceUpdateStatus(base, { type: 'downloaded', version: '1.2.0' }).downgrade).toBe(true)
    expect(reduceUpdateStatus(base, { type: 'reset' }).downgrade).toBeUndefined()
  })

  it('clamps invalid download percentages', () => {
    const status = {
      ...initialUpdateStatus('1.0.0'),
      availableVersion: '1.1.0'
    }

    expect(reduceUpdateStatus(status, { type: 'progress', percent: -5 }).percent).toBe(0)
    expect(reduceUpdateStatus(status, { type: 'progress', percent: 140 }).percent).toBe(100)
    expect(
      reduceUpdateStatus(status, { type: 'progress', percent: Number.NaN }).percent
    ).toBe(0)
  })
})


it('preserves startup source and release notes through download completion', () => {
  let status = reduceUpdateStatus(initialUpdateStatus('1.0.0'), { type: 'check', manual: false, source: 'startup' })
  status = reduceUpdateStatus(status, { type: 'available', version: '1.1.0', releaseNotes: 'Fixes' })
  status = reduceUpdateStatus(status, { type: 'progress', percent: 20 })
  status = reduceUpdateStatus(status, { type: 'downloaded', version: '1.1.0' })
  expect(status.source).toBe('startup')
  expect(status.releaseNotes).toBe('Fixes')
  expect(reduceUpdateStatus(status, { type: 'present-manual' })).toMatchObject({ phase: 'downloaded', source: 'manual', manual: true, releaseNotes: 'Fixes' })
})

it('normalizes only supported release notes and bounds external text', () => {
  expect(normalizeReleaseNotes([{ note: 'first' }, { note: 4 }, null, { note: 'second' }])).toBe('first\n\nsecond')
  expect(normalizeReleaseNotes(' A\r\nB ')).toBe('A\nB')
  expect(normalizeReleaseNotes({ html: '<script>' })).toBeUndefined()
  expect(normalizeReleaseNotes('x'.repeat(30_000))?.length).toBe(20_000)
})
