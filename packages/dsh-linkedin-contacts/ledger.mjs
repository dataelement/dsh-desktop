import { readFile, rename, writeFile } from 'node:fs/promises'

/** Row statuses the runner may write. `unreviewed` is the only one it consumes. */
export const STATUS = Object.freeze({
  unreviewed: 'unreviewed',
  reviewed: 'previously_reviewed',
  ambiguous: 'held_ambiguous',
  existing: 'existing_connection',
  sent: 'request_sent_pending',
  blocked: 'confirmed_action_blocked',
  merged: 'duplicate_merged'
})

/** Names are compared across Apple, Facebook and LinkedIn, so fold spacing, case and accents. */
export function normalizeName(name) {
  return String(name ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase()
}

const tokens = (name) => normalizeName(name).split(' ').filter(Boolean)

/**
 * Compare one LinkedIn candidate against a contact record.
 * A shared name is not identity; the verdict needs a second, independent detail.
 * @returns {{verdict: 'confirmed' | 'existing' | 'ambiguous', reason: string}}
 */
export function assessCandidate(contact, candidate) {
  const want = tokens(contact.name)
  const got = tokens(candidate.name)
  const sameName = want.length > 0 && want.every((t) => got.includes(t)) && got.length <= want.length + 2
  if (!sameName) return { verdict: 'ambiguous', reason: 'name does not match' }

  if (candidate.degree === 1 || candidate.connected === true) {
    return { verdict: 'existing', reason: 'already a first-degree connection' }
  }
  if (candidate.pending === true) return { verdict: 'existing', reason: 'invitation already pending' }

  const org = String(contact.org ?? '').trim().toLowerCase()
  const headline = String(candidate.headline ?? '').toLowerCase()
  if (org && org.length > 2 && headline.includes(org)) {
    return { verdict: 'confirmed', reason: `headline names the contact's organization (${contact.org})` }
  }
  if (Number(candidate.mutual ?? 0) >= 2) {
    return { verdict: 'confirmed', reason: `${candidate.mutual} mutual connections` }
  }
  if (candidate.profileMatches === true) {
    return { verdict: 'confirmed', reason: 'profile URL was verified for this person earlier' }
  }
  return { verdict: 'ambiguous', reason: 'same name only; no corroborating detail' }
}

export async function readLedger(file) {
  const ledger = JSON.parse(await readFile(file, 'utf8'))
  const queue = ledger?.current_request?.batch_queue
  if (!Array.isArray(queue)) throw new Error(`ledger has no current_request.batch_queue: ${file}`)
  return ledger
}

/** Atomic write: a half-written ledger would lose the only record of what was already sent. */
export async function writeLedger(file, ledger) {
  const tmp = `${file}.${process.pid}.tmp`
  await writeFile(tmp, JSON.stringify(ledger, null, 1), { mode: 0o600 })
  await rename(tmp, file)
}

/** Rows the runner has never reviewed, in saved order, minus anyone already invited. */
export function selectBatch(ledger, size = 20) {
  const queue = ledger.current_request.batch_queue
  const invited = new Set(
    (ledger.actions ?? []).filter((a) => a.status === STATUS.sent).map((a) => normalizeName(a.name))
  )
  const batch = []
  for (const row of queue) {
    if (row.status !== STATUS.unreviewed) continue
    if (invited.has(normalizeName(row.name))) continue
    batch.push(row)
    if (batch.length === size) break
  }
  return batch
}

export function summarize(ledger) {
  const queue = ledger.current_request.batch_queue
  const counts = {}
  for (const row of queue) counts[row.status ?? 'unknown'] = (counts[row.status ?? 'unknown'] ?? 0) + 1
  return {
    rows: queue.length,
    counts,
    sent: (ledger.actions ?? []).filter((a) => a.status === STATUS.sent).length,
    remaining: counts[STATUS.unreviewed] ?? 0,
    unresolvedPairs: (ledger.current_request.possible_duplicates ?? []).filter(
      (p) => p.status !== 'merged'
    ).length
  }
}

/** Record the outcome of one review. The row keeps its source records untouched. */
export function recordReview(ledger, { name, status, profile, evidence, source }) {
  const row = ledger.current_request.batch_queue.find((r) => normalizeName(r.name) === normalizeName(name))
  if (!row) throw new Error(`no queue row for ${name}`)
  if (!Object.values(STATUS).includes(status)) throw new Error(`unknown status ${status}`)
  row.status = status
  row.reviewed_at = new Date().toISOString()
  if (profile) row.linkedin = profile
  if (evidence) row.evidence = evidence
  if (source) row.reviewed_source = source
  if (status === STATUS.sent) {
    ledger.actions = ledger.actions ?? []
    if (!ledger.actions.some((a) => normalizeName(a.name) === normalizeName(name) && a.status === STATUS.sent)) {
      ledger.actions.push({
        destination: 'linkedin',
        name,
        profile,
        status: STATUS.sent,
        identity_evidence: Array.isArray(evidence) ? evidence : [evidence].filter(Boolean),
        recorded_at: new Date().toISOString()
      })
    }
  }
  return row
}

/**
 * Merge a name-only pair once identity is corroborated. The secondary source id is
 * appended to the primary row, so every original reference survives the merge.
 */
export function mergeDuplicate(ledger, { name, facebookId, evidence }) {
  const pair = (ledger.current_request.possible_duplicates ?? []).find(
    (p) => p.facebook_source_id === facebookId && normalizeName(p.apple_contact) === normalizeName(name)
  )
  if (!pair) throw new Error(`no possible duplicate for ${name} / ${facebookId}`)
  if (!evidence) throw new Error('merge needs identity evidence')

  const row = ledger.current_request.batch_queue.find((r) => normalizeName(r.name) === normalizeName(name))
  if (row) {
    row.source_records = row.source_records ?? []
    if (!row.source_records.some((r) => r.facebook_source_id === facebookId)) {
      row.source_records.push({ source: 'facebook', facebook_source_id: facebookId, status: 'merged' })
    }
    row.merged_at = new Date().toISOString()
  }
  pair.status = 'merged'
  pair.evidence = evidence
  pair.merged_at = new Date().toISOString()
  return pair
}
