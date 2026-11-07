import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  assessCandidate,
  mergeDuplicate,
  readLedger,
  recordReview,
  selectBatch,
  STATUS,
  summarize,
  writeLedger
} from '../packages/dsh-linkedin-contacts/ledger.mjs'

const roots = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

const row = (name, status = STATUS.unreviewed, extra = {}) => ({
  source: 'apple_contacts',
  name,
  status,
  source_records: [{ source: 'apple_contacts', name, status }],
  ...extra
})

function fixture(overrides = {}) {
  return {
    checked_at: '2026-01-01T00:00:00.000Z',
    actions: [],
    current_request: {
      batch_queue: [row('Ada Lovelace'), row('Grace Hopper'), row('Alan Turing', STATUS.existing)],
      possible_duplicates: [
        { apple_contact: 'Grace Hopper', facebook_source_id: 'grace.hopper', status: 'possible_duplicate_not_merged' }
      ],
      ...overrides
    }
  }
}

async function tempLedger(ledger) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-linkedin-'))
  roots.push(root)
  const file = join(root, 'state.json')
  await writeFile(file, JSON.stringify(ledger))
  return file
}

describe('linkedin contact ledger', () => {
  it('selects only unreviewed rows, in saved order', () => {
    const ledger = fixture()
    expect(selectBatch(ledger, 5).map((r) => r.name)).toEqual(['Ada Lovelace', 'Grace Hopper'])
    expect(selectBatch(ledger, 1).map((r) => r.name)).toEqual(['Ada Lovelace'])
  })

  it('never reselects someone already invited', () => {
    const ledger = fixture()
    ledger.actions.push({ name: 'Ada Lovelace', status: STATUS.sent })
    expect(selectBatch(ledger, 5).map((r) => r.name)).toEqual(['Grace Hopper'])
  })

  it('counts queue state without touching the queue', () => {
    const summary = summarize(fixture())
    expect(summary).toMatchObject({ rows: 3, sent: 0, remaining: 2, unresolvedPairs: 1 })
    expect(summary.counts[STATUS.existing]).toBe(1)
  })

  it('round-trips a ledger through an atomic write', async () => {
    const file = await tempLedger(fixture())
    const ledger = await readLedger(file)
    await writeLedger(file, ledger)
    expect(JSON.parse(await readFile(file, 'utf8')).current_request.batch_queue).toHaveLength(3)
  })

  it('records a sent invitation once, keeping the source records', () => {
    const ledger = fixture()
    recordReview(ledger, { name: 'Ada Lovelace', status: STATUS.sent, profile: 'https://linkedin.com/in/ada', evidence: '3 mutuals' })
    recordReview(ledger, { name: 'Ada Lovelace', status: STATUS.sent, profile: 'https://linkedin.com/in/ada', evidence: '3 mutuals' })
    expect(ledger.actions).toHaveLength(1)
    expect(ledger.current_request.batch_queue[0]).toMatchObject({
      status: STATUS.sent,
      linkedin: 'https://linkedin.com/in/ada',
      source_records: [{ source: 'apple_contacts', name: 'Ada Lovelace', status: STATUS.unreviewed }]
    })
  })

  it('rejects unknown rows and statuses', () => {
    const ledger = fixture()
    expect(() => recordReview(ledger, { name: 'Nobody', status: STATUS.sent })).toThrow(/no queue row/)
    expect(() => recordReview(ledger, { name: 'Ada Lovelace', status: 'invented' })).toThrow(/unknown status/)
  })

  it('merges a duplicate pair only with evidence and keeps both references', () => {
    const ledger = fixture()
    expect(() => mergeDuplicate(ledger, { name: 'Grace Hopper', facebookId: 'grace.hopper' })).toThrow(/evidence/)
    mergeDuplicate(ledger, { name: 'Grace Hopper', facebookId: 'grace.hopper', evidence: 'same employer and city' })
    expect(ledger.current_request.possible_duplicates[0].status).toBe('merged')
    expect(ledger.current_request.batch_queue[1].source_records).toEqual(
      expect.arrayContaining([expect.objectContaining({ facebook_source_id: 'grace.hopper', status: 'merged' })])
    )
  })
})

describe('identity assessment', () => {
  const contact = { name: 'Grace Hopper', org: 'United States Navy' }

  it('treats a shared name alone as ambiguous', () => {
    expect(assessCandidate(contact, { name: 'Grace Hopper', headline: 'Engineer', mutual: 0 }).verdict).toBe('ambiguous')
  })

  it('confirms on an organization match or mutual connections', () => {
    expect(assessCandidate(contact, { name: 'Grace Hopper', headline: 'Admiral at united states navy' }).verdict).toBe('confirmed')
    expect(assessCandidate(contact, { name: 'Grace Hopper', headline: 'Engineer', mutual: 2 }).verdict).toBe('confirmed')
  })

  it('treats existing connections and pending invitations as no-ops', () => {
    expect(assessCandidate(contact, { name: 'Grace Hopper', degree: 1 }).verdict).toBe('existing')
    expect(assessCandidate(contact, { name: 'Grace Hopper', pending: true }).verdict).toBe('existing')
  })

  it('ignores candidates whose name does not match', () => {
    expect(assessCandidate(contact, { name: 'Ada Lovelace', headline: 'United States Navy', mutual: 9 }).verdict).toBe('ambiguous')
  })
})
